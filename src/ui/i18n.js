const STORAGE_KEY_LANG = 'orbitpulse_lang_v1';

const DICT = {
  en: {
    pageTitle: 'OrbitPulse 3D — Real-Time 3D Global Satellite Tracker',
    brandSubtitleDefault: 'Real-Time SGP4 · 3D Satellite Globe',
    splashLoading: 'Synchronizing 17,000+ global satellites...',
    splashInitGlobe: 'Initializing 3D globe...',
    splashSyncingAll: 'Synchronizing all public active satellites...',
    searchPlaceholder: 'Name · NORAD · Country (SKOR/US) · Launch Site',
    listLoading: 'Loading satellites...',
    syncBtn: 'Sync',
    syncBtnTitle: 'Sync latest orbital elements from CelesTrak / CDN',
    expandDrawer: 'Satellites',
    collapseDrawerTitle: 'Collapse list',
    expandDrawerTitle: 'Open satellite list',

    engGlobe: '3D Globe',
    engGlobeTitle: 'High-Res 3D Satellite Globe (Default · No API Key)',
    engGoogleTiles: 'Google 3D Tiles',
    engGoogleTilesTitle: 'Google Photorealistic 3D Tiles (API Key Required)',
    engGoogleNative: 'Google Maps 3D',
    engGoogleNativeTitle: 'Google Maps Native 3D Engine (API Key Required)',
    subtitleGlobe: 'Real-Time SGP4 · 3D Satellite Globe',
    subtitleGoogleTiles: 'Google Photorealistic 3D Tiles · SGP4 Live',
    subtitleGoogleNative: 'Google Maps Native 3D · SGP4 Live',

    layersBtn: 'Layers',
    layersTitle: 'Map layers & display options',
    addSatBtn: 'Add Satellite',
    addSatTitle: 'Track by NORAD ID or custom TLE',
    apiKeyBtn: 'Google API Key',
    apiKeyConnected: 'Google API Connected',
    apiKeyTitle: 'Configure Google Maps 3D API Key',
    langToggleTitle: 'Switch language (English / 한국어)',

    layersHeading: 'Map & Display Options',
    layersEngineLabel: '3D Map Engine',
    layersBasemapLabel: 'Base Satellite Imagery',
    basemapHybrid: 'Google Hybrid',
    basemapSat: 'Google Satellite',
    basemapEsri: 'Esri Satellite',
    basemapDark: 'Dark Vector',
    layersOptionsLabel: 'Display Options',
    optLighting: 'Real-Time Day/Night Lighting',
    optOrbit: 'Selected Orbit Track (3D)',
    optFootprint: 'Ground Visibility Footprint',
    optVectors: '3D Attitude Guides (Velocity · Nadir)',
    layersObserverLabel: 'Observer Station (Pass & Look Angles)',
    btnGeolocate: 'Use Current GPS Location',

    favoriteAddTitle: 'Add to favorites',
    favoriteRemoveTitle: 'Remove from favorites',
    shareTitle: 'Copy share link',
    expandTelemetryTitle: 'Expand / collapse details',
    closeTitle: 'Close',
    model3dLabel: '3D Spacecraft Model',
    model3dLoading: 'Loading 3D model...',
    model3dActive: '3D Model Active',
    model3dZoomHint: 'Zoom in for 3D model',
    btnCloseup: '3D Close-Up',
    btnCloseupTitle: 'Zoom into close-up 3D spacecraft view',
    btnFollow: 'Track Camera',
    btnFollowing: 'Tracking',
    btnFlyto: 'Orbit View',

    secOrbitTitle: 'Live Position & Orbital Elements',
    lblLat: 'Latitude (LAT)',
    lblLon: 'Longitude (LON)',
    lblAlt: 'Altitude (ALT)',
    lblSpeed: 'Orbital Speed',
    lblPeriod: 'Orbital Period',
    lblInc: 'Inclination',
    lblApsis: 'Perigee / Apogee',
    lblFootprint: 'Footprint Radius',

    secSatcatTitle: 'SATCAT Official Metadata',
    lblOwner: 'Owner / Agency',
    lblLaunchDate: 'Launch Date',
    lblLaunchSite: 'Launch Site',
    lblRcs: 'Radar Cross Section (RCS)',
    unknownValue: 'N/A',
    rcsUnavailable: 'Undisclosed / N/A',

    secObserverPrefix: 'Observer Look Angles',
    visAboveHorizon: 'Above Horizon',
    visBelowHorizon: 'Below Horizon',
    lblAz: 'Azimuth (AZ)',
    lblEl: 'Elevation (EL)',
    lblRange: 'Slant Range',

    visualHeading: 'Naked-Eye Visibility',
    visualComputing: 'Calculating solar illumination & sky conditions...',
    visualSunlit: '☀ Sunlit',
    visualUmbra: '🌑 In Earth Shadow',
    visualMagPrefix: 'Est. Mag',
    visualMagUnknown: 'Mag --',

    skyDay: 'Daytime',
    skyCivil: 'Civil Twilight',
    skyNautical: 'Twilight (Optimal)',
    skyNight: 'Night Sky',

    visStatusBelow: 'Below Horizon',
    visDetailBelow: 'Satellite is currently below the observer horizon.',
    visStatusShadow: 'In Earth Shadow (Eclipse)',
    visDetailShadow: 'Overhead, but inside Earth’s shadow and not reflecting sunlight.',
    visStatusDay: 'Daytime Sky · Not Visible',
    visDetailDay: 'Sunlit overhead, but local sky is too bright (Sun alt {sunEl}°).',
    visStatusNaked: 'Visible to Naked Eye!',
    visDetailNaked: 'Sunlit satellite against a dark sky (est. magnitude {mag}).',
    visStatusBino: 'Binoculars Recommended',
    visDetailBino: 'Faint to unaided eye, observable with binoculars (est. mag {mag}).',
    visStatusFaint: 'Too Faint (Telescope)',
    visDetailFaint: 'Too dim for naked-eye viewing due to range/size{magSuffix}.',

    passCalculating: 'Calculating upcoming passes...',
    passUnavailable: 'Unable to calculate pass predictions.',
    passGeoAlways: 'Geostationary (GEO) — continuously above horizon (elevation <strong>{el}°</strong>)',
    passGeoBelow: 'Geostationary (GEO) — permanently below this observer’s horizon.',
    passNone48h: 'No overhead passes predicted within the next 48 hours.',
    passListHeading: 'Next 48h Overhead Passes ({count})',
    passListHeadingNaked: 'Next 48h Overhead Passes ({count} · ★ {naked} Naked-Eye)',
    passNowTag: 'LIVE',
    passMaxEl: 'Max <strong>{el}°</strong>',
    passDurMin: ' · {min}m',
    passJumpBtn: 'Jump',
    passJumpTitle: 'Jump simulation to this pass peak',
    passTagNaked: '★ Eye',
    passTagBino: 'Bino',
    passTagShadow: 'Eclipse',
    passTagDay: 'Day',

    scrubberTitle: 'Timeline Explorer (±24h)',
    scrubberLive: 'Live (0m)',
    scrubberHrMin: '{sign}{h}h {m}m',
    scrubberMin: '{sign}{m}m',
    liveBadgeTitle: 'Return to live real-time clock',
    playPauseTitle: 'Play / Pause',
    scrubberToggleTitle: '±24h Timeline Explorer',
    speedCycleTitle: 'Cycle simulation speed',

    listFavCount: '{count} favorites',
    listTotalCount: 'Showing {shown} / {total}',
    emptyFavHtml: 'No favorite satellites yet.<br/>Click ★ in the detail panel to bookmark any spacecraft.',
    emptySearchHtml: 'No matching satellites.<br/>Press Enter with a satellite name or NORAD ID to query CelesTrak live.',

    syncWorking: 'Syncing orbital data...',
    syncError: 'Data load error',
    srcCdn: 'CDN Shared Snapshot',
    srcServer: 'Server Shared Cache',
    srcLive: 'CelesTrak Live',
    srcFallback: 'Local Snapshot',

    vecVelocity: 'Velocity',
    vecNadir: 'Nadir (Earth)',
    myLocation: 'My Location (GPS)',

    modalApiTitle: 'Google Maps 3D API Key',
    modalApiDesc: 'Enter your Google Maps Platform API key to unlock <strong>Google Photorealistic 3D Tiles</strong> and <strong>Google Maps 3D</strong> native mode.',
    modalApiGuideTitle: 'Recommended Google Cloud APIs',
    modalApiGuideTiles: '<strong>Map Tiles API</strong> — Render Google Photorealistic 3D Tiles on CesiumJS',
    modalApiGuideJs: '<strong>Maps JavaScript API</strong> — Enable Google Maps 3D native engine (&lt;gmp-map-3d&gt;)',
    modalApiLabel: 'Google Maps Platform API Key',
    modalApiHint: 'Stored only in your browser localStorage and never sent to external servers.',
    modalApiClear: 'Clear Key',
    modalCancel: 'Cancel',
    modalApiSave: 'Save & Apply',

    modalAddTitle: 'Add & Track Custom Satellite',
    modalAddNoradLabel: '1. Live Lookup by NORAD Catalog ID (CelesTrak)',
    modalAddNoradPlaceholder: 'e.g. 25544 (ISS), 20580 (Hubble), 43823 (GK-2A)',
    modalAddNoradBtn: 'Lookup',
    modalOr: 'OR',
    modalAddTleLabel: '2. Paste Custom TLE (Two-Line / Three-Line Element)',
    modalAddTlePlaceholder: 'Satellite Name (optional)\n1 25544U 98067A   ...\n2 25544  51.6400 ...',
    modalAddTleBtn: 'Add TLE & Track',

    toastApiDetected: 'Google API key detected. Switch to Google 3D Tiles or Google Maps 3D at top right.',
    toastSynced: 'Synchronized {count} orbital element sets.',
    toastLoadFail: 'Failed to load satellite data: {msg}',
    toastFavAdded: 'Added "{name}" to favorites.',
    toastFavRemoved: 'Removed "{name}" from favorites.',
    toastLinkCopied: 'Share link for "{name}" copied to clipboard.',
    toastLinkReady: 'Share URL updated in address bar.',
    toastJumpPass: 'Jumped simulation to pass peak ({time}).',
    toastLiveNow: 'Returned to live real-time orbital positions.',
    toastCloseupNotice: '3D model close-up is available in 3D Globe / Google 3D Tiles mode.',
    toastCloseupStart: 'Zooming into {name} ({model}) 3D view.',
    toastGeoUnsupported: 'Geolocation is not supported by this browser.',
    toastGeoApplied: 'Observer station set to your current GPS location.',
    toastGeoDenied: 'Unable to retrieve location: {msg}',
    toastApiSaved: 'Google API key saved.',
    toastApiCleared: 'Google API key cleared.',
    toastEngGlobe: 'Switched to High-Res 3D Satellite Globe.',
    toastEngTilesLoading: 'Loading Google Photorealistic 3D Tiles...',
    toastEngTilesReady: 'Switched to Google Photorealistic 3D Tiles.',
    toastEngNativeLoading: 'Initializing Google Maps 3D native engine...',
    toastEngNativeReady: 'Switched to Google Maps 3D native engine.',
    toastEngNativeFail: 'Google Maps 3D load failed: {msg}',
    toastNoradSearching: 'Looking up NORAD #{id} on CelesTrak...',
    toastNoradAdded: 'Added "{name}" (#{id}) to live tracking.',
    toastNoradFail: 'NORAD lookup failed: {msg}',
    toastLiveSearching: 'Searching CelesTrak global DB for "{q}"...',
    toastLiveNone: 'No public satellites matched "{q}".',
    toastLiveFound: 'Found {count} matches for "{q}" ({added} newly added).',
    toastLiveFail: 'CelesTrak live search failed: {msg}',
    toastTleAdded: 'Added custom TLE "{name}" to live tracking.',
    toastTleFail: 'TLE parse error: {msg}',

    errInvalidNorad: 'Please enter a valid numeric NORAD ID.',
    errCooldown: 'CelesTrak rate-limit cooldown active. Please try again shortly.',
    errNoradNotFound: 'Satellite NORAD #{id} not found.',
    errInvalidTleFormat: 'Invalid TLE format (missing line 1 / line 2).',
    errInvalidTleParse: 'Failed to parse TLE orbital elements.',
    errApiKeyRequired: 'Please enter a Google Maps API key first.',
    errTilesFail: 'Google Photorealistic 3D Tiles load failed: {msg}',
    errGmapsNoObj: 'Google Maps object unavailable after script load.',
    errGmapsScript: 'Failed to load Google Maps JS API. Check your API key and network.',
    errGmapsKeyNeeded: 'A Google Maps API key is required for Google Maps 3D native mode.',
  },

  ko: {
    pageTitle: 'OrbitPulse 3D — 실시간 3D 글로벌 인공위성 추적기',
    brandSubtitleDefault: '실시간 SGP4 · 3D 구글 위성 지구본',
    splashLoading: '전 세계 17,000+ 인공위성 궤도 동기화 중...',
    splashInitGlobe: '3D 지구본 초기화 중...',
    splashSyncingAll: '전 세계 무료 공개 인공위성 전체 동기화 중...',
    searchPlaceholder: '위성명 · NORAD · 국가(SKOR) · 발사장(나로) 검색',
    listLoading: '위성 불러오는 중...',
    syncBtn: '동기화',
    syncBtnTitle: 'CelesTrak / CDN 최신 궤도 데이터 동기화',
    expandDrawer: '위성 목록',
    collapseDrawerTitle: '목록 접기',
    expandDrawerTitle: '위성 목록 열기',

    engGlobe: '3D 지구본',
    engGlobeTitle: '고해상도 3D 위성 지구본 (기본 · 키 불필요)',
    engGoogleTiles: 'Google 3D Tiles',
    engGoogleTilesTitle: 'Google Photorealistic 3D Tiles (API 키 필요)',
    engGoogleNative: 'Google Maps 3D',
    engGoogleNativeTitle: 'Google Maps 3D 네이티브 엔진 (API 키 필요)',
    subtitleGlobe: '실시간 SGP4 · 3D 구글 위성 지구본',
    subtitleGoogleTiles: 'Google Photorealistic 3D Tiles · SGP4 실시간',
    subtitleGoogleNative: 'Google Maps 3D 네이티브 · SGP4 실시간',

    layersBtn: '레이어',
    layersTitle: '지도 레이어 및 표시 옵션',
    addSatBtn: '위성 추가',
    addSatTitle: 'NORAD ID 또는 TLE로 임의의 위성 추적',
    apiKeyBtn: 'Google API 키',
    apiKeyConnected: 'Google API 연결됨',
    apiKeyTitle: 'Google Maps 3D API 키 설정',
    langToggleTitle: '언어 전환 (English / 한국어)',

    layersHeading: '지도 & 표시 옵션',
    layersEngineLabel: '3D 지도 엔진',
    layersBasemapLabel: '배경 위성 지도',
    basemapHybrid: '구글 하이브리드',
    basemapSat: '구글 위성 영상',
    basemapEsri: 'Esri 위성 영상',
    basemapDark: '다크 벡터',
    layersOptionsLabel: '표시 설정',
    optLighting: '실시간 태양 주야간 음영',
    optOrbit: '선택 위성 궤도 경로 (3D)',
    optFootprint: '지상 통신 가시권 (Footprint)',
    optVectors: '3D 자세 가이드 (진행·지구 방향)',
    layersObserverLabel: '관측소 위치 (통과 예측 기준)',
    btnGeolocate: '내 GPS 현재 위치 사용',

    favoriteAddTitle: '즐겨찾기 추가',
    favoriteRemoveTitle: '즐겨찾기 해제',
    shareTitle: '현재 위성 링크 공유',
    expandTelemetryTitle: '상세 정보 펼치기/접기',
    closeTitle: '닫기',
    model3dLabel: '3D 우주선 모델',
    model3dLoading: '3D 모델 불러오는 중...',
    model3dActive: '3D 실물 표시 중',
    model3dZoomHint: '줌인 시 3D 실물 표시',
    btnCloseup: '3D 실물 확대',
    btnCloseupTitle: '위성 3D 모델 근접 관람',
    btnFollow: '카메라 추적',
    btnFollowing: '추적 중',
    btnFlyto: '궤도 보기',

    secOrbitTitle: '실시간 위치 · 궤도 제원',
    lblLat: '위도 (LAT)',
    lblLon: '경도 (LON)',
    lblAlt: '고도 (ALT)',
    lblSpeed: '궤도 속도',
    lblPeriod: '공전 주기',
    lblInc: '궤도 경사각',
    lblApsis: '근지점 / 원지점',
    lblFootprint: '지상 가시 반경',

    secSatcatTitle: 'SATCAT 공식 메타데이터',
    lblOwner: '소속 국가 · 기관',
    lblLaunchDate: '발사일',
    lblLaunchSite: '발사장',
    lblRcs: '레이더 반사면적 (RCS)',
    unknownValue: '정보 없음',
    rcsUnavailable: '비공개 / 미측정',

    secObserverPrefix: '관측소 시선각',
    visAboveHorizon: '현재 가시권 (상공)',
    visBelowHorizon: '지평선 아래',
    lblAz: '방위각 (AZ)',
    lblEl: '고도각 (EL)',
    lblRange: '직선거리',

    visualHeading: '육안 관측 판정',
    visualComputing: '천문 조도 및 궤도 조건 계산 중...',
    visualSunlit: '☀ 태양빛 반사 중',
    visualUmbra: '🌑 지구 그림자 (식)',
    visualMagPrefix: '약',
    visualMagUnknown: '밝기 --',

    skyDay: '주간 (낮)',
    skyCivil: '시민 박명',
    skyNautical: '박명 (관측 최적)',
    skyNight: '완전 야간',

    visStatusBelow: '지평선 아래',
    visDetailBelow: '현재 관측소 상공을 지나고 있지 않습니다.',
    visStatusShadow: '지구 그림자 (식 상태)',
    visDetailShadow: '상공을 통과 중이지만 지구 그림자에 가려 태양빛을 반사하지 못합니다.',
    visStatusDay: '주간 하늘 · 관측 불가',
    visDetailDay: '위성은 태양빛을 받고 있으나 관측소 하늘이 밝아(태양 고도 {sunEl}°) 육안 관측이 어렵습니다.',
    visStatusNaked: '육안 관측 가능!',
    visDetailNaked: '태양빛 반사 중 + 어두운 하늘 조건 충족 (추정 밝기 {mag}등급)',
    visStatusBino: '쌍안경 관측 가능',
    visDetailBino: '맨눈으로는 희미하나 쌍안경으로 관측 가능 (추정 밝기 {mag}등급)',
    visStatusFaint: '매우 어두움 (망원경 필요)',
    visDetailFaint: '거리·크기 특성상 맨눈 관측이 어렵습니다{magSuffix}.',

    passCalculating: '다음 통과 시각 계산 중...',
    passUnavailable: '통과 예측 정보를 계산할 수 없습니다.',
    passGeoAlways: '정지궤도(GEO) 위성 — 관측소에서 상시 관측 가능 (고도각 <strong>{el}°</strong>)',
    passGeoBelow: '정지궤도(GEO) 위성 — 현재 관측소 지평선 아래에 고정되어 있습니다.',
    passNone48h: '향후 48시간 내 관측소 상공 통과 예정이 없습니다.',
    passListHeading: '향후 48시간 상공 통과 일정 ({count}회)',
    passListHeadingNaked: '향후 48시간 상공 통과 일정 ({count}회 · ★ 육안 관측 {naked}회)',
    passNowTag: '통과 중',
    passMaxEl: '최대 <strong>{el}°</strong>',
    passDurMin: ' · {min}분',
    passJumpBtn: '이동',
    passJumpTitle: '이 통과 시각으로 시뮬레이션 이동',
    passTagNaked: '★ 육안',
    passTagBino: '쌍안경',
    passTagShadow: '식',
    passTagDay: '주간',

    scrubberTitle: '타임라인 탐색 (±24시간)',
    scrubberLive: '실시간 (0분)',
    scrubberHrMin: '{sign}{h}시간 {m}분',
    scrubberMin: '{sign}{m}분',
    liveBadgeTitle: '실시간 현재 시각으로 복귀',
    playPauseTitle: '재생 / 일시정지',
    scrubberToggleTitle: '±24시간 타임라인 탐색',
    speedCycleTitle: '시간 배속 전환',

    listFavCount: '즐겨찾기 {count}기',
    listTotalCount: '표시 {shown}기 / 전체 {total}기',
    emptyFavHtml: '즐겨찾기한 위성이 아직 없습니다.<br/>위성 상세 패널의 ★ 버튼으로 관심 위성을 등록해 보세요.',
    emptySearchHtml: '일치하는 위성이 없습니다.<br/>위성 이름 또는 NORAD ID 입력 후 Enter로 CelesTrak 전체 DB를 실시간 조회할 수 있습니다.',

    syncWorking: 'CelesTrak 동기화 중...',
    syncError: '데이터 로드 오류',
    srcCdn: 'CDN 공유 스냅샷',
    srcServer: '서버 공유 캐시',
    srcLive: 'CelesTrak 실시간',
    srcFallback: '로컬 스냅샷',

    vecVelocity: '진행 방향',
    vecNadir: '지구 방향',
    myLocation: '내 현재 위치 (GPS)',

    modalApiTitle: 'Google Maps 3D API 키 설정',
    modalApiDesc: 'Google Cloud Console에서 발급받은 API 키를 입력하면 <strong>Google Photorealistic 3D Tiles</strong> 및 <strong>Google Maps 3D</strong> 엔진을 즉시 활성화할 수 있습니다.',
    modalApiGuideTitle: '권장 Google Cloud API 활성화 항목',
    modalApiGuideTiles: '<strong>Map Tiles API</strong> — CesiumJS 위에서 Google Photorealistic 3D Tiles 렌더링',
    modalApiGuideJs: '<strong>Maps JavaScript API</strong> — Google Maps 3D 네이티브 엔진(&lt;gmp-map-3d&gt;) 사용',
    modalApiLabel: 'Google Maps Platform API Key',
    modalApiHint: '입력한 키는 이 브라우저의 localStorage에만 저장되며 외부 서버로 전송되지 않습니다.',
    modalApiClear: '키 삭제',
    modalCancel: '취소',
    modalApiSave: '저장 및 적용',

    modalAddTitle: '사용자 지정 위성 추가 · 추적',
    modalAddNoradLabel: '1. NORAD 카탈로그 번호로 실시간 조회 (CelesTrak)',
    modalAddNoradPlaceholder: '예: 25544 (ISS), 20580 (Hubble), 43823 (천리안 2A)',
    modalAddNoradBtn: '조회',
    modalOr: '또는',
    modalAddTleLabel: '2. TLE (Two-Line / Three-Line Element) 직접 입력',
    modalAddTlePlaceholder: '위성 이름 (선택)\n1 25544U 98067A   ...\n2 25544  51.6400 ...',
    modalAddTleBtn: 'TLE 추가 및 추적',

    toastApiDetected: 'Google API 키가 감지되었습니다. 상단에서 Google 3D Tiles 또는 Google Maps 3D로 전환할 수 있습니다.',
    toastSynced: '최신 궤도 요소 {count}기를 동기화했습니다.',
    toastLoadFail: '위성 데이터 로드 실패: {msg}',
    toastFavAdded: '"{name}" 위성을 즐겨찾기에 추가했습니다.',
    toastFavRemoved: '"{name}" 위성을 즐겨찾기에서 해제했습니다.',
    toastLinkCopied: '"{name}" 공유 링크가 클립보드에 복사되었습니다.',
    toastLinkReady: '주소창 URL이 현재 위성 링크로 업데이트되었습니다.',
    toastJumpPass: '통과 예정 시각({time})으로 시뮬레이션을 이동했습니다.',
    toastLiveNow: '실시간 현재 시각으로 복귀했습니다.',
    toastCloseupNotice: '3D 실물 확대는 3D 지구본 또는 Google 3D Tiles 모드에서 지원됩니다.',
    toastCloseupStart: '{name} ({model}) 3D 실물 근접 관람 모드로 진입합니다.',
    toastGeoUnsupported: '이 브라우저는 위치 정보(GPS)를 지원하지 않습니다.',
    toastGeoApplied: '현재 GPS 위치가 관측소로 설정되었습니다.',
    toastGeoDenied: '위치 정보를 가져올 수 없습니다: {msg}',
    toastApiSaved: 'Google API 키가 저장되었습니다.',
    toastApiCleared: 'Google API 키가 삭제되었습니다.',
    toastEngGlobe: '고해상도 3D 위성 지구본 모드로 전환했습니다.',
    toastEngTilesLoading: 'Google Photorealistic 3D Tiles를 불러오는 중...',
    toastEngTilesReady: 'Google Photorealistic 3D Tiles 모드로 전환했습니다.',
    toastEngNativeLoading: 'Google Maps 3D 네이티브 엔진을 초기화하는 중...',
    toastEngNativeReady: 'Google Maps 3D 네이티브 모드로 전환했습니다.',
    toastEngNativeFail: 'Google Maps 3D 로드 실패: {msg}',
    toastNoradSearching: 'CelesTrak에서 NORAD #{id} 위성을 조회하는 중...',
    toastNoradAdded: '"{name}" (#{id}) 위성이 실시간 추적 목록에 추가되었습니다.',
    toastNoradFail: '위성 조회 실패: {msg}',
    toastLiveSearching: 'CelesTrak 전체 DB에서 "{q}" 검색 중...',
    toastLiveNone: '"{q}"와 일치하는 무료 공개 위성을 찾지 못했습니다.',
    toastLiveFound: '"{q}" 검색 결과 {count}기 확인 ({added}기 신규 추가)',
    toastLiveFail: 'CelesTrak 실시간 검색 실패: {msg}',
    toastTleAdded: '사용자 TLE "{name}" 위성이 실시간 추적에 추가되었습니다.',
    toastTleFail: 'TLE 파싱 오류: {msg}',

    errInvalidNorad: '올바른 숫자 NORAD ID를 입력해 주세요.',
    errCooldown: '현재 CelesTrak 요청 제한 대기 중입니다. 잠시 후 다시 시도해 주세요.',
    errNoradNotFound: 'NORAD #{id} 위성을 찾을 수 없습니다.',
    errInvalidTleFormat: '올바른 TLE 형식(1번/2번 라인)이 아닙니다.',
    errInvalidTleParse: 'TLE 궤도 요소 파싱에 실패했습니다.',
    errApiKeyRequired: 'Google Maps API 키를 먼저 입력해 주세요.',
    errTilesFail: 'Google Photorealistic 3D Tiles 로드 실패: {msg}',
    errGmapsNoObj: 'Google Maps JS API 로드 후 maps 객체를 찾을 수 없습니다.',
    errGmapsScript: 'Google Maps JS API 스크립트 로드에 실패했습니다. API 키와 네트워크를 확인하세요.',
    errGmapsKeyNeeded: 'Google Maps 3D 네이티브 엔진을 사용하려면 Google Maps API 키가 필요합니다.',
  },
};

function detectInitialLang() {
  if (typeof window !== 'undefined') {
    try {
      const param = new URLSearchParams(window.location.search).get('lang');
      if (param === 'ko' || param === 'en') return param;
    } catch {
      // Ignore
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LANG);
      if (saved === 'ko' || saved === 'en') return saved;
    } catch {
      // Ignore
    }
  }
  return 'en'; // English default
}

let currentLang = detectInitialLang();
const listeners = new Set();

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  const next = lang === 'ko' ? 'ko' : 'en';
  if (next === currentLang) return currentLang;
  currentLang = next;
  try {
    localStorage.setItem(STORAGE_KEY_LANG, next);
  } catch {
    // Ignore
  }
  applyStaticTranslations();
  for (const fn of listeners) {
    try {
      fn(next);
    } catch {
      // Ignore listener errors
    }
  }
  return currentLang;
}

export function toggleLang() {
  return setLang(currentLang === 'en' ? 'ko' : 'en');
}

export function onLangChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t(key, vars = null, langOverride = null) {
  const lang = langOverride || currentLang;
  const table = DICT[lang] || DICT.en;
  let str = table[key] ?? DICT.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

export function applyStaticTranslations() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = currentLang;
  document.title = t('pageTitle');

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    if (key) el.innerHTML = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', t(key));
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.setAttribute('title', t(key));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (key) el.setAttribute('aria-label', t(key));
  });

  // Update language pill active state if present
  const langBtn = document.getElementById('btn-lang-toggle');
  if (langBtn) {
    const enSpan = langBtn.querySelector('[data-lang-opt="en"]');
    const koSpan = langBtn.querySelector('[data-lang-opt="ko"]');
    enSpan?.classList.toggle('active', currentLang === 'en');
    koSpan?.classList.toggle('active', currentLang === 'ko');
  }
}
