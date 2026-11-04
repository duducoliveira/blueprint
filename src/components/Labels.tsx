import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { brand } from "../brand";
import { progress } from "./Draw";

const pop = (frame: number, from: number) =>
  interpolate(frame, [from, from + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.8)) });

/** Etiqueta com linha de chamada: ponto -> cotovelo -> caixa de texto. Usar dentro de <svg>. */
export const Callout: React.FC<{
  at: [number, number];
  label: [number, number];
  text: string;
  sub?: string;
  from?: number;
  color?: string;
  align?: "left" | "right";
}> = ({ at, label, text, sub, from = 0, color = brand.c.line, align = "left" }) => {
  const frame = useCurrentFrame();
  const p = progress(frame, from, 12);
  if (p <= 0) return null;
  const s = pop(frame, from + 6);
  const w = Math.max(text.length, (sub ?? "").length * 0.72) * 19 + 36;
  const h = sub ? 78 : 50;
  const bx = align === "left" ? label[0] : label[0] - w;
  const lx = at[0] + (label[0] - at[0]) * p;
  const ly = at[1] + (label[1] - at[1]) * p;
  return (
    <g>
      <circle cx={at[0]} cy={at[1]} r={7} fill={color} />
      <path d={`M ${at[0]} ${at[1]} L ${lx} ${ly}`} stroke={color} strokeWidth={2.5} />
      <g opacity={s} transform={`translate(${label[0]} ${label[1]}) scale(${0.6 + 0.4 * s}) translate(${-label[0]} ${-label[1]})`}>
        <rect x={bx} y={label[1] - h / 2} width={w} height={h} rx={6} fill={brand.c.bgBottom} stroke={color} strokeWidth={2.5} />
        <text x={bx + 18} y={label[1] + (sub ? -6 : 10)} fill={color} fontFamily={brand.font} fontSize={30} fontWeight={700} letterSpacing={1.5}>
          {text}
        </text>
        {sub && (
          <text x={bx + 18} y={label[1] + 24} fill={brand.c.dim} fontFamily={brand.font} fontSize={20} fontWeight={500} letterSpacing={2}>
            {sub}
          </text>
        )}
      </g>
    </g>
  );
};

/** Número grande com contador (estilo HUD das referências). HTML, posicionado em absoluto. */
export const Stat: React.FC<{
  label: string;
  value: number;
  unit?: string;
  sub?: string;
  from?: number;
  dur?: number;
  x: number;
  y: number;
  decimals?: number;
  align?: "left" | "center" | "right";
  color?: string;
  size?: number;
}> = ({ label, value, unit, sub, from = 0, dur = 24, x, y, decimals = 0, align = "left", color = brand.c.line, size = 120 }) => {
  const frame = useCurrentFrame();
  const o = progress(frame, from - 6, 8);
  if (o <= 0) return null;
  const v = interpolate(frame, [from, from + dur], [0, value], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const txt = v.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const tx = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translateX(${tx}) translateY(${(1 - o) * 20}px)`, opacity: o, fontFamily: brand.font, textAlign: align, color }}>
      <div style={{ fontSize: 26, letterSpacing: 6, color: brand.c.dim, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
        {txt}
        {unit && <span style={{ fontSize: size * 0.3, fontWeight: 700, marginLeft: 12, letterSpacing: 2 }}>{unit}</span>}
      </div>
      {sub && <div style={{ whiteSpace: "nowrap", fontSize: 24, letterSpacing: 3, color: brand.c.dim, marginTop: 6 }}>{sub}</div>}
    </div>
  );
};

/** Texto que aparece com leve subida. */
export const Reveal: React.FC<{ from?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ from = 0, style, children }) => {
  const frame = useCurrentFrame();
  const o = progress(frame, from, 12);
  return <div style={{ position: "absolute", fontFamily: brand.font, opacity: o, transform: `translateY(${(1 - o) * 24}px)`, ...style }}>{children}</div>;
};
