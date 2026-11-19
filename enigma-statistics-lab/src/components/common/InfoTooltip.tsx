import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface InfoTooltipProps {
  text: string;
  title?: string;
  align?: 'left' | 'center' | 'right';
}

interface PopoverCoords {
  top: number;
  left: number;
  placeAbove: boolean;
  width: number;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  text,
  title,
  align = 'center',
}) => {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);

  const isOpen = hoverOpen || pinned;

  const updateCoords = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 16);

    let desiredLeft = rect.left + rect.width / 2 - width / 2;
    if (align === 'left') desiredLeft = rect.left;
    if (align === 'right') desiredLeft = rect.right - width;

    const left = Math.max(8, Math.min(window.innerWidth - width - 8, desiredLeft));
    const placeAbove = rect.bottom + 185 > window.innerHeight && rect.top > 185;
    const top = placeAbove ? rect.top - 6 : rect.bottom + 6;

    setCoords({ top, left, placeAbove, width });
  }, [align]);

  useEffect(() => {
    if (!isOpen) return;
    updateCoords();

    const handleScrollOrResize = () => updateCoords();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateCoords]);

  useEffect(() => {
    if (!pinned) return;

    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setPinned(false);
      setHoverOpen(false);
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinned(false);
        setHoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [pinned]);

  return (
    <>
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-label={title ? `Help: ${title}` : 'Help info'}
        aria-expanded={isOpen}
        onMouseEnter={() => setHoverOpen(true)}
        onMouseLeave={() => setHoverOpen(false)}
        onFocus={() => setHoverOpen(true)}
        onBlur={() => {
          if (!pinned) setHoverOpen(false);
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPinned((p) => !p);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setPinned((p) => !p);
          }
        }}
        className={`ml-1 inline-flex h-4 w-4 shrink-0 cursor-help select-none items-center justify-center rounded-full border font-mono text-[10px] font-bold transition ${
          isOpen
            ? 'border-amber-400 bg-amber-500/20 text-amber-200'
            : 'border-zinc-600 bg-zinc-900 text-amber-300 hover:border-amber-400 hover:bg-zinc-800'
        }`}
      >
        ?
      </span>

      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              transform: coords.placeAbove ? 'translateY(-100%)' : undefined,
            }}
            onMouseEnter={() => setHoverOpen(true)}
            onMouseLeave={() => setHoverOpen(false)}
            className="z-[100] rounded-md border border-zinc-700 bg-[#141720] p-2.5 font-sans text-xs font-normal normal-case tracking-normal leading-relaxed text-zinc-200 shadow-2xl"
          >
            {title && (
              <div className="mb-1 border-b border-zinc-800 pb-1 font-mono text-[11px] font-bold text-amber-300">
                {title}
              </div>
            )}
            <p className="m-0 whitespace-pre-line text-zinc-300">{text}</p>
          </div>,
          document.body
        )}
    </>
  );
};
