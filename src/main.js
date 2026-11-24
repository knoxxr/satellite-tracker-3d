import './styles/main.css';
import { CesiumSatelliteEngine } from './engines/cesiumEngine.js';
import { GoogleMaps3DEngine } from './engines/googleMaps3dEngine.js';
import {
  OBSERVER_PRESETS,
  getCategoryColor,
  getLaunchSiteLabel,
  getObserverPresetName,
  getOwnerLabel,
  getSatelliteDisplayInfo,
} from './orbital/catalog.js';
import {
  buildRecordFromOmm,
  buildRecordFromTle,
  computeLookAngles,
  computeOrbitTrack,
  computeVisualVisibility,
  predictUpcomingPasses,
  propagateSatellite,
} from './orbital/propagator.js';
import { fetchSatelliteByNoradId, fetchSatelliteGroup, searchSatellitesByName } from './orbital/dataService.js';
import { HudController } from './ui/hud.js';
import { getLang, t, toggleLang } from './ui/i18n.js';

const STORAGE_KEY_GMAPS = 'orbitpulse_google_maps_api_key';
const STORAGE_KEY_FAVORITES = 'orbitpulse_favorites_v1';

function loadSavedFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAVORITES);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return new Set(arr.map((n) => Number(n)).filter((n) => Number.isFinite(n)));
    }
  } catch {
    // Ignore storage errors
  }
  return new Set();
}

function saveFavorites(favSet) {
  try {
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify([...favSet]));
  } catch {
    // Ignore storage quota errors
  }
}

class OrbitPulseApp {
  constructor() {
    this.state = {
      category: 'all',
      dataGroup: 'all',
      searchQuery: '',
      records: [],
      customRecords: [],
      favorites: loadSavedFavorites(),
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
      showAttitudeVectors: true,
    };

    this.allRecordsCache = [];
    this.recordById = new Map();
    this.filteredRecordsCache = [];
    this.listRevision = 0;
    this.propagateCursor = 0;
    this.forceFullPositionSync = true;

    this.positionsMap = new Map();
    this.cachedOrbitTrack = null;
    this.cachedOrbitMeta = { id: null, computedAtSimMs: 0 };
    this.cachedPassInfo = null;
    this.cachedPassMeta = { id: null, observerKey: '', computedAtSimMs: 0 };
    this.lastUiUpdateMs = 0;
    this.lastSyncMeta = null;

    this.cesiumContainer = document.getElementById('cesium-container');
    this.gmapsContainer = document.getElementById('gmaps3d-container');

    this.cesiumEngine = new CesiumSatelliteEngine(this.cesiumContainer, {
      onSelect: (id) => this.selectSatellite(id, false),
      onHover: (id, screenPos) => {
        this.state.hoveredId = id;
        this.state.hoveredScreenPos = screenPos;
        this.updateHoverTooltip();
      },
      onModelStateChange: (is3dVisible) => {
        this.hud.set3dModelActiveState(is3dVisible);
      },
      onModelLoadingChange: (isLoading) => {
        this.hud.set3dModelLoading(isLoading);
      },
    });

    this.gmapsEngine = new GoogleMaps3DEngine(this.gmapsContainer, {
      onSelect: (id) => this.selectSatellite(id, false),
    });
    this.gmapsInitialized = false;

    this.hud = new HudController({
      onToggleLanguage: () => this.handleLanguageToggle(),
      onCategoryChange: (cat) => this.handleCategoryChange(cat),
      onSearchChange: (q) => {
        this.state.searchQuery = q;
        this.rebuildFilteredCache();
        this.renderFilteredList();
      },
      onSearchLiveCelesTrak: (q) => this.searchLiveCelesTrak(q),
      onRefreshData: () => this.loadCategory(this.state.dataGroup || 'all', true),
      onSelectSatellite: (id, flyTo) => this.selectSatellite(id, flyTo),
      onDeselectSatellite: () => this.selectSatellite(null, false),
      onToggleFavorite: () => this.toggleFavoriteSelected(),
      onShareSelected: () => this.shareSelectedSatellite(),
      onCloseupSelected: () => this.closeupSelected(),
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
      onToggleVectors: (visible) => {
        this.state.showAttitudeVectors = visible;
        this.cesiumEngine.setAttitudeVectorsVisible(visible);
      },
      onObserverChange: (obs) => this.setObserver(obs),
      onRequestGeolocation: () => this.requestUserLocation(),
      onJumpToNow: () => this.jumpToNow(),
      onJumpToTime: (targetMs) => this.jumpToTime(targetMs),
      onScrubOffsetMinutes: (mins) => this.scrubToOffsetMinutes(mins),
      onTogglePlay: () => this.togglePlay(),
      onSpeedChange: (speed) => this.setSpeed(speed),
      onSaveApiKey: (key, pendingEngine) => this.saveApiKey(key, pendingEngine),
      onLookupNorad: (id, closeModal) => this.lookupNoradSatellite(id, closeModal),
      onAddCustomTle: (tleText) => this.addCustomTle(tleText),
    });
  }

  getEngineSubtitle(engineId) {
    if (engineId === 'google-tiles') return t('subtitleGoogleTiles');
    if (engineId === 'google-native') return t('subtitleGoogleNative');
    return t('subtitleGlobe');
  }

  renderSyncStatus() {
    if (!this.lastSyncMeta) return;
    const { source, updatedAt, count } = this.lastSyncMeta;
    const srcKeyMap = {
      'cdn-snapshot': 'srcCdn',
      'server-cache': 'srcServer',
      'celestrak-live': 'srcLive',
      'fallback-snapshot': 'srcFallback',
    };
    const srcLabel = t(srcKeyMap[source] || 'srcFallback');
    const lang = getLang();
    const timeStr = new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', {
      ...(lang === 'ko' ? { timeZone: 'Asia/Seoul' } : {}),
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(updatedAt || Date.now()));
    const unit = lang === 'ko' ? '기' : ' sats';
    this.hud.setSyncStatus(`${srcLabel} · ${count.toLocaleString()}${unit} (${timeStr})`);
  }

  handleLanguageToggle() {
    toggleLang();
    this.hud.refreshLanguage(this.state.category, this.state.observer?.id);
    this.hud.setActiveEngine(this.state.activeEngine, this.getEngineSubtitle(this.state.activeEngine));
    this.cesiumEngine.refreshLanguageLabels();
    this.renderSyncStatus();
    this.renderFilteredList();
    this.hud.updateClock(new Date(this.state.simTimeMs));
    if (this.state.selectedId) {
      this.updateTelemetryPanel();
    }
    if (this.state.hoveredId) {
      this.updateHoverTooltip();
    }
  }

  async start() {
    this.hud.setSplashStatus(t('splashInitGlobe'));
    this.cesiumEngine.init();
    this.cesiumEngine.setObserver(this.state.observer);
    this.hud.setApiKeyState(Boolean(this.state.googleApiKey));

    this.hud.setSplashStatus(t('splashSyncingAll'));
    const splashTimer = setTimeout(() => this.hud.hideBootSplash(), 3200);
    await this.loadCategory('all', false);
    clearTimeout(splashTimer);

    // Check URL deep link (?sat=25544&closeup=1) before defaulting to ISS
    const deepLinked = await this.applyDeepLinkFromUrl();
    if (!deepLinked) {
      const iss = this.recordById.get(25544) || this.allRecordsCache[0];
      if (iss) {
        this.selectSatellite(iss.id, false);
      }
    }

    this.hud.hideBootSplash();

    if (this.state.googleApiKey) {
      this.hud.toast(t('toastApiDetected'), 'info');
    }

    this.registerServiceWorker();

    this.state.lastFrameMs = performance.now();
    requestAnimationFrame((now) => this.tick(now));
  }

  registerServiceWorker() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return;
    const swUrl = `${import.meta.env.BASE_URL || './'}sw.js`;
    navigator.serviceWorker.register(swUrl).catch(() => {
      // Non-fatal in restricted environments
    });
  }

  async applyDeepLinkFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const satParam = params.get('sat');
    if (!satParam) return false;

    const satId = Number(satParam.replace(/\D/g, ''));
    if (!Number.isFinite(satId) || satId <= 0) return false;

    const wantCloseup = params.get('closeup') === '1' || params.get('closeup') === 'true';
    let target = this.recordById.get(satId);

    if (!target) {
      await this.lookupNoradSatellite(String(satId), false);
      target = this.recordById.get(satId);
    }

    if (!target) return false;
    this.selectSatellite(target.id, !wantCloseup);
    if (wantCloseup) {
      setTimeout(() => this.closeupSelected(), 350);
    }
    return true;
  }

  async handleCategoryChange(categoryId) {
    this.state.category = categoryId;
    if (categoryId === 'favorites') {
      if (this.state.dataGroup !== 'all' && this.state.dataGroup !== 'featured') {
        await this.loadCategory('all', false, false);
      }
      this.rebuildFilteredCache();
      this.renderFilteredList();
      return;
    }
    await this.loadCategory(categoryId, false, true);
  }

  rebuildRecordCache() {
    const map = new Map();
    for (const r of this.state.records) map.set(r.id, r);
    for (const r of this.state.customRecords) map.set(r.id, r);
    const list = [...map.values()];
    const favs = this.state.favorites;
    // Prioritize favorites and notable satellites at top of 16,000+ list
    list.sort((a, b) => {
      const af = favs.has(a.id) ? 2 : 0;
      const bf = favs.has(b.id) ? 2 : 0;
      if (af !== bf) return bf - af;
      const an = getSatelliteDisplayInfo(a.id, a.name).isNotable ? 1 : 0;
      const bn = getSatelliteDisplayInfo(b.id, b.name).isNotable ? 1 : 0;
      if (an !== bn) return bn - an;
      return a.id - b.id;
    });
    this.allRecordsCache = list;
    this.recordById = map;
    this.propagateCursor = 0;
    this.rebuildFilteredCache();
  }

  rebuildFilteredCache() {
    let all = this.allRecordsCache;
    if (this.state.category === 'favorites') {
      all = all.filter((rec) => this.state.favorites.has(rec.id));
    }
    const q = this.state.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredRecordsCache = all;
    } else {
      this.filteredRecordsCache = all.filter((rec) => {
        const infoEn = getSatelliteDisplayInfo(rec.id, rec.name, 'en');
        const infoKo = getSatelliteDisplayInfo(rec.id, rec.name, 'ko');
        const ownerText = rec.owner
          ? `${rec.owner} ${getOwnerLabel(rec.owner, 'en')} ${getOwnerLabel(rec.owner, 'ko')}`.toLowerCase()
          : '';
        const siteText = rec.launchSite
          ? `${rec.launchSite} ${getLaunchSiteLabel(rec.launchSite, 'en')} ${getLaunchSiteLabel(rec.launchSite, 'ko')}`.toLowerCase()
          : '';
        return (
          rec.name.toLowerCase().includes(q) ||
          infoEn.title.toLowerCase().includes(q) ||
          infoKo.title.toLowerCase().includes(q) ||
          String(rec.id).includes(q) ||
          rec.regime.toLowerCase().includes(q) ||
          ownerText.includes(q) ||
          siteText.includes(q)
        );
      });
    }
    this.listRevision += 1;
  }

  getAllRecords() {
    return this.allRecordsCache;
  }

  getFilteredRecords() {
    return this.filteredRecordsCache;
  }

  async loadCategory(categoryId, forceRefresh = false, updateCategoryState = true) {
    if (updateCategoryState) {
      this.state.category = categoryId;
    }
    this.state.dataGroup = categoryId;
    this.hud.setSyncStatus(t('syncWorking'));

    try {
      const payload = await fetchSatelliteGroup(categoryId, forceRefresh);

      const parsed = [];
      for (const omm of payload.satellites || []) {
        const rec = buildRecordFromOmm(omm);
        if (rec) parsed.push(rec);
      }

      this.state.records = parsed;
      this.rebuildRecordCache();
      this.syncSatellitesToEngines();
      this.propagateAll(new Date(this.state.simTimeMs));
      this.forceFullPositionSync = true;
      this.renderFilteredList();

      this.lastSyncMeta = {
        source: payload.source,
        updatedAt: payload.updatedAt || Date.now(),
        count: this.allRecordsCache.length,
      };
      this.renderSyncStatus();

      if (forceRefresh) {
        this.hud.toast(t('toastSynced', { count: parsed.length.toLocaleString() }), 'success');
      }
    } catch (err) {
      this.hud.setSyncStatus(t('syncError'));
      this.hud.toast(t('toastLoadFail', { msg: err.message }), 'error');
    }
  }

  syncSatellitesToEngines() {
    const all = this.allRecordsCache;
    this.cesiumEngine.setSatellites(all);
    if (this.gmapsInitialized) {
      this.gmapsEngine.setSatellites(all.slice(0, 300));
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
      this.hud.toast(
        getLang() === 'ko'
          ? '선택된 위성에 카메라를 고정했습니다.'
          : 'Camera locked onto selected satellite.',
        'info'
      );
    }
  }

  async closeupSelected() {
    if (!this.state.selectedId) return;
    const rec = this.getAllRecords().find((r) => r.id === this.state.selectedId);
    const pos = this.positionsMap.get(this.state.selectedId);
    if (!rec || !pos) return;

    this.state.followMode = true;
    this.hud.setFollowState(true);
    await this.getActiveEngineInstance().flyToCloseup(pos, rec);
    const hint =
      getLang() === 'ko'
        ? this.hud.isMobile()
          ? '3D 위성 근접 보기 — 한 손가락 드래그로 360° 회전, 두 손가락으로 줌 조절할 수 있습니다.'
          : '3D 위성 근접 보기 활성화 — 드래그로 360° 회전, 스크롤로 줌 조절할 수 있습니다.'
        : this.hud.isMobile()
          ? '3D close-up active — drag with one finger to orbit 360°, pinch to zoom.'
          : '3D close-up active — drag to orbit 360°, scroll to zoom.';
    this.hud.toast(hint, 'info');
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
      this.hud.setActiveEngine('globe', this.getEngineSubtitle('globe'));
      return;
    }

    if (!this.state.googleApiKey) {
      this.hud.openApiKeyModal('', targetEngine);
      this.hud.toast(t('errApiKeyRequired'), 'info');
      return;
    }

    if (targetEngine === 'google-tiles') {
      this.gmapsEngine.hide();
      this.cesiumEngine.show();
      this.hud.toast(t('toastEngTilesLoading'), 'info');
      const res = await this.cesiumEngine.setGooglePhotorealistic3D(true, this.state.googleApiKey);
      if (!res.ok) {
        this.hud.toast(res.error, 'error');
        this.hud.setActiveEngine('globe', this.getEngineSubtitle('globe'));
        this.state.activeEngine = 'globe';
        return;
      }
      this.state.activeEngine = 'google-tiles';
      this.hud.setActiveEngine('google-tiles', this.getEngineSubtitle('google-tiles'));
      this.hud.toast(t('toastEngTilesReady'), 'success');
      return;
    }

    if (targetEngine === 'google-native') {
      try {
        this.hud.toast(t('toastEngNativeLoading'), 'info');
        if (!this.gmapsInitialized) {
          await this.gmapsEngine.init(this.state.googleApiKey);
          this.gmapsInitialized = true;
          this.gmapsEngine.setSatellites(this.getAllRecords().slice(0, 300));
          this.gmapsEngine.setOrbitVisible(this.state.showOrbit);
          if (this.state.selectedId) {
            this.gmapsEngine.setSelected(this.state.selectedId);
          }
        }
        this.cesiumEngine.hide();
        this.gmapsEngine.show();
        this.state.activeEngine = 'google-native';
        this.hud.setActiveEngine('google-native', this.getEngineSubtitle('google-native'));
        if (this.state.selectedId && this.cachedOrbitTrack) {
          const rec = this.getAllRecords().find((r) => r.id === this.state.selectedId);
          this.gmapsEngine.updateOrbitTrack(this.cachedOrbitTrack, getCategoryColor(rec?.group));
        }
        this.hud.toast(t('toastEngNativeReady'), 'success');
      } catch (err) {
        this.hud.toast(t('toastEngNativeFail', { msg: err.message }), 'error');
        this.cesiumEngine.show();
        this.gmapsEngine.hide();
        this.state.activeEngine = 'globe';
        this.hud.setActiveEngine('globe', this.getEngineSubtitle('globe'));
      }
    }
  }

  async saveApiKey(key, pendingEngine) {
    this.state.googleApiKey = key;
    if (key) {
      localStorage.setItem(STORAGE_KEY_GMAPS, key);
      this.hud.setApiKeyState(true);
      this.hud.toast(t('toastApiSaved'), 'success');
      await this.switchEngine(pendingEngine || 'google-tiles');
    } else {
      localStorage.removeItem(STORAGE_KEY_GMAPS);
      this.hud.setApiKeyState(false);
      await this.switchEngine('globe');
      this.hud.toast(t('toastApiCleared'), 'info');
    }
  }

  setObserver(observer) {
    this.state.observer = observer;
    this.cesiumEngine.setObserver(observer);
    this.refreshSelectedPassInfo(true);
    this.updateTelemetryPanel();
    const obsLabel = getObserverPresetName(observer, getLang());
    this.hud.toast(
      getLang() === 'ko'
        ? `지상 관측소 기준이 "${obsLabel}"(으)로 변경되었습니다.`
        : `Observer station set to "${obsLabel}".`,
      'info'
    );
  }

  requestUserLocation() {
    if (!navigator.geolocation) {
      this.hud.toast(t('toastGeoUnsupported'), 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coordsStr = `${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`;
        const customObs = {
          id: 'gps',
          name: `My Location (${coordsStr})`,
          nameEn: `My Location (${coordsStr})`,
          nameKo: `내 위치 (${coordsStr})`,
          shortEn: 'My GPS',
          shortKo: '내 위치',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          heightKm: (pos.coords.altitude || 30) / 1000,
        };
        this.hud.renderObserverPresets('gps');
        this.setObserver(customObs);
        this.cesiumEngine.flyToObserver(customObs);
      },
      (err) => {
        this.hud.toast(t('toastGeoDenied', { msg: err?.message || 'Permission denied' }), 'error');
      }
    );
  }

  async lookupNoradSatellite(noradId, closeModal = false) {
    const clean = String(noradId).replace(/\D/g, '');
    if (!clean) {
      this.hud.toast(t('errInvalidNorad'), 'error');
      return;
    }
    try {
      this.hud.toast(t('toastNoradSearching', { id: clean }), 'info');
      const omm = await fetchSatelliteByNoradId(clean);
      const rec = buildRecordFromOmm(omm);
      if (!rec) throw new Error(t('errInvalidTleParse'));

      this.state.customRecords = [
        ...this.state.customRecords.filter((r) => r.id !== rec.id),
        rec,
      ];
      this.rebuildRecordCache();
      this.syncSatellitesToEngines();
      this.propagateAll(new Date(this.state.simTimeMs));
      this.forceFullPositionSync = true;
      this.selectSatellite(rec.id, true);
      if (closeModal) this.hud.closeAddModal();
      this.hud.toast(t('toastNoradAdded', { name: rec.name, id: rec.id }), 'success');
    } catch (err) {
      this.hud.toast(t('toastNoradFail', { msg: err.message }), 'error');
    }
  }

  async searchLiveCelesTrak(query) {
    const clean = String(query || '').trim();
    if (clean.length < 2) return;
    try {
      this.hud.toast(t('toastLiveSearching', { q: clean }), 'info');
      const omms = await searchSatellitesByName(clean);
      const parsed = [];
      for (const omm of omms) {
        const rec = buildRecordFromOmm(omm);
        if (rec) parsed.push(rec);
      }
      if (parsed.length === 0) {
        this.hud.toast(t('toastLiveNone', { q: clean }), 'info');
        return;
      }
      const existingIds = new Set(parsed.map((r) => r.id));
      const prevSize = this.recordById.size;
      this.state.customRecords = [
        ...this.state.customRecords.filter((r) => !existingIds.has(r.id)),
        ...parsed,
      ];
      this.rebuildRecordCache();
      const added = Math.max(0, this.recordById.size - prevSize);
      this.syncSatellitesToEngines();
      this.propagateAll(new Date(this.state.simTimeMs));
      this.forceFullPositionSync = true;
      this.renderFilteredList();
      this.selectSatellite(parsed[0].id, true);
      this.hud.toast(t('toastLiveFound', { q: clean, count: parsed.length, added }), 'success');
    } catch (err) {
      this.hud.toast(t('toastLiveFail', { msg: err.message }), 'error');
    }
  }

  addCustomTle(tleText) {
    try {
      const rec = buildRecordFromTle(tleText, 'custom');
      this.state.customRecords = [
        ...this.state.customRecords.filter((r) => r.id !== rec.id),
        rec,
      ];
      this.rebuildRecordCache();
      this.syncSatellitesToEngines();
      this.propagateAll(new Date(this.state.simTimeMs));
      this.forceFullPositionSync = true;
      this.selectSatellite(rec.id, true);
      this.hud.closeAddModal();
      this.hud.toast(t('toastTleAdded', { name: rec.name }), 'success');
    } catch (err) {
      this.hud.toast(t('toastTleFail', { msg: err.message }), 'error');
    }
  }

  toggleFavoriteSelected() {
    if (!this.state.selectedId) return;
    const id = this.state.selectedId;
    const rec = this.recordById.get(id);
    const label = rec ? getSatelliteDisplayInfo(rec.id, rec.name, getLang()).title : `#${id}`;
    if (this.state.favorites.has(id)) {
      this.state.favorites.delete(id);
      this.hud.toast(t('toastFavRemoved', { name: label }), 'info');
    } else {
      this.state.favorites.add(id);
      this.hud.toast(t('toastFavAdded', { name: label }), 'success');
    }
    saveFavorites(this.state.favorites);
    this.rebuildRecordCache();
    this.hud.setFavoriteState(this.state.favorites.has(id));
    this.renderFilteredList();
  }

  async shareSelectedSatellite() {
    if (!this.state.selectedId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('sat', String(this.state.selectedId));
    if (this.cesiumEngine.closeupOrbitLocked) {
      url.searchParams.set('closeup', '1');
    } else {
      url.searchParams.delete('closeup');
    }
    const shareUrl = url.toString();
    const rec = this.recordById.get(this.state.selectedId);
    const name = rec ? getSatelliteDisplayInfo(rec.id, rec.name, getLang()).title : `#${this.state.selectedId}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      this.hud.toast(t('toastLinkCopied', { name }), 'success');
    } catch {
      window.history.replaceState(null, '', shareUrl);
      this.hud.toast(t('toastLinkReady'), 'info');
    }
  }

  jumpToNow() {
    this.state.simTimeMs = Date.now();
    this.state.speedMultiplier = 1;
    this.state.isPlaying = true;
    this.hud.setActiveSpeed(1);
    this.hud.setPlayState(true);
    this.hud.setLiveIndicator(true);
    this.propagateAll(new Date(this.state.simTimeMs));
    this.forceFullPositionSync = true;
    this.refreshSelectedOrbitTrack(true);
    this.refreshSelectedPassInfo(true);
    this.updateTelemetryPanel();
  }

  jumpToTime(targetMs) {
    this.state.simTimeMs = targetMs;
    this.state.speedMultiplier = 10;
    this.state.isPlaying = true;
    this.hud.setActiveSpeed(10);
    this.hud.setPlayState(true);
    this.hud.setLiveIndicator(false);
    this.propagateAll(new Date(this.state.simTimeMs));
    this.forceFullPositionSync = true;
    this.refreshSelectedOrbitTrack(true);
    this.refreshSelectedPassInfo(true);
    this.updateTelemetryPanel();

    const pos = this.state.selectedId ? this.positionsMap.get(this.state.selectedId) : null;
    if (pos) {
      this.getActiveEngineInstance().flyToSatellite(pos, 1.0);
    }
    const lang = getLang();
    const timeLabel =
      lang === 'ko'
        ? new Intl.DateTimeFormat('ko-KR', {
            timeZone: 'Asia/Seoul',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(new Date(targetMs)) + ' KST'
        : new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZoneName: 'short',
          }).format(new Date(targetMs));
    this.hud.toast(t('toastJumpPass', { time: timeLabel }), 'info');
  }

  scrubToOffsetMinutes(offsetMinutes) {
    this.state.simTimeMs = Date.now() + offsetMinutes * 60_000;
    this.hud.setLiveIndicator(this.isCloseToRealTime());
    this.propagateAll(new Date(this.state.simTimeMs));
    this.forceFullPositionSync = true;
    this.refreshSelectedOrbitTrack(true);
    this.updateTelemetryPanel();
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
    for (const rec of this.allRecordsCache) {
      const pos = propagateSatellite(rec, simDate);
      if (pos) {
        this.positionsMap.set(rec.id, pos);
      }
    }
  }

  /**
   * 2-Tier SGP4 propagation:
   *  - Selected satellite: updated every single frame at 60fps for smooth 3D closeup & tracking.
   *  - Remaining satellites: propagated in time-sliced chunks (1,200/frame) so 16,900+ satellites stay at 60fps.
   */
  propagateFrame(simDate) {
    const all = this.allRecordsCache;
    if (all.length <= 600 || this.forceFullPositionSync) {
      this.propagateAll(simDate);
      this.forceFullPositionSync = false;
      return null; // Full GPU sync
    }

    const updatedIds = new Set();
    const batchSize = 1200;
    const len = all.length;
    let idx = this.propagateCursor % len;

    for (let i = 0; i < batchSize; i++) {
      const rec = all[idx];
      const pos = propagateSatellite(rec, simDate);
      if (pos) {
        this.positionsMap.set(rec.id, pos);
      } else {
        this.positionsMap.delete(rec.id);
      }
      updatedIds.add(rec.id);
      idx = (idx + 1) % len;
    }
    this.propagateCursor = idx;

    // Always propagate the selected satellite at full 60fps
    if (this.state.selectedId) {
      const selRec = this.recordById.get(this.state.selectedId);
      if (selRec) {
        const pos = propagateSatellite(selRec, simDate);
        if (pos) this.positionsMap.set(selRec.id, pos);
        updatedIds.add(selRec.id);
      }
    }

    return updatedIds;
  }

  refreshSelectedOrbitTrack(force = false) {
    if (!this.state.selectedId) return;
    const rec = this.recordById.get(this.state.selectedId);
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
    const rec = this.recordById.get(this.state.selectedId);
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

    this.cachedPassInfo = predictUpcomingPasses(
      rec,
      new Date(this.state.simTimeMs),
      this.state.observer,
      48,
      5
    );
    this.cachedPassMeta = { id: rec.id, observerKey: obsKey, computedAtSimMs: this.state.simTimeMs };
  }

  renderFilteredList() {
    this.hud.renderSatelliteList(
      this.filteredRecordsCache,
      this.state.selectedId,
      this.positionsMap,
      this.allRecordsCache.length,
      this.state.favorites,
      this.state.category === 'favorites',
      this.listRevision
    );
  }

  updateTelemetryPanel() {
    if (!this.state.selectedId) return;
    const rec = this.recordById.get(this.state.selectedId);
    const pos = this.positionsMap.get(this.state.selectedId);
    if (!rec || !pos) return;
    const simDate = new Date(this.state.simTimeMs);
    const look = computeLookAngles(pos, this.state.observer);
    const visual = computeVisualVisibility(rec, pos, look, this.state.observer, simDate);
    this.hud.updateTelemetry(
      rec,
      pos,
      look,
      this.state.observer,
      this.cachedPassInfo,
      this.state.favorites.has(rec.id),
      visual
    );
  }

  updateHoverTooltip() {
    if (!this.state.hoveredId || !this.state.hoveredScreenPos) {
      this.hud.showTooltip(null, null, null);
      return;
    }
    const rec = this.recordById.get(this.state.hoveredId);
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
    const updatedIds = this.propagateFrame(simDate);

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
      this.cesiumEngine.updatePositions(simDate, this.positionsMap, selectedLook, updatedIds);
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
