class StochasticSimulator {
    static getTheoreticalMoments(model, p, n) {
        if (model === 'bernoulli') {
            const meanStep = p;
            const varianceStep = p * (1 - p);
            return {
                meanStep,
                varianceStep,
                expectedFinal: n * meanStep,
                varianceFinal: n * varianceStep,
                stdDevFinal: Math.sqrt(n * varianceStep)
            };
        }

        /* Asymmetric Rademacher step: E[X] = 2p - 1, Var(X) = 1 - (2p-1)^2 = 4p(1-p) */
        const meanStep = 2 * p - 1;
        const varianceStep = 4 * p * (1 - p);
        return {
            meanStep,
            varianceStep,
            expectedFinal: n * meanStep,
            varianceFinal: n * varianceStep,
            stdDevFinal: Math.sqrt(n * varianceStep)
        };
    }

    static run({ model, n, m, p }) {
        const moments = this.getTheoreticalMoments(model, p, n);
        const timeSteps = Array.from({ length: n + 1 }, (_, index) => index);
        
        const trajectories = [];
        const finalSums = new Float64Array(m);
        const finalAverages = new Float64Array(m);
        const finalRawScaled = new Float64Array(m);
        const finalStandardized = new Float64Array(m);
        
        const stepMeanAccumulator = new Float64Array(n + 1);
        const sqrtN = Math.sqrt(n);
        const stdDevFinal = moments.stdDevFinal;

        for (let i = 0; i < m; i += 1) {
            const path = new Float64Array(n + 1);
            let cumulativeSum = 0;
            path[0] = 0;

            for (let t = 1; t <= n; t += 1) {
                let increment = 0;
                if (model === 'bernoulli') {
                    increment = Math.random() < p ? 1 : 0;
                } else {
                    increment = Math.random() < p ? 1 : -1;
                }
                cumulativeSum += increment;
                path[t] = cumulativeSum;
                stepMeanAccumulator[t] += cumulativeSum;
            }

            trajectories.push(path);
            finalSums[i] = cumulativeSum;
            finalAverages[i] = cumulativeSum / n;
            finalRawScaled[i] = cumulativeSum / sqrtN;

            /* Standardized Central Limit Theorem transform: Z_n = (S_n - E[S_n]) / sqrt(Var(S_n)) */
            finalStandardized[i] = stdDevFinal > 0
                ? (cumulativeSum - moments.expectedFinal) / stdDevFinal
                : 0;
        }

        const empiricalMeanTrajectory = new Float64Array(n + 1);
        for (let t = 0; t <= n; t += 1) {
            empiricalMeanTrajectory[t] = stepMeanAccumulator[t] / m;
        }

        const theoreticalMeanTrajectory = new Float64Array(n + 1);
        for (let t = 0; t <= n; t += 1) {
            theoreticalMeanTrajectory[t] = t * moments.meanStep;
        }

        let sumFinal = 0;
        for (let i = 0; i < m; i += 1) {
            sumFinal += finalSums[i];
        }
        const sampleMeanFinal = sumFinal / m;

        let sumSquaredDiff = 0;
        for (let i = 0; i < m; i += 1) {
            const diff = finalSums[i] - sampleMeanFinal;
            sumSquaredDiff += diff * diff;
        }
        const sampleVarianceFinal = m > 1 ? sumSquaredDiff / (m - 1) : 0;

        return {
            timeSteps,
            trajectories,
            finalSums,
            finalAverages,
            finalRawScaled,
            finalStandardized,
            empiricalMeanTrajectory,
            theoreticalMeanTrajectory,
            moments,
            sampleStats: {
                sampleMeanFinal,
                sampleVarianceFinal,
                sampleStdDevFinal: Math.sqrt(sampleVarianceFinal),
                sampleMeanAverage: sampleMeanFinal / n
            }
        };
    }

    static generateStandardNormalPdf(xMin = -4, xMax = 4, numPoints = 120) {
        const xValues = [];
        const yValues = [];
        const step = (xMax - xMin) / (numPoints - 1);
        const invSqrt2Pi = 1 / Math.sqrt(2 * Math.PI);

        for (let i = 0; i < numPoints; i += 1) {
            const x = xMin + i * step;
            const y = invSqrt2Pi * Math.exp(-0.5 * x * x);
            xValues.push(x);
            yValues.push(y);
        }

        return { xValues, yValues };
    }
}

window.StochasticSimulator = StochasticSimulator;
