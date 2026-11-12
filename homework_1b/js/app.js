/*
 * app.js
 * UI coordination for homework_1b:
 *   - Caesar Cipher and Chi-Squared Cryptanalysis
 *   - Empirical test: short vs long strings
 *   - Brute-force attack on Toy ECC ECDLP with timing
 *   - Rendering of the 4 Chart.js charts
 *   - Academic paper output
 */

document.addEventListener("DOMContentLoaded", () => {

    const $ = id => document.getElementById(id);

    // Testo di partenza accademico in italiano (> 300 caratteri)
    const DEFAULT_TEXT =
        "Nel mezzo del cammin di nostra vita mi ritrovai per una selva oscura, che la diritta via era smarrita. " +
        "Ahi quanto a dir qual era e cosa dura esta selva selvaggia e aspra e forte che nel pensier rinova la paura! " +
        "Tanto e amara che poco e piu morte; ma per trattar del ben ch io vi trovai, diro de l altre cose ch io v ho scorte. " +
        "La crittografia asimmetrica protegge le comunicazioni moderne garantendo riservatezza e integrita statistica.";

    // Stato dell'applicazione
    const state = {
        lang: "it",
        caesarShift: 7,
        eccKeys: null,
        plainText: DEFAULT_TEXT,
        caesarCipher: "",
        eccBlocks: [],
        eccCipherStr: "",
        isCrackingECC: false
    };

    // 1. Inizializzazione Chiavi ECC
    function initECCKeys(forcedD = 12345n) {
        state.eccKeys = ECC.generateKeyPair(forcedD);
        $("ecc-d-display").textContent = state.eccKeys.d.toString();
        $("ecc-qx-display").textContent = ECC.toHex(state.eccKeys.Q.x);
        $("ecc-qy-display").textContent = ECC.toHex(state.eccKeys.Q.y);
        $("ecc-qc-display").textContent = ECC.compressPoint(state.eccKeys.Q);
    }

    // 2. Cifratura Cesare ed ECC del testo corrente
    function updateCiphers() {
        state.plainText = $("input-text").value;
        state.caesarShift = parseInt($("input-caesar-shift").value) || 7;
        state.lang = $("select-lang").value;

        // Cesare
        state.caesarCipher = Caesar.encrypt(state.plainText, state.caesarShift);
        $("output-caesar").value = state.caesarCipher;

        // ECC
        try {
            state.eccBlocks = ECC.encrypt(state.plainText, state.eccKeys.Q);
            state.eccCipherStr = ECC.serializeCiphertext(state.eccBlocks);
            $("output-ecc").value = state.eccCipherStr;
        } catch (err) {
            $("output-ecc").value = "Error during ECC encryption: " + err.message;
        }

        // Aggiornamento dei grafici
        updateAllCharts();
    }

    // 3. Aggiornamento Grafici Chart.js
    function updateAllCharts() {
        ChartsManager.renderPlainChart("chart-plain", state.plainText, state.lang);
        ChartsManager.renderCaesarChart("chart-caesar", state.caesarCipher, state.caesarShift);
        ChartsManager.renderECCChart("chart-ecc", state.eccCipherStr);
    }

    // 4. Crittanalisi Statistica Chi-Quadro di Cesare
    function runCaesarCryptanalysis() {
        const t0 = performance.now();
        const result = Caesar.chiSquaredAttack(state.caesarCipher, state.lang);
        const elapsed = (performance.now() - t0).toFixed(2);

        const statusEl = $("caesar-attack-status");
        const isMatch = result.bestShift === state.caesarShift;

        statusEl.innerHTML = `
            <div class="${isMatch ? 'badge-success' : 'badge-error'}">
                Chi-Squared estimated key: <b>k = ${result.bestShift}</b>
                ${isMatch ? '(CORRECT!)' : `(Incorrect, actual key was k = ${state.caesarShift})`}
            </div>
            <span class="info-text">Analysis of ${result.letterCount} letters completed in ${elapsed} ms. Chi-Squared distance: ${result.bestChi2.toFixed(2)}</span>
        `;

        $("caesar-decrypted-attack").value = result.decryptedText;

        // Render the Chi-Squared distribution chart for all 25 shifts
        ChartsManager.renderChi2Chart("chart-chi2", result.scores, result.bestShift);

        // Populate the table with the top 5 candidates
        const tableBody = $("caesar-scores-table");
        tableBody.innerHTML = result.scores.slice(0, 5).map((s, idx) => `
            <tr class="${s.shift === state.caesarShift ? 'highlight-row' : ''}">
                <td>#${idx + 1}</td>
                <td><b>k = ${s.shift}</b></td>
                <td class="mono">${s.chi2.toFixed(2)}</td>
                <td class="mono">${s.decryptedPreview.slice(0, 40)}...</td>
                <td>${s.shift === state.caesarShift ? '<span class="badge-success">Exact Key</span>' : ''}</td>
            </tr>
        `).join("");
    }

    // 5. Comparative Test: Short vs Long Strings
    function runLengthComparisonTest() {
        const tbody = $("length-test-body");
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Running statistical test...</td></tr>`;

        setTimeout(() => {
            const results = Caesar.testLengthVulnerability(state.plainText, state.caesarShift, state.lang);

            tbody.innerHTML = results.map(r => `
                <tr class="${r.success ? 'highlight-row' : ''}">
                    <td><b>${r.length} letters</b></td>
                    <td class="mono">${r.sample}</td>
                    <td><b>k = ${r.predictedShift}</b></td>
                    <td>k = ${r.actualShift}</td>
                    <td class="mono">${r.chi2.toFixed(1)}</td>
                    <td>
                        ${r.success
                            ? '<span class="badge-success">Success (100% accurate)</span>'
                            : '<span class="badge-error">Failed (High sampling variance)</span>'}
                    </td>
                </tr>
            `).join("");
        }, 50);
    }

    // 6. Brute-Force Attack on Toy ECC (ECDLP Solver)
    async function runECCBruteForce() {
        if (state.isCrackingECC) return;
        state.isCrackingECC = true;

        const btn = $("btn-start-ecc-crack");
        btn.disabled = true;
        btn.textContent = "Cracking private key...";

        const fill = $("ecc-progress-fill");
        const stats = $("ecc-progress-stats");
        const resultBox = $("ecc-crack-result");
        resultBox.innerHTML = "";

        const targetQ = state.eccKeys.Q;
        const maxKey = ECC.D_MAX; // 50.000

        try {
            const res = await ECC.bruteForceECDLP(targetQ, maxKey, ({ currentD, percent, elapsedMs, attempts }) => {
                fill.style.width = `${percent}%`;
                stats.textContent = `Progress: ${currentD} / ${maxKey} (${percent}%) - Time: ${(elapsedMs / 1000).toFixed(1)}s - Attempts/s: ${(attempts / (elapsedMs / 1000 || 1)).toFixed(0)}`;
            });

            fill.style.width = "100%";
            const sec = (res.timeMs / 1000).toFixed(2);

            if (res.found) {
                // Verification decryption with the cracked key
                const decCheck = ECC.decrypt(state.eccBlocks, res.privateKey);

                resultBox.innerHTML = `
                    <div class="badge-success" style="font-size: 1rem; padding: 6px 12px; margin-bottom: 8px;">
                        ECDLP SOLVED! Cracked private key: d = ${res.privateKey}
                    </div>
                    <div class="small-text">
                        <b>Total time elapsed:</b> ${sec} seconds (${res.timeMs.toFixed(1)} ms).<br>
                        <b>Operations performed:</b> ${res.attempts} elliptic curve point additions.<br>
                        <b>Scan speed:</b> ${(res.opsPerSec).toFixed(0)} keys/second.<br>
                        <b>Decryption check with cracked d:</b> "${decCheck.text.slice(0, 65)}..."
                    </div>
                `;
            } else {
                resultBox.innerHTML = `<div class="badge-error">Key not found in interval [1, ${maxKey}].</div>`;
            }
        } catch (err) {
            resultBox.innerHTML = `<div class="badge-error">Error during brute force: ${err.message}</div>`;
        } finally {
            state.isCrackingECC = false;
            btn.disabled = false;
            btn.textContent = "Launch Brute-Force Attack (ECDLP)";
        }
    }

    // 7. PDF Viewer Handling for paper_hw_1b.pdf (if buttons are present)
    const pdfContainer = $("pdf-container");
    const btnTogglePdf = $("btn-toggle-pdf");
    if (btnTogglePdf && pdfContainer) {
        btnTogglePdf.addEventListener("click", () => {
            if (pdfContainer.style.display === "none") {
                pdfContainer.style.display = "block";
                btnTogglePdf.textContent = "Hide PDF";
            } else {
                pdfContainer.style.display = "none";
                btnTogglePdf.textContent = "Show PDF";
            }
        });
    }

    const btnHeaderPdf = $("btn-header-pdf");
    if (btnHeaderPdf && pdfContainer) {
        btnHeaderPdf.addEventListener("click", () => {
            pdfContainer.style.display = "block";
            if (btnTogglePdf) btnTogglePdf.textContent = "Hide PDF";
            const paperSec = $("paper-section");
            if (paperSec) paperSec.scrollIntoView({ behavior: "smooth" });
        });
    }

    // 8. Event Listeners
    $("input-text").addEventListener("input", updateCiphers);
    $("input-caesar-shift").addEventListener("input", updateCiphers);
    $("select-lang").addEventListener("change", updateCiphers);

    $("btn-random-ecc-key").addEventListener("click", () => {
        initECCKeys(null);
        updateCiphers();
        $("ecc-crack-result").innerHTML = "";
        $("ecc-progress-fill").style.width = "0%";
        $("ecc-progress-stats").textContent = "Ready to attack the new public key.";
    });

    $("btn-run-caesar-attack").addEventListener("click", runCaesarCryptanalysis);
    $("btn-run-length-test").addEventListener("click", runLengthComparisonTest);
    $("btn-start-ecc-crack").addEventListener("click", runECCBruteForce);

    // Modal spiegazione
    const modal = $("help-modal");
    $("btn-help").addEventListener("click", () => modal.classList.remove("hidden"));
    document.querySelector(".close-modal").addEventListener("click", () => modal.classList.add("hidden"));
    window.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });

    // Inizializzazione automatica
    initECCKeys(12345n);
    updateCiphers();
    runCaesarCryptanalysis();
    runLengthComparisonTest();
});
