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

function fmtClockKst(date) {
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
    this.cacheDom();
    this.injectIcons();
    this.renderCategoryTabs();
    this.renderObserverPresets();
    this.bindEvents();
  }

  cacheDom() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      leftDrawer: $('left-drawer'),
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
      btnLayers: $('btn-layers'),
      layersPopover: $('layers-popover'),
      basemapOptions: $('basemap-options'),
      toggleLighting: $('toggle-lighting'),
      toggleOrbit: $('toggle-orbit'),
      toggleFootprint: $('toggle-footprint'),
      observerSelect: $('observer-select'),
      btnGeolocate: $('btn-geolocate'),

      btnAddSat: $('btn-add-sat'),
      btnApiKey: $('btn-api-key'),
      apiKeyLabel: $('api-key-label'),

      telemetryPanel: $('telemetry-panel'),
      btnCloseTelemetry: $('btn-close-telemetry'),
      telRegime: $('tel-regime'),
      telGroup: $('tel-group'),
      telNorad: $('tel-norad'),
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

      btnLiveNow: $('btn-live-now'),
      clockKst: $('clock-kst'),
      clockUtc: $('clock-utc'),
      btnPlayPause: $('btn-play-pause'),
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
    setIcon('expand-icon', ICONS.chevronRight);
    this.el.btnCollapseDrawer.innerHTML = ICONS.chevronLeft;
    this.el.btnCloseTelemetry.innerHTML = ICONS.close;
    this.el.btnPlayPause.innerHTML = ICONS.pause;
    document.querySelectorAll('.modal-close').forEach((btn) => {
      btn.innerHTML = ICONS.close;
    });
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
    // Drawer collapse / expand
    this.el.btnCollapseDrawer.addEventListener('click', () => {
      this.el.leftDrawer.classList.add('collapsed');
      this.el.btnExpandDrawer.hidden = false;
    });
    this.el.btnExpandDrawer.addEventListener('click', () => {
      this.el.leftDrawer.classList.remove('collapsed');
      this.el.btnExpandDrawer.hidden = true;
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
        }
      }
    });

    // Refresh data
    this.el.btnRefreshData.addEventListener('click', () => {
      this.cb.onRefreshData?.();
    });

    // Engine selector
    [this.el.engGlobe, this.el.engGoogleTiles, this.el.engGoogleNative].forEach((btn) => {
      btn.addEventListener('click', () => {
        this.cb.onEngineChange?.(btn.dataset.engine);
      });
    });

    // Layers popover toggle
    this.el.btnLayers.addEventListener('click', (e) => {
      e.stopPropagation();
      this.el.layersPopover.hidden = !this.el.layersPopover.hidden;
    });
    document.addEventListener('click', (e) => {
      if (
        !this.el.layersPopover.hidden &&
        !this.el.layersPopover.contains(e.target) &&
        !this.el.btnLayers.contains(e.target)
      ) {
        this.el.layersPopover.hidden = true;
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

    // Observer selector & GPS
    this.el.observerSelect.addEventListener('change', (e) => {
      const preset = OBSERVER_PRESETS.find((p) => p.id === e.target.value);
      if (preset) this.cb.onObserverChange?.(preset);
    });
    this.el.btnGeolocate.addEventListener('click', () => {
      this.cb.onRequestGeolocation?.();
    });

    // Telemetry controls
    this.el.btnCloseTelemetry.addEventListener('click', () => {
      this.cb.onDeselectSatellite?.();
    });
    this.el.btnCloseup.addEventListener('click', () => {
      this.cb.onCloseupSelected?.();
    });
    this.el.btnFollow.addEventListener('click', () => {
      this.cb.onToggleFollow?.();
    });
    this.el.btnFlyto.addEventListener('click', () => {
      this.cb.onFlyToSelected?.();
    });

    // Simulation controls
    this.el.btnLiveNow.addEventListener('click', () => {
      this.cb.onJumpToNow?.();
    });
    this.el.btnPlayPause.addEventListener('click', () => {
      this.cb.onTogglePlay?.();
    });
    this.el.speedButtons.addEventListener('click', (e) => {
      const btn = e.target.closest('.speed-btn');
      if (!btn) return;
      this.setActiveSpeed(Number(btn.dataset.speed));
      this.cb.onSpeedChange?.(Number(btn.dataset.speed));
    });

    // Modals
    this.el.btnApiKey.addEventListener('click', () => {
      this.openApiKeyModal();
    });
    this.el.btnAddSat.addEventListener('click', () => {
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
    if (subtitleText) {
      this.el.engineStatusText.textContent = subtitleText;
    }
  }

  setPlayState(isPlaying) {
    this.el.btnPlayPause.innerHTML = isPlaying ? ICONS.pause : ICONS.play;
  }

  setActiveSpeed(speed) {
    this.el.speedButtons.querySelectorAll('.speed-btn').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.speed) === speed);
    });
  }

  setLiveIndicator(isLive) {
    this.el.btnLiveNow.classList.toggle('is-live', isLive);
  }

  setFollowState(following) {
    this.el.btnFollow.classList.toggle('active', following);
    this.el.btnFollow.querySelector('span:last-child').textContent = following ? '추적 중' : '카메라 추적';
  }

  set3dModelActiveState(is3dActive) {
    if (!this.el.telModelLod) return;
    this.el.telModelLod.classList.toggle('active-3d', is3dActive);
    this.el.telModelLod.textContent = is3dActive ? '3D 실물 표시 중' : '줌인 시 3D 실물 표시';
  }

  setSyncStatus(text) {
    this.el.syncStatus.textContent = text;
  }

  updateClock(simDate) {
    this.el.clockKst.textContent = `${fmtClockKst(simDate)} KST`;
    this.el.clockUtc.textContent = fmtClockUtc(simDate);
  }

  renderSatelliteList(records, selectedId, positionsMap, totalCount) {
    this.el.listCountText.textContent = `표시 ${records.length}기 / 전체 ${totalCount}기`;

    const idSig = records.map((r) => r.id).join(',');
    if (idSig !== this.lastRenderedIds) {
      this.lastRenderedIds = idSig;
      this.listRowMap.clear();

      if (records.length === 0) {
        this.el.satList.innerHTML = `<div class="empty-list">일치하는 위성이 없습니다.<br/>숫자 NORAD ID 입력 후 Enter로 실시간 조회할 수 있습니다.</div>`;
        return;
      }

      const frag = document.createDocumentFragment();
      for (const rec of records) {
        const info = getSatelliteDisplayInfo(rec.id, rec.name);
        const color = getCategoryColor(rec.group);
        const row = document.createElement('button');
        row.className = `sat-item${rec.id === selectedId ? ' selected' : ''}`;
        row.dataset.id = String(rec.id);
        row.setAttribute('role', 'option');
        row.innerHTML = `
          <div class="sat-item-left">
            <span class="sat-color-bar" style="background:${color}"></span>
            <div class="sat-item-info">
              <div class="sat-item-name">${escapeHtml(info.title)}</div>
              <div class="sat-item-meta">
                <span class="mono">#${rec.id}</span>
                <span>·</span>
                <span>${getGroupLabel(rec.group)}</span>
              </div>
            </div>
          </div>
          <div class="sat-item-right">
            <div class="sat-item-alt mono">-- km</div>
            <span class="sat-regime-tag mono">${rec.regime}</span>
          </div>
        `;
        row.addEventListener('click', () => this.cb.onSelectSatellite?.(rec.id, true));
        const altEl = row.querySelector('.sat-item-alt');
        this.listRowMap.set(rec.id, { row, altEl });
        frag.appendChild(row);
      }
      this.el.satList.innerHTML = '';
      this.el.satList.appendChild(frag);
    }

    // Update live altitudes & selection state in-place without rebuilding DOM
    for (const [id, entry] of this.listRowMap.entries()) {
      entry.row.classList.toggle('selected', id === selectedId);
      const pos = positionsMap.get(id);
      if (pos) {
        entry.altEl.textContent = `${Math.round(pos.altKm).toLocaleString()} km`;
      }
    }
  }

  updateTelemetry(record, pos, look, observer, passInfo) {
    if (!record || !pos) {
      this.el.telemetryPanel.hidden = true;
      return;
    }

    this.el.telemetryPanel.hidden = false;
    const info = getSatelliteDisplayInfo(record.id, record.name);

    this.el.telRegime.textContent = record.regime;
    this.el.telGroup.textContent = getGroupLabel(record.group);
    this.el.telNorad.textContent = `NORAD ${record.id}`;
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
      this.el.telPassBox.textContent = '향후 24시간 내 관측소 상공 통과 예정이 없습니다.';
      return;
    }

    const prefix = pass.status === 'VISIBLE_NOW' ? '현재 상공 통과 중' : '다음 상공 통과 예정';
    const aosStr = pass.aos ? fmtKstTime(pass.aos) : '--';
    const losStr = pass.los ? fmtKstTime(pass.los) : '--';
    this.el.telPassBox.innerHTML = `
      <div><strong>${prefix}</strong> · 최대 고도각 <strong>${pass.maxElevationDeg.toFixed(1)}°</strong></div>
      <div class="mono" style="margin-top:3px;font-size:11px;">
        AOS ${aosStr} → LOS ${losStr} (KST)
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
