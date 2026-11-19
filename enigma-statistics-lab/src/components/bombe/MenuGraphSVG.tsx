import React, { useEffect, useMemo, useState } from 'react';
import { inspectBombeHypotheses } from '../../core/bombe';
import {
  ALPHABET,
  ALPHABET_SIZE,
  formatPositionLabel,
  indexToChar,
} from '../../core/constants';
import type {
  BombeMenu,
  EnigmaConfig,
  Language,
  MenuCycle,
  MenuEdge,
  MenuNode,
} from '../../types';
import { InfoTooltip } from '../common/InfoTooltip';

interface MenuGraphSVGProps {
  menu: BombeMenu;
  enigmaConfig: EnigmaConfig;
  onConfigChange?: (next: EnigmaConfig) => void;
  language?: Language;
}

interface NodePosition {
  x: number;
  y: number;
  badgeX: number;
  badgeY: number;
  role: 'loop' | 'branch' | 'secondary';
}

interface GraphLayout {
  width: number;
  height: number;
  loopCx: number;
  loopCy: number;
  hasSecondaryColumn: boolean;
  dividerX: number;
  coords: Map<string, NodePosition>;
  visibleNodeChars: Set<string>;
  hiddenNodeCount: number;
  hiddenEdgeCount: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Compute an uncluttered, loop-first layout:
 * 1. Places active closed-loop nodes consecutively around a spacious ring (zero crossing chords).
 * 2. Places directly attached branch nodes radially outward from their parent loop node.
 * 3. Places disconnected pairs/chains in a clean side column (when showAll is enabled).
 */
function computeMenuLayout(
  menu: BombeMenu,
  activeCycle: MenuCycle | null,
  showAll: boolean
): GraphLayout {
  const width = 640;
  const height = 400;

  // Build adjacency map by node char
  const adj = new Map<string, Set<string>>();
  for (const n of menu.nodes) adj.set(n.char, new Set());
  for (const e of menu.edges) {
    adj.get(e.from)?.add(e.to);
    adj.get(e.to)?.add(e.from);
  }

  // Group all nodes into connected components
  const visitedAll = new Set<string>();
  const components: string[][] = [];
  for (const n of menu.nodes) {
    if (visitedAll.has(n.char)) continue;
    const comp: string[] = [];
    const queue = [n.char];
    visitedAll.add(n.char);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      comp.push(cur);
      for (const nb of adj.get(cur) ?? []) {
        if (!visitedAll.has(nb)) {
          visitedAll.add(nb);
          queue.push(nb);
        }
      }
    }
    components.push(comp);
  }

  // Determine ordered loop nodes (unique)
  const loopNodes: string[] = [];
  if (activeCycle) {
    for (const ch of activeCycle.nodes) {
      if (!loopNodes.includes(ch)) loopNodes.push(ch);
    }
  }

  // Find primary component (either the one containing the active loop, or the largest component)
  let primaryComp: string[] = [];
  if (loopNodes.length > 0) {
    primaryComp =
      components.find((c) => c.includes(loopNodes[0])) ?? [...loopNodes];
  } else {
    components.sort((a, b) => b.length - a.length);
    primaryComp = components[0] ?? [];
  }
  const primarySet = new Set(primaryComp);
  const secondaryComps = components
    .filter((c) => c.length > 0 && !primarySet.has(c[0]))
    .sort((a, b) => b.length - a.length);

  const hasSecondaryColumn = showAll && secondaryComps.length > 0;
  const dividerX = 438;
  const loopCx = hasSecondaryColumn ? 215 : 320;
  const loopCy = 200;

  const coords = new Map<string, NodePosition>();
  const visibleNodeChars = new Set<string>();

  for (const ch of primaryComp) visibleNodeChars.add(ch);
  if (hasSecondaryColumn) {
    for (const comp of secondaryComps) {
      for (const ch of comp) visibleNodeChars.add(ch);
    }
  }

  // 1. Position primary component
  if (loopNodes.length >= 2) {
    const branchExists = primaryComp.length > loopNodes.length;
    const baseR =
      loopNodes.length === 2
        ? hasSecondaryColumn
          ? 76
          : 92
        : branchExists
          ? hasSecondaryColumn
            ? 82
            : 96
          : hasSecondaryColumn
            ? 104
            : 122;

    const loopAngleMap = new Map<string, number>();

    loopNodes.forEach((ch, idx) => {
      const angle =
        loopNodes.length === 2
          ? idx === 0
            ? Math.PI
            : 0
          : (2 * Math.PI * idx) / loopNodes.length - Math.PI / 2;
      loopAngleMap.set(ch, angle);
      const x = loopCx + baseR * Math.cos(angle);
      const y = loopCy + baseR * Math.sin(angle);
      const badgeDist = 36;
      const bx = clamp(x + badgeDist * Math.cos(angle), 48, (hasSecondaryColumn ? dividerX - 18 : width) - 48);
      const by = clamp(y + badgeDist * Math.sin(angle), 20, height - 20);
      coords.set(ch, { x, y, badgeX: bx, badgeY: by, role: 'loop' });
    });

    // BFS outward from loop nodes to lay out branches cleanly around their anchor loop node
    const placed = new Set<string>(loopNodes);
    const depthOf = new Map<string, number>();
    const childrenOf = new Map<string, string[]>();
    const q: string[] = [...loopNodes];
    for (const ch of loopNodes) depthOf.set(ch, 0);

    while (q.length > 0) {
      const cur = q.shift()!;
      const curDepth = depthOf.get(cur) ?? 0;
      for (const nb of adj.get(cur) ?? []) {
        if (!placed.has(nb) && primarySet.has(nb)) {
          placed.add(nb);
          depthOf.set(nb, curDepth + 1);
          const list = childrenOf.get(cur) ?? [];
          list.push(nb);
          childrenOf.set(cur, list);
          q.push(nb);
        }
      }
    }

    // Place branches layer by layer
    const maxXLimit = hasSecondaryColumn ? dividerX - 36 : width - 52;
    const placeChildren = (parentChar: string, baseAngle: number, currentDepth: number) => {
      const kids = childrenOf.get(parentChar) ?? [];
      if (kids.length === 0) return;
      const pPos = coords.get(parentChar)!;
      const stepDist = currentDepth === 1 ? 74 : 62;
      const spread = kids.length === 1 ? 0 : Math.min(0.65, 0.9 / kids.length);

      kids.forEach((kid, i) => {
        const offsetAngle = (i - (kids.length - 1) / 2) * spread;
        const a = baseAngle + offsetAngle;
        const x = clamp(pPos.x + stepDist * Math.cos(a), 50, maxXLimit);
        const y = clamp(pPos.y + stepDist * Math.sin(a), 44, height - 44);
        const bx = clamp(x + 32 * Math.cos(a), 48, maxXLimit + 6);
        const by = clamp(y + 32 * Math.sin(a), 18, height - 18);
        coords.set(kid, { x, y, badgeX: bx, badgeY: by, role: 'branch' });
        placeChildren(kid, a, currentDepth + 1);
      });
    };

    for (const ch of loopNodes) {
      placeChildren(ch, loopAngleMap.get(ch) ?? 0, 1);
    }
  } else if (primaryComp.length > 0) {
    // No closed loops: lay out primary component cleanly as a spacious horizontal/arched chain
    const leftPad = 60;
    const rightPad = hasSecondaryColumn ? dividerX - 42 : width - 60;
    const span = Math.max(80, rightPad - leftPad);
    primaryComp.forEach((ch, idx) => {
      const t = primaryComp.length === 1 ? 0.5 : idx / (primaryComp.length - 1);
      const x = leftPad + t * span;
      const arcOffset = primaryComp.length > 3 ? Math.sin(t * Math.PI) * -36 : 0;
      const y = loopCy + arcOffset + (idx % 2 === 0 ? -18 : 22);
      coords.set(ch, {
        x,
        y,
        badgeX: x,
        badgeY: clamp(y + (idx % 2 === 0 ? -32 : 34), 18, height - 18),
        role: 'branch',
      });
    });
  }

  // 2. Position secondary disconnected components in a neat right column
  if (hasSecondaryColumn) {
    const rowCount = secondaryComps.length;
    const topStart = 58;
    const availH = height - 92;
    const rowStep = rowCount <= 1 ? 0 : Math.min(68, availH / (rowCount - 1));
    const colStart = dividerX + 40;
    const colEnd = width - 40;

    secondaryComps.forEach((comp, rowIdx) => {
      const y = rowCount === 1 ? height / 2 : topStart + rowIdx * rowStep;
      const stepX = comp.length <= 1 ? 0 : (colEnd - colStart) / (comp.length - 1);
      comp.forEach((ch, idx) => {
        const x = comp.length === 1 ? (colStart + colEnd) / 2 : colStart + idx * stepX;
        coords.set(ch, {
          x,
          y,
          badgeX: x,
          badgeY: clamp(y - 26, 16, height - 16),
          role: 'secondary',
        });
      });
    });
  }

  const hiddenNodeCount = menu.nodes.length - visibleNodeChars.size;
  const hiddenEdgeCount = menu.edges.filter(
    (e) => !visibleNodeChars.has(e.from) || !visibleNodeChars.has(e.to)
  ).length;

  return {
    width,
    height,
    loopCx,
    loopCy,
    hasSecondaryColumn,
    dividerX,
    coords,
    visibleNodeChars,
    hiddenNodeCount,
    hiddenEdgeCount,
  };
}

export const MenuGraphSVG: React.FC<MenuGraphSVGProps> = ({
  menu,
  enigmaConfig,
  onConfigChange,
}) => {
  const [selectedCycleIdx, setSelectedCycleIdx] = useState<number | null>(0);
  const [showAllComponents, setShowAllComponents] = useState<boolean>(false);
  const [injectedNodeIdx, setInjectedNodeIdx] = useState<number>(menu.testRegisterIdx);
  const [selectedPartnerIdx, setSelectedPartnerIdx] = useState<number>(0);
  const [testedPositions, setTestedPositions] = useState<[number, number, number]>(
    enigmaConfig.rotorPositions
  );

  // Keep tested rotor window aligned when user loads a preset or applies a stop externally.
  useEffect(() => {
    setTestedPositions(enigmaConfig.rotorPositions);
  }, [
    enigmaConfig.rotorPositions[0],
    enigmaConfig.rotorPositions[1],
    enigmaConfig.rotorPositions[2],
  ]);

  // Reset cycle selection cleanly when menu changes
  useEffect(() => {
    setSelectedCycleIdx(menu.cycles.length > 0 ? 0 : null);
    if (menu.cycles.length === 0) {
      setShowAllComponents(true);
    }
  }, [menu.crib, menu.offset, menu.cycles.length]);

  const activeCycle =
    selectedCycleIdx !== null && menu.cycles[selectedCycleIdx]
      ? menu.cycles[selectedCycleIdx]
      : null;

  // Prefer injecting on a node that sits inside the active loop when menu updates
  useEffect(() => {
    if (activeCycle && activeCycle.nodes.length > 0) {
      const bestLoopNode = menu.nodes
        .filter((n) => activeCycle.nodes.includes(n.char))
        .sort((a, b) => b.degree - a.degree)[0];
      if (bestLoopNode) {
        setInjectedNodeIdx(bestLoopNode.index);
        return;
      }
    }
    setInjectedNodeIdx(menu.testRegisterIdx);
  }, [menu.crib, menu.offset, activeCycle, menu.nodes, menu.testRegisterIdx]);

  // Ensure injected node always belongs to the current menu nodes.
  const activeNodeIdx = useMemo(() => {
    if (menu.nodes.some((n) => n.index === injectedNodeIdx)) {
      return injectedNodeIdx;
    }
    return menu.testRegisterIdx;
  }, [menu.nodes, menu.testRegisterIdx, injectedNodeIdx]);

  const activeNodeChar = ALPHABET[activeNodeIdx] ?? menu.testRegister;

  const hypothesisTraces = useMemo(() => {
    if (!menu.isValidAlignment || menu.edges.length === 0) return [];
    return inspectBombeHypotheses(
      menu,
      enigmaConfig.rotors,
      enigmaConfig.reflector,
      enigmaConfig.ringSettings,
      testedPositions,
      activeNodeIdx
    );
  }, [
    menu,
    enigmaConfig.rotors,
    enigmaConfig.reflector,
    enigmaConfig.ringSettings,
    testedPositions,
    activeNodeIdx,
  ]);

  const consistentTraces = useMemo(
    () => hypothesisTraces.filter((t) => t.consistent),
    [hypothesisTraces]
  );

  // Auto-select the first coherent (green) hypothesis whenever one exists so users
  // see a clean green coherent loop by default instead of a wall of red errors.
  useEffect(() => {
    if (hypothesisTraces.length === 0) return;
    const current = hypothesisTraces[selectedPartnerIdx];
    if (consistentTraces.length > 0 && (!current || !current.consistent)) {
      setSelectedPartnerIdx(consistentTraces[0].assumedPartnerIdx);
    }
  }, [hypothesisTraces, consistentTraces, selectedPartnerIdx]);

  const activeTrace = hypothesisTraces[selectedPartnerIdx] ?? null;
  const consistentCount = consistentTraces.length;

  const highlightedEdgeIds = useMemo(
    () => new Set<number>(activeCycle?.edgeIds ?? []),
    [activeCycle]
  );
  const highlightedNodes = useMemo(
    () => new Set<string>(activeCycle?.nodes ?? []),
    [activeCycle]
  );

  const layout = useMemo(
    () => computeMenuLayout(menu, activeCycle, showAllComponents || menu.cycles.length === 0),
    [menu, activeCycle, showAllComponents]
  );

  // Build ordered loop circuit steps for the linear diagram below the graph
  const loopSteps = useMemo(() => {
    if (!activeCycle || activeCycle.nodes.length < 2) return [];
    const nodes = activeCycle.nodes;
    const steps: { from: string; to: string; edge: MenuEdge | undefined }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const from = nodes[i];
      const to = nodes[(i + 1) % nodes.length];
      const edgeId = activeCycle.edgeIds[i];
      const edge =
        menu.edges.find((e) => e.id === edgeId) ??
        menu.edges.find(
          (e) =>
            (e.from === from && e.to === to) || (e.from === to && e.to === from)
        );
      steps.push({ from, to, edge });
    }
    return steps;
  }, [activeCycle, menu.edges]);

  const visibleEdges = useMemo(
    () =>
      menu.edges.filter(
        (e) => layout.visibleNodeChars.has(e.from) && layout.visibleNodeChars.has(e.to)
      ),
    [menu.edges, layout.visibleNodeChars]
  );

  const visibleNodes: MenuNode[] = useMemo(
    () => menu.nodes.filter((n) => layout.visibleNodeChars.has(n.char)),
    [menu.nodes, layout.visibleNodeChars]
  );

  const pairEdgeTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of visibleEdges) {
      const key = e.from < e.to ? `${e.from}-${e.to}` : `${e.to}-${e.from}`;
      totals.set(key, (totals.get(key) ?? 0) + 1);
    }
    return totals;
  }, [visibleEdges]);

  const pairEdgeCounter = new Map<string, number>();
  const testRegDegree =
    menu.nodes.find((n) => n.char === activeNodeChar)?.degree ?? 0;

  const handlePosChange = (slot: 0 | 1 | 2, val: number) => {
    const next: [number, number, number] = [...testedPositions] as [number, number, number];
    next[slot] = val;
    setTestedPositions(next);
  };

  const falseWindow: [number, number, number] =
    enigmaConfig.rotorPositions[0] === 0 &&
    enigmaConfig.rotorPositions[1] === 0 &&
    enigmaConfig.rotorPositions[2] === 0
      ? [1, 1, 1]
      : [0, 0, 0];

  return (
    <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
        <div>
          <h3 className="flex items-center font-mono text-sm font-bold text-zinc-100">
            <span>Turing Menu &amp; Closed Loop Contradiction Graph</span>
            <InfoTooltip
              title="How to Read This Loop Graph"
              text={`• Each circle is a letter from the aligned crib & ciphertext.\n• Each connecting wire is labeled with the rotor step (pos 1, pos 2...) where that pair occurred.\n• Closed Loops are arranged as a clean ring in the center: if you guess a plug cable on one node and follow the wires around the ring, a RIGHT rotor key returns cleanly (GREEN), while a WRONG rotor key clashes with itself (RED SHORT).`}
              align="left"
            />
          </h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Closed loops let Turing&rsquo;s Bombe test a rotor key without knowing the plugboard: follow the signal around the ring—<strong className="text-emerald-300">Green</strong> means consistent, <strong className="text-rose-300">Red</strong> means electrical short-circuit (key rejected).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-zinc-400">
          <span className="inline-flex items-center rounded border border-zinc-800 bg-[#08090c] px-2 py-0.5">
            Nodes: <strong className="ml-1 text-zinc-200">{menu.nodes.length}</strong>
          </span>
          <span className="inline-flex items-center rounded border border-zinc-800 bg-[#08090c] px-2 py-0.5">
            Edges: <strong className="ml-1 text-zinc-200">{menu.edges.length}</strong>
          </span>
          <span className="inline-flex items-center rounded border border-zinc-800 bg-[#08090c] px-2 py-0.5">
            Closed Loops: <strong className="ml-1 text-emerald-400">{menu.cycles.length}</strong>
          </span>
        </div>
      </div>

      {!menu.isValidAlignment || menu.edges.length === 0 ? (
        <div className="flex h-36 items-center justify-center rounded border border-rose-500/40 bg-rose-950/25 p-4 text-center font-mono text-xs text-rose-300">
          {menu.edges.length === 0
            ? 'Enter a valid ciphertext and crib above to build the Turing Menu.'
            : 'Current crib alignment has a self-encryption collision. Slide the crib to a green alignment above to unlock the Loop Graph.'}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Interactive Contradiction Check Controls */}
          <div className="rounded border border-zinc-800 bg-[#08090c] p-3">
            {/* One-Click Contrast Demo Bar */}
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-zinc-400">
                  Quick test:
                </span>
                <button
                  type="button"
                  onClick={() => setTestedPositions(enigmaConfig.rotorPositions)}
                  className="rounded border border-emerald-500/50 bg-emerald-950/30 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-300 transition hover:bg-emerald-950/50"
                >
                  ✓ Show Green Coherent Loop ({formatPositionLabel(enigmaConfig.rotorPositions)})
                </button>
                <button
                  type="button"
                  onClick={() => setTestedPositions(falseWindow)}
                  className="rounded border border-rose-500/50 bg-rose-950/30 px-2.5 py-1 font-mono text-xs font-semibold text-rose-300 transition hover:bg-rose-950/50"
                >
                  ✕ Show Red Contradiction ({formatPositionLabel(falseWindow)})
                </button>
              </div>

              {menu.cycles.length > 0 && layout.hiddenNodeCount + (showAllComponents ? 1 : 0) > 0 && (
                <div className="flex items-center gap-1 rounded border border-zinc-800 bg-[#0d0e12] p-0.5 font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShowAllComponents(false)}
                    className={`rounded px-2 py-0.5 transition ${
                      !showAllComponents
                        ? 'bg-zinc-800 font-semibold text-amber-300'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Loop Focus (Clean)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAllComponents(true)}
                    className={`rounded px-2 py-0.5 transition ${
                      showAllComponents
                        ? 'bg-zinc-800 font-semibold text-sky-300'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Full Menu ({menu.nodes.length} nodes)
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="inline-flex items-center text-zinc-400">
                  1. Inject on node
                  <InfoTooltip
                    title="Test Register Node"
                    text="The letter where you inject electrical voltage (a plugboard guess). Clicking any circle in the graph moves the injection ring."
                    align="left"
                  />
                  :
                </span>
                <select
                  value={activeNodeIdx}
                  onChange={(e) => setInjectedNodeIdx(Number(e.target.value))}
                  aria-label="Injected menu node"
                  className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs font-bold text-amber-300 focus:border-amber-500 focus:outline-none"
                >
                  {menu.nodes.map((n) => (
                    <option key={n.char} value={n.index}>
                      {n.char} (deg {n.degree}
                      {n.inCycle ? ', in loop' : ''})
                    </option>
                  ))}
                </select>
                <span className="text-zinc-500">(or click any circle)</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="inline-flex items-center text-zinc-400">
                  2. Tested rotor window
                  <InfoTooltip
                    title="Tested Rotor Window"
                    text="Try a candidate 3-letter window. Wrong settings trigger electrical contradictions on every single plugboard guess (0/26 consistent)."
                  />
                  :
                </span>
                {([0, 1, 2] as const).map((slot) => (
                  <select
                    key={slot}
                    value={testedPositions[slot]}
                    onChange={(e) => handlePosChange(slot, Number(e.target.value))}
                    aria-label={`Loop check rotor ${slot + 1}`}
                    className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-1 font-mono text-xs font-bold text-zinc-100 focus:border-amber-500 focus:outline-none"
                  >
                    {ALPHABET.split('').map((ch, idx) => (
                      <option key={ch} value={idx}>
                        {ch}
                      </option>
                    ))}
                  </select>
                ))}
                {onConfigChange && (
                  <button
                    type="button"
                    onClick={() =>
                      onConfigChange({
                        ...enigmaConfig,
                        rotorPositions: testedPositions,
                      })
                    }
                    className="rounded border border-amber-500/50 bg-amber-500/15 px-2 py-1 font-mono text-[11px] font-semibold text-amber-300 hover:bg-amber-500/25"
                  >
                    Sync Window
                  </button>
                )}
              </div>
            </div>

            {/* Stecker Partner Selector (A-Z) */}
            <div className="mt-2.5 border-t border-zinc-800 pt-2.5">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                <span className="inline-flex items-center text-zinc-400">
                  3. Assume plugboard cable for{' '}
                  <strong className="mx-1 text-amber-300">{activeNodeChar}</strong>
                  <InfoTooltip
                    title="Plugboard Guess (Stecker)"
                    text="Click any button A–Z to assume a cable on the injection node. Green buttons satisfy the loop without clashing; red buttons short-circuit the loop."
                    align="left"
                  />
                  :
                </span>
                <span className="text-[11px] text-zinc-400">
                  Consistent guesses at {formatPositionLabel(testedPositions)}:{' '}
                  <strong className={consistentCount > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {consistentCount}/26
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1 sm:grid-cols-[repeat(13,minmax(0,1fr))]">
                {hypothesisTraces.map((tr) => {
                  const selected = tr.assumedPartnerIdx === selectedPartnerIdx;
                  return (
                    <button
                      key={tr.assumedPartner}
                      type="button"
                      onClick={() => setSelectedPartnerIdx(tr.assumedPartnerIdx)}
                      title={`${activeNodeChar}=${tr.assumedPartner}: ${tr.consistent ? 'Consistent' : 'Contradiction'}`}
                      className={`rounded border py-0.5 font-mono text-[11px] font-bold transition ${
                        selected ? 'ring-1 ring-amber-400 ' : ''
                      }${
                        tr.consistent
                          ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300'
                          : 'border-rose-500/30 bg-rose-950/25 text-rose-400/80 hover:border-rose-500/60'
                      }`}
                    >
                      {activeNodeChar}-{tr.assumedPartner}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Contradiction Feedback Banner */}
            {activeTrace && (
              <div
                className={`mt-2.5 rounded border px-3 py-2 font-mono text-xs ${
                  activeTrace.consistent
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                    : 'border-rose-500/50 bg-rose-950/35 text-rose-300'
                }`}
              >
                {activeTrace.consistent ? (
                  <span>
                    <strong>✓ Coherent Loop (GREEN)</strong> &mdash; Assuming{' '}
                    <strong>
                      {activeNodeChar} &harr; {activeTrace.assumedPartner}
                    </strong>{' '}
                    at window <strong>{formatPositionLabel(testedPositions)}</strong> flows all the way around the loop with <strong>zero conflicts</strong> (each letter gets 1 unique plug partner).
                  </span>
                ) : (
                  <span>
                    <strong>✕ Electrical Short-Circuit (RED)</strong> &mdash; Assuming{' '}
                    <strong>
                      {activeNodeChar} &harr; {activeTrace.assumedPartner}
                    </strong>{' '}
                    at <strong>{formatPositionLabel(testedPositions)}</strong> forces multiple conflicting letters onto the same node ({activeTrace.contradictedNodes.length} nodes shorted). Because one plug socket can only hold 1 cable, the Bombe instantly rejects this setting!
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Clean Loop-First SVG Graph */}
            <div className="flex flex-col justify-between rounded border border-zinc-800 bg-[#08090c] p-3 lg:col-span-7">
              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-zinc-500">
                  <span>
                    {activeCycle
                      ? `Center Ring: Closed Loop (${activeCycle.nodes.join(' → ')} → ${activeCycle.nodes[0]})`
                      : 'Menu Graph (Tree / Open Chain — No Closed Loop at This Offset)'}
                  </span>
                  {layout.hiddenNodeCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllComponents(true)}
                      className="text-sky-400 underline-offset-2 hover:underline"
                    >
                      +{layout.hiddenNodeCount} separate non-loop letters hidden (show all)
                    </button>
                  )}
                </div>

                <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="h-auto w-full">
                  {/* Subtle backdrop guide ring for the active closed loop */}
                  {activeCycle && activeCycle.nodes.length >= 3 && (
                    <circle
                      cx={layout.loopCx}
                      cy={layout.loopCy}
                      r={
                        Math.hypot(
                          (layout.coords.get(activeCycle.nodes[0])?.x ?? layout.loopCx) - layout.loopCx,
                          (layout.coords.get(activeCycle.nodes[0])?.y ?? layout.loopCy) - layout.loopCy
                        )
                      }
                      fill="none"
                      stroke={activeTrace?.consistent ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}
                      strokeWidth={18}
                    />
                  )}

                  {/* Center label inside the closed loop */}
                  {activeCycle && activeCycle.nodes.length >= 3 && (
                    <g>
                      <text
                        x={layout.loopCx}
                        y={layout.loopCy - 5}
                        textAnchor="middle"
                        className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                          activeTrace?.consistent ? 'fill-emerald-400/90' : 'fill-rose-400/90'
                        }`}
                      >
                        {activeTrace?.consistent ? 'LOOP OK' : 'SHORTED'}
                      </text>
                      <text
                        x={layout.loopCx}
                        y={layout.loopCy + 9}
                        textAnchor="middle"
                        className="fill-zinc-500 font-mono text-[8.5px]"
                      >
                        {activeCycle.length} steps
                      </text>
                    </g>
                  )}

                  {/* Divider when secondary disconnected pairs are shown */}
                  {layout.hasSecondaryColumn && (
                    <g>
                      <line
                        x1={layout.dividerX}
                        y1={26}
                        x2={layout.dividerX}
                        y2={layout.height - 20}
                        stroke="rgba(63,63,70,0.6)"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={(layout.dividerX + layout.width) / 2}
                        y={22}
                        textAnchor="middle"
                        className="fill-zinc-500 font-mono text-[9px] font-bold uppercase tracking-wider"
                      >
                        Separate Pairs
                      </text>
                    </g>
                  )}

                  {/* Edges */}
                  {visibleEdges.map((edge) => {
                    const p1 = layout.coords.get(edge.from);
                    const p2 = layout.coords.get(edge.to);
                    if (!p1 || !p2) return null;

                    const pairKey =
                      edge.from < edge.to
                        ? `${edge.from}-${edge.to}`
                        : `${edge.to}-${edge.from}`;
                    const totalForPair = pairEdgeTotals.get(pairKey) ?? 1;
                    const seen = pairEdgeCounter.get(pairKey) ?? 0;
                    pairEdgeCounter.set(pairKey, seen + 1);

                    const inActiveCycle = highlightedEdgeIds.has(edge.id);
                    const edgeEnergized =
                      activeTrace !== null &&
                      (activeTrace.boardMask[edge.fromIdx] ?? 0) !== 0 &&
                      (activeTrace.boardMask[edge.toIdx] ?? 0) !== 0;

                    const mx = (p1.x + p2.x) / 2;
                    const my = (p1.y + p2.y) / 2;
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const len = Math.max(1, Math.hypot(dx, dy));

                    // Bow parallel edges symmetrically apart; slightly bow perimeter loop edges outward
                    let curveOffset = 0;
                    if (totalForPair > 1) {
                      const dir = seen % 2 === 0 ? 1 : -1;
                      curveOffset = dir * (34 + Math.floor(seen / 2) * 20);
                    } else if (inActiveCycle && p1.role === 'loop' && p2.role === 'loop') {
                      // Push slightly away from loop center so chord stays super airy
                      const nx = -dy / len;
                      const ny = dx / len;
                      const outX = mx - layout.loopCx;
                      const outY = my - layout.loopCy;
                      const sign = nx * outX + ny * outY >= 0 ? 1 : -1;
                      curveOffset = sign * 12;
                    }

                    const ctrlX = mx - (dy / len) * curveOffset;
                    const ctrlY = my + (dx / len) * curveOffset;

                    const labelX = 0.25 * p1.x + 0.5 * ctrlX + 0.25 * p2.x;
                    const labelY = 0.25 * p1.y + 0.5 * ctrlY + 0.25 * p2.y;

                    const isContradicted = activeTrace !== null && !activeTrace.consistent;
                    const isPrimaryVisual = inActiveCycle || (edgeEnergized && p1.role !== 'secondary');
                    const strokeColor = inActiveCycle
                      ? isContradicted
                        ? '#ef4444'
                        : '#10b981'
                      : edgeEnergized
                        ? isContradicted
                          ? 'rgba(239, 68, 68, 0.5)'
                          : 'rgba(16, 185, 129, 0.75)'
                        : 'rgba(148, 163, 184, 0.32)';

                    const pathD = `M ${p1.x} ${p1.y} Q ${ctrlX} ${ctrlY} ${p2.x} ${p2.y}`;

                    return (
                      <g key={edge.id}>
                        <path
                          d={pathD}
                          fill="none"
                          stroke={strokeColor}
                          strokeOpacity={inActiveCycle ? 0.95 : 0.75}
                          strokeWidth={inActiveCycle ? 3.2 : isPrimaryVisual ? 1.8 : 1.2}
                        />
                        {inActiveCycle && (
                          <path
                            d={pathD}
                            fill="none"
                            stroke={isContradicted ? '#fda4af' : '#6ee7b7'}
                            strokeWidth={2}
                            strokeDasharray="6 6"
                          >
                            <animate
                              attributeName="stroke-dashoffset"
                              from="24"
                              to="0"
                              dur={isContradicted ? '0.8s' : '1.1s'}
                              repeatCount="indefinite"
                            />
                          </path>
                        )}
                        <rect
                          x={labelX - 20}
                          y={labelY - 8.5}
                          width={40}
                          height={17}
                          rx={4}
                          fill={
                            inActiveCycle
                              ? isContradicted
                                ? '#2e1014'
                                : '#072a1e'
                              : '#0f131a'
                          }
                          stroke={inActiveCycle ? strokeColor : '#3f3f46'}
                          strokeWidth={inActiveCycle ? 1.2 : 0.9}
                        />
                        <text
                          x={labelX}
                          y={labelY + 3.5}
                          textAnchor="middle"
                          className={`font-mono text-[8.5px] font-bold ${
                            inActiveCycle
                              ? isContradicted
                                ? 'fill-rose-200'
                                : 'fill-emerald-200'
                              : 'fill-zinc-300'
                          }`}
                        >
                          pos {edge.messageIndex + 1}
                        </text>
                      </g>
                    );
                  })}

                  {/* Letter Nodes (Clickable for Voltage Injection) */}
                  {visibleNodes.map((node) => {
                    const pt = layout.coords.get(node.char);
                    if (!pt) return null;
                    const isInjected = node.index === activeNodeIdx;
                    const isInLoop = highlightedNodes.has(node.char);

                    const mask = activeTrace?.boardMask[node.index] ?? 0;
                    const energizedLetters: string[] = [];
                    for (let b = 0; b < ALPHABET_SIZE; b++) {
                      if ((mask & (1 << b)) !== 0) {
                        energizedLetters.push(ALPHABET[b]);
                      }
                    }
                    const nodeContradicted = energizedLetters.length > 1;
                    const nodeEnergized = energizedLetters.length === 1;

                    const nodeFill = nodeContradicted
                      ? isInLoop || isInjected
                        ? '#3f1018'
                        : '#251015'
                      : nodeEnergized
                        ? '#093424'
                        : isInjected
                          ? '#2d200c'
                          : isInLoop
                            ? '#182030'
                            : '#11141c';

                    const nodeStroke = nodeContradicted
                      ? isInLoop || isInjected
                        ? '#ef4444'
                        : '#991b1b'
                      : nodeEnergized
                        ? '#10b981'
                        : isInjected
                          ? '#d4a853'
                          : isInLoop
                            ? '#64748b'
                            : '#334155';

                    // Only show clutter-free badges on loop/branch/injected nodes (or green deduced nodes)
                    const showBadge =
                      energizedLetters.length > 0 &&
                      (pt.role !== 'secondary' || nodeEnergized || isInjected);

                    const badgeText = nodeContradicted
                      ? `SHORT ×${energizedLetters.length}`
                      : energizedLetters[0] === node.char
                        ? `self (${node.char})`
                        : `plug=${energizedLetters[0]}`;

                    const badgeWidth = Math.max(46, badgeText.length * 5.6 + 10);

                    return (
                      <g
                        key={node.char}
                        onClick={() => setInjectedNodeIdx(node.index)}
                        className="cursor-pointer"
                      >
                        {isInjected && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={23}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth={1.8}
                            strokeDasharray="4 2.5"
                          />
                        )}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={pt.role === 'secondary' ? 14 : 17}
                          fill={nodeFill}
                          stroke={nodeStroke}
                          strokeWidth={isInLoop || isInjected ? 2.5 : 1.5}
                        />
                        <text
                          x={pt.x}
                          y={pt.y + 4}
                          textAnchor="middle"
                          className={`font-mono font-bold ${
                            pt.role === 'secondary' ? 'text-[11px]' : 'text-xs'
                          } ${
                            nodeContradicted
                              ? 'fill-rose-200'
                              : nodeEnergized
                                ? 'fill-emerald-200'
                                : isInjected
                                  ? 'fill-amber-200'
                                  : 'fill-zinc-100'
                          }`}
                        >
                          {node.char}
                        </text>

                        {showBadge && (
                          <g>
                            <rect
                              x={pt.badgeX - badgeWidth / 2}
                              y={pt.badgeY - 8.5}
                              width={badgeWidth}
                              height={17}
                              rx={3.5}
                              fill={nodeContradicted ? '#4c1118' : '#064e3b'}
                              stroke={nodeContradicted ? '#ef4444' : '#10b981'}
                              strokeWidth={1}
                            />
                            <text
                              x={pt.badgeX}
                              y={pt.badgeY + 3.2}
                              textAnchor="middle"
                              className={`font-mono text-[8.5px] font-bold ${
                                nodeContradicted ? 'fill-rose-200' : 'fill-emerald-100'
                              }`}
                            >
                              {badgeText}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Linear Circuit Trace + Legend */}
              <div className="mt-2 space-y-2 border-t border-zinc-800/80 pt-2.5">
                {loopSteps.length > 0 && (
                  <div className="rounded border border-zinc-800 bg-[#0d0e12] px-2.5 py-2">
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                      Follow the Closed Loop Step-by-Step:
                    </div>
                    <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
                      {loopSteps.map((st, idx) => (
                        <React.Fragment key={idx}>
                          <span
                            className={`rounded px-1.5 py-0.5 font-bold ${
                              st.from === activeNodeChar
                                ? 'border border-amber-500/50 bg-amber-950/30 text-amber-300'
                                : 'bg-zinc-900 text-zinc-100'
                            }`}
                          >
                            {st.from}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            &mdash;[{st.edge ? `pos ${st.edge.messageIndex + 1}` : '?'}]&rarr;
                          </span>
                        </React.Fragment>
                      ))}
                      <span
                        className={`rounded px-1.5 py-0.5 font-bold ${
                          loopSteps[0].from === activeNodeChar
                            ? 'border border-amber-500/50 bg-amber-950/30 text-amber-300'
                            : 'bg-zinc-900 text-zinc-100'
                        }`}
                      >
                        {loopSteps[0].from}
                      </span>
                      <span className="ml-1 text-[10px] text-zinc-400">(returns to start!)</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full border border-dashed border-amber-400" />
                    Injection Node
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    plug=X / self (Coherent)
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-rose-300">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    SHORT ×N (Contradiction)
                  </span>
                </div>
              </div>
            </div>

            {/* Pairs, Closed Loops & Energized Deduced Wires */}
            <div className="flex flex-col justify-between space-y-4 rounded border border-zinc-800 bg-[#08090c] p-3.5 lg:col-span-5">
              <div className="space-y-3">
                <div>
                  <div className="mb-1.5 inline-flex items-center font-mono text-xs text-zinc-400">
                    Menu Edges ({menu.edges.length})
                    <InfoTooltip
                      title="Menu Links"
                      text="Each item shows the 1-based rotor step position and the crib-to-cipher letter link at that step. Highlighted pills belong to the active closed loop."
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                    {menu.edges.map((e) => {
                      const inLoop = highlightedEdgeIds.has(e.id);
                      return (
                        <span
                          key={e.id}
                          className={`rounded border px-1.5 py-0.5 ${
                            inLoop
                              ? 'border-amber-500/50 bg-amber-950/25 font-semibold text-amber-200'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                          }`}
                        >
                          <span className="text-zinc-500">pos {e.messageIndex + 1}: </span>
                          {e.from}&harr;{e.to}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-3">
                  <div className="mb-2 flex items-center justify-between font-mono text-xs">
                    <span className="inline-flex items-center text-zinc-400">
                      Detected Closed Loops ({menu.cycles.length})
                      <InfoTooltip
                        title="Closed Cycles"
                        text="Click any loop to center and highlight its ring in the graph. Loops let current return to the starting node so the Bombe can test self-consistency."
                      />
                    </span>
                    {menu.cycles.length > 1 && (
                      <span className="text-[10px] text-zinc-500">Click to focus</span>
                    )}
                  </div>

                  {menu.cycles.length === 0 ? (
                    <p className="font-mono text-xs text-zinc-500">
                      No closed loops in this alignment. Try another green offset above to find a loop.
                    </p>
                  ) : (
                    <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                      {menu.cycles.map((cycle, idx) => {
                        const active = selectedCycleIdx === idx;
                        return (
                          <button
                            key={`${cycle.nodes.join('')}-${idx}`}
                            type="button"
                            onClick={() => setSelectedCycleIdx(idx)}
                            className={`flex w-full items-center justify-between rounded border px-2.5 py-1.5 font-mono text-xs transition ${
                              active
                                ? 'border-amber-500/60 bg-amber-500/15 font-bold text-amber-300'
                                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600'
                            }`}
                          >
                            <span>
                              {cycle.nodes.join(' \u2192 ')} &rarr; {cycle.nodes[0]}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {cycle.length} steps
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {activeTrace && activeTrace.consistent && activeTrace.deducedPairs.length > 0 && (
                  <div className="border-t border-zinc-800 pt-3">
                    <div className="mb-1.5 inline-flex items-center font-mono text-xs text-emerald-400">
                      Deduced Plugboard Pairs (from {activeNodeChar}=
                      {indexToChar(selectedPartnerIdx)})
                      <InfoTooltip
                        title="Recovered Stecker Pairs"
                        text="Because the assumed stecker wire propagated through the graph without conflict, every energized node directly reveals a plugboard cable pair."
                        align="right"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                      {activeTrace.deducedPairs.map(([a, b]) => (
                        <span
                          key={`${a}${b}`}
                          className="rounded border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 font-bold text-emerald-200"
                        >
                          {a}&harr;{b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-800 pt-2.5 font-mono text-xs text-zinc-400">
                <span>Injection Node: </span>
                <strong className="text-amber-300">{activeNodeChar}</strong>{' '}
                (degree {testRegDegree}) &bull;{' '}
                <span>Suggested Register: </span>
                <strong className="text-sky-300">{menu.testRegister}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
