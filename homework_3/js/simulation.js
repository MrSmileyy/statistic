/**
 * Motore di simulazione statistica per il campionamento di m hacker su n sistemi.
 * Utilizza WelfordAccumulator per il tracciamento incrementale di media e varianza campionaria.
 */

class PenetrationSimulation {
    /**
     * Restituisce i parametri teorici esatti della distribuzione prescelta.
     *
     * @param {'uniform' | 'binomial'} distType - Tipologia di distribuzione
     * @returns {{type: string, name: string, minScore: number, maxScore: number, mu: number, sigma2: number, sigma: number, description: string}}
     */
    static getTheoreticalDistribution(distType = 'uniform') {
        if (distType === 'binomial') {
            // Binomiale Bin(10, p = 0.5): punteggio intero tra 0 e 10
            const nTrials = 10;
            const p = 0.5;
            const mu = nTrials * p; // 5.0
            const sigma2 = nTrials * p * (1 - p); // 2.5
            return {
                type: 'binomial',
                name: 'Binomial Bin(10, 0.5)',
                minScore: 0,
                maxScore: 10,
                mu,
                sigma2,
                sigma: Math.sqrt(sigma2),
                description: 'Binomial distribution over 10 trials with p = 0.50 (µ = 5.0, σ² = 2.50)'
            };
        }

        // Default: Discrete Uniform Distribution on {0, 1, 2, ..., 10}
        // Cardinality K = 11 equally likely outcomes
        // µ = (a + b) / 2 = 5.0
        // σ² = (K^2 - 1) / 12 = (121 - 1) / 12 = 120 / 12 = 10.0
        const mu = 5.0;
        const sigma2 = 10.0;
        return {
            type: 'uniform',
            name: 'Discrete Uniform U{0, 10}',
            minScore: 0,
            maxScore: 10,
            mu,
            sigma2,
            sigma: Math.sqrt(sigma2),
            description: 'Discrete Uniform distribution on {0, 1, ..., 10} (µ = 5.0, σ² = 10.0)'
        };
    }

    /**
     * Genera un singolo punteggio stocastico compreso tra 0 e 10 secondo la distribuzione scelta.
     *
     * @param {string} distType
     * @returns {number} punteggio intero tra 0 e 10
     */
    static sampleScore(distType) {
        if (distType === 'binomial') {
            let successes = 0;
            for (let k = 0; k < 10; k += 1) {
                if (Math.random() < 0.5) successes += 1;
            }
            return successes;
        }

        // Uniforme su 11 esiti {0, 1, ..., 10}
        return Math.floor(Math.random() * 11);
    }

    /**
     * Esegue la simulazione completa per m hacker su n sistemi attaccati.
     *
     * @param {{m: number, n: number, distType: string, maxRecordedPaths?: number}} options
     * @returns {object} Risultati dettagliati della simulazione campionaria
     */
    static run({ m, n, distType = 'uniform', maxRecordedPaths = 100 }) {
        const startTime = performance.now();
        const dist = this.getTheoreticalDistribution(distType);

        // Array per le metriche finali di ciascun hacker
        const hackerFinalMeans = new Float64Array(m);
        const hackerFinalVariances = new Float64Array(m);

        // Accumulatori per calcolare la traiettoria media su tutti gli hacker nel tempo t
        const stepMeanSums = new Float64Array(n + 1);
        const stepVarianceSums = new Float64Array(n + 1);

        // Memorizzazione delle traiettorie per la rappresentazione grafica
        const recordedCount = Math.min(m, maxRecordedPaths);
        const meanTrajectories = [];
        const varianceTrajectories = [];

        for (let i = 0; i < recordedCount; i += 1) {
            meanTrajectories.push(new Float64Array(n + 1));
            varianceTrajectories.push(new Float64Array(n + 1));
        }

        // Esecuzione del campionamento hacker per hacker
        for (let i = 0; i < m; i += 1) {
            const acc = new WelfordAccumulator();
            const recordThisPath = i < recordedCount;

            for (let t = 1; t <= n; t += 1) {
                const score = this.sampleScore(distType);
                acc.update(score);

                const currentMean = acc.mean;
                const currentVariance = acc.sampleVariance;

                stepMeanSums[t] += currentMean;
                stepVarianceSums[t] += currentVariance;

                if (recordThisPath) {
                    meanTrajectories[i][t] = currentMean;
                    varianceTrajectories[i][t] = currentVariance;
                }
            }

            hackerFinalMeans[i] = acc.mean;
            hackerFinalVariances[i] = acc.sampleVariance;
        }

        // Calcolo delle traiettorie medie complessive lungo t in [1, n]
        const globalMeanTrajectory = new Float64Array(n + 1);
        const globalVarianceTrajectory = new Float64Array(n + 1);
        for (let t = 1; t <= n; t += 1) {
            globalMeanTrajectory[t] = stepMeanSums[t] / m;
            globalVarianceTrajectory[t] = stepVarianceSums[t] / m;
        }

        // Calcolo delle medie aggregate (media delle medie e media delle varianze)
        let sumMeans = 0;
        let sumVariances = 0;
        for (let i = 0; i < m; i += 1) {
            sumMeans += hackerFinalMeans[i];
            sumVariances += hackerFinalVariances[i];
        }
        const meanOfMeans = sumMeans / m;
        const meanOfVariances = sumVariances / m;

        // Varianza empirica tra le medie campionarie (Var(X_bar)) e tra le varianze (Var(S^2))
        let ssBetweenMeans = 0;
        let ssBetweenVariances = 0;
        for (let i = 0; i < m; i += 1) {
            const diffM = hackerFinalMeans[i] - meanOfMeans;
            ssBetweenMeans += diffM * diffM;

            const diffV = hackerFinalVariances[i] - meanOfVariances;
            ssBetweenVariances += diffV * diffV;
        }
        const varianceOfMeans = m > 1 ? ssBetweenMeans / (m - 1) : 0;
        const varianceOfVariances = m > 1 ? ssBetweenVariances / (m - 1) : 0;
        const stdDevOfMeans = Math.sqrt(varianceOfMeans);

        // Varianza teorica della media campionaria per dimensione n: Var(X_bar) = sigma^2 / n
        const theoreticalMeanVariance = dist.sigma2 / n;
        const theoreticalStandardError = Math.sqrt(theoreticalMeanVariance);

        const executionTimeMs = performance.now() - startTime;

        return {
            params: { m, n, distType },
            distribution: dist,
            executionTimeMs,
            timeSteps: Array.from({ length: n + 1 }, (_, index) => index),
            meanTrajectories,
            varianceTrajectories,
            globalMeanTrajectory,
            globalVarianceTrajectory,
            hackerFinalMeans,
            hackerFinalVariances,
            summary: {
                meanOfMeans,
                meanOfVariances,
                varianceOfMeans,
                stdDevOfMeans,
                varianceOfVariances,
                meanDifference: meanOfMeans - dist.mu,
                varianceDifference: meanOfVariances - dist.sigma2,
                theoreticalMeanVariance,
                theoreticalStandardError
            }
        };
    }

    /**
     * Genera una densità di probabilità gaussiana N(mu, sigma^2) per la sovrapposizione teorica.
     *
     * @param {number} mu - Media della distribuzione normale
     * @param {number} sigma - Deviazione standard
     * @param {number} minX - Limite inferiore del dominio
     * @param {number} maxX - Limite superiore del dominio
     * @param {number} points - Numero di punti da campionare
     * @returns {{x: number[], y: number[]}}
     */
    static generateNormalPdf(mu, sigma, minX, maxX, points = 120) {
        if (sigma <= 0) return { x: [mu], y: [1] };
        const x = [];
        const y = [];
        const step = (maxX - minX) / (points - 1);
        const factor = 1 / (sigma * Math.sqrt(2 * Math.PI));

        for (let i = 0; i < points; i += 1) {
            const val = minX + i * step;
            const diff = (val - mu) / sigma;
            const density = factor * Math.exp(-0.5 * diff * diff);
            x.push(val);
            y.push(density);
        }
        return { x, y };
    }
}

window.PenetrationSimulation = PenetrationSimulation;

