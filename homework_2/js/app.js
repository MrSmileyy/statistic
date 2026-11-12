(() => {
    const StochasticSimulator = window.StochasticSimulator;

    const elements = {
        modelRadios: document.querySelectorAll('input[name="model"]'),
        inputN: document.getElementById('input-n'),
        rangeN: document.getElementById('range-n'),
        inputM: document.getElementById('input-m'),
        rangeM: document.getElementById('range-m'),
        inputP: document.getElementById('input-p'),
        rangeP: document.getElementById('range-p'),
        btnRun: document.getElementById('btn-run'),
        btnHelp: document.getElementById('btn-help'),
        helpModal: document.getElementById('help-modal'),
        btnCloseModal: document.getElementById('btn-close-modal'),
        presetButtons: document.querySelectorAll('[data-preset]'),
        theoryMeanStep: document.getElementById('theory-mean-step'),
        theoryVarStep: document.getElementById('theory-var-step'),
        theoryExpectedSn: document.getElementById('theory-expected-sn'),
        theoryStdSn: document.getElementById('theory-std-sn'),
        metricExpectedSn: document.getElementById('metric-expected-sn'),
        metricSampleSn: document.getElementById('metric-sample-sn'),
        metricSampleAvg: document.getElementById('metric-sample-avg'),
        metricExecTime: document.getElementById('metric-exec-time')
    };

    const getSelectedModel = () => {
        const selected = document.querySelector('input[name="model"]:checked');
        return selected ? selected.value : 'bernoulli';
    };

    const getParams = () => ({
        model: getSelectedModel(),
        n: parseInt(elements.inputN.value, 10),
        m: parseInt(elements.inputM.value, 10),
        p: parseFloat(elements.inputP.value)
    });

    const syncInputPair = (numberInput, rangeInput) => {
        rangeInput.addEventListener('input', () => {
            numberInput.value = rangeInput.value;
            updateTheoreticalCards();
        });
        numberInput.addEventListener('input', () => {
            rangeInput.value = numberInput.value;
            updateTheoreticalCards();
        });
    };

    const updateTheoreticalCards = () => {
        const { model, n, p } = getParams();
        const moments = StochasticSimulator.getTheoreticalMoments(model, p, n);

        elements.theoryMeanStep.textContent = moments.meanStep.toFixed(3);
        elements.theoryVarStep.textContent = moments.varianceStep.toFixed(3);
        elements.theoryExpectedSn.textContent = moments.expectedFinal.toFixed(2);
        elements.theoryStdSn.textContent = moments.stdDevFinal.toFixed(2);
    };

    const updateRadioActiveState = () => {
        elements.modelRadios.forEach((radio) => {
            const card = radio.closest('.radio-card');
            if (card) {
                card.classList.toggle('active', radio.checked);
            }
        });
        updateTheoreticalCards();
    };

    const commonPlotlyConfig = {
        responsive: true,
        displayModeBar: false
    };

    const createPlotlyBaseLayout = (xTitle, yTitle) => ({
        autosize: true,
        font: { family: 'Helvetica Neue, Arial, sans-serif', size: 11, color: '#333333' },
        margin: { l: 50, r: 25, t: 20, b: 42 },
        paper_bgcolor: '#ffffff',
        plot_bgcolor: '#ffffff',
        xaxis: {
            title: { text: xTitle, font: { size: 11, color: '#444' } },
            gridcolor: '#eeeeee',
            zerolinecolor: '#cccccc',
            showline: true,
            linecolor: '#dddddd'
        },
        yaxis: {
            title: { text: yTitle, font: { size: 11, color: '#444' } },
            gridcolor: '#eeeeee',
            zerolinecolor: '#cccccc',
            showline: true,
            linecolor: '#dddddd'
        },
        showlegend: false
    });

    const renderTrajectoriesChart = (simulationData) => {
        const { timeSteps, trajectories, empiricalMeanTrajectory, theoreticalMeanTrajectory } = simulationData;
        const totalM = trajectories.length;
        const maxDisplayedPaths = Math.min(totalM, 150);
        const traces = [];

        for (let i = 0; i < maxDisplayedPaths; i += 1) {
            traces.push({
                x: timeSteps,
                y: Array.from(trajectories[i]),
                type: 'scatter',
                mode: 'lines',
                line: { color: 'rgba(0, 68, 136, 0.12)', width: 1 },
                hoverinfo: 'none',
                showlegend: false
            });
        }

        traces.push({
            name: 'Theoretical E[S_t]',
            x: timeSteps,
            y: Array.from(theoreticalMeanTrajectory),
            type: 'scatter',
            mode: 'lines',
            line: { color: '#900000', width: 2.5 }
        });

        traces.push({
            name: 'Sample Mean',
            x: timeSteps,
            y: Array.from(empiricalMeanTrajectory),
            type: 'scatter',
            mode: 'lines',
            line: { color: '#d35400', width: 2, dash: 'dash' }
        });

        const layout = createPlotlyBaseLayout('Time step (t)', 'Cumulative score (S_t)');
        layout.showlegend = true;
        layout.legend = { orientation: 'h', x: 0.05, y: 1.12, font: { size: 10 } };

        Plotly.react('chart-trajectories', traces, layout, commonPlotlyConfig);
    };

    const renderFinalSumsHistogram = (simulationData) => {
        const { finalSums, moments } = simulationData;
        const trace = {
            x: Array.from(finalSums),
            type: 'histogram',
            marker: { color: 'rgba(0, 68, 136, 0.7)', line: { color: '#004488', width: 1 } },
            nbinsx: 35
        };

        const layout = createPlotlyBaseLayout('Final score S_n', 'Absolute frequency');
        layout.shapes = [{
            type: 'line',
            x0: moments.expectedFinal,
            x1: moments.expectedFinal,
            y0: 0,
            y1: 1,
            yref: 'paper',
            line: { color: '#900000', width: 2, dash: 'dash' }
        }];

        Plotly.react('chart-final-sums', [trace], layout, commonPlotlyConfig);
    };

    const renderAverageScoreHistogram = (simulationData) => {
        const { finalAverages, moments } = simulationData;
        const trace = {
            x: Array.from(finalAverages),
            type: 'histogram',
            marker: { color: 'rgba(39, 174, 96, 0.7)', line: { color: '#27ae60', width: 1 } },
            nbinsx: 35
        };

        const layout = createPlotlyBaseLayout('Sample mean S_n / n', 'Absolute frequency');
        layout.shapes = [{
            type: 'line',
            x0: moments.meanStep,
            x1: moments.meanStep,
            y0: 0,
            y1: 1,
            yref: 'paper',
            line: { color: '#900000', width: 2, dash: 'dash' }
        }];

        Plotly.react('chart-averages', [trace], layout, commonPlotlyConfig);
    };

    const renderStandardizedHistogram = (simulationData) => {
        const { finalStandardized } = simulationData;
        const histTrace = {
            x: Array.from(finalStandardized),
            type: 'histogram',
            histnorm: 'probability density',
            name: 'Normalized empirical data',
            marker: { color: 'rgba(211, 84, 0, 0.65)', line: { color: '#d35400', width: 1 } },
            nbinsx: 35
        };

        const { xValues, yValues } = StochasticSimulator.generateStandardNormalPdf(-4, 4, 150);
        const normalCurveTrace = {
            x: xValues,
            y: yValues,
            type: 'scatter',
            mode: 'lines',
            name: 'Gaussian N(0,1)',
            line: { color: '#900000', width: 2.2 }
        };

        const layout = createPlotlyBaseLayout('Normalized score Z_n', 'Probability density');
        layout.showlegend = true;
        layout.legend = { orientation: 'h', x: 0.05, y: 1.12, font: { size: 10 } };
        layout.xaxis.range = [-4, 4];

        Plotly.react('chart-normalized', [histTrace, normalCurveTrace], layout, commonPlotlyConfig);
    };

    const executeSimulation = () => {
        const startTime = performance.now();
        const params = getParams();
        const result = StochasticSimulator.run(params);
        const elapsed = (performance.now() - startTime).toFixed(1);

        elements.metricExpectedSn.textContent = result.moments.expectedFinal.toFixed(1);
        elements.metricSampleSn.textContent = result.sampleStats.sampleMeanFinal.toFixed(1);
        elements.metricSampleAvg.textContent = result.sampleStats.sampleMeanAverage.toFixed(3);
        elements.metricExecTime.textContent = `${elapsed} ms`;

        renderTrajectoriesChart(result);
        renderFinalSumsHistogram(result);
        renderAverageScoreHistogram(result);
        renderStandardizedHistogram(result);
    };

    const applyPreset = (presetName) => {
        switch (presetName) {
            case 'fair-rademacher':
                document.querySelector('input[name="model"][value="rademacher"]').checked = true;
                elements.inputP.value = '0.50';
                elements.rangeP.value = '0.50';
                elements.inputN.value = '200';
                elements.rangeN.value = '200';
                elements.inputM.value = '150';
                elements.rangeM.value = '150';
                break;
            case 'biased-bernoulli':
                document.querySelector('input[name="model"][value="bernoulli"]').checked = true;
                elements.inputP.value = '0.70';
                elements.rangeP.value = '0.70';
                elements.inputN.value = '250';
                elements.rangeN.value = '250';
                elements.inputM.value = '150';
                elements.rangeM.value = '150';
                break;
            case 'large-sample':
                elements.inputN.value = '600';
                elements.rangeN.value = '600';
                elements.inputM.value = '350';
                elements.rangeM.value = '350';
                break;
            default:
                break;
        }
        updateRadioActiveState();
        executeSimulation();
    };

    const initEventListeners = () => {
        syncInputPair(elements.inputN, elements.rangeN);
        syncInputPair(elements.inputM, elements.rangeM);
        syncInputPair(elements.inputP, elements.rangeP);

        elements.modelRadios.forEach((radio) => {
            radio.addEventListener('change', updateRadioActiveState);
        });

        elements.btnRun.addEventListener('click', executeSimulation);

        elements.presetButtons.forEach((btn) => {
            btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
        });

        elements.btnHelp.addEventListener('click', () => {
            elements.helpModal.classList.add('open');
        });

        elements.btnCloseModal.addEventListener('click', () => {
            elements.helpModal.classList.remove('open');
        });

        elements.helpModal.addEventListener('click', (event) => {
            if (event.target === elements.helpModal) {
                elements.helpModal.classList.remove('open');
            }
        });

        window.addEventListener('resize', () => {
            const chartIds = ['chart-trajectories', 'chart-final-sums', 'chart-averages', 'chart-normalized'];
            chartIds.forEach((id) => {
                const container = document.getElementById(id);
                if (container && container.data) {
                    Plotly.Plots.resize(container);
                }
            });
        });
    };

    document.addEventListener('DOMContentLoaded', () => {
        initEventListeners();
        updateRadioActiveState();
        executeSimulation();
    });
})();
