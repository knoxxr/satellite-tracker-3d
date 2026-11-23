export const CATEGORIES = [
  { id: 'featured', label: '주요 전체', color: '#38bdf8' },
  { id: 'favorites', label: '즐겨찾기', color: '#fbbf24' },
  { id: 'stations', label: '우주정거장', color: '#f59e0b' },
  { id: 'korea', label: '한국 위성', color: '#38bdf8' },
  { id: 'weather', label: '기상·관측', color: '#10b981' },
  { id: 'gps', label: 'GPS/항법', color: '#60a5fa' },
  { id: 'science', label: '과학·천문', color: '#fb7185' },
  { id: 'starlink', label: '스타링크', color: '#e2e8f0' },
];

export const GROUP_COLORS = {
  stations: '#f59e0b',
  korea: '#38bdf8',
  weather: '#10b981',
  gps: '#60a5fa',
  science: '#fb7185',
  starlink: '#cbd5e1',
  custom: '#f97316',
};

export const GROUP_LABELS = {
  stations: '우주정거장',
  korea: '한국 위성',
  weather: '기상·지구관측',
  gps: 'GNSS 항법',
  science: '과학·천문',
  starlink: '스타링크 군집',
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
  43013: {
    koName: 'NOAA-20 (JPSS-1)',
    summary: '극궤도를 돌며 전 지구 기상 예보 데이터를 수집하는 미국 기상위성',
  },
  54234: {
    koName: 'NOAA-21 (JPSS-2)',
    summary: '최신 극궤도 기상·환경 관측 위성',
  },
};

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

