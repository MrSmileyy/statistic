# Enigma M3 & Bletchley Park Statistical Cryptanalysis Lab

![Version](https://img.shields.io/badge/version-1.0.0-d4a853?style=flat-square)
![React](https://img.shields.io/badge/React-18.3-38bdf8?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-10b981?style=flat-square)

An interactive, 100% client-side (serverless) educational platform simulating the **WWII Wehrmacht Enigma M3** cipher machine, the **Turing–Welchman Bombe**, and the **Bletchley Park statistical cryptanalysis pipeline** (Index of Coincidence, Pearson's $\chi^2$, $Z$-Score hypothesis testing, Shannon Entropy, and Alan Turing's Bayesian Banburismus / Decibans).

Open-source interactive laboratory deployable directly to **GitHub Pages**.

---

## Core Modules

1. **Enigma M3 Simulator (`src/core/enigma.ts`)**
   - Exact historical rotor wirings (**I–V**), notch positions, and reflectors (**UKW-B**, **UKW-C**).
   - Accurate **double-stepping anomaly** of the middle rotor mechanical pawl system.
   - Configurable **Ringstellung** (ring settings), **Grundstellung** (rotor window positions), and interactive **Steckerbrett** (plugboard).
   - Step-by-step electrical **Signal Path Tracing** across all 14 forward, reflected, and return stages.

2. **Turing–Welchman Bombe (`src/core/bombe.ts`)**
   - **Crib Alignment Scanner** enforcing Enigma's reflector flaw ($P(C_i = P_i) = 0$).
   - **Menu Graph Builder** extracting cyclic closures (loops) and selecting the highest-degree **Test Register**.
   - **Diagonal Board Contradiction Engine** running bitmask connected-component propagation across 17,576 rotor window combinations off the main UI thread via Web Workers.
   - Automatic recovery of candidate **Stops**, deduced partial **Steckerbrett** pairs, and joint statistical ranking.

3. **Statistical Cryptanalysis & Banburismus (`src/core/statistics.ts`)**
   - **Index of Coincidence (IoC)** distinguishing monoalphabetic structure ($\approx 0.0762$ German, $\approx 0.0667$ English) from uniform polyalphabetic noise ($1/26 \approx 0.03846$).
   - **Exact $Z$-Score under $H_0$** using the uncorrelated pairwise coincidence variance under uniform letters.
   - **Pearson's $\chi^2$ Goodness-of-Fit** ($df = 25$) with asymptotic $p$-value computation via the regularized upper incomplete gamma function.
   - **Shannon Entropy ($H$)** vs. maximum theoretical entropy $\log_2(26) \approx 4.7004\text{ bits/char}$.
   - **Turing's Decibans & Banburismus**: sequential log-likelihood ratio ($10 \log_{10}$) measuring cumulative Bayesian evidence against uniform noise and detecting overlapping Enigma message depth across shifted ciphertexts.

4. **Ciphertext-Only Statistical Attack (`src/workers/cryptoAnalysis.worker.ts`)**
   - Parallel Web Worker sweeping all $26^3 = 17,576$ rotor ground settings ranked by **IoC**, **$\chi^2$**, or **Deciban** score without freezing the browser.

---

## Mathematical & Statistical Foundations

### Index of Coincidence & $Z$-Score

For a text of length $N$ with letter counts $n_0, \dots, n_{25}$:

$$\text{IoC} = \frac{\sum_{i=0}^{25} n_i(n_i - 1)}{N(N - 1)}$$

Under the null hypothesis $H_0$ of $N$ i.i.d. uniform draws over 26 letters ($p_0 = 1/26$), pairwise coincidence indicators have zero covariance across triples, yielding exact variance:

$$\text{Var}_{H_0}(\text{IoC}) = \frac{p_0(1 - p_0)}{\binom{N}{2}} = \frac{25}{338\,N(N - 1)}, \qquad Z = \frac{\text{IoC} - 1/26}{\sqrt{\text{Var}_{H_0}(\text{IoC})}}$$

### Bayesian Evidence in Decibans

Given reference letter probabilities $p_i$ for German or English:

$$\text{Decibans} = 10 \sum_{i=0}^{25} n_i \log_{10}\!\left(\frac{p_i}{1/26}\right)$$

A total of $+10\text{ db}$ shifts posterior odds by $10:1$ in favor of natural plaintext; $+20\text{ db}$ yields $100:1$ odds.

---

## Verification Vectors

- **Canonical Encryption**: Rotors `(I, II, III)`, Reflector `UKW-B`, Ring `AAA` (`01-01-01`), Ground `AAA`, empty Plugboard: encrypting `AAAAA` produces `BDZGO`.
- **Double-Stepping Anomaly**: Rotors `(I, II, III)` starting at `ADU` step sequentially to `ADV` -> `AEW` -> `BFX`.

---

## Local Development

```bash
npm install
npm run dev
```

To typecheck and build the production bundle:

```bash
npm run build
```

## GitHub Pages Deployment

The repository includes `.github/workflows/deploy.yml` configured with `base: './'` in `vite.config.ts`. Pushing to `main` automatically builds and deploys `dist/` to GitHub Pages when Pages source is set to **GitHub Actions** in repository settings.

## License

Released under the [MIT License](./LICENSE).

