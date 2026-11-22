export const CATEGORIES = [
  { id: 'featured', label: '주요 전체', color: '#38bdf8' },
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
