/*
 * app.js
 * Coordinamento dell'interfaccia utente per homework_1b:
 *   - Cifrario di Cesare e Crittanalisi Chi-Quadro
 *   - Test empirico stringhe corte vs lunghe
 *   - Attacco a forza bruta all'ECDLP del Toy ECC con misurazione del tempo
 *   - Visualizzazione dei 4 grafici Chart.js
 *   - Output del saggio accademico
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
            $("output-ecc").value = "Errore durante la cifratura ECC: " + err.message;
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
                Chiave stimata dal Chi-Quadro: <b>k = ${result.bestShift}</b>
                ${isMatch ? '(CORRETTA!)' : `(Errata, la chiave reale era k = ${state.caesarShift})`}
            </div>
            <span class="info-text">Analisi di ${result.letterCount} lettere completata in ${elapsed} ms. Distanza Chi-Quadro: ${result.bestChi2.toFixed(2)}</span>
        `;

        $("caesar-decrypted-attack").value = result.decryptedText;

        // Renderizza il grafico di distribuzione del Chi-Quadro per tutti i 25 shift
        ChartsManager.renderChi2Chart("chart-chi2", result.scores, result.bestShift);

        // Popola la tabella con i primi 5 candidati migliori
        const tableBody = $("caesar-scores-table");
        tableBody.innerHTML = result.scores.slice(0, 5).map((s, idx) => `
            <tr class="${s.shift === state.caesarShift ? 'highlight-row' : ''}">
                <td>#${idx + 1}</td>
                <td><b>k = ${s.shift}</b></td>
                <td class="mono">${s.chi2.toFixed(2)}</td>
                <td class="mono">${s.decryptedPreview.slice(0, 40)}...</td>
                <td>${s.shift === state.caesarShift ? '<span class="badge-success">Chiave Esatta</span>' : ''}</td>
            </tr>
        `).join("");
    }

    // 5. Test Comparativo: Stringhe Corte vs Lunghe
    function runLengthComparisonTest() {
        const tbody = $("length-test-body");
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Esecuzione test statistico in corso...</td></tr>`;

        setTimeout(() => {
            const results = Caesar.testLengthVulnerability(state.plainText, state.caesarShift, state.lang);

            tbody.innerHTML = results.map(r => `
                <tr class="${r.success ? 'highlight-row' : ''}">
                    <td><b>${r.length} lettere</b></td>
                    <td class="mono">${r.sample}</td>
                    <td><b>k = ${r.predictedShift}</b></td>
                    <td>k = ${r.actualShift}</td>
                    <td class="mono">${r.chi2.toFixed(1)}</td>
                    <td>
                        ${r.success
                            ? '<span class="badge-success">Successo (100% corretto)</span>'
                            : '<span class="badge-error">Fallito (Varianza campionaria elevata)</span>'}
                    </td>
                </tr>
            `).join("");
        }, 50);
    }

    // 6. Attacco a Forza Bruta al Toy ECC (Risoluzione ECDLP)
    async function runECCBruteForce() {
        if (state.isCrackingECC) return;
        state.isCrackingECC = true;

        const btn = $("btn-start-ecc-crack");
        btn.disabled = true;
        btn.textContent = "Craccando chiave privata...";

        const fill = $("ecc-progress-fill");
        const stats = $("ecc-progress-stats");
        const resultBox = $("ecc-crack-result");
        resultBox.innerHTML = "";

        const targetQ = state.eccKeys.Q;
        const maxKey = ECC.D_MAX; // 50.000

        try {
            const res = await ECC.bruteForceECDLP(targetQ, maxKey, ({ currentD, percent, elapsedMs, attempts }) => {
                fill.style.width = `${percent}%`;
                stats.textContent = `Progresso: ${currentD} / ${maxKey} (${percent}%) - Tempo: ${(elapsedMs / 1000).toFixed(1)}s - Tentativi/s: ${(attempts / (elapsedMs / 1000 || 1)).toFixed(0)}`;
            });

            fill.style.width = "100%";
            const sec = (res.timeMs / 1000).toFixed(2);

            if (res.found) {
                // Decifratura di verifica con la chiave violata
                const decCheck = ECC.decrypt(state.eccBlocks, res.privateKey);

                resultBox.innerHTML = `
                    <div class="badge-success" style="font-size: 1rem; padding: 6px 12px; margin-bottom: 8px;">
                        ECDLP RISOLTO! Chiave privata violata: d = ${res.privateKey}
                    </div>
                    <div class="small-text">
                        <b>Tempo totale impiegato:</b> ${sec} secondi (${res.timeMs.toFixed(1)} ms).<br>
                        <b>Operazioni eseguite:</b> ${res.attempts} addizioni di punti ellittici.<br>
                        <b>Velocita' di scansione:</b> ${(res.opsPerSec).toFixed(0)} chiavi/secondo.<br>
                        <b>Verifica decifratura con d violata:</b> "${decCheck.text.slice(0, 65)}..."
                    </div>
                `;
            } else {
                resultBox.innerHTML = `<div class="badge-error">Chiave non trovata nell'intervallo [1, ${maxKey}].</div>`;
            }
        } catch (err) {
            resultBox.innerHTML = `<div class="badge-error">Errore durante il brute force: ${err.message}</div>`;
        } finally {
            state.isCrackingECC = false;
            btn.disabled = false;
            btn.textContent = "Lancia Attacco Brute-Force (ECDLP)";
        }
    }

    // 7. Gestione Visualizzazione PDF paper_hw_1b.pdf (se presenti i pulsanti)
    const pdfContainer = $("pdf-container");
    const btnTogglePdf = $("btn-toggle-pdf");
    if (btnTogglePdf && pdfContainer) {
        btnTogglePdf.addEventListener("click", () => {
            if (pdfContainer.style.display === "none") {
                pdfContainer.style.display = "block";
                btnTogglePdf.textContent = "Nascondi PDF";
            } else {
                pdfContainer.style.display = "none";
                btnTogglePdf.textContent = "Mostra PDF";
            }
        });
    }

    const btnHeaderPdf = $("btn-header-pdf");
    if (btnHeaderPdf && pdfContainer) {
        btnHeaderPdf.addEventListener("click", () => {
            pdfContainer.style.display = "block";
            if (btnTogglePdf) btnTogglePdf.textContent = "Nascondi PDF";
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
        $("ecc-progress-stats").textContent = "Pronto ad attaccare la nuova chiave pubblica.";
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
