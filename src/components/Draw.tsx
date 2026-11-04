import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { evolvePath } from "@remotion/paths";
import { brand } from "../brand";

const ease = Easing.bezier(0.45, 0, 0.2, 1);

export const progress = (frame: number, from: number, dur: number) =>
  interpolate(frame, [from, from + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/** Traço que se desenha sozinho (efeito caneta). `from`/`dur` em frames. */
export const Stroke: React.FC<{
  d: string;
  from?: number;
  dur?: number;
  color?: string;
  width?: number;
  dash?: string;
  opacity?: number;
  fill?: string;
  glow?: boolean;
}> = ({ d, from = 0, dur = 20, color = brand.c.line, width = 4, dash, opacity = 1, fill = "none", glow }) => {
  const frame = useCurrentFrame();
  const p = progress(frame, from, dur);
  if (p <= 0) return null;
  const ev = dash ? null : evolvePath(p, d);
  return (
    <path
      d={d}
      fill={fill}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={dash ? opacity * p : opacity}
      strokeDasharray={dash ?? ev!.strokeDasharray}
      strokeDashoffset={dash ? undefined : ev!.strokeDashoffset}
      style={glow ? { filter: `drop-shadow(0 0 8px ${color})` } : undefined}
    />
  );
};

/** Nó/junta articulada. */
export const Joint: React.FC<{ x: number; y: number; from?: number; r?: number; color?: string }> = ({
  x,
  y,
  from = 0,
  r = 9,
  color = brand.c.line,
}) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [from, from + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) });
  if (s <= 0) return null;
  return <circle cx={x} cy={y} r={r * s} fill={brand.c.bgBottom} stroke={color} strokeWidth={3} />;
};

/** Seta (força). Desenha a haste e depois a ponta. */
export const Arrow: React.FC<{
  from: [number, number];
  to: [number, number];
  start?: number;
  dur?: number;
  color?: string;
  width?: number;
  head?: number;
}> = ({ from, to, start = 0, dur = 12, color = brand.c.accent, width = 5, head = 18 }) => {
  const frame = useCurrentFrame();
  const p = progress(frame, start, dur);
  if (p <= 0) return null;
  const x = from[0] + (to[0] - from[0]) * p;
  const y = from[1] + (to[1] - from[1]) * p;
  const a = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const h1 = [x - head * Math.cos(a - 0.45), y - head * Math.sin(a - 0.45)];
  const h2 = [x - head * Math.cos(a + 0.45), y - head * Math.sin(a + 0.45)];
  return (
    <g stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={`M ${from[0]} ${from[1]} L ${x} ${y}`} />
      <path d={`M ${h1[0]} ${h1[1]} L ${x} ${y} L ${h2[0]} ${h2[1]}`} />
    </g>
  );
};

/** Cota de desenho técnico (linha de dimensão com traços nas pontas e texto). */
export const Dimension: React.FC<{ x1: number; x2: number; y: number; label: string; from?: number }> = ({
  x1,
  x2,
  y,
  label,
  from = 0,
}) => {
  const frame = useCurrentFrame();
  const p = progress(frame, from, 18);
  if (p <= 0) return null;
  const mid = (x1 + x2) / 2;
  const half = ((x2 - x1) / 2) * p;
  const c = brand.c.dim;
  return (
    <g stroke={c} strokeWidth={2} opacity={p}>
      <path d={`M ${mid - half} ${y} L ${mid + half} ${y}`} />
      <path d={`M ${x1} ${y - 14} L ${x1} ${y + 14} M ${x2} ${y - 14} L ${x2} ${y + 14}`} />
      <path d={`M ${x1 - 8} ${y + 8} L ${x1 + 8} ${y - 8} M ${x2 - 8} ${y + 8} L ${x2 + 8} ${y - 8}`} />
      <rect x={mid - 70} y={y - 20} width={140} height={40} fill={brand.c.bgBottom} stroke="none" />
      <text x={mid} y={y + 9} textAnchor="middle" fill={c} stroke="none" fontFamily={brand.font} fontSize={26} fontWeight={500}>
        {label}
      </text>
    </g>
  );
};

/** Hachura de solo (traços diagonais sob a linha do chão). */
export const Ground: React.FC<{ x1: number; x2: number; y: number; from?: number }> = ({ x1, x2, y, from = 0 }) => {
  const ticks = [];
  for (let x = x1 + 10; x < x2; x += 26) ticks.push(`M ${x} ${y + 4} L ${x - 20} ${y + 26}`);
  return (
    <g>
      <Stroke d={`M ${x1} ${y} L ${x2} ${y}`} from={from} dur={18} width={3} />
      <Stroke d={ticks.join(" ")} from={from + 8} dur={14} width={2} color={brand.c.faint} dash="none" />
    </g>
  );
};
