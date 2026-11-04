import React, { createContext, useContext } from "react";
import { useVideoConfig } from "remotion";

export type Word = { text: string; start: number; end: number };
export type SceneData = {
  id: string;
  text: string;
  audio: string;
  audioDelay: number;
  durationInFrames: number;
  words: Word[];
};
export type Timeline = { id: string; title: string; fps: number; scenes: SceneData[] };

const Ctx = createContext<{ scene: SceneData; index: number; total: number } | null>(null);
export const SceneProvider: React.FC<{ scene: SceneData; index: number; total: number; children: React.ReactNode }> = ({
  children,
  ...v
}) => <Ctx.Provider value={v}>{children}</Ctx.Provider>;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

/**
 * Sincroniza animações com a narração.
 * at("linha")      -> frame (relativo à cena) em que a palavra "linha" começa a ser falada
 * at("triangulo",2)-> segunda ocorrência
 * Se a palavra não existir, usa `fallback` (padrão 0) — assim o vídeo nunca quebra ao editar o roteiro.
 */
export const useScene = () => {
  const v = useContext(Ctx);
  const { fps } = useVideoConfig();
  if (!v) throw new Error("useScene fora de SceneProvider");
  const at = (word: string, occurrence = 1, fallback = 0) => {
    const w = norm(word);
    let n = 0;
    for (const x of v.scene.words) {
      if (norm(x.text).startsWith(w) && ++n === occurrence) return Math.round(x.start * fps);
    }
    return fallback;
  };
  return { ...v, fps, at, duration: v.scene.durationInFrames };
};
