/**
 * Mini motor 3D em SVG para os desenhos "planta em perspectiva".
 * Unidades do mundo em METROS, Y para cima. A câmera orbita um alvo (yaw/pitch) com leve perspectiva.
 * Desenho por ordenação de profundidade (painter's algorithm): suficiente para peças, paredes e telhados.
 */
import React from "react";
import { brand } from "../brand";

export type V3 = [number, number, number];
export type Cam = {
  yaw: number; // graus (gira em volta do eixo vertical)
  pitch: number; // graus (inclinação para baixo)
  zoom: number; // pixels por metro
  target: V3; // ponto que fica no centro da tela
  cx?: number;
  cy?: number;
  dist?: number; // distância da câmera (m) — menor = mais perspectiva
};

export const v = {
  add: (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k],
  lerp: (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  cross: (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  dot: (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  len: (a: V3) => Math.hypot(a[0], a[1], a[2]),
  norm: (a: V3): V3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  /** gira o ponto p em volta de um eixo paralelo a Z que passa por `pivot` */
  rotZ: (p: V3, pivot: V3, deg: number): V3 => {
    const t = (deg * Math.PI) / 180;
    const x = p[0] - pivot[0];
    const y = p[1] - pivot[1];
    return [pivot[0] + x * Math.cos(t) - y * Math.sin(t), pivot[1] + x * Math.sin(t) + y * Math.cos(t), p[2]];
  },
};

export const project = (p: V3, c: Cam) => {
  const yaw = (c.yaw * Math.PI) / 180;
  const pit = (c.pitch * Math.PI) / 180;
  const x = p[0] - c.target[0];
  const y = p[1] - c.target[1];
  const z = p[2] - c.target[2];
  const x1 = x * Math.cos(yaw) - z * Math.sin(yaw);
  const z1 = x * Math.sin(yaw) + z * Math.cos(yaw);
  const y2 = y * Math.cos(pit) - z1 * Math.sin(pit);
  const z2 = y * Math.sin(pit) + z1 * Math.cos(pit); // + = mais perto da câmera
  const d = c.dist ?? 40;
  const s = d / Math.max(d - z2, 0.1);
  return { x: (c.cx ?? 540) + x1 * c.zoom * s, y: (c.cy ?? 1000) - y2 * c.zoom * s, depth: z2, s };
};

// ─── Primitivas ────────────────────────────────────────────────────
export type Style = {
  color?: string; // cor do traço e do tom da face
  fill?: number; // 0..1 opacidade do preenchimento
  width?: number;
  opacity?: number;
  dash?: string;
  glow?: boolean;
  tint?: number; // 0..1 quanto a face puxa para a cor
};

export type Item =
  | { kind: "poly"; pts: V3[]; st: Style; bias?: number }
  | { kind: "line"; a: V3; b: V3; st: Style; bias?: number };

const DEF: Required<Pick<Style, "color" | "fill" | "width" | "opacity" | "tint">> = {
  color: brand.c.line,
  fill: 0.92,
  width: 2.5,
  opacity: 1,
  tint: 0,
};

export const line = (a: V3, b: V3, st: Style = {}, bias = 0): Item => ({ kind: "line", a, b, st, bias });
export const poly = (pts: V3[], st: Style = {}, bias = 0): Item => ({ kind: "poly", pts, st, bias });

/** Caixa alinhada aos eixos (parede, laje, bloco). */
export const box = (min: V3, max: V3, st: Style = {}, xf?: (p: V3) => V3): Item[] => {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const P = (x: number, y: number, z: number): V3 => (xf ? xf([x, y, z]) : [x, y, z]);
  const c = [P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0), P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)];
  const f = [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [3, 2, 6, 7],
    [0, 3, 7, 4],
    [1, 2, 6, 5],
  ];
  return f.map((q) => poly(q.map((i) => c[i]), st));
};

/** Barra de seção retangular de `a` até `b` (peça de madeira). `grow` 0..1 anima o crescimento. */
export const bar = (a: V3, b: V3, w = 0.14, h = 0.2, st: Style = {}, grow = 1): Item[] => {
  if (grow <= 0) return [];
  const e = v.lerp(a, b, grow);
  const d = v.norm(v.sub(e, a));
  const ref: V3 = Math.abs(d[2]) > 0.9 ? [0, 1, 0] : [0, 0, 1];
  const u = v.mul(v.norm(v.cross(d, ref)), h / 2); // altura da seção (no plano da tesoura)
  const s = v.mul(v.norm(v.cross(d, u)), w / 2); // largura (espessura)
  const c = (p: V3, i: number, j: number) => v.add(v.add(p, v.mul(u, i)), v.mul(s, j));
  const A = [c(a, 1, 1), c(a, -1, 1), c(a, -1, -1), c(a, 1, -1)];
  const B = [c(e, 1, 1), c(e, -1, 1), c(e, -1, -1), c(e, 1, -1)];
  const out: Item[] = [poly(A, st), poly(B, st)];
  for (let i = 0; i < 4; i++) out.push(poly([A[i], A[(i + 1) % 4], B[(i + 1) % 4], B[i]], st));
  return out;
};

/** Barra curva (peça envergando): `sag` metros de flecha no meio, na direção `dir`. */
export const bentBar = (a: V3, b: V3, sag: number, dir: V3 = [0, -1, 0], w = 0.14, h = 0.2, st: Style = {}, n = 8): Item[] => {
  const out: Item[] = [];
  const pt = (t: number) => v.add(v.lerp(a, b, t), v.mul(dir, sag * Math.sin(Math.PI * t)));
  for (let i = 0; i < n; i++) out.push(...bar(pt(i / n), pt((i + 1) / n), w, h, st));
  return out;
};

/** Grade do chão (plano y=0). */
export const groundGrid = (half = 8, step = 1, st: Style = {}): Item[] => {
  const out: Item[] = [];
  for (let i = -half; i <= half; i += step) {
    out.push(line([i, 0, -half], [i, 0, half], { color: brand.c.faint, width: 1.2, ...st }, -1000));
    out.push(line([-half, 0, i], [half, 0, i], { color: brand.c.faint, width: 1.2, ...st }, -1000));
  }
  return out;
};

// ─── Cor ───────────────────────────────────────────────────────────
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(",")})`;
};
const LIGHT = v.norm([-0.45, 0.85, 0.55]);
const DARK = "#14315f";
const LIT = "#2f63ad";

// ─── Renderização ──────────────────────────────────────────────────
export const Scene3D: React.FC<{ cam: Cam; items: Item[]; children?: React.ReactNode }> = ({ cam, items, children }) => {
  const drawn = items.map((it, k) => {
    if (it.kind === "line") {
      const a = project(it.a, cam);
      const b = project(it.b, cam);
      return { k, it, depth: (a.depth + b.depth) / 2 + (it.bias ?? 0), a, b, pts: null as null | { x: number; y: number }[] };
    }
    const pts = it.pts.map((p) => project(p, cam));
    const depth = pts.reduce((s, p) => s + p.depth, 0) / pts.length + (it.bias ?? 0);
    return { k, it, depth, pts, a: null, b: null };
  });
  drawn.sort((p, q) => p.depth - q.depth);
  return (
    <svg width={brand.width} height={brand.height} style={{ position: "absolute" }}>
      {drawn.map(({ k, it, pts, a, b }) => {
        const st = { ...DEF, ...it.st };
        if (it.kind === "line" && a && b) {
          return (
            <line
              key={k}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={st.color}
              strokeWidth={st.width}
              strokeDasharray={st.dash}
              strokeLinecap="round"
              opacity={st.opacity}
              style={st.glow ? { filter: `drop-shadow(0 0 6px ${st.color})` } : undefined}
            />
          );
        }
        if (it.kind === "poly" && pts) {
          const w = it.pts;
          const n = v.norm(v.cross(v.sub(w[1], w[0]), v.sub(w[2], w[0])));
          const lam = Math.abs(v.dot(n, LIGHT));
          const base = mix(DARK, LIT, lam);
          const fill = st.tint > 0 && st.color.startsWith("#") ? mix(DARK, st.color, st.tint * (0.45 + 0.55 * lam)) : base;
          return (
            <polygon
              key={k}
              points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
              fill={fill}
              fillOpacity={st.fill}
              stroke={st.color}
              strokeWidth={st.width}
              strokeLinejoin="round"
              strokeDasharray={st.dash}
              opacity={st.opacity}
              style={st.glow ? { filter: `drop-shadow(0 0 5px ${st.color})` } : undefined}
            />
          );
        }
        return null;
      })}
      {children}
    </svg>
  );
};
