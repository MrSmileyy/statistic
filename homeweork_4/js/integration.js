/**
 * Numerical integration engine comparing Riemann (domain partitioning)
 * and Lebesgue (range level-set partitioning) approaches.
 */

function gcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) {
        const t = y;
        y = x % y;
        x = t;
    }
    return x;
}

const INTEGRAL_FUNCTIONS = {
    sin: {
        id: 'sin',
        name: 'f(x) = sin(x)',
        formula: 'sin(x), x ∈ [0, π]',
        a: 0,
        b: Math.PI,
        yMin: 0,
        yMax: 1.0,
        exact: 2.0,
        riemannIntegrable: true,
        lebesgueIntegrable: true,
        eval: (x) => Math.sin(x),
        notes: 'Smooth, bounded, and strictly non-negative on [0, π]. Both Riemann and Lebesgue converge to 2.0.'
    },
    x2: {
        id: 'x2',
        name: 'f(x) = x²',
        formula: 'x², x ∈ [0, 1]',
        a: 0,
        b: 1,
        yMin: 0,
        yMax: 1.0,
        exact: 1 / 3,
        riemannIntegrable: true,
        lebesgueIntegrable: true,
        eval: (x) => x * x,
        notes: 'Monotonic polynomial on [0, 1]. Exact integral is 1/3 ≈ 0.333333.'
    },
    step_1_3: {
        id: 'step_1_3',
        name: 'Step Function {1, 3}',
        formula: '1 if x < 0.5 else 3, x ∈ [0, 1]',
        a: 0,
        b: 1,
        yMin: 0,
        yMax: 3.1,
        exact: 2.0,
        riemannIntegrable: true,
        lebesgueIntegrable: true,
        eval: (x) => (x < 0.5 ? 1 : 3),
        notes: 'Piecewise constant with a single jump discontinuity at x = 0.5. Lebesgue captures the exact two level sets regardless of partition alignment.'
    },
    abs_shifted: {
        id: 'abs_shifted',
        name: 'f(x) = |x - 0.5|',
        formula: '|x - 0.5|, x ∈ [0, 1]',
        a: 0,
        b: 1,
        yMin: 0,
        yMax: 0.5,
        exact: 0.25,
        riemannIntegrable: true,
        lebesgueIntegrable: true,
        eval: (x) => Math.abs(x - 0.5),
        notes: 'Continuous V-shaped function with a corner (non-differentiable) at x = 0.5. Exact integral is 0.25.'
    },
    inv_sqrt: {
        id: 'inv_sqrt',
        name: 'f(x) = 1 / √x (Unbounded)',
        formula: '1 / √x, x ∈ (0, 1]',
        a: 0,
        b: 1,
        yMin: 1.0,
        yMax: 25.0, // Practical truncation cap for range visualization; tail > 25 has measure 1/625
        exact: 2.0,
        riemannIntegrable: false, // Not properly Riemann-integrable (unbounded); improper Riemann = 2
        lebesgueIntegrable: true,
        eval: (x) => (x <= 1e-12 ? Infinity : 1 / Math.sqrt(x)),
        notes: 'Unbounded at x = 0. Proper Riemann sums fail if evaluated at x = 0 (Left sum = ∞), whereas the improper Riemann and Lebesgue integrals equal 2.0.'
    },
    sinc: {
        id: 'sinc',
        name: 'f(x) = sin(x) / x',
        formula: 'sin(x) / x, x ∈ [0, π]',
        a: 0,
        b: Math.PI,
        yMin: 0,
        yMax: 1.0,
        exact: 1.851937051982466, // Si(π)
        riemannIntegrable: true,
        lebesgueIntegrable: true,
        eval: (x) => (Math.abs(x) < 1e-10 ? 1.0 : Math.sin(x) / x),
        notes: 'Bounded with a removable singularity at x = 0 (lim = 1). Exact value is the Sine Integral Si(π) ≈ 1.851937.'
    },
    dirichlet: {
        id: 'dirichlet',
        name: 'Dirichlet Function (Pathological)',
        formula: '1 if x ∈ ℚ, 0 if x ∉ ℚ, x ∈ [0, 1]',
        a: 0,
        b: 1,
        yMin: 0,
        yMax: 1.05,
        exact: 0.0, // Lebesgue integral = 0; Riemann integral does not exist
        riemannIntegrable: false,
        lebesgueIntegrable: true,
        eval: (x, isGridPoint = true) => {
            // Finite-precision grid points i/N are always rational; irrational-shifted
            // points simulate continuous draws where P(x in Q) = 0.
            return isGridPoint ? 1 : 0;
        },
        notes: 'Nowhere continuous. Upper Darboux sum = 1, Lower Darboux sum = 0, so it is NOT Riemann-integrable. Its Lebesgue integral is 0 because ℚ has measure 0.'
    },
    thomae: {
        id: 'thomae',
        name: "Thomae's Function (Popcorn)",
        formula: '1/q if x = p/q (reduced), 0 if x ∉ ℚ, x ∈ [0, 1]',
        a: 0,
        b: 1,
        yMin: 0,
        yMax: 1.05,
        exact: 0.0,
        riemannIntegrable: true,
        lebesgueIntegrable: true,
        eval: (x, isGridPoint = true, num = null, den = null) => {
            if (!isGridPoint) return 0;
            if (num !== null && den !== null && den > 0) {
                if (num === 0) return 1;
                const g = gcd(num, den);
                const q = den / g;
                return 1 / q;
            }
            // Approximate rational denominator with tolerance 1e-6 for arbitrary x
            const maxDen = 1000;
            for (let q = 1; q <= maxDen; q += 1) {
                if (Math.abs(x * q - Math.round(x * q)) < 1e-7) {
                    return 1 / q;
                }
            }
            return 0;
        },
        notes: 'Continuous at every irrational and discontinuous at every rational. Both Riemann and Lebesgue integrals equal 0.'
    }
};

class IntegrationEngine {
    static getFunctions() {
        return INTEGRAL_FUNCTIONS;
    }

    /**
     * Computes Left, Right, and Midpoint Riemann sums over N uniform subintervals.
     */
    static computeRiemann(fnObj, N) {
        const start = performance.now();
        const { a, b, id } = fnObj;
        const dx = (b - a) / N;

        let leftSum = 0;
        let rightSum = 0;
        let midpointSum = 0;
        let singularLeft = false;

        const maxVisRects = Math.min(N, 120);
        const visStep = N / maxVisRects;
        const rects = [];

        for (let i = 0; i < N; i += 1) {
            const xLeft = a + i * dx;
            const xRight = a + (i + 1) * dx;
            const xMid = a + (i + 0.5) * dx;

            const yLeft = id === 'thomae'
                ? fnObj.eval(xLeft, true, i, N)
                : fnObj.eval(xLeft, true);

            const yRight = id === 'thomae'
                ? fnObj.eval(xRight, true, i + 1, N)
                : fnObj.eval(xRight, true);

            const yMid = id === 'thomae'
                ? fnObj.eval(xMid, true, 2 * i + 1, 2 * N)
                : fnObj.eval(xMid, true);

            if (!Number.isFinite(yLeft)) {
                singularLeft = true;
            } else {
                leftSum += yLeft * dx;
            }

            if (Number.isFinite(yRight)) {
                rightSum += yRight * dx;
            }

            if (Number.isFinite(yMid)) {
                midpointSum += yMid * dx;
            }

            if (rects.length < maxVisRects && i >= rects.length * visStep) {
                rects.push({
                    x0: xLeft,
                    x1: xRight,
                    yMid: Number.isFinite(yMid) ? yMid : 0
                });
            }
        }

        const timeMs = performance.now() - start;

        return {
            N,
            dx,
            leftSum: singularLeft ? Infinity : leftSum,
            rightSum,
            midpointSum,
            singularLeft,
            rects,
            timeMs
        };
    }

    /**
     * Approximates the Lebesgue integral by partitioning the range [yMin, yMax]
     * into M measurable intervals and estimating the Lebesgue measure of each preimage.
     */
    static computeLebesgue(fnObj, M, domainSamples = 20000) {
        const start = performance.now();
        const { a, b, yMin, yMax, id } = fnObj;
        const dy = (yMax - yMin) / M;
        const domainWidth = b - a;
        const dxSample = domainWidth / domainSamples;

        const binCounts = new Int32Array(M);
        let overflowCount = 0;
        let overflowSum = 0;

        // Irrational offset (golden ratio conjugate) avoids rational-grid artifacts
        // for pathological indicator functions when simulating continuous Lebesgue measure.
        const phiOffset = (Math.sqrt(5) - 1) / 2;

        for (let i = 0; i < domainSamples; i += 1) {
            const x = a + ((i + phiOffset) % domainSamples) * dxSample;
            const y = id === 'dirichlet' || id === 'thomae'
                ? fnObj.eval(x, false)
                : fnObj.eval(x, false);

            if (!Number.isFinite(y)) {
                overflowCount += 1;
                continue;
            }

            if (y >= yMax) {
                overflowCount += 1;
                overflowSum += y;
            } else if (y <= yMin) {
                binCounts[0] += 1;
            } else {
                const binIdx = Math.min(M - 1, Math.floor((y - yMin) / dy));
                binCounts[binIdx] += 1;
            }
        }

        let integral = 0;
        let lowerIntegral = 0;
        const bins = [];

        for (let k = 0; k < M; k += 1) {
            const yLow = yMin + k * dy;
            const yHigh = yLow + dy;
            const yMid = 0.5 * (yLow + yHigh);
            const measure = (binCounts[k] / domainSamples) * domainWidth;
            const contribution = yMid * measure;

            integral += contribution;
            lowerIntegral += yLow * measure;

            bins.push({
                yLow,
                yHigh,
                yMid,
                measure,
                contribution
            });
        }

        // For unbounded functions (like 1/sqrt(x)), include tail contribution above yMax
        if (overflowCount > 0 && Number.isFinite(overflowSum)) {
            integral += (overflowSum / domainSamples) * domainWidth;
            lowerIntegral += yMax * ((overflowCount / domainSamples) * domainWidth);
        }

        const timeMs = performance.now() - start;

        return {
            M,
            dy,
            domainSamples,
            integral,
            lowerIntegral,
            bins,
            timeMs
        };
    }

    /**
     * Evaluates error convergence across increasing partition counts.
     */
    static computeConvergence(fnObj, partitionCounts = [10, 25, 50, 100, 250, 500, 1000], domainSamples = 20000) {
        const results = [];
        for (let i = 0; i < partitionCounts.length; i += 1) {
            const count = partitionCounts[i];
            const riemann = this.computeRiemann(fnObj, count);
            const lebesgue = this.computeLebesgue(fnObj, count, domainSamples);

            const riemannErr = Math.abs(riemann.midpointSum - fnObj.exact);
            const riemannLeftErr = Number.isFinite(riemann.leftSum)
                ? Math.abs(riemann.leftSum - fnObj.exact)
                : null;
            const lebesgueErr = Math.abs(lebesgue.integral - fnObj.exact);

            results.push({
                count,
                riemannMid: riemann.midpointSum,
                riemannLeft: riemann.leftSum,
                lebesgueVal: lebesgue.integral,
                riemannErr: Math.max(riemannErr, 1e-16),
                riemannLeftErr: riemannLeftErr !== null ? Math.max(riemannLeftErr, 1e-16) : null,
                lebesgueErr: Math.max(lebesgueErr, 1e-16),
                riemannTimeMs: riemann.timeMs,
                lebesgueTimeMs: lebesgue.timeMs
            });
        }
        return results;
    }
}

window.IntegrationEngine = IntegrationEngine;

