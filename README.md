# OrbitPulse 3D — 실시간 인공위성 3D 구글 지도 추적기

**CelesTrak** 실시간 궤도 요소(OMM JSON / TLE)와 **SGP4/SDP4 궤도 역학(`satellite.js`)** 을 이용해 전 세계 실제 인공위성(ISS, 톈궁, 아리랑 3/3A/5/7, 천리안 2A/2B, 차세대중형위성, 무궁화, GPS, 기상위성, 허블, 스타링크 등)의 위치를 **3D 구글 지도** 위에 60fps로 실시간 추적·시각화하는 웹 애플리케이션입니다.

## 주요 기능

- **실제 인공위성 실시간 추적 (SGP4 + CelesTrak OMM JSON)**
  - 6자리 신규 NORAD 카탈로그 번호(예: `NEONSAT-02` ~ `06`)를 포함해 CelesTrak OMM JSON을 실시간 동기화합니다.
  - 서버 사이드 2시간 캐싱 및 로컬 스냅샷 자동 폴백을 지원합니다.
  - **NORAD Catalog ID 실시간 조회** 및 **사용자 TLE 직접 입력** 기능을 제공합니다.
- **3가지 3D 구글 지도 렌더링 모드 지원**
  1. **3D 지구본 (즉시 실행 · API 키 불필요)**: CesiumJS 3D 지구본 + Google 하이브리드/위성 타일 + 실시간 태양광(주/야간 경계선)
  2. **Google Photorealistic 3D Tiles**: Google Cloud **Map Tiles API** 키를 입력하면 실사 3D 건물·지형 지구본 위에 위성 궤도를 렌더링
  3. **Google Maps 3D 네이티브 (`<gmp-map-3d>`)**: Google **Maps JavaScript API (`maps3d`)** 기반 네이티브 3D 지도, `Marker3DInteractiveElement`, `Polyline3DElement` 지원
- **줌인 시 실제 3D 위성 모델 표시 (거리 기반 LOD + 6종 PBR `.glb`)**
  - 우주 전체 뷰에서는 60fps 발광 포인트로 표시하다가, 위성에 **줌인**하거나 우측 패널의 **`3D 근접 보기`** 버튼을 누르면 실제 3D 위성 모델로 자동 전환됩니다.
  - 6종 경량 PBR `.glb` 모델(우주정거장형·광학 관측형·정지궤도 통신/기상형·항법 GNSS형·우주망원경형·스타링크 평판형)이 SGP4 속도·직하 방향 기반 **LVLH 비행 자세**로 실시간 회전하며, 드래그로 위성 주위를 360° 회전 감상할 수 있습니다.
- **3D 궤도·가시권 분석 및 통과 예측**
  - 선택 위성의 과거/미래 3D 궤도 곡선, 직하선(Nadir Line), 지상 커버리지(Footprint) 표시
  - 지상 관측소(서울, 대전 KARI, 부산, 제주, 내 GPS 위치 등) 기준 **방위각(AZ), 고도각(EL), 직선거리(km), 시선(LOS) 빔** 및 **향후 24시간 상공 통과 예정 시각(AOS / 최대 고도각 / LOS)** 자동 계산
  - 시간 배속(`1×` ~ `1000×`), 일시정지, 실시간(`LIVE`) 즉시 복귀

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:5173)
npm run dev

# 프로덕션 빌드 및 서버 실행 (http://localhost:3000)
npm run build
npm start
```

## Google Maps 3D API 키 설정 (선택 사항)

API 키 없이도 즉시 3D 위성 지구본으로 실행되며, 실사 3D 건물/지형(`Google Photorealistic 3D Tiles`) 또는 네이티브 `Google Maps 3D` 엔진을 사용하려면 다음 중 한 가지 방법으로 API 키를 설정하세요.

1. **앱 화면 우측 상단 `Google API 키` 버튼**에서 입력 (브라우저 `localStorage`에만 안전하게 저장)
2. 프로젝트 루트에 `.env` 파일 생성:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
   ```
   - `Google 3D Tiles` 사용 시 Google Cloud Console에서 **Map Tiles API** 활성화
   - `Google Maps 3D` 네이티브 엔진 사용 시 **Maps JavaScript API** 활성화
