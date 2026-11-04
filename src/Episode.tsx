import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Background } from "./components/Background";
import { Captions } from "./components/Captions";
import { Hud } from "./components/Hud";
import { SceneProvider, Timeline } from "./timeline";

/** Sem fade e sem zoom por cena: a continuidade vem da câmera, que liga o fim de uma cena ao começo da próxima. */
const SceneShell: React.FC<{ duration: number; children: React.ReactNode }> = ({ children }) => <AbsoluteFill>{children}</AbsoluteFill>;

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
