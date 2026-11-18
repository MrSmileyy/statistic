# Enigma M3 & Cryptanalysis

Browser simulation of the Enigma M3 machine, the Turing-Welchman Bombe, and statistical cryptanalysis methods (Index of Coincidence, $\chi^2$, $Z$-score, Shannon entropy, and Banburismus).

## Structure

- `src/core/enigma.ts` – Enigma M3 rotor stepping (including middle-rotor double-stepping), ring/ground settings, plugboard, and signal path trace.
- `src/core/bombe.ts` – Crib alignment filter ($C_i \neq P_i$), menu graph and cycle extraction, and 26×26 Diagonal Board propagation.
- `src/core/statistics.ts` – Index of Coincidence, exact uniform-$H_0$ variance and $Z$-score, $\chi^2$ goodness-of-fit, entropy, and Deciban scoring.
- `src/workers/cryptoAnalysis.worker.ts` – Web Worker running 17,576-position rotor sweeps for Bombe and ciphertext-only attacks.

## Reference Formulas

**Index of Coincidence** for a text of length $N$ with letter counts $n_0, \dots, n_{25}$:

$$\text{IoC} = \frac{\sum_{i=0}^{25} n_i(n_i - 1)}{N(N - 1)}$$

Under uniform random noise ($p_0 = 1/26$):

$$\text{Var}_{H_0}(\text{IoC}) = \frac{25}{338\,N(N - 1)}, \qquad Z = \frac{\text{IoC} - 1/26}{\sqrt{\text{Var}_{H_0}(\text{IoC})}}$$

**Deciban weight of evidence**:

$$W = 10 \sum_{i=0}^{25} n_i \log_{10}\!\left(26\,p_i\right)$$

## Running Locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```
