(() => {
    const IntegrationEngine = window.IntegrationEngine;
    const NormalCdfEngine = window.NormalCdfEngine;

    const elements = {
        tabButtons: document.querySelectorAll('.tab-btn'),
        tabPanes: document.querySelectorAll('.tab-pane'),
        btnHelp: document.getElementById('btn-help'),
        helpModal: document.getElementById('help-modal'),
        btnCloseModal: document.getElementById('btn-close-modal'),

        // Exercise 1
        selectFn: document.getElementById('select-fn'),
        inputPartitions: document.getElementById('input-partitions'),
        rangePartitions: document.getElementById('range-partitions'),
        inputSamples: document.getElementById('input-samples'),
        rangeSamples: document.getElementById('range-samples'),
        btnRunEx1: document.getElementById('btn-run-ex1'),
        fnPresetButtons: document.querySelectorAll('[data-fn-preset]'),
        fnNotes: document.getElementById('fn-notes'),
        fnFormula: document.getElementById('fn-formula'),
        fnExact: document.getElementById('fn-exact'),
        fnRiemannOk: document.getElementById('fn-riemann-ok'),
        fnLebesgueOk: document.getElementById('fn-lebesgue-ok'),
        m1Exact: document.getElementById('m1-exact'),
        m1ExactSub: document.getElementById('m1-exact-sub'),
        m1RiemannMid: document.getElementById('m1-riemann-mid'),
        m1RiemannMidSub: document.getElementById('m1-riemann-mid-sub'),
        m1RiemannLeft: document.getElementById('m1-riemann-left'),
        m1RiemannLeftSub: document.getElementById('m1-riemann-left-sub'),
        m1Lebesgue: document.getElementById('m1-lebesgue'),
        m1LebesgueSub: document.getElementById('m1-lebesgue-sub'),
        badgeEx1Conv: document.getElementById('badge-ex1-conv'),
        ex1AnalysisAccuracy: document.getElementById('ex1-analysis-accuracy'),
        ex1AnalysisBehavior: document.getElementById('ex1-analysis-behavior'),

        // Exercise 2
        inputX: document.getElementById('input-x'),
        rangeX: document.getElementById('range-x'),
        inputQuadN: document.getElementById('input-quad-n'),
        rangeQuadN: document.getElementById('range-quad-n'),
        inputSeriesK: document.getElementById('input-series-k'),
        rangeSeriesK: document.getElementById('range-series-k'),
        btnRunEx2: document.getElementById('btn-run-ex2'),
        xPresetButtons: document.querySelectorAll('[data-x-preset]'),
        cdfSummaryX: document.getElementById('cdf-summary-x'),
        cdfSummaryPdf: document.getElementById('cdf-summary-pdf'),
        cdfSummaryPhi: document.getElementById('cdf-summary-phi'),
        cdfSummaryTail: document.getElementById('cdf-summary-tail'),
        cdfSummaryAs: document.getElementById('cdf-summary-as'),
        seriesWarningBox: document.getElementById('series-warning-box'),
        m2Ref: document.getElementById('m2-ref'),
        m2Simpson: document.getElementById('m2-simpson'),
        m2SimpsonSub: document.getElementById('m2-simpson-sub'),
        m2Trap: document.getElementById('m2-trap'),
        m2TrapSub: document.getElementById('m2-trap-sub'),
        m2Series: document.getElementById('m2-series'),
        m2SeriesSub: document.getElementById('m2-series-sub'),
        tblN: document.getElementById('tbl-n'),
        tblK: document.getElementById('tbl-k'),
        cdfRefTableBody: document.getElementById('cdf-ref-table-body'),
        ex2AnalysisPerf: document.getElementById('ex2-analysis-perf')
    };

    const plotlyConfig = { responsive: true, displayModeBar: false };

    const createPlotlyLayout = (xTitle, yTitle, showLegend = false) => ({
        autosize: true,
        font: { family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif', size: 11, color: '#333333' },
        margin: { l: 55, r: 22, t: 28, b: 45 },
        paper_bgcolor: '#ffffff',
        plot_bgcolor: '#ffffff',
        xaxis: {
            title: { text: xTitle, font: { size: 11, color: '#444' } },
            gridcolor: '#f0f0f0',
            zerolinecolor: '#cccccc',
            showline: true,
            linecolor: '#dddddd'
        },
        yaxis: {
            title: { text: yTitle, font: { size: 11, color: '#444' } },
            gridcolor: '#f0f0f0',
            zerolinecolor: '#cccccc',
            showline: true,
            linecolor: '#dddddd'
        },
        showlegend: showLegend
    });

    const syncSliderPair = (numEl, rangeEl, onChange) => {
        rangeEl.addEventListener('input', () => {
            numEl.value = rangeEl.value;
            if (onChange) onChange();
        });
        numEl.addEventListener('input', () => {
            rangeEl.value = numEl.value;
            if (onChange) onChange();
        });
    };

    const initTabs = () => {
        elements.tabButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-tab');
                elements.tabButtons.forEach((b) => b.classList.remove('active'));
                elements.tabPanes.forEach((p) => p.classList.remove('active'));
                btn.classList.add('active');
                const pane = document.getElementById(targetId);
                if (pane) pane.classList.add('active');

                if (window.Plotly) {
                    const chartIds = targetId === 'pane-ex1'
                        ? ['chart-riemann-vis', 'chart-lebesgue-vis', 'chart-int-convergence', 'chart-int-timing']
                        : ['chart-norm-pdf', 'chart-norm-errors', 'chart-norm-quad-conv', 'chart-norm-series-conv'];
                    chartIds.forEach((id) => {
                        const el = document.getElementById(id);
                        if (el && el.data) {
                            try {
                                window.Plotly.Plots.resize(el);
                            } catch (e) {
                                // Ignore resize race
                            }
                        }
                    });
                }
            });
        });
    };

    /* ------------------------------------------------------------- */
    /* EXERCISE 1: RIEMANN & LEBESGUE INTEGRATION                    */
    /* ------------------------------------------------------------- */
    const getEx1Params = () => {
        const fnKey = elements.selectFn.value || 'sin';
        const N = Math.max(5, Math.min(2000, parseInt(elements.inputPartitions.value, 10) || 40));
        const K = Math.max(1000, Math.min(100000, parseInt(elements.inputSamples.value, 10) || 20000));
        return { fnKey, N, K };
    };

    const updateEx1SidebarInfo = (fnObj) => {
        elements.fnNotes.textContent = fnObj.notes;
        elements.fnFormula.textContent = fnObj.formula;
        elements.fnExact.textContent = fnObj.id === 'dirichlet'
            ? '0.0 (Lebesgue) / DNE (Riemann)'
            : fnObj.exact.toFixed(6);
        elements.fnRiemannOk.textContent = fnObj.riemannIntegrable
            ? 'Yes'
            : (fnObj.id === 'inv_sqrt' ? 'Improper only' : 'No (DNE)');
        elements.fnLebesgueOk.textContent = fnObj.lebesgueIntegrable ? 'Yes' : 'No';
    };

    const renderRiemannVis = (fnObj, riemannRes) => {
        if (!window.Plotly) return;
        const { a, b, yMax, id } = fnObj;
        const traces = [];

        // Riemann rectangles as filled shapes/bars
        const barX = riemannRes.rects.map((r) => 0.5 * (r.x0 + r.x1));
        const barY = riemannRes.rects.map((r) => Math.min(r.yMid, yMax * 1.2));
        const barW = riemannRes.rects.map((r) => r.x1 - r.x0);

        traces.push({
            name: 'Riemann Rectangles',
            x: barX,
            y: barY,
            width: barW,
            type: 'bar',
            marker: {
                color: 'rgba(0, 68, 136, 0.35)',
                line: { color: '#004488', width: 1 }
            }
        });

        // Smooth curve for reference
        const numPts = 200;
        const curveX = [];
        const curveY = [];
        for (let i = 0; i <= numPts; i += 1) {
            const x = a + (i / numPts) * (b - a);
            const y = id === 'dirichlet' ? 1 : fnObj.eval(x, true);
            curveX.push(x);
            curveY.push(Number.isFinite(y) ? Math.min(y, yMax * 1.2) : null);
        }

        traces.push({
            name: 'f(x)',
            x: curveX,
            y: curveY,
            type: 'scatter',
            mode: id === 'dirichlet' || id === 'thomae' ? 'markers' : 'lines',
            line: { color: '#900000', width: 2.5 },
            marker: { color: '#900000', size: 4 }
        });

        const layout = createPlotlyLayout('Domain x', 'f(x)', true);
        layout.bargap = 0;
        layout.legend = { orientation: 'h', x: 0.02, y: 1.14, font: { size: 10 } };
        window.Plotly.react('chart-riemann-vis', traces, layout, plotlyConfig);
    };

    const renderLebesgueVis = (fnObj, lebesgueRes) => {
        if (!window.Plotly) return;
        const bins = lebesgueRes.bins;
        // Downsample bins visually if > 80 so horizontal bars remain readable
        const step = Math.max(1, Math.floor(bins.length / 80));
        const yVals = [];
        const measures = [];

        for (let i = 0; i < bins.length; i += step) {
            let mSum = 0;
            let count = 0;
            let ySum = 0;
            for (let j = i; j < Math.min(bins.length, i + step); j += 1) {
                mSum += bins[j].measure;
                ySum += bins[j].yMid;
                count += 1;
            }
            yVals.push(ySum / count);
            measures.push(mSum);
        }

        const trace = {
            name: 'Preimage Measure μ(E_k)',
            x: measures,
            y: yVals,
            orientation: 'h',
            type: 'bar',
            marker: {
                color: 'rgba(39, 174, 96, 0.65)',
                line: { color: '#27ae60', width: 1 }
            }
        };

        const layout = createPlotlyLayout('Preimage Measure μ(f⁻¹([y_k, y_{k+1})))', 'Range Level y_k', false);
        window.Plotly.react('chart-lebesgue-vis', [trace], layout, plotlyConfig);
    };

    const renderConvergenceCharts = (fnObj, convData) => {
        if (!window.Plotly) return;
        const counts = convData.map((d) => d.count);

        const traceMid = {
            name: 'Riemann (Midpoint)',
            x: counts,
            y: convData.map((d) => d.riemannErr),
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#004488', width: 2.2 }
        };

        const traceLeft = {
            name: 'Riemann (Left)',
            x: counts,
            y: convData.map((d) => d.riemannLeftErr),
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#d35400', width: 2, dash: 'dash' }
        };

        const traceLeb = {
            name: 'Lebesgue (Level-Set)',
            x: counts,
            y: convData.map((d) => d.lebesgueErr),
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#27ae60', width: 2.2 }
        };

        const convLayout = createPlotlyLayout('Partitions (N / M)', 'Absolute Error |I - I_exact|', true);
        convLayout.xaxis.type = 'log';
        convLayout.yaxis.type = 'log';
        convLayout.legend = { orientation: 'h', x: 0.02, y: 1.14, font: { size: 10 } };
        window.Plotly.react('chart-int-convergence', [traceMid, traceLeft, traceLeb], convLayout, plotlyConfig);

        const timeRiemann = {
            name: 'Riemann (O(N))',
            x: counts,
            y: convData.map((d) => d.riemannTimeMs),
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#004488', width: 2.2 }
        };

        const timeLebesgue = {
            name: 'Lebesgue (O(K + M))',
            x: counts,
            y: convData.map((d) => d.lebesgueTimeMs),
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#27ae60', width: 2.2 }
        };

        const timeLayout = createPlotlyLayout('Partitions (N / M)', 'Execution Time (ms)', true);
        timeLayout.legend = { orientation: 'h', x: 0.02, y: 1.14, font: { size: 10 } };
        window.Plotly.react('chart-int-timing', [timeRiemann, timeLebesgue], timeLayout, plotlyConfig);
    };

    const updateEx1Analysis = (fnObj, riemannRes, lebesgueRes, K) => {
        const errMid = Math.abs(riemannRes.midpointSum - fnObj.exact);
        const errLeb = Math.abs(lebesgueRes.integral - fnObj.exact);
        elements.badgeEx1Conv.textContent = `N = M = ${riemannRes.N}, K = ${K}`;

        elements.ex1AnalysisAccuracy.innerHTML = `
            For <span class="highlight-val">${fnObj.name}</span> with <b>N = ${riemannRes.N}</b> domain subintervals
            and <b>M = ${lebesgueRes.M}</b> range level sets (probed with K = ${K} domain samples):
            Riemann Midpoint yields <span class="highlight-val">${riemannRes.midpointSum.toFixed(6)}</span>
            (error <span class="highlight-val">${errMid.toExponential(2)}</span> in ${riemannRes.timeMs.toFixed(2)} ms),
            while Lebesgue simple-function approximation yields <span class="highlight-val">${lebesgueRes.integral.toFixed(6)}</span>
            (error <span class="highlight-val">${errLeb.toExponential(2)}</span> in ${lebesgueRes.timeMs.toFixed(2)} ms).
            Riemann quadrature scales as <i>O(N)</i> and achieves <i>O(1/N&sup2;)</i> accuracy on smooth functions,
            whereas numerical Lebesgue requires <i>O(K + M)</i> operations because estimating preimage measures
            &mu;(f<sup>-1</sup>([y<sub>k</sub>, y<sub>k+1</sub>))) still demands fine domain probing.
        `;

        if (fnObj.id === 'dirichlet') {
            elements.ex1AnalysisBehavior.innerHTML = `
                <b>Divergent Behavior (Pathological Case):</b> The Dirichlet function is <i>not</i> Riemann-integrable:
                every subinterval contains both rationals and irrationals, so Upper Darboux sums equal 1 and Lower Darboux sums equal 0.
                A naive deterministic grid <i>x<sub>i</sub> = i/N</i> evaluates only at rational numbers and returns
                <span class="highlight-val">${riemannRes.midpointSum.toFixed(4)}</span>.
                In contrast, the Lebesgue integral equals <span class="highlight-val">0</span> because &rationals; &cap; [0, 1] is countable
                and has Lebesgue measure zero (our irrational-offset sampler yields ${lebesgueRes.lowerIntegral.toFixed(4)} lower simple-function integral).
            `;
        } else if (fnObj.id === 'inv_sqrt') {
            elements.ex1AnalysisBehavior.innerHTML = `
                <b>Unbounded Integrand:</b> Because <i>1/&radic;x &rarr; &infin;</i> as <i>x &rarr; 0<sup>+</sup></i>,
                the Left Riemann sum diverges (<span class="highlight-val">&infin;</span> at x = 0).
                Lebesgue integration handles unbounded functions naturally by partitioning the range into measurable level sets
                of finite measure &mu;({x : y<sub>k</sub> &le; 1/&radic;x &lt; y<sub>k+1</sub>}) = 1/y<sub>k</sub>&sup2; - 1/y<sub>k+1</sub>&sup2;,
                converging cleanly toward the exact value <span class="highlight-val">2.0000</span>.
            `;
        } else {
            elements.ex1AnalysisBehavior.innerHTML = `
                <b>Agreement on Riemann-Integrable Functions:</b> Since <span class="highlight-val">${fnObj.name}</span>
                is bounded and continuous almost everywhere on [a, b], it is both Riemann- and Lebesgue-integrable, and
                <b>both approaches converge to the exact same value (${fnObj.exact.toFixed(6)})</b>.
                The key difference is geometric: Riemann slices vertically along the domain, whereas Lebesgue groups points
                of similar height horizontally across the range.
            `;
        }
    };

    const runExercise1 = () => {
        const { fnKey, N, K } = getEx1Params();
        const fnObj = IntegrationEngine.getFunctions()[fnKey];
        updateEx1SidebarInfo(fnObj);

        const riemannRes = IntegrationEngine.computeRiemann(fnObj, N);
        const lebesgueRes = IntegrationEngine.computeLebesgue(fnObj, N, K);
        const convData = IntegrationEngine.computeConvergence(fnObj, [10, 25, 50, 100, 250, 500, 1000], K);

        elements.m1Exact.textContent = fnObj.id === 'dirichlet' ? '0.0 (Leb.)' : fnObj.exact.toFixed(6);
        elements.m1ExactSub.textContent = fnObj.riemannIntegrable ? 'Riemann = Lebesgue' : 'Not properly Riemann-int.';

        elements.m1RiemannMid.textContent = riemannRes.midpointSum.toFixed(6);
        elements.m1RiemannMidSub.textContent = `Err: ${Math.abs(riemannRes.midpointSum - fnObj.exact).toExponential(2)} | ${riemannRes.timeMs.toFixed(2)} ms`;

        elements.m1RiemannLeft.textContent = Number.isFinite(riemannRes.leftSum) ? riemannRes.leftSum.toFixed(6) : '∞ (Singular)';
        elements.m1RiemannLeftSub.textContent = Number.isFinite(riemannRes.leftSum)
            ? `Err: ${Math.abs(riemannRes.leftSum - fnObj.exact).toExponential(2)}`
            : 'Blows up at x = 0';

        elements.m1Lebesgue.textContent = lebesgueRes.integral.toFixed(6);
        elements.m1LebesgueSub.textContent = `Err: ${Math.abs(lebesgueRes.integral - fnObj.exact).toExponential(2)} | ${lebesgueRes.timeMs.toFixed(2)} ms`;

        renderRiemannVis(fnObj, riemannRes);
        renderLebesgueVis(fnObj, lebesgueRes);
        renderConvergenceCharts(fnObj, convData);
        updateEx1Analysis(fnObj, riemannRes, lebesgueRes, K);
    };

    /* ------------------------------------------------------------- */
    /* EXERCISE 2: NUMERICAL COMPUTATION OF THE NORMAL CDF           */
    /* ------------------------------------------------------------- */
    const getEx2Params = () => {
        const x = parseFloat(elements.inputX.value);
        const N = Math.max(10, Math.min(10000, parseInt(elements.inputQuadN.value, 10) || 100));
        const K = Math.max(5, Math.min(150, parseInt(elements.inputSeriesK.value, 10) || 40));
        return {
            x: Number.isFinite(x) ? x : 1.96,
            N,
            K
        };
    };

    const renderNormalPdfChart = (xVal, phiVal) => {
        if (!window.Plotly) return;
        const bound = Math.max(4.5, Math.abs(xVal) + 1.0);
        const pts = 240;
        const tArr = [];
        const yArr = [];
        const fillX = [];
        const fillY = [];

        for (let i = 0; i <= pts; i += 1) {
            const t = -bound + (i / pts) * (2 * bound);
            const y = NormalCdfEngine.pdf(t);
            tArr.push(t);
            yArr.push(y);
            if (t <= xVal) {
                fillX.push(t);
                fillY.push(y);
            }
        }

        const pdfTrace = {
            name: 'Standard Normal PDF φ(t)',
            x: tArr,
            y: yArr,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#900000', width: 2.5 }
        };

        const areaTrace = {
            name: `Φ(${xVal.toFixed(2)}) = ${phiVal.toFixed(4)}`,
            x: fillX,
            y: fillY,
            type: 'scatter',
            mode: 'none',
            fill: 'tozeroy',
            fillcolor: 'rgba(0, 68, 136, 0.30)'
        };

        const layout = createPlotlyLayout('t', 'Density φ(t)', true);
        layout.legend = { orientation: 'h', x: 0.02, y: 1.14, font: { size: 10 } };
        layout.shapes = [{
            type: 'line',
            x0: xVal,
            x1: xVal,
            y0: 0,
            y1: 1,
            yref: 'paper',
            line: { color: '#004488', width: 2, dash: 'dash' }
        }];

        window.Plotly.react('chart-norm-pdf', [areaTrace, pdfTrace], layout, plotlyConfig);
    };

    const renderErrorProfileChart = (N, K) => {
        if (!window.Plotly) return;
        const xs = [];
        const errTrap = [];
        const errSimp = [];
        const errSeries = [];
        const errAS = [];

        for (let x = -5.5; x <= 5.501; x += 0.25) {
            const res = NormalCdfEngine.evaluateAt(x, N, K);
            xs.push(x);
            errTrap.push(Math.max(res.trapezoidal.err, 1e-16));
            errSimp.push(Math.max(res.simpson.err, 1e-16));
            errSeries.push(Math.max(res.series.err, 1e-16));
            errAS.push(Math.max(res.abramowitz.err, 1e-16));
        }

        const traces = [
            { name: 'Trapezoidal', x: xs, y: errTrap, type: 'scatter', mode: 'lines', line: { color: '#d35400', width: 2 } },
            { name: 'Simpson', x: xs, y: errSimp, type: 'scatter', mode: 'lines', line: { color: '#004488', width: 2.2 } },
            { name: 'Power Series', x: xs, y: errSeries, type: 'scatter', mode: 'lines', line: { color: '#900000', width: 2.2 } },
            { name: 'A&S (7.1.26)', x: xs, y: errAS, type: 'scatter', mode: 'lines', line: { color: '#27ae60', width: 2, dash: 'dot' } }
        ];

        const layout = createPlotlyLayout('Evaluation Point x', 'Absolute Error (Log Scale)', true);
        layout.yaxis.type = 'log';
        layout.legend = { orientation: 'h', x: 0.02, y: 1.14, font: { size: 10 } };
        window.Plotly.react('chart-norm-errors', traces, layout, plotlyConfig);
    };

    const renderQuadConvergenceChart = (xVal) => {
        if (!window.Plotly) return;
        const nList = [10, 20, 40, 80, 160, 320, 640];
        const ref = NormalCdfEngine.cdfErfCody(xVal);
        const trapErrs = [];
        const simpErrs = [];

        nList.forEach((n) => {
            trapErrs.push(Math.max(Math.abs(NormalCdfEngine.cdfTrapezoidal(xVal, n) - ref), 1e-16));
            simpErrs.push(Math.max(Math.abs(NormalCdfEngine.cdfSimpson(xVal, n) - ref), 1e-16));
        });

        const traces = [
            { name: 'Trapezoidal O(1/N²)', x: nList, y: trapErrs, type: 'scatter', mode: 'lines+markers', line: { color: '#d35400', width: 2.2 } },
            { name: 'Simpson O(1/N⁴)', x: nList, y: simpErrs, type: 'scatter', mode: 'lines+markers', line: { color: '#004488', width: 2.2 } }
        ];

        const layout = createPlotlyLayout('Subintervals (N)', `Error at x = ${xVal.toFixed(2)}`, true);
        layout.xaxis.type = 'log';
        layout.yaxis.type = 'log';
        layout.legend = { orientation: 'h', x: 0.02, y: 1.14, font: { size: 10 } };
        window.Plotly.react('chart-norm-quad-conv', traces, layout, plotlyConfig);
    };

    const renderSeriesConvergenceChart = (xVal, K) => {
        if (!window.Plotly) return;
        const traceData = NormalCdfEngine.getPowerSeriesTrace(xVal, K);
        const ref = NormalCdfEngine.cdfErfCody(xVal);

        const partialTrace = {
            name: 'Partial Sum Φ_k(x)',
            x: traceData.map((d) => d.k),
            y: traceData.map((d) => d.approx),
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#004488', width: 2 }
        };

        const refTrace = {
            name: `Reference Φ(${xVal.toFixed(2)})`,
            x: [0, traceData[traceData.length - 1].k],
            y: [ref, ref],
            type: 'scatter',
            mode: 'lines',
            line: { color: '#900000', width: 2, dash: 'dash' }
        };

        const layout = createPlotlyLayout('Series Term Index (k)', 'Partial Sum Φ_k(x)', true);
        layout.legend = { orientation: 'h', x: 0.02, y: 1.14, font: { size: 10 } };
        window.Plotly.react('chart-norm-series-conv', [partialTrace, refTrace], layout, plotlyConfig);
    };

    const formatErrCell = (err) => {
        const cls = err < 1e-9 ? 'err-good' : (err < 1e-4 ? 'err-warn' : 'err-bad');
        return `<td class="${cls}">${err.toExponential(2)}</td>`;
    };

    const updateReferenceTable = (N, K) => {
        elements.tblN.textContent = N;
        elements.tblK.textContent = K;
        const rows = NormalCdfEngine.benchmarkReferenceTable(N, K);

        elements.cdfRefTableBody.innerHTML = rows.map((r) => `
            <tr>
                <td>${r.x.toFixed(3)}</td>
                <td>${r.ref.toFixed(12)}</td>
                ${formatErrCell(r.cody.err)}
                ${formatErrCell(r.simpson.err)}
                ${formatErrCell(r.trapezoidal.err)}
                ${formatErrCell(r.series.err)}
                ${formatErrCell(r.abramowitz.err)}
            </tr>
        `).join('');

        // Compute aggregate timing across 1000 calls for realistic benchmark
        const iter = 1000;
        const t0 = performance.now();
        for (let i = 0; i < iter; i += 1) NormalCdfEngine.cdfErfCody(1.96);
        const dtCody = performance.now() - t0;

        const t1 = performance.now();
        for (let i = 0; i < iter; i += 1) NormalCdfEngine.cdfSimpson(1.96, N);
        const dtSimp = performance.now() - t1;

        const t2 = performance.now();
        for (let i = 0; i < iter; i += 1) NormalCdfEngine.cdfTrapezoidal(1.96, N);
        const dtTrap = performance.now() - t2;

        elements.ex2AnalysisPerf.innerHTML = `
            Across 1,000 evaluations at x = 1.96: the Hybrid <b>erf / Continued Fraction</b> method takes
            <span class="highlight-val">${dtCody.toFixed(2)} ms</span> (achieving ~10<sup>-16</sup> precision),
            <b>Simpson's Rule (N=${N})</b> takes <span class="highlight-val">${dtSimp.toFixed(2)} ms</span>,
            and <b>Trapezoidal Rule (N=${N})</b> takes <span class="highlight-val">${dtTrap.toFixed(2)} ms</span>.
            While Simpson's rule converges rapidly at <i>O(1/N&sup4;)</i>, quadrature cost scales linearly with <i>N</i>.
            The hybrid series + continued fraction approach achieves full IEEE 754 double precision in <i>O(1)</i> time
            without catastrophic tail cancellation.
        `;
    };

    const runExercise2 = () => {
        const { x, N, K } = getEx2Params();
        const res = NormalCdfEngine.evaluateAt(x, N, K);

        elements.cdfSummaryX.textContent = x.toFixed(4);
        elements.cdfSummaryPdf.textContent = NormalCdfEngine.pdf(x).toFixed(8);
        elements.cdfSummaryPhi.textContent = res.ref.toFixed(12);
        elements.cdfSummaryTail.textContent = (1 - res.ref).toExponential(6);
        elements.cdfSummaryAs.textContent = `${res.abramowitz.val.toFixed(9)} (err ${res.abramowitz.err.toExponential(1)})`;

        elements.seriesWarningBox.style.display = Math.abs(x) > 4.5 ? 'block' : 'none';

        elements.m2Ref.textContent = res.ref.toFixed(10);
        elements.m2Simpson.textContent = res.simpson.val.toFixed(10);
        elements.m2SimpsonSub.textContent = `Err: ${res.simpson.err.toExponential(2)} | N=${N}`;

        elements.m2Trap.textContent = res.trapezoidal.val.toFixed(10);
        elements.m2TrapSub.textContent = `Err: ${res.trapezoidal.err.toExponential(2)} | N=${N}`;

        elements.m2Series.textContent = res.series.val.toFixed(10);
        elements.m2SeriesSub.textContent = `Err: ${res.series.err.toExponential(2)} | K=${K}`;

        renderNormalPdfChart(x, res.ref);
        renderErrorProfileChart(N, K);
        renderQuadConvergenceChart(x);
        renderSeriesConvergenceChart(x, K);
        updateReferenceTable(N, K);
    };

    /* ------------------------------------------------------------- */
    /* MODAL & INITIALIZATION                                        */
    /* ------------------------------------------------------------- */
    const initModal = () => {
        elements.btnHelp.addEventListener('click', () => elements.helpModal.classList.add('open'));
        elements.btnCloseModal.addEventListener('click', () => elements.helpModal.classList.remove('open'));
        elements.helpModal.addEventListener('click', (e) => {
            if (e.target === elements.helpModal) elements.helpModal.classList.remove('open');
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.helpModal.classList.contains('open')) {
                elements.helpModal.classList.remove('open');
            }
        });
    };

    const init = () => {
        initTabs();
        initModal();

        // Exercise 1 bindings
        syncSliderPair(elements.inputPartitions, elements.rangePartitions);
        syncSliderPair(elements.inputSamples, elements.rangeSamples);
        elements.selectFn.addEventListener('change', runExercise1);
        elements.btnRunEx1.addEventListener('click', runExercise1);
        elements.fnPresetButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                elements.selectFn.value = btn.getAttribute('data-fn-preset');
                runExercise1();
            });
        });

        // Exercise 2 bindings
        syncSliderPair(elements.inputX, elements.rangeX);
        syncSliderPair(elements.inputQuadN, elements.rangeQuadN);
        syncSliderPair(elements.inputSeriesK, elements.rangeSeriesK);
        elements.btnRunEx2.addEventListener('click', runExercise2);
        elements.xPresetButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const val = btn.getAttribute('data-x-preset');
                elements.inputX.value = val;
                elements.rangeX.value = val;
                runExercise2();
            });
        });

        // Initial runs
        runExercise1();
        runExercise2();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

