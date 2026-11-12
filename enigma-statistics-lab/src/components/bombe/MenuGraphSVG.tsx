import React, { useState } from 'react';
import type { BombeMenu, Language } from '../../types';

interface MenuGraphSVGProps {
  menu: BombeMenu;
  language: Language;
  compactHeader?: boolean;
}

export const MenuGraphSVG: React.FC<MenuGraphSVGProps> = ({
  menu,
  language,
  compactHeader = false,
}) => {
  const [selectedCycleIdx, setSelectedCycleIdx] = useState<number | null>(0);
  const isIt = language === 'it';

  const activeCycle =
    selectedCycleIdx !== null && menu.cycles[selectedCycleIdx]
      ? menu.cycles[selectedCycleIdx]
      : null;
  const highlightedEdgeIds = new Set<number>(activeCycle?.edgeIds ?? []);
  const highlightedNodes = new Set<string>(activeCycle?.nodes ?? []);

  const cx = 240;
  const cy = 155;
  const radius = 112;

  const coords = new Map<string, { x: number; y: number }>();
  const count = Math.max(1, menu.nodes.length);
  menu.nodes.forEach((node, idx) => {
    const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
    coords.set(node.char, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });

  const pairEdgeCounter = new Map<string, number>();
  const testRegDegree =
    menu.nodes.find((n) => n.char === menu.testRegister)?.degree ?? 0;

  return (
    <section className="rounded-xl border border-zinc-800 bg-[#0d0e12] p-4 shadow-panel sm:p-5">
      {!compactHeader && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-100">
              {isIt ? 'Fase 2 - Schema elettrico dei collegamenti' : 'Phase 2 - Electrical Link Diagram'}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              {isIt
                ? 'Ogni coppia cifrato-parola forma un ponte elettrico tra due lettere. I percorsi chiusi permettono di filtrare i rotori.'
                : 'Each cipher-word pair forms an electrical bridge between two letters. Closed loops filter out invalid rotor settings.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 font-mono text-xs text-zinc-300">
            <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5">
              {menu.nodes.length} {isIt ? 'lettere' : 'letters'}
            </span>
            <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5">
              {menu.edges.length} {isIt ? 'coppie' : 'links'}
            </span>
            <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-emerald-400">
              {menu.cycles.length} {isIt ? 'cicli chiusi' : 'closed loops'}
            </span>
          </div>
        </div>
      )}

      {menu.edges.length === 0 ? (
        <div className="flex h-44 items-center justify-center rounded border border-dashed border-zinc-800 bg-[#08090c] p-4 text-center font-mono text-xs text-zinc-500">
          {isIt
            ? 'Seleziona una posizione compatibile nella Fase 1 per generare lo schema dei collegamenti.'
            : 'Select a compatible position in Phase 1 to generate the link diagram.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Circular Wiring Diagram */}
          <div className="rounded border border-zinc-800 bg-[#08090c] p-3 lg:col-span-7">
            <svg viewBox="0 0 480 310" className="h-auto w-full">
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

                return (
                  <g key={edge.id}>
                    <path
                      d={`M ${p1.x} ${p1.y} Q ${ctrlX} ${ctrlY} ${p2.x} ${p2.y}`}
                      fill="none"
                      stroke={inActiveCycle ? '#c99c47' : 'rgba(148, 163, 184, 0.32)'}
                      strokeWidth={inActiveCycle ? 2.6 : 1.3}
                    />
                    <circle
                      cx={labelX}
                      cy={labelY}
                      r={9}
                      fill={inActiveCycle ? '#292011' : '#0f131a'}
                      stroke={inActiveCycle ? '#c99c47' : '#334155'}
                      strokeWidth={1}
                    />
                    <text
                      x={labelX}
                      y={labelY + 3}
                      textAnchor="middle"
                      className={`font-mono text-[9px] font-bold ${
                        inActiveCycle ? 'fill-amber-200' : 'fill-zinc-400'
                      }`}
                    >
                      {edge.messageIndex}
                    </text>
                  </g>
                );
              })}

              {/* Letter Nodes */}
              {menu.nodes.map((node) => {
                const pt = coords.get(node.char);
                if (!pt) return null;
                const isTestReg = node.char === menu.testRegister;
                const isHighlighted = highlightedNodes.has(node.char);

                return (
                  <g key={node.char}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isTestReg ? 18 : 15}
                      fill={isTestReg ? '#2d200c' : '#11141c'}
                      stroke={
                        isTestReg
                          ? '#d4a853'
                          : isHighlighted
                            ? '#c99c47'
                            : node.inCycle
                              ? '#64748b'
                              : '#334155'
                      }
                      strokeWidth={isTestReg ? 2.5 : 1.8}
                    />
                    <text
                      x={pt.x}
                      y={pt.y + 4}
                      textAnchor="middle"
                      className={`font-mono text-xs font-bold ${
                        isTestReg ? 'fill-amber-200' : 'fill-zinc-100'
                      }`}
                    >
                      {node.char}
                    </text>
                  </g>
                );
              })}
            </svg>
            <p className="mt-1 text-center font-mono text-[11px] text-zinc-500">
              {isIt
                ? 'I numeri sui collegamenti indicano la posizione della coppia nel messaggio.'
                : 'Numbers on the links indicate the letter position inside the message.'}
            </p>
          </div>

          {/* Pairs & Closed Loops Readout */}
          <div className="flex flex-col justify-between space-y-4 rounded border border-zinc-800 bg-[#08090c] p-3.5 lg:col-span-5">
            <div className="space-y-3">
              {/* Extracted Letter Pairs */}
              <div>
                <div className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  {isIt
                    ? `Coppie estratte (${menu.edges.length})`
                    : `Extracted pairs (${menu.edges.length})`}
                </div>
                <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                  {menu.edges.map((e) => (
                    <span
                      key={e.id}
                      className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-zinc-300"
                    >
                      <span className="text-zinc-500">{e.messageIndex}:</span>
                      {e.from}-{e.to}
                    </span>
                  ))}
                </div>
              </div>

              {/* Closed Cycles */}
              <div className="border-t border-zinc-800 pt-3">
                <div className="mb-2 flex items-center justify-between font-mono text-[11px]">
                  <span className="uppercase tracking-wider text-zinc-300">
                    {isIt
                      ? `Cicli chiusi (${menu.cycles.length})`
                      : `Closed loops (${menu.cycles.length})`}
                  </span>
                  {menu.cycles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCycleIdx(null)}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200"
                    >
                      {isIt ? 'Deseleziona' : 'Clear'}
                    </button>
                  )}
                </div>

                {menu.cycles.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    {isIt
                      ? 'Nessun ciclo chiuso presente in questo allineamento.'
                      : 'No closed loops present in this alignment.'}
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
                              ? 'border-bletchley-brass bg-bletchley-brass/15 text-bletchley-brass-bright'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600'
                          }`}
                        >
                          <span>
                            {cycle.nodes.join(' - ')} - {cycle.nodes[0]}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {cycle.length} {isIt ? 'lati' : 'edges'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-2.5 font-mono text-[11px] text-zinc-400">
              <span>{isIt ? 'Lettera centrale di test:' : 'Central test letter:'} </span>
              <strong className="text-bletchley-brass-bright">{menu.testRegister}</strong>{' '}
              ({testRegDegree} {isIt ? 'collegamenti' : 'links'})
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
