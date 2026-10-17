/*
 * charts.js
 * Modulo per la generazione dei grafici statistici con Chart.js.
 *
 * Include:
 *   1. Grafico 1: Distribuzione frequenze del Testo in Chiaro (vs teorica)
 *   2. Grafico 2: Distribuzione frequenze del Cifrato di Cesare (evidenzia la traslazione)
 *   3. Grafico 3: Distribuzione dei byte/nibble del Cifrato ECC (dimostra la planarita' pseudo-casuale)
 *   4. Grafico 4: Curva del test Chi-Quadro sui 25 shift (individuazione del minimo globale)
 */

const ChartsManager = (() => {

    let chartPlain = null;
    let chartCaesar = null;
    let chartECC = null;
    let chartChi2 = null;

    const alphabetLabels = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

    // Stile condiviso per i grafici Chart.js coerente con il design accademico
    const defaultFont = {
        family: "'Helvetica Neue', Arial, sans-serif",
        size: 11
    };

    function destroyChart(chartInstance) {
        if (chartInstance) {
            try { chartInstance.destroy(); } catch (e) { }
        }
    }

    // 1. Grafico Testo in Chiaro (Frequenze empiriche vs teoriche)
    function renderPlainChart(canvasId, text, lang = "it") {
        destroyChart(chartPlain);
        const ctx = document.getElementById(canvasId).getContext("2d");
        const { relative } = Caesar.countLetterFrequencies(text);
        const theory = Caesar.FREQUENCIES[lang] || Caesar.FREQUENCIES.it;

        const dataEmpirical = alphabetLabels.map(l => (relative[l] * 100).toFixed(2));
        const dataTheoretical = alphabetLabels.map(l => (theory[l] * 100).toFixed(2));

        chartPlain = new Chart(ctx, {
            type: "bar",
            data: {
                labels: alphabetLabels,
                datasets: [
                    {
                        label: "Frequenza osservata (%)",
                        data: dataEmpirical,
                        backgroundColor: "rgba(0, 68, 136, 0.75)",
                        borderColor: "#004488",
                        borderWidth: 1,
                        borderRadius: 3
                    },
                    {
                        label: "Frequenza teorica lingua (%)",
                        data: dataTheoretical,
                        type: "line",
                        borderColor: "#900000",
                        backgroundColor: "transparent",
                        borderWidth: 2,
                        pointRadius: 2.5,
                        tension: 0.2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { font: defaultFont } },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%`
                        }
                    }
                },
                scales: {
                    x: { ticks: { font: defaultFont } },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: "Frequenza (%)", font: defaultFont },
                        ticks: { font: defaultFont }
                    }
                }
            }
        });
    }

    // 2. Grafico Cifrato di Cesare (Mostra lo shift rigido dei picchi)
    function renderCaesarChart(canvasId, cipherText, shift) {
        destroyChart(chartCaesar);
        const ctx = document.getElementById(canvasId).getContext("2d");
        const { relative } = Caesar.countLetterFrequencies(cipherText);
        const dataEmpirical = alphabetLabels.map(l => (relative[l] * 100).toFixed(2));

        chartCaesar = new Chart(ctx, {
            type: "bar",
            data: {
                labels: alphabetLabels,
                datasets: [
                    {
                        label: `Frequenze Cesare (Shift k = ${shift})`,
                        data: dataEmpirical,
                        backgroundColor: "rgba(211, 84, 0, 0.75)",
                        borderColor: "#d35400",
                        borderWidth: 1,
                        borderRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { font: defaultFont } },
                    tooltip: {
                        callbacks: {
                            label: ctx => `Frequenza: ${ctx.parsed.y}%`
                        }
                    }
                },
                scales: {
                    x: { ticks: { font: defaultFont } },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: "Frequenza (%)", font: defaultFont },
                        ticks: { font: defaultFont }
                    }
                }
            }
        });
    }

    // 3. Grafico Cifrato ECC (Distribuzione dei caratteri esadecimali / byte)
    // Mostra l'effetto dell'entropia crittografica: distribuzione appiattita e uniforme
    function renderECCChart(canvasId, cipherText) {
        destroyChart(chartECC);
        const ctx = document.getElementById(canvasId).getContext("2d");

        // Analisi della distribuzione dei nibble esadecimali (0-9, a-f) nel cifrato
        const hexChars = "0123456789abcdef".split("");
        const hexClean = cipherText.toLowerCase().replace(/[^0-9a-f]/g, "");
        const counts = {};
        hexChars.forEach(c => counts[c] = 0);
        for (let i = 0; i < hexClean.length; i++) counts[hexClean[i]]++;

        const totalHex = hexClean.length;
        const dataPercentages = hexChars.map(c => totalHex > 0 ? ((counts[c] / totalHex) * 100).toFixed(2) : 0);
        // Frequenza ideale uniforme: 100 / 16 = 6.25%
        const uniformExpected = hexChars.map(() => (100 / 16).toFixed(2));

        chartECC = new Chart(ctx, {
            type: "bar",
            data: {
                labels: hexChars.map(c => c.toUpperCase()),
                datasets: [
                    {
                        label: "Frequenza osservata esadecimali ECC (%)",
                        data: dataPercentages,
                        backgroundColor: "rgba(39, 174, 96, 0.75)",
                        borderColor: "#27ae60",
                        borderWidth: 1,
                        borderRadius: 3
                    },
                    {
                        label: "Distribuzione uniforme ideale (6.25%)",
                        data: uniformExpected,
                        type: "line",
                        borderColor: "#444",
                        borderDash: [5, 5],
                        borderWidth: 1.5,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { font: defaultFont } },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%`
                        }
                    }
                },
                scales: {
                    x: { ticks: { font: defaultFont } },
                    y: {
                        beginAtZero: true,
                        max: 15,
                        title: { display: true, text: "Frequenza (%)", font: defaultFont },
                        ticks: { font: defaultFont }
                    }
                }
            }
        });
    }

    // 4. Grafico Statistico: Distanza Chi-Quadro per tutti i 25 shift
    function renderChi2Chart(canvasId, scores, bestShift) {
        destroyChart(chartChi2);
        const ctx = document.getElementById(canvasId).getContext("2d");

        // Ordiniamo per shift da 1 a 25 per visualizzare la curva continua
        const sortedByShift = [...scores].sort((a, b) => a.shift - b.shift);
        const labels = sortedByShift.map(s => `k = ${s.shift}`);
        const values = sortedByShift.map(s => s.chi2.toFixed(1));
        const colors = sortedByShift.map(s => s.shift === bestShift ? "rgba(144, 0, 0, 0.9)" : "rgba(0, 68, 136, 0.65)");
        const borderColors = sortedByShift.map(s => s.shift === bestShift ? "#900000" : "#004488");

        chartChi2 = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Valore Chi-Quadro per shift candidato",
                        data: values,
                        backgroundColor: colors,
                        borderColor: borderColors,
                        borderWidth: 1.5,
                        borderRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { font: defaultFont } },
                    tooltip: {
                        callbacks: {
                            label: ctx => `Distanza Chi-Quadro: ${ctx.parsed.y}`
                        }
                    }
                },
                scales: {
                    x: { ticks: { font: { ...defaultFont, size: 9 }, maxRotation: 45 } },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: "Distanza Chi-Quadro", font: defaultFont },
                        ticks: { font: defaultFont }
                    }
                }
            }
        });
    }

    return {
        renderPlainChart,
        renderCaesarChart,
        renderECCChart,
        renderChi2Chart
    };
})();
