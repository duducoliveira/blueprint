import React from "react";
import { Composition } from "remotion";
import { brand } from "./brand";
import { Episode, totalFrames } from "./Episode";
import { Timeline } from "./timeline";
import telhadoTimeline from "./episodes/telhado/timeline.json";
import { scenes as telhadoScenes } from "./episodes/telhado/scenes";

/**
 * Cadastro de episódios. Para criar um novo:
 *  1. episodes/<id>/script.json  (roteiro)
 *  2. python3 scripts/tts.py episodes/<id>/script.json
 *  3. src/episodes/<id>/scenes.tsx (uma cena por id do roteiro)
 *  4. adicionar aqui.
 * Obs.: componentes não podem ir em defaultProps (o Remotion serializa props em JSON),
 * por isso cada episódio vira um componente próprio.
 */
const episodes: { id: string; code: string; timeline: Timeline; scenes: Record<string, React.FC> }[] = [
  { id: "telhado", code: "EP.01", timeline: telhadoTimeline as Timeline, scenes: telhadoScenes },
];

export const Root: React.FC = () => (
  <>
    {episodes.map((ep) => {
      const Comp: React.FC = () => <Episode timeline={ep.timeline} episode={ep.code} scenes={ep.scenes} />;
      return (
        <Composition
          key={ep.id}
          id={ep.id}
          component={Comp}
          durationInFrames={totalFrames(ep.timeline)}
          fps={brand.fps}
          width={brand.width}
          height={brand.height}
        />
      );
    })}
  </>
);
