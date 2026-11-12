/*
 * charts.js
 * Module for generating statistical charts with Chart.js.
 *
 * Includes:
 *   1. Chart 1: Plaintext frequency distribution (vs theoretical)
 *   2. Chart 2: Caesar Ciphertext frequency distribution (highlights the shift)
 *   3. Chart 3: ECC Ciphertext byte/nibble distribution (demonstrates pseudo-random flatness)
 *   4. Chart 4: Chi-Squared test curve across all 25 shifts (identifying the global minimum)
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
                        label: "Observed frequency (%)",
                        data: dataEmpirical,
                        backgroundColor: "rgba(0, 68, 136, 0.75)",
                        borderColor: "#004488",
                        borderWidth: 1,
                        borderRadius: 3
                    },
                    {
                        label: "Theoretical language frequency (%)",
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
                        title: { display: true, text: "Frequency (%)", font: defaultFont },
                        ticks: { font: defaultFont }
                    }
                }
            }
        });
    }

    // 2. Caesar Ciphertext Chart (Shows the rigid shift of peaks)
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
                        label: `Caesar Frequencies (Shift k = ${shift})`,
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
                            label: ctx => `Frequency: ${ctx.parsed.y}%`
                        }
                    }
                },
                scales: {
                    x: { ticks: { font: defaultFont } },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: "Frequency (%)", font: defaultFont },
                        ticks: { font: defaultFont }
                    }
                }
            }
        });
    }

    // 3. ECC Ciphertext Chart (Distribution of hexadecimal characters / bytes)
    // Shows the effect of cryptographic entropy: flattened and uniform distribution
    function renderECCChart(canvasId, cipherText) {
        destroyChart(chartECC);
        const ctx = document.getElementById(canvasId).getContext("2d");

        // Analysis of hexadecimal nibble distribution (0-9, a-f) in the ciphertext
        const hexChars = "0123456789abcdef".split("");
        const hexClean = cipherText.toLowerCase().replace(/[^0-9a-f]/g, "");
        const counts = {};
        hexChars.forEach(c => counts[c] = 0);
        for (let i = 0; i < hexClean.length; i++) counts[hexClean[i]]++;

        const totalHex = hexClean.length;
        const dataPercentages = hexChars.map(c => totalHex > 0 ? ((counts[c] / totalHex) * 100).toFixed(2) : 0);
        // Ideal uniform frequency: 100 / 16 = 6.25%
        const uniformExpected = hexChars.map(() => (100 / 16).toFixed(2));

        chartECC = new Chart(ctx, {
            type: "bar",
            data: {
                labels: hexChars.map(c => c.toUpperCase()),
                datasets: [
                    {
                        label: "Observed ECC hexadecimal frequency (%)",
                        data: dataPercentages,
                        backgroundColor: "rgba(39, 174, 96, 0.75)",
                        borderColor: "#27ae60",
                        borderWidth: 1,
                        borderRadius: 3
                    },
                    {
                        label: "Ideal uniform distribution (6.25%)",
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
                        title: { display: true, text: "Frequency (%)", font: defaultFont },
                        ticks: { font: defaultFont }
                    }
                }
            }
        });
    }

    // 4. Statistical Chart: Chi-Squared Distance for all 25 shifts
    function renderChi2Chart(canvasId, scores, bestShift) {
        destroyChart(chartChi2);
        const ctx = document.getElementById(canvasId).getContext("2d");

        // Sort by shift from 1 to 25 to display the continuous curve
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
                        label: "Chi-Squared value per candidate shift",
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
                            label: ctx => `Chi-Squared Distance: ${ctx.parsed.y}`
                        }
                    }
                },
                scales: {
                    x: { ticks: { font: { ...defaultFont, size: 9 }, maxRotation: 45 } },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: "Chi-Squared Distance", font: defaultFont },
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
