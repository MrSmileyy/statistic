(() => {
    const Analyzer = window.IndependenceAnalyzer;

    const elements = {
        selectDataset: document.getElementById('select-dataset'),
        alphaRadios: document.querySelectorAll('input[name="alpha"]'),
        textareaCsv: document.getElementById('textarea-csv'),
        btnAnalyze: document.getElementById('btn-analyze'),
        btnGenIndep: document.getElementById('btn-gen-indep'),
        btnGenDep: document.getElementById('btn-gen-dep'),

        dsDescription: document.getElementById('ds-description'),
        diagN: document.getElementById('diag-n'),
        diagDims: document.getElementById('diag-dims'),
        diagDf: document.getElementById('diag-df'),
        diagCrit: document.getElementById('diag-crit'),
        diagLowCells: document.getElementById('diag-low-cells'),

        decisionBanner: document.getElementById('decision-banner'),
        decisionText: document.getElementById('decision-text'),
        decisionBadge: document.getElementById('decision-badge'),

        metricChi2: document.getElementById('metric-chi2'),
        metricChi2Sub: document.getElementById('metric-chi2-sub'),
        metricPval: document.getElementById('metric-pval'),
        metricPvalSub: document.getElementById('metric-pval-sub'),
        metricDf: document.getElementById('metric-df'),
        metricCramers: document.getElementById('metric-cramers'),
        metricCramersSub: document.getElementById('metric-cramers-sub'),

        viewPills: document.querySelectorAll('.pill-btn'),
        contingencyTable: document.getElementById('contingency-table'),

        badgeConclusionTest: document.getElementById('badge-conclusion-test'),
        textInterpretation: document.getElementById('text-interpretation'),
        textCausality: document.getElementById('text-causality'),

        btnHelp: document.getElementById('btn-help'),
        helpModal: document.getElementById('help-modal'),
        btnCloseModal: document.getElementById('btn-close-modal')
    };

    let currentView = 'observed';
    let lastAnalysis = null;
    let currentMeta = {
        id: 'cyber_incidents',
        xName: 'Attack Vector (X)',
        yName: 'Incident Severity (F)',
        description: '',
        causalityNote: ''
    };

    const plotlyConfig = { responsive: true, displayModeBar: false };

    const createPlotlyLayout = (xTitle, yTitle, showLegend = false) => ({
        autosize: true,
        font: { family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif', size: 11, color: '#333333' },
        margin: { l: 55, r: 22, t: 28, b: 50 },
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

    const getSelectedAlpha = () => {
        const checked = document.querySelector('input[name="alpha"]:checked');
        return checked ? parseFloat(checked.value) : 0.05;
    };

    const formatPValue = (p) => {
        if (p < 0.0001) return p.toExponential(3);
        return p.toFixed(6);
    };

    const interpretCramersV = (v) => {
        if (v < 0.10) return 'Negligible association';
        if (v < 0.25) return 'Weak-to-moderate association';
        if (v < 0.45) return 'Moderate-to-strong association';
        return 'Strong association';
    };

    const loadPresetDataset = (key) => {
        const datasets = Analyzer.getDatasets();
        const ds = datasets[key];
        if (!ds) return;

        currentMeta = {
            id: ds.id,
            xName: ds.xName,
            yName: ds.yName,
            description: ds.description,
            causalityNote: ds.causalityNote
        };

        elements.textareaCsv.value = Analyzer.recordsToCsv(ds.records, ds.xName, ds.yName);
        runAnalysis();
    };

    /* ------------------------------------------------------------- */
    /* CONTINGENCY TABLE RENDERING                                   */
    /* ------------------------------------------------------------- */
    const renderContingencyTable = (res) => {
        const { xLabels, yLabels, observed, expected, rowTotals, colTotals, rowMarginalsRel, colMarginalsRel, condYGivenX, condXGivenY, residuals, N } = res;

        let html = '<thead><tr>';
        html += `<th>${currentMeta.xName} \\ ${currentMeta.yName}</th>`;
        yLabels.forEach((y) => {
            html += `<th>${y}</th>`;
        });
        html += `<th class="marginal-cell">Row Marginal</th>`;
        html += '</tr></thead><tbody>';

        for (let i = 0; i < xLabels.length; i += 1) {
            html += `<tr><td>${xLabels[i]}</td>`;
            for (let j = 0; j < yLabels.length; j += 1) {
                let cellText = '';
                let style = '';
                if (currentView === 'observed') {
                    const pct = ((observed[i][j] / N) * 100).toFixed(1);
                    cellText = `${observed[i][j]} <span style="color:#888; font-size:0.75em;">(${pct}%)</span>`;
                } else if (currentView === 'expected') {
                    cellText = expected[i][j].toFixed(2);
                } else if (currentView === 'cond-y') {
                    cellText = `${(condYGivenX[i][j] * 100).toFixed(1)}%`;
                } else if (currentView === 'cond-x') {
                    cellText = `${(condXGivenY[i][j] * 100).toFixed(1)}%`;
                } else if (currentView === 'residuals') {
                    const rVal = residuals[i][j];
                    const color = Math.abs(rVal) > 2 ? (rVal > 0 ? '#900000' : '#004488') : '#333333';
                    const weight = Math.abs(rVal) > 2 ? '700' : '400';
                    style = `style="color:${color}; font-weight:${weight};"`;
                    cellText = `${rVal >= 0 ? '+' : ''}${rVal.toFixed(2)}`;
                }
                html += `<td ${style}>${cellText}</td>`;
            }

            // Row Marginal
            if (currentView === 'cond-y') {
                html += `<td class="marginal-cell">100.0% (n=${rowTotals[i]})</td>`;
            } else {
                html += `<td class="marginal-cell">${rowTotals[i]} (${(rowMarginalsRel[i] * 100).toFixed(1)}%)</td>`;
            }
            html += '</tr>';
        }

        // Column Marginals row
        html += `<tr><td class="marginal-cell">Col Marginal</td>`;
        for (let j = 0; j < yLabels.length; j += 1) {
            if (currentView === 'cond-x') {
                html += `<td class="marginal-cell">100.0% (n=${colTotals[j]})</td>`;
            } else {
                html += `<td class="marginal-cell">${colTotals[j]} (${(colMarginalsRel[j] * 100).toFixed(1)}%)</td>`;
            }
        }
        html += `<td class="grand-total-cell">N = ${N} (100%)</td></tr></tbody>`;

        elements.contingencyTable.innerHTML = html;
    };

    /* ------------------------------------------------------------- */
    /* PLOTLY CHARTS                                                 */
    /* ------------------------------------------------------------- */
    const renderObsVsExpChart = (res) => {
        if (!window.Plotly) return;
        const labels = [];
        const obsVals = [];
        const expVals = [];

        for (let i = 0; i < res.r; i += 1) {
            for (let j = 0; j < res.c; j += 1) {
                labels.push(`${res.xLabels[i]} | ${res.yLabels[j]}`);
                obsVals.push(res.observed[i][j]);
                expVals.push(res.expected[i][j]);
            }
        }

        const traceObs = {
            name: 'Observed O_ij',
            x: labels,
            y: obsVals,
            type: 'bar',
            marker: { color: 'rgba(0, 68, 136, 0.78)', line: { color: '#004488', width: 1 } }
        };

        const traceExp = {
            name: 'Expected E_ij (H₀)',
            x: labels,
            y: expVals,
            type: 'bar',
            marker: { color: 'rgba(144, 0, 0, 0.65)', line: { color: '#900000', width: 1 } }
        };

        const layout = createPlotlyLayout('Cell (X | F)', 'Frequency Count', true);
        layout.barmode = 'group';
        layout.xaxis.tickangle = -25;
        layout.margin.b = 75;
        layout.legend = { orientation: 'h', x: 0.02, y: 1.14, font: { size: 10 } };
        window.Plotly.react('chart-obs-exp', [traceObs, traceExp], layout, plotlyConfig);
    };

    const renderConditionalProfilesChart = (res) => {
        if (!window.Plotly) return;
        const palette = ['#004488', '#27ae60', '#d35400', '#900000', '#6c5ce7', '#00cec9'];
        const traces = res.yLabels.map((yLbl, j) => ({
            name: yLbl,
            x: res.xLabels,
            y: res.xLabels.map((_, i) => +(res.condYGivenX[i][j] * 100).toFixed(2)),
            type: 'bar',
            marker: { color: palette[j % palette.length] }
        }));

        const layout = createPlotlyLayout(currentMeta.xName, 'Conditional Share P(F | X) %', true);
        layout.barmode = 'stack';
        layout.yaxis.range = [0, 100];
        layout.legend = { orientation: 'h', x: 0.02, y: 1.14, font: { size: 10 } };
        window.Plotly.react('chart-cond-profiles', traces, layout, plotlyConfig);
    };

    const renderResidualsHeatmap = (res) => {
        if (!window.Plotly) return;
        const trace = {
            z: res.residuals,
            x: res.yLabels,
            y: res.xLabels,
            type: 'heatmap',
            colorscale: [
                [0, '#004488'],
                [0.5, '#ffffff'],
                [1, '#900000']
            ],
            zmid: 0,
            hovertemplate: '%{y} | %{x}<br>Residual: %{z:.2f}<extra></extra>'
        };

        const layout = createPlotlyLayout(currentMeta.yName, currentMeta.xName, false);
        layout.yaxis.autorange = 'reversed';
        window.Plotly.react('chart-residuals', [trace], layout, plotlyConfig);
    };

    const renderChi2DistChart = (res) => {
        if (!window.Plotly) return;
        const maxX = Math.max(res.criticalValue * 1.8, res.chiSquare * 1.2, res.df * 2.5 + 8);
        const pts = 200;
        const xArr = [];
        const yArr = [];
        const tailX = [];
        const tailY = [];

        for (let i = 1; i <= pts; i += 1) {
            const x = (i / pts) * maxX;
            const y = Analyzer.chiSquarePdf(x, res.df);
            xArr.push(x);
            yArr.push(y);
            if (x >= res.criticalValue) {
                tailX.push(x);
                tailY.push(y);
            }
        }

        const pdfTrace = {
            name: `χ²(df=${res.df}) PDF`,
            x: xArr,
            y: yArr,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#004488', width: 2.2 }
        };

        const rejectTrace = {
            name: `Rejection Region (α=${res.alpha})`,
            x: tailX,
            y: tailY,
            type: 'scatter',
            mode: 'none',
            fill: 'tozeroy',
            fillcolor: 'rgba(144, 0, 0, 0.25)'
        };

        const layout = createPlotlyLayout('χ² Statistic', 'Probability Density', true);
        layout.legend = { orientation: 'h', x: 0.02, y: 1.14, font: { size: 10 } };
        layout.shapes = [
            {
                type: 'line',
                x0: res.criticalValue,
                x1: res.criticalValue,
                y0: 0,
                y1: 1,
                yref: 'paper',
                line: { color: '#d35400', width: 2, dash: 'dot' }
            },
            {
                type: 'line',
                x0: res.chiSquare,
                x1: res.chiSquare,
                y0: 0,
                y1: 1,
                yref: 'paper',
                line: { color: '#900000', width: 2.5 }
            }
        ];
        layout.annotations = [
            {
                x: res.criticalValue,
                y: 0.85,
                yref: 'paper',
                text: `Crit: ${res.criticalValue.toFixed(2)}`,
                showarrow: true,
                ax: 35,
                ay: -15,
                font: { size: 10, color: '#d35400' }
            },
            {
                x: res.chiSquare,
                y: 0.65,
                yref: 'paper',
                text: `Obs χ²: ${res.chiSquare.toFixed(2)}`,
                showarrow: true,
                ax: -40,
                ay: -20,
                font: { size: 10, color: '#900000' }
            }
        ];

        window.Plotly.react('chart-chi2-dist', [rejectTrace, pdfTrace], layout, plotlyConfig);
    };

    /* ------------------------------------------------------------- */
    /* UI & DYNAMIC CONCLUSIONS                                      */
    /* ------------------------------------------------------------- */
    const updateDashboard = (res) => {
        elements.dsDescription.textContent = currentMeta.description;
        elements.diagN.textContent = res.N;
        elements.diagDims.textContent = `${res.r} × ${res.c}`;
        elements.diagDf.textContent = res.df;
        elements.diagCrit.textContent = res.criticalValue.toFixed(4);
        elements.diagLowCells.textContent = res.lowExpectedCells === 0
            ? '0 (Cochran OK)'
            : `${res.lowExpectedCells} (Caution)`;

        elements.metricChi2.textContent = res.chiSquare.toFixed(4);
        elements.metricChi2Sub.textContent = `Critical (${res.alpha}) = ${res.criticalValue.toFixed(3)}`;
        elements.metricPval.textContent = formatPValue(res.pValue);
        elements.metricPvalSub.textContent = res.isDependent ? `p < α (${res.alpha})` : `p ≥ α (${res.alpha})`;
        elements.metricDf.textContent = res.df;
        elements.metricCramers.textContent = res.cramersV.toFixed(4);
        elements.metricCramersSub.textContent = interpretCramersV(res.cramersV);

        if (res.isDependent) {
            elements.decisionBanner.className = 'decision-banner decision-dependent';
            elements.decisionText.innerHTML = `<strong>Conclusion: Reject H<sub>0</sub> (Statistically Dependent)</strong> &mdash; Conditional distributions P(F | X) differ significantly from the marginal P(F).`;
            elements.decisionBadge.textContent = `χ² = ${res.chiSquare.toFixed(2)}, p = ${formatPValue(res.pValue)}`;
        } else {
            elements.decisionBanner.className = 'decision-banner decision-independent';
            elements.decisionText.innerHTML = `<strong>Conclusion: Fail to Reject H<sub>0</sub> (Consistent with Independence)</strong> &mdash; Observed frequencies align closely with E<sub>ij</sub> = (R<sub>i</sub> &middot; C<sub>j</sub>) / N.`;
            elements.decisionBadge.textContent = `χ² = ${res.chiSquare.toFixed(2)}, p = ${formatPValue(res.pValue)}`;
        }

        elements.badgeConclusionTest.textContent = res.isDependent ? 'Reject H₀ (Dependent)' : 'Retain H₀ (Independent)';

        elements.textInterpretation.innerHTML = `
            With <b>N = ${res.N}</b> bivariate observations across a <b>${res.r} &times; ${res.c}</b> contingency table
            (<b>df = ${res.df}</b>), Pearson's Chi-square statistic is
            <span class="highlight-val">&chi;&sup2; = ${res.chiSquare.toFixed(4)}</span>
            compared to the critical threshold &chi;&sup2;<sub>${res.alpha}, ${res.df}</sub> = ${res.criticalValue.toFixed(4)},
            yielding an exact upper-tail p-value of <span class="highlight-val">p = ${formatPValue(res.pValue)}</span>.
            ${res.isDependent
                ? `Since <i>p &lt; ${res.alpha}</i>, we reject the null hypothesis of independence: the two variables exhibit <b>statistically significant dependence</b> with Cram&eacute;r's V = <span class="highlight-val">${res.cramersV.toFixed(4)}</span> (${interpretCramersV(res.cramersV).toLowerCase()}).`
                : `Since <i>p &ge; ${res.alpha}</i>, we fail to reject <i>H<sub>0</sub></i>: there is no statistically significant evidence against independence (Cram&eacute;r's V = <span class="highlight-val">${res.cramersV.toFixed(4)}</span>).`}
        `;

        const customCausality = currentMeta.causalityNote
            ? currentMeta.causalityNote
            : 'Even when &chi;&sup2; strongly rejects independence, a contingency test only detects symmetric statistical association in observational data. It cannot rule out confounding variables, reverse causality, or selection bias without controlled randomization or causal modeling.';

        elements.textCausality.innerHTML = `
            <b>Association &ne; Causation:</b> ${customCausality}
            In general, establishing causality requires temporal precedence, elimination of lurking confounders, and ideally randomized controlled experimentation rather than a marginal contingency table alone.
        `;
    };

    const runAnalysis = () => {
        try {
            const parsed = Analyzer.parseCsvRecords(elements.textareaCsv.value);
            if (elements.selectDataset.value === 'custom') {
                currentMeta.xName = parsed.xName;
                currentMeta.yName = parsed.yName;
                currentMeta.description = `Custom bivariate dataset (${parsed.records.length} observations).`;
                currentMeta.causalityNote = '';
            }

            const alpha = getSelectedAlpha();
            lastAnalysis = Analyzer.analyze(parsed.records, alpha);

            updateDashboard(lastAnalysis);
            renderContingencyTable(lastAnalysis);
            renderObsVsExpChart(lastAnalysis);
            renderConditionalProfilesChart(lastAnalysis);
            renderResidualsHeatmap(lastAnalysis);
            renderChi2DistChart(lastAnalysis);
        } catch (err) {
            elements.decisionBanner.className = 'decision-banner decision-dependent';
            elements.decisionText.textContent = `Dataset Error: ${err.message}`;
            elements.decisionBadge.textContent = '';
        }
    };

    /* ------------------------------------------------------------- */
    /* EVENT LISTENERS                                               */
    /* ------------------------------------------------------------- */
    const init = () => {
        elements.selectDataset.addEventListener('change', () => {
            const val = elements.selectDataset.value;
            if (val !== 'custom') {
                loadPresetDataset(val);
            }
        });

        elements.textareaCsv.addEventListener('input', () => {
            elements.selectDataset.value = 'custom';
        });

        elements.alphaRadios.forEach((radio) => {
            radio.addEventListener('change', () => {
                elements.alphaRadios.forEach((r) => {
                    const card = r.closest('.radio-card');
                    if (card) card.classList.toggle('active', r.checked);
                });
                runAnalysis();
            });
        });

        elements.btnAnalyze.addEventListener('click', runAnalysis);

        elements.btnGenIndep.addEventListener('click', () => {
            const recs = Analyzer.generateSyntheticRecords('independent', 240);
            elements.selectDataset.value = 'custom';
            currentMeta = {
                id: 'synthetic_indep',
                xName: 'Group (X)',
                yName: 'Outcome (F)',
                description: '240 randomly generated independent bivariate observations.',
                causalityNote: 'Synthetic independent data: conditional profiles P(F|X) should closely match marginal P(F), yielding p ≥ α.'
            };
            elements.textareaCsv.value = Analyzer.recordsToCsv(recs, 'Group (X)', 'Outcome (F)');
            runAnalysis();
        });

        elements.btnGenDep.addEventListener('click', () => {
            const recs = Analyzer.generateSyntheticRecords('dependent', 240);
            elements.selectDataset.value = 'custom';
            currentMeta = {
                id: 'synthetic_dep',
                xName: 'Group (X)',
                yName: 'Outcome (F)',
                description: '240 randomly generated dependent bivariate observations.',
                causalityNote: 'Synthetic dependent data: conditional probabilities vary across groups, producing a significant Chi-square statistic.'
            };
            elements.textareaCsv.value = Analyzer.recordsToCsv(recs, 'Group (X)', 'Outcome (F)');
            runAnalysis();
        });

        elements.viewPills.forEach((pill) => {
            pill.addEventListener('click', () => {
                elements.viewPills.forEach((p) => p.classList.remove('active'));
                pill.classList.add('active');
                currentView = pill.getAttribute('data-view');
                if (lastAnalysis) {
                    renderContingencyTable(lastAnalysis);
                }
            });
        });

        // Modal
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

        // Initial load
        loadPresetDataset('cyber_incidents');
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

