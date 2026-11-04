import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";
import { Word } from "../timeline";

/** Agrupa palavras em blocos curtos (máx. `max` palavras, quebra em pontuação). */
const chunk = (words: Word[], max = 3) => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= max || /[.,?!;:]$/.test(w.text)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
};

/** Legenda palavra-a-palavra: a palavra falada no momento fica amarela. */
export const Captions: React.FC<{ words: Word[]; y?: number }> = ({ words, y = 1470 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const groups = chunk(words);
  const g = groups.find((gr, i) => t >= gr[0].start - 0.05 && (i === groups.length - 1 || t < groups[i + 1][0].start - 0.05));
  if (!g) return null;
  return (
    <div style={{ position: "absolute", top: y, left: 60, right: 60, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0 22px" }}>
      {g.map((w, i) => {
        const shown = t >= w.start - 0.03;
        const active = t >= w.start - 0.03 && t < (g[i + 1]?.start ?? w.end + 0.35);
        const s = interpolate(t, [w.start - 0.03, w.start + 0.09], [0.7, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.back(2.5)),
        });
        return (
          <span
            key={i}
            style={{
              fontFamily: brand.font,
              fontWeight: 800,
              fontSize: 72,
              lineHeight: 1.2,
              color: active ? brand.c.accent : brand.c.line,
              opacity: shown ? 1 : 0,
              transform: `scale(${shown ? s : 0.7})`,
              display: "inline-block",
              textShadow: "0 4px 18px rgba(8,22,50,0.75)",
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
