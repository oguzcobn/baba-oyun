// =====================================================================
// GEZİLERİM — 3D dünya (three.js). Ülke sınırları world-atlas (Natural Earth,
// kamu malı) verisinden tuvale çizilip küreye sarılır. Pinler enlem/boylamla.
// =====================================================================
import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const R = 1;
const toVec = (lat, lon, r = R) => {
  const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
};
let worldCache = null;
export async function loadWorld() {
  if (worldCache) return worldCache;
  const topo = await fetch('data/countries-50m.json').then(r => r.json());
  worldCache = window.topojson.feature(topo, topo.objects.countries).features;
  return worldCache;
}
// nokta-çokgen (ışın) testi — ziyaret edilen ülkeleri boyamak için
function inRing(lon, lat, ring) { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) ins = !ins; } return ins; }
function inFeature(lon, lat, f) {
  const polys = f.geometry ? (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : []) : [];
  return polys.some(p => inRing(lon, lat, p[0]) && !p.slice(1).some(h => inRing(lon, lat, h)));
}
export function countryOf(lat, lon) { if (!worldCache) return null; for (const [dy, dx] of [[0, 0], [0, .25], [0, -.25], [.25, 0], [-.25, 0], [0, .5], [0, -.5]]) { const f = worldCache.find(f => inFeature(lon + dx, lat + dy, f)); if (f) return (f.properties && f.properties.name) || f.id; } return null; }

export function drawTexture(features, visited) {
  const W = 4096, H = 2048, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const ocean = g.createLinearGradient(0, 0, 0, H); ocean.addColorStop(0, '#0a1a3a'); ocean.addColorStop(.5, '#0c2350'); ocean.addColorStop(1, '#0a1a3a');
  g.fillStyle = ocean; g.fillRect(0, 0, W, H);
  // enlem/boylam ızgarası
  g.strokeStyle = 'rgba(120,170,255,.10)'; g.lineWidth = 1.2;
  for (let lon = -180; lon <= 180; lon += 15) { const x = (lon + 180) / 360 * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let lat = -75; lat <= 75; lat += 15) { const y = (90 - lat) / 180 * H; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const P = ([lon, lat]) => [(lon + 180) / 360 * W, (90 - lat) / 180 * H];
  const pathRing = (ring, shift) => { ring.forEach((pt, i) => { let [x, y] = P(pt); x += shift; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); };
  for (const f of features) {
    if (!f.geometry) continue;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const vis = visited.has(f.id);
    for (const poly of polys) {
      // tarih değiştirme çizgisini aşan halkalar için boylamları düzelt
      const fixed = poly.map(ring => { let wrap = false; for (let i = 1; i < ring.length; i++) if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) { wrap = true; break; } return wrap ? ring.map(([lo, la]) => [lo < 0 ? lo + 360 : lo, la]) : ring; });
      for (const shift of [0, -W]) {
        g.beginPath(); fixed.forEach(r => pathRing(r, shift));
        g.fillStyle = vis ? '#ffb000' : '#1d3f7a'; g.fill('evenodd');
        g.strokeStyle = vis ? '#ffe08a' : 'rgba(170,205,255,.55)'; g.lineWidth = vis ? 2.4 : 1.1; g.stroke();
      }
    }
  }
  return cv;
}

export async function createGlobe(host, { onPick } = {}) {
  const features = await loadWorld();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .01, 100); camera.position.set(0, .6, 3.2);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); host.appendChild(renderer.domElement);
  const labels = document.createElement('div'); labels.className = 'gl-labels'; host.appendChild(labels);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: .07, enablePan: false, minDistance: 1.35, maxDistance: 6, rotateSpeed: .55, zoomSpeed: .8, autoRotate: true, autoRotateSpeed: .45 });
  renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; });

  scene.add(new THREE.AmbientLight(0xffffff, 1.05));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(4, 2, 3); scene.add(sun);
  // yıldızlar
  const sg = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 2600; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(20 + Math.random() * 30); sp.push(v.x, v.y, v.z); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xbfd4ff, size: .06, sizeAttenuation: true, transparent: true, opacity: .8 })));
  // küre
  const tex = new THREE.CanvasTexture(drawTexture(features, new Set())); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), new THREE.MeshStandardMaterial({ map: tex, roughness: .85, metalness: .05 }));
  scene.add(earth);
  // atmosfer (fresnel parıltı)
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 64, 48), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.,0.,1.)), 3.2); gl_FragColor = vec4(0.35,0.62,1.0,1.0)*i*1.6; }'
  }));
  scene.add(atm);

  const pinGroup = new THREE.Group(); earth.add(pinGroup);
  let pins = [], pinObjs = [];
  const headGeo = new THREE.SphereGeometry(.014, 16, 12), stemGeo = new THREE.CylinderGeometry(.0028, .0028, .06, 6), ringGeo = new THREE.RingGeometry(.016, .022, 32);
  function setPins(list) {
    pins = list; pinGroup.clear(); labels.innerHTML = ''; pinObjs = [];
    const visited = new Set();
    list.forEach((p, i) => {
      let f = null; for (const [dy, dx] of [[0, 0], [0, .25], [0, -.25], [.25, 0], [-.25, 0], [.2, .2], [-.2, .2], [.2, -.2], [-.2, -.2], [0, .5], [0, -.5]]) { f = features.find(q => inFeature(p.lon + dx, p.lat + dy, q)); if (f) break; }
      if (f) visited.add(f.id);
      const base = toVec(p.lat, p.lon, R), n = base.clone().normalize();
      const g = new THREE.Group(); g.position.copy(base); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      const stem = new THREE.Mesh(stemGeo, new THREE.MeshBasicMaterial({ color: 0xffffff })); stem.position.y = .03; g.add(stem);
      const head = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({ color: 0xff3d2e })); head.position.y = .064; head.userData.i = i; g.add(head);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffb000, transparent: true, opacity: .9, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = .002; g.add(ring);
      pinGroup.add(g);
      const lb = document.createElement('button'); lb.className = 'gl-label'; lb.textContent = p.name; lb.onclick = () => { flyTo(p.lat, p.lon); onPick && onPick(i); }; labels.appendChild(lb);
      pinObjs.push({ g, head, ring, lb, tip: toVec(p.lat, p.lon, R + .02), t: Math.random() * 6 });
    });
    const t2 = new THREE.CanvasTexture(drawTexture(features, visited)); t2.colorSpace = THREE.SRGBColorSpace; t2.anisotropy = 8;
    earth.material.map.dispose(); earth.material.map = t2; earth.material.needsUpdate = true;
    return visited.size;
  }
  // bir şehre uç
  let fly = null;
  function flyTo(lat, lon, dist) {
    controls.autoRotate = false;
    const target = toVec(lat, lon, 1).applyQuaternion(earth.quaternion).normalize().multiplyScalar(dist || Math.max(1.7, Math.min(2.4, camera.position.length())));
    fly = { from: camera.position.clone(), to: target, t: 0 };
  }
  // pin tıklama
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  let downAt = null;
  renderer.domElement.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const r = renderer.domElement.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(mouse, camera); const hit = ray.intersectObjects(pinObjs.map(o => o.head))[0];
    if (hit) { const i = hit.object.userData.i; flyTo(pins[i].lat, pins[i].lon); onPick && onPick(i); }
  });
  function resize() { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px'; camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();
  let raf = 0, last = performance.now(); const tmp = new THREE.Vector3(), camDir = new THREE.Vector3();
  function loop(now) {
    raf = requestAnimationFrame(loop); const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (fly) { fly.t = Math.min(1, fly.t + dt * 1.1); const k = 1 - Math.pow(1 - fly.t, 3); const len = fly.from.length() + (fly.to.length() - fly.from.length()) * k; camera.position.copy(fly.from.clone().normalize().lerp(fly.to.clone().normalize(), k).normalize().multiplyScalar(len)); if (fly.t >= 1) fly = null; }
    controls.update();
    const w = host.clientWidth, h = host.clientHeight; camDir.copy(camera.position).normalize();
    const ps = Math.max(.3, Math.min(1, (camera.position.length() - 1) / 1.8));
    pinObjs.forEach(o => {
      o.g.scale.setScalar(ps); o.t += dt; const s = 1 + Math.sin(o.t * 3) * .35; o.ring.scale.set(s, s, s); o.ring.material.opacity = .9 - (s - .65) * .9;
      tmp.copy(o.tip).applyMatrix4(earth.matrixWorld); const facing = tmp.clone().normalize().dot(camDir) > .18;
      tmp.project(camera); o.lb.style.transform = `translate(${(tmp.x * .5 + .5) * w}px,${(-tmp.y * .5 + .5) * h}px) translate(-50%,-120%)`; o.lb.style.opacity = facing ? 1 : 0; o.lb.style.pointerEvents = facing ? 'auto' : 'none';
    });
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(loop);
  return {
    setPins, flyTo, countryOf, _tex: () => earth.material.map.image,
    spin(on) { controls.autoRotate = on; },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); scene.traverse(o => { o.geometry && o.geometry.dispose(); o.material && (o.material.map && o.material.map.dispose(), o.material.dispose()); }); host.innerHTML = ''; }
  };
}
