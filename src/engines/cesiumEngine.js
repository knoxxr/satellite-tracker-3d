import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { getCategoryColor, getSatelliteDisplayInfo } from '../orbital/catalog.js';

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

function createSatelliteSprite(hexColor, selected = false) {
  const size = selected ? 64 : 36;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  if (selected) {
    // Outer precision reticle ring
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.strokeStyle = hexColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.85;
    ctx.stroke();

    // Soft halo
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22);
    grad.addColorStop(0, hexColor);
    grad.addColorStop(0.5, hexColor + '55');
    grad.addColorStop(1, hexColor + '00');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();

    // Crisp satellite core diamond
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = hexColor;
    ctx.stroke();
  } else {
    // Soft halo
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 14);
    grad.addColorStop(0, hexColor);
    grad.addColorStop(0.45, hexColor + '70');
    grad.addColorStop(1, hexColor + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    // Crisp bright center dot
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
    this.spriteCache = new Map();
    this.satPrimitives = new Map(); // id -> { billboard, label, record, color }
    this.googleTileset = null;
    this.google3dEnabled = false;
    this.currentBasemap = 'google-hybrid';
    this.selectedId = null;
    this.hoveredId = null;
    this.followMode = false;
    this.showOrbit = true;
    this.showFootprint = true;
    this.enableLighting = true;
    this.observer = null;

    // Dedicated overlay entities for selected satellite & observer
    this.pastOrbitEntity = null;
    this.futureOrbitEntity = null;
    this.nadirLineEntity = null;
    this.subSatPointEntity = null;
    this.footprintEntity = null;
    this.observerEntity = null;
    this.losLineEntity = null;

    this.lastSelectedPosition = null;
    this.lastFollowTarget = null;
  }

  init() {
    // Prevent default Cesium Ion warning banner when running zero-key mode
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

    // Keep credit attribution visible and unobtrusive
    if (this.viewer.cesiumWidget.creditContainer) {
      this.viewer.cesiumWidget.creditContainer.classList.add('cesium-credit-minimal');
    }

    this.setBasemap(this.currentBasemap);

    // High-performance primitives for hundreds/thousands of satellites
    this.billboards = scene.primitives.add(new Cesium.BillboardCollection());
    this.labels = scene.primitives.add(new Cesium.LabelCollection());

    // Initial view framed nicely over East Asia / Korean Peninsula
    this.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(127.0, 32.0, 15500000),
    });

    this.setupOverlayEntities();
    this.setupInputHandlers();
  }

  setupOverlayEntities() {
    const entities = this.viewer.entities;

    this.pastOrbitEntity = entities.add({
      show: false,
      polyline: {
        positions: [],
        width: 1.8,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.WHITE.withAlpha(0.35),
          dashLength: 10,
        }),
      },
    });

    this.futureOrbitEntity = entities.add({
      show: false,
      polyline: {
        positions: [],
        width: 2.6,
        material: Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.92),
      },
    });

    this.nadirLineEntity = entities.add({
      show: false,
      polyline: {
        positions: [],
        width: 1.5,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.75),
          dashLength: 8,
        }),
      },
    });

    this.subSatPointEntity = entities.add({
      show: false,
      position: Cesium.Cartesian3.ZERO,
      point: {
        pixelSize: 7,
        color: Cesium.Color.fromCssColorString('#38bdf8'),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1.5,
      },
    });

    this.footprintEntity = entities.add({
      show: false,
      position: Cesium.Cartesian3.ZERO,
      ellipse: {
        semiMajorAxis: 1000000,
        semiMinorAxis: 1000000,
        height: 2000,
        material: Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.11),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.65),
        outlineWidth: 1.5,
      },
    });

    this.observerEntity = entities.add({
      show: false,
      position: Cesium.Cartesian3.ZERO,
      point: {
        pixelSize: 9,
        color: Cesium.Color.fromCssColorString('#10b981'),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
      },
      label: {
        text: '서울 관측소',
        font: '600 11px Inter, "Noto Sans KR", sans-serif',
        fillColor: Cesium.Color.fromCssColorString('#d1fae5'),
        outlineColor: Cesium.Color.fromCssColorString('#05080f'),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -16),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    this.losLineEntity = entities.add({
      show: false,
      polyline: {
        positions: [],
        width: 2.0,
        material: Cesium.Color.fromCssColorString('#10b981').withAlpha(0.85),
      },
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
      // Hide underlying base globe so Google Photorealistic 3D Tiles render cleanly without z-fighting
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
    if (!this.observerEntity) return;
    if (!observer) {
      this.observerEntity.show = false;
      return;
    }
    this.observerEntity.show = true;
    this.observerEntity.position = Cesium.Cartesian3.fromDegrees(observer.lon, observer.lat, (observer.heightKm || 0) * 1000 + 200);
    this.observerEntity.label.text = observer.name.split(' ')[0];
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
        position: Cesium.Cartesian3.ZERO,
        image: this.getSprite(color, isSelected),
        scale: isSelected ? 0.72 : 0.62,
        id: { satId: rec.id },
        disableDepthTestDistance: 12000000,
      });

      const showLabel = isSelected || info.isNotable || (showLabelsByDefault && rec.group !== 'starlink');
      const label = this.labels.add({
        position: Cesium.Cartesian3.ZERO,
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
        show: showLabel,
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
      prev.label.show = prev.defaultShowLabel;
      prev.label.font = '500 10.5px Inter, "Noto Sans KR", sans-serif';
      prev.label.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(0, 32000000);
    }

    this.selectedId = satId;
    this.lastFollowTarget = null;

    if (!satId) {
      this.clearSelectionOverlays();
      return;
    }

    const next = this.satPrimitives.get(satId);
    if (next) {
      next.billboard.image = this.getSprite(next.color, true);
      next.billboard.scale = 0.78;
      next.label.show = true;
      next.label.font = '700 12px Inter, "Noto Sans KR", sans-serif';
      next.label.distanceDisplayCondition = undefined;
    }
  }

  setHovered(satId) {
    const prev = this.hoveredId ? this.satPrimitives.get(this.hoveredId) : null;
    if (prev && this.hoveredId !== this.selectedId) {
      prev.billboard.scale = 0.62;
      prev.label.show = prev.defaultShowLabel;
    }
    this.hoveredId = satId;
    const next = satId ? this.satPrimitives.get(satId) : null;
    if (next && satId !== this.selectedId) {
      next.billboard.scale = 0.8;
      next.label.show = true;
    }
  }

  clearSelectionOverlays() {
    this.pastOrbitEntity.show = false;
    this.futureOrbitEntity.show = false;
    this.nadirLineEntity.show = false;
    this.subSatPointEntity.show = false;
    this.footprintEntity.show = false;
    this.losLineEntity.show = false;
  }

  setOrbitVisible(visible) {
    this.showOrbit = visible;
    if (!visible) {
      this.pastOrbitEntity.show = false;
      this.futureOrbitEntity.show = false;
    }
  }

  setFootprintVisible(visible) {
    this.showFootprint = visible;
    if (!visible) {
      this.footprintEntity.show = false;
      this.nadirLineEntity.show = false;
      this.subSatPointEntity.show = false;
    }
  }

  setFollowMode(enabled) {
    this.followMode = enabled;
    this.lastFollowTarget = null;
  }

  updateOrbitTrack(track, colorHex) {
    if (!this.viewer || !track) return;
    const color = Cesium.Color.fromCssColorString(colorHex || '#38bdf8');

    const pastPositions = track.past.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.altMeters)
    );
    const futurePositions = track.future.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.altMeters)
    );

    this.pastOrbitEntity.polyline.positions = pastPositions;
    this.pastOrbitEntity.show = this.showOrbit && pastPositions.length > 1;

    this.futureOrbitEntity.polyline.positions = futurePositions;
    this.futureOrbitEntity.polyline.material = color.withAlpha(0.92);
    this.futureOrbitEntity.show = this.showOrbit && futurePositions.length > 1;
  }

  /**
   * Update all satellite positions in 3D space (called at 60fps).
   */
  updatePositions(simDate, positionsMap, selectedLook) {
    if (!this.viewer) return;

    // Sync Sun lighting position to current simulation time
    this.viewer.clock.currentTime = Cesium.JulianDate.fromDate(simDate);

    for (const [id, entry] of this.satPrimitives.entries()) {
      const pos = positionsMap.get(id);
      if (!pos) {
        entry.billboard.show = false;
        entry.label.show = false;
        continue;
      }

      const cartesian = Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.altMeters);
      entry.billboard.show = true;
      entry.billboard.position = cartesian;
      entry.label.position = cartesian;

      if (id === this.selectedId) {
        this.lastSelectedPosition = { pos, cartesian };
        this.updateSelectedOverlays(pos, cartesian, entry.color, selectedLook);
      }
    }

    // Smoothly track selected satellite when Camera Follow mode is active
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
    const color = Cesium.Color.fromCssColorString(colorHex || '#38bdf8');
    const groundCartesian = Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, 100);

    if (this.showFootprint) {
      this.nadirLineEntity.show = true;
      this.nadirLineEntity.polyline.positions = [satCartesian, groundCartesian];
      this.nadirLineEntity.polyline.material = new Cesium.PolylineDashMaterialProperty({
        color: color.withAlpha(0.75),
        dashLength: 8,
      });

      this.subSatPointEntity.show = true;
      this.subSatPointEntity.position = groundCartesian;
      this.subSatPointEntity.point.color = color;

      // Clamp ellipse semi-axis to avoid geometric singularity near antipode
      const clampedRadius = Math.min(Math.max(pos.footprintRadiusMeters, 80000), 9200000);
      this.footprintEntity.show = true;
      this.footprintEntity.position = Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, 0);
      this.footprintEntity.ellipse.semiMajorAxis = clampedRadius;
      this.footprintEntity.ellipse.semiMinorAxis = clampedRadius;
      this.footprintEntity.ellipse.material = color.withAlpha(0.11);
      this.footprintEntity.ellipse.outlineColor = color.withAlpha(0.68);
    } else {
      this.nadirLineEntity.show = false;
      this.subSatPointEntity.show = false;
      this.footprintEntity.show = false;
    }

    if (this.observer && selectedLook && selectedLook.visible) {
      const obsCartesian = Cesium.Cartesian3.fromDegrees(
        this.observer.lon,
        this.observer.lat,
        (this.observer.heightKm || 0) * 1000 + 200
      );
      this.losLineEntity.show = true;
      this.losLineEntity.polyline.positions = [obsCartesian, satCartesian];
    } else {
      this.losLineEntity.show = false;
    }
  }

  flyToSatellite(pos, duration = 1.4) {
    if (!this.viewer || !pos) return;
    const viewAltitude = Math.min(Math.max(pos.altMeters * 4.5, 4200000), 65000000);
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, viewAltitude),
      duration,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }

  flyToObserver(observer, duration = 1.2) {
    if (!this.viewer || !observer) return;
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(observer.lon, observer.lat, 3800000),
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
