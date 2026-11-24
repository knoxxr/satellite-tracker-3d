import * as satellite from 'satellite.js';
import { t } from '../ui/i18n.js';

const EARTH_RADIUS_KM = 6378.137;
const MU_KM3_S2 = 398600.4418;
const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Build a normalized orbital record from CelesTrak OMM JSON.
 */
export function buildRecordFromOmm(omm) {
  try {
    const satrec = satellite.json2satrec(omm);
    if (!satrec || satrec.error !== 0) return null;
    const rcsNum = Number(omm._rcs);
    return enrichRecord({
      id: Number(omm.NORAD_CAT_ID),
      name: String(omm.OBJECT_NAME || `SAT-${omm.NORAD_CAT_ID}`).trim(),
      cosparId: omm.OBJECT_ID || '—',
      epoch: omm.EPOCH || null,
      group: omm._group || 'custom',
      owner: omm._ow || null,
      launchDate: omm._ld || null,
      launchSite: omm._ls || null,
      opsStatus: omm._st || null,
      rcs: Number.isFinite(rcsNum) && rcsNum > 0 ? rcsNum : null,
      satrec,
      raw: omm,
    });
  } catch {
    return null;
  }
}

/**
 * Build a normalized orbital record from standard 2-line or 3-line TLE text.
 */
export function buildRecordFromTle(tleText, group = 'custom') {
  const lines = tleText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let name = 'CUSTOM SATELLITE';
  let line1 = '';
  let line2 = '';

  if (lines.length >= 3 && lines[1].startsWith('1 ') && lines[2].startsWith('2 ')) {
    name = lines[0];
    line1 = lines[1];
    line2 = lines[2];
  } else if (lines.length >= 2 && lines[0].startsWith('1 ') && lines[1].startsWith('2 ')) {
    line1 = lines[0];
    line2 = lines[1];
  } else {
    throw new Error(t('errInvalidTleFormat'));
  }

  const satrec = satellite.twoline2satrec(line1, line2);
  if (!satrec || satrec.error !== 0) {
    throw new Error(t('errInvalidTleParse'));
  }

  const noradId = Number(line1.slice(2, 7).trim()) || Math.floor(900000 + Math.random() * 90000);
  const cosparRaw = line1.slice(9, 17).trim();

  return enrichRecord({
    id: noradId,
    name,
    cosparId: cosparRaw || 'CUSTOM',
    epoch: null,
    group,
    satrec,
    raw: { line1, line2 },
  });
}

function enrichRecord(base) {
  const { satrec } = base;
  const meanMotionRadPerMin = satrec.no; // rad/min
  const meanMotionRadPerSec = meanMotionRadPerMin / 60;
  const periodMin = meanMotionRadPerMin > 0 ? (2 * Math.PI) / meanMotionRadPerMin : 90;
  const revsPerDay = periodMin > 0 ? 1440 / periodMin : 15;
  const inclinationDeg = satrec.inclo * RAD_TO_DEG;
  const eccentricity = satrec.ecco;

  const semiMajorAxisKm =
    meanMotionRadPerSec > 0
      ? Math.cbrt(MU_KM3_S2 / (meanMotionRadPerSec * meanMotionRadPerSec))
      : EARTH_RADIUS_KM + 400;

  const apogeeKm = Math.max(0, semiMajorAxisKm * (1 + eccentricity) - EARTH_RADIUS_KM);
  const perigeeKm = Math.max(0, semiMajorAxisKm * (1 - eccentricity) - EARTH_RADIUS_KM);

  let regime = 'LEO';
  if (periodMin >= 1380 && periodMin <= 1500 && eccentricity < 0.08) {
    regime = 'GEO';
  } else if (eccentricity >= 0.25 || apogeeKm > 36500) {
    regime = 'HEO';
  } else if (perigeeKm >= 2000 || apogeeKm >= 2200) {
    regime = 'MEO';
  }

  return {
    ...base,
    periodMin,
    revsPerDay,
    inclinationDeg,
    eccentricity,
    semiMajorAxisKm,
    apogeeKm,
    perigeeKm,
    regime,
  };
}

/**
 * Propagate satellite position & velocity at a given Date using SGP4.
 */
export function propagateSatellite(record, date) {
  const pv = satellite.propagate(record.satrec, date);
  if (!pv || !pv.position || typeof pv.position === 'boolean') {
    return null;
  }

  const posEci = pv.position;
  const velEci = pv.velocity;
  if (!Number.isFinite(posEci.x) || !Number.isFinite(posEci.y) || !Number.isFinite(posEci.z)) {
    return null;
  }

  const gmst = satellite.gstime(date);
  const gd = satellite.eciToGeodetic(posEci, gmst);

  const lat = satellite.degreesLat(gd.latitude);
  const lon = satellite.degreesLong(gd.longitude);
  const altKm = gd.height;

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(altKm) || altKm < -100 || altKm > 500000) {
    return null;
  }

  const speedKmS =
    velEci && typeof velEci !== 'boolean'
      ? Math.hypot(velEci.x, velEci.y, velEci.z)
      : 0;

  // Horizon visibility footprint arc radius on Earth's surface (km)
  const clampedAlt = Math.max(altKm, 1);
  const centralAngleRad = Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + clampedAlt));
  const footprintRadiusKm = EARTH_RADIUS_KM * centralAngleRad;

  // ECEF velocity vector (km/s) for realistic LVLH 3D spacecraft flight orientation
  let velEcfKmS = null;
  if (velEci && typeof velEci !== 'boolean') {
    const posEcf = satellite.eciToEcf(posEci, gmst);
    const velRot = satellite.eciToEcf(velEci, gmst);
    const OMEGA_EARTH = 7.292115e-5; // rad/s
    velEcfKmS = {
      x: velRot.x + OMEGA_EARTH * posEcf.y,
      y: velRot.y - OMEGA_EARTH * posEcf.x,
      z: velRot.z,
    };
  }

  return {
    lat,
    lon,
    altKm,
    altMeters: altKm * 1000,
    speedKmS,
    speedKmH: speedKmS * 3600,
    footprintRadiusKm,
    footprintRadiusMeters: footprintRadiusKm * 1000,
    posEci,
    velEcfKmS,
    gmst,
  };
}

/**
 * Compute 3D orbital trajectory samples (past & future) for rendering full orbital curves.
 */
export function computeOrbitTrack(record, centerDate, { pastFraction = 0.35, futureFraction = 1.0, steps = 160 } = {}) {
  const periodMs = Math.min(Math.max(record.periodMin, 80), 1440) * 60 * 1000;
  const pastSpanMs = periodMs * pastFraction;
  const futureSpanMs = periodMs * futureFraction;
  const t0 = centerDate.getTime();

  const pastSteps = Math.max(24, Math.round(steps * 0.32));
  const futureSteps = Math.max(60, steps);

  const past = [];
  for (let i = pastSteps; i >= 0; i--) {
    const t = new Date(t0 - (pastSpanMs * i) / pastSteps);
    const p = propagateSatellite(record, t);
    if (p) past.push({ lat: p.lat, lon: p.lon, altMeters: p.altMeters });
  }

  const future = [];
  for (let i = 0; i <= futureSteps; i++) {
    const t = new Date(t0 + (futureSpanMs * i) / futureSteps);
    const p = propagateSatellite(record, t);
    if (p) future.push({ lat: p.lat, lon: p.lon, altMeters: p.altMeters });
  }

  return { past, future };
}

/**
 * Compute look angles (Azimuth, Elevation, Slant Range) from a ground observer to a satellite.
 */
export function computeLookAngles(propagation, observer) {
  if (!propagation || !observer) return null;

  const observerGd = {
    longitude: observer.lon * DEG_TO_RAD,
    latitude: observer.lat * DEG_TO_RAD,
    height: observer.heightKm ?? 0.04,
  };

  const posEcf = satellite.eciToEcf(propagation.posEci, propagation.gmst);
  const look = satellite.ecfToLookAngles(observerGd, posEcf);

  const azimuthDeg = ((look.azimuth * RAD_TO_DEG) % 360 + 360) % 360;
  const elevationDeg = look.elevation * RAD_TO_DEG;
  const rangeKm = look.rangeSat;

  return {
    azimuthDeg,
    elevationDeg,
    rangeKm,
    visible: elevationDeg > 0,
    compass: azimuthToCompass(azimuthDeg),
  };
}

export function azimuthToCompass(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

/**
 * Predict the next visible pass (AOS -> Max Elevation -> LOS) over the observer within 24 hours.
 */
export function predictNextPass(record, startDate, observer, maxHours = 24) {
  const currentProp = propagateSatellite(record, startDate);
  if (!currentProp) return { status: 'UNAVAILABLE' };

  const currentLook = computeLookAngles(currentProp, observer);

  if (record.regime === 'GEO') {
    return {
      status: currentLook && currentLook.elevationDeg > 0 ? 'GEO_ALWAYS_VISIBLE' : 'GEO_BELOW_HORIZON',
      maxElevationDeg: currentLook ? currentLook.elevationDeg : -90,
      aosAzimuthDeg: currentLook ? currentLook.azimuthDeg : 0,
    };
  }

  const startMs = startDate.getTime();
  const endMs = startMs + maxHours * 3600 * 1000;
  const coarseStepMs = record.periodMin < 180 ? 30_000 : 120_000;
  const fineStepMs = 5_000;

  let inPass = currentLook && currentLook.elevationDeg > 0;
  let aosMs = inPass ? startMs : null;
  let maxEl = inPass ? currentLook.elevationDeg : -90;
  let maxTimeMs = inPass ? startMs : null;
  let aosAz = inPass ? currentLook.azimuthDeg : 0;
  let losMs = null;
  let losAz = 0;

  for (let t = startMs + coarseStepMs; t <= endMs; t += coarseStepMs) {
    const prop = propagateSatellite(record, new Date(t));
    if (!prop) continue;
    const look = computeLookAngles(prop, observer);
    if (!look) continue;

    if (!inPass && look.elevationDeg > 0) {
      // Refine AOS between t - coarseStepMs and t
      inPass = true;
      aosMs = t;
      aosAz = look.azimuthDeg;
      for (let ft = t - coarseStepMs; ft <= t; ft += fineStepMs) {
        const fp = propagateSatellite(record, new Date(ft));
        const fl = fp && computeLookAngles(fp, observer);
        if (fl && fl.elevationDeg > 0) {
          aosMs = ft;
          aosAz = fl.azimuthDeg;
          break;
        }
      }
      maxEl = look.elevationDeg;
      maxTimeMs = t;
    } else if (inPass && look.elevationDeg > 0) {
      if (look.elevationDeg > maxEl) {
        maxEl = look.elevationDeg;
        maxTimeMs = t;
      }
    } else if (inPass && look.elevationDeg <= 0) {
      // Refine LOS and peak
      losMs = t;
      losAz = look.azimuthDeg;
      for (let ft = t - coarseStepMs; ft <= t; ft += fineStepMs) {
        const fp = propagateSatellite(record, new Date(ft));
        const fl = fp && computeLookAngles(fp, observer);
        if (fl && fl.elevationDeg > maxEl) {
          maxEl = fl.elevationDeg;
          maxTimeMs = ft;
        }
        if (fl && fl.elevationDeg <= 0) {
          losMs = ft;
          losAz = fl.azimuthDeg;
          break;
        }
      }
      break;
    }
  }

  if (aosMs === null) {
    return { status: 'NO_PASS_24H' };
  }

  // Refine max elevation around maxTimeMs
  if (maxTimeMs !== null) {
    for (let ft = maxTimeMs - coarseStepMs; ft <= maxTimeMs + coarseStepMs; ft += fineStepMs) {
      const fp = propagateSatellite(record, new Date(ft));
      const fl = fp && computeLookAngles(fp, observer);
      if (fl && fl.elevationDeg > maxEl) {
        maxEl = fl.elevationDeg;
        maxTimeMs = ft;
      }
    }
  }

  return {
    status: currentLook && currentLook.elevationDeg > 0 ? 'VISIBLE_NOW' : 'UPCOMING',
    aos: new Date(aosMs),
    maxTime: new Date(maxTimeMs || aosMs),
    los: losMs ? new Date(losMs) : null,
    maxElevationDeg: maxEl,
    aosAzimuthDeg: aosAz,
    losAzimuthDeg: losAz,
  };
}

const AU_KM = 149597870.7;

const STANDARD_MAG_BY_ID = {
  25544: -1.8, // ISS
  48274: -1.0, // CSS Tianhe (Tiangong)
  20580: 2.0,  // Hubble Space Telescope
};

/**
 * Compute approximate geocentric Sun ECI position vector (km) using standard Astronomical Almanac equations (~0.01° accuracy).
 */
export function computeSunEciKm(date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = ((280.46 + 0.9856474 * n) % 360 + 360) % 360;
  const g = (((357.528 + 0.9856003 * n) % 360 + 360) % 360) * DEG_TO_RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG_TO_RAD;
  const eps = (23.439 - 0.0000004 * n) * DEG_TO_RAD;
  const rAu = 1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g);
  const rKm = rAu * AU_KM;
  return {
    x: rKm * Math.cos(lambda),
    y: rKm * Math.cos(eps) * Math.sin(lambda),
    z: rKm * Math.sin(eps) * Math.sin(lambda),
  };
}

/**
 * Determine whether a satellite in ECI (km) is sunlit or inside Earth's cylindrical shadow (umbra).
 */
export function isSatelliteSunlit(posEci, sunEci) {
  if (!posEci || !sunEci) return false;
  const sunMag = Math.hypot(sunEci.x, sunEci.y, sunEci.z);
  if (!sunMag) return false;
  const ux = sunEci.x / sunMag;
  const uy = sunEci.y / sunMag;
  const uz = sunEci.z / sunMag;

  const dot = posEci.x * ux + posEci.y * uy + posEci.z * uz;
  if (dot >= 0) return true; // Dayside of Earth

  // Perpendicular distance from Earth-Sun shadow axis
  const px = posEci.x - dot * ux;
  const py = posEci.y - dot * uy;
  const pz = posEci.z - dot * uz;
  const perpDistKm = Math.hypot(px, py, pz);
  return perpDistKm > EARTH_RADIUS_KM;
}

/**
 * Compute Sun elevation angle (deg) from a ground observer at a given Date.
 */
export function computeSolarElevationDeg(observer, date, sunEci = null) {
  const sEci = sunEci || computeSunEciKm(date);
  const gmst = satellite.gstime(date);
  const sunEcf = satellite.eciToEcf(sEci, gmst);
  const observerGd = {
    longitude: observer.lon * DEG_TO_RAD,
    latitude: observer.lat * DEG_TO_RAD,
    height: observer.heightKm ?? 0.04,
  };
  const look = satellite.ecfToLookAngles(observerGd, sunEcf);
  return look.elevation * RAD_TO_DEG;
}

/**
 * Compute real-time naked-eye visual visibility judgment & estimated visual magnitude
 * based on satellite elevation, Earth-shadow illumination (Sunlit/Umbra), observer twilight/night sky,
 * solar phase angle, slant range, and SATCAT RCS.
 */
export function computeVisualVisibility(record, pos, look, observer, date) {
  if (!record || !pos || !look || !observer) return null;

  const sunEci = computeSunEciKm(date);
  const sunlit = isSatelliteSunlit(pos.posEci, sunEci);
  const sunElDeg = computeSolarElevationDeg(observer, date, sunEci);

  let skyState = 'night';
  let skyLabel = t('skyNight');
  if (sunElDeg > 0) {
    skyState = 'day';
    skyLabel = t('skyDay');
  } else if (sunElDeg > -6) {
    skyState = 'civil';
    skyLabel = t('skyCivil');
  } else if (sunElDeg > -18) {
    skyState = 'nautical';
    skyLabel = t('skyNautical');
  }

  // Estimate apparent visual magnitude using Lambertian phase function + SATCAT RCS
  let estMag = null;
  if (sunlit && look.rangeKm > 0) {
    const gmst = pos.gmst ?? satellite.gstime(date);
    const obsGd = {
      longitude: observer.lon * DEG_TO_RAD,
      latitude: observer.lat * DEG_TO_RAD,
      height: observer.heightKm ?? 0.04,
    };
    const obsEci = satellite.geodeticToEcf(obsGd);
    const satEcf = satellite.eciToEcf(pos.posEci, gmst);
    const sunEcf = satellite.eciToEcf(sunEci, gmst);

    // Vector from satellite to Sun & from satellite to Observer
    const toSunX = sunEcf.x - satEcf.x;
    const toSunY = sunEcf.y - satEcf.y;
    const toSunZ = sunEcf.z - satEcf.z;
    const toObsX = obsEci.x - satEcf.x;
    const toObsY = obsEci.y - satEcf.y;
    const toObsZ = obsEci.z - satEcf.z;
    const magSun = Math.hypot(toSunX, toSunY, toSunZ) || 1;
    const magObs = Math.hypot(toObsX, toObsY, toObsZ) || 1;
    const cosPhi = Math.max(
      -1,
      Math.min(1, (toSunX * toObsX + toSunY * toObsY + toSunZ * toObsZ) / (magSun * magObs))
    );
    const phi = Math.acos(cosPhi); // Phase angle: 0 = full illumination, pi = backlit
    const phaseFactor = Math.max(0.02, (Math.sin(phi) + (Math.PI - phi) * Math.cos(phi)) / Math.PI);

    let stdMag = STANDARD_MAG_BY_ID[record.id];
    if (stdMag === undefined) {
      if (record.rcs && record.rcs > 0) {
        stdMag = Math.max(-0.5, Math.min(8.5, 4.8 - 2.5 * Math.log10(record.rcs)));
      } else if (record.group === 'starlink') {
        stdMag = 5.4;
      } else if (record.group === 'stations') {
        stdMag = -0.5;
      } else if (record.group === 'cubesat') {
        stdMag = 8.0;
      } else if (record.regime === 'GEO') {
        stdMag = 4.5;
      } else {
        stdMag = 5.8;
      }
    }

    estMag = stdMag + 5 * Math.log10(Math.max(100, look.rangeKm) / 1000) - 2.5 * Math.log10(phaseFactor);
    estMag = Math.round(estMag * 10) / 10;
  }

  let status = 'BELOW_HORIZON';
  let label = t('visStatusBelow');
  let detail = t('visDetailBelow');
  let canSeeNakedEye = false;

  if (look.elevationDeg <= 0) {
    status = 'BELOW_HORIZON';
    label = t('visStatusBelow');
    detail = t('visDetailBelow');
  } else if (!sunlit) {
    status = 'IN_EARTH_SHADOW';
    label = t('visStatusShadow');
    detail = t('visDetailShadow');
  } else if (sunElDeg > -1) {
    status = 'DAYTIME_SKY';
    label = t('visStatusDay');
    detail = t('visDetailDay', { sunEl: sunElDeg.toFixed(1) });
  } else {
    const nakedLimit = sunElDeg > -6 ? 1.5 : 5.5;
    if (estMag !== null && estMag <= nakedLimit && look.elevationDeg >= 8) {
      status = 'VISIBLE_NAKED_EYE';
      canSeeNakedEye = true;
      const magStr = `${estMag > 0 ? '+' : ''}${estMag.toFixed(1)}`;
      label = t('visStatusNaked');
      detail = t('visDetailNaked', { mag: magStr });
    } else if (estMag !== null && estMag <= 8.5) {
      status = 'VISIBLE_BINOCULAR';
      const magStr = `+${estMag.toFixed(1)}`;
      label = t('visStatusBino');
      detail = t('visDetailBino', { mag: magStr });
    } else {
      status = 'TOO_FAINT';
      const magSuffix = estMag !== null ? ` (mag +${estMag.toFixed(1)})` : '';
      label = t('visStatusFaint');
      detail = t('visDetailFaint', { magSuffix });
    }
  }

  return {
    status,
    label,
    detail,
    canSeeNakedEye,
    sunlit,
    sunElDeg,
    skyState,
    skyLabel,
    estMag,
  };
}

/**
 * Predict up to maxPasses upcoming visible passes over the observer within maxHours (default 48h),
 * including astronomical naked-eye visual visibility judgment at each pass peak (TCA).
 */
export function predictUpcomingPasses(record, startDate, observer, maxHours = 48, maxPasses = 5) {
  const currentProp = propagateSatellite(record, startDate);
  if (!currentProp) return { status: 'UNAVAILABLE', passes: [] };

  const currentLook = computeLookAngles(currentProp, observer);

  if (record.regime === 'GEO') {
    return {
      status: currentLook && currentLook.elevationDeg > 0 ? 'GEO_ALWAYS_VISIBLE' : 'GEO_BELOW_HORIZON',
      maxElevationDeg: currentLook ? currentLook.elevationDeg : -90,
      aosAzimuthDeg: currentLook ? currentLook.azimuthDeg : 0,
      passes: [],
    };
  }

  const startMs = startDate.getTime();
  const endMs = startMs + maxHours * 3600 * 1000;
  const coarseStepMs = record.periodMin < 180 ? 35_000 : 120_000;
  const fineStepMs = 6_000;

  const passes = [];
  let inPass = Boolean(currentLook && currentLook.elevationDeg > 0);
  let isInitialVisible = inPass;
  let aosMs = inPass ? startMs : null;
  let maxEl = inPass ? currentLook.elevationDeg : -90;
  let maxTimeMs = inPass ? startMs : null;
  let aosAz = inPass ? currentLook.azimuthDeg : 0;

  const evaluatePeakVisual = (peakMs) => {
    const tDate = new Date(peakMs);
    const p = propagateSatellite(record, tDate);
    if (!p) return null;
    const l = computeLookAngles(p, observer);
    return l ? computeVisualVisibility(record, p, l, observer, tDate) : null;
  };

  for (let t = startMs + coarseStepMs; t <= endMs && passes.length < maxPasses; t += coarseStepMs) {
    const prop = propagateSatellite(record, new Date(t));
    if (!prop) continue;
    const look = computeLookAngles(prop, observer);
    if (!look) continue;

    if (!inPass && look.elevationDeg > 0) {
      inPass = true;
      isInitialVisible = false;
      aosMs = t;
      aosAz = look.azimuthDeg;
      for (let ft = t - coarseStepMs; ft <= t; ft += fineStepMs) {
        const fp = propagateSatellite(record, new Date(ft));
        const fl = fp && computeLookAngles(fp, observer);
        if (fl && fl.elevationDeg > 0) {
          aosMs = ft;
          aosAz = fl.azimuthDeg;
          break;
        }
      }
      maxEl = look.elevationDeg;
      maxTimeMs = t;
    } else if (inPass && look.elevationDeg > 0) {
      if (look.elevationDeg > maxEl) {
        maxEl = look.elevationDeg;
        maxTimeMs = t;
      }
    } else if (inPass && look.elevationDeg <= 0) {
      let losMs = t;
      let losAz = look.azimuthDeg;
      for (let ft = t - coarseStepMs; ft <= t; ft += fineStepMs) {
        const fp = propagateSatellite(record, new Date(ft));
        const fl = fp && computeLookAngles(fp, observer);
        if (fl && fl.elevationDeg > maxEl) {
          maxEl = fl.elevationDeg;
          maxTimeMs = ft;
        }
        if (fl && fl.elevationDeg <= 0) {
          losMs = ft;
          losAz = fl.azimuthDeg;
          break;
        }
      }
      // Refine peak
      if (maxTimeMs !== null) {
        for (let ft = maxTimeMs - coarseStepMs; ft <= maxTimeMs + coarseStepMs; ft += fineStepMs) {
          const fp = propagateSatellite(record, new Date(ft));
          const fl = fp && computeLookAngles(fp, observer);
          if (fl && fl.elevationDeg > maxEl) {
            maxEl = fl.elevationDeg;
            maxTimeMs = ft;
          }
        }
      }

      const peakMs = maxTimeMs || aosMs;
      passes.push({
        status: isInitialVisible ? 'VISIBLE_NOW' : 'UPCOMING',
        aos: new Date(aosMs),
        maxTime: new Date(peakMs),
        los: new Date(losMs),
        durationSec: Math.max(0, Math.round((losMs - aosMs) / 1000)),
        maxElevationDeg: maxEl,
        aosAzimuthDeg: aosAz,
        losAzimuthDeg: losAz,
        visual: evaluatePeakVisual(peakMs),
      });

      inPass = false;
      isInitialVisible = false;
      aosMs = null;
      maxEl = -90;
      maxTimeMs = null;
    }
  }

  // Handle a pass still open at the end of the search window
  if (inPass && aosMs !== null && passes.length < maxPasses) {
    const peakMs = maxTimeMs || aosMs;
    passes.push({
      status: isInitialVisible ? 'VISIBLE_NOW' : 'UPCOMING',
      aos: new Date(aosMs),
      maxTime: new Date(peakMs),
      los: null,
      durationSec: null,
      maxElevationDeg: maxEl,
      aosAzimuthDeg: aosAz,
      losAzimuthDeg: 0,
      visual: evaluatePeakVisual(peakMs),
    });
  }

  if (passes.length === 0) {
    return { status: 'NO_PASS_24H', passes: [] };
  }

  return {
    ...passes[0],
    passes,
  };
}

