import { useEffect, useRef, useState } from "react";
const W = 360, H = 600, LW = W / 3, CW = 44, CH = 78;

export default function Game({ perk }) {
  const ref = useRef(null);
  const s = useRef({ state: "ready", score: 0 });
  const perkRef = useRef(perk);
  perkRef.current = perk;
  const [best, setBest] = useState(() => { try { return +localStorage.getItem("alphat-best") || 0; } catch { return 0; } });
  const bestRef = useRef(best);

  useEffect(() => {
    const cv = ref.current, x = cv.getContext("2d"), g = s.current;
    const start = () => Object.assign(g, { state: "play", lane: 1, px: LW * 1.5, obs: [], t: 0, score: 0, spawn: 0,
      lives: perkRef.current ? 2 : 1, inv: 0 });
    const move = (d) => { if (g.state === "play") g.lane = Math.max(0, Math.min(2, g.lane + d)); };
    const end = () => {
      g.state = "over";
      const sc = Math.floor(g.score);
      if (sc > bestRef.current) { bestRef.current = sc; setBest(sc); try { localStorage.setItem("alphat-best", sc); } catch {} }
    };
    const key = (e) => {
      if (["ArrowLeft", "a", "A"].includes(e.key)) move(-1);
      else if (["ArrowRight", "d", "D"].includes(e.key)) move(1);
      else if ([" ", "Enter"].includes(e.key) && g.state !== "play") { e.preventDefault(); start(); }
    };
    const tap = (e) => {
      if (g.state !== "play") return start();
      const r = cv.getBoundingClientRect();
      move(e.clientX - r.left < r.width / 2 ? -1 : 1);
    };
    window.addEventListener("keydown", key);
    cv.addEventListener("pointerdown", tap);

    let raf;
    const rr = (a, b, w, h, c) => { x.fillStyle = c; x.beginPath(); x.roundRect(a, b, w, h, 8); x.fill(); };
    const loop = () => {
      const spd = 4 + Math.min(8, (g.score || 0) / 300);
      if (g.state === "play") {
        g.t++; g.score += spd / 8; g.px += (g.lane * LW + LW / 2 - g.px) * 0.25; g.inv = Math.max(0, g.inv - 1);
        g.spawn -= spd;
        if (g.spawn <= 0) { g.obs.push({ lane: Math.floor(Math.random() * 3), y: -80 }); g.spawn = Math.max(90, 200 - g.score / 12); }
        g.obs.forEach((o) => (o.y += spd));
        g.obs = g.obs.filter((o) => o.y < H + 80);
        const cy = H - 130;
        for (const o of g.obs) {
          const ox = o.lane * LW + LW / 2;
          if (Math.abs(ox - g.px) < CW && o.y + CH > cy + 8 && o.y < cy + CH - 8 && !g.inv) {
            g.lives--; g.inv = 70; o.y = H + 200;
            if (g.lives <= 0) end();
          }
        }
      }
      x.fillStyle = "#111114"; x.fillRect(0, 0, W, H);
      x.fillStyle = "rgba(255,212,0,.55)";
      for (let l = 1; l < 3; l++) for (let y = -60 + ((g.t || 0) * spd) % 60; y < H; y += 60) x.fillRect(l * LW - 2, y, 4, 30);
      for (const o of g.obs || []) rr(o.lane * LW + LW / 2 - CW / 2, o.y, CW, CH, "#ff3b30");
      if (g.state !== "ready" && g.px && !(g.inv % 10 > 5)) {
        rr(g.px - CW / 2, H - 130, CW, CH, perkRef.current ? "#ffd400" : "#f5f2e9");
        x.fillStyle = "#111114"; x.fillRect(g.px - 14, H - 112, 28, 16);
        if (g.lives > 1) { x.strokeStyle = "#2de2e6"; x.lineWidth = 3; x.beginPath(); x.roundRect(g.px - CW / 2 - 6, H - 136, CW + 12, CH + 12, 12); x.stroke(); }
      }
      x.fillStyle = "#f5f2e9"; x.font = "700 24px 'Big Shoulders Display',system-ui"; x.textAlign = "left";
      x.fillText(String(Math.floor(g.score || 0)), 14, 34);
      if (g.state !== "play") {
        x.fillStyle = "rgba(10,10,12,.78)"; x.fillRect(0, 0, W, H);
        x.fillStyle = "#ffd400"; x.textAlign = "center";
        x.font = "900 54px 'Big Shoulders Display',system-ui"; x.fillText(g.state === "over" ? "CRASHED" : "ALPHAT RACER", W / 2, 250);
        x.fillStyle = "#f5f2e9"; x.font = "600 15px 'JetBrains Mono',monospace";
        if (g.state === "over") x.fillText(`Score ${Math.floor(g.score)}  ·  Best ${bestRef.current}`, W / 2, 290);
        x.fillText("Tap or press Space to " + (g.state === "over" ? "retry" : "start"), W / 2, 330);
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", key); cv.removeEventListener("pointerdown", tap); };
  }, []);

  return (
    <div className="gamewrap">
      <canvas ref={ref} width={W} height={H} aria-label="Racing game. Move left and right to dodge cars." />
      <p className="hint">Best: {best} · Left/right arrows or A/D · On phone tap the left or right half</p>
    </div>
  );
}
