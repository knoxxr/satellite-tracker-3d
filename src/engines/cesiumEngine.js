import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import {
  getCategoryColor,
  getObserverShortName,
  getSatelliteDisplayInfo,
  getSatelliteModelMeta,
} from '../orbital/catalog.js';
import { getLang, t } from '../ui/i18n.js';

const BASE_URL = import.meta.env.BASE_URL || '/';
const CESIUM_ASSETS_URL = `${BASE_URL}cesium/`;
const MODELS_BASE_URL = `${BASE_URL}models/`;
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
    label: 'Google Hybrid',
    create: () =>
      new Cesium.UrlTemplateImageryProvider({
        url: `https://mt{s}.google.com/vt/lyrs=y&hl=${getLang()}&x={x}&y={y}&z={z}`,
        subdomains: ['0', '1', '2', '3'],
        maximumLevel: 20,
        credit: new Cesium.Credit('Map data © Google'),
      }),
  },
  'google-satellite': {
    label: 'Google Satellite',
    create: () =>
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        subdomains: ['0', '1', '2', '3'],
        maximumLevel: 20,
        credit: new Cesium.Credit('Imagery © Google'),
      }),
  },
  'esri-imagery': {
    label: 'Esri Satellite',
    create: () =>
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 18,
        credit: new Cesium.Credit('Imagery © Esri, Earthstar Geographics'),
      }),
  },
  dark: {
    label: 'Dark Vector',
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

/**
 * Build a right-handed 4x4 LVLH (Local Vertical Local Horizontal) ECEF modelMatrix:
 *   +X = Orbital forward velocity (tangent to orbit; falls back to East for GEO)
 *   +Y = Orbital normal (left / port)
 *   +Z = Zenith (radial away from Earth -> maps to glTF +Y; so glTF -Y points Nadir at Earth!)
 */
function computeLvlhModelMatrix(satCartesian, velEcfKmS) {
  const up = Cesium.Cartesian3.normalize(satCartesian, new Cesium.Cartesian3());
  let forward = null;

  if (velEcfKmS) {
    const rawVel = new Cesium.Cartesian3(velEcfKmS.x, velEcfKmS.y, velEcfKmS.z);
    const radialComponent = Cesium.Cartesian3.dot(rawVel, up);
    const tangent = Cesium.Cartesian3.subtract(
      rawVel,
      Cesium.Cartesian3.multiplyByScalar(up, radialComponent, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );
    if (Cesium.Cartesian3.magnitude(tangent) > 1e-4) {
      forward = Cesium.Cartesian3.normalize(tangent, tangent);
    }
  }

  // Fallback for geostationary satellites whose ECEF velocity is near zero: align forward to local East
  if (!forward) {
    const east = Cesium.Cartesian3.cross(Cesium.Cartesian3.UNIT_Z, up, new Cesium.Cartesian3());
    if (Cesium.Cartesian3.magnitude(east) > 1e-4) {
      forward = Cesium.Cartesian3.normalize(east, east);
    } else {
      forward = Cesium.Cartesian3.clone(Cesium.Cartesian3.UNIT_X);
    }
  }

  const left = Cesium.Cartesian3.normalize(
    Cesium.Cartesian3.cross(up, forward, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );

  // Re-orthogonalize forward = left x up
  Cesium.Cartesian3.normalize(
    Cesium.Cartesian3.cross(left, up, forward),
    forward
  );

  const rot = new Cesium.Matrix3(
    forward.x, left.x, up.x,
    forward.y, left.y, up.y,
    forward.z, left.z, up.z
  );

  return Cesium.Matrix4.fromRotationTranslation(rot, satCartesian, new Cesium.Matrix4());
}

export class CesiumSatelliteEngine {
  constructor(container, { onSelect, onHover, onModelStateChange, onModelLoadingChange }) {
    this.container = container;
    this.onSelect = onSelect;
    this.onHover = onHover;
    this.onModelStateChange = onModelStateChange;
    this.onModelLoadingChange = onModelLoadingChange;
    this.viewer = null;
    this.billboards = null;
    this.satPoints = null;
    this.labels = null;
    this.polylines = null;
    this.groundPoints = null;
    this.observerLabels = null;

    this.spriteCache = new Map();
    this.colorCache = new Map();
    this.massRenderMode = false;
    this.selectedBillboard = null;
    this.selectedLabel = null;
    this.hoveredLabel = null;
    this.satPrimitives = new Map(); // id -> { point?, billboard?, label?, record, color, defaultShowLabel }
    this.modelCache = new Map(); // archetypeKey -> { model, meta }
    this.modelLoadPromises = new Map(); // archetypeKey -> Promise
    this.activeModelKey = null;
    this.activeModelMeta = null;
    this.is3dModelVisible = false;
    this.closeupOrbitLocked = false;
    this.googleTileset = null;
    this.google3dEnabled = false;
    this.currentBasemap = 'google-hybrid';
    this.selectedId = null;
    this.hoveredId = null;
    this.followMode = false;
    this.showOrbit = true;
    this.showFootprint = true;
    this.showAttitudeVectors = true;
    this.enableLighting = false;
    this.observer = null;

    // Primitive references for synchronous 60fps overlays
    this.pastOrbitLine = null;
    this.futureOrbitLine = null;
    this.nadirLine = null;
    this.footprintLine = null;
    this.losLine = null;
    this.velocityVectorLine = null;
    this.nadirVectorLine = null;
    this.velocityLabel = null;
    this.nadirLabel = null;
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

    // Dedicated aerospace key-light so 3D spacecraft models (including NASA CAD) are always vividly shaded
    this.spacecraftLight = new Cesium.DirectionalLight({
      direction: new Cesium.Cartesian3(0.5, 0.5, -0.7),
      intensity: 2.6,
    });
    scene.light = this.spacecraftLight;
    scene.preRender.addEventListener(() => {
      if (!this.viewer || this.viewer.isDestroyed()) return;
      if (!this.enableLighting && this.spacecraftLight) {
        // Offset key light ~30 deg up-right of camera view for crisp 3D depth shading
        const cam = this.viewer.camera;
        const dir = Cesium.Cartesian3.clone(cam.directionWC, new Cesium.Cartesian3());
        Cesium.Cartesian3.add(
          dir,
          Cesium.Cartesian3.multiplyByScalar(cam.rightWC, -0.45, new Cesium.Cartesian3()),
          dir
        );
        Cesium.Cartesian3.add(
          dir,
          Cesium.Cartesian3.multiplyByScalar(cam.upWC, -0.35, new Cesium.Cartesian3()),
          dir
        );
        if (Cesium.Cartesian3.magnitude(dir) > 1e-4) {
          this.spacecraftLight.direction = Cesium.Cartesian3.normalize(dir, dir);
        }
      }
    });

    if (this.viewer.cesiumWidget.creditContainer) {
      this.viewer.cesiumWidget.creditContainer.classList.add('cesium-credit-minimal');
    }

    // Cap effective pixel ratio to 2x on ultra-high-DPR mobile devices for smooth 60fps interaction
    if (typeof window !== 'undefined' && window.devicePixelRatio > 2) {
      this.viewer.resolutionScale = 2 / window.devicePixelRatio;
    }

    this.setBasemap(this.currentBasemap);

    // Pure GPU Primitive collections (zero Entity WebWorker async crashes; scales to 20,000+ satellites at 60fps)
    this.polylines = scene.primitives.add(new Cesium.PolylineCollection());
    this.groundPoints = scene.primitives.add(new Cesium.PointPrimitiveCollection());
    this.satPoints = scene.primitives.add(new Cesium.PointPrimitiveCollection());
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
      text: 'Seoul',
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

    // Closeup 3D Attitude Guides: Velocity (+Forward) and Nadir (Earthward)
    this.velocityVectorLine = this.polylines.add({
      show: false,
      positions: [DEFAULT_ORBIT_POS, DEFAULT_SURFACE_POS],
      width: 6,
      material: Cesium.Material.fromType('PolylineArrow', {
        color: Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.95),
      }),
    });

    this.nadirVectorLine = this.polylines.add({
      show: false,
      positions: [DEFAULT_ORBIT_POS, DEFAULT_SURFACE_POS],
      width: 5,
      material: Cesium.Material.fromType('PolylineArrow', {
        color: Cesium.Color.fromCssColorString('#f59e0b').withAlpha(0.92),
      }),
    });

    this.velocityLabel = this.observerLabels.add({
      show: false,
      position: DEFAULT_ORBIT_POS,
      text: t('vecVelocity'),
      font: '600 10.5px Inter, "Noto Sans KR", sans-serif',
      fillColor: Cesium.Color.fromCssColorString('#bae6fd'),
      outlineColor: Cesium.Color.fromCssColorString('#05080f'),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -10),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    });

    this.nadirLabel = this.observerLabels.add({
      show: false,
      position: DEFAULT_ORBIT_POS,
      text: t('vecNadir'),
      font: '600 10.5px Inter, "Noto Sans KR", sans-serif',
      fillColor: Cesium.Color.fromCssColorString('#fde68a'),
      outlineColor: Cesium.Color.fromCssColorString('#05080f'),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, 12),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.TOP,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    });
  }

  setupInputHandlers() {
    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.eventHandler = handler;
    const isCoarsePointer =
      typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches;

    const findSatIdAt = (pos, allowWidePick = false) => {
      const direct = this.viewer.scene.pick(pos);
      if (Cesium.defined(direct) && direct.id && typeof direct.id === 'object' && direct.id.satId) {
        return direct.id.satId;
      }
      if (allowWidePick) {
        const candidates = this.viewer.scene.drillPick(pos, 8, 28, 28);
        for (const item of candidates) {
          if (Cesium.defined(item) && item.id && typeof item.id === 'object' && item.id.satId) {
            return item.id.satId;
          }
        }
      }
      return null;
    };

    handler.setInputAction((movement) => {
      const satId = findSatIdAt(movement.position, true);
      if (satId !== null) {
        this.onSelect?.(satId);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    if (!isCoarsePointer) {
      handler.setInputAction((movement) => {
        const satId = findSatIdAt(movement.endPosition, false);
        if (satId !== null) {
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
      return { ok: false, error: t('errApiKeyRequired') };
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
        error: t('errTilesFail', { msg: err.message || 'Check Map Tiles API & API key.' }),
      };
    }
  }

  setLighting(enabled) {
    this.enableLighting = enabled;
    if (this.viewer) {
      const globe = this.viewer.scene.globe;
      globe.enableLighting = enabled;
      globe.dynamicAtmosphereLighting = enabled;
      globe.dynamicAtmosphereLightingFromSun = enabled;
      // Keep nighttime continents subtly legible instead of crushing to pitch black
      globe.nightFadeInDistance = 75000000;
      globe.nightFadeOutDistance = 14000000;
      this.viewer.scene.light = enabled ? new Cesium.SunLight({ intensity: 2.8 }) : this.spacecraftLight;
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
    this.observerLabel.text = getObserverShortName(observer, getLang());
    this.observerLabel.show = true;
  }

  refreshLanguageLabels() {
    const lang = getLang();
    if (this.velocityLabel) this.velocityLabel.text = t('vecVelocity');
    if (this.nadirLabel) this.nadirLabel.text = t('vecNadir');
    if (this.observer && this.observerLabel) {
      this.observerLabel.text = getObserverShortName(this.observer, lang);
    }
    for (const entry of this.satPrimitives.values()) {
      const info = getSatelliteDisplayInfo(entry.record.id, entry.record.name, lang);
      const shortTitle = info.isNotable ? info.title.split(' (')[0] : entry.record.name;
      entry.titleShort = shortTitle;
      if (entry.label) entry.label.text = shortTitle;
    }
    if (this.selectedId && this.selectedLabel && this.satPrimitives.has(this.selectedId)) {
      this.selectedLabel.text = this.satPrimitives.get(this.selectedId).titleShort;
    }
    if (!this.google3dEnabled && this.currentBasemap === 'google-hybrid') {
      this.setBasemap('google-hybrid');
    }
  }

  getCachedColor(hexColor, alpha = 0.9) {
    const key = `${hexColor}:${alpha}`;
    if (!this.colorCache.has(key)) {
      this.colorCache.set(key, Cesium.Color.fromCssColorString(hexColor || '#38bdf8').withAlpha(alpha));
    }
    return this.colorCache.get(key);
  }

  setSatellites(records) {
    if (!this.billboards || !this.labels || !this.satPoints) return;
    this.satPoints.removeAll();
    this.billboards.removeAll();
    this.labels.removeAll();
    this.satPrimitives.clear();
    this.selectedBillboard = null;
    this.selectedLabel = null;
    this.hoveredLabel = null;

    const lang = getLang();
    this.massRenderMode = records.length > 500;
    const showLabelsByDefault = records.length <= 45;
    const outlineDark = Cesium.Color.fromCssColorString('#05080f');

    if (this.massRenderMode) {
      // Dedicated glowing highlight markers for selected & hovered spacecraft
      this.selectedBillboard = this.billboards.add({
        show: false,
        position: DEFAULT_ORBIT_POS,
        image: this.getSprite('#38bdf8', true),
        scale: 0.82,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
      this.selectedLabel = this.labels.add({
        show: false,
        position: DEFAULT_ORBIT_POS,
        text: '',
        font: '700 12px Inter, "Noto Sans KR", sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: outlineDark,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(14, 0),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
      this.hoveredLabel = this.labels.add({
        show: false,
        position: DEFAULT_ORBIT_POS,
        text: '',
        font: '600 11px Inter, "Noto Sans KR", sans-serif',
        fillColor: Cesium.Color.fromCssColorString('#e0f2fe'),
        outlineColor: outlineDark,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(10, 0),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });

      for (const rec of records) {
        const color = getCategoryColor(rec.group);
        const info = getSatelliteDisplayInfo(rec.id, rec.name, lang);
        const point = this.satPoints.add({
          show: false,
          position: DEFAULT_ORBIT_POS,
          pixelSize: info.isNotable ? 6.2 : rec.group === 'starlink' ? 2.8 : 3.5,
          color: this.getCachedColor(color, info.isNotable ? 1.0 : rec.group === 'starlink' ? 0.72 : 0.88),
          outlineColor: info.isNotable ? Cesium.Color.WHITE : Cesium.Color.TRANSPARENT,
          outlineWidth: info.isNotable ? 1.4 : 0,
          id: { satId: rec.id },
        });

        let label = null;
        if (info.isNotable) {
          label = this.labels.add({
            show: false,
            position: DEFAULT_ORBIT_POS,
            text: info.title.split(' (')[0],
            font: '600 10.5px Inter, "Noto Sans KR", sans-serif',
            fillColor: Cesium.Color.fromCssColorString('#f1f5f9').withAlpha(0.92),
            outlineColor: outlineDark,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(9, 0),
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            id: { satId: rec.id },
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 28000000),
          });
        }

        this.satPrimitives.set(rec.id, {
          point,
          billboard: null,
          label,
          record: rec,
          color,
          titleShort: info.isNotable ? info.title.split(' (')[0] : rec.name,
          defaultShowLabel: info.isNotable,
        });
      }
      return;
    }

    // Small-batch mode (<= 500 satellites): lush radial-glow billboards + labels
    for (const rec of records) {
      const color = getCategoryColor(rec.group);
      const isSelected = rec.id === this.selectedId;
      const info = getSatelliteDisplayInfo(rec.id, rec.name, lang);

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
        outlineColor: outlineDark,
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
        point: null,
        billboard,
        label,
        record: rec,
        color,
        titleShort: info.isNotable ? info.title.split(' (')[0] : rec.name,
        defaultShowLabel: showLabel,
      });
    }
  }

  setSelected(satId) {
    const prev = this.selectedId ? this.satPrimitives.get(this.selectedId) : null;
    if (prev && !this.massRenderMode && prev.billboard && prev.label) {
      prev.billboard.image = this.getSprite(prev.color, false);
      prev.billboard.scale = 0.62;
      prev.label.show = prev.billboard.show && prev.defaultShowLabel;
      prev.label.font = '500 10.5px Inter, "Noto Sans KR", sans-serif';
      prev.label.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(0, 32000000);
    }

    this.releaseCloseupCameraLock();
    this.hideAll3dModels();

    this.selectedId = satId;
    this.lastFollowTarget = null;
    this.lastOverlayColor = '';

    if (!satId) {
      this.activeModelKey = null;
      this.activeModelMeta = null;
      if (this.selectedBillboard) this.selectedBillboard.show = false;
      if (this.selectedLabel) this.selectedLabel.show = false;
      this.clearSelectionOverlays();
      return;
    }

    const next = this.satPrimitives.get(satId);
    if (next) {
      if (this.massRenderMode) {
        if (this.selectedBillboard) {
          this.selectedBillboard.image = this.getSprite(next.color, true);
          this.selectedBillboard.id = { satId: next.record.id };
        }
        if (this.selectedLabel) {
          this.selectedLabel.text = next.titleShort;
          this.selectedLabel.id = { satId: next.record.id };
        }
      } else if (next.billboard && next.label) {
        next.billboard.image = this.getSprite(next.color, true);
        next.billboard.scale = 0.78;
        next.label.show = next.billboard.show;
        next.label.font = '700 12px Inter, "Noto Sans KR", sans-serif';
        next.label.distanceDisplayCondition = undefined;
      }
      this.ensureSelectedModel(next.record);
    }
  }

  hideAll3dModels() {
    for (const entry of this.modelCache.values()) {
      if (entry.model && !entry.model.isDestroyed()) {
        entry.model.show = false;
      }
    }
    if (this.is3dModelVisible) {
      this.is3dModelVisible = false;
      this.onModelStateChange?.(false, null);
    }
  }

  async ensureSelectedModel(record) {
    if (!this.viewer || !record) return;
    const meta = getSatelliteModelMeta(record);
    this.activeModelKey = meta.key;
    this.activeModelMeta = meta;

    if (this.modelCache.has(meta.key)) {
      return;
    }

    if (this.modelLoadPromises.has(meta.key)) {
      await this.modelLoadPromises.get(meta.key);
      return;
    }

    const loadSingleGlb = async (fileRelPath) => {
      const url = `${MODELS_BASE_URL}${fileRelPath}`;
      const model = await Cesium.Model.fromGltfAsync({
        url,
        modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(DEFAULT_ORBIT_POS),
        scale: 1.0,
        minimumPixelSize: 96,
        maximumScale: 12000,
        upAxis: Cesium.Axis.Y,
        forwardAxis: Cesium.Axis.X,
        lightColor: new Cesium.Cartesian3(2.8, 2.8, 2.8),
        shadows: Cesium.ShadowMode.DISABLED,
        show: false,
      });

      if (!this.viewer || this.viewer.isDestroyed()) {
        if (!model.isDestroyed()) model.destroy();
        return null;
      }

      this.viewer.scene.primitives.add(model);
      return {
        model,
        meta,
        normalized: false,
        localNormalizeMatrix: Cesium.Matrix4.IDENTITY,
      };
    };

    const loadPromise = (async () => {
      this.onModelLoadingChange?.(true, meta);
      try {
        const entry = await loadSingleGlb(meta.file);
        if (entry) {
          this.modelCache.set(meta.key, entry);
        }
      } catch (err) {
        console.warn(`Primary 3D model failed (${meta.file}), falling back:`, err);
        if (meta.fallbackFile) {
          try {
            const fallbackEntry = await loadSingleGlb(meta.fallbackFile);
            if (fallbackEntry) {
              this.modelCache.set(meta.key, fallbackEntry);
            }
          } catch (fallbackErr) {
            console.warn(`Fallback 3D model failed (${meta.fallbackFile}):`, fallbackErr);
          }
        }
      } finally {
        this.modelLoadPromises.delete(meta.key);
        this.onModelLoadingChange?.(false, meta);
      }
    })();

    this.modelLoadPromises.set(meta.key, loadPromise);
    await loadPromise;
  }

  releaseCloseupCameraLock() {
    if (this.closeupOrbitLocked && this.viewer && !this.viewer.isDestroyed()) {
      this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    }
    this.closeupOrbitLocked = false;
  }

  setHovered(satId) {
    if (this.massRenderMode) {
      this.hoveredId = satId;
      if (!this.hoveredLabel) return;
      const next = satId ? this.satPrimitives.get(satId) : null;
      if (next && satId !== this.selectedId && next.point && next.point.show) {
        this.hoveredLabel.position = next.point.position;
        this.hoveredLabel.text = next.titleShort;
        this.hoveredLabel.show = true;
      } else {
        this.hoveredLabel.show = false;
      }
      return;
    }

    const prev = this.hoveredId ? this.satPrimitives.get(this.hoveredId) : null;
    if (prev && this.hoveredId !== this.selectedId && prev.billboard && prev.label) {
      prev.billboard.scale = 0.62;
      prev.label.show = prev.billboard.show && prev.defaultShowLabel;
    }
    this.hoveredId = satId;
    const next = satId ? this.satPrimitives.get(satId) : null;
    if (next && satId !== this.selectedId && next.billboard && next.label) {
      next.billboard.scale = 0.8;
      next.label.show = next.billboard.show;
    }
  }

  hideAttitudeVectors() {
    if (this.velocityVectorLine) this.velocityVectorLine.show = false;
    if (this.nadirVectorLine) this.nadirVectorLine.show = false;
    if (this.velocityLabel) this.velocityLabel.show = false;
    if (this.nadirLabel) this.nadirLabel.show = false;
  }

  clearSelectionOverlays() {
    this.hideAll3dModels();
    this.hideAttitudeVectors();
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

  setAttitudeVectorsVisible(visible) {
    this.showAttitudeVectors = visible;
    if (!visible) {
      this.hideAttitudeVectors();
    }
  }

  setFollowMode(enabled) {
    this.followMode = enabled;
    this.lastFollowTarget = null;
    if (!enabled) {
      this.releaseCloseupCameraLock();
    }
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
   * Update satellite positions in 3D space (called at 60fps; supports time-sliced updatedIds for 20k+ sats).
   */
  updatePositions(simDate, positionsMap, selectedLook, updatedIds = null) {
    if (!this.viewer) return;

    this.viewer.clock.currentTime = Cesium.JulianDate.fromDate(simDate);
    const cameraPosWC = this.viewer.camera.positionWC;

    const updateOne = (id, entry) => {
      const pos = positionsMap.get(id);
      const cartesian = pos ? safeCartesianFromDegrees(pos.lon, pos.lat, pos.altMeters) : null;

      if (this.massRenderMode) {
        if (!cartesian) {
          if (entry.point) entry.point.show = false;
          if (entry.label) entry.label.show = false;
          return;
        }
        if (entry.point) {
          entry.point.position = cartesian;
          entry.point.show = id !== this.selectedId;
        }
        if (entry.label) {
          entry.label.position = cartesian;
          entry.label.show = id !== this.selectedId && entry.defaultShowLabel;
        }
        if (id === this.selectedId) {
          this.lastSelectedPosition = { pos, cartesian, record: entry.record };
          this.updateSelectedOverlays(pos, cartesian, entry.color, selectedLook);
          const showing3d = this.updateSelected3dModel(pos, cartesian, cameraPosWC);
          if (this.selectedBillboard) {
            this.selectedBillboard.position = cartesian;
            this.selectedBillboard.show = !showing3d;
          }
          if (this.selectedLabel) {
            this.selectedLabel.position = cartesian;
            this.selectedLabel.show = !this.closeupOrbitLocked;
          }
        }
        if (id === this.hoveredId && id !== this.selectedId && this.hoveredLabel) {
          this.hoveredLabel.position = cartesian;
          this.hoveredLabel.text = entry.titleShort;
          this.hoveredLabel.show = true;
        }
        return;
      }

      // Small-batch billboard mode
      if (!cartesian) {
        entry.billboard.show = false;
        entry.label.show = false;
        return;
      }

      entry.billboard.position = cartesian;
      entry.label.position = cartesian;

      if (id === this.selectedId) {
        this.lastSelectedPosition = { pos, cartesian, record: entry.record };
        this.updateSelectedOverlays(pos, cartesian, entry.color, selectedLook);
        const showing3d = this.updateSelected3dModel(pos, cartesian, cameraPosWC);
        entry.billboard.show = !showing3d;
        entry.label.show = !this.closeupOrbitLocked;
      } else {
        entry.billboard.show = true;
        entry.label.show = id === this.hoveredId || entry.defaultShowLabel;
      }
    };

    if (updatedIds) {
      for (const id of updatedIds) {
        const entry = this.satPrimitives.get(id);
        if (entry) updateOne(id, entry);
      }
      if (this.selectedId && !updatedIds.has(this.selectedId)) {
        const selEntry = this.satPrimitives.get(this.selectedId);
        if (selEntry) updateOne(this.selectedId, selEntry);
      }
    } else {
      for (const [id, entry] of this.satPrimitives.entries()) {
        updateOne(id, entry);
      }
    }

    if (this.selectedId && this.lastSelectedPosition) {
      const currentTarget = this.lastSelectedPosition.cartesian;
      if (this.closeupOrbitLocked) {
        // Keep local 360-degree camera orbit centered on the moving spacecraft
        const cam = this.viewer.camera;
        const localPos = Cesium.Cartesian3.clone(cam.position);
        const localDir = Cesium.Cartesian3.clone(cam.direction);
        const localUp = Cesium.Cartesian3.clone(cam.up);
        const localRight = Cesium.Cartesian3.clone(cam.right);

        const localDist = Cesium.Cartesian3.magnitude(localPos);
        const releaseLimit = (this.activeModelMeta?.lodDistanceM || 3200000) * 1.4;
        if (localDist > releaseLimit) {
          this.releaseCloseupCameraLock();
        } else {
          const nextTransform = Cesium.Transforms.eastNorthUpToFixedFrame(currentTarget);
          cam.lookAtTransform(nextTransform);
          cam.position = localPos;
          cam.direction = localDir;
          cam.up = localUp;
          cam.right = localRight;
        }
      } else if (this.followMode) {
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
  }

  updateSelected3dModel(pos, satCartesian, cameraPosWC) {
    if (!this.activeModelKey || !this.activeModelMeta) return false;
    const cached = this.modelCache.get(this.activeModelKey);
    if (!cached || !cached.model || cached.model.isDestroyed()) return false;

    const camDist = Cesium.Cartesian3.distance(cameraPosWC, satCartesian);
    const shouldShow = this.closeupOrbitLocked || camDist < this.activeModelMeta.lodDistanceM;

    if (shouldShow) {
      const lvlh = computeLvlhModelMatrix(satCartesian, pos.velEcfKmS);

      // On the very first frame the model finishes Draco/Meshopt decoding, compute exact local centering + scale
      if (!cached.normalized && cached.model.ready) {
        const bs = cached.model.boundingSphere;
        const rawRadius = bs?.radius;
        if (Number.isFinite(rawRadius) && rawRadius > 0.0001) {
          const invCur = Cesium.Matrix4.inverse(cached.model.modelMatrix, new Cesium.Matrix4());
          const localCenter = Cesium.Matrix4.multiplyByPoint(invCur, bs.center, new Cesium.Cartesian3());
          const targetR = cached.meta.targetRadiusM || 28;
          const s = targetR / rawRadius;
          const negCenter = Cesium.Cartesian3.negate(localCenter, new Cesium.Cartesian3());
          const tMat = Cesium.Matrix4.fromTranslation(negCenter, new Cesium.Matrix4());
          const sMat = Cesium.Matrix4.fromUniformScale(s, new Cesium.Matrix4());
          cached.localNormalizeMatrix = Cesium.Matrix4.multiply(sMat, tMat, new Cesium.Matrix4());
        }
        cached.normalized = true;
      }

      cached.model.modelMatrix = cached.normalized
        ? Cesium.Matrix4.multiply(lvlh, cached.localNormalizeMatrix, new Cesium.Matrix4())
        : lvlh;
      cached.model.show = true;

      for (const [k, entry] of this.modelCache.entries()) {
        if (k !== this.activeModelKey && entry.model && !entry.model.isDestroyed()) {
          entry.model.show = false;
        }
      }

      // Render 3D velocity & nadir attitude guide arrows when zoomed in close to the spacecraft
      const showGuides =
        this.showAttitudeVectors &&
        cached.model.ready &&
        (this.closeupOrbitLocked || camDist < (cached.meta.closeupDistanceM || 260) * 4);
      if (showGuides && this.velocityVectorLine && this.nadirVectorLine) {
        const radius = cached.meta.targetRadiusM || 28;
        const vecLen = Math.max(radius * 2.1, 35);
        // Extract forward (+X) and zenith (+Z) columns from LVLH matrix
        const fwd = new Cesium.Cartesian3(lvlh[0], lvlh[1], lvlh[2]);
        const up = new Cesium.Cartesian3(lvlh[8], lvlh[9], lvlh[10]);
        const velTip = Cesium.Cartesian3.add(
          satCartesian,
          Cesium.Cartesian3.multiplyByScalar(fwd, vecLen, new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        );
        const nadirTip = Cesium.Cartesian3.add(
          satCartesian,
          Cesium.Cartesian3.multiplyByScalar(up, -vecLen * 0.85, new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        );
        this.velocityVectorLine.positions = [satCartesian, velTip];
        this.velocityVectorLine.show = true;
        this.nadirVectorLine.positions = [satCartesian, nadirTip];
        this.nadirVectorLine.show = true;
        if (this.velocityLabel) {
          this.velocityLabel.position = velTip;
          this.velocityLabel.show = true;
        }
        if (this.nadirLabel) {
          this.nadirLabel.position = nadirTip;
          this.nadirLabel.show = true;
        }
      } else {
        this.hideAttitudeVectors();
      }
    } else {
      cached.model.show = false;
      this.hideAttitudeVectors();
    }

    const isReadyAndVisible = shouldShow && cached.model.ready;
    if (this.is3dModelVisible !== isReadyAndVisible) {
      this.is3dModelVisible = isReadyAndVisible;
      this.onModelStateChange?.(isReadyAndVisible, this.activeModelMeta);
    }

    return isReadyAndVisible;
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
    this.releaseCloseupCameraLock();
    const viewAltitude = Math.min(Math.max(pos.altMeters * 4.5, 4200000), 65000000);
    const dest = safeCartesianFromDegrees(pos.lon, pos.lat, viewAltitude);
    if (!dest) return;
    this.viewer.camera.flyTo({
      destination: dest,
      duration,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }

  /**
   * Fly right alongside the selected satellite to inspect its real-time 3D PBR spacecraft model
   * against the curved 3D Earth, locking 360-degree camera orbit around the spacecraft.
   */
  async flyToCloseup(pos, record) {
    if (!this.viewer || !pos || !record) return;
    const satCartesian = safeCartesianFromDegrees(pos.lon, pos.lat, pos.altMeters);
    if (!satCartesian) return;

    await this.ensureSelectedModel(record);
    const meta = getSatelliteModelMeta(record);

    const transform = Cesium.Transforms.eastNorthUpToFixedFrame(satCartesian);
    const range = meta.closeupDistanceM || 260;
    const heading = Cesium.Math.toRadians(38);
    const pitch = Cesium.Math.toRadians(-24);

    this.closeupOrbitLocked = true;
    this.followMode = true;
    this.lastFollowTarget = Cesium.Cartesian3.clone(satCartesian);

    this.viewer.camera.lookAtTransform(
      transform,
      new Cesium.HeadingPitchRange(heading, pitch, range)
    );
  }

  flyToObserver(observer, duration = 1.2) {
    if (!this.viewer || !observer) return;
    this.releaseCloseupCameraLock();
    const dest = safeCartesianFromDegrees(observer.lon, observer.lat, 3800000);
    if (!dest) return;
    this.viewer.camera.flyTo({
      destination: dest,
      duration,
    });
  }

  resetView() {
    if (!this.viewer) return;
    this.releaseCloseupCameraLock();
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
    this.releaseCloseupCameraLock();
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
