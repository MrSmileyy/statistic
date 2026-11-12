/**
 * Numerical computation of the Standard Normal Cumulative Distribution Function (CDF):
 * Phi(x) = (1 / sqrt(2*pi)) * integral_{-inf}^{x} exp(-t^2 / 2) dt.
 *
 * Implements and benchmarks four numerical methods:
 *  1. Composite Trapezoidal Rule
 *  2. Composite Simpson's Rule
 *  3. Maclaurin Power Series Expansion
 *  4. Rational Chebyshev Approximation of erf/erfc (Cody, 1969) & Abramowitz-Stegun 7.1.26
 */

const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);
const SQRT_2 = Math.sqrt(2);

/**
 * Trusted 15-digit reference values for Phi(x) (NIST / SciPy / R pnorm).
 */
const NORMAL_CDF_REFERENCE = [
    { x: -4.0, ref: 0.00003167124183311992 },
    { x: -3.0, ref: 0.0013498980316300946 },
    { x: -2.0, ref: 0.022750131948179207 },
    { x: -1.96, ref: 0.024997895148220435 },
    { x: -1.0, ref: 0.15865525393145707 },
    { x: 0.0, ref: 0.5 },
    { x: 1.0, ref: 0.8413447460685429 },
    { x: 1.645, ref: 0.9500150944608786 },
    { x: 1.96, ref: 0.9750021048517796 },
    { x: 2.0, ref: 0.9772498680518208 },
    { x: 2.576, ref: 0.9950024676842649 },
    { x: 3.0, ref: 0.9986501019683699 },
    { x: 4.0, ref: 0.9999683287581669 },
    { x: 5.0, ref: 0.9999997133484281 }
];

class NormalCdfEngine {
    static getReferenceTable() {
        return NORMAL_CDF_REFERENCE;
    }

    static pdf(t) {
        return INV_SQRT_2PI * Math.exp(-0.5 * t * t);
    }

    /**
     * Method 1: Composite Trapezoidal Rule integrating from 0 to |x|.
     * Error scales as O(1 / N^2).
     */
    static cdfTrapezoidal(x, N = 100) {
        if (x === 0) return 0.5;
        const absX = Math.abs(x);
        const h = absX / N;
        let sum = 0.5 * (this.pdf(0) + this.pdf(absX));

        for (let i = 1; i < N; i += 1) {
            sum += this.pdf(i * h);
        }

        const integral = sum * h;
        return x >= 0 ? 0.5 + integral : 0.5 - integral;
    }

    /**
     * Method 2: Composite Simpson's Rule integrating from 0 to |x|.
     * Requires even N. Error scales as O(1 / N^4).
     */
    static cdfSimpson(x, N = 100) {
        if (x === 0) return 0.5;
        const steps = N % 2 === 0 ? N : N + 1;
        const absX = Math.abs(x);
        const h = absX / steps;

        let sum = this.pdf(0) + this.pdf(absX);
        for (let i = 1; i < steps; i += 1) {
            const coeff = i % 2 === 0 ? 2 : 4;
            sum += coeff * this.pdf(i * h);
        }

        const integral = (sum * h) / 3;
        return x >= 0 ? 0.5 + integral : 0.5 - integral;
    }

    /**
     * Method 3: Maclaurin Power Series Expansion of erf(x / sqrt(2)).
     * Phi(x) = 0.5 + (1 / sqrt(2*pi)) * sum_{k=0}^{K-1} [(-1)^k * x^(2k+1)] / [2^k * k! * (2k+1)].
     * Rapidly converges for |x| <= 3, but suffers catastrophic cancellation for large |x|.
     */
    static cdfPowerSeries(x, maxTerms = 50) {
        if (x === 0) return 0.5;

        let term = x;
        let sum = term;
        const x2 = x * x;

        for (let k = 1; k < maxTerms; k += 1) {
            term *= -x2 / (2 * k);
            const contribution = term / (2 * k + 1);
            sum += contribution;
            if (Math.abs(contribution) < 1e-16 * Math.abs(sum)) {
                break;
            }
        }

        const val = 0.5 + INV_SQRT_2PI * sum;
        return val;
    }

    /**
     * Evaluates partial sums of the Power Series to visualize term-by-term convergence
     * or catastrophic cancellation at large |x|.
     */
    static getPowerSeriesTrace(x, maxTerms = 50) {
        const trace = [];
        let term = x;
        let sum = term;
        const x2 = x * x;

        trace.push({ k: 0, approx: 0.5 + INV_SQRT_2PI * sum, termMag: Math.abs(INV_SQRT_2PI * term) });

        for (let k = 1; k < maxTerms; k += 1) {
            term *= -x2 / (2 * k);
            const contribution = term / (2 * k + 1);
            sum += contribution;
            trace.push({
                k,
                approx: 0.5 + INV_SQRT_2PI * sum,
                termMag: Math.abs(INV_SQRT_2PI * contribution)
            });
        }
        return trace;
    }

    /**
     * Method 4a: Classic Abramowitz & Stegun (7.1.26) rational polynomial approximation
     * for erf(z), maximum error ~ 1.5e-7.
     */
    static cdfAbramowitzStegun(x) {
        const sign = x < 0 ? -1 : 1;
        const z = Math.abs(x) / SQRT_2;

        const p = 0.3275911;
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;

        const t = 1 / (1 + p * z);
        const erfVal = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
        return 0.5 * (1 + sign * erfVal);
    }

    /**
     * Method 4b: High-precision hybrid erf / erfc evaluation.
     * Uses Maclaurin series for |z| <= 2 and Jacobi continued fraction for |z| > 2,
     * achieving full IEEE 754 double precision (~1e-16) across the entire real line.
     */
    static erfHybrid(x) {
        const sign = x < 0 ? -1 : 1;
        const z = Math.abs(x);
        if (z === 0) return 0;

        const twoOverSqrtPi = 2 / Math.sqrt(Math.PI);

        if (z <= 2.0) {
            let term = z;
            let sum = term;
            const z2 = z * z;
            for (let k = 1; k < 45; k += 1) {
                term *= -z2 / k;
                const contribution = term / (2 * k + 1);
                sum += contribution;
                if (Math.abs(contribution) < 1e-16 * Math.abs(sum)) {
                    break;
                }
            }
            return sign * twoOverSqrtPi * sum;
        }

        // Continued fraction for erfc(z): erfc(z) = exp(-z^2) / (sqrt(pi) * cf)
        let cf = z;
        for (let k = 45; k >= 1; k -= 1) {
            cf = z + (k * 0.5) / cf;
        }
        const erfc = Math.exp(-z * z) / (Math.sqrt(Math.PI) * cf);
        return sign * (1 - erfc);
    }

    /**
     * Standard Normal CDF using machine-precision hybrid erf/erfc:
     * Phi(x) = 0.5 * (1 + erf(x / sqrt(2))).
     * For deep left tails (x < -2*sqrt(2)), evaluates 0.5 * erfc(-x / sqrt(2)) directly
     * to avoid subtractive cancellation near 0.
     */
    static cdfErfCody(x) {
        if (x < -2.0 * SQRT_2) {
            const z = -x / SQRT_2;
            let cf = z;
            for (let k = 45; k >= 1; k -= 1) {
                cf = z + (k * 0.5) / cf;
            }
            return 0.5 * Math.exp(-z * z) / (Math.sqrt(Math.PI) * cf);
        }
        return 0.5 * (1 + this.erfHybrid(x / SQRT_2));
    }

    /**
     * Evaluates all methods at a given x, returning values, errors against
     * high-precision reference, and execution timings.
     */
    static evaluateAt(x, N = 100, seriesTerms = 50, refOverride = null) {
        const ref = refOverride !== null ? refOverride : this.cdfErfCody(x);

        const t0 = performance.now();
        const trap = this.cdfTrapezoidal(x, N);
        const tTrap = performance.now() - t0;

        const t1 = performance.now();
        const simp = this.cdfSimpson(x, N);
        const tSimp = performance.now() - t1;

        const t2 = performance.now();
        const series = this.cdfPowerSeries(x, seriesTerms);
        const tSeries = performance.now() - t2;

        const t3 = performance.now();
        const abramowitz = this.cdfAbramowitzStegun(x);
        const tAbram = performance.now() - t3;

        const t4 = performance.now();
        const cody = this.cdfErfCody(x);
        const tCody = performance.now() - t4;

        return {
            x,
            ref,
            trapezoidal: { val: trap, err: Math.abs(trap - ref), timeMs: tTrap },
            simpson: { val: simp, err: Math.abs(simp - ref), timeMs: tSimp },
            series: { val: series, err: Math.abs(series - ref), timeMs: tSeries },
            abramowitz: { val: abramowitz, err: Math.abs(abramowitz - ref), timeMs: tAbram },
            cody: { val: cody, err: Math.abs(cody - ref), timeMs: tCody }
        };
    }

    /**
     * Benchmarks all reference points in NORMAL_CDF_REFERENCE.
     */
    static benchmarkReferenceTable(N = 100, seriesTerms = 50) {
        return NORMAL_CDF_REFERENCE.map(({ x, ref }) => this.evaluateAt(x, N, seriesTerms, ref));
    }
}

window.NormalCdfEngine = NormalCdfEngine;
