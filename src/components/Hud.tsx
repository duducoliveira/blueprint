import React from "react";
import { brand } from "../brand";

/** Moldura fixa: carimbo do episódio, handle e número da "folha" (cena). */
export const Hud: React.FC<{ episode: string; title: string; sheet: number; sheets: number }> = ({ episode, title, sheet, sheets }) => {
  const s: React.CSSProperties = { fontFamily: brand.font, color: brand.c.dim, fontSize: 22, letterSpacing: 4, fontWeight: 500 };
  return (
    <>
      <div style={{ position: "absolute", top: 110, left: 64, ...s }}>
        <span style={{ color: brand.c.accent }}>{episode}</span> · {title.toUpperCase()}
      </div>
      <div style={{ position: "absolute", top: 110, right: 64, ...s }}>{brand.handle.toUpperCase()}</div>
      <div style={{ position: "absolute", top: 150, left: 64, right: 64, height: 2, background: brand.c.faint }} />
      <div style={{ position: "absolute", top: 166, right: 64, ...s, fontSize: 18 }}>
        ESC 1:50 · FOLHA {String(sheet).padStart(2, "0")}/{String(sheets).padStart(2, "0")}
      </div>
    </>
  );
};
