import * as satellite from 'satellite.js';

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
    return enrichRecord({
      id: Number(omm.NORAD_CAT_ID),
      name: String(omm.OBJECT_NAME || `SAT-${omm.NORAD_CAT_ID}`).trim(),
      cosparId: omm.OBJECT_ID || '—',
      epoch: omm.EPOCH || null,
      group: omm._group || 'custom',
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
    throw new Error('올바른 TLE 형식(1번/2번 라인)이 아닙니다.');
  }

  const satrec = satellite.twoline2satrec(line1, line2);
  if (!satrec || satrec.error !== 0) {
    throw new Error('TLE 궤도 요소 파싱에 실패했습니다.');
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
