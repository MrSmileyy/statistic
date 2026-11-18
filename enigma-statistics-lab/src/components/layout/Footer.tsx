import React from 'react';
import type { Language } from '../../types';

interface FooterProps {
  language?: Language;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="mt-10 border-t border-zinc-800/80 bg-[#090a0d] py-4 text-xs text-zinc-500">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 font-mono text-[11px] sm:flex-row sm:px-6">
        <span>Enigma M3 &amp; Cryptanalysis</span>
        <span>Reference vector: I-II-III, UKW-B, Rings 01-01-01, AAA &rarr; AAAAA = BDZGO</span>
      </div>
    </footer>
  );
};
