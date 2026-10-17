/*
 * app.js
 * Collega il modulo ECC (ecc.js) e la vista a passi (steps.js) all'interfaccia:
 * generazione delle chiavi, cifratura e decifratura del messaggio.
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- Stato ---
    const state = {
        keys: null,         // { d, Q, trace }
        blocks: null,       // ultimo risultato di ECC.encrypt
        encryptedText: null // testo originale dell'ultima cifratura
    };

    const $ = id => document.getElementById(id);

    // --- Parametri della curva ---
    function renderCurveParams() {
        const C = ECC.CURVE;
        const rows = [
            ["p", ECC.toHex(C.p)],
            ["a", C.a.toString()],
            ["b", C.b.toString()],
            ["G<sub>x</sub>", ECC.toHex(C.Gx)],
            ["G<sub>y</sub>", ECC.toHex(C.Gy)],
            ["n", ECC.toHex(C.n)],
            ["h", C.h.toString()]
        ];
        $("curve-params").innerHTML = rows.map(([k, v]) =>
            `<div class="param-row"><span class="param-name"><i>${k}</i></span><span class="mono">${v}</span></div>`
        ).join("");

        $("d-min").textContent = ECC.D_MIN.toString();
        $("d-max").textContent = Fmt.formatInt(ECC.D_MAX);
        $("input-d").min = ECC.D_MIN.toString();
        $("input-d").max = ECC.D_MAX.toString();
    }

    // --- Chiavi ---
    function setKeys(dInput) {
        const statusEl = $("key-status");
        try {
            const t0 = performance.now();
            state.keys = ECC.generateKeyPair(dInput);
            const ms = (performance.now() - t0).toFixed(1);
            statusEl.textContent = "";
            $("input-d").value = state.keys.d.toString();
            renderKeys(ms);
        } catch (err) {
            statusEl.textContent = "Errore: " + err.message;
        }
    }

    function renderKeys(ms) {
        const { d, Q, trace } = state.keys;
        $("out-d").textContent = Fmt.formatInt(d);
        $("out-d-hex").textContent = d.toString(16);
        $("out-qx").textContent = ECC.toHex(Q.x);
        $("out-qy").textContent = ECC.toHex(Q.y);
        $("out-qc").textContent = ECC.compressPoint(Q);

        const ok = ECC.isOnCurve(Q);
        $("out-check").innerHTML = ok
            ? `<span class="badge-result">Q appartiene alla curva</span> <span class="info-text">calcolata in ${ms} ms</span>`
            : `<span class="badge-error">Q non appartiene alla curva</span>`;

        // Stepper del processo di generazione chiavi: scelta di d e calcolo di Q = d * G
        const keyRoot = $("key-process");
        if (keyRoot) {
            new Stepper(keyRoot, {
                blockCount: 1,
                label: "Come viene scelta la chiave pubblica Q = d &sdot; G",
                buildSteps: KeyGenSteps.build({
                    d,
                    Q,
                    trace,
                    ms
                })
            }).render();
        }
    }

    // --- Cifratura ---
    function encryptMessage() {
        const text = $("input-message").value;
        const info = $("enc-info");
        try {
            const t0 = performance.now();
            state.blocks = ECC.encrypt(text, state.keys.Q);
            state.encryptedText = text;
            const ms = (performance.now() - t0).toFixed(1);

            const cipher = ECC.serializeCiphertext(state.blocks);
            $("output-cipher").value = cipher;
            const n = state.blocks.length;
            info.textContent = `${n} ${n === 1 ? "blocco" : "blocchi"} in ${ms} ms`;

            const root = $("enc-process");
            root.classList.remove("hidden");
            new Stepper(root, {
                blockCount: n,
                buildSteps: EncryptionSteps.build({
                    text,
                    blocks: state.blocks,
                    Q: state.keys.Q,
                    lines: cipher.split("\n")
                })
            }).render();

            // La decifratura precedente non e' piu' valida
            $("output-plain").value = "";
            $("dec-status").innerHTML = "";
            $("dec-info").textContent = "";
            $("dec-process").classList.add("hidden");
        } catch (err) {
            info.textContent = "Errore: " + err.message;
        }
    }

    // --- Decifratura ---
    // Il cifrato viene riletto dalla textarea, cosi' la decifratura usa solo
    // (C1, C2) e la chiave privata. I dati del mittente servono solo per i confronti.
    function decryptMessage() {
        const info = $("dec-info");
        const statusEl = $("dec-status");
        const root = $("dec-process");
        try {
            const raw = $("output-cipher").value.trim();
            const blocks = ECC.parseCiphertext(raw);
            const lines = raw.split(/\s+/).filter(l => l.length > 0);

            const t0 = performance.now();
            const result = ECC.decrypt(blocks, state.keys.d);
            const ms = (performance.now() - t0).toFixed(1);

            $("output-plain").value = result.text;
            info.textContent = `${blocks.length} ${blocks.length === 1 ? "blocco" : "blocchi"} in ${ms} ms`;

            if (!result.valid) {
                statusEl.innerHTML = `<span class="badge-error">Decifratura non valida: la chiave privata non corrisponde a quella usata per cifrare</span>`;
            } else if (result.text === state.encryptedText) {
                statusEl.innerHTML = `<span class="badge-result">Il testo decifrato coincide con l'originale</span>`;
            } else {
                statusEl.innerHTML = `<span class="badge-result">Decifratura completata</span>`;
            }

            root.classList.remove("hidden");
            new Stepper(root, {
                blockCount: blocks.length,
                buildSteps: DecryptionSteps.build({
                    lines,
                    result,
                    d: state.keys.d,
                    encBlocks: state.blocks,
                    original: state.encryptedText
                })
            }).render();
        } catch (err) {
            info.textContent = "";
            root.classList.add("hidden");
            statusEl.innerHTML = `<span class="badge-error">Errore: ${Fmt.escapeHtml(err.message)}</span>`;
        }
    }

    // --- Event Listeners ---
    $("btn-random-key").addEventListener("click", () => setKeys(null));
    $("btn-use-key").addEventListener("click", () => {
        const raw = $("input-d").value.trim();
        if (!/^\d+$/.test(raw)) {
            $("key-status").textContent = "Errore: inserisci un intero positivo";
            return;
        }
        setKeys(raw);
    });
    $("input-d").addEventListener("keydown", e => {
        if (e.key === "Enter") $("btn-use-key").click();
    });
    $("btn-encrypt").addEventListener("click", encryptMessage);
    $("btn-decrypt").addEventListener("click", decryptMessage);

    // Modal
    const helpModal = $("help-modal");
    $("btn-help").addEventListener("click", () => helpModal.classList.remove("hidden"));
    document.querySelector(".close-modal").addEventListener("click", () => helpModal.classList.add("hidden"));
    window.addEventListener("click", e => {
        if (e.target === helpModal) helpModal.classList.add("hidden");
    });

    // Boot
    renderCurveParams();
    setKeys(null);
});
