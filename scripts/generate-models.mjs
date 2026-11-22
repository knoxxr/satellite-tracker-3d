import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/models');
fs.mkdirSync(OUT_DIR, { recursive: true });

/**
 * Minimal, standards-compliant glTF 2.0 binary (.glb) procedural mesh builder.
 * Coordinate convention (glTF 2.0 standard):
 *   +X = Forward (orbital velocity direction)
 *   +Y = Zenith (away from Earth; -Y = Nadir pointing toward Earth)
 *   +Z = Port/Starboard wing span
 */
class GlbBuilder {
  constructor() {
    this.materials = [];
    this.materialMap = new Map();
    this.primitives = []; // { positions: number[], normals: number[], indices: number[], matIdx }
  }

  addMaterial(name, rgba, metallic = 0.5, roughness = 0.4, emissive = [0, 0, 0]) {
    if (this.materialMap.has(name)) return this.materialMap.get(name);
    const idx = this.materials.length;
    this.materials.push({
      name,
      pbrMetallicRoughness: {
        baseColorFactor: rgba,
        metallicFactor: metallic,
        roughnessFactor: roughness,
      },
      emissiveFactor: emissive,
      doubleSided: true,
    });
    this.materialMap.set(name, idx);
    return idx;
  }

  getBucket(matIdx) {
    let bucket = this.primitives.find((p) => p.matIdx === matIdx);
    if (!bucket) {
      bucket = { matIdx, positions: [], normals: [], indices: [] };
      this.primitives.push(bucket);
    }
    return bucket;
  }

  addTriangle(matIdx, a, b, c) {
    const bucket = this.getBucket(matIdx);
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let nx = ab[1] * ac[2] - ab[2] * ac[1];
    let ny = ab[2] * ac[0] - ab[0] * ac[2];
    let nz = ab[0] * ac[1] - ab[1] * ac[0];
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;

    const base = bucket.positions.length / 3;
    bucket.positions.push(...a, ...b, ...c);
    bucket.normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    bucket.indices.push(base, base + 1, base + 2);
  }

  addQuad(matIdx, a, b, c, d) {
    this.addTriangle(matIdx, a, b, c);
    this.addTriangle(matIdx, a, c, d);
  }

  /**
   * Add an axis-aligned or rotated box centered at (cx, cy, cz) with size (sx, sy, sz).
   * Optional Euler rotation (rx, ry, rz) in radians.
   */
  addBox(matIdx, cx, cy, cz, sx, sy, sz, rot = [0, 0, 0]) {
    const hx = sx / 2;
    const hy = sy / 2;
    const hz = sz / 2;
    const corners = [
      [-hx, -hy, -hz],
      [hx, -hy, -hz],
      [hx, hy, -hz],
      [-hx, hy, -hz],
      [-hx, -hy, hz],
      [hx, -hy, hz],
      [hx, hy, hz],
      [-hx, hy, hz],
    ].map((p) => transformPoint(p, cx, cy, cz, rot));

    const faces = [
      [4, 5, 6, 7], // +Z
      [1, 0, 3, 2], // -Z
      [5, 1, 2, 6], // +X
      [0, 4, 7, 3], // -X
      [7, 6, 2, 3], // +Y
      [0, 1, 5, 4], // -Y
    ];
    for (const [i0, i1, i2, i3] of faces) {
      this.addQuad(matIdx, corners[i0], corners[i1], corners[i2], corners[i3]);
    }
  }

  /**
   * Add a cylinder / frustum along local Y axis, then rotated & translated.
   */
  addCylinder(matIdx, cx, cy, cz, rTop, rBot, height, segs = 16, rot = [0, 0, 0], capTop = true, capBot = true) {
    const hh = height / 2;
    const topRing = [];
    const botRing = [];
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      topRing.push(transformPoint([rTop * ca, hh, rTop * sa], cx, cy, cz, rot));
      botRing.push(transformPoint([rBot * ca, -hh, rBot * sa], cx, cy, cz, rot));
    }
    const topCenter = transformPoint([0, hh, 0], cx, cy, cz, rot);
    const botCenter = transformPoint([0, -hh, 0], cx, cy, cz, rot);

    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % segs;
      this.addQuad(matIdx, botRing[i], botRing[j], topRing[j], topRing[i]);
      if (capTop && rTop > 0.001) this.addTriangle(matIdx, topCenter, topRing[i], topRing[j]);
      if (capBot && rBot > 0.001) this.addTriangle(matIdx, botCenter, botRing[j], botRing[i]);
    }
  }

  /**
   * Add a parabolic dish reflector (cupped multi-ring surface) opening along +Y before rotation.
   */
  addDish(matIdx, cx, cy, cz, radius, depth, segs = 20, rings = 4, rot = [0, 0, 0]) {
    const ringPts = [];
    for (let r = 1; r <= rings; r++) {
      const t = r / rings;
      const rad = radius * t;
      const y = depth * t * t;
      const pts = [];
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        pts.push(transformPoint([rad * Math.cos(a), y, rad * Math.sin(a)], cx, cy, cz, rot));
      }
      ringPts.push(pts);
    }
    const center = transformPoint([0, 0, 0], cx, cy, cz, rot);
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % segs;
      this.addTriangle(matIdx, center, ringPts[0][j], ringPts[0][i]);
    }
    for (let r = 0; r < rings - 1; r++) {
      for (let i = 0; i < segs; i++) {
        const j = (i + 1) % segs;
        this.addQuad(matIdx, ringPts[r][i], ringPts[r][j], ringPts[r + 1][j], ringPts[r + 1][i]);
      }
    }
  }

  /**
   * Add a solar wing panel with metallic frame + segmented blue/gold photovoltaic cells.
   */
  addSolarWing(cellMat, frameMat, cx, cy, cz, widthX, lengthZ, segments = 4, rot = [0, 0, 0]) {
    const thickness = 0.08;
    // Outer support frame
    this.addBox(frameMat, cx, cy, cz, widthX + 0.16, thickness * 0.75, lengthZ + 0.16, rot);

    // Individual solar cell sub-panels with visible divider seams
    const gap = 0.14;
    const segLen = (lengthZ - gap * (segments - 1)) / segments;
    for (let i = 0; i < segments; i++) {
      const localZ = -lengthZ / 2 + segLen / 2 + i * (segLen + gap);
      const offset = transformPoint([0, 0, localZ], cx, cy, cz, rot);
      this.addBox(cellMat, offset[0], offset[1], offset[2], widthX - 0.12, thickness * 1.15, segLen, rot);
    }
  }

  toGlbBuffer() {
    const bufferChunks = [];
    const bufferViews = [];
    const accessors = [];
    const gltfPrimitives = [];

    let byteOffset = 0;
    const pushBuffer = (typedArray, target) => {
      const raw = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
      const pad = (4 - (raw.length % 4)) % 4;
      const padded = pad ? Buffer.concat([raw, Buffer.alloc(pad)]) : raw;
      const bvIdx = bufferViews.length;
      bufferViews.push({
        buffer: 0,
        byteOffset,
        byteLength: raw.length,
        ...(target ? { target } : {}),
      });
      bufferChunks.push(padded);
      byteOffset += padded.length;
      return bvIdx;
    };

    for (const prim of this.primitives) {
      if (prim.indices.length === 0) continue;

      const posArr = new Float32Array(prim.positions);
      const normArr = new Float32Array(prim.normals);
      const idxArr = new Uint32Array(prim.indices);

      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (let i = 0; i < posArr.length; i += 3) {
        if (posArr[i] < minX) minX = posArr[i];
        if (posArr[i + 1] < minY) minY = posArr[i + 1];
        if (posArr[i + 2] < minZ) minZ = posArr[i + 2];
        if (posArr[i] > maxX) maxX = posArr[i];
        if (posArr[i + 1] > maxY) maxY = posArr[i + 1];
        if (posArr[i + 2] > maxZ) maxZ = posArr[i + 2];
      }

      const posBv = pushBuffer(posArr, 34962);
      const normBv = pushBuffer(normArr, 34962);
      const idxBv = pushBuffer(idxArr, 34963);

      const posAcc = accessors.length;
      accessors.push({
        bufferView: posBv,
        componentType: 5126,
        count: posArr.length / 3,
        type: 'VEC3',
        min: [minX, minY, minZ],
        max: [maxX, maxY, maxZ],
      });

      const normAcc = accessors.length;
      accessors.push({
        bufferView: normBv,
        componentType: 5126,
        count: normArr.length / 3,
        type: 'VEC3',
      });

      const idxAcc = accessors.length;
      accessors.push({
        bufferView: idxBv,
        componentType: 5125,
        count: idxArr.length,
        type: 'SCALAR',
      });

      gltfPrimitives.push({
        attributes: {
          POSITION: posAcc,
          NORMAL: normAcc,
        },
        indices: idxAcc,
        material: prim.matIdx,
      });
    }

    const binBuffer = Buffer.concat(bufferChunks);
    const gltf = {
      asset: { version: '2.0', generator: 'OrbitPulse-3D-Generator' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, name: 'Spacecraft' }],
      meshes: [{ name: 'SpacecraftMesh', primitives: gltfPrimitives }],
      materials: this.materials,
      buffers: [{ byteLength: binBuffer.length }],
      bufferViews,
      accessors,
    };

    const jsonRaw = Buffer.from(JSON.stringify(gltf), 'utf8');
    const jsonPad = (4 - (jsonRaw.length % 4)) % 4;
    const jsonBuf = jsonPad ? Buffer.concat([jsonRaw, Buffer.from(' '.repeat(jsonPad))]) : jsonRaw;

    const totalLen = 12 + 8 + jsonBuf.length + 8 + binBuffer.length;
    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546c67, 0); // 'glTF'
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(totalLen, 8);

    const jsonHeader = Buffer.alloc(8);
    jsonHeader.writeUInt32LE(jsonBuf.length, 0);
    jsonHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(binBuffer.length, 0);
    binHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

    return Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuffer]);
  }
}

function transformPoint(p, cx, cy, cz, [rx, ry, rz]) {
  let [x, y, z] = p;
  if (rx) {
    const c = Math.cos(rx), s = Math.sin(rx);
    [y, z] = [y * c - z * s, y * s + z * c];
  }
  if (ry) {
    const c = Math.cos(ry), s = Math.sin(ry);
    [x, z] = [x * c + z * s, -x * s + z * c];
  }
  if (rz) {
    const c = Math.cos(rz), s = Math.sin(rz);
    [x, y] = [x * c - y * s, x * s + y * c];
  }
  return [x + cx, y + cy, z + cz];
}

function addSharedMaterials(b) {
  return {
    goldFoil: b.addMaterial('GoldMLI', [0.88, 0.68, 0.22, 1.0], 0.85, 0.28, [0.06, 0.04, 0.01]),
    silverHull: b.addMaterial('SilverHull', [0.84, 0.87, 0.91, 1.0], 0.65, 0.32, [0.04, 0.05, 0.06]),
    whiteThermal: b.addMaterial('WhiteThermal', [0.93, 0.95, 0.98, 1.0], 0.15, 0.45, [0.06, 0.06, 0.07]),
    darkCarbon: b.addMaterial('DarkCarbon', [0.14, 0.16, 0.20, 1.0], 0.35, 0.55, [0.01, 0.01, 0.02]),
    trussMetal: b.addMaterial('TrussMetal', [0.58, 0.62, 0.68, 1.0], 0.72, 0.38, [0.03, 0.03, 0.04]),
    solarBlue: b.addMaterial('SolarBlue', [0.11, 0.29, 0.62, 1.0], 0.55, 0.22, [0.03, 0.09, 0.22]),
    solarAmber: b.addMaterial('SolarAmber', [0.76, 0.46, 0.14, 1.0], 0.62, 0.26, [0.12, 0.06, 0.01]),
    accentCyan: b.addMaterial('AccentCyan', [0.22, 0.74, 0.97, 1.0], 0.2, 0.3, [0.12, 0.42, 0.62]),
    lensGlass: b.addMaterial('LensGlass', [0.08, 0.20, 0.34, 1.0], 0.9, 0.08, [0.04, 0.12, 0.22]),
  };
}

/** 1. Space Station (ISS / Tiangong) — ~60 unit span */
function buildStationModel() {
  const b = new GlbBuilder();
  const m = addSharedMaterials(b);

  // Integrated main truss along Z axis
  b.addBox(m.trussMetal, 0, 0, 0, 1.6, 1.6, 46);
  // Cross bracing collars on truss
  for (const z of [-18, -12, -6, 6, 12, 18]) {
    b.addBox(m.silverHull, 0, 0, z, 2.2, 2.2, 0.9);
  }

  // Central pressurized habitat spine along X axis (Zvezda -> Zarya -> Unity -> Destiny -> Harmony)
  b.addCylinder(m.whiteThermal, 0, 0, 0, 1.75, 1.75, 22, 16, [0, 0, Math.PI / 2]);
  b.addCylinder(m.silverHull, -13.5, 0, 0, 1.45, 1.65, 6, 14, [0, 0, Math.PI / 2]);
  b.addCylinder(m.whiteThermal, 13.0, 0, 0, 1.55, 1.7, 5, 14, [0, 0, Math.PI / 2]);

  // Transverse science labs (Columbus + Kibo)
  b.addCylinder(m.whiteThermal, 7.5, 0, 5.2, 1.45, 1.45, 7.5, 14, [Math.PI / 2, 0, 0]);
  b.addCylinder(m.whiteThermal, 7.5, 0, -5.2, 1.45, 1.45, 8.8, 14, [Math.PI / 2, 0, 0]);

  // Docked crew spacecraft nose cone (Dragon / Soyuz)
  b.addCylinder(m.silverHull, 17.2, 0, 0, 0.5, 1.35, 3.6, 14, [0, 0, -Math.PI / 2]);
  // Nadir Cupola observation dome
  b.addCylinder(m.accentCyan, 2.0, -2.0, 0, 0.9, 1.1, 0.9, 12);

  // White thermal radiator panels extending aft
  for (const z of [-7.5, 7.5]) {
    b.addBox(m.whiteThermal, -5.2, 0, z, 7.5, 0.14, 2.6);
  }

  // 4 pairs (8 wings) of massive ISS copper-gold solar arrays on outer truss
  for (const z of [-21.5, -15.5, 15.5, 21.5]) {
    // Forward wing (+X) and Aft wing (-X)
    b.addSolarWing(m.solarAmber, m.trussMetal, 10.2, 0, z, 16.0, 4.0, 4, [0.18, 0, 0]);
    b.addSolarWing(m.solarAmber, m.trussMetal, -10.2, 0, z, 16.0, 4.0, 4, [0.18, 0, 0]);
    // Mast connecting truss to wings
    b.addBox(m.trussMetal, 0, 0, z, 4.2, 0.45, 0.45);
  }

  return b.toGlbBuffer();
}

/** 2. Earth Observation Satellite (KOMPSAT / Arirang / NOAA / Landsat) */
function buildEarthObsModel() {
  const b = new GlbBuilder();
  const m = addSharedMaterials(b);

  // Main hexagonal gold-MLI spacecraft bus
  b.addCylinder(m.goldFoil, 0, 0.4, 0, 2.1, 2.1, 4.6, 6);
  b.addCylinder(m.silverHull, 0, 2.8, 0, 1.8, 2.1, 0.5, 6);

  // Nadir-pointing high-resolution optical telescope (-Y points straight toward Earth!)
  b.addCylinder(m.darkCarbon, 0, -2.7, 0, 1.35, 1.5, 2.6, 16);
  b.addCylinder(m.silverHull, 0, -4.05, 0, 1.55, 1.55, 0.25, 16);
  b.addCylinder(m.lensGlass, 0, -3.9, 0, 1.2, 1.2, 0.15, 16);

  // Side SAR / X-band downlink dish angled downward
  b.addDish(m.whiteThermal, 2.1, -1.2, 0, 1.25, 0.35, 18, 4, [0, 0, Math.PI * 0.78]);
  b.addCylinder(m.trussMetal, 1.5, -0.7, 0, 0.12, 0.12, 1.2, 8, [0, 0, Math.PI / 3]);

  // Zenith GPS receiver & star trackers
  b.addCylinder(m.whiteThermal, 0.6, 3.3, 0.4, 0.22, 0.28, 0.7, 10);
  b.addCylinder(m.accentCyan, -0.7, 3.2, -0.3, 0.26, 0.26, 0.5, 10);

  // Dual wide deep-blue photovoltaic solar wings along ±Z
  b.addBox(m.trussMetal, 0, 0.6, 0, 0.35, 0.35, 22.0);
  b.addSolarWing(m.solarBlue, m.silverHull, 0, 0.6, 8.2, 3.8, 10.6, 4, [0.22, 0, 0]);
  b.addSolarWing(m.solarBlue, m.silverHull, 0, 0.6, -8.2, 3.8, 10.6, 4, [0.22, 0, 0]);

  return b.toGlbBuffer();
}

/** 3. Geostationary Communications & Weather Satellite (GK-2A/2B, Koreasat) */
function buildGeoCommModel() {
  const b = new GlbBuilder();
  const m = addSharedMaterials(b);

  // Cubic GEO gold-foil spacecraft bus + silver side radiator panels
  b.addBox(m.goldFoil, 0, 0, 0, 4.4, 5.2, 4.4);
  b.addBox(m.silverHull, 0, 0, 2.28, 3.8, 4.4, 0.16);
  b.addBox(m.silverHull, 0, 0, -2.28, 3.8, 4.4, 0.16);

  // Earth-facing (-Y) weather imager / transponder payload deck
  b.addBox(m.darkCarbon, 0, -2.8, 0, 3.4, 0.6, 3.4);
  b.addCylinder(m.lensGlass, -0.8, -3.15, 0.6, 0.75, 0.75, 0.3, 14);
  b.addDish(m.whiteThermal, 0.9, -3.2, -0.6, 0.95, 0.28, 16, 3, [Math.PI, 0, 0]);

  // Large East & West high-gain parabolic communication reflectors
  b.addDish(m.whiteThermal, 3.7, -0.3, 0, 2.4, 0.62, 22, 4, [0, 0, Math.PI * 0.65]);
  b.addDish(m.whiteThermal, -3.7, -0.3, 0, 2.4, 0.62, 22, 4, [0, 0, -Math.PI * 0.65]);
  b.addBox(m.trussMetal, 2.6, -0.1, 0, 1.4, 0.24, 0.24);
  b.addBox(m.trussMetal, -2.6, -0.1, 0, 1.4, 0.24, 0.24);

  // Extra-long GEO dual solar wings along ±Z
  b.addBox(m.trussMetal, 0, 0.2, 0, 0.35, 0.35, 34.0);
  b.addSolarWing(m.solarBlue, m.silverHull, 0, 0.2, 11.4, 4.2, 14.4, 5, [0.15, 0, 0]);
  b.addSolarWing(m.solarBlue, m.silverHull, 0, 0.2, -11.4, 4.2, 14.4, 5, [0.15, 0, 0]);

  // Zenith telemetry omni antenna
  b.addCylinder(m.accentCyan, 0, 3.4, 0, 0.14, 0.22, 1.8, 10);

  return b.toGlbBuffer();
}

/** 4. GNSS Navigation Satellite (GPS / Galileo / GLONASS) */
function buildGnssModel() {
  const b = new GlbBuilder();
  const m = addSharedMaterials(b);

  // Compact metallic/gold navigation bus
  b.addBox(m.goldFoil, 0, 0.5, 0, 3.6, 3.2, 3.4);
  b.addBox(m.silverHull, 0, 2.25, 0, 3.2, 0.3, 3.0);

  // Earth-facing (-Y) L-band helical antenna array plate
  b.addCylinder(m.silverHull, 0, -1.25, 0, 1.9, 1.9, 0.3, 16);
  // Center + 6 ring helical antenna elements pointing straight at Earth (-Y)
  b.addCylinder(m.goldFoil, 0, -2.05, 0, 0.24, 0.24, 1.3, 10);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.addCylinder(m.goldFoil, Math.cos(a) * 1.15, -1.95, Math.sin(a) * 1.15, 0.2, 0.2, 1.15, 10);
  }

  // Twin solar wings along ±Z
  b.addBox(m.trussMetal, 0, 0.6, 0, 0.3, 0.3, 21.0);
  b.addSolarWing(m.solarBlue, m.silverHull, 0, 0.6, 7.6, 3.2, 9.6, 3, [0.25, 0, 0]);
  b.addSolarWing(m.solarBlue, m.silverHull, 0, 0.6, -7.6, 3.2, 9.6, 3, [0.25, 0, 0]);

  return b.toGlbBuffer();
}

/** 5. Space Telescope (Hubble HST / Science Observatory) */
function buildTelescopeModel() {
  const b = new GlbBuilder();
  const m = addSharedMaterials(b);

  // Iconic silver cylindrical optical tube assembly along X axis
  b.addCylinder(m.silverHull, -2.6, 0, 0, 2.4, 2.4, 6.2, 20, [0, 0, Math.PI / 2]);
  b.addCylinder(m.whiteThermal, 3.2, 0, 0, 1.85, 1.85, 6.4, 20, [0, 0, Math.PI / 2]);
  // Dark optical interior aperture at +X end
  b.addCylinder(m.darkCarbon, 6.42, 0, 0, 1.55, 1.55, 0.15, 18, [0, 0, Math.PI / 2]);
  // Hinged open aperture door
  b.addBox(m.silverHull, 7.2, 1.75, 0, 2.2, 0.18, 2.8, [0, 0, 0.65]);

  // Gold equipment bay collars
  b.addCylinder(m.goldFoil, 0.2, 0, 0, 2.48, 2.48, 0.9, 20, [0, 0, Math.PI / 2]);

  // Twin high-gain dish antennas on zenith & nadir masts
  b.addCylinder(m.trussMetal, -0.5, 3.4, 0, 0.12, 0.12, 3.2, 8);
  b.addDish(m.whiteThermal, -0.5, 5.0, 0, 1.15, 0.32, 16, 3);
  b.addCylinder(m.trussMetal, -0.5, -3.4, 0, 0.12, 0.12, 3.2, 8);
  b.addDish(m.whiteThermal, -0.5, -5.0, 0, 1.15, 0.32, 16, 3, [Math.PI, 0, 0]);

  // Twin dark-blue solar wings along ±Z
  b.addBox(m.trussMetal, 1.2, 0, 0, 0.3, 0.3, 20.0);
  b.addSolarWing(m.solarBlue, m.trussMetal, 1.2, 0, 7.2, 3.4, 9.2, 4, [0.3, 0, 0]);
  b.addSolarWing(m.solarBlue, m.trussMetal, 1.2, 0, -7.2, 3.4, 9.2, 4, [0.3, 0, 0]);

  return b.toGlbBuffer();
}

/** 6. Flat-Panel Constellation Satellite (Starlink) */
function buildStarlinkModel() {
  const b = new GlbBuilder();
  const m = addSharedMaterials(b);

  // Iconic ultra-flat rectangular spacecraft chassis
  b.addBox(m.silverHull, 0, -0.2, 0, 5.6, 0.42, 3.2);
  // Earth-facing phased-array white antenna underside
  b.addBox(m.whiteThermal, 0, -0.46, 0, 4.8, 0.12, 2.6);
  // Subtle laser inter-satellite link optical terminal nodes
  b.addCylinder(m.accentCyan, 2.6, 0.18, 0, 0.25, 0.25, 0.35, 10);
  b.addCylinder(m.darkCarbon, -2.5, 0.12, 0, 0.4, 0.4, 0.4, 10);

  // Iconic single large angled "shark-fin" photovoltaic solar array wing rising upward
  b.addBox(m.trussMetal, -2.1, 2.4, 0, 0.2, 4.8, 0.25, [0, 0, 0.12]);
  b.addSolarWing(m.solarBlue, m.silverHull, -1.8, 5.2, 0, 9.2, 3.1, 4, [0, 0, Math.PI / 2 - 0.12]);

  return b.toGlbBuffer();
}

const MODELS = {
  'station.glb': buildStationModel,
  'earth_obs.glb': buildEarthObsModel,
  'geo_comm.glb': buildGeoCommModel,
  'gnss.glb': buildGnssModel,
  'telescope.glb': buildTelescopeModel,
  'starlink.glb': buildStarlinkModel,
};

let totalBytes = 0;
for (const [filename, builder] of Object.entries(MODELS)) {
  const buf = builder();
  const dest = path.join(OUT_DIR, filename);
  fs.writeFileSync(dest, buf);
  totalBytes += buf.length;
  console.log(`Generated ${filename}: ${(buf.length / 1024).toFixed(1)} KB`);
}
console.log(`Total 6 PBR GLB models: ${(totalBytes / 1024).toFixed(1)} KB`);
