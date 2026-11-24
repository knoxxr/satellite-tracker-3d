import {
  CATEGORIES,
  OBSERVER_PRESETS,
  getCategoryColor,
  getGroupLabel,
  getSatelliteDisplayInfo,
  getSatelliteModelMeta,
} from '../orbital/catalog.js';
import { ICONS } from './icons.js';

function fmtCoord(val, posHem, negHem) {
  const hem = val >= 0 ? posHem : negHem;
  return `${Math.abs(val).toFixed(4)}° ${hem}`;
}

function fmtKstTime(date) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

const SPEED_STEPS = [1, 10, 60, 300, 1000];

function fmtClockKst(date, compact = false) {
  if (compact) {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  }
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function fmtClockUtc(date) {
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

export class HudController {
  constructor(callbacks) {
    this.cb = callbacks;
    this.listRowMap = new Map(); // id -> { row, altEl }
    this.lastRenderedIds = '';
    this.pendingEngineAfterKey = null;
    this.currentSpeed = 1;
    this.telemetryExpanded = false;
    this.mobileMq = window.matchMedia('(max-width: 768px)');
    this.cacheDom();
    this.injectIcons();
    this.renderCategoryTabs();
    this.renderObserverPresets();
    this.bindEvents();
    this.applyResponsiveInitialState();
  }

  isMobile() {
    return this.mobileMq.matches;
  }

  cacheDom() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      bootSplash: $('boot-splash'),
      splashStatus: $('splash-status'),
      mobileBackdrop: $('mobile-backdrop'),
      leftDrawer: $('left-drawer'),
      drawerHandle: $('drawer-handle'),
      btnCollapseDrawer: $('btn-collapse-drawer'),
      btnExpandDrawer: $('btn-expand-drawer'),
      engineStatusText: $('engine-status-text'),
      satSearch: $('sat-search'),
      categoryTabs: $('category-tabs'),
      listCountText: $('list-count-text'),
      btnRefreshData: $('btn-refresh-data'),
      satList: $('sat-list'),

      engGlobe: $('eng-globe'),
      engGoogleTiles: $('eng-google-tiles'),
      engGoogleNative: $('eng-google-native'),
      mobileEngineOptions: $('mobile-engine-options'),
      btnLayers: $('btn-layers'),
      btnCloseLayers: $('btn-close-layers'),
      layersPopover: $('layers-popover'),
      basemapOptions: $('basemap-options'),
      toggleLighting: $('toggle-lighting'),
      toggleOrbit: $('toggle-orbit'),
      toggleFootprint: $('toggle-footprint'),
      toggleVectors: $('toggle-vectors'),
      observerSelect: $('observer-select'),
      btnGeolocate: $('btn-geolocate'),

      btnAddSat: $('btn-add-sat'),
      btnApiKey: $('btn-api-key'),
      apiKeyLabel: $('api-key-label'),

      telemetryPanel: $('telemetry-panel'),
      telemetryHandle: $('telemetry-handle'),
      btnFavorite: $('btn-favorite'),
      btnShareSat: $('btn-share-sat'),
      btnToggleTelemetryExpand: $('btn-toggle-telemetry-expand'),
      btnCloseTelemetry: $('btn-close-telemetry'),
      telRegime: $('tel-regime'),
      telGroup: $('tel-group'),
      telNorad: $('tel-norad'),
      telPeekAlt: $('tel-peek-alt'),
      telName: $('tel-name'),
      telOriginalName: $('tel-original-name'),
      telSummary: $('tel-summary'),
      telModelType: $('tel-model-type'),
      telModelLod: $('tel-model-lod'),
      btnCloseup: $('btn-closeup'),
      btnFollow: $('btn-follow'),
      btnFlyto: $('btn-flyto'),
      telLat: $('tel-lat'),
      telLon: $('tel-lon'),
      telAlt: $('tel-alt'),
      telSpeed: $('tel-speed'),
      telPeriod: $('tel-period'),
      telInc: $('tel-inc'),
      telApsis: $('tel-apsis'),
      telFootprint: $('tel-footprint'),
      telObserverHeading: $('tel-observer-heading'),
      telVisibilityPill: $('tel-visibility-pill'),
      telAz: $('tel-az'),
      telEl: $('tel-el'),
      telRange: $('tel-range'),
      telPassBox: $('tel-pass-box'),

      timeScrubberBar: $('time-scrubber-bar'),
      timeScrubber: $('time-scrubber'),
      scrubberOffsetLabel: $('scrubber-offset-label'),
      btnScrubberToggle: $('btn-scrubber-toggle'),

      btnLiveNow: $('btn-live-now'),
      clockKst: $('clock-kst'),
      clockUtc: $('clock-utc'),
      btnPlayPause: $('btn-play-pause'),
      btnSpeedCycle: $('btn-speed-cycle'),
      speedButtons: $('speed-buttons'),
      syncStatus: $('sync-status'),

      satTooltip: $('sat-tooltip'),
      modalApiKey: $('modal-api-key'),
      inputGoogleKey: $('input-google-key'),
      btnSaveApiKey: $('btn-save-api-key'),
      btnClearApiKey: $('btn-clear-api-key'),

      modalAddSat: $('modal-add-sat'),
      inputNoradId: $('input-norad-id'),
      btnFetchNorad: $('btn-fetch-norad'),
      inputTleText: $('input-tle-text'),
      btnParseTle: $('btn-parse-tle'),

      toastContainer: $('toast-container'),
    };
  }

  injectIcons() {
    const setIcon = (id, svg) => {
      const node = document.getElementById(id);
      if (node) node.innerHTML = svg;
    };
    setIcon('brand-icon', ICONS.satellite);
    setIcon('search-icon', ICONS.search);
    setIcon('refresh-icon', ICONS.refresh);
    setIcon('layers-icon', ICONS.layers);
    setIcon('plus-icon', ICONS.plus);
    setIcon('key-icon', ICONS.key);
    setIcon('closeup-icon', ICONS.cube3d);
    setIcon('follow-icon', ICONS.crosshair);
    setIcon('flyto-icon', ICONS.orbit);
    setIcon('expand-icon', ICONS.list);
    this.el.btnCollapseDrawer.innerHTML = ICONS.chevronLeft;
    this.el.btnCloseTelemetry.innerHTML = ICONS.close;
    if (this.el.btnFavorite) this.el.btnFavorite.innerHTML = ICONS.star;
    if (this.el.btnShareSat) this.el.btnShareSat.innerHTML = ICONS.share;
    if (this.el.btnScrubberToggle) this.el.btnScrubberToggle.innerHTML = ICONS.clock;
    if (this.el.btnCloseLayers) this.el.btnCloseLayers.innerHTML = ICONS.close;
    if (this.el.btnToggleTelemetryExpand) {
      this.el.btnToggleTelemetryExpand.innerHTML = ICONS.chevronUp;
    }
    this.el.btnPlayPause.innerHTML = ICONS.pause;
    document.querySelectorAll('.modal-close').forEach((btn) => {
      btn.innerHTML = ICONS.close;
    });
  }

  setSplashStatus(text) {
    if (this.el.splashStatus) {
      this.el.splashStatus.textContent = text;
    }
  }

  hideBootSplash() {
    if (!this.el.bootSplash) return;
    this.el.bootSplash.classList.add('is-hidden');
    setTimeout(() => {
      if (this.el.bootSplash) this.el.bootSplash.hidden = true;
    }, 360);
  }

  applyResponsiveInitialState() {
    if (this.isMobile()) {
      this.closeDrawer();
      this.setTelemetryExpanded(false);
    } else {
      this.el.telemetryPanel.classList.remove('mobile-peek');
      this.el.btnCollapseDrawer.innerHTML = ICONS.chevronLeft;
      this.updateMobileBackdrop();
    }
    this.updateDrawerCloseIcon();
  }

  updateDrawerCloseIcon() {
    this.el.btnCollapseDrawer.innerHTML = this.isMobile() ? ICONS.close : ICONS.chevronLeft;
  }

  openDrawer() {
    if (this.isMobile()) {
      this.closeLayersPopover();
    }
    this.el.leftDrawer.classList.remove('collapsed');
    this.el.btnExpandDrawer.hidden = true;
    this.updateMobileBackdrop();
  }

  closeDrawer() {
    this.el.leftDrawer.classList.add('collapsed');
    this.el.btnExpandDrawer.hidden = false;
    this.updateMobileBackdrop();
  }

  openLayersPopover() {
    if (this.isMobile()) {
      this.el.leftDrawer.classList.add('collapsed');
      this.el.btnExpandDrawer.hidden = false;
    }
    this.el.layersPopover.hidden = false;
    this.updateMobileBackdrop();
  }

  closeLayersPopover() {
    this.el.layersPopover.hidden = true;
    this.updateMobileBackdrop();
  }

  setTelemetryExpanded(expanded) {
    this.telemetryExpanded = Boolean(expanded);
    if (this.isMobile()) {
      this.el.telemetryPanel.classList.toggle('mobile-peek', !this.telemetryExpanded);
    } else {
      this.el.telemetryPanel.classList.remove('mobile-peek');
    }
    if (this.el.btnToggleTelemetryExpand) {
      this.el.btnToggleTelemetryExpand.innerHTML = this.telemetryExpanded
        ? ICONS.chevronDown
        : ICONS.chevronUp;
    }
  }

  updateMobileBackdrop() {
    if (!this.el.mobileBackdrop) return;
    if (!this.isMobile()) {
      this.el.mobileBackdrop.hidden = true;
      return;
    }
    const drawerOpen = !this.el.leftDrawer.classList.contains('collapsed');
    const layersOpen = !this.el.layersPopover.hidden;
    this.el.mobileBackdrop.hidden = !(drawerOpen || layersOpen);
  }

  renderCategoryTabs() {
    this.el.categoryTabs.innerHTML = CATEGORIES.map(
      (cat, idx) => `
      <button class="cat-tab${idx === 0 ? ' active' : ''}" data-category="${cat.id}" role="tab">
        <span class="cat-dot" style="background:${cat.color}"></span>
        <span>${cat.label}</span>
      </button>`
    ).join('');
  }

  renderObserverPresets() {
    this.el.observerSelect.innerHTML = OBSERVER_PRESETS.map(
      (obs) => `<option value="${obs.id}">${obs.name}</option>`
    ).join('');
  }

  bindEvents() {
    // Sync layout when crossing mobile/desktop breakpoint
    this.mobileMq.addEventListener?.('change', () => {
      this.updateDrawerCloseIcon();
      if (this.isMobile()) {
        this.closeDrawer();
        this.setTelemetryExpanded(false);
      } else {
        this.el.telemetryPanel.classList.remove('mobile-peek');
        this.openDrawer();
      }
      this.updateMobileBackdrop();
    });

    // Mobile backdrop dismiss
    this.el.mobileBackdrop?.addEventListener('click', () => {
      this.closeDrawer();
      this.closeLayersPopover();
    });

    // Drawer collapse / expand
    this.el.btnCollapseDrawer.addEventListener('click', () => {
      this.closeDrawer();
    });
    this.el.btnExpandDrawer.addEventListener('click', () => {
      this.openDrawer();
    });

    // Swipe down on drawer handle to dismiss on mobile
    this.bindVerticalSwipe(this.el.drawerHandle, {
      onSwipeDown: () => this.closeDrawer(),
    });

    // Category tabs
    this.el.categoryTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-tab');
      if (!btn) return;
      this.setActiveCategory(btn.dataset.category);
      this.cb.onCategoryChange?.(btn.dataset.category);
    });

    // Search input
    this.el.satSearch.addEventListener('input', (e) => {
      this.cb.onSearchChange?.(e.target.value);
    });
    this.el.satSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = this.el.satSearch.value.trim();
        if (/^\d{4,6}$/.test(val)) {
          this.cb.onLookupNorad?.(val);
        } else if (val.length >= 2) {
          this.cb.onSearchLiveCelesTrak?.(val);
        }
      }
    });

    // Infinite scroll batching for massive satellite lists (16,000+ active sats)
    this.el.satList.addEventListener(
      'scroll',
      () => {
        const el = this.el.satList;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 280) {
          this.appendNextSatelliteBatch(100);
        }
      },
      { passive: true }
    );

    // Refresh data
    this.el.btnRefreshData.addEventListener('click', () => {
      this.cb.onRefreshData?.();
    });

    // Engine selector (desktop segmented + mobile options inside layers sheet)
    [this.el.engGlobe, this.el.engGoogleTiles, this.el.engGoogleNative].forEach((btn) => {
      btn.addEventListener('click', () => {
        this.cb.onEngineChange?.(btn.dataset.engine);
      });
    });
    this.el.mobileEngineOptions?.addEventListener('click', (e) => {
      const btn = e.target.closest('.opt-btn');
      if (!btn) return;
      this.cb.onEngineChange?.(btn.dataset.engine);
      if (this.isMobile()) this.closeLayersPopover();
    });

    // Layers popover toggle
    this.el.btnLayers.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.el.layersPopover.hidden) {
        this.openLayersPopover();
      } else {
        this.closeLayersPopover();
      }
    });
    this.el.btnCloseLayers?.addEventListener('click', () => {
      this.closeLayersPopover();
    });
    document.addEventListener('click', (e) => {
      if (
        !this.el.layersPopover.hidden &&
        !this.el.layersPopover.contains(e.target) &&
        !this.el.btnLayers.contains(e.target)
      ) {
        this.closeLayersPopover();
      }
    });

    // Basemap options
    this.el.basemapOptions.addEventListener('click', (e) => {
      const btn = e.target.closest('.opt-btn');
      if (!btn) return;
      this.el.basemapOptions.querySelectorAll('.opt-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      this.cb.onBasemapChange?.(btn.dataset.basemap);
    });

    // Toggles
    this.el.toggleLighting.addEventListener('change', (e) => {
      this.cb.onToggleLighting?.(e.target.checked);
    });
    this.el.toggleOrbit.addEventListener('change', (e) => {
      this.cb.onToggleOrbit?.(e.target.checked);
    });
    this.el.toggleFootprint.addEventListener('change', (e) => {
      this.cb.onToggleFootprint?.(e.target.checked);
    });
    this.el.toggleVectors?.addEventListener('change', (e) => {
      this.cb.onToggleVectors?.(e.target.checked);
    });

    // Observer selector & GPS
    this.el.observerSelect.addEventListener('change', (e) => {
      const preset = OBSERVER_PRESETS.find((p) => p.id === e.target.value);
      if (preset) this.cb.onObserverChange?.(preset);
    });
    this.el.btnGeolocate.addEventListener('click', () => {
      this.cb.onRequestGeolocation?.();
      if (this.isMobile()) this.closeLayersPopover();
    });

    // Telemetry controls & mobile bottom-sheet toggle/swipe
    this.el.btnFavorite?.addEventListener('click', () => {
      this.cb.onToggleFavorite?.();
    });
    this.el.btnShareSat?.addEventListener('click', () => {
      this.cb.onShareSelected?.();
    });
    this.el.btnCloseTelemetry.addEventListener('click', () => {
      this.setTelemetryExpanded(false);
      this.cb.onDeselectSatellite?.();
    });
    this.el.btnToggleTelemetryExpand?.addEventListener('click', () => {
      this.setTelemetryExpanded(!this.telemetryExpanded);
    });
    this.el.telemetryHandle?.addEventListener('click', () => {
      this.setTelemetryExpanded(!this.telemetryExpanded);
    });
    this.el.telemetryHandle?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.setTelemetryExpanded(!this.telemetryExpanded);
      }
    });
    this.bindVerticalSwipe(this.el.telemetryHandle, {
      onSwipeUp: () => this.setTelemetryExpanded(true),
      onSwipeDown: () => {
        if (this.telemetryExpanded) {
          this.setTelemetryExpanded(false);
        } else {
          this.cb.onDeselectSatellite?.();
        }
      },
    });
    this.el.btnCloseup.addEventListener('click', () => {
      if (this.isMobile()) {
        this.setTelemetryExpanded(false);
      }
      this.cb.onCloseupSelected?.();
    });
    this.el.btnFollow.addEventListener('click', () => {
      this.cb.onToggleFollow?.();
    });
    this.el.btnFlyto.addEventListener('click', () => {
      if (this.isMobile()) {
        this.setTelemetryExpanded(false);
      }
      this.cb.onFlyToSelected?.();
    });

    // Pass jump-to-time delegation
    this.el.telPassBox?.addEventListener('click', (e) => {
      const btn = e.target.closest('.pass-jump-btn');
      if (!btn) return;
      const targetMs = Number(btn.dataset.timeMs);
      if (Number.isFinite(targetMs)) {
        this.cb.onJumpToTime?.(targetMs);
        if (this.isMobile()) this.setTelemetryExpanded(false);
      }
    });

    // Simulation controls & ±24h timeline scrubber
    this.el.btnLiveNow.addEventListener('click', () => {
      this.cb.onJumpToNow?.();
    });
    this.el.btnPlayPause.addEventListener('click', () => {
      this.cb.onTogglePlay?.();
    });
    this.el.btnScrubberToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = this.el.timeScrubberBar.hidden;
      this.el.timeScrubberBar.hidden = !willOpen;
      this.el.btnScrubberToggle.classList.toggle('active', willOpen);
    });
    this.el.timeScrubber?.addEventListener('input', (e) => {
      const mins = Number(e.target.value);
      this.updateScrubberLabel(mins);
      this.cb.onScrubOffsetMinutes?.(mins);
    });
    this.el.speedButtons.addEventListener('click', (e) => {
      const btn = e.target.closest('.speed-btn');
      if (!btn) return;
      const spd = Number(btn.dataset.speed);
      this.setActiveSpeed(spd);
      this.cb.onSpeedChange?.(spd);
    });
    this.el.btnSpeedCycle?.addEventListener('click', () => {
      const idx = SPEED_STEPS.indexOf(this.currentSpeed);
      const next = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length];
      this.setActiveSpeed(next);
      this.cb.onSpeedChange?.(next);
    });

    // Modals
    this.el.btnApiKey.addEventListener('click', () => {
      if (this.isMobile()) this.closeLayersPopover();
      this.openApiKeyModal();
    });
    this.el.btnAddSat.addEventListener('click', () => {
      if (this.isMobile()) this.closeLayersPopover();
      this.el.modalAddSat.hidden = false;
      this.el.inputNoradId.focus();
    });

    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.closeModal);
        if (target) target.hidden = true;
      });
    });

    [this.el.modalApiKey, this.el.modalAddSat].forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.hidden = true;
      });
    });

    this.el.btnSaveApiKey.addEventListener('click', () => {
      const key = this.el.inputGoogleKey.value.trim();
      this.el.modalApiKey.hidden = true;
      this.cb.onSaveApiKey?.(key, this.pendingEngineAfterKey);
      this.pendingEngineAfterKey = null;
    });
    this.el.btnClearApiKey.addEventListener('click', () => {
      this.el.inputGoogleKey.value = '';
      this.el.modalApiKey.hidden = true;
      this.cb.onSaveApiKey?.('', null);
    });

    this.el.btnFetchNorad.addEventListener('click', () => {
      const id = this.el.inputNoradId.value.trim();
      if (!id) return;
      this.cb.onLookupNorad?.(id, true);
    });
    this.el.btnParseTle.addEventListener('click', () => {
      const text = this.el.inputTleText.value.trim();
      if (!text) return;
      this.cb.onAddCustomTle?.(text);
    });
  }

  bindVerticalSwipe(el, { onSwipeUp, onSwipeDown }) {
    if (!el) return;
    let startY = null;
    el.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 1) {
          startY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );
    el.addEventListener(
      'touchend',
      (e) => {
        if (startY === null || e.changedTouches.length === 0) return;
        const dy = e.changedTouches[0].clientY - startY;
        startY = null;
        if (dy < -28) {
          onSwipeUp?.();
        } else if (dy > 28) {
          onSwipeDown?.();
        }
      },
      { passive: true }
    );
  }

  openApiKeyModal(currentKey = '', targetEngine = null) {
    this.pendingEngineAfterKey = targetEngine;
    if (currentKey) {
      this.el.inputGoogleKey.value = currentKey;
    }
    this.el.modalApiKey.hidden = false;
    this.el.inputGoogleKey.focus();
  }

  closeAddModal() {
    this.el.modalAddSat.hidden = true;
    this.el.inputNoradId.value = '';
    this.el.inputTleText.value = '';
  }

  setApiKeyState(hasKey) {
    this.el.btnApiKey.classList.toggle('active', hasKey);
    this.el.apiKeyLabel.textContent = hasKey ? 'Google API 연결됨' : 'Google API 키';
  }

  setActiveCategory(categoryId) {
    this.el.categoryTabs.querySelectorAll('.cat-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.category === categoryId);
    });
  }

  setActiveEngine(engineId, subtitleText) {
    [this.el.engGlobe, this.el.engGoogleTiles, this.el.engGoogleNative].forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.engine === engineId);
    });
    this.el.mobileEngineOptions?.querySelectorAll('.opt-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.engine === engineId);
    });
    if (subtitleText) {
      this.el.engineStatusText.textContent = subtitleText;
    }
  }

  setPlayState(isPlaying) {
    this.el.btnPlayPause.innerHTML = isPlaying ? ICONS.pause : ICONS.play;
  }

  setActiveSpeed(speed) {
    this.currentSpeed = speed;
    this.el.speedButtons.querySelectorAll('.speed-btn').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.speed) === speed);
    });
    if (this.el.btnSpeedCycle) {
      this.el.btnSpeedCycle.textContent = `${speed}×`;
      this.el.btnSpeedCycle.classList.toggle('active', speed > 1);
    }
  }

  setLiveIndicator(isLive) {
    this.el.btnLiveNow.classList.toggle('is-live', isLive);
  }

  updateScrubberLabel(offsetMinutes) {
    if (!this.el.scrubberOffsetLabel) return;
    const rounded = Math.round(offsetMinutes);
    if (Math.abs(rounded) < 1) {
      this.el.scrubberOffsetLabel.textContent = '실시간 (0분)';
      return;
    }
    const sign = rounded > 0 ? '+' : '-';
    const abs = Math.abs(rounded);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    this.el.scrubberOffsetLabel.textContent =
      h > 0 ? `${sign}${h}시간 ${String(m).padStart(2, '0')}분` : `${sign}${m}분`;
  }

  syncScrubberFromSimTime(simTimeMs) {
    if (!this.el.timeScrubber || document.activeElement === this.el.timeScrubber) return;
    const diffMin = Math.round((simTimeMs - Date.now()) / 60000);
    const clamped = Math.max(-1440, Math.min(1440, diffMin));
    this.el.timeScrubber.value = String(clamped);
    this.updateScrubberLabel(diffMin);
  }

  setFollowState(following) {
    this.el.btnFollow.classList.toggle('active', following);
    this.el.btnFollow.querySelector('span:last-child').textContent = following ? '추적 중' : '카메라 추적';
  }

  setFavoriteState(isFav) {
    if (!this.el.btnFavorite) return;
    this.el.btnFavorite.classList.toggle('is-favorite', isFav);
    this.el.btnFavorite.innerHTML = isFav ? ICONS.starFilled : ICONS.star;
    this.el.btnFavorite.title = isFav ? '즐겨찾기 해제' : '즐겨찾기 추가';
  }

  set3dModelLoading(isLoading) {
    this.is3dModelLoading = Boolean(isLoading);
    if (!this.el.telModelLod) return;
    if (this.is3dModelLoading) {
      this.el.telModelLod.classList.remove('active-3d');
      this.el.telModelLod.classList.add('loading-3d');
      this.el.telModelLod.textContent = '3D 모델 불러오는 중...';
    } else {
      this.el.telModelLod.classList.remove('loading-3d');
      this.set3dModelActiveState(Boolean(this.last3dActive));
    }
  }

  set3dModelActiveState(is3dActive) {
    this.last3dActive = Boolean(is3dActive);
    if (!this.el.telModelLod || this.is3dModelLoading) return;
    this.el.telModelLod.classList.toggle('active-3d', is3dActive);
    this.el.telModelLod.textContent = is3dActive ? '3D 실물 표시 중' : '줌인 시 3D 실물 표시';
  }

  setSyncStatus(text) {
    this.el.syncStatus.textContent = text;
  }

  updateClock(simDate) {
    this.el.clockKst.textContent = this.isMobile()
      ? `${fmtClockKst(simDate, true)} KST`
      : `${fmtClockKst(simDate, false)} KST`;
    this.el.clockUtc.textContent = fmtClockUtc(simDate);
    this.syncScrubberFromSimTime(simDate.getTime());
  }

  renderSatelliteList(
    records,
    selectedId,
    positionsMap,
    totalCount,
    favoriteIds = new Set(),
    isFavoritesTab = false,
    listRevision = 0
  ) {
    this.el.listCountText.textContent = isFavoritesTab
      ? `즐겨찾기 ${records.length.toLocaleString()}기`
      : `표시 ${records.length.toLocaleString()}기 / 전체 ${totalCount.toLocaleString()}기`;

    const favSig = [...favoriteIds].sort((a, b) => a - b).join('.');
    const firstId = records[0]?.id ?? 0;
    const lastId = records[records.length - 1]?.id ?? 0;
    const idSig = `${listRevision}|${records.length}|${firstId}|${lastId}|${favSig}|${isFavoritesTab ? '1' : '0'}`;

    this.currentListRecords = records;
    this.currentListSelectedId = selectedId;
    this.currentListPositions = positionsMap;
    this.currentListFavorites = favoriteIds;

    if (idSig !== this.lastRenderedIds) {
      this.lastRenderedIds = idSig;
      this.listRowMap.clear();
      this.renderedBatchCount = 0;

      if (records.length === 0) {
        this.el.satList.innerHTML = isFavoritesTab
          ? `<div class="empty-list">즐겨찾기한 위성이 아직 없습니다.<br/>위성 상세 패널의 ★ 버튼으로 관심 위성을 등록해 보세요.</div>`
          : `<div class="empty-list">일치하는 위성이 없습니다.<br/>위성 이름 또는 NORAD ID 입력 후 Enter로 CelesTrak 전체 DB를 실시간 조회할 수 있습니다.</div>`;
        return;
      }

      this.el.satList.innerHTML = '';
      this.el.satList.scrollTop = 0;
      this.appendNextSatelliteBatch();
    }

    // Update live altitudes & selection state in-place for currently rendered rows only (O(rendered))
    for (const [id, entry] of this.listRowMap.entries()) {
      entry.row.classList.toggle('selected', id === selectedId);
      const pos = positionsMap.get(id);
      if (pos) {
        entry.altEl.textContent = `${Math.round(pos.altKm).toLocaleString()} km`;
      }
    }
  }

  appendNextSatelliteBatch(batchSize = 100) {
    const records = this.currentListRecords;
    if (!records || this.renderedBatchCount >= records.length) return;

    const start = this.renderedBatchCount;
    const end = Math.min(start + batchSize, records.length);
    const selectedId = this.currentListSelectedId;
    const positionsMap = this.currentListPositions;
    const favoriteIds = this.currentListFavorites || new Set();

    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      const rec = records[i];
      const info = getSatelliteDisplayInfo(rec.id, rec.name);
      const color = getCategoryColor(rec.group);
      const isFav = favoriteIds.has(rec.id);
      const pos = positionsMap?.get(rec.id);
      const row = document.createElement('button');
      row.className = `sat-item${rec.id === selectedId ? ' selected' : ''}`;
      row.dataset.id = String(rec.id);
      row.setAttribute('role', 'option');
      row.innerHTML = `
        <div class="sat-item-left">
          <span class="sat-color-bar" style="background:${color}"></span>
          <div class="sat-item-info">
            <div class="sat-item-name">${isFav ? '<span class="sat-fav-star">★</span> ' : ''}${escapeHtml(info.title)}</div>
            <div class="sat-item-meta">
              <span class="mono">#${rec.id}</span>
              <span>·</span>
              <span>${getGroupLabel(rec.group)}</span>
            </div>
          </div>
        </div>
        <div class="sat-item-right">
          <div class="sat-item-alt mono">${pos ? `${Math.round(pos.altKm).toLocaleString()} km` : '-- km'}</div>
          <span class="sat-regime-tag mono">${rec.regime}</span>
        </div>
      `;
      row.addEventListener('click', () => {
        this.cb.onSelectSatellite?.(rec.id, true);
        if (this.isMobile()) {
          this.closeDrawer();
          this.setTelemetryExpanded(false);
        }
      });
      const altEl = row.querySelector('.sat-item-alt');
      this.listRowMap.set(rec.id, { row, altEl });
      frag.appendChild(row);
    }

    this.el.satList.appendChild(frag);
    this.renderedBatchCount = end;
  }

  updateTelemetry(record, pos, look, observer, passInfo, isFav = false) {
    if (!record || !pos) {
      this.el.telemetryPanel.hidden = true;
      return;
    }

    this.el.telemetryPanel.hidden = false;
    this.setFavoriteState(isFav);
    const info = getSatelliteDisplayInfo(record.id, record.name);

    this.el.telRegime.textContent = record.regime;
    this.el.telGroup.textContent = getGroupLabel(record.group);
    this.el.telNorad.textContent = `NORAD ${record.id}`;
    if (this.el.telPeekAlt) {
      this.el.telPeekAlt.textContent = `${Math.round(pos.altKm).toLocaleString()} km · ${pos.speedKmS.toFixed(1)} km/s`;
    }
    this.el.telName.textContent = info.title;
    this.el.telOriginalName.textContent =
      info.title !== info.originalName
        ? `${info.originalName} · ${record.cosparId}`
        : `COSPAR ${record.cosparId}`;

    if (info.summary) {
      this.el.telSummary.hidden = false;
      this.el.telSummary.textContent = info.summary;
    } else {
      this.el.telSummary.hidden = true;
    }

    const modelMeta = getSatelliteModelMeta(record);
    if (this.el.telModelType) {
      this.el.telModelType.innerHTML = `
        <span>${escapeHtml(modelMeta.label)}</span>
        <span class="fidelity-tag fidelity-${modelMeta.fidelity}">${escapeHtml(modelMeta.fidelityLabel)}</span>
      `;
    }

    this.el.telLat.textContent = fmtCoord(pos.lat, 'N', 'S');
    this.el.telLon.textContent = fmtCoord(pos.lon, 'E', 'W');
    this.el.telAlt.textContent = `${pos.altKm.toFixed(1)} km`;
    this.el.telSpeed.textContent = `${pos.speedKmS.toFixed(2)} km/s`;
    this.el.telPeriod.textContent = `${record.periodMin.toFixed(1)} min`;
    this.el.telInc.textContent = `${record.inclinationDeg.toFixed(2)}°`;
    this.el.telApsis.textContent = `${Math.round(record.perigeeKm)} / ${Math.round(record.apogeeKm)} km`;
    this.el.telFootprint.textContent = `${Math.round(pos.footprintRadiusKm).toLocaleString()} km`;

    if (observer && look) {
      this.el.telObserverHeading.textContent = `관측소 시선각 (${observer.name.split(' ')[0]})`;
      this.el.telAz.textContent = `${look.azimuthDeg.toFixed(1)}° ${look.compass}`;
      this.el.telEl.textContent = `${look.elevationDeg.toFixed(1)}°`;
      this.el.telRange.textContent = `${Math.round(look.rangeKm).toLocaleString()} km`;
      this.el.telVisibilityPill.classList.toggle('visible', look.visible);
      this.el.telVisibilityPill.textContent = look.visible ? '현재 가시권 (상공)' : '지평선 아래';
    }

    if (passInfo) {
      this.renderPassInfo(passInfo);
    }
  }

  renderPassInfo(pass) {
    const sig = pass
      ? `${pass.status}|${pass.aos ? pass.aos.getTime() : 0}|${pass.passes?.length || 0}|${Math.round(pass.maxElevationDeg || 0)}`
      : 'null';
    if (sig === this.lastPassSig) return;
    this.lastPassSig = sig;

    if (!pass || pass.status === 'UNAVAILABLE') {
      this.el.telPassBox.textContent = '통과 예측 정보를 계산할 수 없습니다.';
      return;
    }
    if (pass.status === 'GEO_ALWAYS_VISIBLE') {
      this.el.telPassBox.innerHTML = `정지궤도(GEO) 위성 — 관측소에서 상시 관측 가능 (고도각 <strong>${pass.maxElevationDeg.toFixed(1)}°</strong>)`;
      return;
    }
    if (pass.status === 'GEO_BELOW_HORIZON') {
      this.el.telPassBox.textContent = '정지궤도(GEO) 위성 — 현재 관측소 지평선 아래에 고정되어 있습니다.';
      return;
    }
    if (pass.status === 'NO_PASS_24H') {
      this.el.telPassBox.textContent = '향후 48시간 내 관측소 상공 통과 예정이 없습니다.';
      return;
    }

    const list = Array.isArray(pass.passes) && pass.passes.length > 0 ? pass.passes : [pass];
    this.el.telPassBox.innerHTML = `
      <div class="pass-list-heading">향후 48시간 상공 통과 일정 (${list.length}회)</div>
      <div class="pass-list">
        ${list
          .map((item, idx) => {
            const isNow = item.status === 'VISIBLE_NOW';
            const aosStr = item.aos ? fmtKstTime(item.aos) : '--';
            const durMin = item.durationSec ? `${Math.max(1, Math.round(item.durationSec / 60))}분` : '';
            const jumpMs = item.aos ? item.aos.getTime() : 0;
            return `
              <div class="pass-row${idx === 0 ? ' is-next' : ''}">
                <div class="pass-row-info">
                  <div class="pass-row-top">
                    <span class="pass-tag${isNow ? ' live' : ''}">${isNow ? '통과 중' : `#${idx + 1}`}</span>
                    <span class="pass-el">최대 <strong>${item.maxElevationDeg.toFixed(0)}°</strong>${durMin ? ` · ${durMin}` : ''}</span>
                  </div>
                  <div class="pass-time mono">${aosStr} KST</div>
                </div>
                ${
                  jumpMs
                    ? `<button class="pass-jump-btn" data-time-ms="${jumpMs}" title="이 통과 시각으로 시뮬레이션 이동">이동</button>`
                    : ''
                }
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  showTooltip(record, pos, screenPos) {
    if (!record || !pos || !screenPos) {
      this.el.satTooltip.hidden = true;
      return;
    }
    const info = getSatelliteDisplayInfo(record.id, record.name);
    this.el.satTooltip.hidden = false;
    this.el.satTooltip.style.left = `${screenPos.x}px`;
    this.el.satTooltip.style.top = `${screenPos.y}px`;
    this.el.satTooltip.innerHTML = `
      <div><strong>${escapeHtml(info.title)}</strong></div>
      <div class="tt-sub mono">#${record.id} · ${pos.altKm.toFixed(0)} km · ${pos.speedKmS.toFixed(2)} km/s</div>
    `;
  }

  toast(message, type = 'info') {
    const div = document.createElement('div');
    div.className = `toast ${type}`;
    div.textContent = message;
    this.el.toastContainer.appendChild(div);
    setTimeout(() => {
      div.style.opacity = '0';
      div.style.transition = 'opacity 0.25s ease';
      setTimeout(() => div.remove(), 260);
    }, 3600);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
