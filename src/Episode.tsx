import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Background } from "./components/Background";
import { Captions } from "./components/Captions";
import { Hud } from "./components/Hud";
import { SceneProvider, Timeline } from "./timeline";

const FADE = 8;

const SceneShell: React.FC<{ duration: number; children: React.ReactNode }> = ({ duration, children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, FADE, duration - 4, duration], [0, 1, 1, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // "respiração" de câmera: zoom lento durante a cena
  const z = interpolate(frame, [0, duration], [1, 1.025], { easing: Easing.inOut(Easing.quad) });
  return <AbsoluteFill style={{ opacity: o, transform: `scale(${z})` }}>{children}</AbsoluteFill>;
};

/** Monta um episódio: fundo + HUD + cenas em sequência, cada uma com seu áudio e legenda. */
export const Episode: React.FC<{
  timeline: Timeline;
  episode: string;
  scenes: Record<string, React.FC>;
}> = ({ timeline, episode, scenes }) => {
  let start = 0;
  return (
    <AbsoluteFill>
      <Background />
      {timeline.scenes.map((sc, i) => {
        const Comp = scenes[sc.id];
        const from = start;
        start += sc.durationInFrames;
        return (
          <Sequence key={sc.id} from={from} durationInFrames={sc.durationInFrames} name={sc.id}>
            <SceneProvider scene={sc} index={i} total={timeline.scenes.length}>
              <Hud episode={episode} title={timeline.title} sheet={i + 1} sheets={timeline.scenes.length} />
              <SceneShell duration={sc.durationInFrames}>{Comp ? <Comp /> : null}</SceneShell>
              <Captions words={sc.words} />
              <Sequence from={Math.round(sc.audioDelay * timeline.fps)} layout="none">
                <Audio src={staticFile(sc.audio)} />
              </Sequence>
            </SceneProvider>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const totalFrames = (t: Timeline) => t.scenes.reduce((a, s) => a + s.durationInFrames, 0);
