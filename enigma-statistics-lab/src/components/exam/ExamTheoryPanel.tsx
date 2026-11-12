import React from 'react';
import { Language } from '../../types';
import { getTranslations } from '../../i18n/translations';

interface ExamTheoryPanelProps {
  language: Language;
}

export const ExamTheoryPanel: React.FC<ExamTheoryPanelProps> = ({ language }) => {
  const t = getTranslations(language);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-5 shadow-xl">
        <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          {language === 'it' ? 'DOCUMENTAZIONE TECNICA E MATEMATICA' : 'TECHNICAL AND MATHEMATICAL DOCUMENTATION'}
        </div>
        <h2 className="mt-1 text-base font-bold uppercase tracking-wider text-zinc-100">
          {t.theory.title}
        </h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-400">
          {t.theory.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Card 1: Combinatorics & Group Theory */}
        <div className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-5 shadow-xl">
          <div className="mb-3 border-b border-zinc-800 pb-2.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
              01 / PERMUTAZIONI E SPAZIO DELLE CHIAVI
            </span>
            <h3 className="mt-0.5 text-sm font-bold uppercase tracking-wider text-zinc-100">
              {t.theory.combinatoricsTitle}
            </h3>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
            <p>
              {language === 'it'
                ? 'La macchina Enigma M3 genera, ad ogni pressione di tasto t, una permutazione alfabetica E_t appartenente al gruppo simmetrico S_26:'
                : 'At each keypress t, the Enigma M3 machine generates an alphabetic permutation E_t in the symmetric group S_26:'}
            </p>

            <div className="rounded border border-zinc-800 bg-[#08090c] p-3 font-mono text-xs text-amber-300">
              E_t = S⁻¹ * R⁻¹ * M⁻¹ * L⁻¹ * U * L * M * R * S
            </div>

            <ul className="space-y-2 text-zinc-400">
              <li>
                <strong className="text-zinc-200">
                  {language === 'it' ? 'Scelta e ordine dei rotori:' : 'Rotor choice and order:'}
                </strong>{' '}
                5 * 4 * 3 = <span className="font-mono text-amber-300">60</span>{' '}
                {language === 'it' ? 'disposizioni (Walzenlage).' : 'arrangements (Walzenlage).'}
              </li>
              <li>
                <strong className="text-zinc-200">
                  {language === 'it' ? 'Posizioni iniziali (Grundstellung):' : 'Initial positions (Grundstellung):'}
                </strong>{' '}
                26³ = <span className="font-mono text-amber-300">17.576</span>{' '}
                {language === 'it'
                  ? 'combinazioni per ogni scelta di rotori.'
                  : 'combinations for each rotor selection.'}
              </li>
              <li>
                <strong className="text-zinc-200">
                  {language === 'it' ? 'Pannello a spine (Steckerbrett) con k=10 cavi:' : 'Plugboard (Steckerbrett) with k=10 cables:'}
                </strong>
                <div className="mt-1 rounded border border-zinc-800 bg-[#08090c] p-2 font-mono text-[11px] text-zinc-200">
                  26! / ((26 - 2k)! * 2^k * k!) = 150.738.274.937.250
                </div>
              </li>
            </ul>

            <div className="rounded border border-zinc-800 bg-[#08090c] p-3">
              <strong className="text-amber-300">
                {language === 'it'
                  ? 'Proprietà strutturale di involuzione senza punti fissi:'
                  : 'Structural fixed-point-free involution property:'}
              </strong>{' '}
              {language === 'it'
                ? 'Poiché il riflettore U scambia 13 coppie disgiunte di contatti, l’intera coniugazione soddisfa E_t(x) != x per ogni lettera x. Nessuna lettera può mai cifrarsi in se stessa: P(C_i = P_i) = 0.'
                : 'Because reflector U swaps 13 disjoint contact pairs, the conjugate permutation satisfies E_t(x) != x for all x. No letter can ever encrypt to itself: P(C_i = P_i) = 0.'}
            </div>
          </div>
        </div>

        {/* Card 2: Index of Coincidence */}
        <div className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-5 shadow-xl">
          <div className="mb-3 border-b border-zinc-800 pb-2.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
              02 / INDICE DI COINCIDENZA E Z-SCORE
            </span>
            <h3 className="mt-0.5 text-sm font-bold uppercase tracking-wider text-zinc-100">
              {t.theory.iocTitle}
            </h3>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
            <p>
              {language === 'it'
                ? 'Introdotto da William Friedman (1920), l’Indice di Coincidenza misura la probabilità che due lettere estratte a caso senza reinserimento da un testo di lunghezza N siano identiche:'
                : 'Introduced by William Friedman (1920), the Index of Coincidence measures the probability that two letters drawn at random without replacement from a text of length N are identical:'}
            </p>

            <div className="rounded border border-zinc-800 bg-[#08090c] p-3 font-mono text-xs text-emerald-400">
              IoC = Σ [ n_i * (n_i - 1) ] / [ N * (N - 1) ]
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-center">
              <div className="rounded border border-zinc-800 bg-[#08090c] p-2">
                <div className="text-[10px] text-zinc-500">CASUALE (H₀)</div>
                <div className="mt-0.5 text-sm font-bold text-zinc-200">1/26 = 0.0385</div>
              </div>
              <div className="rounded border border-zinc-800 bg-[#08090c] p-2">
                <div className="text-[10px] text-zinc-500">INGLESE (H₁)</div>
                <div className="mt-0.5 text-sm font-bold text-amber-300">0.0667</div>
              </div>
              <div className="rounded border border-zinc-800 bg-[#08090c] p-2">
                <div className="text-[10px] text-zinc-500">TEDESCO (H₁)</div>
                <div className="mt-0.5 text-sm font-bold text-emerald-400">0.0762</div>
              </div>
            </div>

            <p className="text-zinc-400">
              {language === 'it'
                ? 'Poiché lo Steckerbrett applica una sostituzione monoalfabetica fissa prima e dopo i rotori, esso permuta le identità delle lettere ma lascia invariato il valore di IoC quando la posizione dei rotori è corretta. Lo Z-Score quantifica lo scarto rispetto al rumore uniforme:'
                : 'Because the Steckerbrett applies a fixed monoalphabetic substitution before and after the rotors, it permutes letter identities but leaves the IoC value invariant when the rotor setting is correct. The Z-Score quantifies the deviation from uniform noise:'}
            </p>

            <div className="rounded border border-zinc-800 bg-[#08090c] p-2.5 font-mono text-xs text-zinc-200">
              Z = (IoC_oss - 0.03846) / σ_0
            </div>
          </div>
        </div>

        {/* Card 3: Bayes & Decibans */}
        <div className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-5 shadow-xl">
          <div className="mb-3 border-b border-zinc-800 pb-2.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
              03 / INFERENZA BAYESIANA E DECIBAN
            </span>
            <h3 className="mt-0.5 text-sm font-bold uppercase tracking-wider text-zinc-100">
              {t.theory.bayesTitle}
            </h3>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
            <p>
              {language === 'it'
                ? 'Ad Hut 8 (Bletchley Park), Alan Turing e I.J. Good formularono il teorema di Bayes in forma di rapporto di probabilità (Odds) per valutare se una chiave candidata generasse testo reale (H₁) oppure rumore casuale (H₀):'
                : 'At Hut 8 (Bletchley Park), Alan Turing and I.J. Good formulated Bayes’ theorem in odds form to evaluate whether a candidate key generated real language (H₁) or random noise (H₀):'}
            </p>

            <div className="rounded border border-zinc-800 bg-[#08090c] p-3 font-mono text-xs text-amber-300">
              O(H₁ | E) = O(H₁) * [ P(E | H₁) / P(E | H₀) ]
            </div>

            <p className="text-zinc-400">
              {language === 'it'
                ? 'Passando ai logaritmi in base 10 moltiplicati per 10, i prodotti di probabilità diventano somme lineari misurate in Deciban (dB, un decimo di Ban):'
                : 'Taking base-10 logarithms multiplied by 10 turns probability products into linear sums measured in Decibans (dB, one-tenth of a Ban):'}
            </p>

            <div className="rounded border border-zinc-800 bg-[#08090c] p-3 font-mono text-xs text-emerald-400">
              W(E) = 10 * log₁₀ [ P(E | H₁) / P(E | H₀) ] = Σ 10 * log₁₀ (26 * p_i)
            </div>

            <p className="text-zinc-400">
              {language === 'it'
                ? 'Un incremento di +10 Deciban moltiplica il rapporto di verosimiglianza per 10; +20 Deciban lo moltiplica per 100, consentendo di isolare rapidamente le posizioni compatibili.'
                : 'A gain of +10 Decibans multiplies the likelihood ratio by 10; +20 Decibans multiplies it by 100, enabling rapid isolation of candidate rotor positions.'}
            </p>
          </div>
        </div>

        {/* Card 4: Turing-Welchman Bombe */}
        <div className="rounded-lg border border-zinc-800 bg-[#0d0e12] p-5 shadow-xl">
          <div className="mb-3 border-b border-zinc-800 pb-2.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
              04 / LOGICA DELLA BOMBE E SCHEDA DIAGONALE
            </span>
            <h3 className="mt-0.5 text-sm font-bold uppercase tracking-wider text-zinc-100">
              {t.theory.bombeTitle}
            </h3>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
            <p>
              {language === 'it'
                ? 'La Bombe separa la ricerca delle 17.576 posizioni dei rotori dai 150 trilioni di configurazioni dello Steckerbrett sfruttando una parola probabile (Crib):'
                : 'The Bombe separates the search over 17,576 rotor positions from the 150 trillion plugboard configurations by exploiting a probable word (Crib):'}
            </p>

            <ol className="list-decimal space-y-2 pl-4 text-zinc-400">
              <li>
                <strong className="text-zinc-200">
                  {language === 'it' ? 'Allineamento della parola:' : 'Crib alignment:'}
                </strong>{' '}
                {language === 'it'
                  ? 'Si scartano tutte le posizioni in cui compare almeno una collisione C_k = P_k.'
                  : 'All positions where any collision C_k = P_k occurs are rejected immediately.'}
              </li>
              <li>
                <strong className="text-zinc-200">
                  {language === 'it' ? 'Grafo dei collegamenti (Menu):' : 'Connection graph (Menu):'}
                </strong>{' '}
                {language === 'it'
                  ? 'Ogni coppia (P_k, C_k) all’indice k forma un arco etichettato dall’avanzamento del rotore E_k.'
                  : 'Each pair (P_k, C_k) at index k forms an edge labeled by the rotor stepping state E_k.'}
              </li>
              <li>
                <strong className="text-zinc-200">
                  {language === 'it' ? 'Propagazione elettrica e Scheda Diagonale:' : 'Electrical propagation and Diagonal Board:'}
                </strong>{' '}
                {language === 'it'
                  ? 'Ipotizzando uno scambio S(A) = X sul nodo di test A, la corrente attraversa in parallelo i rotori e la matrice simmetrica 26x26 di Welchman (S(u)=v implica S(v)=u). Se tutti i 26 contatti (o 25 su 26) si attivano per contraddizione, la posizione dei rotori è scartata. In caso contrario la macchina segnala uno Stop.'
                  : 'Assuming a stecker partner S(A) = X on test node A, current propagates in parallel through the scramblers and Welchman’s symmetric 26x26 matrix (S(u)=v implies S(v)=u). If all 26 contacts (or 25 of 26) energize by contradiction, the rotor position is rejected. Otherwise the machine records a Stop.'}
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
