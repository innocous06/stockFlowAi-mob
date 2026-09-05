import React, { useEffect, useRef, useState } from 'react';

// ─── helpers ────────────────────────────────────────────────────────────────
const hexToRgb = (hex: string) => {
  const c = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(c)) return null;
  return { r: parseInt(c.slice(0,2),16), g: parseInt(c.slice(2,4),16), b: parseInt(c.slice(4,6),16) };
};
const mixRgb = (a: {r:number,g:number,b:number}, b: {r:number,g:number,b:number}, t: number) => ({
  r: Math.round(a.r + (b.r - a.r) * t),
  g: Math.round(a.g + (b.g - a.g) * t),
  b: Math.round(a.b + (b.b - a.b) * t),
});
const rgbCss = (c: {r:number,g:number,b:number}) => `rgb(${c.r},${c.g},${c.b})`;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// ─── types ────────────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  startX: number; startY: number;
  targetX: number; targetY: number;
  size: number; color: string;
  seed: number; depth: number; delay: number;
}

// ─── config ──────────────────────────────────────────────────────────────
const TEXT        = 'StockFlow AI';
const PARTICLE_SZ = 3;
const DENSITY     = 5;
const COLOR       = '#B8703D';          // particle base  → amber copper
const HIGHLIGHT   = '#7A3E15';          // particle tip   → dark copper
const SCATTER     = 200;
const GATHER_DUR  = 1500;
const STAGGER     = 380;
const BG          = '#FFF8F0';          // warm cream / off-white
const GLOW_COLOR  = 'rgba(184,112,61,0.45)';

interface SplashScreenProps { onDone: () => void; }

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const stateRef     = useRef({
    particles: [] as Particle[],
    raf: null as number | null,
    gathering: false,
    gatherStart: 0,
    width: 0,
    height: 0,
    dpr: 1,
  });
  const [fading, setFading] = useState(false);

  /* ── build + animate ─────────────────────────────────────────────── */
  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;

    // ── sample text into particles ────────────────────────────────────
    const sample = async () => {
      const rect = container.getBoundingClientRect();
      s.width  = Math.floor(rect.width);
      s.height = Math.floor(rect.height);
      if (s.width <= 0 || s.height <= 0) return;

      s.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = Math.max(1, Math.floor(s.width  * s.dpr));
      canvas.height = Math.max(1, Math.floor(s.height * s.dpr));
      canvas.style.width  = '100%';
      canvas.style.height = '100%';
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);

      // pick a font size that fits
      const fontSize = Math.min(s.width * 0.13, 88);
      const font = `800 ${fontSize}px 'Lora', 'Newsreader', Georgia, serif`;

      // wait for fonts
      try { await document.fonts.load(font); await document.fonts.ready; } catch {}

      // offscreen render
      const off = document.createElement('canvas');
      const oCtx = off.getContext('2d', { willReadFrequently: true });
      if (!oCtx) return;

      oCtx.font = font;
      const m = oCtx.measureText(TEXT);
      const left    = Math.ceil(m.actualBoundingBoxLeft    || 0);
      const right   = Math.ceil(m.actualBoundingBoxRight   || m.width);
      const ascent  = Math.ceil(m.actualBoundingBoxAscent  || fontSize * 0.78);
      const descent = Math.ceil(m.actualBoundingBoxDescent || fontSize * 0.22);
      const pad = Math.max(10, Math.ceil(fontSize * 0.08));
      off.width  = Math.max(1, left + right + pad * 2);
      off.height = Math.max(1, ascent + descent + pad * 2);
      oCtx.clearRect(0, 0, off.width, off.height);
      oCtx.font = font;
      oCtx.textAlign = 'left';
      oCtx.textBaseline = 'alphabetic';
      oCtx.fillStyle = '#ffffff';
      oCtx.fillText(TEXT, pad - left, pad + ascent);

      const imgData = oCtx.getImageData(0, 0, off.width, off.height);
      const step    = Math.max(2, Math.floor(DENSITY));
      const targets: { x: number; y: number; alpha: number }[] = [];

      for (let py = 0; py < off.height; py += step) {
        for (let px = 0; px < off.width; px += step) {
          const a = imgData.data[(py * off.width + px) * 4 + 3];
          if (a > 40) {
            targets.push({
              x: s.width  / 2 - off.width  / 2 + px,
              y: s.height / 2 - off.height / 2 + py,
              alpha: a / 255,
            });
          }
        }
      }

      const maxP   = Math.max(900, Math.min(5200, Math.floor((s.width * s.height) / 90)));
      const stride = Math.max(1, Math.ceil(targets.length / maxP));
      const sel    = targets.filter((_, i) => i % stride === 0);
      const baseRgb = hexToRgb(COLOR)!;
      const hlRgb   = hexToRgb(HIGHLIGHT)!;

      s.particles = sel.map((t, idx) => {
        const seed  = ((idx * 9301 + 49297) % 233280) / 233280;
        const depth = 0.45 + (((idx * 233 + 97) % 1000) / 1000) * 0.9;
        const blend = clamp(t.x / Math.max(1, s.width) + (seed - 0.5) * 0.35, 0, 1);
        const col   = rgbCss(mixRgb(baseRgb, hlRgb, blend));
        const angle = seed * Math.PI * 2;
        const dist  = SCATTER * (0.35 + depth * 0.75);
        const sx = t.x + Math.cos(angle) * dist + (seed - 0.5)  * SCATTER * 0.45;
        const sy = t.y + Math.sin(angle) * dist + (depth - 0.9) * SCATTER * 0.45;
        return { x: sx, y: sy, startX: sx, startY: sy,
                 targetX: t.x, targetY: t.y,
                 size: Math.max(0.6, PARTICLE_SZ * (0.75 + t.alpha * 0.45)),
                 color: col, seed, depth, delay: seed * STAGGER };
      });

      // scatter → gather
      const now = performance.now();
      s.gatherStart = now;
      s.gathering   = true;

      if (s.raf !== null) cancelAnimationFrame(s.raf);
      s.raf = requestAnimationFrame(render);
    };

    // ── render loop ───────────────────────────────────────────────────
    const render = (now: number) => {
      ctx.clearRect(0, 0, s.width, s.height);
      ctx.shadowBlur  = PARTICLE_SZ * 3;
      ctx.shadowColor = GLOW_COLOR;

      let complete = true;

      for (const p of s.particles) {
        let bx = p.targetX, by = p.targetY, progress = 1;

        if (s.gathering) {
          const local = (now - s.gatherStart - p.delay) / Math.max(1, GATHER_DUR);
          progress = clamp(local, 0, 1);
          const eased = easeOutCubic(progress);
          bx = p.startX + (p.targetX - p.startX) * eased;
          by = p.startY + (p.targetY - p.startY) * eased;
          if (progress < 1) complete = false;
        } else {
          // idle drift
          const t2 = now * 0.001;
          bx += Math.sin(t2 * 0.9 + p.seed * 10) * 0.7 * p.depth;
          by += Math.cos(t2 * 0.75 + p.depth * 10) * 0.7 * p.depth;
        }

        const follow = 0.22;
        p.x += (bx - p.x) * follow;
        p.y += (by - p.y) * follow;

        ctx.globalAlpha = clamp(0.35 + progress * 0.65, 0, 1);
        ctx.fillStyle   = p.color;

        if (p.size <= 2.1) {
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;
      if (s.gathering && complete) s.gathering = false;

      s.raf = requestAnimationFrame(render);
    };

    sample();

    // ── auto-dismiss ──────────────────────────────────────────────────
    const fadeT = setTimeout(() => setFading(true),  1800);
    const doneT = setTimeout(() => onDone(),         2300);

    return () => {
      clearTimeout(fadeT);
      clearTimeout(doneT);
      if (s.raf !== null) cancelAnimationFrame(s.raf);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: BG,
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: 'all',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', position: 'relative' }}
      >
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%' }}
          aria-hidden="true"
        />
        <span style={{
          position: 'absolute', width: 1, height: 1,
          overflow: 'hidden', clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap', border: 0,
        }}>
          {TEXT}
        </span>
      </div>
    </div>
  );
};
