export const CATEGORIES = [
  { id: 'all', label: 'All Satellites', labelEn: 'All Satellites', labelKo: '전체 위성 (ALL)', color: '#38bdf8' },
  { id: 'featured', label: 'Featured', labelEn: 'Featured', labelKo: '주요 추천', color: '#0ea5e9' },
  { id: 'favorites', label: 'Favorites', labelEn: 'Favorites', labelKo: '즐겨찾기', color: '#fbbf24' },
  { id: 'visual', label: 'Bright / Visual', labelEn: 'Bright / Visual', labelKo: '육안 관측·밝은 위성', color: '#fde047' },
  { id: 'korea', label: 'South Korea', labelEn: 'South Korea', labelKo: '한국 위성', color: '#22d3ee' },
  { id: 'naro', label: 'Naro Launches', labelEn: 'Naro Launches', labelKo: '나로우주센터 발사', color: '#38bdf8' },
  { id: 'stations', label: 'Space Stations', labelEn: 'Space Stations', labelKo: '우주정거장', color: '#f59e0b' },
  { id: 'weather', label: 'Weather & Climate', labelEn: 'Weather & Climate', labelKo: '기상·기후', color: '#10b981' },
  { id: 'earth', label: 'Earth Obs & SAR', labelEn: 'Earth Obs & SAR', labelKo: '지구관측·SAR', color: '#2dd4bf' },
  { id: 'gnss', label: 'Global GNSS', labelEn: 'Global GNSS', labelKo: '전세계 GNSS', color: '#60a5fa' },
  { id: 'science', label: 'Science & Astro', labelEn: 'Science & Astro', labelKo: '과학·천문', color: '#fb7185' },
  { id: 'geo', label: 'Geostationary GEO', labelEn: 'Geostationary GEO', labelKo: '정지궤도 GEO', color: '#f97316' },
  { id: 'heo', label: 'Elliptical HEO', labelEn: 'Elliptical HEO', labelKo: '타원·몰니야 HEO', color: '#c084fc' },
  { id: 'starlink', label: 'All Starlink', labelEn: 'All Starlink', labelKo: '스타링크 전체', color: '#e2e8f0' },
  { id: 'comms', label: 'OneWeb · Iridium', labelEn: 'OneWeb · Iridium', labelKo: 'OneWeb·Iridium', color: '#34d399' },
  { id: 'cubesat', label: 'CubeSats & Ham', labelEn: 'CubeSats & Ham', labelKo: '큐브·아마추어', color: '#fbbf24' },
  { id: 'recent', label: 'Last 30 Days', labelEn: 'Last 30 Days', labelKo: '최근 30일 발사', color: '#f43f5e' },
  { id: 'other', label: 'Other / Global', labelEn: 'Other / Global', labelKo: '기타·다국적', color: '#94a3b8' },
];

export function getCategoryLabel(cat, lang = 'en') {
  return lang === 'ko' ? cat.labelKo || cat.label : cat.labelEn || cat.label;
}

export const GROUP_COLORS = {
  all: '#38bdf8',
  visual: '#fde047',
  stations: '#f59e0b',
  korea: '#22d3ee',
  naro: '#38bdf8',
  weather: '#10b981',
  earth: '#2dd4bf',
  gnss: '#60a5fa',
  gps: '#60a5fa',
  science: '#fb7185',
  geo: '#f97316',
  heo: '#c084fc',
  starlink: '#cbd5e1',
  comms: '#34d399',
  cubesat: '#fbbf24',
  recent: '#f43f5e',
  other: '#94a3b8',
  custom: '#fb923c',
};

export const GROUP_LABELS = {
  all: { en: 'Active Satellite', ko: '활성 위성' },
  visual: { en: 'Bright / Visual', ko: '밝은 위성' },
  stations: { en: 'Space Station', ko: '우주정거장' },
  korea: { en: 'South Korea', ko: '한국 위성' },
  naro: { en: 'Naro Launch', ko: '나로 발사' },
  weather: { en: 'Weather', ko: '기상·기후' },
  earth: { en: 'Earth Obs / SAR', ko: '지구관측·SAR' },
  gnss: { en: 'GNSS Navigation', ko: 'GNSS 항법' },
  gps: { en: 'GNSS Navigation', ko: 'GNSS 항법' },
  science: { en: 'Science & Astro', ko: '과학·천문' },
  geo: { en: 'Geostationary', ko: '정지궤도 GEO' },
  heo: { en: 'Elliptical HEO', ko: '타원궤도 HEO' },
  starlink: { en: 'Starlink', ko: '스타링크 군집' },
  comms: { en: 'Comms Constellation', ko: '통신 군집' },
  cubesat: { en: 'CubeSat / Ham', ko: '큐브·아마추어' },
  recent: { en: 'Recent Launch', ko: '신규 발사' },
  other: { en: 'General Satellite', ko: '일반 위성' },
  custom: { en: 'Custom Added', ko: '사용자 추가' },
};

export const SATCAT_OWNERS = {
  SKOR: { en: 'South Korea (SKOR)', ko: '대한민국 (SKOR)' },
  US: { en: 'United States (US)', ko: '미국 (US)' },
  PRC: { en: 'China (PRC)', ko: '중국 (PRC)' },
  CIS: { en: 'Russia / CIS', ko: '러시아 / CIS' },
  UK: { en: 'United Kingdom (UK)', ko: '영국 (UK)' },
  JPN: { en: 'Japan (JPN)', ko: '일본 (JPN)' },
  ESA: { en: 'European Space Agency (ESA)', ko: '유럽우주국 (ESA)' },
  IND: { en: 'India (IND)', ko: '인도 (IND)' },
  FR: { en: 'France (FR)', ko: '프랑스 (FR)' },
  GER: { en: 'Germany (GER)', ko: '독일 (GER)' },
  IT: { en: 'Italy (IT)', ko: '이탈리아 (IT)' },
  CA: { en: 'Canada (CA)', ko: '캐나다 (CA)' },
  SPN: { en: 'Spain (SPN)', ko: '스페인 (SPN)' },
  TURK: { en: 'Türkiye (TURK)', ko: '튀르키예 (TURK)' },
  ISS: { en: 'International (ISS)', ko: '국제우주정거장 (다국적)' },
  EUTE: { en: 'Eutelsat (Europe)', ko: 'Eutelsat (유럽)' },
  SES: { en: 'SES (Luxembourg)', ko: 'SES (룩셈부르크)' },
  ITSO: { en: 'Intelsat (Intl.)', ko: 'Intelsat (국제)' },
  IM: { en: 'Inmarsat (Intl.)', ko: 'Inmarsat (국제)' },
  O3B: { en: 'O3b Networks', ko: 'O3b Networks' },
  GLOB: { en: 'Globalstar', ko: 'Globalstar' },
  ORB: { en: 'Orbcomm', ko: 'Orbcomm' },
  AUS: { en: 'Australia (AUS)', ko: '호주 (AUS)' },
  BRAZ: { en: 'Brazil (BRAZ)', ko: '브라질 (BRAZ)' },
  ISRA: { en: 'Israel (ISRA)', ko: '이스라엘 (ISRA)' },
  ARGN: { en: 'Argentina (ARGN)', ko: '아르헨티나 (ARGN)' },
  SAUD: { en: 'Saudi Arabia (SAUD)', ko: '사우디아라비아 (SAUD)' },
  UAE: { en: 'UAE', ko: '아랍에미리트 (UAE)' },
  TWN: { en: 'Taiwan (TWN)', ko: '대만 (TWN)' },
  SING: { en: 'Singapore (SING)', ko: '싱가포르 (SING)' },
  NOR: { en: 'Norway (NOR)', ko: '노르웨이 (NOR)' },
  SWED: { en: 'Sweden (SWED)', ko: '스웨덴 (SWED)' },
  NETH: { en: 'Netherlands (NETH)', ko: '네덜란드 (NETH)' },
  POL: { en: 'Poland (POL)', ko: '폴란드 (POL)' },
  FIN: { en: 'Finland (FIN)', ko: '핀란드 (FIN)' },
  TBD: { en: 'Unassigned (TBD)', ko: '미지정 (TBD)' },
};

export const SATCAT_LAUNCH_SITES = {
  NSC: { en: 'Naro Space Center (Goheung, ROK)', ko: '나로우주센터 (대한민국 고흥)' },
  JJSLA: { en: 'Jeju Offshore Launch (ROK)', ko: '제주 남방 해상발사 (대한민국)' },
  AFETR: { en: 'Cape Canaveral / KSC (USA)', ko: '케이프 커내버럴 / KSC (미국)' },
  AFWTR: { en: 'Vandenberg SFB (USA)', ko: '반덴버그 우주군기지 (미국)' },
  FRGUI: { en: 'Guiana Space Centre (Kourou)', ko: '기아나 우주센터 (쿠루)' },
  TANSC: { en: 'Tanegashima Space Center (Japan)', ko: '다네가시마 우주센터 (일본)' },
  USC: { en: 'Uchinoura Space Center (Japan)', ko: '우치노우라 우주센터 (일본)' },
  TYMSC: { en: 'Baikonur Cosmodrome (Kazakhstan)', ko: '바이코누르 우주기지 (카자흐스탄)' },
  PLMSC: { en: 'Plesetsk Cosmodrome (Russia)', ko: '플레세츠크 우주기지 (러시아)' },
  VOSTO: { en: 'Vostochny Cosmodrome (Russia)', ko: '보스토치니 우주기지 (러시아)' },
  DLS: { en: 'Dombarovsky Air Base (Russia)', ko: '돔바롭스키 기지 (러시아)' },
  RLLB: { en: 'Mahia Peninsula (New Zealand)', ko: '마히아 반도 (뉴질랜드)' },
  SRILR: { en: 'Satish Dhawan Space Centre (India)', ko: '사티시 다완 우주센터 (인도)' },
  JSC: { en: 'Jiuquan Satellite Launch Center (China)', ko: '주취안 위성발사센터 (중국)' },
  TAISC: { en: 'Taiyuan Satellite Launch Center (China)', ko: '타이위안 위성발사센터 (중국)' },
  WSC: { en: 'Wenchang Space Launch Site (China)', ko: '원창 우주발사장 (중국)' },
  XICLF: { en: 'Xichang Satellite Launch Center (China)', ko: '시창 위성발사센터 (중국)' },
  SEAL: { en: 'Sea Launch (Pacific Ocean)', ko: '시런치 (태평양 해상)' },
  WLPIS: { en: 'Wallops Flight Facility (USA)', ko: '월롭스 비행시설 (미국)' },
  KODAK: { en: 'Pacific Spaceport Complex (Alaska)', ko: '코디악 발사장 (미국 알래스카)' },
};

export const SATCAT_OPS_STATUS = {
  '+': { en: 'Operational', ko: '운용 중', tone: 'active' },
  '-': { en: 'Nonoperational', ko: '임무 종료', tone: 'inactive' },
  P: { en: 'Partially Operational', ko: '부분 운용', tone: 'partial' },
  B: { en: 'Backup / Standby', ko: '백업 운용', tone: 'partial' },
  S: { en: 'Spare', ko: '예비 궤도', tone: 'partial' },
  X: { en: 'Extended Mission', ko: '연장 임무', tone: 'active' },
  D: { en: 'Decayed', ko: '재진입 소멸', tone: 'inactive' },
  '?': { en: 'Unknown', ko: '상태 미확인', tone: 'unknown' },
};

export function getOwnerLabel(code, lang = 'en') {
  if (!code) return lang === 'ko' ? '정보 없음' : 'N/A';
  const entry = SATCAT_OWNERS[code];
  if (!entry) return code;
  return lang === 'ko' ? entry.ko : entry.en;
}

export function getLaunchSiteLabel(code, lang = 'en') {
  if (!code) return lang === 'ko' ? '정보 없음' : 'N/A';
  const entry = SATCAT_LAUNCH_SITES[code];
  if (!entry) return code;
  return lang === 'ko' ? entry.ko : entry.en;
}

export function getOpsStatusInfo(code, lang = 'en') {
  if (!code) return { label: lang === 'ko' ? '정보 없음' : 'N/A', tone: 'unknown' };
  const entry = SATCAT_OPS_STATUS[code];
  if (!entry) return { label: code, tone: 'unknown' };
  return { label: lang === 'ko' ? entry.ko : entry.en, tone: entry.tone };
}

export function getRcsSizeLabel(rcs, lang = 'en') {
  const val = Number(rcs);
  if (!Number.isFinite(val) || val <= 0) {
    return lang === 'ko' ? '비공개 / 미측정' : 'Undisclosed / N/A';
  }
  const grade =
    lang === 'ko'
      ? val >= 5
        ? '대형'
        : val >= 1
          ? '중형'
          : val >= 0.1
            ? '소형'
            : '초소형'
      : val >= 5
        ? 'Large'
        : val >= 1
          ? 'Medium'
          : val >= 0.1
            ? 'Small'
            : 'Micro';
  return `${val.toFixed(2)} m² (${grade})`;
}

export const OBSERVER_PRESETS = [
  { id: 'seoul', name: 'Seoul, South Korea', nameEn: 'Seoul, South Korea', nameKo: '서울 (Seoul)', shortEn: 'Seoul', shortKo: '서울', lat: 37.5665, lon: 126.978, heightKm: 0.04 },
  { id: 'daejeon', name: 'Daejeon (KARI)', nameEn: 'Daejeon (KARI)', nameKo: '대전 KARI (항공우주연구원)', shortEn: 'Daejeon', shortKo: '대전', lat: 36.3746, lon: 127.3536, heightKm: 0.08 },
  { id: 'busan', name: 'Busan, South Korea', nameEn: 'Busan, South Korea', nameKo: '부산 (Busan)', shortEn: 'Busan', shortKo: '부산', lat: 35.1796, lon: 129.0756, heightKm: 0.03 },
  { id: 'jeju', name: 'Jeju, South Korea', nameEn: 'Jeju, South Korea', nameKo: '제주 (Jeju)', shortEn: 'Jeju', shortKo: '제주', lat: 33.4996, lon: 126.5312, heightKm: 0.05 },
  { id: 'tokyo', name: 'Tokyo, Japan', nameEn: 'Tokyo, Japan', nameKo: '도쿄 (Tokyo)', shortEn: 'Tokyo', shortKo: '도쿄', lat: 35.6762, lon: 139.6503, heightKm: 0.04 },
  { id: 'newyork', name: 'New York, USA', nameEn: 'New York, USA', nameKo: '뉴욕 (New York)', shortEn: 'New York', shortKo: '뉴욕', lat: 40.7128, lon: -74.006, heightKm: 0.02 },
  { id: 'london', name: 'London, UK', nameEn: 'London, UK', nameKo: '런던 (London)', shortEn: 'London', shortKo: '런던', lat: 51.5074, lon: -0.1278, heightKm: 0.02 },
];

export function getObserverPresetName(obs, lang = 'en') {
  if (!obs) return '';
  if (lang === 'ko') return obs.nameKo || obs.name || '';
  return obs.nameEn || obs.name || '';
}

export function getObserverShortName(obs, lang = 'en') {
  if (!obs) return '';
  if (lang === 'ko') return obs.shortKo || (obs.nameKo || obs.name || '').split(' ')[0];
  return obs.shortEn || (obs.nameEn || obs.name || '').split(',')[0];
}

/**
 * Curated bilingual notes for well-known spacecraft.
 */
export const NOTABLE_SATELLITES = {
  25544: {
    enName: 'International Space Station (ISS)',
    koName: '국제우주정거장 (ISS)',
    enSummary: 'Humanity’s largest crewed orbital laboratory at ~420 km LEO (prime naked-eye target).',
    summary: '고도 약 420km 저궤도를 92분마다 공전하는 인류 최대 유인 우주정거장 (육안 관측 최상)',
  },
  48274: {
    enName: 'Tiangong Space Station (Tianhe)',
    koName: '중국 톈궁 우주정거장 (톈허)',
    enSummary: 'Core module (Tianhe) of China’s crewed Tiangong space station — bright naked-eye target.',
    summary: '중국 유인 우주정거장 톈궁의 핵심 모듈(Tianhe) · 매우 밝은 육안 관측 대상',
  },
  20580: {
    enName: 'Hubble Space Telescope (HST)',
    koName: '허블 우주망원경 (HST)',
    enSummary: 'NASA/ESA optical space telescope launched in 1990 observing the deep universe.',
    summary: '1990년 발사되어 심우주를 관측 중인 NASA/ESA 우주망원경',
  },
  22077: {
    enName: 'KITSAT-1 (Uribyol-1)',
    koName: '우리별 1호 (KITSAT-1)',
    enSummary: 'South Korea’s first artificial satellite, launched in August 1992.',
    summary: '1992년 발사된 대한민국 최초의 인공위성',
  },
  22828: {
    enName: 'KITSAT-2 (Uribyol-2)',
    koName: '우리별 2호 (KITSAT-2)',
    enSummary: 'South Korea’s second satellite, built by domestic engineers in 1993.',
    summary: '1993년 국내 기술진 주도로 제작된 대한민국 두 번째 인공위성',
  },
  23639: {
    enName: 'KOREASAT 1 (Mugunghwa-1)',
    koName: '무궁화 1호 (KOREASAT 1)',
    enSummary: 'South Korea’s first commercial geostationary communications satellite (1995).',
    summary: '1995년 발사된 대한민국 최초의 상용 정지궤도 통신·방송 위성',
  },
  25756: {
    enName: 'KITSAT-3 (Uribyol-3)',
    koName: '우리별 3호 (KITSAT-3)',
    enSummary: 'First indigenously designed Korean experimental science microsatellite (1999).',
    summary: '1999년 독자 설계·개발된 대한민국 최초 고유 모델 과학실험위성',
  },
  26032: {
    enName: 'KOMPSAT-1 (Arirang-1)',
    koName: '아리랑 1호 (KOMPSAT-1)',
    enSummary: 'South Korea’s first multipurpose Earth observation satellite (1999).',
    summary: '1999년 발사된 대한민국 최초의 다목적실용위성',
  },
  27945: {
    enName: 'STSAT-1',
    koName: '과학기술위성 1호 (STSAT-1)',
    enSummary: 'Korean science & technology satellite carrying a far-UV space telescope (2003).',
    summary: '2003년 발사된 국산 우주망원경 탑재 과학기술위성',
  },
  29268: {
    enName: 'KOMPSAT-2 (Arirang-2)',
    koName: '아리랑 2호 (KOMPSAT-2)',
    enSummary: 'High-resolution 1m-class optical Earth observation satellite.',
    summary: '1m급 고해상도 광학 카메라를 탑재한 다목적실용위성 2호',
  },
  29349: {
    enName: 'KOREASAT 5 (Mugunghwa-5)',
    koName: '무궁화 5호 (KOREASAT 5)',
    enSummary: 'Dual-use civil/military geostationary communications satellite.',
    summary: '민·군 공용 정지궤도 통신·방송 위성',
  },
  36744: {
    enName: 'COMS-1 (Cheollian-1)',
    koName: '천리안 1호 (COMS-1)',
    enSummary: 'South Korea’s first geostationary multi-mission weather, ocean, and comms satellite (2010).',
    summary: '2010년 발사된 대한민국 최초의 정지궤도 통신·해양·기상 복합위성',
  },
  37265: {
    enName: 'KOREASAT 6 (Mugunghwa-6)',
    koName: '무궁화 6호 (KOREASAT 6)',
    enSummary: 'KT SAT geostationary broadcast & telecommunications satellite.',
    summary: 'KT SAT 정지궤도 방송·위성통신 주력 위성',
  },
  38338: {
    enName: 'KOMPSAT-3 (Arirang-3)',
    koName: '아리랑 3호 (KOMPSAT-3)',
    enSummary: 'Korean 0.7m-class high-resolution electro-optical Earth observation satellite.',
    summary: '대한민국 다목적실용위성 3호 · 0.7m급 고해상도 광학 지구관측 위성',
  },
  39227: {
    enName: 'KOMPSAT-5 (Arirang-5)',
    koName: '아리랑 5호 (KOMPSAT-5)',
    enSummary: 'South Korea’s first all-weather Synthetic Aperture Radar (SAR) observation satellite.',
    summary: '대한민국 최초 영상레이더(SAR) 탑재 전천후 지구관측 위성',
  },
  39422: {
    enName: 'STSAT-3',
    koName: '과학기술위성 3호 (STSAT-3)',
    enSummary: 'Korean science satellite equipped with near-infrared space & Earth cameras.',
    summary: '적외선 우주·지구 관측 카메라를 탑재한 국산 과학위성',
  },
  40536: {
    enName: 'KOMPSAT-3A (Arirang-3A)',
    koName: '아리랑 3A호 (KOMPSAT-3A)',
    enSummary: 'Sub-meter optical + infrared Earth observation multipurpose satellite.',
    summary: '초고해상도 광학 + 적외선 센서 탑재 다목적실용위성',
  },
  42691: {
    enName: 'KOREASAT 7 (Mugunghwa-7)',
    koName: '무궁화 7호 (KOREASAT 7)',
    enSummary: 'KT SAT geostationary broadcast and regional communications satellite.',
    summary: 'KT SAT 정지궤도 방송·통신 위성',
  },
  42984: {
    enName: 'KOREASAT 5A (Mugunghwa-5A)',
    koName: '무궁화 5A호 (KOREASAT 5A)',
    enSummary: 'East Asia & maritime wide-beam geostationary communications satellite.',
    summary: '동아시아·해상 광역 커버리지 정지궤도 통신 위성',
  },
  43782: {
    enName: 'SNUSAT-2',
    koName: '서울대 위성 2호 (SNUSAT-2)',
    enSummary: 'Earth observation CubeSat developed by Seoul National University.',
    summary: '서울대학교 개발 지구관측 초소형 큐브위성',
  },
  43811: {
    enName: 'NEXTSAT-1',
    koName: '차세대소형위성 1호 (NEXTSAT-1)',
    enSummary: 'KAIST SaTReC space science & core technology verification small satellite.',
    summary: 'KAIST 인공위성연구소 개발 우주과학·핵심기술 검증 소형위성',
  },
  43823: {
    enName: 'GEO-KOMPSAT-2A (Cheollian-2A)',
    koName: '천리안 2A호 (GK-2A)',
    enSummary: 'Geostationary weather & space-weather satellite stationed at 128.2°E over Korea.',
    summary: '동경 128.2° 정지궤도에서 한반도 기상·우주기상을 상시 감시하는 위성',
  },
  45246: {
    enName: 'GEO-KOMPSAT-2B (Cheollian-2B)',
    koName: '천리안 2B호 (GK-2B)',
    enSummary: 'Geostationary ocean & atmospheric environment (air quality) monitoring satellite at 128.2°E.',
    summary: '동경 128.2° 정지궤도에서 한반도 해양·대기환경(미세먼지)을 관측하는 위성',
  },
  45920: {
    enName: 'ANASIS-II (KOREASAT 116)',
    koName: '아나시스 2호 (KOREASAT 116)',
    enSummary: 'South Korea’s first dedicated military geostationary communications satellite.',
    summary: '대한민국 최초 군 전용 정지궤도 통신위성 (ANASIS-II)',
  },
  47932: {
    enName: 'CAS500-1',
    koName: '차세대중형위성 1호 (국토위성)',
    enSummary: 'Indigenous 500 kg-class standard-platform precision land observation satellite.',
    summary: '국내 독자 개발 500kg급 표준 플랫폼 정밀 지상관측 위성',
  },
  52894: {
    enName: 'PVSAT (Nuri KSLV-II)',
    koName: '누리호 성능검증위성 (PVSAT)',
    enSummary: 'Performance Verification Satellite launched from Naro Space Center on Nuri Flight 2 (2022).',
    summary: '2022년 누리호 2차 발사 성공으로 나로우주센터에서 궤도에 안착한 위성',
  },
  56743: {
    enName: 'NEXTSAT-2',
    koName: '차세대소형위성 2호 (NEXTSAT-2)',
    enSummary: 'Korean small X-band SAR imaging satellite launched aboard Nuri Flight 3.',
    summary: '누리호 3차 발사로 궤도에 안착한 국산 소형 SAR 영상레이더 위성',
  },
  56744: {
    enName: 'SNIPE 4 (Doyosat-4)',
    koName: '도요샛 4호 라온 (SNIPE 4)',
    enSummary: 'KASI formation-flying space weather nanosatellite.',
    summary: '한국천문연구원 개발 편대비행 우주날씨 관측 큐브위성',
  },
  56745: {
    enName: 'SNIPE 2 (Doyosat-2)',
    koName: '도요샛 2호 나래 (SNIPE 2)',
    enSummary: 'KASI formation-flying space weather nanosatellite.',
    summary: '한국천문연구원 개발 편대비행 우주날씨 관측 큐브위성',
  },
  58323: {
    enName: 'OBSERVER-1A',
    koName: '옵저버-1A (OBSERVER-1A)',
    enSummary: 'Commercial micro Earth-observation satellite developed by Nara Space.',
    summary: '나라스페이스테크놀로지 개발 국내 민간 초소형 지구관측 위성',
  },
  58463: {
    enName: 'KORSAT-7 (425 EO/IR #1)',
    koName: '군정찰위성 1호기 (KORSAT-7)',
    enSummary: 'Korean 425-program EO/IR reconnaissance satellite (public catalog orbit).',
    summary: '대한민국 425 사업 고해상도 전자광학·적외선(EO/IR) 정찰위성 (공개 궤도)',
  },
  59117: {
    enName: 'CONTECSAT-1',
    koName: '컨텍샛-1 (CONTECSAT-1)',
    enSummary: 'Commercial optical Earth observation satellite operated by CONTEC.',
    summary: '국내 우주기업 컨텍(CONTEC)이 운용하는 광학 지구관측 위성',
  },
  59452: {
    enName: 'KORSAT-1 (425 SAR #2)',
    koName: '군정찰위성 2호기 (KORSAT-1)',
    enSummary: 'Korean 425-program all-weather SAR satellite (public catalog orbit).',
    summary: '대한민국 425 사업 전천후 영상레이더(SAR) 정찰위성 (공개 궤도)',
  },
  59587: {
    enName: 'NEONSAT-1',
    koName: '초소형군집위성 1호 (NEONSAT-1)',
    enSummary: 'Pathfinder spacecraft for South Korea’s high-revisit micro-constellation.',
    summary: '한반도 정밀 감시를 위한 대한민국 초소형 군집위성 선도기',
  },
  61910: {
    enName: 'KOREASAT 6A (Mugunghwa-6A)',
    koName: '무궁화 6A호 (KOREASAT 6A)',
    enSummary: 'KT SAT next-generation geostationary communications satellite (launched 2024).',
    summary: 'KT SAT 차세대 정지궤도 통신 위성 (2024년 발사)',
  },
  62377: {
    enName: 'KORSAT-2 (425 SAR #3)',
    koName: '군정찰위성 3호기 (KORSAT-2)',
    enSummary: 'Korean 425-program all-weather SAR satellite (public catalog orbit).',
    summary: '대한민국 425 사업 전천후 영상레이더(SAR) 정찰위성 (공개 궤도)',
  },
  63210: {
    enName: 'JINJUSAT-1B',
    koName: '진주샛-1B (JINJUSAT-1B)',
    enSummary: 'Regional Earth-observation CubeSat jointly developed by Jinju City, GNU, and KTL.',
    summary: '경상남도 진주시·경상국립대·KTL 공동 개발 초소형 지구관측 큐브위성',
  },
  63229: {
    enName: 'SpaceEye-T1',
    koName: '스페이스아이-T1 (SPACEEYE-T1)',
    enSummary: '30 cm-class ultra-high-resolution commercial optical satellite by Satrec Initiative.',
    summary: '쎄트렉아이 자체 개발 30cm급 초고해상도 상용 광학 지구관측 위성',
  },
  63630: {
    enName: 'KORSAT-3 (425 SAR #4)',
    koName: '군정찰위성 4호기 (KORSAT-3)',
    enSummary: 'Korean 425-program all-weather SAR satellite (public catalog orbit).',
    summary: '대한민국 425 사업 전천후 영상레이더(SAR) 정찰위성 (공개 궤도)',
  },
  66293: {
    enName: 'KORSAT-4 (425 SAR #5)',
    koName: '군정찰위성 5호기 (KORSAT-4)',
    enSummary: 'Korean 425-program all-weather SAR satellite (public catalog orbit).',
    summary: '대한민국 425 사업 전천후 영상레이더(SAR) 정찰위성 (공개 궤도)',
  },
  66655: {
    enName: 'CAS500-3',
    koName: '차세대중형위성 3호 (CAS500-3)',
    enSummary: 'Space science & technology-verification satellite launched from Naro Space Center on Nuri Flight 4.',
    summary: '누리호 4차 발사로 나로우주센터에서 궤도에 안착한 우주과학·기술검증 위성',
  },
  66771: {
    enName: 'GYEONGGISAT-1',
    koName: '경기기후위성 1호 (GYEONGGISAT-1)',
    enSummary: 'Gyeonggi Province microsatellite monitoring greenhouse gases & climate change.',
    summary: '경기도 온실가스·기후변화 정밀 관측용 초소형 위성',
  },
  66820: {
    enName: 'KOMPSAT-7 (Arirang-7)',
    koName: '아리랑 7호 (KOMPSAT-7)',
    enSummary: 'Next-generation 0.3m-class ultra-high-resolution optical Earth observation satellite.',
    summary: '0.3m급 초고해상도 광학 관측 능력을 갖춘 차세대 다목적실용위성',
  },
  67614: {
    enName: 'NEONSAT-1A',
    koName: '초소형군집위성 1A호 (NEONSAT-1A)',
    enSummary: 'South Korean rapid-revisit Earth-observation constellation satellite.',
    summary: '한반도 재방문 주기를 단축하는 대한민국 초소형 군집위성',
  },
  68989: {
    enName: 'BUSANSAT',
    koName: '부산샛 (BUSANSAT)',
    enSummary: 'Busan Metropolitan City nanosatellite monitoring coastal marine aerosols & environment.',
    summary: '부산광역시 해양 미세먼지·연안 환경 관측용 초소형 위성',
  },
  69013: {
    enName: 'CAS500-2',
    koName: '차세대중형위성 2호 (CAS500-2)',
    enSummary: '500 kg-class high-resolution optical satellite for national land & resource mapping.',
    summary: '국토·자원 관리용 500kg급 고해상도 광학 지구관측 위성',
  },
  69869: {
    enName: 'CAS500-4',
    koName: '차세대중형위성 4호 (CAS500-4)',
    enSummary: 'Wide-swath precision observation satellite for agriculture, forestry, and water resources.',
    summary: '농림·산림·수자원 광역 정밀 관측용 농림위성',
  },
  100950: {
    enName: 'GYEONGGISAT-2A',
    koName: '경기기후위성 2A호 (GYEONGGISAT-2A)',
    enSummary: 'Next-generation Gyeonggi Province climate & greenhouse-gas monitoring satellite.',
    summary: '경기도 온실가스 정밀 감시용 차세대 기후위성',
  },
  100955: {
    enName: 'NEONSAT-02',
    koName: '초소형군집위성 2호 (NEONSAT-02)',
    enSummary: 'Production unit of South Korea’s micro-constellation launched from Naro Space Center.',
    summary: '나로우주센터에서 발사된 대한민국 초소형 군집위성 양산기',
  },
  100961: {
    enName: 'NEONSAT-03',
    koName: '초소형군집위성 3호 (NEONSAT-03)',
    enSummary: 'Production unit of South Korea’s micro-constellation launched from Naro Space Center.',
    summary: '나로우주센터에서 발사된 대한민국 초소형 군집위성 양산기',
  },
  100962: {
    enName: 'NEONSAT-04',
    koName: '초소형군집위성 4호 (NEONSAT-04)',
    enSummary: 'Production unit of South Korea’s micro-constellation launched from Naro Space Center.',
    summary: '나로우주센터에서 발사된 대한민국 초소형 군집위성 양산기',
  },
  100963: {
    enName: 'NEONSAT-05',
    koName: '초소형군집위성 5호 (NEONSAT-05)',
    enSummary: 'Production unit of South Korea’s micro-constellation launched from Naro Space Center.',
    summary: '나로우주센터에서 발사된 대한민국 초소형 군집위성 양산기',
  },
  100967: {
    enName: 'DAEJEONSAT-1',
    koName: '대전샛-1 (DAEJEONSAT-1)',
    enSummary: 'Regional space-industry microsatellite developed by Daejeon’s industry-academia consortium.',
    summary: '대전광역시 산학연 공동 개발 지역 우주산업 초소형 위성',
  },
  100968: {
    enName: 'NEONSAT-06',
    koName: '초소형군집위성 6호 (NEONSAT-06)',
    enSummary: 'Production unit of South Korea’s micro-constellation launched from Naro Space Center.',
    summary: '나로우주센터에서 발사된 대한민국 초소형 군집위성 양산기',
  },
  43013: {
    enName: 'NOAA-20 (JPSS-1)',
    koName: 'NOAA-20 (JPSS-1)',
    enSummary: 'US polar-orbiting meteorological satellite feeding global weather forecasting models.',
    summary: '극궤도를 돌며 전 지구 기상 예보 데이터를 수집하는 미국 기상위성',
  },
  54234: {
    enName: 'NOAA-21 (JPSS-2)',
    koName: 'NOAA-21 (JPSS-2)',
    enSummary: 'Latest-generation polar-orbiting weather & environmental observation satellite.',
    summary: '최신 극궤도 기상·환경 관측 위성',
  },
};

const STATION_IDS = new Set([25544, 48274, 49044, 53239, 54216]);
const KOREA_IDS = new Set([
  22077, 22828, 23639, 25756, 26032, 27945, 29268, 29349, 36744, 37265,
  38338, 39227, 39422, 40536, 42691, 42984, 43782, 43784, 43811, 43823,
  45246, 45920, 47932, 52894, 52895, 52897, 52898, 52899, 52900, 56743,
  56744, 56745, 58323, 58463, 58500, 59117, 59452, 59587, 61910, 62377,
  63210, 63229, 63630, 66293, 66650, 66653, 66655, 66657, 66658, 66660,
  66661, 66662, 66771, 66820, 67614, 68417, 68989, 69013, 69869, 100899,
  100950, 100955, 100956, 100957, 100958, 100961, 100962, 100963, 100967, 100968,
]);

export function isKoreanSatellite(omm) {
  if (!omm) return false;
  const name = String(omm.OBJECT_NAME || '').toUpperCase();
  if (name.includes('DEB') || name.includes('R/B')) return false;
  if (omm._ow === 'SKOR') return true;
  const id = Number(omm.NORAD_CAT_ID);
  if (KOREA_IDS.has(id)) return true;
  return (
    name.includes('KOMPSAT') ||
    name.includes('ARIRANG') ||
    name.includes('KOREASAT') ||
    name.includes('KORSAT') ||
    name.includes('CAS500') ||
    name.includes('NEXTSAT') ||
    name.includes('NEONSAT') ||
    name.includes('KITSAT') ||
    name.includes('SNUGLITE') ||
    name.includes('SNUSAT') ||
    name.includes('SNIPE ') ||
    name.includes('MIMAN') ||
    name.includes('RANDEV') ||
    name.includes('GYEONGGI') ||
    name.includes('BUSANSAT') ||
    name.includes('DAEJEONSAT') ||
    name.includes('JINJUSAT') ||
    name.includes('SPACEEYE') ||
    name.includes('CONTECSAT') ||
    name.includes('OBSERVER-1') ||
    name.includes('GK-2') ||
    name.startsWith('STSAT')
  );
}

export function isEarthObservationSatellite(omm) {
  const name = String(omm?.OBJECT_NAME || '').toUpperCase();
  return (
    name.includes('LANDSAT') ||
    name.includes('SENTINEL') ||
    name.includes('KOMPSAT') ||
    name.includes('ARIRANG') ||
    name.includes('CAS500') ||
    name.includes('NEONSAT') ||
    name.includes('SPACEEYE') ||
    name.includes('FLOCK') ||
    name.includes('DOVE') ||
    name.includes('SKYSAT') ||
    name.includes('PELICAN') ||
    name.includes('ICEYE') ||
    name.includes('CAPELLA') ||
    name.includes('UMBRA') ||
    name.includes('BLACKSKY') ||
    name.includes('WORLDVIEW') ||
    name.includes('GEOEYE') ||
    name.includes('PLEIADES') ||
    name.includes('SPOT ') ||
    name.includes('RADARSAT') ||
    name.includes('COSMO-SKYMED') ||
    name.includes('TERRA') ||
    name.includes('AQUA') ||
    name.includes('ALOS') ||
    name.includes('GAOFEN') ||
    name.includes('JILIN') ||
    name.includes('YAOGAN') ||
    name.includes('SUPERDOVE')
  );
}

/**
 * Strip non-essential OMM keys while preserving every field required by satellite.js json2satrec()
 * and SATCAT metadata (_ow, _ld, _ls, _st, _rcs). Reduces 16,900-satellite JSON payload by ~35%.
 */
export function compactOmmRecord(omm, groupTag = null) {
  const out = {
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
  if (omm._ow) out._ow = omm._ow;
  if (omm._ld) out._ld = omm._ld;
  if (omm._ls) out._ls = omm._ls;
  if (omm._st) out._st = omm._st;
  if (Number.isFinite(Number(omm._rcs)) && Number(omm._rcs) > 0) {
    out._rcs = Number(omm._rcs);
  }
  return out;
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
    name.includes('ORBCOMM') ||
    name.includes('BLUEWALKER') ||
    name.includes('BLUEBIRD')
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
    name.includes('HINODE') ||
    name.includes('XRISM') ||
    name.includes('EINSTEIN PROBE')
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
    name.includes('SUOMI') ||
    name.includes('JASON') ||
    name.includes('SWOT') ||
    name.includes('CRYOSAT') ||
    name.includes('SMAP') ||
    name.includes('GPM') ||
    name.includes('AURA')
  ) {
    return 'weather';
  }
  if (isEarthObservationSatellite(omm)) {
    return 'earth';
  }
  if (meanMotion >= 0.95 && meanMotion <= 1.06 && ecc < 0.05) {
    return 'geo';
  }
  if (ecc >= 0.25) {
    return 'heo';
  }
  if (
    name.includes('CUBE') ||
    name.includes('OSCAR') ||
    name.includes('LEMUR') ||
    name.includes('SPIRE')
  ) {
    return 'cubesat';
  }
  return 'other';
}

/**
 * Derive any of the 18 categories locally from the master active satellite dataset
 * so switching tabs makes ZERO extra upstream API calls.
 */
export function filterSatellitesByCategory(allSatellites, groupName, options = null) {
  if (!Array.isArray(allSatellites) || allSatellites.length === 0) return [];
  if (groupName === 'all') return allSatellites;

  // Backwards-compatible: options can be a Set (recentIdSet) or { recentIdSet, brightIdSet }
  const recentIdSet = options instanceof Set ? options : options?.recentIdSet || null;
  const brightIdSet = options instanceof Set ? null : options?.brightIdSet || null;

  if (groupName === 'featured') {
    const featuredGroups = new Set(['stations', 'korea', 'weather', 'gnss', 'science']);
    return allSatellites.filter((s) => featuredGroups.has(s._group || classifySatelliteGroup(s)));
  }

  if (groupName === 'visual') {
    return allSatellites.filter((s) => {
      const id = Number(s.NORAD_CAT_ID);
      if (STATION_IDS.has(id) || id === 20580) return true;
      if (brightIdSet && brightIdSet.has(id)) return true;
      const rcs = Number(s._rcs || 0);
      const mm = Number(s.MEAN_MOTION || 0);
      // Large LEO spacecraft (RCS >= 3 m² and altitude < ~2000 km) are prime naked-eye targets
      return rcs >= 3.0 && mm >= 11.2;
    });
  }

  if (groupName === 'korea') {
    return allSatellites.filter((s) => isKoreanSatellite(s));
  }

  if (groupName === 'naro') {
    return allSatellites.filter((s) => s._ls === 'NSC');
  }

  if (groupName === 'earth') {
    return allSatellites.filter((s) => isEarthObservationSatellite(s));
  }

  if (groupName === 'geo') {
    return allSatellites.filter((s) => {
      const mm = Number(s.MEAN_MOTION || 0);
      const ecc = Number(s.ECCENTRICITY || 0);
      return mm >= 0.95 && mm <= 1.06 && ecc < 0.05;
    });
  }

  if (groupName === 'heo') {
    return allSatellites.filter((s) => Number(s.ECCENTRICITY || 0) >= 0.25);
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

export function getGroupLabel(group, lang = 'en') {
  const entry = GROUP_LABELS[group];
  if (!entry) return lang === 'ko' ? '인공위성' : 'Satellite';
  return lang === 'ko' ? entry.ko : entry.en;
}

export function getSatelliteDisplayInfo(noradId, fallbackName, lang = 'en') {
  const meta = NOTABLE_SATELLITES[Number(noradId)];
  return {
    title: meta ? (lang === 'ko' ? meta.koName : meta.enName || fallbackName) : fallbackName,
    originalName: fallbackName,
    summary: meta ? (lang === 'ko' ? meta.summary : meta.enSummary || null) : null,
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

const MODEL_LABELS_EN = {
  nasa_iss: 'ISS Real CAD',
  nasa_hubble: 'Hubble Telescope Real CAD',
  nasa_terra: 'Terra Real CAD',
  nasa_aqua: 'Aqua Real CAD',
  nasa_aura: 'Aura Real CAD',
  nasa_landsat8: 'Landsat 8/9 Real CAD',
  nasa_suomi_npp: 'JPSS / Suomi NPP Real CAD',
  nasa_chandra: 'Chandra X-ray Real CAD',
  nasa_tess: 'TESS Real CAD',
  nasa_cloudsat: 'CloudSat Real CAD',
  nasa_calipso: 'CALIPSO Real CAD',
  nasa_tdrs: 'TDRS Real CAD',
  nasa_jason: 'Jason Real CAD',
  tiangong: 'Tiangong T-Shape 3-Module',
  kompsat_sar: 'KOMPSAT-5 SAR Bus',
  gk2_weather: 'Single-Wing + Solar Sail Weather',
  station: 'Space Station Class',
  earth_obs: 'Optical / Earth Obs Bus',
  geo_comm: 'GEO Communications Bus',
  gnss: 'GNSS Navigation Bus',
  telescope: 'Space Telescope Bus',
  starlink: 'Starlink Flat-Panel',
};

const FIDELITY_LABELS_EN = {
  nasa: 'NASA Official 3D',
  spec: 'Spec-Accurate 3D',
  estimated: 'Archetype 3D',
};

function selectRawModelMeta(record) {
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
    group === 'gnss' ||
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

export function getSatelliteModelMeta(record, lang = 'en') {
  const base = selectRawModelMeta(record);
  if (lang === 'ko') return base;
  return {
    ...base,
    label: MODEL_LABELS_EN[base.key] || base.label,
    fidelityLabel: FIDELITY_LABELS_EN[base.fidelity] || base.fidelityLabel,
  };
}


