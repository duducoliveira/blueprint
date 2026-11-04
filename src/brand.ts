import { loadFont } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "700", "800"], subsets: ["latin", "latin-ext"] });

/** Identidade visual do canal. Troque o handle e as cores aqui — vale para todos os episódios. */
export const brand = {
  handle: "@seucanal",
  name: "BLUEPRINT",
  font: fontFamily,
  width: 1080,
  height: 1920,
  fps: 30,
  c: {
    bgTop: "#22508f",
    bgBottom: "#16376e",
    grid: "rgba(190,215,255,0.07)",
    gridMajor: "rgba(190,215,255,0.13)",
    line: "#f2f6fc", // traço principal
    dim: "rgba(214,228,255,0.55)", // textos/cotas secundários
    faint: "rgba(214,228,255,0.25)",
    accent: "#ffc94a", // amarelo de destaque
    compression: "#ffc94a",
    tension: "#72e0ff",
    danger: "#ff6f5e",
  },
};

export type XY = [number, number];
export const seg = (a: XY, b: XY) => `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`;
export const poly = (pts: XY[], close = false) =>
  pts.map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ") + (close ? " Z" : "");
export const lerp = (a: XY, b: XY, t: number): XY => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
