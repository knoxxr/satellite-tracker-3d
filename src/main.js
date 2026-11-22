import './styles/main.css';
import { CesiumSatelliteEngine } from './engines/cesiumEngine.js';
import { GoogleMaps3DEngine } from './engines/googleMaps3dEngine.js';
import {
  OBSERVER_PRESETS,
  getCategoryColor,
  getSatelliteDisplayInfo,
} from './orbital/catalog.js';
import {
  buildRecordFromOmm,
  buildRecordFromTle,
  computeLookAngles,
  computeOrbitTrack,
  predictNextPass,
  propagateSatellite,
} from './orbital/propagator.js';
import { fetchSatelliteByNoradId, fetchSatelliteGroup } from './orbital/dataService.js';
import { HudController } from './ui/hud.js';

const STORAGE_KEY_GMAPS = 'orbitpulse_google_maps_api_key';

class OrbitPulseApp {
  constructor() {
    this.state = {
      category: 'featured',
      searchQuery: '',
      records: [],
      customRecords: [],
      selectedId: null,
      hoveredId: null,
      hoveredScreenPos: null,
      activeEngine: 'globe', // 'globe' | 'google-tiles' | 'google-native'
      googleApiKey:
        localStorage.getItem(STORAGE_KEY_GMAPS) ||
        import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
        '',
      isPlaying: true,
      speedMultiplier: 1,
      simTimeMs: Date.now(),
      lastFrameMs: performance.now(),
      observer: OBSERVER_PRESETS[0],
      followMode: false,
      showOrbit: true,
      showFootprint: true,
    };

    this.positionsMap = new Map();
    this.cachedOrbitTrack = null;
    this.cachedOrbitMeta = { id: null, computedAtSimMs: 0 };
    this.cachedPassInfo = null;
    this.cachedPassMeta = { id: null, observerKey: '', computedAtSimMs: 0 };
    this.lastUiUpdateMs = 0;

    this.cesiumContainer = document.getElementById('cesium-container');
    this.gmapsContainer = document.getElementById('gmaps3d-container');

    this.cesiumEngine = new CesiumSatelliteEngine(this.cesiumContainer, {
      onSelect: (id) => this.selectSatellite(id, false),
      onHover: (id, screenPos) => {
        this.state.hoveredId = id;
        this.state.hoveredScreenPos = screenPos;
        this.updateHoverTooltip();
      },
    });

    this.gmapsEngine = new GoogleMaps3DEngine(this.gmapsContainer, {
      onSelect: (id) => this.selectSatellite(id, false),
    });
    this.gmapsInitialized = false;

    this.hud = new HudController({
      onCategoryChange: (cat) => this.loadCategory(cat, false),
      onSearchChange: (q) => {
        this.state.searchQuery = q;
        this.renderFilteredList();
      },
      onRefreshData: () => this.loadCategory(this.state.category, true),
      onSelectSatellite: (id, flyTo) => this.selectSatellite(id, flyTo),
      onDeselectSatellite: () => this.selectSatellite(null, false),
      onToggleFollow: () => this.toggleFollow(),
      onFlyToSelected: () => this.flyToSelected(),
      onEngineChange: (eng) => this.switchEngine(eng),
      onBasemapChange: (basemapId) => this.cesiumEngine.setBasemap(basemapId),
      onToggleLighting: (enabled) => this.cesiumEngine.setLighting(enabled),
      onToggleOrbit: (visible) => {
        this.state.showOrbit = visible;
        this.cesiumEngine.setOrbitVisible(visible);
        this.gmapsEngine.setOrbitVisible(visible);
        if (visible && this.state.selectedId) {
          this.refreshSelectedOrbitTrack(true);
        }
      },
      onToggleFootprint: (visible) => {
        this.state.showFootprint = visible;
        this.cesiumEngine.setFootprintVisible(visible);
      },
      onObserverChange: (obs) => this.setObserver(obs),
      onRequestGeolocation: () => this.requestUserLocation(),
      onJumpToNow: () => this.jumpToNow(),
      onTogglePlay: () => this.togglePlay(),
      onSpeedChange: (speed) => this.setSpeed(speed),
      onSaveApiKey: (key, pendingEngine) => this.saveApiKey(key, pendingEngine),
      onLookupNorad: (id, closeModal) => this.lookupNoradSatellite(id, closeModal),
      onAddCustomTle: (tleText) => this.addCustomTle(tleText),
    });
  }

  async start() {
    this.cesiumEngine.init();
    this.cesiumEngine.setObserver(this.state.observer);
    this.hud.setApiKeyState(Boolean(this.state.googleApiKey));

    await this.loadCategory('featured', false);

    // Auto-select ISS (25544) on startup so users immediately see live 3D orbital tracking
    const iss = this.getAllRecords().find((r) => r.id === 25544) || this.getAllRecords()[0];
    if (iss) {
      this.selectSatellite(iss.id, false);
    }

    // If user already configured a Google Maps API Key via .env or localStorage, offer seamless 3D Tiles upgrade
    if (this.state.googleApiKey) {
      this.hud.toast('Google API 키가 감지되었습니다. 상단에서 Google 3D Tiles 또는 Google Maps 3D로 전환할 수 있습니다.', 'info');
    }

    this.state.lastFrameMs = performance.now();
    requestAnimationFrame((now) => this.tick(now));
  }

  getAllRecords() {
    const map = new Map();
    for (const r of this.state.records) map.set(r.id, r);
    for (const r of this.state.customRecords) map.set(r.id, r);
    return [...map.values()];
  }

  getFilteredRecords() {
    const all = this.getAllRecords();
    const q = this.state.searchQuery.trim().toLowerCase();
    if (!q) return all;

    return all.filter((rec) => {
      const info = getSatelliteDisplayInfo(rec.id, rec.name);
      return (
        rec.name.toLowerCase().includes(q) ||
        info.title.toLowerCase().includes(q) ||
        String(rec.id).includes(q) ||
        rec.regime.toLowerCase().includes(q)
      );
    });
  }

  async loadCategory(categoryId, forceRefresh = false) {
    this.state.category = categoryId;
    this.hud.setSyncStatus('CelesTrak 동기화 중...');

    try {
      const payload = await fetchSatelliteGroup(categoryId, forceRefresh);

      const parsed = [];
      for (const omm of payload.satellites || []) {
        const rec = buildRecordFromOmm(omm);
        if (rec) parsed.push(rec);
      }

      this.state.records = parsed;
      this.syncSatellitesToEngines();
      this.propagateAll(new Date(this.state.simTimeMs));
      this.renderFilteredList();

      const srcLabel = payload.source === 'celestrak-live' ? 'CelesTrak 실시간' : '로컬 스냅샷';
      const timeStr = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(payload.updatedAt || Date.now()));
      this.hud.setSyncStatus(`${srcLabel} · ${this.getAllRecords().length}기 (${timeStr})`);

      if (forceRefresh) {
        this.hud.toast(`최신 궤도 요소 ${parsed.length}기를 동기화했습니다.`, 'success');
      }
    } catch (err) {
      this.hud.setSyncStatus('데이터 로드 오류');
      this.hud.toast(`위성 데이터 로드 실패: ${err.message}`, 'error');
    }
  }

  syncSatellitesToEngines() {
    const all = this.getAllRecords();
    this.cesiumEngine.setSatellites(all);
    if (this.gmapsInitialized) {
      this.gmapsEngine.setSatellites(all);
    }
  }

  selectSatellite(satId, flyTo = false) {
    this.state.selectedId = satId;
    if (!satId) {
      this.state.followMode = false;
      this.hud.setFollowState(false);
    }

    this.cesiumEngine.setSelected(satId);
    this.cesiumEngine.setFollowMode(this.state.followMode);
    if (this.gmapsInitialized) {
      this.gmapsEngine.setSelected(satId);
      this.gmapsEngine.setFollowMode(this.state.followMode);
    }

    if (!satId) {
      this.hud.updateTelemetry(null, null, null, null, null);
      this.renderFilteredList();
      return;
    }

    this.refreshSelectedOrbitTrack(true);
    this.refreshSelectedPassInfo(true);

    const pos = this.positionsMap.get(satId);
    if (flyTo && pos) {
      this.getActiveEngineInstance().flyToSatellite(pos);
    }

    this.renderFilteredList();
    this.updateTelemetryPanel();
  }

  toggleFollow() {
    if (!this.state.selectedId) return;
    this.state.followMode = !this.state.followMode;
    this.hud.setFollowState(this.state.followMode);
    this.cesiumEngine.setFollowMode(this.state.followMode);
    if (this.gmapsInitialized) {
      this.gmapsEngine.setFollowMode(this.state.followMode);
    }
    if (this.state.followMode) {
      const pos = this.positionsMap.get(this.state.selectedId);
      if (pos) this.getActiveEngineInstance().flyToSatellite(pos, 0.9);
      this.hud.toast('선택된 위성에 카메라를 고정했습니다.', 'info');
    }
  }

  flyToSelected() {
    if (!this.state.selectedId) return;
    const pos = this.positionsMap.get(this.state.selectedId);
    if (pos) {
      this.getActiveEngineInstance().flyToSatellite(pos, 1.2);
    }
  }

  getActiveEngineInstance() {
    return this.state.activeEngine === 'google-native' ? this.gmapsEngine : this.cesiumEngine;
  }

  async switchEngine(targetEngine) {
    if (targetEngine === this.state.activeEngine) return;

    if (targetEngine === 'globe') {
      await this.cesiumEngine.setGooglePhotorealistic3D(false);
      this.gmapsEngine.hide();
      this.cesiumEngine.show();
      this.state.activeEngine = 'globe';
      this.hud.setActiveEngine('globe', '실시간 SGP4 · 3D 구글 위성 지구본');
      return;
    }

    if (!this.state.googleApiKey) {
      this.hud.openApiKeyModal('', targetEngine);
      this.hud.toast('Google 3D 지도 엔진을 사용하려면 Google Maps API 키를 입력해 주세요.', 'info');
      return;
    }

    if (targetEngine === 'google-tiles') {
      this.gmapsEngine.hide();
      this.cesiumEngine.show();
      this.hud.toast('Google Photorealistic 3D Tiles를 불러오는 중...', 'info');
      const res = await this.cesiumEngine.setGooglePhotorealistic3D(true, this.state.googleApiKey);
      if (!res.ok) {
        this.hud.toast(res.error, 'error');
        this.hud.setActiveEngine('globe', '실시간 SGP4 · 3D 구글 위성 지구본');
        this.state.activeEngine = 'globe';
        return;
      }
      this.state.activeEngine = 'google-tiles';
      this.hud.setActiveEngine('google-tiles', '실시간 SGP4 · Google Photorealistic 3D Tiles');
      this.hud.toast('Google Photorealistic 3D Tiles가 활성화되었습니다!', 'success');
      return;
    }

    if (targetEngine === 'google-native') {
      try {
        this.hud.toast('Google Maps 3D 네이티브 엔진을 초기화하는 중...', 'info');
        if (!this.gmapsInitialized) {
          await this.gmapsEngine.init(this.state.googleApiKey);
          this.gmapsInitialized = true;
          this.gmapsEngine.setSatellites(this.getAllRecords());
          this.gmapsEngine.setOrbitVisible(this.state.showOrbit);
          if (this.state.selectedId) {
            this.gmapsEngine.setSelected(this.state.selectedId);
          }
        }
        this.cesiumEngine.hide();
        this.gmapsEngine.show();
        this.state.activeEngine = 'google-native';
        this.hud.setActiveEngine('google-native', '실시간 SGP4 · Google Maps 3D (<gmp-map-3d>)');
        if (this.state.selectedId && this.cachedOrbitTrack) {
          const rec = this.getAllRecords().find((r) => r.id === this.state.selectedId);
          this.gmapsEngine.updateOrbitTrack(this.cachedOrbitTrack, getCategoryColor(rec?.group));
        }
        this.hud.toast('Google Maps 3D 네이티브 엔진이 활성화되었습니다!', 'success');
      } catch (err) {
        this.hud.toast(err.message, 'error');
        this.cesiumEngine.show();
        this.gmapsEngine.hide();
        this.state.activeEngine = 'globe';
        this.hud.setActiveEngine('globe', '실시간 SGP4 · 3D 구글 위성 지구본');
      }
    }
  }

  async saveApiKey(key, pendingEngine) {
    this.state.googleApiKey = key;
    if (key) {
      localStorage.setItem(STORAGE_KEY_GMAPS, key);
      this.hud.setApiKeyState(true);
      this.hud.toast('Google Maps API 키가 저장되었습니다.', 'success');
      await this.switchEngine(pendingEngine || 'google-tiles');
    } else {
      localStorage.removeItem(STORAGE_KEY_GMAPS);
      this.hud.setApiKeyState(false);
      await this.switchEngine('globe');
      this.hud.toast('API 키가 삭제되어 기본 3D 지구본 모드로 전환되었습니다.', 'info');
    }
  }

  setObserver(observer) {
    this.state.observer = observer;
    this.cesiumEngine.setObserver(observer);
    this.refreshSelectedPassInfo(true);
    this.updateTelemetryPanel();
    this.hud.toast(`지상 관측소 기준이 "${observer.name}"(으)로 변경되었습니다.`, 'info');
  }

  requestUserLocation() {
    if (!navigator.geolocation) {
      this.hud.toast('이 브라우저에서는 위치 정보(GPS)를 지원하지 않습니다.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const customObs = {
          id: 'gps',
          name: `내 위치 (${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°)`,
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          heightKm: (pos.coords.altitude || 30) / 1000,
        };
        this.setObserver(customObs);
        this.cesiumEngine.flyToObserver(customObs);
      },
      () => {
        this.hud.toast('위치 권한을 가져오지 못했습니다. 목록에서 도시를 선택해 주세요.', 'error');
      }
    );
  }

  async lookupNoradSatellite(noradId, closeModal = false) {
    const clean = String(noradId).replace(/\D/g, '');
    if (!clean) {
      this.hud.toast('올바른 숫자 NORAD ID를 입력해 주세요.', 'error');
      return;
    }
    try {
      this.hud.toast(`CelesTrak에서 NORAD #${clean} 조회 중...`, 'info');
      const omm = await fetchSatelliteByNoradId(clean);
      const rec = buildRecordFromOmm(omm);
      if (!rec) throw new Error('궤도 요소 초기화에 실패했습니다.');

      this.state.customRecords = [
        ...this.state.customRecords.filter((r) => r.id !== rec.id),
        rec,
      ];
      this.syncSatellitesToEngines();
      this.propagateAll(new Date(this.state.simTimeMs));
      this.selectSatellite(rec.id, true);
      if (closeModal) this.hud.closeAddModal();
      this.hud.toast(`${rec.name} (#${rec.id}) 위성이 추가되었습니다.`, 'success');
    } catch (err) {
      this.hud.toast(err.message, 'error');
    }
  }

  addCustomTle(tleText) {
    try {
      const rec = buildRecordFromTle(tleText, 'custom');
      this.state.customRecords = [
        ...this.state.customRecords.filter((r) => r.id !== rec.id),
        rec,
      ];
      this.syncSatellitesToEngines();
      this.propagateAll(new Date(this.state.simTimeMs));
      this.selectSatellite(rec.id, true);
      this.hud.closeAddModal();
      this.hud.toast(`TLE 위성 "${rec.name}"이(가) 추가되었습니다.`, 'success');
    } catch (err) {
      this.hud.toast(err.message, 'error');
    }
  }

  jumpToNow() {
    this.state.simTimeMs = Date.now();
    this.state.speedMultiplier = 1;
    this.state.isPlaying = true;
    this.hud.setActiveSpeed(1);
    this.hud.setPlayState(true);
    this.hud.setLiveIndicator(true);
    this.refreshSelectedOrbitTrack(true);
    this.refreshSelectedPassInfo(true);
  }

  togglePlay() {
    this.state.isPlaying = !this.state.isPlaying;
    this.hud.setPlayState(this.state.isPlaying);
    this.hud.setLiveIndicator(this.isCloseToRealTime());
  }

  setSpeed(speed) {
    this.state.speedMultiplier = speed;
    if (!this.state.isPlaying) {
      this.state.isPlaying = true;
      this.hud.setPlayState(true);
    }
    this.hud.setLiveIndicator(this.isCloseToRealTime());
  }

  isCloseToRealTime() {
    return (
      this.state.isPlaying &&
      this.state.speedMultiplier === 1 &&
      Math.abs(this.state.simTimeMs - Date.now()) < 3000
    );
  }

  propagateAll(simDate) {
    this.positionsMap.clear();
    for (const rec of this.getAllRecords()) {
      const pos = propagateSatellite(rec, simDate);
      if (pos) {
        this.positionsMap.set(rec.id, pos);
      }
    }
  }

  refreshSelectedOrbitTrack(force = false) {
    if (!this.state.selectedId) return;
    const rec = this.getAllRecords().find((r) => r.id === this.state.selectedId);
    if (!rec) return;

    const ageMs = Math.abs(this.state.simTimeMs - this.cachedOrbitMeta.computedAtSimMs);
    if (!force && this.cachedOrbitMeta.id === rec.id && ageMs < 90_000) {
      return;
    }

    const track = computeOrbitTrack(rec, new Date(this.state.simTimeMs));
    const color = getCategoryColor(rec.group);
    this.cachedOrbitTrack = track;
    this.cachedOrbitMeta = { id: rec.id, computedAtSimMs: this.state.simTimeMs };

    this.cesiumEngine.updateOrbitTrack(track, color);
    if (this.gmapsInitialized) {
      this.gmapsEngine.updateOrbitTrack(track, color);
    }
  }

  refreshSelectedPassInfo(force = false) {
    if (!this.state.selectedId) return;
    const rec = this.getAllRecords().find((r) => r.id === this.state.selectedId);
    if (!rec) return;

    const obsKey = `${this.state.observer.lat.toFixed(3)},${this.state.observer.lon.toFixed(3)}`;
    const ageMs = Math.abs(this.state.simTimeMs - this.cachedPassMeta.computedAtSimMs);
    if (
      !force &&
      this.cachedPassMeta.id === rec.id &&
      this.cachedPassMeta.observerKey === obsKey &&
      ageMs < 60_000
    ) {
      return;
    }

    this.cachedPassInfo = predictNextPass(rec, new Date(this.state.simTimeMs), this.state.observer, 24);
    this.cachedPassMeta = { id: rec.id, observerKey: obsKey, computedAtSimMs: this.state.simTimeMs };
  }

  renderFilteredList() {
    const filtered = this.getFilteredRecords();
    this.hud.renderSatelliteList(
      filtered,
      this.state.selectedId,
      this.positionsMap,
      this.getAllRecords().length
    );
  }

  updateTelemetryPanel() {
    if (!this.state.selectedId) return;
    const rec = this.getAllRecords().find((r) => r.id === this.state.selectedId);
    const pos = this.positionsMap.get(this.state.selectedId);
    if (!rec || !pos) return;
    const look = computeLookAngles(pos, this.state.observer);
    this.hud.updateTelemetry(rec, pos, look, this.state.observer, this.cachedPassInfo);
  }

  updateHoverTooltip() {
    if (!this.state.hoveredId || !this.state.hoveredScreenPos) {
      this.hud.showTooltip(null, null, null);
      return;
    }
    const rec = this.getAllRecords().find((r) => r.id === this.state.hoveredId);
    const pos = this.positionsMap.get(this.state.hoveredId);
    this.hud.showTooltip(rec, pos, this.state.hoveredScreenPos);
  }

  tick(nowMs) {
    const dtMs = Math.min(nowMs - this.state.lastFrameMs, 250);
    this.state.lastFrameMs = nowMs;

    if (this.state.isPlaying) {
      if (this.state.speedMultiplier === 1 && Math.abs(this.state.simTimeMs - Date.now()) < 2500) {
        this.state.simTimeMs = Date.now();
      } else {
        this.state.simTimeMs += dtMs * this.state.speedMultiplier;
      }
    }

    const simDate = new Date(this.state.simTimeMs);
    this.propagateAll(simDate);

    // Compute selected look angles for LOS beam in 3D view
    let selectedLook = null;
    if (this.state.selectedId) {
      const selPos = this.positionsMap.get(this.state.selectedId);
      if (selPos) {
        selectedLook = computeLookAngles(selPos, this.state.observer);
      }
      this.refreshSelectedOrbitTrack(false);
    }

    // Update active 3D viewport at full 60fps
    if (this.state.activeEngine === 'google-native' && this.gmapsInitialized) {
      this.gmapsEngine.updatePositions(simDate, this.positionsMap);
    } else {
      this.cesiumEngine.updatePositions(simDate, this.positionsMap, selectedLook);
    }

    // Throttle DOM telemetry & clock updates to ~5 Hz for smooth performance
    if (nowMs - this.lastUiUpdateMs >= 200) {
      this.lastUiUpdateMs = nowMs;
      this.hud.updateClock(simDate);
      this.hud.setLiveIndicator(this.isCloseToRealTime());
      if (this.state.selectedId) {
        this.refreshSelectedPassInfo(false);
        this.updateTelemetryPanel();
      }
      this.renderFilteredList();
      if (this.state.hoveredId) {
        this.updateHoverTooltip();
      }
    }

    requestAnimationFrame((t) => this.tick(t));
  }
}

const app = new OrbitPulseApp();
app.start();
