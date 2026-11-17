import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const ROAD = 12, FAR = 420, LANES = [-4, 0, 4];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const tex = (w, h, draw, rep) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
const facade = (base) => tex(128, 128, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let y = 8; y < h - 8; y += 30) for (let x = 8; x < w - 8; x += 30) { g.fillStyle = Math.random() < 0.4 ? "#ffd27a" : "#2a2f45"; g.fillRect(x, y, 18, 20); }
}, true);

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
    [[-.45, r], [.45, b]].forEach(([x, m]) => { const l = new THREE.Mesh(new B(.7, .16, .3), m); l.position.set(x, 1.45, .3); g.add(l); });
    g.userData.lights = [r, b];
  }
  g.userData.body = body; return g;
}

export default function Game({ perk }) {
  const box = useRef(null), cv = useRef(null), startRef = useRef(null), perkRef = useRef(perk);
  const lapR = useRef(null), timeR = useRef(null), spdR = useRef(null), touch = useRef(0);
  perkRef.current = perk;
  const [ui, setUi] = useState({ state: "ready", score: 0, best: (() => { try { return +localStorage.getItem("alphat-best3") || 0; } catch { return 0; } })() });
  const bestRef = useRef(ui.best);

  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({ canvas: cv.current, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(64, 1.6, .1, 600);
    scene.background = tex(2, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h);
      [[0, "#2d2461"], [.5, "#b4577a"], [.85, "#ff9f6b"], [1, "#ffd09a"]].forEach(([p, c]) => gr.addColorStop(p, c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    scene.fog = new THREE.Fog(0xf0a878, 50, 300);
    scene.add(new THREE.HemisphereLight(0xffd2a8, 0x2a2a40, 1.2));
    const sun = new THREE.DirectionalLight(0xffb070, 1.3); sun.position.set(-20, 12, -30); scene.add(sun);

    const BM = THREE.MeshBasicMaterial, scroll = [];
    const roadTex = tex(384, 256, (g, w, h) => {
      g.fillStyle = "#202024"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      g.fillStyle = "#f5f2e9"; g.fillRect(8, 0, 6, h); g.fillRect(w - 14, 0, 6, h);
      g.fillStyle = "#ffd400"; for (const x of [w / 3, 2 * w / 3]) g.fillRect(x - 3, 20, 6, h / 2.2);
    }, true);
    roadTex.repeat.set(1, FAR / 8);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, FAR), new BM({ map: roadTex })); road.rotation.x = -Math.PI / 2; road.position.z = -FAR / 2 + 30; scene.add(road);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, FAR), new BM({ color: 0x17171c })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, -.02, -FAR / 2 + 30); scene.add(ground);
    for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(3, .3, FAR), new BM({ color: 0x8c8a88 })); w.position.set(sd * (ROAD / 2 + 1.5), .15, -FAR / 2 + 30); scene.add(w); }

    const facades = ["#7a5a48", "#5c5f72", "#8a6a52", "#4f5a52"].map(facade);
    const bill = tex(512, 230, (g, w) => { g.fillStyle = "#0b0b0d"; g.fillRect(0, 0, w, 230); g.fillStyle = "#ffd400"; g.textAlign = "center"; g.font = "900 96px Impact, sans-serif"; g.fillText("ALPHAT RACER", w / 2, 120);
      g.fillStyle = "#f5f2e9"; g.font = "600 28px monospace"; g.fillText("LIVE ON VIBE/VIBE TESTNET", w / 2, 180); });
    const NB = 26, SP = 16;
    for (const sd of [-1, 1]) for (let i = 0; i < NB; i++) {
      const w = rnd(9, 15), h = rnd(14, 38), geo = new THREE.BoxGeometry(w, h, 14), uv = geo.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * w / 8, uv.getY(k) * h / 8);
      const m = new THREE.Mesh(geo, new BM({ map: pick(facades), color: 0xd8c0b0 })); m.position.set(sd * (ROAD / 2 + 3 + w / 2), h / 2, 30 - i * SP);
      if (i % 7 === 0) { const b = new THREE.Mesh(new THREE.PlaneGeometry(10, 4.5), new BM({ map: bill })); b.rotation.y = -sd * Math.PI / 2; b.position.set(-sd * (w / 2 - 1), h / 2 + 2.5, 0); m.add(b); }
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
    shield.scale.set(.9, .55, 1.5); shield.position.y = .9; player.add(shield);
    const traffic = [];
    const spawn = (t) => { t.police = !!t.isPolice; t.x = pick(LANES); t.sp = t.police ? 0 : rnd(10, 20);
      t.z = t.police ? 45 : -rnd(330, 420); t.mesh.position.set(t.x, 0, t.z); };
    for (let i = 0; i < 11; i++) {
      const isPolice = i < 2, mesh = makeCar(isPolice ? 0x15151a : pick([0xc0392b, 0x2980b9, 0x27ae60, 0x8e44ad, 0xe67e22, 0xbdc3c7]), isPolice);
      const t = { mesh, isPolice }; spawn(t); if (!isPolice) t.z = -rnd(40, 400); scene.add(mesh); traffic.push(t);
    }

    const s = { state: "ready", v: 10, x: 0, dist: 0, t: 0, lives: 1, inv: 0, shake: 0 }, keys = { l: 0, r: 0, b: 0 };
    const start = () => {
      Object.assign(s, { state: "play", v: 12, x: 0, dist: 0, t: 0, inv: 0, shake: 0, lives: perkRef.current ? 2 : 1 });
      player.userData.body.material.color.set(perkRef.current ? 0xffd400 : 0xf5f2e9);
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
    const resize = () => { const w = box.current.clientWidth, h = box.current.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
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
        if (t.mesh.userData.lights) { const on = Math.sin(flash * 14) > 0; t.mesh.userData.lights[0].color.set(on ? 0xff2a2a : 0x330808); t.mesh.userData.lights[1].color.set(on ? 0x081433 : 0x2a6bff); }
        if (play && !s.inv && Math.abs(t.x - s.x) < 1.85 && Math.abs(t.z) < 4.2) {
          s.lives--; s.inv = 1.6; s.v *= .45; s.shake = .6; t.z = -500; if (s.lives <= 0) end();
        }
      }
      player.position.x = s.x; player.rotation.z = -(s.steer || 0) * .08; player.rotation.y = -(s.steer || 0) * .12;
      player.visible = !(s.inv > 0 && Math.floor(s.inv * 10) % 2); shield.visible = s.lives > 1;
      const sh = s.shake * (Math.random() - .5);
      cam.position.set(s.x * .6 + sh, 3.4 + sh * .5, 8.5); cam.lookAt(s.x * .3, 1.4, -20); cam.fov = 62 + s.v * .25; cam.updateProjectionMatrix();
      if (lapR.current) { lapR.current.textContent = Math.floor(s.dist / 1500) + 1; spdR.current.textContent = Math.round(s.v * 5.5);
        const m = Math.floor(s.t / 60); timeR.current.textContent = `${String(m).padStart(2, "0")}:${(s.t % 60).toFixed(1).padStart(4, "0")}`; }
      renderer.render(scene, cam); raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); removeEventListener("keydown", down); removeEventListener("keyup", up); renderer.dispose(); };
  }, []);

  const hold = (d) => ({ onPointerDown: (e) => { e.preventDefault(); touch.current = d; }, onPointerUp: () => (touch.current = 0), onPointerLeave: () => (touch.current = 0), onPointerCancel: () => (touch.current = 0) });
  return (
    <div className="stage" ref={box}>
      <canvas ref={cv} aria-label="3D racing game" />
      <div className="pill tl">Lap <b ref={lapR}>1</b></div>
      <div className="pill tl2"><b ref={timeR}>00:00.0</b></div>
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
