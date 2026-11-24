import { getCategoryColor, getSatelliteDisplayInfo } from '../orbital/catalog.js';
import { getLang, t } from '../ui/i18n.js';

let loadedApiKey = null;
let loadPromise = null;

function loadGoogleMapsScript(apiKey) {
  if (window.google?.maps?.importLibrary && loadedApiKey === apiKey) {
    return Promise.resolve();
  }
  if (loadPromise && loadedApiKey === apiKey) {
    return loadPromise;
  }

  loadedApiKey = apiKey;
  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-maps-3d-script');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = 'google-maps-3d-script';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&v=beta&libraries=maps3d`;

    script.onload = () => {
      if (window.google?.maps?.importLibrary) {
        resolve();
      } else {
        reject(new Error(t('errGmapsNoObj')));
      }
    };
    script.onerror = () => {
      reject(new Error(t('errGmapsScript')));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

function createPinTemplate(colorHex, selected) {
  const tpl = document.createElement('template');
  const size = selected ? 20 : 12;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size * 2));
  svg.setAttribute('height', String(size * 2));
  svg.setAttribute('viewBox', '0 0 40 40');

  svg.innerHTML = selected
    ? `<circle cx="20" cy="20" r="16" fill="${colorHex}" fill-opacity="0.28" stroke="${colorHex}" stroke-width="2.5"/>
       <circle cx="20" cy="20" r="6" fill="#ffffff" stroke="${colorHex}" stroke-width="2.5"/>`
    : `<circle cx="20" cy="20" r="10" fill="${colorHex}" fill-opacity="0.3"/>
       <circle cx="20" cy="20" r="4.5" fill="#ffffff" stroke="${colorHex}" stroke-width="2"/>`;

  tpl.content.appendChild(svg);
  return tpl;
}

/**
 * Native Google Maps 3D Engine using Google Maps JavaScript API `maps3d` (<gmp-map-3d>).
 * Supports Photorealistic 3D Google Maps with Marker3DInteractiveElement & Polyline3DElement
 * at true orbital altitudes (up to 63,170 km).
 */
export class GoogleMaps3DEngine {
  constructor(container, { onSelect }) {
    this.container = container;
    this.onSelect = onSelect;
    this.map3d = null;
    this.libs = null;
    this.markers = new Map(); // id -> { marker, record, color }
    this.futurePolyline = null;
    this.pastPolyline = null;
    this.selectedId = null;
    this.showOrbit = true;
    this.followMode = false;
    this.lastUpdateMs = 0;
    this.mode = 'HYBRID';
    this.apiKey = '';
  }

  async init(apiKey) {
    if (!apiKey || !apiKey.trim()) {
      throw new Error(t('errGmapsKeyNeeded'));
    }

    this.apiKey = apiKey.trim();
    await loadGoogleMapsScript(this.apiKey);

    const maps3d = await window.google.maps.importLibrary('maps3d');
    this.libs = maps3d;

    const { Map3DElement, MapMode } = maps3d;

    this.container.innerHTML = '';
    this.map3d = new Map3DElement({
      center: { lat: 36.5, lng: 127.5, altitude: 0 },
      range: 14500000,
      tilt: 18,
      heading: 0,
      mode: MapMode?.[this.mode] ?? this.mode,
    });
    this.map3d.style.width = '100%';
    this.map3d.style.height = '100%';
    this.container.appendChild(this.map3d);
  }

  setMapMode(mode) {
    this.mode = mode;
    if (this.map3d && this.libs) {
      this.map3d.mode = this.libs.MapMode?.[mode] ?? mode;
    }
  }

  setSatellites(records) {
    if (!this.map3d || !this.libs) return;

    for (const entry of this.markers.values()) {
      entry.marker.remove();
    }
    this.markers.clear();

    const { Marker3DInteractiveElement, AltitudeMode } = this.libs;
    // Cap simultaneous DOM 3D markers for responsive frame rates
    const capped = records.slice(0, 120);

    for (const rec of capped) {
      const color = getCategoryColor(rec.group);
      const isSelected = rec.id === this.selectedId;
      const info = getSatelliteDisplayInfo(rec.id, rec.name);

      const marker = new Marker3DInteractiveElement({
        position: { lat: 0, lng: 0, altitude: 400000 },
        altitudeMode: AltitudeMode?.ABSOLUTE ?? 'ABSOLUTE',
        extruded: isSelected,
        label: isSelected || info.isNotable ? info.title.split(' (')[0] : '',
        drawsWhenOccluded: false,
      });

      marker.append(createPinTemplate(color, isSelected));
      marker.addEventListener('gmp-click', () => {
        this.onSelect?.(rec.id);
      });

      this.map3d.append(marker);
      this.markers.set(rec.id, { marker, record: rec, color });
    }
  }

  setSelected(satId) {
    if (!this.map3d || !this.libs) {
      this.selectedId = satId;
      return;
    }

    const prev = this.selectedId ? this.markers.get(this.selectedId) : null;
    if (prev) {
      const prevInfo = getSatelliteDisplayInfo(prev.record.id, prev.record.name);
      prev.marker.extruded = false;
      prev.marker.label = prevInfo.isNotable ? prevInfo.title.split(' (')[0] : '';
      prev.marker.innerHTML = '';
      prev.marker.append(createPinTemplate(prev.color, false));
    }

    this.selectedId = satId;

    if (!satId) {
      this.clearOrbit();
      return;
    }

    const next = this.markers.get(satId);
    if (next) {
      const nextInfo = getSatelliteDisplayInfo(next.record.id, next.record.name);
      next.marker.extruded = true;
      next.marker.label = nextInfo.title.split(' (')[0];
      next.marker.innerHTML = '';
      next.marker.append(createPinTemplate(next.color, true));
    }
  }

  clearOrbit() {
    if (this.futurePolyline) {
      this.futurePolyline.remove();
      this.futurePolyline = null;
    }
    if (this.pastPolyline) {
      this.pastPolyline.remove();
      this.pastPolyline = null;
    }
  }

  setOrbitVisible(visible) {
    this.showOrbit = visible;
    if (!visible) this.clearOrbit();
  }

  setFollowMode(enabled) {
    this.followMode = enabled;
  }

  updateOrbitTrack(track, colorHex) {
    if (!this.map3d || !this.libs) return;
    this.clearOrbit();
    if (!this.showOrbit || !track) return;

    const { Polyline3DElement, AltitudeMode } = this.libs;

    if (track.past.length > 1) {
      const pastLine = new Polyline3DElement({
        strokeColor: 'rgba(255, 255, 255, 0.35)',
        strokeWidth: 2,
        altitudeMode: AltitudeMode?.ABSOLUTE ?? 'ABSOLUTE',
        drawsOccludedSegments: false,
      });
      pastLine.coordinates = track.past.map((p) => ({
        lat: p.lat,
        lng: p.lon,
        altitude: Math.min(p.altMeters, 60000000),
      }));
      this.map3d.append(pastLine);
      this.pastPolyline = pastLine;
    }

    if (track.future.length > 1) {
      const futureLine = new Polyline3DElement({
        strokeColor: colorHex || '#38bdf8',
        strokeWidth: 3,
        altitudeMode: AltitudeMode?.ABSOLUTE ?? 'ABSOLUTE',
        drawsOccludedSegments: false,
      });
      futureLine.coordinates = track.future.map((p) => ({
        lat: p.lat,
        lng: p.lon,
        altitude: Math.min(p.altMeters, 60000000),
      }));
      this.map3d.append(futureLine);
      this.futurePolyline = futureLine;
    }
  }

  updatePositions(simDate, positionsMap) {
    if (!this.map3d) return;
    // Throttle custom-element DOM updates to ~5 Hz for crisp responsiveness
    const now = performance.now();
    if (now - this.lastUpdateMs < 180) return;
    this.lastUpdateMs = now;

    for (const [id, entry] of this.markers.entries()) {
      const pos = positionsMap.get(id);
      if (!pos) continue;
      entry.marker.position = {
        lat: pos.lat,
        lng: pos.lon,
        altitude: Math.min(pos.altMeters, 60000000),
      };

      if (this.followMode && id === this.selectedId) {
        this.map3d.center = {
          lat: pos.lat,
          lng: pos.lon,
          altitude: Math.min(pos.altMeters, 60000000),
        };
      }
    }
  }

  flyToSatellite(pos) {
    if (!this.map3d || !pos) return;
    const alt = Math.min(pos.altMeters, 55000000);
    const range = Math.min(Math.max(alt * 3.5, 2500000), 45000000);
    if (typeof this.map3d.flyCameraTo === 'function') {
      this.map3d.flyCameraTo({
        endCamera: {
          center: { lat: pos.lat, lng: pos.lon, altitude: alt },
          tilt: 42,
          heading: 0,
          range,
        },
        durationMillis: 1200,
      });
    } else {
      this.map3d.center = { lat: pos.lat, lng: pos.lon, altitude: alt };
      this.map3d.range = range;
    }
  }

  flyToCloseup(pos) {
    if (!this.map3d || !pos) return;
    const alt = Math.min(pos.altMeters, 55000000);
    if (typeof this.map3d.flyCameraTo === 'function') {
      this.map3d.flyCameraTo({
        endCamera: {
          center: { lat: pos.lat, lng: pos.lon, altitude: alt },
          tilt: 60,
          heading: 35,
          range: 35000,
        },
        durationMillis: 1200,
      });
    }
  }

  resetView() {
    if (!this.map3d) return;
    if (typeof this.map3d.flyCameraTo === 'function') {
      this.map3d.flyCameraTo({
        endCamera: {
          center: { lat: 36.5, lng: 127.5, altitude: 0 },
          tilt: 18,
          heading: 0,
          range: 14500000,
        },
        durationMillis: 1000,
      });
    }
  }

  show() {
    this.container.style.display = 'block';
  }

  hide() {
    this.container.style.display = 'none';
  }

  destroy() {
    this.clearOrbit();
    this.markers.clear();
    if (this.container) this.container.innerHTML = '';
    this.map3d = null;
  }
}
