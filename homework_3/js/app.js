(() => {
    // Dipendenze globali
    const WelfordAccumulator = window.WelfordAccumulator;
    const PenetrationSimulation = window.PenetrationSimulation;

    // Riferimenti DOM
    const elements = {
        // Tabs
        tabButtons: document.querySelectorAll('.tab-btn'),
        tabPanes: document.querySelectorAll('.tab-pane'),

        // Modale Spiegazione
        btnHelp: document.getElementById('btn-help'),
        helpModal: document.getElementById('help-modal'),
        btnCloseModal: document.getElementById('btn-close-modal'),

        // Controlli Esercizio 1 (Welford Streaming)
        inputSingleVal: document.getElementById('input-single-val'),
        btnAddVal: document.getElementById('btn-add-val'),
        btnAddRandom: document.getElementById('btn-add-random'),
        btnAddTen: document.getElementById('btn-add-ten'),
        btnTestStability: document.getElementById('btn-test-stability'),
        btnResetWelford: document.getElementById('btn-reset-welford'),
        wfCount: document.getElementById('wf-count'),
        wfMean: document.getElementById('wf-mean'),
        wfM2: document.getElementById('wf-m2'),
        wfVar: document.getElementById('wf-var'),
        streamHistoryBody: document.getElementById('stream-history-body'),
        stabilityOutput: document.getElementById('stability-output'),

        // Parametri Esercizio 2 (Simulazione)
        distRadios: document.querySelectorAll('input[name="dist-type"]'),
        inputN: document.getElementById('input-n'),
        rangeN: document.getElementById('range-n'),
        inputM: document.getElementById('input-m'),
        rangeM: document.getElementById('range-m'),
        btnRun: document.getElementById('btn-run'),
        presetButtons: document.querySelectorAll('[data-preset]'),

        // Momenti Teorici Sidebar
        theoryDistName: document.getElementById('theory-dist-name'),
        theoryMu: document.getElementById('theory-mu'),
        theorySigma2: document.getElementById('theory-sigma2'),
        theorySigma: document.getElementById('theory-sigma'),
        theoryMeanVar: document.getElementById('theory-mean-var'),
        theorySe: document.getElementById('theory-se'),

        // Barra Metriche Esercizio 2
        metricMeanMeans: document.getElementById('metric-mean-means'),
        metricSubMu: document.getElementById('metric-sub-mu'),
        metricMeanVars: document.getElementById('metric-mean-vars'),
        metricSubSigma2: document.getElementById('metric-sub-sigma2'),
        metricVarMeans: document.getElementById('metric-var-means'),
        metricSubMeanVar: document.getElementById('metric-sub-mean-var'),
        metricTime: document.getElementById('metric-time'),

        // Sezione Conclusioni Dinamiche
        dynM: document.getElementById('dyn-m'),
        dynN: document.getElementById('dyn-n'),
        dynMuVal: document.getElementById('dyn-mu-val'),
        dynMeanMeansVal: document.getElementById('dyn-mean-means-val'),
        dynMeanErr: document.getElementById('dyn-mean-err'),
        dynSigma2Val: document.getElementById('dyn-sigma2-val'),
        dynMeanVarsVal: document.getElementById('dyn-mean-vars-val'),
        dynVarErr: document.getElementById('dyn-var-err'),
        dynTheoryVarmeans: document.getElementById('dyn-theory-varmeans'),
        dynTheorySe: document.getElementById('dyn-theory-se'),
        dynEmpVarmeans: document.getElementById('dyn-emp-varmeans')
    };

    /* ------------------------------------------------------------- */
    /* GESTIONE TABS                                                 */
    /* ------------------------------------------------------------- */
    const initTabs = () => {
        elements.tabButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-tab');
                elements.tabButtons.forEach((b) => b.classList.remove('active'));
                elements.tabPanes.forEach((p) => p.classList.remove('active'));

                btn.classList.add('active');
                const activePane = document.getElementById(targetId);
                if (activePane) {
                    activePane.classList.add('active');
                    // Ridisegna i grafici Plotly per adattarli alle dimensioni corrette del layout
                    if (window.Plotly && targetId === 'pane-ex2') {
                        ['chart-mean-paths', 'chart-var-paths', 'chart-means-dist', 'chart-vars-dist'].forEach((id) => {
                            const container = document.getElementById(id);
                            if (container && container.data) {
                                try {
                                    window.Plotly.Plots.resize(container);
                                } catch (e) {
                                    // Gestione silenziosa eventuale ridimensionamento asincrono
                                }
                            }
                        });
                    }
                }
            });
        });
    };

    /* ------------------------------------------------------------- */
    /* ESERCIZIO 1: WELFORD INTERATTIVO & TEST STABILITÀ             */
    /* ------------------------------------------------------------- */
    let liveAccumulator = new WelfordAccumulator();
    const streamHistory = [];

    const updateWelfordDashboard = (lastDelta = 0, lastX = 0) => {
        elements.wfCount.textContent = liveAccumulator.count;
        elements.wfMean.textContent = liveAccumulator.mean.toFixed(4);
        elements.wfM2.textContent = liveAccumulator.M2.toFixed(4);
        elements.wfVar.textContent = liveAccumulator.sampleVariance.toFixed(4);

        if (liveAccumulator.count === 0) {
            elements.streamHistoryBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #888;">
                        Nessuna osservazione accumulata. Inserisci un valore o genera dati casuali.
                    </td>
                </tr>`;
            return;
        }

        // Aggiunge riga alla cronologia in cima alla tabella
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${liveAccumulator.count}</td>
            <td>${typeof lastX === 'number' ? lastX.toFixed(2) : lastX}</td>
            <td>${lastDelta >= 0 ? '+' : ''}${lastDelta.toFixed(4)}</td>
            <td>${liveAccumulator.mean.toFixed(4)}</td>
            <td>${liveAccumulator.M2.toFixed(4)}</td>
            <td>${liveAccumulator.sampleVariance.toFixed(4)}</td>
        `;

        if (elements.streamHistoryBody.querySelector('td[colspan]')) {
            elements.streamHistoryBody.innerHTML = '';
        }
        elements.streamHistoryBody.prepend(tr);

        // Limita a 50 righe visibili per garantire fluidità di rendering
        while (elements.streamHistoryBody.children.length > 50) {
            elements.streamHistoryBody.removeChild(elements.streamHistoryBody.lastChild);
        }
    };

    const pushWelfordValue = (val) => {
        const x = parseFloat(val);
        if (Number.isNaN(x)) return;

        const delta = x - liveAccumulator.mean;
        liveAccumulator.update(x);
        streamHistory.push(x);
        updateWelfordDashboard(delta, x);
    };

    const initExercise1 = () => {
        elements.btnAddVal.addEventListener('click', () => {
            pushWelfordValue(elements.inputSingleVal.value);
            elements.inputSingleVal.value = '';
        });

        elements.inputSingleVal.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                pushWelfordValue(elements.inputSingleVal.value);
                elements.inputSingleVal.value = '';
            }
        });

        elements.btnAddRandom.addEventListener('click', () => {
            const score = Math.floor(Math.random() * 11);
            pushWelfordValue(score);
        });

        elements.btnAddTen.addEventListener('click', () => {
            for (let i = 0; i < 10; i += 1) {
                const score = Math.floor(Math.random() * 11);
                const delta = score - liveAccumulator.mean;
                liveAccumulator.update(score);
                streamHistory.push(score);
                if (i === 9) {
                    updateWelfordDashboard(delta, score);
                }
            }
        });

        elements.btnResetWelford.addEventListener('click', () => {
            liveAccumulator.reset();
            streamHistory.length = 0;
            elements.stabilityOutput.style.display = 'none';
            updateWelfordDashboard();
        });

        elements.btnTestStability.addEventListener('click', () => {
            // Dataset patologico per floating point IEEE 754:
            // Media 10^9, scarti [4, 7, 13, 16]
            // Varianza teorica corretta = 90 / 3 = 30.00
            const offset = 1e9;
            const testValues = [offset + 4, offset + 7, offset + 13, offset + 16];
            const result = window.compareNaiveVsWelford(testValues);

            elements.stabilityOutput.style.display = 'block';
            elements.stabilityOutput.innerHTML = `
                <div style="font-weight: 700; color: #900000; margin-bottom: 6px;">
                    Test di Cancellazione Catastrofica: dataset [10<sup>9</sup>+4, 10<sup>9</sup>+7, 10<sup>9</sup>+13, 10<sup>9</sup>+16]
                </div>
                <div><b>Varianza Campionaria Esatta Teorica:</b> <code>30.000000</code></div>
                <div><b>Formula di Welford (One-pass Knuth):</b> <code style="color: #27ae60; font-weight: bold;">${result.welford.variance.toFixed(6)}</code> (Errore: 0.00)</div>
                <div><b>Formula Two-Pass (Ground truth):</b> <code>${result.twoPass.variance.toFixed(6)}</code></div>
                <div><b>Formula Naïve standard &sum;x² - (&sum;x)²/n:</b> <code style="color: #900000; font-weight: bold;">${result.naive.variance.toFixed(6)}</code> (Errore: ${result.errorNaive.toExponential(2)})</div>
                <div style="font-size: 0.82rem; color: #555; margin-top: 6px;">
                    <i>Spiegazione:</i> La formula textbook sottrae <code>${(testValues[0] * testValues[0]).toExponential(4)}</code> da un valore quasi identico, eccedendo i 53 bit di mantissa del floating point standard. L'algoritmo di Knuth mantiene la piena precisione operando direttamente sugli scarti &delta;.
                </div>
            `;
        });
    };

    /* ------------------------------------------------------------- */
    /* ESERCIZIO 2: SIMULAZIONE MULTI-HACKER                         */
    /* ------------------------------------------------------------- */
    const getSelectedDistType = () => {
        const selected = document.querySelector('input[name="dist-type"]:checked');
        return selected ? selected.value : 'uniform';
    };

    const getSimulationParams = () => {
        const mVal = parseInt(elements.inputM.value, 10);
        const nVal = parseInt(elements.inputN.value, 10);
        return {
            m: Number.isFinite(mVal) && mVal > 0 ? mVal : 150,
            n: Number.isFinite(nVal) && nVal > 0 ? nVal : 200,
            distType: getSelectedDistType()
        };
    };

    const syncSliders = () => {
        const pairs = [
            { num: elements.inputN, range: elements.rangeN },
            { num: elements.inputM, range: elements.rangeM }
        ];

        pairs.forEach(({ num, range }) => {
            range.addEventListener('input', () => {
                num.value = range.value;
                updateTheoreticalMomentsSidebar();
            });
            num.addEventListener('input', () => {
                range.value = num.value;
                updateTheoreticalMomentsSidebar();
            });
        });

        elements.distRadios.forEach((radio) => {
            radio.addEventListener('change', () => {
                elements.distRadios.forEach((r) => {
                    const card = r.closest('.radio-card');
                    if (card) card.classList.toggle('active', r.checked);
                });
                updateTheoreticalMomentsSidebar();
            });
        });
    };

    const updateTheoreticalMomentsSidebar = () => {
        const { n, distType } = getSimulationParams();
        const dist = PenetrationSimulation.getTheoreticalDistribution(distType);
        const meanVar = dist.sigma2 / n;
        const se = Math.sqrt(meanVar);

        elements.theoryDistName.textContent = dist.name;
        elements.theoryMu.textContent = dist.mu.toFixed(3);
        elements.theorySigma2.textContent = dist.sigma2.toFixed(3);
        elements.theorySigma.textContent = dist.sigma.toFixed(3);
        elements.theoryMeanVar.textContent = meanVar.toFixed(4);
        elements.theorySe.textContent = se.toFixed(4);
    };

    /* Configurazione grafica Plotly coerente con il design system */
    const createPlotlyBaseLayout = (xTitle, yTitle, showLegend = false) => ({
        autosize: true,
        font: { family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif', size: 11, color: '#333333' },
        margin: { l: 52, r: 25, t: 25, b: 45 },
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

    const plotlyConfig = {
        responsive: true,
        displayModeBar: false
    };

    /* Fallback nativo HTML5 Canvas nel caso in cui Plotly non sia caricato */
    const renderCanvasFallback = (containerId, type, data) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        let canvas = container.querySelector('canvas');
        if (!canvas) {
            container.innerHTML = '';
            canvas = document.createElement('canvas');
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.display = 'block';
            container.appendChild(canvas);
        }

        const rect = container.getBoundingClientRect();
        const width = rect.width || 500;
        const height = rect.height || 350;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        const padL = 50;
        const padR = 20;
        const padT = 30;
        const padB = 40;
        const plotW = width - padL - padR;
        const plotH = height - padT - padB;

        // Assi di base
        ctx.strokeStyle = '#dddddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padL, padT);
        ctx.lineTo(padL, padT + plotH);
        ctx.lineTo(padL + plotW, padT + plotH);
        ctx.stroke();

        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#666666';

        if (type === 'mean-paths') {
            const { timeSteps, meanTrajectories, globalMeanTrajectory, distribution } = data;
            const n = timeSteps.length - 1;
            const yMin = 0;
            const yMax = 10;

            const mapX = (t) => padL + (t / n) * plotW;
            const mapY = (val) => padT + plotH - ((val - yMin) / (yMax - yMin)) * plotH;

            // Traiettorie hacker
            ctx.strokeStyle = 'rgba(0, 68, 136, 0.12)';
            ctx.lineWidth = 1;
            meanTrajectories.forEach((path) => {
                ctx.beginPath();
                for (let t = 1; t <= n; t += 1) {
                    const x = mapX(t);
                    const y = mapY(path[t]);
                    if (t === 1) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            });

            // Retta Teorica mu
            ctx.strokeStyle = '#900000';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(mapX(1), mapY(distribution.mu));
            ctx.lineTo(mapX(n), mapY(distribution.mu));
            ctx.stroke();

            // Media globale
            ctx.strokeStyle = '#d35400';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            for (let t = 1; t <= n; t += 1) {
                const x = mapX(t);
                const y = mapY(globalMeanTrajectory[t]);
                if (t === 1) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (type === 'var-paths') {
            const { timeSteps, varianceTrajectories, globalVarianceTrajectory, distribution } = data;
            const n = timeSteps.length - 1;
            const yMin = 0;
            const yMax = distribution.sigma2 * 2;

            const mapX = (t) => padL + (t / n) * plotW;
            const mapY = (val) => padT + plotH - Math.max(0, Math.min(plotH, ((val - yMin) / (yMax - yMin)) * plotH));

            ctx.strokeStyle = 'rgba(0, 68, 136, 0.12)';
            ctx.lineWidth = 1;
            varianceTrajectories.forEach((path) => {
                ctx.beginPath();
                for (let t = 2; t <= n; t += 1) {
                    const x = mapX(t);
                    const y = mapY(path[t]);
                    if (t === 2) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            });

            // Varianza Teorica
            ctx.strokeStyle = '#900000';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(mapX(2), mapY(distribution.sigma2));
            ctx.lineTo(mapX(n), mapY(distribution.sigma2));
            ctx.stroke();

            // Media empirica varianze
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            for (let t = 2; t <= n; t += 1) {
                const x = mapX(t);
                const y = mapY(globalVarianceTrajectory[t]);
                if (t === 2) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (type === 'means-dist') {
            const { hackerFinalMeans, distribution, params } = data;
            const nBins = 25;
            const minV = Math.min(...hackerFinalMeans);
            const maxV = Math.max(...hackerFinalMeans);
            const span = (maxV - minV) || 1;
            const counts = new Array(nBins).fill(0);

            hackerFinalMeans.forEach((val) => {
                const idx = Math.min(nBins - 1, Math.floor(((val - minV) / span) * nBins));
                counts[idx] += 1;
            });
            const maxCount = Math.max(...counts);

            const binW = plotW / nBins;
            ctx.fillStyle = 'rgba(0, 68, 136, 0.65)';
            ctx.strokeStyle = '#004488';
            for (let b = 0; b < nBins; b += 1) {
                const h = (counts[b] / maxCount) * (plotH * 0.85);
                const x = padL + b * binW;
                const y = padT + plotH - h;
                ctx.fillRect(x, y, binW - 1, h);
                ctx.strokeRect(x, y, binW - 1, h);
            }
        } else if (type === 'vars-dist') {
            const { hackerFinalVariances, distribution } = data;
            const nBins = 25;
            const minV = Math.min(...hackerFinalVariances);
            const maxV = Math.max(...hackerFinalVariances);
            const span = (maxV - minV) || 1;
            const counts = new Array(nBins).fill(0);

            hackerFinalVariances.forEach((val) => {
                const idx = Math.min(nBins - 1, Math.floor(((val - minV) / span) * nBins));
                counts[idx] += 1;
            });
            const maxCount = Math.max(...counts);

            const binW = plotW / nBins;
            ctx.fillStyle = 'rgba(39, 174, 96, 0.65)';
            ctx.strokeStyle = '#27ae60';
            for (let b = 0; b < nBins; b += 1) {
                const h = (counts[b] / maxCount) * (plotH * 0.85);
                const x = padL + b * binW;
                const y = padT + plotH - h;
                ctx.fillRect(x, y, binW - 1, h);
                ctx.strokeRect(x, y, binW - 1, h);
            }
        }
    };

    /* Rendering Grafico 1: Traiettorie Medie Cumulative */
    const renderMeanPathsChart = (data) => {
        if (!window.Plotly) {
            renderCanvasFallback('chart-mean-paths', 'mean-paths', data);
            return;
        }

        const { timeSteps, meanTrajectories, globalMeanTrajectory, distribution } = data;
        const traces = [];

        // Tracce individuali hacker (blu semi-trasparente)
        for (let i = 0; i < meanTrajectories.length; i += 1) {
            traces.push({
                x: timeSteps.slice(1),
                y: Array.from(meanTrajectories[i].subarray(1)),
                type: 'scatter',
                mode: 'lines',
                line: { color: 'rgba(0, 68, 136, 0.12)', width: 1 },
                hoverinfo: 'none',
                showlegend: false
            });
        }

        // Linea Media Teorica (Rossa Sapienza)
        traces.push({
            name: `Media Teorica µ = ${distribution.mu}`,
            x: [1, timeSteps[timeSteps.length - 1]],
            y: [distribution.mu, distribution.mu],
            type: 'scatter',
            mode: 'lines',
            line: { color: '#900000', width: 2.5 }
        });

        // Linea Media Empirica Globale (Arancione tratteggiata)
        traces.push({
            name: 'Media Globale Hacker',
            x: timeSteps.slice(1),
            y: Array.from(globalMeanTrajectory.subarray(1)),
            type: 'scatter',
            mode: 'lines',
            line: { color: '#d35400', width: 2, dash: 'dash' }
        });

        const layout = createPlotlyBaseLayout('Sistemi Attaccati (t)', 'Media Cumulata X̄(t)', true);
        layout.legend = { orientation: 'h', x: 0.05, y: 1.14, font: { size: 10 } };

        window.Plotly.react('chart-mean-paths', traces, layout, plotlyConfig);
    };

    /* Rendering Grafico 2: Traiettorie Varianze Cumulative (Welford) */
    const renderVariancePathsChart = (data) => {
        if (!window.Plotly) {
            renderCanvasFallback('chart-var-paths', 'var-paths', data);
            return;
        }

        const { timeSteps, varianceTrajectories, globalVarianceTrajectory, distribution } = data;
        const traces = [];

        for (let i = 0; i < varianceTrajectories.length; i += 1) {
            // La varianza campionaria è definita per t >= 2
            traces.push({
                x: timeSteps.slice(2),
                y: Array.from(varianceTrajectories[i].subarray(2)),
                type: 'scatter',
                mode: 'lines',
                line: { color: 'rgba(0, 68, 136, 0.12)', width: 1 },
                hoverinfo: 'none',
                showlegend: false
            });
        }

        // Varianza Teorica (Rossa)
        traces.push({
            name: `Varianza Teorica σ² = ${distribution.sigma2}`,
            x: [2, timeSteps[timeSteps.length - 1]],
            y: [distribution.sigma2, distribution.sigma2],
            type: 'scatter',
            mode: 'lines',
            line: { color: '#900000', width: 2.5 }
        });

        // Media Empirica Globale delle Varianze
        traces.push({
            name: 'Media Varianze Welford',
            x: timeSteps.slice(2),
            y: Array.from(globalVarianceTrajectory.subarray(2)),
            type: 'scatter',
            mode: 'lines',
            line: { color: '#27ae60', width: 2, dash: 'dash' }
        });

        const layout = createPlotlyBaseLayout('Sistemi Attaccati (t)', 'Varianza Campionaria S²(t)', true);
        layout.legend = { orientation: 'h', x: 0.05, y: 1.14, font: { size: 10 } };

        window.Plotly.react('chart-var-paths', traces, layout, plotlyConfig);
    };

    /* Rendering Grafico 3: Istogramma Medie Campionarie Finali + Curva Normale TLC */
    const renderMeansDistributionChart = (data) => {
        if (!window.Plotly) {
            renderCanvasFallback('chart-means-dist', 'means-dist', data);
            return;
        }

        const { hackerFinalMeans, distribution, params } = data;
        const mu = distribution.mu;
        const se = Math.sqrt(distribution.sigma2 / params.n);

        const histTrace = {
            name: 'Frequenza Medie Hacker',
            x: Array.from(hackerFinalMeans),
            type: 'histogram',
            histnorm: 'probability density',
            marker: { color: 'rgba(0, 68, 136, 0.65)', line: { color: '#004488', width: 1 } },
            nbinsx: 35
        };

        // Sovrapposizione Curva Normale Teorica N(mu, sigma^2/n)
        const minX = Math.min(mu - 4 * se, ...hackerFinalMeans);
        const maxX = Math.max(mu + 4 * se, ...hackerFinalMeans);
        const normalCurve = PenetrationSimulation.generateNormalPdf(mu, se, minX, maxX, 150);

        const curveTrace = {
            name: 'Densità Normale TLC N(µ, σ²/n)',
            x: normalCurve.x,
            y: normalCurve.y,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#900000', width: 2.5 }
        };

        const layout = createPlotlyBaseLayout('Media Campionaria Finale X̄', 'Densità di Probabilità', true);
        layout.legend = { orientation: 'h', x: 0.05, y: 1.14, font: { size: 10 } };

        window.Plotly.react('chart-means-dist', [histTrace, curveTrace], layout, plotlyConfig);
    };

    /* Rendering Grafico 4: Istogramma Varianze Campionarie Finali (Unbiasedness) */
    const renderVariancesDistributionChart = (data) => {
        if (!window.Plotly) {
            renderCanvasFallback('chart-vars-dist', 'vars-dist', data);
            return;
        }

        const { hackerFinalVariances, distribution } = data;

        const histTrace = {
            name: 'Frequenza Varianze S²',
            x: Array.from(hackerFinalVariances),
            type: 'histogram',
            histnorm: 'probability density',
            marker: { color: 'rgba(39, 174, 96, 0.65)', line: { color: '#27ae60', width: 1 } },
            nbinsx: 35
        };

        const layout = createPlotlyBaseLayout('Varianza Campionaria S²', 'Densità di Probabilità', false);
        // Linea verticale teorica sigma^2
        layout.shapes = [{
            type: 'line',
            x0: distribution.sigma2,
            x1: distribution.sigma2,
            y0: 0,
            y1: 1,
            yref: 'paper',
            line: { color: '#900000', width: 2.5, dash: 'dash' }
        }];

        layout.annotations = [{
            x: distribution.sigma2,
            y: 0.95,
            yref: 'paper',
            text: `σ² = ${distribution.sigma2}`,
            showarrow: true,
            arrowhead: 2,
            ax: 35,
            ay: -25,
            font: { size: 11, color: '#900000', family: 'sans-serif' }
        }];

        window.Plotly.react('chart-vars-dist', [histTrace], layout, plotlyConfig);
    };

    /* Aggiornamento Testuale Dinamico delle Conclusioni e Dashboard */
    const updateConclusionsAndMetrics = (simResult) => {
        const { params, distribution, summary, executionTimeMs } = simResult;

        // Metric Cards Superiori
        elements.metricMeanMeans.textContent = summary.meanOfMeans.toFixed(3);
        elements.metricSubMu.textContent = `Atteso µ = ${distribution.mu.toFixed(3)} (Δ: ${Math.abs(summary.meanDifference).toFixed(4)})`;

        elements.metricMeanVars.textContent = summary.meanOfVariances.toFixed(3);
        elements.metricSubSigma2.textContent = `Atteso σ² = ${distribution.sigma2.toFixed(3)} (Δ: ${Math.abs(summary.varianceDifference).toFixed(4)})`;

        elements.metricVarMeans.textContent = summary.varianceOfMeans.toFixed(4);
        elements.metricSubMeanVar.textContent = `Teorico σ²/n = ${summary.theoreticalMeanVariance.toFixed(4)}`;

        elements.metricTime.textContent = `${executionTimeMs.toFixed(1)} ms`;

        // Testo Dinamico Conclusioni
        elements.dynM.textContent = params.m;
        elements.dynN.textContent = params.n;
        elements.dynMuVal.textContent = distribution.mu.toFixed(1);
        elements.dynMeanMeansVal.textContent = summary.meanOfMeans.toFixed(4);
        elements.dynMeanErr.textContent = Math.abs(summary.meanDifference).toFixed(4);

        elements.dynSigma2Val.textContent = distribution.sigma2.toFixed(1);
        elements.dynMeanVarsVal.textContent = summary.meanOfVariances.toFixed(4);
        elements.dynVarErr.textContent = Math.abs(summary.varianceDifference).toFixed(4);

        elements.dynTheoryVarmeans.textContent = summary.theoreticalMeanVariance.toFixed(4);
        elements.dynTheorySe.textContent = summary.theoreticalStandardError.toFixed(4);
        elements.dynEmpVarmeans.textContent = summary.varianceOfMeans.toFixed(4);
    };

    /* Esecuzione Principale della Simulazione */
    const runSimulation = () => {
        elements.btnRun.disabled = true;
        elements.btnRun.textContent = 'Calcolo in corso...';

        setTimeout(() => {
            try {
                const params = getSimulationParams();
                const result = PenetrationSimulation.run(params);

                updateConclusionsAndMetrics(result);
                renderMeanPathsChart(result);
                renderVariancePathsChart(result);
                renderMeansDistributionChart(result);
                renderVariancesDistributionChart(result);
            } catch (err) {
                console.error("Errore durante l'esecuzione della simulazione:", err);
            } finally {
                elements.btnRun.disabled = false;
                elements.btnRun.textContent = 'Esegui Simulazione';
            }
        }, 30);
    };

    /* Gestione Preset Rapidi */
    const initPresets = () => {
        elements.presetButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const preset = btn.getAttribute('data-preset');
                if (preset === 'small-n') {
                    elements.inputN.value = 20;
                    elements.rangeN.value = 20;
                    elements.inputM.value = 250;
                    elements.rangeM.value = 250;
                } else if (preset === 'medium-n') {
                    elements.inputN.value = 200;
                    elements.rangeN.value = 200;
                    elements.inputM.value = 150;
                    elements.rangeM.value = 150;
                } else if (preset === 'large-n') {
                    elements.inputN.value = 800;
                    elements.rangeN.value = 800;
                    elements.inputM.value = 300;
                    elements.rangeM.value = 300;
                } else if (preset === 'massive') {
                    elements.inputN.value = 1500;
                    elements.rangeN.value = 1500;
                    elements.inputM.value = 500;
                    elements.rangeM.value = 500;
                }
                updateTheoreticalMomentsSidebar();
                runSimulation();
            });
        });
    };

    /* Gestione Modale Guida */
    const initModal = () => {
        elements.btnHelp.addEventListener('click', () => {
            elements.helpModal.classList.add('open');
        });

        elements.btnCloseModal.addEventListener('click', () => {
            elements.helpModal.classList.remove('open');
        });

        elements.helpModal.addEventListener('click', (e) => {
            if (e.target === elements.helpModal) {
                elements.helpModal.classList.remove('open');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.helpModal.classList.contains('open')) {
                elements.helpModal.classList.remove('open');
            }
        });
    };

    /* ------------------------------------------------------------- */
    /* AVVIO APPLICAZIONE                                            */
    /* ------------------------------------------------------------- */
    const init = () => {
        initTabs();
        initExercise1();
        syncSliders();
        initPresets();
        initModal();
        updateTheoreticalMomentsSidebar();

        // Listener per il pulsante Esegui Simulazione
        if (elements.btnRun) {
            elements.btnRun.addEventListener('click', runSimulation);
        }

        // Supporto per il tasto Invio negli input numerici
        [elements.inputN, elements.inputM].forEach((input) => {
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        runSimulation();
                    }
                });
            }
        });

        // Esegui la simulazione iniziale automatica per visualizzare subito i risultati
        runSimulation();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
