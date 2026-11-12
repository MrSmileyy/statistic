/**
 * Programmatic bivariate contingency table, conditional/marginal frequency analyzer,
 * Pearson Chi-Square test of independence, and exact p-value engine.
 */

function logGamma(z) {
    const coeffs = [
        76.18009172947146,
        -86.50532032941677,
        24.01409824083091,
        -1.231739572450155,
        0.1208650973866179e-2,
        -0.5395239384953e-5
    ];
    let y = z;
    let x = z;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < coeffs.length; j += 1) {
        y += 1;
        ser += coeffs[j] / y;
    }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * Regularized lower incomplete gamma P(a, x) via series expansion (used when x < a + 1).
 */
function gammaPSeries(a, x) {
    const gln = logGamma(a);
    let ap = a;
    let sum = 1.0 / a;
    let del = sum;
    for (let n = 1; n <= 200; n += 1) {
        ap += 1;
        del *= x / ap;
        sum += del;
        if (Math.abs(del) < Math.abs(sum) * 1e-15) {
            break;
        }
    }
    return sum * Math.exp(-x + a * Math.log(x) - gln);
}

/**
 * Regularized upper incomplete gamma Q(a, x) via modified Lentz continued fraction
 * (used when x >= a + 1).
 */
function gammaQContinuedFraction(a, x) {
    const gln = logGamma(a);
    const tiny = 1e-30;
    let b = x + 1.0 - a;
    let c = 1.0 / tiny;
    let d = 1.0 / b;
    let h = d;

    for (let i = 1; i <= 200; i += 1) {
        const an = -i * (i - a);
        b += 2.0;
        d = an * d + b;
        if (Math.abs(d) < tiny) d = tiny;
        c = b + an / c;
        if (Math.abs(c) < tiny) c = tiny;
        d = 1.0 / d;
        const del = d * c;
        h *= del;
        if (Math.abs(del - 1.0) < 1e-15) {
            break;
        }
    }
    return Math.exp(-x + a * Math.log(x) - gln) * h;
}

/**
 * Computes exact upper-tail p-value P(Chi^2_df >= chiSq) = Q(df / 2, chiSq / 2).
 */
function chiSquarePValue(chiSq, df) {
    if (chiSq <= 0 || df <= 0) return 1.0;
    const a = df / 2.0;
    const x = chiSq / 2.0;
    if (x < a + 1.0) {
        return Math.max(0, Math.min(1, 1.0 - gammaPSeries(a, x)));
    }
    return Math.max(0, Math.min(1, gammaQContinuedFraction(a, x)));
}

function chiSquarePdf(x, df) {
    if (x <= 0 || df <= 0) return 0;
    const halfDf = df / 2.0;
    const logPdf = (halfDf - 1.0) * Math.log(x) - x / 2.0 - halfDf * Math.LN2 - logGamma(halfDf);
    return Math.exp(logPdf);
}

function chiSquareCriticalValue(df, alpha = 0.05) {
    let low = 0.0;
    let high = Math.max(20.0, df * 5.0 + 30.0);
    while (chiSquarePValue(high, df) > alpha) {
        high *= 2.0;
    }
    for (let iter = 0; iter < 60; iter += 1) {
        const mid = 0.5 * (low + high);
        if (chiSquarePValue(mid, df) > alpha) {
            low = mid;
        } else {
            high = mid;
        }
    }
    return 0.5 * (low + high);
}

/**
 * Helper to expand frequency counts into a raw list of bivariate (X, F) observation records.
 */
function expandCountsToRecords(xOrder, yOrder, countMatrix) {
    const records = [];
    for (let i = 0; i < xOrder.length; i += 1) {
        for (let j = 0; j < yOrder.length; j += 1) {
            const count = countMatrix[i][j];
            for (let k = 0; k < count; k += 1) {
                records.push({ x: xOrder[i], y: yOrder[j] });
            }
        }
    }
    return records;
}

const BUILTIN_DATASETS = {
    cyber_incidents: {
        id: 'cyber_incidents',
        name: 'Cybersecurity: Attack Vector vs. Incident Severity (Dependent)',
        xName: 'Attack Vector (X)',
        yName: 'Incident Severity (F)',
        description: '320 simulated enterprise security incidents recording the initial attack vector (X) and resulting impact severity (F).',
        causalityNote: 'Strong statistical dependence does NOT automatically prove that the vector alone causes Critical severity: lurking confounders such as unpatched legacy infrastructure, lack of MFA, or delayed detection often drive both successful Ransomware deployment and high impact.',
        records: expandCountsToRecords(
            ['Phishing', 'Brute-Force', 'SQL Injection', 'Ransomware'],
            ['Low', 'Medium', 'High', 'Critical'],
            [
                [38, 32, 14, 6],   // Phishing (90)
                [34, 28, 12, 6],   // Brute-Force (80)
                [8, 16, 28, 18],   // SQL Injection (70)
                [4, 10, 24, 42]    // Ransomware (80)
            ]
        )
    },
    independent_experiment: {
        id: 'independent_experiment',
        name: 'Client Browser vs. Coin Toss Outcome (Independent)',
        xName: 'Browser Engine (X)',
        yName: 'Outcome (F)',
        description: '300 independent trials testing whether user browser engine (X) has any relationship with a fair randomized outcome (F).',
        causalityNote: 'Because the two variables are statistically independent (conditional distributions P(F|X) match the marginal P(F)), there is neither association nor causal link.',
        records: expandCountsToRecords(
            ['Chromium', 'Firefox', 'Safari'],
            ['Heads', 'Tails'],
            [
                [52, 48],  // 100
                [49, 51],  // 100
                [51, 49]   // 100
            ]
        )
    },
    confounding_summer: {
        id: 'confounding_summer',
        name: 'Ice Cream Sales vs. Drowning Incidents (Confounded Association)',
        xName: 'Ice Cream Sales Tier (X)',
        yName: 'Drowning Risk Tier (F)',
        description: '240 daily coastal observations comparing ice cream sales volume (X) and beach drowning incident tier (F).',
        causalityNote: 'Classic spurious association: Chi-square strongly rejects independence (p < 0.001), yet eating ice cream does NOT cause drowning. Seasonal temperature (summer heat) is a confounding variable that independently increases both ice cream purchases and swimming activity.',
        records: expandCountsToRecords(
            ['Low Sales', 'Moderate Sales', 'High Sales'],
            ['Low Risk', 'Elevated Risk', 'High Risk'],
            [
                [56, 18, 6],   // 80
                [24, 38, 18],  // 80
                [8, 22, 50]    // 80
            ]
        )
    }
};

class IndependenceAnalyzer {
    static getDatasets() {
        return BUILTIN_DATASETS;
    }

    static recordsToCsv(records, xHeader = 'X', yHeader = 'F') {
        const lines = [`${xHeader}, ${yHeader}`];
        for (let i = 0; i < records.length; i += 1) {
            lines.push(`${records[i].x}, ${records[i].y}`);
        }
        return lines.join('\n');
    }

    /**
     * Parses bivariate CSV lines ("x, y") into observation records.
     * Automatically skips a header row if detected as "X, F" or "X, Y".
     */
    static parseCsvRecords(csvText) {
        const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length === 0) {
            throw new Error('Input dataset is empty.');
        }

        const records = [];
        let xName = 'Variable X';
        let yName = 'Variable F';

        for (let i = 0; i < lines.length; i += 1) {
            const parts = lines[i].split(/[,\t;]+/).map((p) => p.trim());
            if (parts.length < 2 || !parts[0] || !parts[1]) {
                continue;
            }
            if (i === 0 && (/^(x|var_?x|attack|browser)/i.test(parts[0]) || /^(f|y|var_?[fy])/i.test(parts[1]))) {
                xName = parts[0];
                yName = parts[1];
                continue;
            }
            records.push({ x: parts[0], y: parts[1] });
        }

        if (records.length === 0) {
            throw new Error('No valid bivariate (X, F) pairs found. Use "CategoryX, CategoryF" per line.');
        }

        return { records, xName, yName };
    }

    /**
     * Programmatically constructs the contingency table and computes all marginal,
     * conditional, expected frequencies, Chi-square statistic, Cramér's V, and p-value.
     */
    static analyze(records, alpha = 0.05) {
        if (!Array.isArray(records) || records.length === 0) {
            throw new Error('Dataset must contain at least one bivariate observation.');
        }

        // Preserve first-seen category order (or natural order)
        const xSet = new Set();
        const ySet = new Set();
        for (let i = 0; i < records.length; i += 1) {
            xSet.add(String(records[i].x));
            ySet.add(String(records[i].y));
        }

        const xLabels = Array.from(xSet);
        const yLabels = Array.from(ySet);
        const r = xLabels.length;
        const c = yLabels.length;

        if (r < 2 || c < 2) {
            throw new Error('Contingency table requires at least 2 distinct categories for both X and F.');
        }

        const xIndex = new Map(xLabels.map((lbl, idx) => [lbl, idx]));
        const yIndex = new Map(yLabels.map((lbl, idx) => [lbl, idx]));

        // 1. Observed frequencies O[i][j]
        const observed = Array.from({ length: r }, () => new Array(c).fill(0));
        for (let k = 0; k < records.length; k += 1) {
            const i = xIndex.get(String(records[k].x));
            const j = yIndex.get(String(records[k].y));
            observed[i][j] += 1;
        }

        // 2. Marginal totals and relative marginal frequencies
        const N = records.length;
        const rowTotals = new Array(r).fill(0);
        const colTotals = new Array(c).fill(0);

        for (let i = 0; i < r; i += 1) {
            for (let j = 0; j < c; j += 1) {
                rowTotals[i] += observed[i][j];
                colTotals[j] += observed[i][j];
            }
        }

        const rowMarginalsRel = rowTotals.map((rt) => rt / N);
        const colMarginalsRel = colTotals.map((ct) => ct / N);

        // 3. Conditional frequencies: P(F = y_j | X = x_i) and P(X = x_i | F = y_j)
        const condYGivenX = Array.from({ length: r }, (_, i) =>
            observed[i].map((oij) => (rowTotals[i] > 0 ? oij / rowTotals[i] : 0))
        );
        const condXGivenY = Array.from({ length: r }, (_, i) =>
            observed[i].map((oij, j) => (colTotals[j] > 0 ? oij / colTotals[j] : 0))
        );

        // 4. Expected frequencies E[i][j] = (R_i * C_j) / N under independence H_0
        const expected = Array.from({ length: r }, (_, i) =>
            colTotals.map((ct) => (rowTotals[i] * ct) / N)
        );

        // 5. Pearson Chi-Square statistic & standardized residuals
        let chiSquare = 0;
        let lowExpectedCells = 0;
        const residuals = Array.from({ length: r }, () => new Array(c).fill(0));

        for (let i = 0; i < r; i += 1) {
            for (let j = 0; j < c; j += 1) {
                const oij = observed[i][j];
                const eij = expected[i][j];
                if (eij < 5) lowExpectedCells += 1;
                if (eij > 0) {
                    const diff = oij - eij;
                    chiSquare += (diff * diff) / eij;
                    residuals[i][j] = diff / Math.sqrt(eij);
                }
            }
        }

        const df = (r - 1) * (c - 1);
        const pValue = chiSquarePValue(chiSquare, df);
        const criticalValue = chiSquareCriticalValue(df, alpha);
        const minDim = Math.min(r - 1, c - 1);
        const cramersV = minDim > 0 ? Math.sqrt(chiSquare / (N * minDim)) : 0;
        const isDependent = pValue < alpha;

        return {
            N,
            r,
            c,
            xLabels,
            yLabels,
            observed,
            expected,
            rowTotals,
            colTotals,
            rowMarginalsRel,
            colMarginalsRel,
            condYGivenX,
            condXGivenY,
            residuals,
            chiSquare,
            df,
            pValue,
            alpha,
            criticalValue,
            cramersV,
            isDependent,
            lowExpectedCells
        };
    }

    static chiSquarePdf(x, df) {
        return chiSquarePdf(x, df);
    }

    /**
     * Generates a synthetic bivariate dataset (either independent or dependent) for custom testing.
     */
    static generateSyntheticRecords(mode = 'independent', N = 240) {
        const xCats = ['Group A', 'Group B', 'Group C'];
        const yCats = ['Outcome 1', 'Outcome 2', 'Outcome 3'];
        const records = [];

        for (let k = 0; k < N; k += 1) {
            const xIdx = Math.floor(Math.random() * xCats.length);
            let yIdx;
            if (mode === 'independent') {
                // Identical conditional distribution across all X groups: P(Y) = [0.25, 0.45, 0.30]
                const u = Math.random();
                yIdx = u < 0.25 ? 0 : (u < 0.70 ? 1 : 2);
            } else {
                // Dependent: conditional probabilities shift strongly with X
                const u = Math.random();
                if (xIdx === 0) yIdx = u < 0.65 ? 0 : (u < 0.90 ? 1 : 2);
                else if (xIdx === 1) yIdx = u < 0.20 ? 0 : (u < 0.75 ? 1 : 2);
                else yIdx = u < 0.10 ? 0 : (u < 0.35 ? 1 : 2);
            }
            records.push({ x: xCats[xIdx], y: yCats[yIdx] });
        }
        return records;
    }
}

window.IndependenceAnalyzer = IndependenceAnalyzer;

