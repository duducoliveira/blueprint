/**
 * Detalhes de desenho técnico para as cenas 3D: hachuras, alvenaria, cotas, nós, chapas, fissuras.
 * Tudo em metros; os componentes React (Dim3D, Nodes3D) desenham por cima da cena, já projetados.
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { brand } from "../brand";
import { progress } from "../components/Draw";
import { box, Cam, Item, line, project, Style, V3, v } from "./engine";

const { c } = brand;

/** Linhas paralelas (45°) sobre o paralelogramo p0 + s·u + t·w. `step` em fração do lado. */
export const hatch = (p0: V3, u: V3, w: V3, step = 0.08, st: Style = {}, bias = 0.02): Item[] => {
  const out: Item[] = [];
  const P = (s: number, t: number): V3 => v.add(v.add(p0, v.mul(u, s)), v.mul(w, t));
  for (let k = -1 + step; k < 1; k += step) {
    const a: [number, number] = k >= 0 ? [k, 0] : [0, -k];
    const b: [number, number] = k >= 0 ? [1, 1 - k] : [1 + k, 1];
    out.push(line(P(a[0], a[1]), P(b[0], b[1]), { color: c.faint, width: 1.2, ...st }, bias));
  }
  return out;
};

/** Fiadas de tijolo numa face vertical: origem p0, direção horizontal `along` (comprimento L), altura H. */
export const masonry = (p0: V3, along: V3, L: number, H: number, st: Style = {}, holes: { z0: number; z1: number; y0: number; y1: number }[] = []): Item[] => {
  const out: Item[] = [];
  const dir = v.norm(along);
  const course = 0.25;
  const brick = 0.5;
  const inHole = (s: number, y: number) => holes.some((h) => s > h.z0 - 0.02 && s < h.z1 + 0.02 && y > h.y0 - 0.02 && y < h.y1 + 0.02);
  const S: Style = { color: c.line, width: 1, opacity: 0.16, ...st };
  for (let r = 1; r * course < H - 0.01; r++) {
    const y = r * course;
    // fiada horizontal, interrompida nas aberturas
    let s0: number | null = null;
    for (let s = 0; s <= L + 1e-6; s += 0.1) {
      const blocked = inHole(s, y);
      if (!blocked && s0 === null) s0 = s;
      if ((blocked || s >= L - 1e-6) && s0 !== null) {
        const s1 = blocked ? s - 0.1 : L;
        if (s1 > s0) out.push(line(v.add(p0, v.add(v.mul(dir, s0), [0, y, 0])), v.add(p0, v.add(v.mul(dir, s1), [0, y, 0])), S, 0.02));
        s0 = null;
      }
    }
  }
  for (let r = 0; r * course < H - 0.01; r++) {
    const off = r % 2 ? brick / 2 : 0;
    for (let s = off + brick; s < L - 0.05; s += brick) {
      const y0 = r * course;
      if (inHole(s, y0 + course / 2)) continue;
      out.push(line(v.add(p0, v.add(v.mul(dir, s), [0, y0, 0])), v.add(p0, v.add(v.mul(dir, s), [0, Math.min(y0 + course, H), 0])), S, 0.02));
    }
  }
  return out;
};

/** Janela: moldura, folhas (cruz) e peitoril, numa face vertical. */
export const windowAt = (center: V3, along: V3, normal: V3, w = 1.2, h = 1.0, st: Style = {}): Item[] => {
  const d = v.norm(along);
  const n = v.mul(v.norm(normal), 0.02);
  const P = (s: number, t: number): V3 => v.add(v.add(v.add(center, v.mul(d, s)), [0, t, 0]), n);
  const S: Style = { color: c.line, width: 2, ...st };
  const r = (s0: number, t0: number, s1: number, t1: number) => [line(P(s0, t0), P(s1, t0), S, 0.03), line(P(s1, t0), P(s1, t1), S, 0.03), line(P(s1, t1), P(s0, t1), S, 0.03), line(P(s0, t1), P(s0, t0), S, 0.03)];
  return [
    ...r(-w / 2, -h / 2, w / 2, h / 2),
    ...r(-w / 2 + 0.08, -h / 2 + 0.08, w / 2 - 0.08, h / 2 - 0.08),
    line(P(0, -h / 2 + 0.08), P(0, h / 2 - 0.08), S, 0.03),
    line(P(-w / 2 + 0.08, 0.1), P(w / 2 - 0.08, 0.1), S, 0.03),
    line(P(-w / 2 - 0.1, -h / 2 - 0.05), P(w / 2 + 0.1, -h / 2 - 0.05), { ...S, width: 3 }, 0.03),
  ];
};

/** Porta: moldura, folha e maçaneta. */
export const doorAt = (base: V3, along: V3, normal: V3, w = 0.9, h = 2.1, st: Style = {}): Item[] => {
  const d = v.norm(along);
  const n = v.mul(v.norm(normal), 0.02);
  const P = (s: number, t: number): V3 => v.add(v.add(v.add(base, v.mul(d, s)), [0, t, 0]), n);
  const S: Style = { color: c.line, width: 2, ...st };
  return [
    line(P(-w / 2, 0), P(-w / 2, h), S, 0.03),
    line(P(-w / 2, h), P(w / 2, h), S, 0.03),
    line(P(w / 2, h), P(w / 2, 0), S, 0.03),
    line(P(-w / 2 + 0.08, 0), P(-w / 2 + 0.08, h - 0.08), { ...S, width: 1.4 }, 0.03),
    line(P(-w / 2 + 0.08, h - 0.08), P(w / 2 - 0.08, h - 0.08), { ...S, width: 1.4 }, 0.03),
    line(P(w / 2 - 0.08, h - 0.08), P(w / 2 - 0.08, 0), { ...S, width: 1.4 }, 0.03),
    line(P(w / 2 - 0.22, 1.0), P(w / 2 - 0.12, 1.0), { ...S, width: 4 }, 0.03),
  ];
};

/** Bloco de terreno em corte (efeito maquete), com hachura de solo nas laterais. */
export const terrain = (hx = 7, hz = 7, depth = 0.7): Item[] => {
  const st: Style = { color: c.dim, width: 1.5, fill: 1 };
  const out: Item[] = box([-hx, -depth, -hz], [hx, 0, hz], st).map((it) => ({ ...it, bias: -2000 }));
  const S: Style = { color: c.faint, width: 1.1 };
  const side = (p0: V3, u: V3) => hatch(p0, u, [0, depth, 0], 0.035, S, -1999);
  out.push(...side([-hx, -depth, hz], [2 * hx, 0, 0]), ...side([hx, -depth, -hz], [0, 0, 2 * hz]), ...side([-hx, -depth, -hz], [0, 0, 2 * hz]), ...side([-hx, -depth, -hz], [2 * hx, 0, 0]));
  // linha de "grama"/camada superficial
  out.push(line([-hx, -0.12, hz], [hx, -0.12, hz], { color: c.dim, width: 1.2, dash: "6 6" }, -1998), line([hx, -0.12, hz], [hx, -0.12, -hz], { color: c.dim, width: 1.2, dash: "6 6" }, -1998));
  return out;
};

/** Fissura em zigue-zague subindo de `base` na direção `up`, sobre uma face. */
export const crack = (base: V3, up: V3, side: V3, len = 1.1, st: Style = {}): Item[] => {
  const out: Item[] = [];
  const u = v.norm(up);
  const s = v.norm(side);
  let p = base;
  const n = 7;
  for (let i = 1; i <= n; i++) {
    const q = v.add(v.add(base, v.mul(u, (len * i) / n)), v.mul(s, (i % 2 ? 0.09 : -0.05) * (1 - i / (n + 2))));
    out.push(line(p, q, { color: c.danger, width: 3, ...st }, 0.05));
    p = q;
  }
  return out;
};

/** Chapa metálica de ligação (gusset) num nó da tesoura, com parafusos desenhados pelo Nodes3D. */
export const plate = (p: V3, z: number, size = 0.34, st: Style = {}): Item[] =>
  box([p[0] - size / 2, p[1] - size / 2, z], [p[0] + size / 2, p[1] + size / 2, z + 0.015], { color: c.dim, width: 1.4, fill: 0.95, ...st });

// ─── Componentes de sobreposição (SVG já projetado) ────────────────

/** Cota 3D: linha de dimensão afastada `off` da peça, linhas de chamada, traços a 45° e texto. */
export const Dim3D: React.FC<{ cam: Cam; a: V3; b: V3; off: V3; label: string; from?: number; color?: string }> = ({ cam, a, b, off, label, from = 0, color = c.dim }) => {
  const f = useCurrentFrame();
  const p = progress(f, from, 16);
  if (p <= 0) return null;
  const A = project(a, cam);
  const B = project(b, cam);
  const A2 = project(v.add(a, off), cam);
  const B2 = project(v.add(b, off), cam);
  const ext = (P: { x: number; y: number }, Q: { x: number; y: number }) => {
    const dx = Q.x - P.x;
    const dy = Q.y - P.y;
    const L = Math.hypot(dx, dy) || 1;
    return { x: Q.x + (dx / L) * 10, y: Q.y + (dy / L) * 10 };
  };
  const Ae = ext(A, A2);
  const Be = ext(B, B2);
  const mx = (A2.x + B2.x) / 2;
  const my = (A2.y + B2.y) / 2;
  const hx = ((B2.x - A2.x) / 2) * p;
  const hy = ((B2.y - A2.y) / 2) * p;
  const tick = (P: { x: number; y: number }) => `M ${P.x - 8} ${P.y + 8} L ${P.x + 8} ${P.y - 8}`;
  const w = label.length * 15 + 22;
  return (
    <g opacity={p} stroke={color} strokeWidth={2} fill="none">
      <path d={`M ${A.x} ${A.y} L ${Ae.x} ${Ae.y} M ${B.x} ${B.y} L ${Be.x} ${Be.y}`} strokeDasharray="4 5" />
      <path d={`M ${mx - hx} ${my - hy} L ${mx + hx} ${my + hy}`} />
      {p >= 1 && <path d={`${tick(A2)} ${tick(B2)}`} strokeWidth={2.5} />}
      <rect x={mx - w / 2} y={my - 17} width={w} height={34} rx={4} fill={brand.c.bgBottom} stroke="none" />
      <text x={mx} y={my + 8} textAnchor="middle" fill={color} stroke="none" fontFamily={brand.font} fontSize={23} fontWeight={600}>
        {label}
      </text>
    </g>
  );
};

/** Nós articulados (círculo + parafuso) em pontos 3D. */
export const Nodes3D: React.FC<{ cam: Cam; pts: V3[]; from?: number; color?: string; r?: number; opacity?: number }> = ({ cam, pts, from = -999, color = c.line, r = 9, opacity = 1 }) => {
  const f = useCurrentFrame();
  const p = progress(f, from, 8);
  if (p <= 0) return null;
  return (
    <g opacity={p * opacity}>
      {pts.map((q, i) => {
        const P = project(q, cam);
        const R = r * P.s;
        return (
          <g key={i}>
            <circle cx={P.x} cy={P.y} r={R} fill={brand.c.bgBottom} stroke={color} strokeWidth={2.5} />
            <circle cx={P.x} cy={P.y} r={R * 0.35} fill={color} />
          </g>
        );
      })}
    </g>
  );
};

/** Linha de referência tracejada (posição original de uma peça que deformou). */
export const RefLine: React.FC<{ cam: Cam; a: V3; b: V3; from?: number; color?: string }> = ({ cam, a, b, from = -999, color = c.dim }) => {
  const f = useCurrentFrame();
  const p = progress(f, from, 10);
  if (p <= 0) return null;
  const A = project(a, cam);
  const B = project(b, cam);
  return <path d={`M ${A.x} ${A.y} L ${B.x} ${B.y}`} stroke={color} strokeWidth={2} strokeDasharray="10 8" opacity={p} />;
};
