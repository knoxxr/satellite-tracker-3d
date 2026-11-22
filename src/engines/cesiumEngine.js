import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { getCategoryColor, getSatelliteDisplayInfo } from '../orbital/catalog.js';

const CESIUM_ASSETS_URL = `${import.meta.env.BASE_URL || '/'}cesium/`;
if (typeof window !== 'undefined') {
  window.CESIUM_BASE_URL = CESIUM_ASSETS_URL;
}
Cesium.buildModuleUrl.setBaseUrl(CESIUM_ASSETS_URL);

const EARTH_RADIUS_M = 6378137;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const DEFAULT_SURFACE_POS = Cesium.Cartesian3.fromDegrees(127.0, 37.5, 1000);
const DEFAULT_ORBIT_POS = Cesium.Cartesian3.fromDegrees(127.0, 37.5, 420000);

const BASEMAPS = {
  'google-hybrid': {
    label: 'Google 위성 + 지명',
    create: () =>
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://mt{s}.google.com/vt/lyrs=y&hl=ko&x={x}&y={y}&z={z}',
        subdomains: ['0', '1', '2', '3'],
        maximumLevel: 20,
        credit: new Cesium.Credit('Map data © Google'),
      }),
  },
  'google-satellite': {
    label: 'Google 위성 영상',
    create: () =>
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        subdomains: ['0', '1', '2', '3'],
        maximumLevel: 20,
        credit: new Cesium.Credit('Imagery © Google'),
      }),
  },
  'esri-imagery': {
    label: 'Esri 위성 영상',
    create: () =>
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 18,
        credit: new Cesium.Credit('Imagery © Esri, Earthstar Geographics'),
      }),
  },
  dark: {
    label: '다크 벡터 지도',
    create: () =>
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        subdomains: ['a', 'b', 'c', 'd'],
        maximumLevel: 19,
        credit: new Cesium.Credit('© OpenStreetMap, © CARTO'),
      }),
  },
};

function safeCartesianFromDegrees(lon, lat, altMeters = 0) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(altMeters)) {
    return null;
  }
  const clampedLat = Math.max(-89.999, Math.min(89.999, lat));
  const clampedAlt = Math.max(0, Math.min(altMeters, 200000000));
  return Cesium.Cartesian3.fromDegrees(lon, clampedLat, clampedAlt);
}

/**
 * Compute geodesic circle vertices on Earth's surface around (latDeg, lonDeg) with arc radius in meters.
 * Rendered via PolylineCollection for zero-flicker synchronous 60fps updates without Entity worker churn.
 */
function buildFootprintCirclePositions(latDeg, lonDeg, radiusMeters, segments = 96) {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg) || !Number.isFinite(radiusMeters)) {
    return [];
  }
  const clampedRadius = Math.min(Math.max(radiusMeters, 80000), 9000000);
  const angularDist = clampedRadius / EARTH_RADIUS_M;
  const lat1 = latDeg * DEG_TO_RAD;
  const lon1 = lonDeg * DEG_TO_RAD;
  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAd = Math.sin(angularDist);
  const cosAd = Math.cos(angularDist);

  const positions = [];
  for (let i = 0; i <= segments; i++) {
    const bearing = (i / segments) * Math.PI * 2;
    const sinLat2 = sinLat1 * cosAd + cosLat1 * sinAd * Math.cos(bearing);
    const lat2 = Math.asin(Math.max(-1, Math.min(1, sinLat2)));
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearing) * sinAd * cosLat1,
        cosAd - sinLat1 * Math.sin(lat2)
      );
    const pos = safeCartesianFromDegrees(lon2 * RAD_TO_DEG, lat2 * RAD_TO_DEG, 12000);
    if (pos) positions.push(pos);
  }
  return positions;
}

function createSatelliteSprite(hexColor, selected = false) {
  const size = selected ? 64 : 36;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  if (selected) {
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.strokeStyle = hexColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.85;
    ctx.stroke();

    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22);
    grad.addColorStop(0, hexColor);
    grad.addColorStop(0.5, hexColor + '55');
    grad.addColorStop(1, hexColor + '00');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = hexColor;
    ctx.stroke();
  } else {
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 14);
    grad.addColorStop(0, hexColor);
    grad.addColorStop(0.45, hexColor + '70');
    grad.addColorStop(1, hexColor + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 1.6;
    ctx.strokeStyle = hexColor;
    ctx.stroke();
  }

  return canvas.toDataURL();
}

export class CesiumSatelliteEngine {
  constructor(container, { onSelect, onHover }) {
    this.container = container;
    this.onSelect = onSelect;
    this.onHover = onHover;
    this.viewer = null;
    this.billboards = null;
    this.labels = null;
    this.polylines = null;
    this.groundPoints = null;
    this.observerLabels = null;

    this.spriteCache = new Map();
    this.satPrimitives = new Map(); // id -> { billboard, label, record, color, defaultShowLabel }
    this.googleTileset = null;
    this.google3dEnabled = false;
    this.currentBasemap = 'google-hybrid';
    this.selectedId = null;
    this.hoveredId = null;
    this.followMode = false;
    this.showOrbit = true;
    this.showFootprint = true;
    this.enableLighting = false;
    this.observer = null;

    // Primitive references for synchronous 60fps overlays
    this.pastOrbitLine = null;
    this.futureOrbitLine = null;
    this.nadirLine = null;
    this.footprintLine = null;
    this.losLine = null;
    this.subSatPoint = null;
    this.observerPoint = null;
    this.observerLabel = null;

    this.lastSelectedPosition = null;
    this.lastFollowTarget = null;
    this.lastOverlayColor = '';
  }

  init() {
    Cesium.Ion.defaultAccessToken = '';

    this.viewer = new Cesium.Viewer(this.container, {
      baseLayer: false,
      animation: false,
      timeline: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      shouldAnimate: false,
      skyAtmosphere: new Cesium.SkyAtmosphere(),
      requestRenderMode: false,
    });

    const scene = this.viewer.scene;
    scene.backgroundColor = Cesium.Color.fromCssColorString('#05080f');
    scene.globe.baseColor = Cesium.Color.fromCssColorString('#0b1322');
    scene.globe.enableLighting = this.enableLighting;
    scene.globe.showGroundAtmosphere = true;
    scene.globe.depthTestAgainstTerrain = false;
    scene.highDynamicRange = false;

    if (this.viewer.cesiumWidget.creditContainer) {
      this.viewer.cesiumWidget.creditContainer.classList.add('cesium-credit-minimal');
    }

    this.setBasemap(this.currentBasemap);

    // Pure GPU Primitive collections (zero Entity WebWorker async crashes)
    this.polylines = scene.primitives.add(new Cesium.PolylineCollection());
    this.groundPoints = scene.primitives.add(new Cesium.PointPrimitiveCollection());
    this.billboards = scene.primitives.add(new Cesium.BillboardCollection());
    this.labels = scene.primitives.add(new Cesium.LabelCollection());
    this.observerLabels = scene.primitives.add(new Cesium.LabelCollection());

    // Initial view framed nicely over East Asia / Korean Peninsula
    this.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(127.0, 32.0, 15500000),
    });

    this.setupOverlayPrimitives();
    this.setupInputHandlers();
  }

  setupOverlayPrimitives() {
    const skyColor = Cesium.Color.fromCssColorString('#38bdf8');
    const emeraldColor = Cesium.Color.fromCssColorString('#10b981');

    this.pastOrbitLine = this.polylines.add({
      show: false,
      positions: [DEFAULT_SURFACE_POS, DEFAULT_ORBIT_POS],
      width: 1.8,
      material: Cesium.Material.fromType('PolylineDash', {
        color: Cesium.Color.WHITE.withAlpha(0.38),
        dashLength: 10,
      }),
    });

    this.futureOrbitLine = this.polylines.add({
      show: false,
      positions: [DEFAULT_SURFACE_POS, DEFAULT_ORBIT_POS],
      width: 2.6,
      material: Cesium.Material.fromType('Color', {
        color: skyColor.withAlpha(0.92),
      }),
    });

    this.nadirLine = this.polylines.add({
      show: false,
      positions: [DEFAULT_ORBIT_POS, DEFAULT_SURFACE_POS],
      width: 1.6,
      material: Cesium.Material.fromType('PolylineDash', {
        color: skyColor.withAlpha(0.75),
        dashLength: 8,
      }),
    });

    this.footprintLine = this.polylines.add({
      show: false,
      positions: [DEFAULT_SURFACE_POS, DEFAULT_ORBIT_POS],
      width: 1.8,
      material: Cesium.Material.fromType('Color', {
        color: skyColor.withAlpha(0.68),
      }),
    });

    this.losLine = this.polylines.add({
      show: false,
      positions: [DEFAULT_SURFACE_POS, DEFAULT_ORBIT_POS],
      width: 2.0,
      material: Cesium.Material.fromType('Color', {
        color: emeraldColor.withAlpha(0.88),
      }),
    });

    this.subSatPoint = this.groundPoints.add({
      show: false,
      position: DEFAULT_SURFACE_POS,
      pixelSize: 7,
      color: skyColor,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 1.5,
    });

    this.observerPoint = this.groundPoints.add({
      show: false,
      position: DEFAULT_SURFACE_POS,
      pixelSize: 9,
      color: emeraldColor,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
    });

    this.observerLabel = this.observerLabels.add({
      show: false,
      position: DEFAULT_SURFACE_POS,
      text: '서울',
      font: '600 11px Inter, "Noto Sans KR", sans-serif',
      fillColor: Cesium.Color.fromCssColorString('#d1fae5'),
      outlineColor: Cesium.Color.fromCssColorString('#05080f'),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -14),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    });
  }

  setupInputHandlers() {
    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.eventHandler = handler;

    handler.setInputAction((movement) => {
      const picked = this.viewer.scene.pick(movement.position);
      if (Cesium.defined(picked) && picked.id && typeof picked.id === 'object' && picked.id.satId) {
        this.onSelect?.(picked.id.satId);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((movement) => {
      const picked = this.viewer.scene.pick(movement.endPosition);
      if (Cesium.defined(picked) && picked.id && typeof picked.id === 'object' && picked.id.satId) {
        const satId = picked.id.satId;
        this.container.style.cursor = 'pointer';
        if (this.hoveredId !== satId) {
          this.setHovered(satId);
        }
        this.onHover?.(satId, movement.endPosition);
      } else {
        this.container.style.cursor = 'grab';
        if (this.hoveredId !== null) {
          this.setHovered(null);
          this.onHover?.(null, null);
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  getSprite(hexColor, selected = false) {
    const key = `${hexColor}:${selected ? '1' : '0'}`;
    if (!this.spriteCache.has(key)) {
      this.spriteCache.set(key, createSatelliteSprite(hexColor, selected));
    }
    return this.spriteCache.get(key);
  }

  setBasemap(basemapId) {
    if (!this.viewer || !BASEMAPS[basemapId]) return;
    this.currentBasemap = basemapId;
    const layers = this.viewer.imageryLayers;
    layers.removeAll();
    layers.addImageryProvider(BASEMAPS[basemapId].create());
  }

  /**
   * Enable or disable Google Maps Photorealistic 3D Tiles on the CesiumJS globe.
   */
  async setGooglePhotorealistic3D(enabled, apiKey) {
    if (!this.viewer) return { ok: false, error: 'Viewer not ready' };

    if (!enabled) {
      if (this.googleTileset) {
        this.viewer.scene.primitives.remove(this.googleTileset);
        this.googleTileset = null;
      }
      this.google3dEnabled = false;
      this.viewer.scene.globe.show = true;
      return { ok: true, mode: 'globe' };
    }

    if (!apiKey || !apiKey.trim()) {
      return { ok: false, error: 'Google Maps API 키를 먼저 입력해 주세요.' };
    }

    try {
      if (this.googleTileset) {
        this.viewer.scene.primitives.remove(this.googleTileset);
        this.googleTileset = null;
      }

      Cesium.GoogleMaps.defaultApiKey = apiKey.trim();
      const tileset = await Cesium.createGooglePhotorealistic3DTileset(
        { key: apiKey.trim(), onlyUsingWithGoogleGeocoder: true },
        { showCreditsOnScreen: true }
      );
      this.googleTileset = this.viewer.scene.primitives.add(tileset);
      this.google3dEnabled = true;
      this.viewer.scene.globe.show = false;
      return { ok: true, mode: 'google-3d-tiles' };
    } catch (err) {
      this.google3dEnabled = false;
      this.viewer.scene.globe.show = true;
      return {
        ok: false,
        error: `Google Photorealistic 3D Tiles 로드 실패: ${err.message || 'Map Tiles API 활성화 및 API 키를 확인하세요.'}`,
      };
    }
  }

  setLighting(enabled) {
    this.enableLighting = enabled;
    if (this.viewer) {
      this.viewer.scene.globe.enableLighting = enabled;
    }
  }

  setObserver(observer) {
    this.observer = observer;
    if (!this.observerPoint || !this.observerLabel) return;
    if (!observer) {
      this.observerPoint.show = false;
      this.observerLabel.show = false;
      return;
    }
    const pos = safeCartesianFromDegrees(observer.lon, observer.lat, (observer.heightKm || 0) * 1000 + 200);
    if (!pos) return;
    this.observerPoint.position = pos;
    this.observerPoint.show = true;
    this.observerLabel.position = pos;
    this.observerLabel.text = observer.name.split(' ')[0];
    this.observerLabel.show = true;
  }

  setSatellites(records) {
    if (!this.billboards || !this.labels) return;
    this.billboards.removeAll();
    this.labels.removeAll();
    this.satPrimitives.clear();

    const showLabelsByDefault = records.length <= 45;

    for (const rec of records) {
      const color = getCategoryColor(rec.group);
      const isSelected = rec.id === this.selectedId;
      const info = getSatelliteDisplayInfo(rec.id, rec.name);

      const billboard = this.billboards.add({
        show: false,
        position: DEFAULT_ORBIT_POS,
        image: this.getSprite(color, isSelected),
        scale: isSelected ? 0.72 : 0.62,
        id: { satId: rec.id },
        disableDepthTestDistance: 12000000,
      });

      const showLabel = isSelected || info.isNotable || (showLabelsByDefault && rec.group !== 'starlink');
      const label = this.labels.add({
        show: false,
        position: DEFAULT_ORBIT_POS,
        text: info.isNotable ? info.title.split(' (')[0] : rec.name,
        font: isSelected
          ? '700 12px Inter, "Noto Sans KR", sans-serif'
          : '500 10.5px Inter, "Noto Sans KR", sans-serif',
        fillColor: isSelected
          ? Cesium.Color.WHITE
          : Cesium.Color.fromCssColorString('#e2e8f0').withAlpha(0.9),
        outlineColor: Cesium.Color.fromCssColorString('#05080f'),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(12, 0),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        id: { satId: rec.id },
        distanceDisplayCondition: isSelected
          ? undefined
          : new Cesium.DistanceDisplayCondition(0, 32000000),
      });

      this.satPrimitives.set(rec.id, {
        billboard,
        label,
        record: rec,
        color,
        defaultShowLabel: showLabel,
      });
    }
  }

  setSelected(satId) {
    const prev = this.selectedId ? this.satPrimitives.get(this.selectedId) : null;
    if (prev) {
      prev.billboard.image = this.getSprite(prev.color, false);
      prev.billboard.scale = 0.62;
      prev.label.show = prev.billboard.show && prev.defaultShowLabel;
      prev.label.font = '500 10.5px Inter, "Noto Sans KR", sans-serif';
      prev.label.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(0, 32000000);
    }

    this.selectedId = satId;
    this.lastFollowTarget = null;
    this.lastOverlayColor = '';

    if (!satId) {
      this.clearSelectionOverlays();
      return;
    }

    const next = this.satPrimitives.get(satId);
    if (next) {
      next.billboard.image = this.getSprite(next.color, true);
      next.billboard.scale = 0.78;
      next.label.show = next.billboard.show;
      next.label.font = '700 12px Inter, "Noto Sans KR", sans-serif';
      next.label.distanceDisplayCondition = undefined;
    }
  }

  setHovered(satId) {
    const prev = this.hoveredId ? this.satPrimitives.get(this.hoveredId) : null;
    if (prev && this.hoveredId !== this.selectedId) {
      prev.billboard.scale = 0.62;
      prev.label.show = prev.billboard.show && prev.defaultShowLabel;
    }
    this.hoveredId = satId;
    const next = satId ? this.satPrimitives.get(satId) : null;
    if (next && satId !== this.selectedId) {
      next.billboard.scale = 0.8;
      next.label.show = next.billboard.show;
    }
  }

  clearSelectionOverlays() {
    if (this.pastOrbitLine) this.pastOrbitLine.show = false;
    if (this.futureOrbitLine) this.futureOrbitLine.show = false;
    if (this.nadirLine) this.nadirLine.show = false;
    if (this.footprintLine) this.footprintLine.show = false;
    if (this.subSatPoint) this.subSatPoint.show = false;
    if (this.losLine) this.losLine.show = false;
  }

  setOrbitVisible(visible) {
    this.showOrbit = visible;
    if (!visible) {
      if (this.pastOrbitLine) this.pastOrbitLine.show = false;
      if (this.futureOrbitLine) this.futureOrbitLine.show = false;
    }
  }

  setFootprintVisible(visible) {
    this.showFootprint = visible;
    if (!visible) {
      if (this.footprintLine) this.footprintLine.show = false;
      if (this.nadirLine) this.nadirLine.show = false;
      if (this.subSatPoint) this.subSatPoint.show = false;
    }
  }

  setFollowMode(enabled) {
    this.followMode = enabled;
    this.lastFollowTarget = null;
  }

  updateOrbitTrack(track, colorHex) {
    if (!this.viewer || !track || !this.pastOrbitLine || !this.futureOrbitLine) return;
    const color = Cesium.Color.fromCssColorString(colorHex || '#38bdf8');

    const pastPositions = track.past
      .map((p) => safeCartesianFromDegrees(p.lon, p.lat, p.altMeters))
      .filter(Boolean);
    const futurePositions = track.future
      .map((p) => safeCartesianFromDegrees(p.lon, p.lat, p.altMeters))
      .filter(Boolean);

    if (pastPositions.length > 1) {
      this.pastOrbitLine.positions = pastPositions;
      this.pastOrbitLine.show = this.showOrbit;
    } else {
      this.pastOrbitLine.show = false;
    }

    if (futurePositions.length > 1) {
      this.futureOrbitLine.positions = futurePositions;
      this.futureOrbitLine.material.uniforms.color = color.withAlpha(0.92);
      this.futureOrbitLine.show = this.showOrbit;
    } else {
      this.futureOrbitLine.show = false;
    }
  }

  /**
   * Update all satellite positions in 3D space (called at 60fps).
   */
  updatePositions(simDate, positionsMap, selectedLook) {
    if (!this.viewer) return;

    this.viewer.clock.currentTime = Cesium.JulianDate.fromDate(simDate);

    for (const [id, entry] of this.satPrimitives.entries()) {
      const pos = positionsMap.get(id);
      const cartesian = pos ? safeCartesianFromDegrees(pos.lon, pos.lat, pos.altMeters) : null;
      if (!cartesian) {
        entry.billboard.show = false;
        entry.label.show = false;
        continue;
      }

      entry.billboard.show = true;
      entry.billboard.position = cartesian;
      entry.label.position = cartesian;
      entry.label.show =
        id === this.selectedId || id === this.hoveredId || entry.defaultShowLabel;

      if (id === this.selectedId) {
        this.lastSelectedPosition = { pos, cartesian };
        this.updateSelectedOverlays(pos, cartesian, entry.color, selectedLook);
      }
    }

    if (this.followMode && this.selectedId && this.lastSelectedPosition) {
      const currentTarget = this.lastSelectedPosition.cartesian;
      if (this.lastFollowTarget) {
        const delta = Cesium.Cartesian3.subtract(
          currentTarget,
          this.lastFollowTarget,
          new Cesium.Cartesian3()
        );
        this.viewer.camera.position = Cesium.Cartesian3.add(
          this.viewer.camera.position,
          delta,
          new Cesium.Cartesian3()
        );
      }
      this.lastFollowTarget = Cesium.Cartesian3.clone(currentTarget);
    }
  }

  updateSelectedOverlays(pos, satCartesian, colorHex, selectedLook) {
    const groundCartesian = safeCartesianFromDegrees(pos.lon, pos.lat, 500);
    if (!groundCartesian) return;

    if (this.lastOverlayColor !== colorHex) {
      const color = Cesium.Color.fromCssColorString(colorHex || '#38bdf8');
      this.nadirLine.material.uniforms.color = color.withAlpha(0.75);
      this.footprintLine.material.uniforms.color = color.withAlpha(0.68);
      this.subSatPoint.color = color;
      this.lastOverlayColor = colorHex;
    }

    if (this.showFootprint) {
      this.nadirLine.positions = [satCartesian, groundCartesian];
      this.nadirLine.show = true;

      this.subSatPoint.position = groundCartesian;
      this.subSatPoint.show = true;

      const circlePts = buildFootprintCirclePositions(pos.lat, pos.lon, pos.footprintRadiusMeters, 96);
      if (circlePts.length > 2) {
        this.footprintLine.positions = circlePts;
        this.footprintLine.show = true;
      } else {
        this.footprintLine.show = false;
      }
    } else {
      this.nadirLine.show = false;
      this.subSatPoint.show = false;
      this.footprintLine.show = false;
    }

    if (this.observer && selectedLook && selectedLook.visible) {
      const obsCartesian = safeCartesianFromDegrees(
        this.observer.lon,
        this.observer.lat,
        (this.observer.heightKm || 0) * 1000 + 200
      );
      if (obsCartesian) {
        this.losLine.positions = [obsCartesian, satCartesian];
        this.losLine.show = true;
      }
    } else {
      this.losLine.show = false;
    }
  }

  flyToSatellite(pos, duration = 1.4) {
    if (!this.viewer || !pos) return;
    const viewAltitude = Math.min(Math.max(pos.altMeters * 4.5, 4200000), 65000000);
    const dest = safeCartesianFromDegrees(pos.lon, pos.lat, viewAltitude);
    if (!dest) return;
    this.viewer.camera.flyTo({
      destination: dest,
      duration,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }

  flyToObserver(observer, duration = 1.2) {
    if (!this.viewer || !observer) return;
    const dest = safeCartesianFromDegrees(observer.lon, observer.lat, 3800000);
    if (!dest) return;
    this.viewer.camera.flyTo({
      destination: dest,
      duration,
    });
  }

  resetView() {
    if (!this.viewer) return;
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(127.0, 32.0, 15500000),
      duration: 1.2,
    });
  }

  show() {
    this.container.style.display = 'block';
    this.viewer?.resize();
  }

  hide() {
    this.container.style.display = 'none';
  }

  destroy() {
    if (this.eventHandler) {
      this.eventHandler.destroy();
      this.eventHandler = null;
    }
    if (this.viewer && !this.viewer.isDestroyed()) {
      this.viewer.destroy();
    }
    this.viewer = null;
  }
}
