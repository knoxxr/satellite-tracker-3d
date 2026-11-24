export const CATEGORIES = [
  { id: 'all', label: '전체 위성 (ALL)', color: '#38bdf8' },
  { id: 'featured', label: '주요 추천', color: '#0ea5e9' },
  { id: 'favorites', label: '즐겨찾기', color: '#fbbf24' },
  { id: 'korea', label: '한국 위성', color: '#22d3ee' },
  { id: 'stations', label: '우주정거장', color: '#f59e0b' },
  { id: 'weather', label: '기상·지구관측', color: '#10b981' },
  { id: 'gnss', label: '전세계 GNSS', color: '#60a5fa' },
  { id: 'science', label: '과학·천문', color: '#fb7185' },
  { id: 'geo', label: '정지궤도 GEO', color: '#f97316' },
  { id: 'starlink', label: '스타링크 전체', color: '#e2e8f0' },
  { id: 'comms', label: 'OneWeb·Iridium', color: '#34d399' },
  { id: 'cubesat', label: '큐브·아마추어', color: '#fbbf24' },
  { id: 'recent', label: '최근 30일 발사', color: '#f43f5e' },
];

export const GROUP_COLORS = {
  all: '#38bdf8',
  stations: '#f59e0b',
  korea: '#22d3ee',
  weather: '#10b981',
  gnss: '#60a5fa',
  gps: '#60a5fa',
  science: '#fb7185',
  geo: '#f97316',
  starlink: '#cbd5e1',
  comms: '#34d399',
  cubesat: '#fbbf24',
  recent: '#f43f5e',
  other: '#94a3b8',
  custom: '#fb923c',
};

export const GROUP_LABELS = {
  all: '활성 위성',
  stations: '우주정거장',
  korea: '한국 위성',
  weather: '기상·지구관측',
  gnss: 'GNSS 항법',
  gps: 'GNSS 항법',
  science: '과학·천문',
  geo: '정지궤도 GEO',
  starlink: '스타링크 군집',
  comms: '통신 군집',
  cubesat: '큐브·아마추어',
  recent: '신규 발사',
  other: '일반 위성',
  custom: '사용자 추가',
};

export const OBSERVER_PRESETS = [
  { id: 'seoul', name: '서울 (Seoul)', lat: 37.5665, lon: 126.978, heightKm: 0.04 },
  { id: 'daejeon', name: '대전 KARI (항공우주연구원)', lat: 36.3746, lon: 127.3536, heightKm: 0.08 },
  { id: 'busan', name: '부산 (Busan)', lat: 35.1796, lon: 129.0756, heightKm: 0.03 },
  { id: 'jeju', name: '제주 (Jeju)', lat: 33.4996, lon: 126.5312, heightKm: 0.05 },
  { id: 'tokyo', name: '도쿄 (Tokyo)', lat: 35.6762, lon: 139.6503, heightKm: 0.04 },
  { id: 'newyork', name: '뉴욕 (New York)', lat: 40.7128, lon: -74.006, heightKm: 0.02 },
  { id: 'london', name: '런던 (London)', lat: 51.5074, lon: -0.1278, heightKm: 0.02 },
];

/**
 * Curated Korean notes for well-known spacecraft so users immediately recognize them.
 */
export const NOTABLE_SATELLITES = {
  25544: {
    koName: '국제우주정거장 (ISS)',
    summary: '고도 약 420km 저궤도를 92분마다 공전하는 인류 최대 유인 우주정거장',
  },
  48274: {
    koName: '중국 톈궁 우주정거장 (톈허)',
    summary: '중국 유인 우주정거장 톈궁의 핵심 모듈(Tianhe)',
  },
  20580: {
    koName: '허블 우주망원경 (HST)',
    summary: '1990년 발사되어 심우주를 관측 중인 NASA/ESA 우주망원경',
  },
  22077: {
    koName: '우리별 1호 (KITSAT-1)',
    summary: '1992년 발사된 대한민국 최초의 인공위성',
  },
  22828: {
    koName: '우리별 2호 (KITSAT-2)',
    summary: '1993년 국내 기술진 주도로 제작된 대한민국 두 번째 인공위성',
  },
  25756: {
    koName: '우리별 3호 (KITSAT-3)',
    summary: '1999년 독자 설계·개발된 대한민국 최초 고유 모델 과학실험위성',
  },
  36744: {
    koName: '천리안 1호 (COMS-1)',
    summary: '2010년 발사된 대한민국 최초의 정지궤도 통신·해양·기상 복합위성',
  },
  38338: {
    koName: '아리랑 3호 (KOMPSAT-3)',
    summary: '대한민국 다목적실용위성 3호 · 고해상도 광학 지구관측 위성',
  },
  39227: {
    koName: '아리랑 5호 (KOMPSAT-5)',
    summary: '대한민국 최초 영상레이더(SAR) 탑재 전천후 지구관측 위성',
  },
  40536: {
    koName: '아리랑 3A호 (KOMPSAT-3A)',
    summary: '초고해상도 광학 + 적외선 센서 탑재 다목적실용위성',
  },
  66820: {
    koName: '아리랑 7호 (KOMPSAT-7)',
    summary: '0.3m급 초고해상도 광학 관측 능력을 갖춘 차세대 다목적실용위성',
  },
  43823: {
    koName: '천리안 2A호 (GK-2A)',
    summary: '동경 128.2° 정지궤도에서 한반도 기상·우주기상을 상시 감시하는 위성',
  },
  45246: {
    koName: '천리안 2B호 (GK-2B)',
    summary: '동경 128.2° 정지궤도에서 한반도 해양·대기환경(미세먼지)을 관측하는 위성',
  },
  47932: {
    koName: '차세대중형위성 1호 (국토위성)',
    summary: '국내 독자 개발 500kg급 표준 플랫폼 정밀 지상관측 위성',
  },
  42691: {
    koName: '무궁화 7호 (KOREASAT 7)',
    summary: 'KT SAT 정지궤도 방송·통신 위성',
  },
  42984: {
    koName: '무궁화 5A호 (KOREASAT 5A)',
    summary: '동아시아·해상 광역 커버리지 정지궤도 통신 위성',
  },
  61910: {
    koName: '무궁화 6A호 (KOREASAT 6A)',
    summary: 'KT SAT 차세대 정지궤도 통신 위성 (2024년 발사)',
  },
  59587: {
    koName: '초소형군집위성 1호 (NEONSAT-1)',
    summary: '한반도 정밀 감시를 위한 대한민국 초소형 군집위성 선도기',
  },
  56743: {
    koName: '차세대소형위성 2호 (NEXTSAT-2)',
    summary: '누리호 3차 발사로 궤도에 안착한 국산 소형 SAR 영상레이더 위성',
  },
  66771: {
    koName: '경기기후위성 1호 (GYEONGGISAT-1)',
    summary: '경기도 온실가스·기후변화 정밀 관측용 초소형 위성',
  },
  43013: {
    koName: 'NOAA-20 (JPSS-1)',
    summary: '극궤도를 돌며 전 지구 기상 예보 데이터를 수집하는 미국 기상위성',
  },
  54234: {
    koName: 'NOAA-21 (JPSS-2)',
    summary: '최신 극궤도 기상·환경 관측 위성',
  },
};

const STATION_IDS = new Set([25544, 48274, 49044, 53239, 54216]);
const KOREA_IDS = new Set([22077, 22828, 25756, 36744, 38338, 39227, 40536, 42691, 42984, 43784, 43823, 45246, 47932, 52898, 52899, 52900, 56743, 59587, 61910, 66661, 66771, 66820, 100950]);

export function isKoreanSatellite(omm) {
  const id = Number(omm?.NORAD_CAT_ID);
  if (KOREA_IDS.has(id)) return true;
  const name = String(omm?.OBJECT_NAME || '').toUpperCase();
  if (name.includes('DEB') || name.includes('R/B')) return false;
  return (
    name.includes('KOMPSAT') ||
    name.includes('ARIRANG') ||
    name.includes('KOREASAT') ||
    name.includes('CAS500') ||
    name.includes('NEXTSAT') ||
    name.includes('NEONSAT') ||
    name.includes('KITSAT') ||
    name.includes('SNUGLITE') ||
    name.includes('MIMAN') ||
    name.includes('RANDEV') ||
    name.includes('GYEONGGI') ||
    name.includes('GK-2') ||
    name.startsWith('STSAT')
  );
}

/**
 * Strip non-essential OMM keys while preserving every field required by satellite.js json2satrec()
 * and OrbitPulse UI. Reduces 16,900-satellite JSON payload by ~35%.
 */
export function compactOmmRecord(omm, groupTag = null) {
  return {
    OBJECT_NAME: omm.OBJECT_NAME,
    OBJECT_ID: omm.OBJECT_ID,
    EPOCH: omm.EPOCH,
    MEAN_MOTION: omm.MEAN_MOTION,
    ECCENTRICITY: omm.ECCENTRICITY,
    INCLINATION: omm.INCLINATION,
    RA_OF_ASC_NODE: omm.RA_OF_ASC_NODE,
    ARG_OF_PERICENTER: omm.ARG_OF_PERICENTER,
    MEAN_ANOMALY: omm.MEAN_ANOMALY,
    NORAD_CAT_ID: Number(omm.NORAD_CAT_ID),
    BSTAR: omm.BSTAR,
    MEAN_MOTION_DOT: omm.MEAN_MOTION_DOT,
    MEAN_MOTION_DDOT: omm.MEAN_MOTION_DDOT,
    _group: groupTag || omm._group || classifySatelliteGroup(omm),
  };
}

/**
 * Automatically classify any active CelesTrak OMM object into a visual category
 * so the 16,000+ global satellite view renders distinct color-coded orbital shells.
 */
export function classifySatelliteGroup(omm) {
  const id = Number(omm?.NORAD_CAT_ID);
  const name = String(omm?.OBJECT_NAME || '').toUpperCase();
  const meanMotion = Number(omm?.MEAN_MOTION || 0);
  const ecc = Number(omm?.ECCENTRICITY || 0);

  if (
    STATION_IDS.has(id) ||
    name.includes('ISS (ZARYA)') ||
    name.includes('CSS (TIANHE)') ||
    name.includes('CSS (WENTIAN)') ||
    name.includes('CSS (MENGTIAN)') ||
    name.includes('TIANGONG')
  ) {
    return 'stations';
  }
  if (isKoreanSatellite(omm)) {
    return 'korea';
  }
  if (name.includes('STARLINK')) return 'starlink';
  if (
    name.includes('ONEWEB') ||
    name.includes('IRIDIUM') ||
    name.includes('GLOBALSTAR') ||
    name.includes('KUIPER') ||
    name.includes('ORBCOMM')
  ) {
    return 'comms';
  }
  if (
    name.includes('GPS ') ||
    name.includes('NAVSTAR') ||
    name.includes('GALILEO') ||
    name.includes('GSAT') ||
    name.includes('GLONASS') ||
    (name.includes('COSMOS 2') && meanMotion > 1.8 && meanMotion < 2.3) ||
    name.includes('BEIDOU') ||
    name.includes('QZS-')
  ) {
    return 'gnss';
  }
  if (
    id === 20580 ||
    name.includes('HST') ||
    name.includes('CHANDRA') ||
    name.includes('TESS') ||
    name.includes('FERMI') ||
    name.includes('SWIFT') ||
    name.includes('NUSTAR') ||
    name.includes('INTEGRAL') ||
    name.includes('XMM') ||
    name.includes('HINODE')
  ) {
    return 'science';
  }
  if (
    name.includes('NOAA') ||
    name.includes('GOES') ||
    name.includes('HIMAWARI') ||
    name.includes('METEOSAT') ||
    name.includes('METOP') ||
    name.includes('METEOR-M') ||
    name.includes('FENGYUN') ||
    name.includes('LANDSAT') ||
    name.includes('SENTINEL') ||
    name.includes('TERRA') ||
    name.includes('AQUA') ||
    name.includes('AURA') ||
    name.includes('SUOMI') ||
    name.includes('JASON') ||
    name.includes('SWOT') ||
    name.includes('CRYOSAT') ||
    name.includes('SMAP') ||
    name.includes('GPM')
  ) {
    return 'weather';
  }
  if (meanMotion >= 0.95 && meanMotion <= 1.06 && ecc < 0.05) {
    return 'geo';
  }
  if (
    name.includes('CUBE') ||
    name.includes('OSCAR') ||
    name.includes('FLOCK') ||
    name.includes('LEMUR') ||
    name.includes('DOVE') ||
    name.includes('UMBRA') ||
    name.includes('ICEYE')
  ) {
    return 'cubesat';
  }
  return 'other';
}

/**
 * Derive any of the 13 categories locally from the master active satellite dataset
 * so switching tabs makes ZERO extra upstream API calls.
 */
export function filterSatellitesByCategory(allSatellites, groupName, recentIdSet = null) {
  if (!Array.isArray(allSatellites) || allSatellites.length === 0) return [];
  if (groupName === 'all') return allSatellites;

  if (groupName === 'featured') {
    const featuredGroups = new Set(['stations', 'korea', 'weather', 'gnss', 'science']);
    return allSatellites.filter((s) => featuredGroups.has(s._group || classifySatelliteGroup(s)));
  }

  if (groupName === 'korea') {
    return allSatellites.filter((s) => isKoreanSatellite(s));
  }

  if (groupName === 'geo') {
    return allSatellites.filter((s) => {
      const mm = Number(s.MEAN_MOTION || 0);
      const ecc = Number(s.ECCENTRICITY || 0);
      return mm >= 0.95 && mm <= 1.06 && ecc < 0.05;
    });
  }

  if (groupName === 'gps') {
    return allSatellites.filter((s) => {
      const n = String(s.OBJECT_NAME || '').toUpperCase();
      return n.includes('GPS ') || n.includes('NAVSTAR');
    });
  }

  if (groupName === 'recent') {
    if (recentIdSet && recentIdSet.size > 0) {
      return allSatellites.filter((s) => recentIdSet.has(Number(s.NORAD_CAT_ID)));
    }
    // Fallback heuristic: highest catalog numbers / current launch year
    const sorted = [...allSatellites].sort(
      (a, b) => Number(b.NORAD_CAT_ID || 0) - Number(a.NORAD_CAT_ID || 0)
    );
    return sorted.slice(0, 250);
  }

  return allSatellites.filter((s) => (s._group || classifySatelliteGroup(s)) === groupName);
}

export function getCategoryColor(group) {
  return GROUP_COLORS[group] || '#38bdf8';
}

export function getGroupLabel(group) {
  return GROUP_LABELS[group] || '인공위성';
}

export function getSatelliteDisplayInfo(noradId, fallbackName) {
  const meta = NOTABLE_SATELLITES[Number(noradId)];
  return {
    title: meta ? meta.koName : fallbackName,
    originalName: fallbackName,
    summary: meta ? meta.summary : null,
    isNotable: Boolean(meta),
  };
}

/**
 * 3-Tier 3D Spacecraft Model Catalog:
 *   1. fidelity: 'nasa'      — Authentic NASA Public Domain 3D CAD (.glb)
 *   2. fidelity: 'spec'      — Official spec-accurate real-shape modeling (Tiangong T-shape, KOMPSAT-5 SAR, GK-2A/2B single-wing + solar sail)
 *   3. fidelity: 'estimated' — Archetype-based estimated PBR 3D modeling fallback
 */
const REAL_NASA_MODELS = {
  nasa_iss: {
    key: 'nasa_iss',
    file: 'nasa/iss.glb',
    fallbackFile: 'station.glb',
    label: 'ISS 실물 CAD',
    fidelity: 'nasa',
    fidelityLabel: 'NASA 실제 모델',
    targetRadiusM: 62,
    closeupDistanceM: 340,
    lodDistanceM: 3400000,
  },
  nasa_hubble: {
    key: 'nasa_hubble',
    file: 'nasa/hubble.glb',
    fallbackFile: 'telescope.glb',
    label: '허블 망원경 실물 CAD',
    fidelity: 'nasa',
    fidelityLabel: 'NASA 실제 모델',
    targetRadiusM: 28,
    closeupDistanceM: 170,
    lodDistanceM: 3000000,
  },
  nasa_terra: {
    key: 'nasa_terra',
    file: 'nasa/terra.glb',
    fallbackFile: 'earth_obs.glb',
    label: 'Terra 실물 CAD',
    fidelity: 'nasa',
    fidelityLabel: 'NASA 실제 모델',
    targetRadiusM: 28,
    closeupDistanceM: 170,
    lodDistanceM: 3000000,
  },
  nasa_aqua: {
    key: 'nasa_aqua',
    file: 'nasa/aqua.glb',
    fallbackFile: 'earth_obs.glb',
    label: 'Aqua 실물 CAD',
    fidelity: 'nasa',
    fidelityLabel: 'NASA 실제 모델',
    targetRadiusM: 28,
    closeupDistanceM: 170,
    lodDistanceM: 3000000,
  },
  nasa_aura: {
    key: 'nasa_aura',
    file: 'nasa/aura.glb',
    fallbackFile: 'earth_obs.glb',
    label: 'Aura 실물 CAD',
    fidelity: 'nasa',
    fidelityLabel: 'NASA 실제 모델',
    targetRadiusM: 28,
    closeupDistanceM: 170,
    lodDistanceM: 3000000,
  },
  nasa_landsat8: {
    key: 'nasa_landsat8',
    file: 'nasa/landsat8.glb',
    fallbackFile: 'earth_obs.glb',
    label: 'Landsat 8/9 실물 CAD',
    fidelity: 'nasa',
    fidelityLabel: 'NASA 실제 모델',
    targetRadiusM: 26,
    closeupDistanceM: 165,
    lodDistanceM: 3000000,
  },
  nasa_suomi_npp: {
    key: 'nasa_suomi_npp',
    file: 'nasa/suomi_npp.glb',
    fallbackFile: 'earth_obs.glb',
    label: 'JPSS / Suomi NPP 실물 CAD',
    fidelity: 'nasa',
    fidelityLabel: 'NASA 실제 모델',
    targetRadiusM: 26,
    closeupDistanceM: 165,
    lodDistanceM: 3000000,
  },
  nasa_chandra: {
    key: 'nasa_chandra',
    file: 'nasa/chandra.glb',
    fallbackFile: 'telescope.glb',
    label: 'Chandra 실물 CAD',
    fidelity: 'nasa',
    fidelityLabel: 'NASA 실제 모델',
    targetRadiusM: 32,
    closeupDistanceM: 195,
    lodDistanceM: 8000000,
  },
  nasa_tess: {
    key: 'nasa_tess',
    file: 'nasa/tess.glb',
    fallbackFile: 'telescope.glb',
    label: 'TESS 실물 CAD',
    fidelity: 'nasa',
    fidelityLabel: 'NASA 실제 모델',
    targetRadiusM: 24,
    closeupDistanceM: 155,
    lodDistanceM: 8000000,
  },
  nasa_cloudsat: {
    key: 'nasa_cloudsat',
    file: 'nasa/cloudsat.glb',
    fallbackFile: 'earth_obs.glb',
    label: 'CloudSat 실물 CAD',
    fidelity: 'nasa',
    fidelityLabel: 'NASA 실제 모델',
    targetRadiusM: 24,
    closeupDistanceM: 155,
    lodDistanceM: 2800000,
  },
  nasa_calipso: {
    key: 'nasa_calipso',
    file: 'nasa/calipso.glb',
    fallbackFile: 'earth_obs.glb',
    label: 'CALIPSO 실물 CAD',
    fidelity: 'nasa',
    fidelityLabel: 'NASA 실제 모델',
    targetRadiusM: 24,
    closeupDistanceM: 155,
    lodDistanceM: 2800000,
  },
  nasa_tdrs: {
    key: 'nasa_tdrs',
    file: 'nasa/tdrs.glb',
    fallbackFile: 'geo_comm.glb',
    label: 'TDRS 실물 CAD',
    fidelity: 'nasa',
    fidelityLabel: 'NASA 실제 모델',
    targetRadiusM: 34,
    closeupDistanceM: 220,
    lodDistanceM: 18000000,
  },
  nasa_jason: {
    key: 'nasa_jason',
    file: 'nasa/jason.glb',
    fallbackFile: 'earth_obs.glb',
    label: 'Jason 실물 CAD',
    fidelity: 'nasa',
    fidelityLabel: 'NASA 실제 모델',
    targetRadiusM: 24,
    closeupDistanceM: 155,
    lodDistanceM: 3200000,
  },
};

const SPEC_MODELS = {
  tiangong: {
    key: 'tiangong',
    file: 'tiangong.glb',
    label: '톈궁 T자형 3모듈',
    fidelity: 'spec',
    fidelityLabel: '공식 제원 형상',
    targetRadiusM: 52,
    closeupDistanceM: 310,
    lodDistanceM: 3200000,
  },
  kompsat_sar: {
    key: 'kompsat_sar',
    file: 'kompsat_sar.glb',
    label: '아리랑 5호 SAR 형상',
    fidelity: 'spec',
    fidelityLabel: '공식 제원 형상',
    targetRadiusM: 24,
    closeupDistanceM: 155,
    lodDistanceM: 2800000,
  },
  gk2_weather: {
    key: 'gk2_weather',
    file: 'gk2_weather.glb',
    label: '외날개 + 솔라세일 기상형',
    fidelity: 'spec',
    fidelityLabel: '공식 제원 형상',
    targetRadiusM: 34,
    closeupDistanceM: 220,
    lodDistanceM: 18000000,
  },
};

const ESTIMATED_MODELS = {
  station: {
    key: 'station',
    file: 'station.glb',
    label: '우주정거장형',
    fidelity: 'estimated',
    fidelityLabel: '추정 모델링',
    targetRadiusM: 54,
    closeupDistanceM: 330,
    lodDistanceM: 3200000,
  },
  earth_obs: {
    key: 'earth_obs',
    file: 'earth_obs.glb',
    label: '광학·관측형',
    fidelity: 'estimated',
    fidelityLabel: '추정 모델링',
    targetRadiusM: 24,
    closeupDistanceM: 155,
    lodDistanceM: 2800000,
  },
  geo_comm: {
    key: 'geo_comm',
    file: 'geo_comm.glb',
    label: '정지궤도 통신형',
    fidelity: 'estimated',
    fidelityLabel: '추정 모델링',
    targetRadiusM: 34,
    closeupDistanceM: 220,
    lodDistanceM: 18000000,
  },
  gnss: {
    key: 'gnss',
    file: 'gnss.glb',
    label: '항법(GNSS)형',
    fidelity: 'estimated',
    fidelityLabel: '추정 모델링',
    targetRadiusM: 26,
    closeupDistanceM: 170,
    lodDistanceM: 12000000,
  },
  telescope: {
    key: 'telescope',
    file: 'telescope.glb',
    label: '우주망원경형',
    fidelity: 'estimated',
    fidelityLabel: '추정 모델링',
    targetRadiusM: 26,
    closeupDistanceM: 170,
    lodDistanceM: 3000000,
  },
  starlink: {
    key: 'starlink',
    file: 'starlink.glb',
    label: '스타링크 평판형',
    fidelity: 'estimated',
    fidelityLabel: '추정 모델링',
    targetRadiusM: 18,
    closeupDistanceM: 120,
    lodDistanceM: 2400000,
  },
};

export function getSatelliteModelMeta(record) {
  if (!record) return ESTIMATED_MODELS.earth_obs;
  const name = String(record.name || '').toUpperCase();
  const group = record.group || '';
  const id = Number(record.id);

  // Tier 1: Authentic NASA Public Domain 3D CAD models
  if (id === 25544 || id === 49044 || id === 36086 || name.includes('ISS') || name.includes('ZARYA')) {
    return REAL_NASA_MODELS.nasa_iss;
  }
  if (id === 20580 || name === 'HST' || name.includes('HUBBLE')) {
    return REAL_NASA_MODELS.nasa_hubble;
  }
  if (id === 25994 || name === 'TERRA' || name.startsWith('TERRA ')) {
    return REAL_NASA_MODELS.nasa_terra;
  }
  if (id === 27424 || name === 'AQUA' || name.startsWith('AQUA ')) {
    return REAL_NASA_MODELS.nasa_aqua;
  }
  if (id === 28376 || name === 'AURA' || name.startsWith('AURA ')) {
    return REAL_NASA_MODELS.nasa_aura;
  }
  if (id === 39084 || id === 49260 || name.includes('LANDSAT 8') || name.includes('LANDSAT 9')) {
    return REAL_NASA_MODELS.nasa_landsat8;
  }
  if (
    id === 37849 ||
    id === 43013 ||
    id === 54234 ||
    name.includes('SUOMI NPP') ||
    name.includes('NOAA 20') ||
    name.includes('NOAA-20') ||
    name.includes('NOAA 21') ||
    name.includes('NOAA-21') ||
    name.includes('JPSS')
  ) {
    return REAL_NASA_MODELS.nasa_suomi_npp;
  }
  if (id === 25867 || name.includes('CHANDRA')) {
    return REAL_NASA_MODELS.nasa_chandra;
  }
  if (id === 43435 || name === 'TESS' || name.startsWith('TESS ')) {
    return REAL_NASA_MODELS.nasa_tess;
  }
  if (id === 29107 || name.includes('CLOUDSAT')) {
    return REAL_NASA_MODELS.nasa_cloudsat;
  }
  if (id === 29108 || name.includes('CALIPSO')) {
    return REAL_NASA_MODELS.nasa_calipso;
  }
  if (name.includes('TDRS')) {
    return REAL_NASA_MODELS.nasa_tdrs;
  }
  if (name.includes('JASON')) {
    return REAL_NASA_MODELS.nasa_jason;
  }

  // Tier 2: Spec-accurate real-shape modeling (Tiangong, KOMPSAT-5 SAR, GK-2A/2B, GOES-R)
  if (
    id === 48274 ||
    id === 53239 ||
    id === 54216 ||
    name.includes('CSS') ||
    name.includes('TIANHE') ||
    name.includes('WENTIAN') ||
    name.includes('MENGTIAN')
  ) {
    return SPEC_MODELS.tiangong;
  }
  if (id === 39227 || name.includes('KOMPSAT-5') || name.includes('ARIRANG-5')) {
    return SPEC_MODELS.kompsat_sar;
  }
  if (
    id === 43823 ||
    id === 45246 ||
    name.includes('GEO-KOMPSAT-2') ||
    name.includes('GOES 16') ||
    name.includes('GOES 17') ||
    name.includes('GOES 18') ||
    name.includes('GOES 19') ||
    name.includes('HIMAWARI')
  ) {
    return SPEC_MODELS.gk2_weather;
  }

  // Tier 3: Estimated PBR 3D archetype modeling fallback
  if (group === 'stations') return ESTIMATED_MODELS.station;
  if (group === 'starlink' || name.includes('STARLINK')) return ESTIMATED_MODELS.starlink;
  if (
    group === 'gps' ||
    name.includes('GPS') ||
    name.includes('NAVSTAR') ||
    name.includes('GALILEO') ||
    name.includes('GLONASS') ||
    name.includes('BEIDOU')
  ) {
    return ESTIMATED_MODELS.gnss;
  }
  if (group === 'science') return ESTIMATED_MODELS.telescope;
  if (record.regime === 'GEO' || name.includes('KOREASAT')) {
    return ESTIMATED_MODELS.geo_comm;
  }
  return ESTIMATED_MODELS.earth_obs;
}

