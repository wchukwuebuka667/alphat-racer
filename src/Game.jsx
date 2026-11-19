import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

const ROAD = 12, FAR = 420, LANES = [-4, 0, 4];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const tex = (w, h, draw, rep) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
const facade = (base) => {
  const lit = [];
  const map = tex(512, 512, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? "255,255,255" : "0,0,0"},${Math.random() * .06})`; g.fillRect(Math.random() * 512, Math.random() * 512, 6, 6); }
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const x = c * 128, y = r * 128; lit.push(Math.random() < .4);
      g.fillStyle = "#1b2030"; g.fillRect(x + 30, y + 26, 68, 76);
      g.strokeStyle = "#cdbfae"; g.lineWidth = 5; g.strokeRect(x + 30, y + 26, 68, 76); g.fillStyle = "#cdbfae"; g.fillRect(x + 24, y + 104, 80, 8);
      if (Math.random() < .2) { g.fillStyle = "#6d6f76"; g.fillRect(x + 104, y + 80, 18, 16); }
      if (Math.random() < .25) { g.fillStyle = "#2a2a2f"; g.fillRect(x + 20, y + 112, 88, 4); }
    }
  }, true);
  const em = tex(512, 512, (g) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, 512, 512);
    lit.forEach((on, i) => { if (!on) return; g.fillStyle = pick(["#ffcf80", "#ffe3b0", "#ffb35c", "#bfe3ff"]); g.fillRect((i % 4) * 128 + 33, Math.floor(i / 4) * 128 + 29, 62, 70); });
  }, true);
  return new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 1.7, roughness: .85 });
};

let SH;
const shadowTex = () => SH || (SH = tex(64, 64, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(0,0,0,.7)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); }));
const shopTex = () => tex(1024, 256, (g) => {
  g.scale(2, 2); const w = 512, h = 128;
  g.fillStyle = "#1a1512"; g.fillRect(0, 0, w, h);
  for (let x = 6; x < w - 60; x += 104) {
    g.fillStyle = pick(["#d94f4f", "#2e86de", "#f0b429", "#2ecc71", "#8e44ad", "#f5f2e9"]); g.fillRect(x, 8, 92, 26);
    g.fillStyle = "#ffd9a0"; g.fillRect(x, 44, 92, 52); g.fillStyle = "#3a2c22"; g.fillRect(x + 44, 44, 4, 52); g.fillRect(x, 100, 92, 22);
  }
});
const shopMat = (t) => new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: .8, roughness: .9 });
function makeCar(color, police) {
  const g = new THREE.Group(), L = THREE.MeshLambertMaterial, B = THREE.BoxGeometry;
  const body = new THREE.Mesh(new B(1.9, .6, 4.3), new L({ color })); body.position.y = .6; g.add(body);
  const cab = new THREE.Mesh(new B(1.55, .5, 2), new L({ color: 0x14141c })); cab.position.set(0, 1.12, .3); g.add(cab);
  const wm = new L({ color: 0x0a0a0a });
  for (const [x, z] of [[-.95, -1.4], [.95, -1.4], [-.95, 1.4], [.95, 1.4]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .3, 12), wm); w.rotation.z = Math.PI / 2; w.position.set(x, .38, z); g.add(w); }
  const tl = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const x of [-.7, .7]) { const l = new THREE.Mesh(new B(.5, .18, .1), tl); l.position.set(x, .7, 2.16); g.add(l); }
  if (police) {
    const band = new THREE.Mesh(new B(1.94, .22, 2.2), new L({ color: 0xf5f2e9 })); band.position.set(0, .62, .3); g.add(band);
    const r = new THREE.MeshBasicMaterial({ color: 0xff2a2a }), b = new THREE.MeshBasicMaterial({ color: 0x2a6bff });
    [[-.45, r], [.45, b]].forEach(([x, m]) => { const l = new THREE.Mesh(new B(.7, .16, .3), m); l.position.set(x, 1.22, .3); l.userData.keep = true; g.add(l); });
    g.userData.lights = [r, b]; const pl = new THREE.PointLight(0xff2a2a, 70, 18, 2); pl.position.set(0, 2.2, .3); pl.userData.keep = true; g.add(pl); g.userData.pl = pl;
  }
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 5.4), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = .03; sh.userData.keep = true; g.add(sh);
  g.userData.body = body; g.userData.color = color; return g;
}

export default function Game({ perk }) {
  const box = useRef(null), cv = useRef(null), startRef = useRef(null), perkRef = useRef(perk);
  const lapR = useRef(null), timeR = useRef(null), spdR = useRef(null), touch = useRef(0), audioRef = useRef({});
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem("alphat-mute") === "1"; } catch { return false; } });
  const mutedRef = useRef(muted); mutedRef.current = muted;
  useEffect(() => { const a = audioRef.current; if (a.master) a.master.gain.value = muted ? 0 : .8; try { localStorage.setItem("alphat-mute", muted ? "1" : "0"); } catch {} }, [muted]);
  perkRef.current = perk;
  const [ui, setUi] = useState({ state: "ready", score: 0, best: (() => { try { return +localStorage.getItem("alphat-best3") || 0; } catch { return 0; } })() });
  const bestRef = useRef(ui.best);

  useEffect(() => {
    const mobile = matchMedia("(pointer: coarse)").matches;
    const renderer = new THREE.WebGLRenderer({ canvas: cv.current, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(64, 1.6, .1, 600);
    scene.background = tex(2, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h);
      [[0, "#2d2461"], [.5, "#b4577a"], [.85, "#ff9f6b"], [1, "#ffd09a"]].forEach(([p, c]) => gr.addColorStop(p, c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    scene.fog = new THREE.Fog(0xf0a878, 50, 300);
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .6;
    const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(512, 512, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 })); composer.addPass(new RenderPass(scene, cam));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), .5, .6, .88)); composer.addPass(new OutputPass());
    const sunD = new THREE.Mesh(new THREE.CircleGeometry(55, 40), new THREE.MeshBasicMaterial({ color: 0xffe1a0, fog: false })); sunD.position.set(0, 30, -500); scene.add(sunD);
    const sk = new THREE.MeshBasicMaterial({ color: 0x5a3f73, fog: false });
    for (let i = -8; i <= 8; i++) { const hh = rnd(25, 75), b = new THREE.Mesh(new THREE.BoxGeometry(11, hh, 8), sk); b.position.set(i * 10 + rnd(-3, 3), hh / 2 - 2, -440); scene.add(b); }
    scene.add(new THREE.HemisphereLight(0xffd2a8, 0x2a2a40, 1.3));
    const sun = new THREE.DirectionalLight(0xffb070, 2.2); sun.position.set(-20, 12, -30); scene.add(sun);

    const BM = THREE.MeshBasicMaterial, scroll = [];
    const roadTex = tex(768, 512, (g) => {
      g.scale(2, 2); const w = 384, h = 256;
      g.fillStyle = "#202024"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      g.fillStyle = "#f5f2e9"; g.fillRect(8, 0, 6, h); g.fillRect(w - 14, 0, 6, h);
      g.fillStyle = "#ffd400"; for (const x of [w / 3, 2 * w / 3]) g.fillRect(x - 3, 20, 6, h / 2.2);
    }, true);
    roadTex.repeat.set(1, FAR / 8);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, FAR), new THREE.MeshStandardMaterial({ map: roadTex, roughness: .5, metalness: .15 })); road.rotation.x = -Math.PI / 2; road.position.z = -FAR / 2 + 30; scene.add(road);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, FAR), new BM({ color: 0x17171c })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, -.02, -FAR / 2 + 30); scene.add(ground);
    for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(3, .3, FAR), new THREE.MeshStandardMaterial({ color: 0x8c8a88, roughness: .9 })); w.position.set(sd * (ROAD / 2 + 1.5), .15, -FAR / 2 + 30); scene.add(w); }

    const facades = ["#7a5a48", "#5c5f72", "#8a6a52", "#4f5a52"].map(facade);
    const bill = tex(512, 230, (g, w) => { g.fillStyle = "#0b0b0d"; g.fillRect(0, 0, w, 230); g.fillStyle = "#ffd400"; g.textAlign = "center"; g.font = "900 96px Impact, sans-serif"; g.fillText("ALPHAT RACER", w / 2, 120);
      g.fillStyle = "#f5f2e9"; g.font = "600 28px monospace"; g.fillText("LIVE ON VIBE/VIBE TESTNET", w / 2, 180); });
    const shops = [shopTex(), shopTex(), shopTex()], NB = 26, SP = 16;
    for (const sd of [-1, 1]) for (let i = 0; i < NB; i++) {
      const w = rnd(9, 15), h = rnd(14, 38), geo = new THREE.BoxGeometry(w, h, 14), uv = geo.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * w / 8, uv.getY(k) * h / 8);
      const m = new THREE.Mesh(geo, pick(facades)); m.position.set(sd * (ROAD / 2 + 3 + w / 2), h / 2, 30 - i * SP);
      if (i % 7 === 0) { const b = new THREE.Mesh(new THREE.PlaneGeometry(10, 4.5), new BM({ map: bill })); b.rotation.y = -sd * Math.PI / 2; b.position.set(-sd * (w / 2 - 1), h / 2 + 2.5, 0); m.add(b); }
      const shop = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.5), shopMat(pick(shops))); shop.rotation.y = -sd * Math.PI / 2; shop.position.set(-sd * (w / 2 + .05), -h / 2 + 2.25, 0); m.add(shop);
      scene.add(m); scroll.push({ m, span: NB * SP });
    }
    const NL = 12, LS = 36;
    for (const sd of [-1, 1]) for (let i = 0; i < NL; i++) {
      const l = new THREE.Group(); l.position.set(sd * (ROAD / 2 + .6), 0, 30 - i * LS);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(.1, .14, 7, 8), new BM({ color: 0x222228 })); p.position.y = 3.5; l.add(p);
      const hd = new THREE.Mesh(new THREE.SphereGeometry(.4, 8, 8), new BM({ color: 0xffe2a8 })); hd.position.y = 7; l.add(hd);
      scene.add(l); scroll.push({ m: l, span: NL * LS });
    }

    const player = makeCar(0xf5f2e9); scene.add(player);
    const shield = new THREE.Mesh(new THREE.SphereGeometry(2.8, 16, 12), new BM({ color: 0x2de2e6, transparent: true, opacity: .2 }));
    shield.scale.set(.9, .55, 1.5); shield.position.y = .9; shield.userData.keep = true; player.add(shield);
    const traffic = [];
    const spawn = (t) => { t.police = !!t.isPolice; t.x = pick(LANES); t.sp = t.police ? 0 : rnd(10, 20);
      t.z = t.police ? 45 : -rnd(330, 420); t.mesh.position.set(t.x, 0, t.z); };
    for (let i = 0; i < 9; i++) {
      const isPolice = i < 2, mesh = makeCar(isPolice ? 0x15151a : pick([0xc0392b, 0x2980b9, 0x27ae60, 0x8e44ad, 0xe67e22, 0xbdc3c7]), isPolice);
      const t = { mesh, isPolice }; spawn(t); if (!isPolice) t.z = -rnd(40, 400); scene.add(mesh); traffic.push(t);
    }

    const A = audioRef.current;
    const initAudio = () => {
      if (A.ctx) { A.ctx.resume(); return; }
      const C = new (window.AudioContext || window.webkitAudioContext)(); A.ctx = C;
      const master = C.createGain(); master.gain.value = mutedRef.current ? 0 : .8; master.connect(C.destination); A.master = master;
      const nb = C.createBuffer(1, C.sampleRate, C.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const noise = (t, d, type, f, g) => { const src = C.createBufferSource(); src.buffer = nb; const fl = C.createBiquadFilter(); fl.type = type; fl.frequency.value = f;
        const a = C.createGain(); a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(.0001, t + d); src.connect(fl); fl.connect(a); a.connect(master); src.start(t); src.stop(t + d); };
      const eg = C.createGain(), ef = C.createBiquadFilter(), o1 = C.createOscillator(), o2 = C.createOscillator();
      ef.type = "lowpass"; ef.frequency.value = 500; o1.type = "sawtooth"; o2.type = "square"; eg.gain.value = 0;
      o1.connect(ef); o2.connect(ef); ef.connect(eg); eg.connect(master); o1.start(); o2.start();
      const so = C.createOscillator(), sg = C.createGain(), lfo = C.createOscillator(), lg = C.createGain();
      so.type = "square"; so.frequency.value = 850; lfo.frequency.value = 2.2; lg.gain.value = 180; lfo.connect(lg); lg.connect(so.frequency);
      sg.gain.value = 0; so.connect(sg); sg.connect(master); so.start(); lfo.start();
      const mg = C.createGain(); mg.gain.value = .55; mg.connect(master);
      const note = (f, t, d, type, g) => { const o = C.createOscillator(), a = C.createGain(); o.type = type; o.frequency.value = f;
        a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(a); a.connect(mg); o.start(t); o.stop(t + d); };
      const kick = (t) => { const o = C.createOscillator(), a = C.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + .12);
        a.gain.setValueAtTime(.6, t); a.gain.exponentialRampToValueAtTime(.0001, t + .18); o.connect(a); a.connect(mg); o.start(t); o.stop(t + .2); };
      const step = 60 / 122 / 4, roots = [55, 43.65, 65.41, 49], arp = [0, 7, 12, 7, 0, 7, 12, 15]; let n = 0, next = C.currentTime + .1;
      A.mid = setInterval(() => { while (next < C.currentTime + .25) {
        const r = roots[Math.floor(n / 16) % 4], st = n % 16;
        if (st % 4 === 0) kick(next); if (st % 4 === 2) noise(next, .05, "highpass", 7000, .05);
        if (st % 2 === 0) note(r, next, step * 1.8, "sawtooth", .18);
        note(r * 8 * 2 ** (arp[st % 8] / 12), next, step * .9, "square", .035); next += step; n++; } }, 60);
      A.crash = () => { const t = C.currentTime; noise(t, .6, "lowpass", 900, .9); const o = C.createOscillator(), a = C.createGain();
        o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(30, t + .4); a.gain.setValueAtTime(.8, t); a.gain.exponentialRampToValueAtTime(.0001, t + .45); o.connect(a); a.connect(master); o.start(t); o.stop(t + .5); };
      A.update = () => { const t = C.currentTime; o1.frequency.setTargetAtTime(40 + s.v * 3.4, t, .05); o2.frequency.setTargetAtTime(60 + s.v * 3.4, t, .05);
        ef.frequency.setTargetAtTime(250 + s.v * 35, t, .1); eg.gain.setTargetAtTime(s.state === "play" ? .12 : s.state === "ready" ? .05 : 0, t, .15);
        let d = 999; for (const q of traffic) if (q.police) d = Math.min(d, Math.abs(q.z));
        sg.gain.setTargetAtTime(s.state === "play" ? Math.max(0, 1 - d / 110) * .045 : 0, t, .1); };
    };
    let ferrari = null;
    const dress = (car, color) => {
      if (!ferrari) return;
      car.children.forEach((c) => { if (!c.userData.keep) c.visible = false; });
      const m = ferrari.clone(true), paints = [];
      m.traverse((o) => { if (!o.isMesh) return;
        if (o.material.name === "Body_Color") { o.material = new THREE.MeshPhysicalMaterial({ color, metalness: .8, roughness: .3, clearcoat: 1, clearcoatRoughness: .05 }); paints.push(o.material); }
        else if (o.material.name === "Taillight_Glass") { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0xff1a1a); o.material.emissiveIntensity = 2.5; } });
      car.add(m); car.userData.paints = paints;
    };
    const dressAll = () => [player, ...traffic.map((t) => t.mesh)].forEach((c) => dress(c, c === player ? (perkRef.current ? 0xffd400 : 0xf5f2e9) : c.userData.color));
    new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("/draco/")).load("/models/ferrari.glb", (gl) => {
      ferrari = gl.scene; ferrari.traverse((o) => { if (/steering|leather|carpet|interior|wipers|carbon/.test(o.name)) o.visible = false; }); dressAll(); });
    const s = { state: "ready", v: 10, x: 0, dist: 0, t: 0, lives: 1, inv: 0, shake: 0 }, keys = { l: 0, r: 0, b: 0 };
    const start = () => {
      initAudio();
      Object.assign(s, { state: "play", v: 12, x: 0, dist: 0, t: 0, inv: 0, shake: 0, lives: perkRef.current ? 2 : 1 });
      (player.userData.paints || [player.userData.body.material]).forEach((m) => m.color.set(perkRef.current ? 0xffd400 : 0xf5f2e9));
      traffic.forEach((t) => { spawn(t); if (!t.police) t.z = -rnd(60, 400); }); setUi((u) => ({ ...u, state: "play" }));
    };
    startRef.current = start;
    const end = () => {
      s.state = "over"; const sc = Math.floor(s.dist);
      if (sc > bestRef.current) { bestRef.current = sc; try { localStorage.setItem("alphat-best3", sc); } catch {} }
      setUi({ state: "over", score: sc, best: bestRef.current });
    };
    const kd = (e, on) => {
      const k = e.key;
      if (["ArrowLeft", "a", "A"].includes(k)) keys.l = on; else if (["ArrowRight", "d", "D"].includes(k)) keys.r = on;
      else if (["ArrowDown", "s", "S"].includes(k)) keys.b = on; else if (on && [" ", "Enter"].includes(k) && s.state !== "play") { e.preventDefault(); start(); }
    };
    const down = (e) => kd(e, 1), up = (e) => kd(e, 0);
    addEventListener("keydown", down); addEventListener("keyup", up);
    const resize = () => { const w = box.current.clientWidth, h = box.current.clientHeight; renderer.setSize(w, h, false); composer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(box.current); resize();

    let last = performance.now(), raf, flash = 0;
    const loop = (now) => {
      const dt = Math.min(.05, (now - last) / 1000); last = now; flash += dt;
      const play = s.state === "play", maxV = 30 + Math.min(14, s.dist / 1200);
      if (play) {
        s.t += dt; s.inv = Math.max(0, s.inv - dt); s.shake = Math.max(0, s.shake - dt);
        s.v = Math.max(8, Math.min(maxV, s.v + (keys.b ? -14 : 7) * dt));
        const steer = (keys.r || touch.current > 0 ? 1 : 0) - (keys.l || touch.current < 0 ? 1 : 0);
        s.x = Math.max(-5, Math.min(5, s.x + steer * 9 * dt)); s.dist += s.v * dt; s.steer = steer;
      } else { s.v += ((s.state === "over" ? 0 : 10) - s.v) * Math.min(1, dt * 2); s.steer = 0; }
      const mv = s.v * dt; roadTex.offset.y += mv / 8;
      for (const o of scroll) { o.m.position.z += mv; if (o.m.position.z > 40) o.m.position.z -= o.span; }
      for (const t of traffic) {
        t.sp = t.police ? maxV + 4 : t.sp; t.z += (s.v - t.sp) * dt;
        if (t.police && t.z < 40 && t.z > -90 && play) t.x += Math.max(-1, Math.min(1, s.x - t.x)) * 2.2 * dt;
        if (t.police ? (t.z < -420 || t.z > 60) : (t.z > 25 || t.z < -460)) { const p = t.police; spawn(t); if (!p) t.z = -rnd(330, 420); }
        t.mesh.position.set(t.x, 0, t.z);
        if (t.mesh.userData.lights) { const on = Math.sin(flash * 14) > 0; t.mesh.userData.lights[0].color.set(on ? 0xff2a2a : 0x330808); t.mesh.userData.lights[1].color.set(on ? 0x081433 : 0x2a6bff); t.mesh.userData.pl.color.set(on ? 0xff2a2a : 0x2a6bff); }
        if (play && !s.inv && Math.abs(t.x - s.x) < 1.85 && Math.abs(t.z) < 4.2) {
          s.lives--; A.crash?.(); s.inv = 1.6; s.v *= .45; s.shake = .6; t.z = -500; if (s.lives <= 0) end();
        }
      }
      player.position.x = s.x; player.rotation.z = -(s.steer || 0) * .08; player.rotation.y = -(s.steer || 0) * .12;
      player.visible = !(s.inv > 0 && Math.floor(s.inv * 10) % 2); shield.visible = s.lives > 1;
      const sh = s.shake * (Math.random() - .5);
      cam.position.set(s.x * .6 + sh, 2.4 + sh * .5, 7.2); cam.lookAt(s.x * .3, 1.1, -18); cam.fov = 62 + s.v * .25; cam.updateProjectionMatrix();
      A.update?.();
      if (lapR.current) { lapR.current.textContent = Math.floor(s.dist / 1500) + 1; spdR.current.textContent = Math.round(s.v * 5.5);
        const m = Math.floor(s.t / 60); timeR.current.textContent = `${String(m).padStart(2, "0")}:${(s.t % 60).toFixed(1).padStart(4, "0")}`; }
      composer.render(); raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); removeEventListener("keydown", down); removeEventListener("keyup", up); renderer.dispose(); clearInterval(A.mid); A.ctx?.close(); A.ctx = null; A.update = A.crash = null; };
  }, []);

  const hold = (d) => ({ onPointerDown: (e) => { e.preventDefault(); touch.current = d; }, onPointerUp: () => (touch.current = 0), onPointerLeave: () => (touch.current = 0), onPointerCancel: () => (touch.current = 0) });
  return (
    <div className="stage" ref={box}>
      <canvas ref={cv} aria-label="3D racing game" />
      <div className="pill tl">Lap <b ref={lapR}>1</b></div>
      <div className="pill tl2"><b ref={timeR}>00:00.0</b></div>
      <button className="pill tr2" aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((m) => !m)}>{muted ? "🔇" : "🔊"}</button>
      <button className="pill tr" aria-label="Fullscreen" onClick={() => box.current.requestFullscreen?.()}>⛶</button>
      <div className="pill br"><b ref={spdR}>0</b><small>km/h</small></div>
      <div className="arrows"><button aria-label="Steer left" {...hold(-1)}>‹</button><button aria-label="Steer right" {...hold(1)}>›</button></div>
      {perk && <div className="pill perk3">GOLD CAR + SHIELD</div>}
      {ui.state !== "play" && (
        <div className="ov">
          <h2>{ui.state === "over" ? "CRASHED" : <>ALPHAT<br /><span>RACER</span></>}</h2>
          {ui.state === "over" && <p>Distance {ui.score} m · Best {ui.best} m</p>}
          <button onClick={() => startRef.current()}>{ui.state === "over" ? "RETRY" : "START ENGINE"}</button>
          <p className="hint">← → steer · ↓ brake · on phone hold the arrows</p>
        </div>)}
    </div>
  );
}
