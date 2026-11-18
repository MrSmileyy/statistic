import React, { useEffect, useMemo, useState } from 'react';
import { inspectBombeHypotheses } from '../../core/bombe';
import {
  ALPHABET,
  ALPHABET_SIZE,
  formatPositionLabel,
  indexToChar,
} from '../../core/constants';
import type { BombeMenu, EnigmaConfig, Language } from '../../types';
import { InfoTooltip } from '../common/InfoTooltip';

interface MenuGraphSVGProps {
  menu: BombeMenu;
  enigmaConfig: EnigmaConfig;
  onConfigChange?: (next: EnigmaConfig) => void;
  language?: Language;
}

export const MenuGraphSVG: React.FC<MenuGraphSVGProps> = ({
  menu,
  enigmaConfig,
  onConfigChange,
}) => {
  const [selectedCycleIdx, setSelectedCycleIdx] = useState<number | null>(0);
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

  const activeTrace = hypothesisTraces[selectedPartnerIdx] ?? null;
  const consistentCount = hypothesisTraces.filter((t) => t.consistent).length;

  const activeCycle =
    selectedCycleIdx !== null && menu.cycles[selectedCycleIdx]
      ? menu.cycles[selectedCycleIdx]
      : null;
  const highlightedEdgeIds = new Set<number>(activeCycle?.edgeIds ?? []);
  const highlightedNodes = new Set<string>(activeCycle?.nodes ?? []);

  const width = 560;
  const height = 370;
  const cx = 280;
  const cy = 185;
  const radius = 114;

  const coords = new Map<string, { x: number; y: number; badgeX: number; badgeY: number }>();
  const count = Math.max(1, menu.nodes.length);
  menu.nodes.forEach((node, idx) => {
    const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    const badgeRadius = radius + 34;
    coords.set(node.char, {
      x,
      y,
      badgeX: cx + badgeRadius * Math.cos(angle),
      badgeY: cy + badgeRadius * Math.sin(angle),
    });
  });

  const pairEdgeCounter = new Map<string, number>();
  const testRegDegree =
    menu.nodes.find((n) => n.char === activeNodeChar)?.degree ?? 0;

  const handlePosChange = (slot: 0 | 1 | 2, val: number) => {
    const next: [number, number, number] = [...testedPositions] as [number, number, number];
    next[slot] = val;
    setTestedPositions(next);
  };

  return (
    <section className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
        <h3 className="flex items-center font-mono text-sm font-bold text-zinc-100">
          <span>Turing Menu &amp; Loop Contradiction Graph</span>
          <InfoTooltip
            title="Turing Menu & Loops"
            text="Turns each aligned crib/ciphertext pair into a link between letters. Closed loops let the Bombe cancel out unknown plugboard swaps and reject wrong rotor positions by electrical contradiction."
            align="left"
          />
        </h3>
        <div className="flex flex-wrap gap-2 font-mono text-xs text-zinc-400">
          <span className="inline-flex items-center rounded border border-zinc-800 bg-[#08090c] px-2 py-0.5">
            Nodes: <strong className="ml-1 text-zinc-200">{menu.nodes.length}</strong>
            <InfoTooltip
              title="Menu Nodes"
              text="Unique letters appearing in the current crib/ciphertext slice. Click any circle in the graph to test plugboard guesses on it."
            />
          </span>
          <span className="inline-flex items-center rounded border border-zinc-800 bg-[#08090c] px-2 py-0.5">
            Edges: <strong className="ml-1 text-zinc-200">{menu.edges.length}</strong>
            <InfoTooltip
              title="Menu Edges"
              text="Each edge connects a crib letter and ciphertext letter at a specific rotor step (pos 1, pos 2, ...)."
            />
          </span>
          <span className="inline-flex items-center rounded border border-zinc-800 bg-[#08090c] px-2 py-0.5">
            Closed Loops: <strong className="ml-1 text-emerald-400">{menu.cycles.length}</strong>
            <InfoTooltip
              title="Closed Loops (Closures)"
              text="Circular chains like R → Y → S → R. More loops give stronger elimination power—greatly cutting down false Bombe Stops."
              align="right"
            />
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="inline-flex items-center text-zinc-400">
                  1. Inject on node
                  <InfoTooltip
                    title="Test Register Node"
                    text="The letter where you inject electrical voltage (a stecker guess). Clicking any node circle in the SVG switches the injection point."
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
                      {n.char} (deg {n.degree})
                    </option>
                  ))}
                </select>
                <span className="text-zinc-500">(or click any node in graph)</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="inline-flex items-center text-zinc-400">
                  2. Tested rotor window
                  <InfoTooltip
                    title="Tested Rotor Window"
                    text="Try a candidate 3-letter window (e.g., 'Test AAA' vs the real key). Wrong rotor settings trigger electrical contradictions on all 26 plugboard guesses."
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
                <button
                  type="button"
                  onClick={() => setTestedPositions([0, 0, 0])}
                  className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-zinc-300 hover:border-zinc-500 hover:text-white"
                >
                  Test AAA
                </button>
                <button
                  type="button"
                  onClick={() => setTestedPositions(enigmaConfig.rotorPositions)}
                  className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-zinc-300 hover:border-zinc-500 hover:text-white"
                >
                  Reset ({formatPositionLabel(enigmaConfig.rotorPositions)})
                </button>
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
                  3. Assume stecker partner for{' '}
                  <strong className="mx-1 text-amber-300">{activeNodeChar}</strong>
                  <InfoTooltip
                    title="Plugboard Guess (Stecker)"
                    text="Pick which letter A–Z you assume is wired to the injection node. Green buttons produce a contradiction-free loop; red buttons conflict."
                    align="left"
                  />
                  :
                </span>
                <span className="text-[11px] text-zinc-400">
                  Consistent hypotheses at {formatPositionLabel(testedPositions)}:{' '}
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
                    <strong>Coherent Loop (GREEN)</strong> &mdash; Injecting{' '}
                    <strong>
                      {activeNodeChar} &harr; {activeTrace.assumedPartner}
                    </strong>{' '}
                    at window <strong>{formatPositionLabel(testedPositions)}</strong> propagates cleanly with no conflicting wires ({activeTrace.propagatedSteps} active contacts).
                  </span>
                ) : (
                  <span>
                    <strong>Electrical Contradiction (RED)</strong> &mdash; Assuming{' '}
                    <strong>
                      {activeNodeChar} &harr; {activeTrace.assumedPartner}
                    </strong>{' '}
                    at <strong>{formatPositionLabel(testedPositions)}</strong> energizes multiple conflicting letters on{' '}
                    <strong>{activeTrace.contradictedNodes.join(', ')}</strong>. The Bombe discards this hypothesis.
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Dynamic SVG Menu & Loop Graph */}
            <div className="rounded border border-zinc-800 bg-[#08090c] p-3 lg:col-span-7">
              <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
                {menu.edges.map((edge) => {
                  const p1 = coords.get(edge.from);
                  const p2 = coords.get(edge.to);
                  if (!p1 || !p2) return null;

                  const pairKey =
                    edge.from < edge.to
                      ? `${edge.from}-${edge.to}`
                      : `${edge.to}-${edge.from}`;
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
                  const curveOffset =
                    seen === 0 ? 0 : (seen % 2 === 1 ? 1 : -1) * 26 * Math.ceil(seen / 2);
                  const ctrlX = mx - (dy / len) * curveOffset;
                  const ctrlY = my + (dx / len) * curveOffset;

                  const labelX = 0.25 * p1.x + 0.5 * ctrlX + 0.25 * p2.x;
                  const labelY = 0.25 * p1.y + 0.5 * ctrlY + 0.25 * p2.y;

                  const isContradicted = activeTrace && !activeTrace.consistent;
                  const strokeColor =
                    inActiveCycle || edgeEnergized
                      ? isContradicted
                        ? '#ef4444'
                        : '#10b981'
                      : 'rgba(148, 163, 184, 0.35)';

                  const pathD = `M ${p1.x} ${p1.y} Q ${ctrlX} ${ctrlY} ${p2.x} ${p2.y}`;

                  return (
                    <g key={edge.id}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeOpacity={inActiveCycle || edgeEnergized ? 0.9 : 0.6}
                        strokeWidth={inActiveCycle || edgeEnergized ? 2.6 : 1.2}
                      />
                      {(inActiveCycle || edgeEnergized) && (
                        <path
                          d={pathD}
                          fill="none"
                          stroke={isContradicted ? '#fda4af' : '#6ee7b7'}
                          strokeWidth={1.8}
                          strokeDasharray="6 6"
                        >
                          <animate
                            attributeName="stroke-dashoffset"
                            from="24"
                            to="0"
                            dur={isContradicted ? '0.9s' : '1.2s'}
                            repeatCount="indefinite"
                          />
                        </path>
                      )}
                      <rect
                        x={labelX - 18}
                        y={labelY - 8}
                        width={36}
                        height={16}
                        rx={4}
                        fill={
                          inActiveCycle || edgeEnergized
                            ? isContradicted
                              ? '#2e1014'
                              : '#082c1f'
                            : '#0f131a'
                        }
                        stroke={strokeColor}
                        strokeWidth={1}
                      />
                      <text
                        x={labelX}
                        y={labelY + 3.5}
                        textAnchor="middle"
                        className={`font-mono text-[8.5px] font-bold ${
                          inActiveCycle || edgeEnergized
                            ? isContradicted
                              ? 'fill-rose-200'
                              : 'fill-emerald-200'
                            : 'fill-zinc-400'
                        }`}
                      >
                        pos {edge.messageIndex + 1}
                      </text>
                    </g>
                  );
                })}

                {/* Letter Nodes (Clickable for Voltage Injection) */}
                {menu.nodes.map((node) => {
                  const pt = coords.get(node.char);
                  if (!pt) return null;
                  const isInjected = node.index === activeNodeIdx;
                  const isHighlighted = highlightedNodes.has(node.char);

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
                    ? '#3b0f17'
                    : nodeEnergized
                      ? '#093424'
                      : isInjected
                        ? '#2d200c'
                        : isHighlighted
                          ? '#182030'
                          : '#11141c';
                  const nodeStroke = nodeContradicted
                    ? '#ef4444'
                    : nodeEnergized
                      ? '#10b981'
                      : isInjected
                        ? '#d4a853'
                        : isHighlighted
                          ? '#64748b'
                          : '#334155';

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
                          r={22}
                          fill="none"
                          stroke="#d4a853"
                          strokeWidth={1.5}
                          strokeDasharray="3 2"
                        />
                      )}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={16}
                        fill={nodeFill}
                        stroke={nodeStroke}
                        strokeWidth={isInjected || nodeContradicted || nodeEnergized ? 2.4 : 1.5}
                      />
                      <text
                        x={pt.x}
                        y={pt.y + 4}
                        textAnchor="middle"
                        className={`font-mono text-xs font-bold ${
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

                      {energizedLetters.length > 0 && (
                        <g>
                          <rect
                            x={pt.badgeX - 24}
                            y={pt.badgeY - 9}
                            width={48}
                            height={18}
                            rx={3}
                            fill={nodeContradicted ? '#7f1d1d' : '#065f46'}
                            stroke={nodeContradicted ? '#ef4444' : '#10b981'}
                            strokeWidth={1}
                          />
                          <text
                            x={pt.badgeX}
                            y={pt.badgeY + 3.5}
                            textAnchor="middle"
                            className={`font-mono text-[9px] font-bold ${
                              nodeContradicted ? 'fill-rose-100' : 'fill-emerald-100'
                            }`}
                          >
                            {nodeContradicted
                              ? `${energizedLetters.slice(0, 2).join(',')}${energizedLetters.length > 2 ? '+' : ''} ✕`
                              : `=${energizedLetters[0]}`}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Pairs, Closed Loops & Energized Deduced Wires */}
            <div className="flex flex-col justify-between space-y-4 rounded border border-zinc-800 bg-[#08090c] p-3.5 lg:col-span-5">
              <div className="space-y-3">
                <div>
                  <div className="mb-1.5 inline-flex items-center font-mono text-xs text-zinc-400">
                    Menu Edges ({menu.edges.length})
                    <InfoTooltip
                      title="Menu Links"
                      text="Each item shows the 1-based rotor step position and the crib-to-cipher letter link at that step."
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                    {menu.edges.map((e) => (
                      <span
                        key={e.id}
                        className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-zinc-300"
                      >
                        <span className="text-zinc-500">pos {e.messageIndex + 1}: </span>
                        {e.from}&harr;{e.to}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-3">
                  <div className="mb-2 flex items-center justify-between font-mono text-xs">
                    <span className="inline-flex items-center text-zinc-400">
                      Detected Closed Loops ({menu.cycles.length})
                      <InfoTooltip
                        title="Closed Cycles"
                        text="Click any loop to highlight its path on the graph. Loops let current return to the starting node so the Bombe can test self-consistency."
                      />
                    </span>
                    {menu.cycles.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedCycleIdx(null)}
                        className="text-xs text-zinc-400 hover:text-zinc-200"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {menu.cycles.length === 0 ? (
                    <p className="font-mono text-xs text-zinc-500">
                      No closed loops in this alignment.
                    </p>
                  ) : (
                    <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                      {menu.cycles.map((cycle, idx) => {
                        const active = selectedCycleIdx === idx;
                        return (
                          <button
                            key={`${cycle.nodes.join('')}-${idx}`}
                            type="button"
                            onClick={() => setSelectedCycleIdx(active ? null : idx)}
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
                              len {cycle.length}
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
