import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { brand } from "../../brand";
import { Arrow, progress } from "../../components/Draw";
import { Callout, Reveal, Stat } from "../../components/Labels";
import { bar, bentBar, box, Cam, groundGrid, Item, line, poly, project, Scene3D, Style, V3, v } from "../../three/engine";
import { useScene } from "../../timeline";

const { c } = brand;

// ─── Utilidades ─────────────────────────────────────────────────────
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);
const tw = (f: number, a: number, b: number, from = 0, to = 1) => interpolate(f, [a, b], [from, to], { ...clamp, easing: ease });

/** Câmera interpolada entre duas posições ao longo da cena. */
const camMove = (f: number, dur: number, a: Cam, b: Partial<Cam>): Cam => {
  const t = tw(f, 0, dur);
  const m = (x: number, y?: number) => (y === undefined ? x : x + (y - x) * t);
  return {
    ...a,
    yaw: m(a.yaw, b.yaw),
    pitch: m(a.pitch, b.pitch),
    zoom: m(a.zoom, b.zoom),
    target: b.target ? v.lerp(a.target, b.target, t) : a.target,
  };
};

/** Setas de carga caindo em loop sobre pontos da tela. */
const LoadRain: React.FC<{ from: number; pts: { x: number; y: number }[]; color?: string; len?: number }> = ({ from, pts, color = c.accent, len = 110 }) => {
  const frame = useCurrentFrame();
  if (frame < from) return null;
  const appear = progress(frame, from, 10);
  return (
    <svg width={brand.width} height={brand.height} style={{ position: "absolute" }}>
      {pts.map(({ x, y }, i) => {
        const ph = ((frame - from + i * 7) % 30) / 30;
        const yy = y - len + ph * (len - 20);
        const o = Math.sin(ph * Math.PI) * appear;
        return (
          <g key={i} opacity={o} stroke={color} strokeWidth={4} strokeLinecap="round" fill="none">
            <path d={`M ${x} ${yy - 40} L ${x} ${yy}`} />
            <path d={`M ${x - 10} ${yy - 12} L ${x} ${yy} L ${x + 10} ${yy - 12}`} />
          </g>
        );
      })}
    </svg>
  );
};

const Title: React.FC<{ kicker: string; from?: number; color?: string; children: React.ReactNode; size?: number }> = ({ kicker, from = 0, color = c.line, children, size = 100 }) => (
  <>
    <Reveal from={from} style={{ top: 270, left: 64, fontSize: 28, letterSpacing: 8, color: c.dim }}>
      {kicker}
    </Reveal>
    <Reveal from={from + 4} style={{ top: 312, left: 60, fontSize: size, fontWeight: 800, color, lineHeight: 1.0, letterSpacing: -2 }}>
      {children}
    </Reveal>
  </>
);

const svgPt = (p: V3, cam: Cam) => {
  const q = project(p, cam);
  return [q.x, q.y] as [number, number];
};

// ─── Geometria (metros) ─────────────────────────────────────────────
const HALF = 4; // meio vão
const WH = 2.8; // altura da parede
const RISE = 2.2; // altura da tesoura
const ZH = 5; // meio comprimento da casa
const RAFTER = Math.hypot(HALF, RISE);
const ZS = Array.from({ length: 9 }, (_, i) => -4.5 + i * 1.125); // posição de cada tesoura
const FRONT = ZS[ZS.length - 1];
const SEC = { w: 0.12, h: 0.2 }; // seção das peças

const WOOD: Style = { color: c.line, width: 2 };
const YEL: Style = { color: c.compression, width: 2.5, tint: 0.9 };
const CYA: Style = { color: c.tension, width: 2.5, tint: 0.9 };
const RED: Style = { color: c.danger, width: 2.5, tint: 0.9 };

/** Nós da tesoura no plano z, com paredes abertas `deg` graus. */
const nodes = (z: number, deg = 0) => {
  const lt = v.rotZ([-HALF, WH, z], [-HALF, 0, z], deg);
  const rt = v.rotZ([HALF, WH, z], [HALF, 0, z], -deg);
  const half = (rt[0] - lt[0]) / 2;
  const A: V3 = [0, lt[1] + Math.sqrt(Math.max(RAFTER ** 2 - half ** 2, 0)), z];
  const M: V3 = [0, lt[1], z];
  return { L: lt, R: rt, A, M, P1: v.lerp(lt, A, 0.5), P2: v.lerp(rt, A, 0.5) };
};

const walls = (deg = 0, st: Style = {}, gables = false): Item[] => {
  const s = { color: c.line, width: 2, ...st };
  const out = [
    ...box([-HALF - 0.12, 0, -ZH], [-HALF + 0.12, WH, ZH], s, (p) => v.rotZ(p, [-HALF, 0, 0], deg)),
    ...box([HALF - 0.12, 0, -ZH], [HALF + 0.12, WH, ZH], s, (p) => v.rotZ(p, [HALF, 0, 0], -deg)),
  ];
  if (gables) {
    out.push(...box([-HALF, 0, ZH - 0.24], [HALF, WH, ZH], s), ...box([-HALF, 0, -ZH], [HALF, WH, -ZH + 0.24], s));
    for (const z of [ZH + 0.01, -ZH - 0.01]) out.push(poly([[-HALF, WH, z], [0, WH + RISE, z], [HALF, WH, z]], s));
  }
  return out;
};

const shadow = (op = 0.28): Item => poly([[-HALF - 0.6, 0.01, -ZH - 0.6], [HALF + 0.6, 0.01, -ZH - 0.6], [HALF + 0.6, 0.01, ZH + 0.6], [-HALF - 0.6, 0.01, ZH + 0.6]], { color: "#0a1a38", fill: op, width: 0, tint: 1 }, -999);

/** Telhado: duas águas com fiadas de telha. */
const roof = (op = 1, rows = 9): Item[] => {
  if (op <= 0) return [];
  const o = 0.5; // beiral
  const ext = (p: V3, dx: number): V3 => [p[0] + dx * o, p[1] - (RISE / HALF) * o, p[2]];
  const st: Style = { color: c.line, width: 2, opacity: op, fill: 0.95 };
  const out: Item[] = [];
  for (const sgn of [-1, 1]) {
    const e0 = ext([sgn * HALF, WH + 0.12, 0], sgn);
    const top: V3 = [0, WH + RISE + 0.12, 0];
    out.push(poly([[e0[0], e0[1], -ZH - o], [top[0], top[1], -ZH - o], [top[0], top[1], ZH + o], [e0[0], e0[1], ZH + o]], st));
    for (let i = 1; i < rows; i++) {
      const p = v.lerp(e0, top, i / rows);
      out.push(line([p[0], p[1] + 0.02, -ZH - o], [p[0], p[1] + 0.02, ZH + o], { color: c.dim, width: 1.5, opacity: op }, 0.05));
    }
  }
  return out;
};

/** Uma tesoura completa (ou parcial) em z. */
type Parts = { pernas?: Style | null; linha?: Style | null; pendural?: Style | null; escoras?: Style | null; grow?: Partial<Record<"linha" | "pendural" | "escoras", number>>; sagLinha?: number; sagPerna?: number };
const truss = (z: number, deg: number, p: Parts): Item[] => {
  const n = nodes(z, deg);
  const out: Item[] = [];
  if (p.pernas) {
    if (p.sagPerna) {
      const nl = v.norm([-(n.A[1] - n.L[1]), n.A[0] - n.L[0], 0]);
      const nr = v.norm([n.A[1] - n.R[1], -(n.A[0] - n.R[0]), 0]);
      out.push(...bentBar(n.L, n.A, p.sagPerna, v.mul(nl, -1), SEC.w, SEC.h, p.pernas), ...bentBar(n.R, n.A, p.sagPerna, v.mul(nr, -1), SEC.w, SEC.h, p.pernas));
    } else out.push(...bar(n.L, n.A, SEC.w, SEC.h, p.pernas), ...bar(n.R, n.A, SEC.w, SEC.h, p.pernas));
  }
  if (p.linha) {
    const g = p.grow?.linha ?? 1;
    if (p.sagLinha) out.push(...bentBar(n.L, n.R, p.sagLinha, [0, -1, 0], SEC.w, SEC.h, p.linha));
    else {
      out.push(...bar(n.L, v.lerp(n.L, n.M, 1), SEC.w, SEC.h, p.linha, g));
      out.push(...bar(n.R, n.M, SEC.w, SEC.h, p.linha, g));
    }
  }
  if (p.pendural) out.push(...bar(n.A, v.add(n.M, [0, -(p.sagLinha ?? 0), 0]), SEC.w, SEC.h * 0.8, p.pendural, p.grow?.pendural ?? 1));
  if (p.escoras) {
    const g = p.grow?.escoras ?? 1;
    out.push(...bar(n.M, n.P1, SEC.w, SEC.h * 0.8, p.escoras, g), ...bar(n.M, n.P2, SEC.w, SEC.h * 0.8, p.escoras, g));
  }
  return out;
};

// Câmeras base
const CAM_HOUSE: Cam = { yaw: -38, pitch: 26, zoom: 64, target: [0, 2.4, 0], cy: 1060 };
const CAM_FRONT: Cam = { yaw: -16, pitch: 10, zoom: 92, target: [0, 3.4, FRONT], cy: 1000, dist: 30 };

// ─── 1. Gancho ──────────────────────────────────────────────────────
export const Hook: React.FC = () => {
  const { at, duration } = useScene();
  const f = useCurrentFrame();
  const cam = camMove(f, duration, { ...CAM_HOUSE, zoom: 60, cy: 1000 }, { yaw: -28, zoom: 66 });
  const wallsOp = tw(f, 0, 18);
  const roofOp = tw(f, 12, 30);
  const ton = at("toneladas");
  const pts = [-3, -1.5, 0, 1.5, 3].flatMap((z) => [-2.6, -1, 1, 2.6].map((x) => project([x, WH + RISE * (1 - Math.abs(x) / HALF) + 0.3, z], cam)));
  return (
    <AbsoluteFill>
      <Stat label="PESO SOBRE A CASA" value={5} unit="TONELADAS" sub="≈ 50 KG POR M² DE TELHA" from={at("cinco")} dur={16} x={64} y={270} size={170} color={c.accent} />
      <Scene3D
        cam={cam}
        items={[...groundGrid(9, 1, { opacity: tw(f, 0, 12) }), shadow(0.3 * wallsOp), ...walls(0, { opacity: wallsOp }, true), ...roof(roofOp)]}
      />
      <LoadRain from={ton} pts={pts.map((p) => ({ x: p.x, y: p.y }))} len={130} />
    </AbsoluteFill>
  );
};

// ─── 2. Problema: as paredes abrem ──────────────────────────────────
const OPEN = 7;
export const Abre: React.FC = () => {
  const { at, duration } = useScene();
  const f = useCurrentFrame();
  const cam = camMove(f, duration, { ...CAM_HOUSE, yaw: -30, pitch: 20, zoom: 66 }, { yaw: -22 });
  const vi = at("vigas");
  const em = at("empurra");
  const deg = tw(f, em, em + 40, 0, OPEN);
  const wallSt: Style = deg > 0.5 ? { color: c.danger, tint: tw(f, em, em + 20, 0, 0.55) } : {};
  const rafters = ZS.flatMap((z, i) => {
    const n = nodes(z, deg);
    const g = tw(f, vi - 10 + i * 2, vi + 6 + i * 2);
    const st = f > vi + 10 ? YEL : WOOD;
    return [...bar(n.L, n.A, SEC.w, SEC.h, st, g), ...bar(n.R, n.A, SEC.w, SEC.h, st, g)];
  });
  const nf = nodes(FRONT, deg);
  const lp = svgPt(nf.L, cam);
  const rp = svgPt(nf.R, cam);
  return (
    <AbsoluteFill>
      <Title kicker="PROBLEMA 1" from={em} color={c.danger}>
        AS PAREDES
        <br />
        ABREM
      </Title>
      <Scene3D cam={cam} items={[...groundGrid(9), shadow(), ...walls(deg, wallSt), ...rafters]}>
        <Callout at={svgPt(v.lerp(nf.L, nf.A, 0.35), cam)} label={[70, 1370]} text="PERNAS" sub="VIGAS INCLINADAS" from={at("pernas")} color={c.compression} />
        <Arrow from={[lp[0] - 10, lp[1] + 40]} to={[lp[0] - 150, lp[1] + 40]} start={em + 4} color={c.danger} width={7} head={24} />
        <Arrow from={[rp[0] + 10, rp[1] + 40]} to={[rp[0] + 150, rp[1] + 40]} start={em + 4} color={c.danger} width={7} head={24} />
      </Scene3D>
      <LoadRain from={at("peso")} pts={[-2.5, 2.5].flatMap((x) => [-3, 0, 3].map((z) => project([x, WH + RISE * 0.4 + 0.3, z], cam)))} />
    </AbsoluteFill>
  );
};

// ─── 3. Solução: a linha ────────────────────────────────────────────
export const Linha: React.FC = () => {
  const { at, duration } = useScene();
  const f = useCurrentFrame();
  const cam = camMove(f, duration, { ...CAM_HOUSE, yaw: -22, pitch: 20, zoom: 66 }, { yaw: -12, zoom: 70 });
  const am = at("amarra");
  const deg = tw(f, am + 14, am + 50, OPEN, 0);
  const items: Item[] = [...groundGrid(9), shadow(), ...walls(deg, deg > 0.5 ? { color: c.danger, tint: 0.55 * (deg / OPEN) } : {})];
  ZS.forEach((z, i) => {
    items.push(...truss(z, deg, { pernas: YEL, linha: CYA, grow: { linha: tw(f, am + i * 3, am + 16 + i * 3) } }));
  });
  const nf = nodes(FRONT, 0);
  return (
    <AbsoluteFill>
      <Title kicker="SOLUÇÃO 1" from={at("linha") - 4} color={c.tension}>
        A LINHA
      </Title>
      <Reveal from={at("corda")} style={{ top: 430, left: 64, fontSize: 30, letterSpacing: 4, color: c.dim }}>
        TRABALHA À <span style={{ color: c.tension, fontWeight: 800 }}>TRAÇÃO</span> ← →
      </Reveal>
      <Scene3D cam={cam} items={items}>
        <Callout at={svgPt(v.lerp(nf.L, nf.M, 0.4), cam)} label={[90, 1370]} text="LINHA" sub="VIGA DEITADA" from={at("linha", 1) + 6} color={c.tension} />
      </Scene3D>
    </AbsoluteFill>
  );
};

// ─── 4. Problema: a linha enverga ──────────────────────────────────
const ForroLoad: React.FC<{ from: number; cam: Cam; sag: number }> = ({ from, cam, sag }) => {
  const pts = [-3, -2, -1, 0, 1, 2, 3].map((x) => project([x, WH - 0.12 - sag * Math.sin((Math.PI * (x + HALF)) / (2 * HALF)), FRONT], cam));
  return <LoadRain from={from} pts={pts.map((p) => ({ x: p.x, y: p.y + 110 }))} color={c.dim} len={80} />;
};

export const Enverga: React.FC = () => {
  const { at, duration } = useScene();
  const f = useCurrentFrame();
  const cam = camMove(f, duration, { ...CAM_FRONT, yaw: -24 }, { yaw: -14 });
  const env = at("enverga");
  const sag = tw(f, env - 6, env + 26, 0, 0.55);
  const items: Item[] = [...groundGrid(9), ...walls(0, { opacity: 0.6 })];
  ZS.slice(0, -1).forEach((z) => items.push(...truss(z, 0, { pernas: { ...WOOD, opacity: 0.14 }, linha: { ...WOOD, opacity: 0.14 } })));
  items.push(...truss(FRONT, 0, { pernas: YEL, linha: sag > 0.05 ? RED : CYA, sagLinha: sag }));
  return (
    <AbsoluteFill>
      <Title kicker="PROBLEMA 2" from={env - 4} color={c.danger}>
        A LINHA
        <br />
        ENVERGA
      </Title>
      <ForroLoad from={at("forro")} cam={cam} sag={sag} />
      <Scene3D cam={cam} items={items}>
        <Callout at={svgPt([1.6, WH - 0.4, FRONT], cam)} label={[1010, 1370]} text="FORRO" sub="PENDURADO NA LINHA" from={at("forro") + 4} color={c.dim} align="right" />
      </Scene3D>
    </AbsoluteFill>
  );
};

// ─── 5. Solução: o pendural ─────────────────────────────────────────
export const Pendural: React.FC = () => {
  const { at, duration } = useScene();
  const f = useCurrentFrame();
  const cam = camMove(f, duration, { ...CAM_FRONT, yaw: -14 }, { yaw: -8 });
  const pe = at("pendura");
  const g = tw(f, pe, pe + 22);
  const sag = tw(f, pe + 14, pe + 34, 0.55, 0);
  const items: Item[] = [...groundGrid(9), ...walls(0, { opacity: 0.6 })];
  ZS.slice(0, -1).forEach((z) => items.push(...truss(z, 0, { pernas: { ...WOOD, opacity: 0.14 }, linha: { ...WOOD, opacity: 0.14 } })));
  items.push(...truss(FRONT, 0, { pernas: YEL, linha: sag > 0.05 ? RED : CYA, sagLinha: sag, pendural: CYA, grow: { pendural: g } }));
  const n = nodes(FRONT);
  return (
    <AbsoluteFill>
      <Title kicker="SOLUÇÃO 2" from={at("pendural") - 4} color={c.tension}>
        O PENDURAL
      </Title>
      <Scene3D cam={cam} items={items}>
        <Callout at={svgPt(v.lerp(n.A, n.M, 0.45), cam)} label={[1010, 760]} text="PENDURAL" sub="SEGURA A LINHA" from={at("pendural") + 4} color={c.tension} align="right" />
      </Scene3D>
    </AbsoluteFill>
  );
};

// ─── 6. Problema: as pernas cedem ───────────────────────────────────
export const Cede: React.FC = () => {
  const { at, duration } = useScene();
  const f = useCurrentFrame();
  const cam = camMove(f, duration, { ...CAM_FRONT, yaw: -8 }, { yaw: -18, zoom: 96 });
  const ce = at("cede");
  const sag = tw(f, ce - 10, ce + 22, 0, 0.42);
  const items: Item[] = [...groundGrid(9), ...walls(0, { opacity: 0.6 })];
  ZS.slice(0, -1).forEach((z) => items.push(...truss(z, 0, { pernas: { ...WOOD, opacity: 0.14 }, linha: { ...WOOD, opacity: 0.14 } })));
  items.push(...truss(FRONT, 0, { pernas: sag > 0.05 ? RED : YEL, linha: CYA, pendural: CYA, sagPerna: sag }));
  const tel = at("telhas");
  const pts = [0.25, 0.5, 0.75].flatMap((t) => {
    const n = nodes(FRONT);
    return [v.lerp(n.L, n.A, t), v.lerp(n.R, n.A, t)].map((p) => project(v.add(p, [0, 0.25, 0]), cam));
  });
  return (
    <AbsoluteFill>
      <Title kicker="PROBLEMA 3" from={ce - 6} color={c.danger}>
        AS PERNAS
        <br />
        CEDEM
      </Title>
      <LoadRain from={tel} pts={pts.map((p) => ({ x: p.x, y: p.y }))} />
      <Scene3D cam={cam} items={items}>
        <Callout at={svgPt(v.lerp(nodes(FRONT).L, nodes(FRONT).A, 0.3), cam)} label={[70, 1370]} text="PERNA" sub="VIGA INCLINADA" from={at("pernas") + 2} color={c.compression} />
      </Scene3D>
    </AbsoluteFill>
  );
};

// ─── 7. Solução: as escoras ─────────────────────────────────────────
export const Escoras: React.FC = () => {
  const { at, duration } = useScene();
  const f = useCurrentFrame();
  const cam = camMove(f, duration, { ...CAM_FRONT, yaw: -18, zoom: 96 }, { yaw: -26, zoom: 92 });
  const es = at("escoras");
  const ap = at("apoia");
  const g = tw(f, ap, ap + 24);
  const sag = tw(f, ap + 14, ap + 36, 0.42, 0);
  const items: Item[] = [...groundGrid(9), ...walls(0, { opacity: 0.6 })];
  ZS.slice(0, -1).forEach((z) => items.push(...truss(z, 0, { pernas: { ...WOOD, opacity: 0.14 }, linha: { ...WOOD, opacity: 0.14 } })));
  items.push(...truss(FRONT, 0, { pernas: sag > 0.05 ? RED : YEL, linha: CYA, pendural: CYA, escoras: YEL, sagPerna: sag, grow: { escoras: g } }));
  const n = nodes(FRONT);
  return (
    <AbsoluteFill>
      <Title kicker="SOLUÇÃO 3" from={es - 4} color={c.compression}>
        AS ESCORAS
      </Title>
      <Scene3D cam={cam} items={items}>
        <Callout at={svgPt(v.lerp(n.M, n.P2, 0.55), cam)} label={[1010, 1370]} text="ESCORAS" sub="APOIAM O MEIO DA PERNA" from={es} color={c.compression} align="right" />
      </Scene3D>
    </AbsoluteFill>
  );
};

// ─── 8. Por que triângulos ──────────────────────────────────────────
export const Triangulo: React.FC = () => {
  const { at, duration } = useScene();
  const f = useCurrentFrame();
  const tr = at("triangulos");
  const qd = at("quadrado");
  const tb = at("tomba");
  const t2 = at("triangulo", 2);
  const swap = tw(f, qd - 10, qd + 4);
  // parte A: a tesoura acende seus 4 triângulos
  const camA = camMove(f, qd, { ...CAM_FRONT, yaw: -10, zoom: 92 }, { yaw: -4 });
  const n = nodes(FRONT);
  const tri = (pts: V3[], i: number): Item => poly(pts.map((p) => v.add(p, [0, 0, 0.02])), { color: c.accent, fill: 0.35 * tw(f, tr + i * 4, tr + 8 + i * 4) * (1 - swap), tint: 1, width: 0 }, 0.2);
  const itemsA: Item[] = [
    ...groundGrid(9, 1, { opacity: 1 - swap }),
    ...truss(FRONT, 0, { pernas: YEL, linha: CYA, pendural: CYA, escoras: YEL }).map((it) => ({ ...it, st: { ...it.st, opacity: 1 - swap } })),
    tri([n.L, n.P1, n.M], 0),
    tri([n.P1, n.A, n.M], 1),
    tri([n.A, n.P2, n.M], 2),
    tri([n.P2, n.R, n.M], 3),
  ];
  // parte B: quadrado articulado x triângulo, em 3D
  const camB: Cam = { yaw: interpolate(f, [qd, duration], [-30, -18], clamp), pitch: 18, zoom: 120, target: [0, 1.1, 0], cy: 1080, dist: 30 };
  const phi = tw(f, tb, tb + 26, 0, 48) * (Math.PI / 180);
  const Ls = 2.1;
  const S1: V3 = [-3.4, 0.1, 0];
  const S2: V3 = [-3.4 + Ls, 0.1, 0];
  const S3: V3 = v.add(S2, [Ls * Math.sin(phi), Ls * Math.cos(phi), 0]);
  const S4: V3 = v.add(S1, [Ls * Math.sin(phi), Ls * Math.cos(phi), 0]);
  const jit = f > t2 ? Math.sin((f - t2) * 1.6) * 0.06 * Math.exp(-(f - t2) / 8) : 0;
  const T1: V3 = [0.6, 0.1, 0];
  const T2: V3 = [3.4, 0.1, 0];
  const T3: V3 = [2 + jit, 2.4, 0];
  const sqSt: Style = f > tb + 4 ? RED : WOOD;
  const S = 0.16;
  const itemsB: Item[] =
    swap > 0
      ? [
          ...groundGrid(6, 0.5),
          ...bar(S1, S4, S, S, sqSt),
          ...bar(S4, S3, S, S, sqSt),
          ...bar(S3, S2, S, S, sqSt),
          ...bar(S1, S2, S, S, sqSt),
          ...bar(T1, T3, S, S, YEL),
          ...bar(T3, T2, S, S, YEL),
          ...bar(T1, T2, S, S, YEL),
        ].map((it) => ({ ...it, st: { ...it.st, opacity: swap } }))
      : [];
  const pB = (p: V3) => project(p, camB);
  return (
    <AbsoluteFill>
      <Title kicker="O SEGREDO" from={tr - 4}>
        SÓ
        <br />
        <span style={{ color: c.accent }}>TRIÂNGULOS</span>
      </Title>
      {swap < 1 && <Scene3D cam={camA} items={itemsA} />}
      {swap > 0 && (
        <Scene3D cam={camB} items={itemsB}>
          <g opacity={swap}>
            {[S1, S2, S3, S4].map((p, i) => (
              <circle key={i} cx={pB(p).x} cy={pB(p).y} r={11} fill={c.bgBottom} stroke={f > tb + 4 ? c.danger : c.line} strokeWidth={3} />
            ))}
            {[T1, T2, T3].map((p, i) => (
              <circle key={i} cx={pB(p).x} cy={pB(p).y} r={11} fill={c.bgBottom} stroke={c.accent} strokeWidth={3} />
            ))}
          </g>
          <Arrow from={[pB(S4).x - 160, pB(S4).y]} to={[pB(S4).x - 18, pB(S4).y]} start={tb - 6} dur={8} color={c.danger} width={7} head={24} />
          <Arrow from={[pB(T3).x - 170, pB(T3).y]} to={[pB(T3).x - 20, pB(T3).y]} start={t2 - 6} dur={8} color={c.danger} width={7} head={24} />
        </Scene3D>
      )}
      <Reveal from={tb + 16} style={{ top: 1300, left: 60, width: 440, textAlign: "center", fontSize: 34, fontWeight: 800, letterSpacing: 4, color: c.danger }}>
        ✕ TOMBA
      </Reveal>
      <Reveal from={t2 + 10} style={{ top: 1300, left: 560, width: 440, textAlign: "center", fontSize: 34, fontWeight: 800, letterSpacing: 4, color: c.accent }}>
        ✓ RÍGIDO
      </Reveal>
    </AbsoluteFill>
  );
};

// ─── 9. A parte curiosa: compressão x tração ───────────────────────
export const Curioso: React.FC = () => {
  const { at, duration } = useScene();
  const f = useCurrentFrame();
  const cam = camMove(f, duration, { ...CAM_FRONT, yaw: -42, pitch: 16, zoom: 88 }, { yaw: -12, zoom: 92 });
  const es = at("esmagadas");
  const pu = at("puxadas");
  const items: Item[] = [...groundGrid(9), ...walls(0, { opacity: 0.6 })];
  ZS.slice(0, -1).forEach((z) => items.push(...truss(z, 0, { pernas: { ...WOOD, opacity: 0.14 }, linha: { ...WOOD, opacity: 0.14 }, pendural: { ...WOOD, opacity: 0.14 }, escoras: { ...WOOD, opacity: 0.14 } })));
  items.push(...truss(FRONT, 0, { pernas: f >= es ? YEL : WOOD, escoras: f >= es ? YEL : WOOD, linha: f >= pu ? CYA : WOOD, pendural: f >= pu ? CYA : WOOD }));
  const n = nodes(FRONT);
  // setinhas: compressão →← (apontam para o meio da peça), tração ←→ (apontam para fora)
  const pair = (a: V3, b: V3, inward: boolean, from: number, color: string, k: number) => {
    const m = svgPt(v.lerp(a, b, 0.5), cam);
    const pa = svgPt(a, cam);
    const pb = svgPt(b, cam);
    const d = [pb[0] - pa[0], pb[1] - pa[1]];
    const L = Math.hypot(d[0], d[1]);
    const u = [d[0] / L, d[1] / L];
    const off = [-u[1] * 34, u[0] * 34];
    const pulse = 1 + 0.12 * Math.sin((f - from) / 4);
    const r1 = 70 * pulse;
    const r2 = 22;
    const P = (r: number, s: number): [number, number] => [m[0] + off[0] + u[0] * r * s, m[1] + off[1] + u[1] * r * s];
    return (
      <g key={k}>
        <Arrow from={inward ? P(r1, -1) : P(r2, -1)} to={inward ? P(r2, -1) : P(r1, -1)} start={from} dur={8} color={color} width={4} head={13} />
        <Arrow from={inward ? P(r1, 1) : P(r2, 1)} to={inward ? P(r2, 1) : P(r1, 1)} start={from} dur={8} color={color} width={4} head={13} />
      </g>
    );
  };
  const legend = (y: number, from: number, color: string, text: string, sym: string) => (
    <Reveal from={from} style={{ top: y, left: 64, display: "flex", alignItems: "center", gap: 22, fontSize: 44, fontWeight: 800, letterSpacing: 3, color }}>
      <span style={{ width: 70, height: 12, background: color, borderRadius: 6, display: "inline-block" }} />
      {text}
      <span style={{ fontSize: 34, color: c.dim, fontWeight: 500 }}>{sym}</span>
    </Reveal>
  );
  return (
    <AbsoluteFill>
      <Reveal from={0} style={{ top: 270, left: 64, fontSize: 28, letterSpacing: 8, color: c.dim }}>
        A PARTE MAIS CURIOSA
      </Reveal>
      <Reveal from={at("dobram") - 4} style={{ top: 312, left: 60, fontSize: 64, fontWeight: 800, color: c.line, letterSpacing: -1 }}>
        QUASE NADA DOBRA
      </Reveal>
      {legend(410, es, c.compression, "ESMAGADA", "→ ←")}
      {legend(480, pu, c.tension, "PUXADA", "← →")}
      <Scene3D cam={cam} items={items}>
        {pair(n.L, n.A, true, es + 2, c.compression, 1)}
        {pair(n.R, n.A, true, es + 4, c.compression, 2)}
        {pair(n.L, n.R, false, pu + 2, c.tension, 3)}
        {pair(n.M, n.A, false, pu + 4, c.tension, 4)}
      </Scene3D>
      <Stat label="" value={5} unit="T" sub="PEÇAS DE 6×16 CM" from={at("toneladas")} dur={10} x={1016} y={560} size={110} color={c.accent} align="right" />
    </AbsoluteFill>
  );
};

// ─── 10. Encerramento: o telhado inteiro ────────────────────────────
export const Outro: React.FC = () => {
  const { at, duration } = useScene();
  const f = useCurrentFrame();
  const cam = camMove(f, duration, { ...CAM_HOUSE, yaw: -58, pitch: 24, zoom: 60 }, { yaw: -24, zoom: 64 });
  const rp = at("repita");
  const te = at("telhas");
  const pb = at("parabens");
  const sg = at("sabia", 1);
  const sg2 = at("sabia", 2);
  const items: Item[] = [...groundGrid(9), shadow(), ...walls(0, {}, false)];
  ZS.forEach((z, i) => {
    const g = tw(f, rp + i * 4, rp + 14 + i * 4);
    if (g <= 0) return;
    items.push(...truss(z, 0, { pernas: { ...YEL, opacity: g }, linha: { ...CYA, opacity: g }, pendural: { ...CYA, opacity: g }, escoras: { ...YEL, opacity: g } }));
  });
  // cumeeira e terças
  const tg = tw(f, rp + 40, rp + 60);
  if (tg > 0)
    for (const t of [0, 0.33, 0.66])
      for (const sgn of [-1, 1]) {
        const p = v.lerp([sgn * HALF, WH + SEC.h, 0], [0, WH + RISE + SEC.h, 0], t);
        items.push(...bar([p[0], p[1], -ZH], [p[0], p[1], -ZH + 2 * ZH * tg], 0.1, 0.1, WOOD));
      }
  items.push(...roof(tw(f, te, te + 24, 0, 0.9)));
  const dim = tw(f, sg, sg + 12, 1, 0.22);
  const card = progress(f, sg - 4, 12);
  return (
    <AbsoluteFill>
      <div style={{ opacity: dim }}>
        <div style={{ opacity: tw(f, pb - 8, pb, 1, 0) }}>
          <Reveal from={rp} style={{ top: 270, left: 64, fontSize: 28, letterSpacing: 8, color: c.dim }}>
            UMA TESOURA A CADA
          </Reveal>
          <Stat label="" value={1} unit="METRO" from={at("metro")} dur={6} x={60} y={300} size={150} color={c.accent} />
        </div>
        <Title kicker="VOCÊ CONSTRUIU UMA TESOURA" from={pb} color={c.accent} size={120}>
          PARABÉNS!
        </Title>
      </div>
      <div style={{ opacity: dim }}>
        <Scene3D cam={cam} items={items} />
      </div>
      {card > 0 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: brand.font, opacity: card }}>
          <div style={{ fontSize: 30, letterSpacing: 10, color: c.dim, marginTop: -200 }}>COMENTE AÍ</div>
          {[
            { from: sg, q: "JÁ SABIA?", w: "TESOURA", color: c.accent },
            { from: sg2, q: "NÃO SABIA?", w: "APRENDI", color: c.tension },
          ].map((r) => {
            const o = progress(f, r.from, 10);
            return (
              <div key={r.w} style={{ opacity: o, transform: `translateY(${(1 - o) * 20}px)`, marginTop: 30, width: 760, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 34px", border: `3px solid ${r.color}`, borderRadius: 14, background: "rgba(16,40,82,0.85)" }}>
                <span style={{ fontSize: 36, fontWeight: 600, color: c.line, letterSpacing: 2 }}>{r.q}</span>
                <span style={{ fontSize: 52, fontWeight: 800, color: r.color, letterSpacing: 2 }}>“{r.w}”</span>
              </div>
            );
          })}
          <div style={{ marginTop: 50, fontSize: 30, letterSpacing: 6, color: c.dim }}>PRÓXIMO: A FUNDAÇÃO · {brand.handle.toUpperCase()}</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const scenes: Record<string, React.FC> = {
  hook: Hook,
  abre: Abre,
  linha: Linha,
  enverga: Enverga,
  pendural: Pendural,
  cede: Cede,
  escoras: Escoras,
  triangulo: Triangulo,
  curioso: Curioso,
  outro: Outro,
};
