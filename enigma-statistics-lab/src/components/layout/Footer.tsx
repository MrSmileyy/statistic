import React from 'react';
import { Language } from '../../types';
import { getTranslations } from '../../i18n/translations';

interface FooterProps {
  language: Language;
}

export const Footer: React.FC<FooterProps> = ({ language }) => {
  const t = getTranslations(language);

  return (
    <footer className="mt-12 border-t border-zinc-800/80 bg-[#090a0d] py-6 text-xs text-zinc-500">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2 font-mono text-zinc-400">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          <span>Enigma M3 / Turing-Welchman Bombe / Statistical Cryptanalysis Lab</span>
        </div>
        <div className="text-center sm:text-right">{t.footer.text}</div>
      </div>
    </footer>
  );
};
