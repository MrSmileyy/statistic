/*
 * steps.js
 * Vista "passo per passo" della cifratura e della decifratura.
 *
 * Contiene:
 *   - Fmt:        piccole funzioni di formattazione (esadecimali, byte, righe di valori)
 *   - Stepper:    componente generico che mostra una sequenza di passi numerati,
 *                 con navigazione avanti/indietro e selezione del blocco
 *   - EncryptionSteps / DecryptionSteps: costruiscono il contenuto di ogni passo
 *                 a partire dai valori intermedi restituiti da ecc.js
 */

// =========================================================
// FORMATTAZIONE
// =========================================================
const Fmt = (() => {
    const byteHex = b => b.toString(16).padStart(2, "0");

    // Esadecimale senza zeri iniziali di riempimento
    const rawHex = v => v.toString(16);

    function shortHex(v, head = 8, tail = 6) {
        const h = typeof v === "bigint" ? ECC.toHex(v) : v;
        return h.length <= head + tail + 3 ? h : `${h.slice(0, head)}...${h.slice(-tail)}`;
    }

    function formatInt(v) {
        return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
    }

    // Rende visibili spazi e a capo nella griglia dei caratteri
    function showChar(ch) {
        if (ch === " ") return "&#9251;";
        if (ch === "\n") return "&#8629;";
        if (ch === "\t") return "&#8677;";
        return escapeHtml(ch);
    }

    function bytes(list, cls = "") {
        return list.map(b => `<span class="byte ${cls}">${byteHex(b)}</span>`).join("");
    }

    function decode(list) {
        return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(list));
    }

    function row(label, value, cls = "") {
        return `<div class="val-row ${cls}"><span class="val-label">${label}</span><span class="val mono">${value}</span></div>`;
    }

    function point(name, P, cls = "") {
        if (P === null) return row(name, "O (punto all'infinito)", cls);
        return row(`${name}.x`, ECC.toHex(P.x), cls) + row(`${name}.y`, ECC.toHex(P.y), cls);
    }

    function values(html) {
        return `<div class="val-box">${html}</div>`;
    }

    function formula(html) {
        return `<div class="formula">${html}</div>`;
    }

    function desc(html) {
        return `<p class="step-desc">${html}</p>`;
    }

    function note(html) {
        return `<p class="step-note">${html}</p>`;
    }

    function badge(ok, textOk, textKo) {
        return ok
            ? `<span class="badge-result">${textOk}</span>`
            : `<span class="badge-error">${textKo}</span>`;
    }

    // Etichetta che dice chi conosce il valore calcolato nel passo
    function tag(kind) {
        const map = {
            pub: ["tag-pub", "pubblico"],
            sec: ["tag-sec", "segreto"],
            shared: ["tag-sec", "segreto condiviso"],
            local: ["tag-local", "calcolo locale"]
        };
        const [cls, text] = map[kind];
        return `<span class="tag ${cls}">${text}</span>`;
    }

    // Pendenza della secante tra due punti distinti (per mostrarla nei passi di somma)
    function slope(P, Q) {
        if (!P || !Q || P.x === Q.x) return null;
        return ECC.mod((Q.y - P.y) * ECC.modInverse(Q.x - P.x));
    }

    return {
        byteHex, rawHex, shortHex, formatInt, escapeHtml, showChar, bytes, decode,
        row, point, values, formula, desc, note, badge, tag, slope
    };
})();


// =========================================================
// STEPPER
// =========================================================
// Mostra un passo alla volta. I passi vengono ricostruiti ogni volta che
// cambia il blocco selezionato, tramite la funzione buildSteps(blocco).
class Stepper {
    constructor(root, { blockCount, buildSteps, label }) {
        this.root = root;
        this.blockCount = blockCount || 1;
        this.buildSteps = buildSteps;
        this.label = label || "";
        this.block = 0;
        this.step = 0;
        this.showAll = false;

        // Un solo listener per tutto il componente (event delegation)
        this.root.onclick = e => {
            const target = e.target.closest("[data-step], [data-block], [data-act]");
            if (!target) return;
            if (target.dataset.step !== undefined) this.step = Number(target.dataset.step);
            if (target.dataset.block !== undefined) this.block = Number(target.dataset.block);
            if (target.dataset.act === "prev") this.step--;
            if (target.dataset.act === "next") this.step++;
            if (target.dataset.act === "all") this.showAll = !this.showAll;
            this.render();
        };
    }

    render() {
        const steps = this.buildSteps(this.block);
        this.step = Math.max(0, Math.min(this.step, steps.length - 1));

        const tabs = this.blockCount > 1
            ? `<div class="block-tabs"><span class="block-tabs-label">Blocco:</span>${Array.from({ length: this.blockCount }, (_, i) =>
                `<button type="button" class="block-tab ${i === this.block ? "active" : ""}" data-block="${i}">${i + 1}</button>`
            ).join("")}</div>`
            : (this.label ? `<div class="block-tabs"><span class="block-tabs-label">${this.label}</span></div>` : `<div></div>`);

        const head = `<div class="process-head">${tabs}
            <button type="button" class="btn btn-small" data-act="all">${this.showAll ? "Un passo alla volta" : "Mostra tutti i passi"}</button>
        </div>`;

        const nav = `<ol class="step-nav">${steps.map((s, i) => {
            const cls = this.showAll ? "" : (i < this.step ? "done" : (i === this.step ? "active" : ""));
            return `<li class="${cls}" data-step="${i}"><span class="num">${i + 1}</span><span class="lbl">${s.short}</span></li>`;
        }).join("")}</ol>`;

        const visible = this.showAll ? steps.map((s, i) => [s, i]) : [[steps[this.step], this.step]];
        const body = visible.map(([s, i]) => `
            <article class="step-card ${s.global ? "global" : ""}">
                <header class="step-head">
                    <span class="step-num">${i + 1}</span>
                    <h4>${s.title}</h4>
                    ${s.tag || ""}
                </header>
                ${s.body}
            </article>`).join("");

        const controls = this.showAll ? "" : `<div class="step-controls">
            <button type="button" class="btn" data-act="prev" ${this.step === 0 ? "disabled" : ""}>&lsaquo; Indietro</button>
            <span class="step-count">Passo ${this.step + 1} di ${steps.length}</span>
            <button type="button" class="btn btn-primary" data-act="next" ${this.step === steps.length - 1 ? "disabled" : ""}>Avanti &rsaquo;</button>
        </div>`;

        this.root.innerHTML = head + nav + body + controls;
    }
}


// =========================================================
// PASSI DELLA GENERAZIONE CHIAVI (COME VIENE SCELTA Q)
// =========================================================
const KeyGenSteps = {
    // ctx = { d, Q, trace, ms }
    build(ctx) {
        const { d, Q, trace, ms } = ctx;
        const C = ECC.CURVE;
        const bits = d.toString(2);
        const bitLen = bits.length;
        const onesCount = bits.split("1").length - 1;
        const doublesCount = bitLen - 1;
        const addsCount = onesCount - 1;

        return () => {
            const steps = [];

            // --- Passo 1: Scelta della chiave privata d ---
            steps.push({
                short: "Chiave d",
                title: "Scelta del segreto: la chiave privata d",
                tag: Fmt.tag("sec"),
                body:
                    Fmt.desc(`La chiave privata non è un punto geometrico, ma un <b>singolo numero intero scalare segreto</b> <i>d</i>.
                        Chi possiede <i>d</i> detiene il controllo dell'identità crittografica e può decifrare i messaggi ricevuti.`) +
                    Fmt.values(
                        Fmt.row("Chiave privata <i>d</i> (decimale)", Fmt.formatInt(d)) +
                        Fmt.row("Chiave privata <i>d</i> (esadecimale)", "0x" + d.toString(16)) +
                        Fmt.row("Rappresentazione binaria", bits + "<sub>2</sub>") +
                        Fmt.row("Dimensione effettiva", `${bitLen} bit`)
                    ) +
                    Fmt.desc(`<b>Perché è un Toy Scheme:</b> in questo assignment universitario didattico, <i>d</i> viene forzato
                        nell'intervallo ridotto [1, 50.000]. Nello standard secp256k1 reale, <i>d</i> viene estratto
                        casualmente nell'intervallo [1, <i>n</i> - 1], con uno spazio di circa 2<sup>256</sup> &asymp; 1.15 &times; 10<sup>77</sup>
                        possibili valori, impossibile da indovinare per tentativi.`)
            });

            // --- Passo 2: Come viene scelta Q (Q = d * G) ---
            steps.push({
                short: "Scelta di Q",
                title: "Come viene scelta la chiave pubblica: Q = d &sdot; G",
                tag: Fmt.tag("pub"),
                body:
                    Fmt.desc(`La chiave pubblica <i>Q</i> <b>non viene estratta a caso</b> né generata in modo indipendente.
                        È determinata in modo deterministico come punto della curva moltiplicando il punto generatore standard <i>G</i> per lo scalare <i>d</i>:`) +
                    Fmt.formula(`Q = d &middot; G = G + G + G + ... + G &nbsp; (d \\text{ volte})`) +
                    Fmt.desc(`Geometricamente, significa partire dal punto fisso <i>G</i> e sommarlo a se stesso <i>d</i> volte
                        applicando la legge di gruppo della forma di Weierstrass: <i>y</i><sup>2</sup> &equiv; <i>x</i><sup>3</sup> + 7 (mod <i>p</i>).`) +
                    Fmt.values(
                        Fmt.point("Punto Base standard <i>G</i>", ECC.G) +
                        Fmt.row("Ordine <i>n</i> di <i>G</i>", "0x" + ECC.toHex(C.n)) +
                        Fmt.row("Proprietà di gruppo", "<i>n</i> &middot; <i>G</i> = O (elemento neutro all'infinito)")
                    ) +
                    Fmt.note(`Il punto <i>G</i> è una costante fissa globale definita dallo standard crittografico SEC 2.
                        Poiché <i>G</i> è noto a tutti, la chiave pubblica <i>Q</i> è univocamente determinata dal segreto <i>d</i>.`)
            });

            // --- Passo 3: Algoritmo Double-and-Add ---
            let multiple = 0n;
            const traceRows = trace.map(t => {
                multiple = t.op === "init" ? 1n : multiple * 2n + (t.bit === "1" ? 1n : 0n);
                const label = t.op === "init" ? "R = G" : (t.op === "double" ? "R = 2R (tangente)" : "R = 2R + G (tangente + secante)");
                return `<tr class="${t.op === "double+add" ? "row-add" : ""}">
                    <td>${t.step}</td>
                    <td class="mono">${t.bit}</td>
                    <td>${label}</td>
                    <td>${multiple}G</td>
                    <td class="mono">${Fmt.shortHex(t.R.x, 10, 8)}</td>
                </tr>`;
            }).join("");

            steps.push({
                short: "Double-and-Add",
                title: "Algoritmo Double-and-Add per calcolare Q = d &sdot; G",
                tag: Fmt.tag("local"),
                body:
                    Fmt.desc(`Eseguire <i>d</i> somme sequenziali (<i>G + G + G + ...</i>) richiederebbe ${Fmt.formatInt(d - 1n)} operazioni,
                        impraticabile con numeri grandi. L'algoritmo <b>Double-and-Add</b> sfrutta la scrittura binaria di <i>d</i> e richiede
                        soltanto O(log<sub>2</sub> <i>d</i>) passi:`) +
                    Fmt.formula(`d = (${bits})<sub>2</sub> &nbsp;&implies;&nbsp; ${doublesCount} raddoppi (Double) e ${addsCount} addizioni (Add)`) +
                    Fmt.desc(`Si scorrono i bit di <i>d</i> dal più significativo (a sinistra) al meno significativo:
                        <ul>
                            <li><b>Double (Raddoppio):</b> per ogni bit si raddoppia il punto corrente (<i>R &larr; 2R</i>), tracciando la retta <b>tangente</b> alla curva con pendenza <i>s = (3x<sub>R</sub><sup>2</sup>) &middot; (2y<sub>R</sub>)<sup>-1</sup> mod p</i>.</li>
                            <li><b>Add (Addizione):</b> se il bit corrente vale 1, si somma <i>G</i> (<i>R &larr; R + G</i>), tracciando la retta <b>secante</b> con pendenza <i>s = (y<sub>G</sub> - y<sub>R</sub>) &middot; (x<sub>G</sub> - x<sub>R</sub>)<sup>-1</sup> mod p</i>.</li>
                        </ul>`) +
                    `<p class="small-text"><b>Traccia delle operazioni eseguite per d = ${d}:</b></p>` +
                    `<div class="table-scroll"><table class="trace-table">
                        <thead><tr><th>Passo</th><th>Bit</th><th>Operazione</th><th>Multiplo</th><th><i>R.x</i> parziale</th></tr></thead>
                        <tbody>${traceRows}</tbody>
                    </table></div>` +
                    Fmt.note(`Grazie al Double-and-Add, il calcolo di <i>Q</i> ha richiesto ${trace.length} iterazioni invece di ${d} addizioni sequenziali.`)
            });

            // --- Passo 4: Punto finale Q e verifica ---
            const ySq = ECC.mod(Q.y * Q.y);
            const rhs = ECC.curveRhs(Q.x);
            const isOn = ySq === rhs;
            steps.push({
                short: "Punto Q",
                title: "Punto finale Q e verifica dell'equazione della curva",
                tag: Fmt.tag("pub"),
                body:
                    Fmt.desc(`Il punto risultante <i>Q = d &middot; G</i> è una coppia di coordinate affini (<i>Q<sub>x</sub>, Q<sub>y</sub></i>)
                        appartenente al campo finito &Fopf;<sub><i>p</i></sub> a 256 bit.`) +
                    Fmt.values(
                        Fmt.point("Chiave Pubblica <i>Q</i>", Q, "result") +
                        Fmt.row("<i>Q<sub>y</sub></i><sup>2</sup> mod <i>p</i>", ECC.toHex(ySq)) +
                        Fmt.row("<i>Q<sub>x</sub></i><sup>3</sup> + 7 mod <i>p</i>", ECC.toHex(rhs))
                    ) +
                    Fmt.badge(isOn, "Q appartiene alla curva (y^2 = x^3 + 7 mod p)", "Q non appartiene alla curva!") +
                    Fmt.desc(`Qualsiasi interlocutore può verificare istantaneamente che <i>Q</i> è un punto valido sulla curva
                        senza dover conoscere la chiave privata <i>d</i>.`)
            });

            // --- Passo 5: Serializzazione compressa SEC 1 ---
            const qc = ECC.compressPoint(Q);
            const isOdd = (Q.y & 1n) === 1n;
            steps.push({
                short: "Compressione",
                title: "Formato standard compresso di Q (SEC 1)",
                tag: Fmt.tag("pub"),
                body:
                    Fmt.desc(`Per trasmettere o pubblicare la chiave pubblica <i>Q</i> (es. in un certificato o per gli indirizzi),
                        non occorre inviare entrambe le coordinate a 256 bit (32 + 32 = 64 byte).
                        La curva è simmetrica rispetto all'asse <i>x</i>: data l'ascissa <i>x</i>, l'equazione cubica ha solo due radici:
                        <i>y</i> e <i>p - y</i>. Essendo <i>p</i> dispari, una è sempre pari e l'altra è dispari.`) +
                    Fmt.formula(`\\text{Prefisso} = \\begin{cases} 02 & \\text{se } Q_y \\text{ è pari} \\\\ 03 & \\text{se } Q_y \\text{ è dispari} \\end{cases}`) +
                    Fmt.values(
                        Fmt.row("Parità di <i>Q<sub>y</sub></i>", isOdd ? "Dispari (ultimo bit = 1)" : "Pari (ultimo bit = 0)") +
                        Fmt.row("Prefisso SEC 1", `<mark>${qc.slice(0, 2)}</mark>`) +
                        Fmt.row("Chiave compressa (33 byte / 66 caratteri hex)", `<mark>${qc.slice(0, 2)}</mark>${qc.slice(2)}`, "result")
                    ) +
                    Fmt.note(`Risparmio del 49% sullo spazio di trasmissione: 33 byte invece dei 65 byte del formato non compresso (04 || Qx || Qy).`)
            });

            // --- Passo 6: Proprietà One-Way ed ECDLP ---
            steps.push({
                short: "Sicurezza ECDLP",
                title: "Asimmetria: funzione unidirezionale (Trapdoor) ed ECDLP",
                tag: Fmt.tag("pub"),
                body:
                    Fmt.desc(`La crittografia a chiave asimmetrica si basa sull'asimmetria di calcolo tra <i>d</i> e <i>Q</i>:
                        <ul>
                            <li><b>Andata (<i>d &rarr; Q</i>):</b> è computazionalmente facile e quasi istantanea tramite l'algoritmo Double-and-Add.</li>
                            <li><b>Ritorno (<i>Q &rarr; d</i>):</b> dato solo <i>Q</i> e noto <i>G</i>, risalire al moltiplicatore segreto <i>d</i>
                                è il <b>Problema del Logaritmo Discreto su Curve Ellittiche (ECDLP)</b>. Non esiste alcuna 'divisione' di punti nota per ricavare <i>d</i>.</li>
                        </ul>`) +
                    Fmt.formula(`Q = d &middot; G \\quad \\text{[Facile]} \\qquad \\Longleftrightarrow \\qquad d = \\log_G(Q) \\quad \\text{[Intrattabile in generale]}`) +
                    Fmt.desc(`<b>Perché questo schema è un 'Toy Scheme' debole:</b>
                        In crittografia di produzione, <i>d</i> ha 256 bit: provare tutte le chiavi richiederebbe più tempo dell'età dell'universo.
                        In questo assignment accademico, <i>d</i> &le; 50.000. Chiunque osservi la chiave pubblica <i>Q</i> può calcolare in sequenza
                        <i>1G, 2G, 3G, ...</i> fino a trovare una corrispondenza esatta con <i>Q</i> in frazioni di secondo nel browser.
                        La matematica usata è reale e accurata, ma la ridotta dimensione del segreto la rende deliberatamente insicura.`)
            });

            return steps;
        };
    }
};


// =========================================================
// PASSI DELLA CIFRATURA
// =========================================================
const EncryptionSteps = {
    // ctx = { text, blocks, Q, lines }
    // Restituisce una funzione che, dato l'indice del blocco, produce i passi.
    build(ctx) {
        const { text, blocks, lines } = ctx;
        const N = ECC.BLOCK_BYTES;
        const totalBytes = new TextEncoder().encode(text).length;

        return b => {
            const blk = blocks[b];
            const L = blk.data.length;
            const steps = [];

            // --- Passo 1: testo -> byte (vale per tutti i blocchi) ---
            const enc = new TextEncoder();
            let idx = 0;
            let grid = "";
            for (const ch of text) {
                const bs = Array.from(enc.encode(ch));
                const owner = Math.floor(idx / N);
                idx += bs.length;
                grid += `<span class="char-cell blk-${owner % 4} ${owner === b ? "sel" : ""}">
                    <span class="ch">${Fmt.showChar(ch)}</span>
                    <span class="bh">${bs.map(Fmt.byteHex).join(" ")}</span>
                </span>`;
            }
            steps.push({
                short: "Testo in byte",
                title: "Dal testo ai byte (UTF-8)",
                tag: Fmt.tag("local"),
                global: true,
                body:
                    Fmt.desc(`Ogni carattere viene convertito nei suoi byte UTF-8: le lettere semplici occupano 1 byte,
                        quelle accentate 2 o più. Il messaggio occupa <b>${totalBytes} byte</b> e viene diviso in
                        <b>${blocks.length} ${blocks.length === 1 ? "blocco" : "blocchi"}</b> da al massimo ${N} byte.
                        Ogni colore è un blocco; quello selezionato è evidenziato.`) +
                    `<div class="char-grid">${grid}</div>`
            });

            // --- Passo 2: byte del blocco -> intero m ---
            steps.push({
                short: "Blocco in m",
                title: `Blocco ${b + 1}: dai byte all'intero <i>m</i>`,
                tag: Fmt.tag("local"),
                body:
                    Fmt.desc(`Davanti ai ${L} byte del blocco si aggiunge il byte sentinella <b>01</b>. In decifratura
                        servirà a controllare che il risultato sia corretto. Poi tutta la sequenza viene letta come
                        un unico numero scritto in base 256.`) +
                    `<div class="byte-line">${Fmt.bytes([ECC.BLOCK_PREFIX], "prefix")}${Fmt.bytes(blk.data)}</div>` +
                    `<p class="fragment">Testo del blocco: <span>"${Fmt.escapeHtml(Fmt.decode(blk.data))}"</span></p>` +
                    Fmt.formula(`m = 01 &middot; 256<sup>${L}</sup> + b<sub>1</sub> &middot; 256<sup>${L - 1}</sup> + ... + b<sub>${L}</sub>`) +
                    Fmt.values(
                        Fmt.row("<i>m</i> (hex)", Fmt.rawHex(blk.m)) +
                        Fmt.row("<i>m</i> (decimale)", blk.m.toString()) +
                        Fmt.row("dimensione", `${blk.m.toString(2).length} bit`)
                    )
            });

            // --- Passo 3: codifica di Koblitz m -> punto M ---
            const attemptsRows = blk.attempts.map(a => {
                const h = Fmt.rawHex(a.x);
                return `<tr>
                    <td>${a.j}</td>
                    <td class="mono hex-cell">${h.slice(0, -2)}<mark>${h.slice(-2)}</mark></td>
                    <td>${Fmt.badge(a.ok, "sì, punto trovato", "no, si prova j + 1")}</td>
                </tr>`;
            }).join("");
            const ySq = ECC.mod(blk.M.y * blk.M.y);
            const rhs = ECC.curveRhs(blk.M.x);
            steps.push({
                short: "m in punto M",
                title: "Codifica di Koblitz: da <i>m</i> a un punto <i>M</i> della curva",
                tag: Fmt.tag("local"),
                body:
                    Fmt.desc(`ElGamal su curve ellittiche cifra <b>punti</b>, non numeri. Serve quindi un'ascissa
                        <i>x</i> che "contenga" <i>m</i> e per cui <i>x</i><sup>3</sup> + 7 abbia una radice quadrata
                        modulo <i>p</i>. Circa metà dei valori funziona, quindi bastano pochi tentativi.`) +
                    Fmt.formula(`x = m &middot; 256 + j, &nbsp;&nbsp; j = 0, 1, 2, ...`) +
                    Fmt.note(`Moltiplicare per 256 equivale ad aggiungere un byte in coda: le ultime due cifre
                        esadecimali di <i>x</i> (evidenziate) sono proprio <i>j</i>.`) +
                    `<div class="table-scroll"><table class="trace-table attempts">
                        <thead><tr><th><i>j</i></th><th>Ascissa candidata <i>x</i></th><th><i>x</i><sup>3</sup> + 7 è un quadrato?</th></tr></thead>
                        <tbody>${attemptsRows}</tbody>
                    </table></div>` +
                    Fmt.desc(`Poiché <i>p</i> &equiv; 3 (mod 4), la radice si calcola direttamente come
                        <i>y</i> = (<i>x</i><sup>3</sup> + 7)<sup>(p+1)/4</sup> mod <i>p</i>.`) +
                    Fmt.values(
                        Fmt.point("<i>M</i>", blk.M) +
                        Fmt.row("<i>y</i><sup>2</sup> mod <i>p</i>", ECC.toHex(ySq)) +
                        Fmt.row("<i>x</i><sup>3</sup> + 7 mod <i>p</i>", ECC.toHex(rhs))
                    ) +
                    Fmt.badge(ySq === rhs, "M appartiene alla curva", "M non appartiene alla curva")
            });

            // --- Passo 4: nonce effimero k ---
            steps.push({
                short: "Nonce k",
                title: "Scelta del nonce effimero <i>k</i>",
                tag: Fmt.tag("sec"),
                body:
                    Fmt.desc(`Il mittente sceglie un intero casuale <i>k</i> in [1, <i>n</i> - 1], diverso per ogni
                        blocco. Deve restare segreto e va scartato subito dopo: chi conosce <i>k</i> può calcolare
                        <i>k</i> &middot; <i>Q</i> e quindi recuperare <i>M</i>.`) +
                    Fmt.values(
                        Fmt.row("<i>k</i> (hex)", ECC.toHex(blk.k)) +
                        Fmt.row("<i>k</i> (decimale)", blk.k.toString()) +
                        Fmt.row("dimensione", `${blk.k.toString(2).length} bit`)
                    ) +
                    Fmt.note(`Un <i>k</i> nuovo per ogni blocco fa sì che lo stesso messaggio, cifrato due volte,
                        produca cifrati diversi.`)
            });

            // --- Passo 5: C1 = k * G ---
            const kBits = blk.k.toString(2);
            const kOnes = kBits.split("1").length - 1;
            steps.push({
                short: "C1 = kG",
                title: "Primo componente: <i>C</i><sub>1</sub> = <i>k</i> &middot; <i>G</i>",
                tag: Fmt.tag("pub"),
                body:
                    Fmt.desc(`Si moltiplica il generatore <i>G</i> per <i>k</i> con il Double-and-Add.
                        <i>k</i> ha ${kBits.length} bit, di cui ${kOnes} a 1: servono quindi
                        ${kBits.length - 1} raddoppi e ${kOnes - 1} addizioni.`) +
                    Fmt.formula(`C<sub>1</sub> = k &middot; G`) +
                    Fmt.values(Fmt.point("<i>G</i>", ECC.G) + Fmt.point("<i>C</i><sub>1</sub>", blk.C1, "result")) +
                    Fmt.note(`<i>C</i><sub>1</sub> viene trasmesso. Da solo non rivela <i>k</i>: ricavarlo da
                        <i>C</i><sub>1</sub> e <i>G</i> è il problema del logaritmo discreto, e qui <i>k</i> è
                        scelto tra circa 2<sup>256</sup> valori.`)
            });

            // --- Passo 6: segreto condiviso S = k * Q ---
            steps.push({
                short: "S = kQ",
                title: "Segreto condiviso: <i>S</i> = <i>k</i> &middot; <i>Q</i>",
                tag: Fmt.tag("shared"),
                body:
                    Fmt.desc(`Il mittente moltiplica la chiave pubblica <i>Q</i> del destinatario per lo stesso
                        <i>k</i>. Il punto <i>S</i> farà da "maschera" per nascondere <i>M</i> e non viene mai
                        trasmesso.`) +
                    Fmt.formula(`S = k &middot; Q = k &middot; (d &middot; G)`) +
                    Fmt.values(Fmt.point("<i>Q</i>", ctx.Q) + Fmt.point("<i>S</i>", blk.S, "result")) +
                    Fmt.note(`Il destinatario potrà ricalcolare lo stesso <i>S</i> come <i>d</i> &middot;
                        <i>C</i><sub>1</sub>, senza conoscere <i>k</i>.`)
            });

            // --- Passo 7: C2 = M + S ---
            const s = Fmt.slope(blk.M, blk.S);
            steps.push({
                short: "C2 = M + S",
                title: "Secondo componente: <i>C</i><sub>2</sub> = <i>M</i> + <i>S</i>",
                tag: Fmt.tag("pub"),
                body:
                    Fmt.desc(`Si sommano il punto del messaggio e il segreto condiviso con la regola della secante
                        (i due punti sono distinti).`) +
                    Fmt.formula(`s = (y<sub>S</sub> - y<sub>M</sub>) &middot; (x<sub>S</sub> - x<sub>M</sub>)<sup>-1</sup> mod p`) +
                    Fmt.formula(`x<sub>C2</sub> = s<sup>2</sup> - x<sub>M</sub> - x<sub>S</sub>, &nbsp;&nbsp;
                        y<sub>C2</sub> = s(x<sub>M</sub> - x<sub>C2</sub>) - y<sub>M</sub> &nbsp; (mod p)`) +
                    Fmt.values(
                        Fmt.point("<i>M</i>", blk.M) +
                        Fmt.point("<i>S</i>", blk.S) +
                        (s !== null ? Fmt.row("pendenza <i>s</i>", ECC.toHex(s)) : "") +
                        Fmt.point("<i>C</i><sub>2</sub>", blk.C2, "result")
                    ) +
                    Fmt.note(`Senza <i>S</i>, il punto <i>C</i><sub>2</sub> appare come un punto qualsiasi della
                        curva e non dice nulla su <i>M</i>.`)
            });

            // --- Passo 8: serializzazione ---
            const c1 = ECC.compressPoint(blk.C1);
            const c2 = ECC.compressPoint(blk.C2);
            const allLines = lines.map((l, i) =>
                `<div class="cipher-line ${i === b ? "sel" : ""}"><span class="cipher-idx">${i + 1}</span><span class="mono">${l}</span></div>`
            ).join("");
            steps.push({
                short: "Cifrato",
                title: "Blocco cifrato (<i>C</i><sub>1</sub>, <i>C</i><sub>2</sub>) in forma compressa",
                tag: Fmt.tag("pub"),
                body:
                    Fmt.desc(`Ogni punto si scrive con la sola <i>x</i> più un prefisso: <b>02</b> se <i>y</i> è pari,
                        <b>03</b> se è dispari. Dalla <i>x</i> il destinatario ricava due possibili <i>y</i> (una
                        pari e una dispari) e il prefisso indica quale scegliere.`) +
                    Fmt.values(
                        Fmt.row("<i>C</i><sub>1</sub> compresso", `<mark>${c1.slice(0, 2)}</mark>${c1.slice(2)}`) +
                        Fmt.row("<i>C</i><sub>2</sub> compresso", `<mark>${c2.slice(0, 2)}</mark>${c2.slice(2)}`)
                    ) +
                    Fmt.desc(`Cifrato completo (la riga ${b + 1} è questo blocco):`) +
                    `<div class="cipher-lines">${allLines}</div>` +
                    Fmt.note(`Viaggiano solo <i>C</i><sub>1</sub> e <i>C</i><sub>2</sub>. I valori <i>k</i>,
                        <i>S</i> e <i>M</i> restano al mittente e vengono scartati.`)
            });

            return steps;
        };
    }
};


// =========================================================
// PASSI DELLA DECIFRATURA
// =========================================================
const DecryptionSteps = {
    // ctx = { lines, result, d, encBlocks, original }
    // encBlocks (se presente) serve solo per confrontare i valori con quelli del mittente.
    build(ctx) {
        const { lines, result, d, encBlocks, original } = ctx;
        const p = ECC.CURVE.p;

        // Confronto con il mittente solo se il cifrato corrisponde all'ultima cifratura
        const sameCipher = encBlocks && encBlocks.length === result.details.length &&
            encBlocks.every((e, i) => ECC.compressPoint(e.C1) + ECC.compressPoint(e.C2) === lines[i]);

        return b => {
            const blk = result.details[b];
            const ref = sameCipher ? encBlocks[b] : null;
            const steps = [];

            // --- Passo 1: lettura del blocco ---
            const line = lines[b];
            steps.push({
                short: "Lettura",
                title: `Blocco ${b + 1}: lettura di <i>C</i><sub>1</sub> e <i>C</i><sub>2</sub>`,
                tag: Fmt.tag("pub"),
                body:
                    Fmt.desc(`Il destinatario prende la riga ${b + 1} del cifrato e la divide a metà: i primi 66
                        caratteri sono <i>C</i><sub>1</sub>, gli altri 66 sono <i>C</i><sub>2</sub>.`) +
                    `<div class="cipher-split">
                        <div><span class="split-label"><i>C</i><sub>1</sub></span><span class="mono"><mark>${line.slice(0, 2)}</mark>${line.slice(2, 66)}</span></div>
                        <div><span class="split-label"><i>C</i><sub>2</sub></span><span class="mono"><mark>${line.slice(66, 68)}</mark>${line.slice(68)}</span></div>
                    </div>`
            });

            // --- Passo 2: decompressione ---
            const decompressInfo = (name, hex, P) => {
                const odd = hex.slice(0, 2) === "03";
                const y0 = ECC.modSqrt(ECC.curveRhs(P.x));
                const flipped = y0 !== P.y;
                return Fmt.row(`${name}.x`, ECC.toHex(P.x)) +
                    Fmt.row(`radice <i>y</i><sub>0</sub>`, ECC.toHex(y0)) +
                    Fmt.row(`${name}.y`, ECC.toHex(P.y), "result") +
                    `<div class="val-explain">Prefisso ${hex.slice(0, 2)}: serve <i>y</i> ${odd ? "dispari" : "pari"}.
                        ${flipped ? `<i>y</i><sub>0</sub> non lo è, quindi si prende <i>p</i> - <i>y</i><sub>0</sub>.` : `<i>y</i><sub>0</sub> va già bene.`}</div>`;
            };
            steps.push({
                short: "Decompressione",
                title: "Ricostruzione delle coordinate <i>y</i>",
                tag: Fmt.tag("local"),
                body:
                    Fmt.desc(`Per ogni punto si calcola <i>x</i><sup>3</sup> + 7 e se ne estrae la radice
                        quadrata modulo <i>p</i>. Il prefisso dice quale delle due radici usare.`) +
                    Fmt.formula(`y<sub>0</sub> = (x<sup>3</sup> + 7)<sup>(p+1)/4</sup> mod p, &nbsp;&nbsp; y = y<sub>0</sub> oppure p - y<sub>0</sub>`) +
                    Fmt.values(decompressInfo("<i>C</i><sub>1</sub>", line.slice(0, 66), blk.C1)) +
                    Fmt.values(decompressInfo("<i>C</i><sub>2</sub>", line.slice(66), blk.C2))
            });

            // --- Passo 3: S = d * C1 ---
            const dBits = d.toString(2);
            const dOnes = dBits.split("1").length - 1;
            const sOk = ref ? (blk.S && ref.S.x === blk.S.x && ref.S.y === blk.S.y) : null;
            steps.push({
                short: "S = dC1",
                title: "Ricalcolo del segreto: <i>S</i> = <i>d</i> &middot; <i>C</i><sub>1</sub>",
                tag: Fmt.tag("shared"),
                body:
                    Fmt.desc(`Solo il destinatario conosce <i>d</i>. Moltiplicando <i>C</i><sub>1</sub> per
                        <i>d</i> ottiene lo stesso punto <i>S</i> calcolato dal mittente, senza aver mai visto
                        <i>k</i>.`) +
                    Fmt.formula(`d &middot; C<sub>1</sub> = d &middot; (k &middot; G) = k &middot; (d &middot; G) = k &middot; Q = S`) +
                    Fmt.values(
                        Fmt.row("<i>d</i>", `${Fmt.formatInt(d)} = ${dBits}<sub>2</sub>`) +
                        Fmt.point("<i>S</i>", blk.S, "result")
                    ) +
                    (sOk === null ? "" : Fmt.badge(sOk,
                        "Coincide con il segreto S calcolato dal mittente",
                        "Diverso dal segreto del mittente: la chiave privata è sbagliata")) +
                    Fmt.note(`<i>d</i> ha solo ${dBits.length} bit: bastano ${dBits.length - 1} raddoppi e
                        ${dOnes - 1} addizioni. È anche il punto debole dello schema: un attaccante può provare
                        tutti i valori da 1 a 50.000 finché <i>d</i> &middot; <i>G</i> non coincide con <i>Q</i>.`)
            });

            // --- Passo 4: opposto di S ---
            steps.push({
                short: "Opposto -S",
                title: "Opposto del segreto: -<i>S</i>",
                tag: Fmt.tag("local"),
                body:
                    Fmt.desc(`Sulla curva sottrarre un punto significa sommarne l'opposto, cioè la sua riflessione
                        rispetto all'asse <i>x</i>: la <i>x</i> resta uguale, la <i>y</i> cambia segno.`) +
                    Fmt.formula(`-S = (x<sub>S</sub>, p - y<sub>S</sub>)`) +
                    Fmt.values(
                        Fmt.row("<i>S</i>.y", blk.S ? ECC.toHex(blk.S.y) : "O") +
                        Fmt.row("-<i>S</i>.y = <i>p</i> - <i>S</i>.y", blk.negS ? ECC.toHex(blk.negS.y) : "O", "result")
                    )
            });

            // --- Passo 5: M = C2 + (-S) ---
            const s = Fmt.slope(blk.C2, blk.negS);
            const mOk = ref ? (blk.M && ref.M.x === blk.M.x && ref.M.y === blk.M.y) : null;
            steps.push({
                short: "M = C2 - S",
                title: "Recupero del punto: <i>M</i> = <i>C</i><sub>2</sub> + (-<i>S</i>)",
                tag: Fmt.tag("local"),
                body:
                    Fmt.desc(`Togliendo la maschera <i>S</i> da <i>C</i><sub>2</sub> si torna al punto del messaggio.
                        Anche qui si usa la regola della secante.`) +
                    Fmt.formula(`C<sub>2</sub> - S = (M + S) - S = M`) +
                    Fmt.formula(`s = (y<sub>-S</sub> - y<sub>C2</sub>) &middot; (x<sub>-S</sub> - x<sub>C2</sub>)<sup>-1</sup> mod p`) +
                    Fmt.values(
                        Fmt.point("<i>C</i><sub>2</sub>", blk.C2) +
                        Fmt.point("-<i>S</i>", blk.negS) +
                        (s !== null ? Fmt.row("pendenza <i>s</i>", ECC.toHex(s)) : "") +
                        Fmt.point("<i>M</i>", blk.M, "result")
                    ) +
                    (mOk === null ? "" : Fmt.badge(mOk,
                        "Coincide con il punto M codificato dal mittente",
                        "Diverso dal punto M del mittente"))
            });

            // --- Passo 6: M -> m ---
            const xh = blk.M ? Fmt.rawHex(blk.M.x) : "";
            steps.push({
                short: "M in m",
                title: "Dal punto <i>M</i> all'intero <i>m</i>",
                tag: Fmt.tag("local"),
                body:
                    Fmt.desc(`Si inverte la codifica di Koblitz: dividere per 256 significa togliere l'ultimo byte
                        di <i>x</i>, cioè il contatore <i>j</i> usato per trovare il punto. La <i>y</i> non serve.`) +
                    Fmt.formula(`m = &lfloor; x<sub>M</sub> / 256 &rfloor;`) +
                    (blk.M ? Fmt.values(
                        Fmt.row("<i>M</i>.x", `${xh.slice(0, -2)}<del>${xh.slice(-2)}</del>`) +
                        Fmt.row("<i>j</i> scartato", (blk.M.x % ECC.KOBLITZ_K).toString()) +
                        Fmt.row("<i>m</i> (hex)", Fmt.rawHex(blk.m), "result")
                    ) : Fmt.badge(false, "", "M è il punto all'infinito: blocco non decifrabile"))
            });

            // --- Passo 7: m -> byte ---
            steps.push({
                short: "m in byte",
                title: "Dall'intero <i>m</i> ai byte del blocco",
                tag: Fmt.tag("local"),
                body:
                    Fmt.desc(`Si scrive <i>m</i> in base 256 per riottenere i byte. Il primo deve essere la
                        sentinella <b>01</b>: se non lo è, il punto <i>M</i> ottenuto è casuale e la chiave
                        usata non è quella giusta.`) +
                    `<div class="byte-line">${blk.chunk.length ? Fmt.bytes(blk.chunk.slice(0, 1), blk.valid ? "prefix" : "bad") + Fmt.bytes(blk.data) : ""}</div>` +
                    Fmt.badge(blk.valid, "Sentinella 01 presente: blocco valido", "Sentinella assente: blocco non valido") +
                    `<p class="fragment">Testo del blocco: <span>"${Fmt.escapeHtml(Fmt.decode(blk.data))}"</span></p>`
            });

            // --- Passo 8: ricomposizione (tutti i blocchi) ---
            const allBytes = result.details.map((x, i) =>
                `<span class="blk-group blk-${i % 4} ${i === b ? "sel" : ""}">${Fmt.bytes(x.data)}</span>`
            ).join("");
            steps.push({
                short: "Messaggio",
                title: "Ricomposizione del messaggio",
                tag: Fmt.tag("local"),
                global: true,
                body:
                    Fmt.desc(`I byte di tutti i blocchi, senza le sentinelle, vengono concatenati nell'ordine e
                        riconvertiti in testo con la decodifica UTF-8.`) +
                    `<div class="byte-line wrap">${allBytes}</div>` +
                    `<div class="plain-result">${Fmt.escapeHtml(result.text)}</div>` +
                    (original !== null
                        ? Fmt.badge(result.valid && result.text === original,
                            "Il testo decifrato coincide con l'originale",
                            "Il testo decifrato non coincide con l'originale")
                        : "")
            });

            return steps;
        };
    }
};
