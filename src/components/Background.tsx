import React from "react";
import { AbsoluteFill } from "remotion";
import { brand } from "../brand";

/** Fundo blueprint: gradiente azul, grade fina + grade principal, vinheta. */
export const Background: React.FC = () => {
  const { c, width, height } = brand;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${c.bgTop} 0%, ${c.bgBottom} 100%)` }}>
      <svg width={width} height={height} style={{ position: "absolute" }}>
        <defs>
          <pattern id="minor" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke={c.grid} strokeWidth="1" />
          </pattern>
          <pattern id="major" width="150" height="150" patternUnits="userSpaceOnUse" x="15" y="0">
            <rect width="150" height="150" fill="url(#minor)" />
            <path d="M 150 0 L 0 0 0 150" fill="none" stroke={c.gridMajor} strokeWidth="1.5" />
          </pattern>
          <radialGradient id="vig" cx="50%" cy="45%" r="75%">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
          </radialGradient>
        </defs>
        <rect width={width} height={height} fill="url(#major)" />
        <rect width={width} height={height} fill="url(#vig)" />
      </svg>
    </AbsoluteFill>
  );
};
