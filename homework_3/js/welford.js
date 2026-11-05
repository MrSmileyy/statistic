/**
 * Algoritmo di Welford per il calcolo incrementale di media e varianza.
 * Riferimento: B.P. Welford (1962), Donald E. Knuth (TAOCP Vol. 2, Sez. 4.2.2).
 */

class WelfordAccumulator {
    constructor() {
        this.count = 0;
        this.mean = 0;
        this.M2 = 0; // Somma dei quadrati degli scarti dalla media (SS: Sum of Squares)
    }

    /**
     * Aggiorna lo stato dell'accumulatore con una nuova osservazione x.
     * Blocco centrale di aggiornamento a 3 righe secondo la formulazione di Knuth.
     *
     * @param {number} x - Nuova osservazione numerica
     * @returns {WelfordAccumulator} istanza corrente per method chaining
     */
    update(x) {
        this.count += 1;
        const delta = x - this.mean;
        this.mean += delta / this.count;
        this.M2 += delta * (x - this.mean);
        return this;
    }

    /**
     * Varianza campionaria corretta (stimatore corretto con correzione di Bessel: n - 1).
     * @returns {number} s^2 = M2 / (count - 1)
     */
    get sampleVariance() {
        return this.count > 1 ? this.M2 / (this.count - 1) : 0;
    }

    /**
     * Varianza della popolazione (stimatore con divisore n).
     * @returns {number} sigma^2 = M2 / count
     */
    get populationVariance() {
        return this.count > 0 ? this.M2 / this.count : 0;
    }

    /**
     * Deviazione standard campionaria s = sqrt(s^2).
     * @returns {number}
     */
    get sampleStdDev() {
        return Math.sqrt(this.sampleVariance);
    }

    /**
     * Ripristina lo stato iniziale dell'accumulatore.
     */
    reset() {
        this.count = 0;
        this.mean = 0;
        this.M2 = 0;
    }

    /**
     * Clona lo stato corrente in un nuovo oggetto accumulatore.
     * @returns {WelfordAccumulator}
     */
    clone() {
        const copy = new WelfordAccumulator();
        copy.count = this.count;
        copy.mean = this.mean;
        copy.M2 = this.M2;
        return copy;
    }
}

/**
 * Funzione pura per l'aggiornamento incrementale di Welford senza mutazione di stato.
 *
 * @param {{count: number, mean: number, M2: number}} state - Stato precedente
 * @param {number} x - Valore in ingresso
 * @returns {{count: number, mean: number, M2: number, delta: number, sampleVariance: number, populationVariance: number, sampleStdDev: number}}
 */
function welfordStep(state, x) {
    const count = (state.count || 0) + 1;
    const delta = x - (state.mean || 0);
    const mean = (state.mean || 0) + delta / count;
    const M2 = (state.M2 || 0) + delta * (x - mean);

    const sampleVariance = count > 1 ? M2 / (count - 1) : 0;
    const populationVariance = count > 0 ? M2 / count : 0;

    return {
        count,
        delta,
        mean,
        M2,
        sampleVariance,
        populationVariance,
        sampleStdDev: Math.sqrt(sampleVariance)
    };
}

/**
 * Valuta e confronta la stabilità numerica dell'algoritmo di Welford rispetto
 * alla formula naïve one-pass e alla formula a due passi (two-pass standard).
 *
 * @param {number[]} values - Vettore di osservazioni numeriche
 * @returns {{n: number, welford: {mean: number, variance: number}, naive: {variance: number}, twoPass: {mean: number, variance: number}, errorNaive: number}}
 */
function compareNaiveVsWelford(values) {
    const n = values.length;
    if (n < 2) {
        throw new Error("Il dataset deve contenere almeno 2 valori per il calcolo della varianza campionaria.");
    }

    // 1. Algoritmo di Welford (One-pass stabile)
    const acc = new WelfordAccumulator();
    for (let i = 0; i < n; i += 1) {
        acc.update(values[i]);
    }
    const welfordVar = acc.sampleVariance;
    const welfordMean = acc.mean;

    // 2. Metodo Two-Pass (Ground truth numerico)
    let sumTwoPass = 0;
    for (let i = 0; i < n; i += 1) {
        sumTwoPass += values[i];
    }
    const meanTwoPass = sumTwoPass / n;

    let ssTwoPass = 0;
    for (let i = 0; i < n; i += 1) {
        const diff = values[i] - meanTwoPass;
        ssTwoPass += diff * diff;
    }
    const twoPassVar = ssTwoPass / (n - 1);

    // 3. Formula Naïve standard: Var = (sum(x^2) - (sum(x))^2 / n) / (n - 1)
    // Soggetta a cancellazione catastrofica con valori ad alta magnitudo e bassa varianza
    let sumX = 0;
    let sumX2 = 0;
    for (let i = 0; i < n; i += 1) {
        const val = values[i];
        sumX += val;
        sumX2 += val * val;
    }
    const naiveSS = sumX2 - (sumX * sumX) / n;
    const naiveVar = naiveSS / (n - 1);

    return {
        n,
        welford: { mean: welfordMean, variance: welfordVar },
        naive: { variance: naiveVar },
        twoPass: { mean: meanTwoPass, variance: twoPassVar },
        errorNaive: Math.abs(naiveVar - twoPassVar)
    };
}

// Esportazione su window per l'ambiente browser Vanilla JS
window.WelfordAccumulator = WelfordAccumulator;
window.welfordStep = welfordStep;
window.compareNaiveVsWelford = compareNaiveVsWelford;

