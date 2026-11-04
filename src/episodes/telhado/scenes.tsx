import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { brand, lerp, poly, seg, XY } from "../../brand";
import { Arrow, Dimension, Ground, Joint, progress, Stroke } from "../../components/Draw";
import { Callout, Reveal, Stat } from "../../components/Labels";
import { useScene } from "../../timeline";

const { c } = brand;
const W = brand.width;
const H = brand.height;
const NOW = -999; // "já desenhado" (sem animação)

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={W} height={H} style={{ position: "absolute" }}>
    {children}
  </svg>
);

// ─── Geometria da casa ──────────────────────────────────────────────
const G = 1260; // chão
const WALL_H = 260;
const LX = 260;
const RX = 820;
const RAFTER = Math.hypot(280, 220);

/** Posição dos topos das paredes e da cumeeira quando as paredes abrem `deg` graus. */
const houseGeo = (deg: number) => {
  const t = (deg * Math.PI) / 180;
  const lt: XY = [LX - WALL_H * Math.sin(t), G - WALL_H * Math.cos(t)];
  const rt: XY = [RX + WALL_H * Math.sin(t), lt[1]];
  const half = (rt[0] - lt[0]) / 2;
  const apex: XY = [540, lt[1] - Math.sqrt(Math.max(RAFTER ** 2 - half ** 2, 0))];
  return { lt, rt, apex };
};

const Walls: React.FC<{ deg?: number; from?: number }> = ({ deg = 0, from = NOW }) => {
  const frame = useCurrentFrame();
  const p = progress(frame, from, 18);
  const wall = (x: number, sign: number) => (
    <g transform={`rotate(${sign * deg} ${x} ${G})`}>
      <path
        d={`M ${x - 14} ${G} L ${x - 14} ${G - WALL_H * p} M ${x + 14} ${G} L ${x + 14} ${G - WALL_H * p}` + (p >= 1 ? ` M ${x - 14} ${G - WALL_H} L ${x + 14} ${G - WALL_H}` : "")}
        stroke={c.line}
        strokeWidth={3.5}
        fill="none"
      />
      {/* hachura interna da parede (alvenaria em corte) */}
      {p >= 1 && (
        <g opacity={0.35} stroke={c.line} strokeWidth={1.5}>
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={`M ${x - 14} ${G - 8 - i * 21} L ${x + 14} ${G - 26 - i * 21}`} />
          ))}
        </g>
      )}
    </g>
  );
  return (
    <>
      {wall(LX, -1)}
      {wall(RX, 1)}
    </>
  );
};

const HouseDetails: React.FC<{ from?: number }> = ({ from = NOW }) => (
  <>
    <Stroke d={poly([[500, G], [500, 1140], [580, 1140], [580, G]])} from={from} dur={14} width={3} />
    <Stroke d={poly([[330, 1070], [430, 1070], [430, 1150], [330, 1150]], true) + " M 380 1070 L 380 1150 M 330 1110 L 430 1110"} from={from + 4} dur={16} width={3} />
    <Stroke d={poly([[650, 1070], [750, 1070], [750, 1150], [650, 1150]], true) + " M 700 1070 L 700 1150 M 650 1110 L 750 1110"} from={from + 8} dur={16} width={3} />
  </>
);

/** Carga caindo sobre o telhado: setas em loop. */
const LoadRain: React.FC<{ from: number; pts: XY[]; color?: string }> = ({ from, pts, color = c.accent }) => {
  const frame = useCurrentFrame();
  if (frame < from) return null;
  const appear = progress(frame, from, 10);
  return (
    <g>
      {pts.map(([x, y], i) => {
        const ph = ((frame - from + i * 7) % 30) / 30;
        const yy = y - 120 + ph * 70;
        const o = Math.sin(ph * Math.PI) * appear;
        return (
          <g key={i} opacity={o} stroke={color} strokeWidth={4} strokeLinecap="round" fill="none">
            <path d={`M ${x} ${yy - 46} L ${x} ${yy}`} />
            <path d={`M ${x - 11} ${yy - 13} L ${x} ${yy} L ${x + 11} ${yy - 13}`} />
          </g>
        );
      })}
    </g>
  );
};

const roofPts = (n: number, deg = 0): XY[] => {
  const { lt, rt, apex } = houseGeo(deg);
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    return t < 0.5 ? lerp(lt, apex, t * 2) : lerp(apex, rt, (t - 0.5) * 2);
  });
};

// ─── Cena 1: gancho ─────────────────────────────────────────────────
export const Hook: React.FC = () => {
  const { lt, rt, apex } = houseGeo(0);
  return (
    <AbsoluteFill>
      <Reveal from={2} style={{ top: 300, left: 64, fontSize: 30, letterSpacing: 8, color: c.dim }}>
        COMO FUNCIONA
      </Reveal>
      <Reveal from={6} style={{ top: 345, left: 60, fontSize: 112, fontWeight: 800, color: c.line, lineHeight: 1.0, letterSpacing: -3 }}>
        A <span style={{ color: c.accent }}>TESOURA</span>
        <br />
        DO TELHADO
      </Reveal>
      <Svg>
        <Ground x1={100} x2={980} y={G} from={0} />
        <Walls from={6} />
        <Stroke d={poly([lt, apex, rt])} from={18} dur={22} width={5} />
        <HouseDetails from={30} />
        <Dimension x1={LX} x2={RX} y={1340} label="8,00 m" from={42} />
      </Svg>
    </AbsoluteFill>
  );
};

// ─── Cena 2: o peso ─────────────────────────────────────────────────
export const Peso: React.FC = () => {
  const { at } = useScene();
  const frame = useCurrentFrame();
  const { lt, rt, apex } = houseGeo(0);
  // telhas: pequenos "dentes" ao longo das águas do telhado
  const tiles = (a: XY, b: XY) => {
    const n = 11;
    const nx = -(b[1] - a[1]);
    const ny = b[0] - a[0];
    const L = Math.hypot(nx, ny);
    const off = a[0] < b[0] ? -1 : 1;
    let d = "";
    for (let i = 0; i < n; i++) {
      const p = lerp(a, b, (i + 0.5) / n);
      const q: XY = [p[0] + (off * nx * 16) / L, p[1] + (off * ny * 16) / L];
      d += `M ${p[0]} ${p[1]} Q ${(p[0] + q[0]) / 2 + 8} ${(p[1] + q[1]) / 2} ${q[0]} ${q[1]} `;
    }
    return d;
  };
  const tFrom = at("telhas");
  const k = at("cinco");
  const stat1 = interpolate(frame, [k - 6, k + 4], [1, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <div style={{ opacity: stat1 }}>
        <Stat label="CARGA DO TELHADO" value={50} unit="KG/M²" from={at("cinquenta")} x={64} y={270} size={110} />
      </div>
      <Stat label="PESO LÁ EM CIMA" value={5} unit="TONELADAS" sub="≈ 100 M² DE TELHADO" from={k} dur={18} x={64} y={470} size={150} color={c.accent} />
      <Svg>
        <Ground x1={100} x2={980} y={G} />
        <Walls />
        <HouseDetails />
        <Stroke d={poly([lt, apex, rt])} from={NOW} width={5} />
        <Stroke d={tiles(lt, apex)} from={tFrom} dur={20} width={2.5} color={c.dim} />
        <Stroke d={tiles(rt, apex)} from={tFrom + 6} dur={20} width={2.5} color={c.dim} />
        <LoadRain from={at("pesa")} pts={roofPts(8)} />
        <Callout at={lerp(apex, rt, 0.55)} label={[860, 800]} text="TELHA" sub="CERÂMICA" from={tFrom + 8} align="right" />
      </Svg>
    </AbsoluteFill>
  );
};

// ─── Cena 3: empuxo ─────────────────────────────────────────────────
const OPEN = 6.5; // graus que as paredes abrem
export const Empuxo: React.FC = () => {
  const { at } = useScene();
  const frame = useCurrentFrame();
  const push = at("empurra");
  const deg = interpolate(frame, [push, push + 36], [0, OPEN], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const { lt, rt, apex } = houseGeo(deg);
  const v = at("vigas");
  const crack = (x: number, s: number) => `M ${x} ${G - 2} l ${8 * s} -16 l ${-10 * s} -14 l ${12 * s} -18 l ${-6 * s} -14`;
  return (
    <AbsoluteFill>
      <Reveal from={push} style={{ top: 280, left: 64, fontSize: 30, letterSpacing: 8, color: c.dim }}>
        SEM AMARRAÇÃO
      </Reveal>
      <Reveal from={push + 4} style={{ top: 325, left: 60, fontSize: 100, fontWeight: 800, color: c.danger, lineHeight: 1.0, letterSpacing: -2 }}>
        AS PAREDES
        <br />
        ABREM
      </Reveal>
      <Svg>
        <Ground x1={100} x2={980} y={G} />
        {/* prumo original */}
        <Stroke d={`M ${LX} ${G} L ${LX} ${G - WALL_H - 40} M ${RX} ${G} L ${RX} ${G - WALL_H - 40}`} from={push} dur={10} width={2} color={c.faint} dash="10 10" />
        <Walls deg={deg} />
        <Stroke d={poly([lt, apex, rt])} from={0} dur={14} width={5} />
        <Stroke d={poly([lt, apex, rt])} from={v} dur={18} width={8} color={c.accent} glow />
        <Joint x={lt[0]} y={lt[1]} from={v} />
        <Joint x={rt[0]} y={rt[1]} from={v} />
        <Joint x={apex[0]} y={apex[1]} from={v} />
        <LoadRain from={at("peso")} pts={roofPts(6, deg)} />
        <Arrow from={[lt[0] - 20, lt[1] + 30]} to={[lt[0] - 150, lt[1] + 30]} start={push + 2} color={c.danger} width={7} head={24} />
        <Arrow from={[rt[0] + 20, rt[1] + 30]} to={[rt[0] + 150, rt[1] + 30]} start={push + 2} color={c.danger} width={7} head={24} />
        <Stroke d={crack(LX + 14, 1)} from={at("fora")} dur={10} width={3} color={c.danger} />
        <Stroke d={crack(RX - 14, -1)} from={at("fora") + 3} dur={10} width={3} color={c.danger} />
      </Svg>
    </AbsoluteFill>
  );
};

// ─── Cena 4: a linha ────────────────────────────────────────────────
export const Linha: React.FC = () => {
  const { at } = useScene();
  const frame = useCurrentFrame();
  const t = at("linha");
  const deg = interpolate(frame, [t, t + 36], [OPEN, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const { lt, rt, apex } = houseGeo(deg);
  const am = at("amarra");
  const es = at("esticada");
  return (
    <AbsoluteFill>
      <Reveal from={es} style={{ top: 280, left: 64, fontSize: 30, letterSpacing: 8, color: c.dim }}>
        A LINHA TRABALHA À
      </Reveal>
      <Reveal from={es + 4} style={{ top: 325, left: 60, fontSize: 120, fontWeight: 800, color: c.tension, letterSpacing: -2 }}>
        TRAÇÃO
      </Reveal>
      <Reveal from={es + 10} style={{ top: 470, left: 64, fontSize: 28, letterSpacing: 3, color: c.dim }}>
        ← PUXADA NAS DUAS PONTAS →
      </Reveal>
      <Svg>
        <Ground x1={100} x2={980} y={G} />
        <Stroke d={`M ${LX} ${G} L ${LX} ${G - WALL_H - 40} M ${RX} ${G} L ${RX} ${G - WALL_H - 40}`} from={NOW} width={2} color={c.faint} dash="10 10" opacity={interpolate(frame, [t, t + 36], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
        <Walls deg={deg} />
        <Stroke d={poly([lt, apex, rt])} from={NOW} width={8} color={c.accent} />
        <Stroke d={seg(lt, rt)} from={t - 4} dur={20} width={9} color={c.tension} glow />
        <Joint x={lt[0]} y={lt[1]} from={NOW} />
        <Joint x={rt[0]} y={rt[1]} from={NOW} />
        <Joint x={apex[0]} y={apex[1]} from={NOW} />
        <Callout at={[540, lt[1]]} label={[540, 1120]} text="LINHA" sub="PEÇA HORIZONTAL" from={t + 14} color={c.tension} />
        <Arrow from={[400, lt[1] - 40]} to={[300, lt[1] - 40]} start={am} color={c.tension} />
        <Arrow from={[680, lt[1] - 40]} to={[780, lt[1] - 40]} start={am} color={c.tension} />
      </Svg>
    </AbsoluteFill>
  );
};

// ─── Cena 5: por que triângulos ─────────────────────────────────────
export const Triangulo: React.FC = () => {
  const { at } = useScene();
  const frame = useCurrentFrame();
  const GY = 1200;
  const t1 = at("triangulo", 1);
  const ju = at("juntas");
  const tb = at("tomba");
  const t2 = at("triangulo", 2);
  // quadrado articulado tombando
  const L = 220;
  const phi = interpolate(frame, [tb, tb + 30], [0, 46], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
  const pr = (phi * Math.PI) / 180;
  const S1: XY = [110, GY];
  const S2: XY = [110 + L, GY];
  const S3: XY = [S2[0] + L * Math.sin(pr), GY - L * Math.cos(pr)];
  const S4: XY = [S1[0] + L * Math.sin(pr), GY - L * Math.cos(pr)];
  // triângulo: só um tremor que some
  const jit = frame > t2 ? Math.sin((frame - t2) * 1.6) * 6 * Math.exp(-(frame - t2) / 8) : 0;
  const T1: XY = [600, GY];
  const T2: XY = [940, GY];
  const T3: XY = [770 + jit, GY - 280];
  const lab = (x: number, from: number, text: string, color: string) => (
    <Reveal from={from} style={{ top: 1290, left: x, width: 400, textAlign: "center", fontSize: 34, fontWeight: 800, letterSpacing: 4, color }}>
      {text}
    </Reveal>
  );
  return (
    <AbsoluteFill>
      <Reveal from={2} style={{ top: 280, left: 64, fontSize: 30, letterSpacing: 8, color: c.dim }}>
        GEOMETRIA
      </Reveal>
      <Reveal from={6} style={{ top: 325, left: 60, fontSize: 96, fontWeight: 800, color: c.line, lineHeight: 1.0, letterSpacing: -2 }}>
        POR QUE
        <br />
        <span style={{ color: c.accent }}>TRIÂNGULOS?</span>
      </Reveal>
      <Svg>
        <Ground x1={60} x2={1020} y={GY} from={0} />
        {/* quadrado */}
        <Stroke d={poly([S1, S4, S3, S2])} from={ju} dur={20} width={6} />
        {[S1, S2, S3, S4].map((p, i) => (
          <Joint key={i} x={p[0]} y={p[1]} from={ju + 12} r={11} color={frame > tb ? c.danger : c.line} />
        ))}
        <Arrow from={[S4[0] - 150, S4[1]]} to={[S4[0] - 20, S4[1]]} start={tb - 6} dur={8} color={c.danger} width={7} head={24} />
        {/* triângulo */}
        <Stroke d={poly([T1, T3, T2], true)} from={t1} dur={22} width={6} color={c.accent} />
        {[T1, T2, T3].map((p, i) => (
          <Joint key={i} x={p[0]} y={p[1]} from={t1 + 14} r={11} color={c.accent} />
        ))}
        <Arrow from={[T3[0] - 170, T3[1]]} to={[T3[0] - 22, T3[1]]} start={t2 - 6} dur={8} color={c.danger} width={7} head={24} />
      </Svg>
      {lab(35, tb + 18, "✕ TOMBA", c.danger)}
      {lab(570, t2 + 10, "✓ RÍGIDO", c.accent)}
    </AbsoluteFill>
  );
};

// ─── Cena 6: a tesoura ──────────────────────────────────────────────
const truss = (cx: number, by: number, half: number, h: number) => {
  const L: XY = [cx - half, by];
  const R: XY = [cx + half, by];
  const A: XY = [cx, by - h];
  const M: XY = [cx, by];
  const P1 = lerp(L, A, 0.5);
  const P2 = lerp(R, A, 0.5);
  return { L, R, A, M, P1, P2 };
};

const Support: React.FC<{ p: XY; from?: number }> = ({ p, from = 0 }) => (
  <Stroke d={`M ${p[0]} ${p[1] + 10} L ${p[0] - 26} ${p[1] + 48} L ${p[0] + 26} ${p[1] + 48} Z M ${p[0] - 40} ${p[1] + 48} L ${p[0] + 40} ${p[1] + 48}`} from={from} dur={14} width={3} color={c.dim} />
);

export const Tesoura: React.FC = () => {
  const { at } = useScene();
  const { L, R, A, M, P1, P2 } = truss(540, 1150, 430, 380);
  const pe = at("pernas");
  const es = at("escoras");
  const co = at("comprimidas");
  const li = at("linha");
  const pd = at("pendural");
  const tr = at("tracionados");
  const legend = (y: number, from: number, color: string, text: string, sym: string) => (
    <Reveal from={from} style={{ top: y, left: 64, display: "flex", alignItems: "center", gap: 22, fontSize: 40, fontWeight: 800, letterSpacing: 3, color }}>
      <span style={{ width: 70, height: 10, background: color, borderRadius: 5, display: "inline-block" }} />
      {text}
      <span style={{ fontSize: 30, color: c.dim, fontWeight: 500 }}>{sym}</span>
    </Reveal>
  );
  return (
    <AbsoluteFill>
      <Reveal from={2} style={{ top: 280, left: 64, fontSize: 30, letterSpacing: 8, color: c.dim }}>
        TESOURA · ANATOMIA
      </Reveal>
      {legend(340, co, c.compression, "COMPRESSÃO", "→ ←")}
      {legend(410, tr, c.tension, "TRAÇÃO", "← →")}
      <Svg>
        <Support p={L} from={4} />
        <Support p={R} from={4} />
        <Stroke d={poly([L, A, R], true)} from={0} dur={26} width={6} />
        <Stroke d={seg(A, M)} from={16} dur={14} width={6} />
        <Stroke d={`${seg(M, P1)} ${seg(M, P2)}`} from={24} dur={14} width={6} />
        {/* cores por esforço */}
        <Stroke d={`${seg(L, A)} ${seg(R, A)}`} from={pe} dur={16} width={11} color={c.compression} glow />
        <Stroke d={`${seg(M, P1)} ${seg(M, P2)}`} from={es} dur={14} width={11} color={c.compression} glow />
        <Stroke d={seg(L, R)} from={li} dur={16} width={11} color={c.tension} glow />
        <Stroke d={seg(M, A)} from={pd} dur={14} width={11} color={c.tension} glow />
        {[L, R, A, M, P1, P2].map((p, i) => (
          <Joint key={i} x={p[0]} y={p[1]} from={30 + i * 2} r={10} />
        ))}
        <Callout at={lerp(L, A, 0.25)} label={[70, 900]} text="PERNA" from={pe + 6} color={c.compression} />
        <Callout at={lerp(M, P2, 0.5)} label={[1010, 1290]} text="ESCORA" from={es + 6} color={c.compression} align="right" />
        <Callout at={lerp(L, M, 0.5)} label={[70, 1290]} text="LINHA" from={li + 6} color={c.tension} />
        <Callout at={lerp(M, A, 0.62)} label={[1010, 700]} text="PENDURAL" from={pd + 6} color={c.tension} align="right" />
      </Svg>
    </AbsoluteFill>
  );
};

// ─── Cena 7: encerramento ───────────────────────────────────────────
export const Outro: React.FC = () => {
  const { at } = useScene();
  const frame = useCurrentFrame();
  const rp = at("repita");
  const pa = at("paredes");
  const sg = at("siga");
  const N = 6;
  const DX = 66;
  const DY = -48;
  const ts = Array.from({ length: N }, (_, i) => truss(330 + i * DX, 1150 + i * DY, 230, 200));
  const dimAll = interpolate(frame, [sg, sg + 12], [1, 0.22], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const card = progress(frame, sg + 4, 14);
  return (
    <AbsoluteFill>
      <div style={{ opacity: dimAll }}>
        <Reveal from={rp} style={{ top: 280, left: 64, fontSize: 30, letterSpacing: 8, color: c.dim }}>
          UMA TESOURA A CADA
        </Reveal>
        <Stat label="" value={1} unit="METRO" from={at("metro")} dur={6} x={60} y={310} size={140} color={c.accent} />
      </div>
      <Svg>
        <g opacity={dimAll}>
          {ts
            .map((t, i) => ({ t, i }))
            .reverse()
            .map(({ t, i }) => {
              const f = rp + i * 6;
              const o = 1 - i * 0.12;
              return (
                <g key={i} opacity={o}>
                  <Stroke d={poly([t.L, t.A, t.R], true) + " " + seg(t.A, t.M) + " " + seg(t.M, t.P1) + " " + seg(t.M, t.P2)} from={f} dur={16} width={4} />
                </g>
              );
            })}
          {/* cumeeira e frechais ligando as tesouras */}
          <Stroke d={seg(ts[0].A, ts[N - 1].A)} from={rp + 40} dur={14} width={3} color={c.dim} />
          <Stroke d={seg(ts[0].L, ts[N - 1].L)} from={rp + 44} dur={14} width={3} color={c.dim} />
          <Stroke d={seg(ts[0].R, ts[N - 1].R)} from={rp + 48} dur={14} width={3} color={c.dim} />
          {/* paredes recebendo a carga */}
          <Stroke d={poly([ts[0].L, [ts[0].L[0], 1330], [ts[N - 1].L[0], 1330 + (N - 1) * DY], ts[N - 1].L])} from={pa - 6} dur={16} width={3} color={c.line} />
          <Stroke d={poly([ts[0].R, [ts[0].R[0], 1330], [ts[N - 1].R[0], 1330 + (N - 1) * DY], ts[N - 1].R])} from={pa - 4} dur={16} width={3} color={c.line} />
          {ts.map((t, i) => (
            <g key={i}>
              <Arrow from={[t.L[0], t.L[1] - 90]} to={[t.L[0], t.L[1] - 14]} start={pa + i * 2} color={c.accent} />
              <Arrow from={[t.R[0], t.R[1] - 90]} to={[t.R[0], t.R[1] - 14]} start={pa + i * 2} color={c.accent} />
            </g>
          ))}
        </g>
      </Svg>
      {card > 0 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: brand.font, opacity: card, transform: `scale(${0.92 + 0.08 * card})` }}>
          <div style={{ fontSize: 30, letterSpacing: 10, color: c.dim, marginTop: -260 }}>MAIS COMO ISSO EM</div>
          <div style={{ fontSize: 96, fontWeight: 800, color: c.accent, marginTop: 12, letterSpacing: -1 }}>{brand.handle}</div>
          <div style={{ marginTop: 26, padding: "14px 30px", border: `3px solid ${c.line}`, borderRadius: 10, fontSize: 32, fontWeight: 700, letterSpacing: 6, color: c.line }}>
            PRÓXIMO: A FUNDAÇÃO
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const scenes: Record<string, React.FC> = {
  hook: Hook,
  peso: Peso,
  empuxo: Empuxo,
  linha: Linha,
  triangulo: Triangulo,
  tesoura: Tesoura,
  outro: Outro,
};
