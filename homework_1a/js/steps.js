/*
 * steps.js
 * Step-by-step view of key generation, encryption, and decryption.
 *
 * Contains:
 *   - Fmt:        small formatting helpers (hex, bytes, value rows)
 *   - Stepper:    generic component displaying a sequence of numbered steps,
 *                 with forward/backward navigation and block selection
 *   - KeyGenSteps / EncryptionSteps / DecryptionSteps: build each step's content
 *                 from the intermediate values returned by ecc.js
 */

// =========================================================
// FORMATTING
// =========================================================
const Fmt = (() => {
    const byteHex = b => b.toString(16).padStart(2, "0");

    // Hexadecimal without leading zero padding
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

    // Makes spaces, newlines, and tabs visible in the character grid
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
        if (P === null) return row(name, "O (point at infinity)", cls);
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

    // Tag indicating who knows the value computed in the step
    function tag(kind) {
        const map = {
            pub: ["tag-pub", "public"],
            sec: ["tag-sec", "secret"],
            shared: ["tag-sec", "shared secret"],
            local: ["tag-local", "local computation"]
        };
        const [cls, text] = map[kind];
        return `<span class="tag ${cls}">${text}</span>`;
    }

    // Slope of the secant line between two distinct points (shown in addition steps)
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
// Displays one step at a time. Steps are rebuilt whenever
// the selected block changes, via the buildSteps(block) function.
class Stepper {
    constructor(root, { blockCount, buildSteps, label }) {
        this.root = root;
        this.blockCount = blockCount || 1;
        this.buildSteps = buildSteps;
        this.label = label || "";
        this.block = 0;
        this.step = 0;
        this.showAll = false;

        // Single listener for the entire component (event delegation)
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
            ? `<div class="block-tabs"><span class="block-tabs-label">Block:</span>${Array.from({ length: this.blockCount }, (_, i) =>
                `<button type="button" class="block-tab ${i === this.block ? "active" : ""}" data-block="${i}">${i + 1}</button>`
            ).join("")}</div>`
            : (this.label ? `<div class="block-tabs"><span class="block-tabs-label">${this.label}</span></div>` : `<div></div>`);

        const head = `<div class="process-head">${tabs}
            <button type="button" class="btn btn-small" data-act="all">${this.showAll ? "One step at a time" : "Show all steps"}</button>
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
            <button type="button" class="btn" data-act="prev" ${this.step === 0 ? "disabled" : ""}>&lsaquo; Back</button>
            <span class="step-count">Step ${this.step + 1} of ${steps.length}</span>
            <button type="button" class="btn btn-primary" data-act="next" ${this.step === steps.length - 1 ? "disabled" : ""}>Next &rsaquo;</button>
        </div>`;

        this.root.innerHTML = head + nav + body + controls;
    }
}


// =========================================================
// KEY GENERATION STEPS (HOW Q IS CHOSEN)
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

            // --- Step 1: Choosing the private key d ---
            steps.push({
                short: "Key d",
                title: "Choosing the secret: the private key d",
                tag: Fmt.tag("sec"),
                body:
                    Fmt.desc(`The private key is not a geometric point, but a <b>single secret scalar integer</b> <i>d</i>.
                        Whoever holds <i>d</i> controls the cryptographic identity and can decrypt received messages.`) +
                    Fmt.values(
                        Fmt.row("Private key <i>d</i> (decimal)", Fmt.formatInt(d)) +
                        Fmt.row("Private key <i>d</i> (hexadecimal)", "0x" + d.toString(16)) +
                        Fmt.row("Binary representation", bits + "<sub>2</sub>") +
                        Fmt.row("Effective bit length", `${bitLen} bits`)
                    ) +
                    Fmt.desc(`<b>Why it is a Toy Scheme:</b> in this educational university assignment, <i>d</i> is restricted
                        to the small range [1, 50.000]. In the real secp256k1 standard, <i>d</i> is sampled
                        randomly in [1, <i>n</i> - 1], a space of about 2<sup>256</sup> &asymp; 1.15 &times; 10<sup>77</sup>
                        possible values, impossible to guess by brute force.`)
            });

            // --- Step 2: How Q is chosen (Q = d * G) ---
            steps.push({
                short: "Choosing Q",
                title: "How the public key is chosen: Q = d &sdot; G",
                tag: Fmt.tag("pub"),
                body:
                    Fmt.desc(`The public key <i>Q</i> is <b>not chosen at random</b> or generated independently.
                        It is deterministically derived as a point on the curve by multiplying the standard generator point <i>G</i> by the scalar <i>d</i>:`) +
                    Fmt.formula(`Q = d &middot; G = G + G + G + ... + G &nbsp; (d \\text{ times})`) +
                    Fmt.desc(`Geometrically, this means starting from the fixed point <i>G</i> and adding it to itself <i>d</i> times
                        using the Weierstrass group law: <i>y</i><sup>2</sup> &equiv; <i>x</i><sup>3</sup> + 7 (mod <i>p</i>).`) +
                    Fmt.values(
                        Fmt.point("Standard Base Point <i>G</i>", ECC.G) +
                        Fmt.row("Order <i>n</i> of <i>G</i>", "0x" + ECC.toHex(C.n)) +
                        Fmt.row("Group property", "<i>n</i> &middot; <i>G</i> = O (identity element at infinity)")
                    ) +
                    Fmt.note(`Point <i>G</i> is a global fixed constant defined by the SEC 2 cryptographic standard.
                        Since <i>G</i> is known to everyone, the public key <i>Q</i> is uniquely determined by the secret <i>d</i>.`)
            });

            // --- Step 3: Double-and-Add Algorithm ---
            let multiple = 0n;
            const traceRows = trace.map(t => {
                multiple = t.op === "init" ? 1n : multiple * 2n + (t.bit === "1" ? 1n : 0n);
                const label = t.op === "init" ? "R = G" : (t.op === "double" ? "R = 2R (tangent)" : "R = 2R + G (tangent + secant)");
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
                title: "Double-and-Add algorithm to compute Q = d &sdot; G",
                tag: Fmt.tag("local"),
                body:
                    Fmt.desc(`Performing <i>d</i> sequential additions (<i>G + G + G + ...</i>) would require ${Fmt.formatInt(d - 1n)} operations,
                        which is impractical for large numbers. The <b>Double-and-Add</b> algorithm uses the binary representation of <i>d</i> and requires
                        only O(log<sub>2</sub> <i>d</i>) steps:`) +
                    Fmt.formula(`d = (${bits})<sub>2</sub> &nbsp;&implies;&nbsp; ${doublesCount} doublings (Double) and ${addsCount} additions (Add)`) +
                    Fmt.desc(`We scan the bits of <i>d</i> from most significant (left) to least significant:
                        <ul>
                            <li><b>Double:</b> for each bit, double the current point (<i>R &larr; 2R</i>) using the <b>tangent</b> line with slope <i>s = (3x<sub>R</sub><sup>2</sup>) &middot; (2y<sub>R</sub>)<sup>-1</sup> mod p</i>.</li>
                            <li><b>Add:</b> if the current bit is 1, add <i>G</i> (<i>R &larr; R + G</i>) using the <b>secant</b> line with slope <i>s = (y<sub>G</sub> - y<sub>R</sub>) &middot; (x<sub>G</sub> - x<sub>R</sub>)<sup>-1</sup> mod p</i>.</li>
                        </ul>`) +
                    `<p class="small-text"><b>Trace of operations performed for d = ${d}:</b></p>` +
                    `<div class="table-scroll"><table class="trace-table">
                        <thead><tr><th>Step</th><th>Bit</th><th>Operation</th><th>Multiple</th><th>Partial <i>R.x</i></th></tr></thead>
                        <tbody>${traceRows}</tbody>
                    </table></div>` +
                    Fmt.note(`Thanks to Double-and-Add, computing <i>Q</i> took ${trace.length} iterations instead of ${d} sequential additions.`)
            });

            // --- Step 4: Final point Q and verification ---
            const ySq = ECC.mod(Q.y * Q.y);
            const rhs = ECC.curveRhs(Q.x);
            const isOn = ySq === rhs;
            steps.push({
                short: "Point Q",
                title: "Final point Q and curve equation verification",
                tag: Fmt.tag("pub"),
                body:
                    Fmt.desc(`The resulting point <i>Q = d &middot; G</i> is a pair of affine coordinates (<i>Q<sub>x</sub>, Q<sub>y</sub></i>)
                        in the 256-bit finite field &Fopf;<sub><i>p</i></sub>.`) +
                    Fmt.values(
                        Fmt.point("Public Key <i>Q</i>", Q, "result") +
                        Fmt.row("<i>Q<sub>y</sub></i><sup>2</sup> mod <i>p</i>", ECC.toHex(ySq)) +
                        Fmt.row("<i>Q<sub>x</sub></i><sup>3</sup> + 7 mod <i>p</i>", ECC.toHex(rhs))
                    ) +
                    Fmt.badge(isOn, "Q is on the curve (y^2 = x^3 + 7 mod p)", "Q is not on the curve!") +
                    Fmt.desc(`Any party can immediately verify that <i>Q</i> is a valid point on the curve
                        without needing to know the private key <i>d</i>.`)
            });

            // --- Step 5: SEC 1 compressed serialization ---
            const qc = ECC.compressPoint(Q);
            const isOdd = (Q.y & 1n) === 1n;
            steps.push({
                short: "Compression",
                title: "Standard compressed format for Q (SEC 1)",
                tag: Fmt.tag("pub"),
                body:
                    Fmt.desc(`To transmit or publish the public key <i>Q</i> (e.g., in a certificate or for addresses),
                        there is no need to send both 256-bit coordinates (32 + 32 = 64 bytes).
                        The curve is symmetric about the <i>x</i>-axis: given <i>x</i>, the cubic equation has only two roots:
                        <i>y</i> and <i>p - y</i>. Since <i>p</i> is odd, one root is always even and the other is odd.`) +
                    Fmt.formula(`\\text{Prefix} = \\begin{cases} 02 & \\text{if } Q_y \\text{ is even} \\\\ 03 & \\text{if } Q_y \\text{ is odd} \\end{cases}`) +
                    Fmt.values(
                        Fmt.row("Parity of <i>Q<sub>y</sub></i>", isOdd ? "Odd (last bit = 1)" : "Even (last bit = 0)") +
                        Fmt.row("SEC 1 prefix", `<mark>${qc.slice(0, 2)}</mark>`) +
                        Fmt.row("Compressed key (33 bytes / 66 hex chars)", `<mark>${qc.slice(0, 2)}</mark>${qc.slice(2)}`, "result")
                    ) +
                    Fmt.note(`Saves 49% of transmission space: 33 bytes instead of the 65 bytes of the uncompressed format (04 || Qx || Qy).`)
            });

            // --- Step 6: One-Way property and ECDLP ---
            steps.push({
                short: "ECDLP Security",
                title: "Asymmetry: One-Way Function (Trapdoor) and ECDLP",
                tag: Fmt.tag("pub"),
                body:
                    Fmt.desc(`Asymmetric cryptography relies on the computational asymmetry between <i>d</i> and <i>Q</i>:
                        <ul>
                            <li><b>Forward (<i>d &rarr; Q</i>):</b> computationally easy and almost instantaneous via Double-and-Add.</li>
                            <li><b>Backward (<i>Q &rarr; d</i>):</b> given only <i>Q</i> and knowing <i>G</i>, recovering the secret scalar <i>d</i>
                                is the <b>Elliptic Curve Discrete Logarithm Problem (ECDLP)</b>. There is no known point 'division' to recover <i>d</i>.</li>
                        </ul>`) +
                    Fmt.formula(`Q = d &middot; G \\quad \\text{[Easy]} \\qquad \\Longleftrightarrow \\qquad d = \\log_G(Q) \\quad \\text{[Intractable in general]}`) +
                    Fmt.desc(`<b>Why this is a weak 'Toy Scheme':</b>
                        In production cryptography, <i>d</i> is 256 bits long: trying every key would take longer than the age of the universe.
                        In this academic assignment, <i>d</i> &le; 50,000. Anyone who observes the public key <i>Q</i> can sequentially compute
                        <i>1G, 2G, 3G, ...</i> until finding an exact match with <i>Q</i> in fractions of a second in the browser.
                        The underlying math is real and accurate, but the small secret size makes it deliberately insecure.`)
            });

            return steps;
        };
    }
};


// =========================================================
// ENCRYPTION STEPS
// =========================================================
const EncryptionSteps = {
    // ctx = { text, blocks, Q, lines }
    // Returns a function that, given the block index, produces the steps.
    build(ctx) {
        const { text, blocks, lines } = ctx;
        const N = ECC.BLOCK_BYTES;
        const totalBytes = new TextEncoder().encode(text).length;

        return b => {
            const blk = blocks[b];
            const L = blk.data.length;
            const steps = [];

            // --- Step 1: text -> bytes (applies to all blocks) ---
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
                short: "Text to bytes",
                title: "From text to bytes (UTF-8)",
                tag: Fmt.tag("local"),
                global: true,
                body:
                    Fmt.desc(`Each character is converted into its UTF-8 bytes: plain ASCII letters take 1 byte,
                        accented or special characters take 2 or more. The message takes <b>${totalBytes} bytes</b> and is split into
                        <b>${blocks.length} ${blocks.length === 1 ? "block" : "blocks"}</b> of at most ${N} bytes each.
                        Each color represents a block; the selected one is highlighted.`) +
                    `<div class="char-grid">${grid}</div>`
            });

            // --- Step 2: block bytes -> integer m ---
            steps.push({
                short: "Block to m",
                title: `Block ${b + 1}: from bytes to integer <i>m</i>`,
                tag: Fmt.tag("local"),
                body:
                    Fmt.desc(`The sentinel byte <b>01</b> is prepended to the ${L} bytes of the block. During decryption,
                        it will be used to verify that the result is valid. The whole sequence is then interpreted as
                        a single number in base 256.`) +
                    `<div class="byte-line">${Fmt.bytes([ECC.BLOCK_PREFIX], "prefix")}${Fmt.bytes(blk.data)}</div>` +
                    `<p class="fragment">Block text: <span>"${Fmt.escapeHtml(Fmt.decode(blk.data))}"</span></p>` +
                    Fmt.formula(`m = 01 &middot; 256<sup>${L}</sup> + b<sub>1</sub> &middot; 256<sup>${L - 1}</sup> + ... + b<sub>${L}</sub>`) +
                    Fmt.values(
                        Fmt.row("<i>m</i> (hex)", Fmt.rawHex(blk.m)) +
                        Fmt.row("<i>m</i> (decimal)", blk.m.toString()) +
                        Fmt.row("size", `${blk.m.toString(2).length} bits`)
                    )
            });

            // --- Step 3: Koblitz encoding m -> point M ---
            const attemptsRows = blk.attempts.map(a => {
                const h = Fmt.rawHex(a.x);
                return `<tr>
                    <td>${a.j}</td>
                    <td class="mono hex-cell">${h.slice(0, -2)}<mark>${h.slice(-2)}</mark></td>
                    <td>${Fmt.badge(a.ok, "yes, point found", "no, try j + 1")}</td>
                </tr>`;
            }).join("");
            const ySq = ECC.mod(blk.M.y * blk.M.y);
            const rhs = ECC.curveRhs(blk.M.x);
            steps.push({
                short: "m to point M",
                title: "Koblitz encoding: from <i>m</i> to a curve point <i>M</i>",
                tag: Fmt.tag("local"),
                body:
                    Fmt.desc(`ElGamal on elliptic curves encrypts <b>points</b>, not numbers. We therefore need an
                        x-coordinate <i>x</i> that "embeds" <i>m</i> and for which <i>x</i><sup>3</sup> + 7 has a square root
                        modulo <i>p</i>. About half of the values work, so only a few attempts are needed.`) +
                    Fmt.formula(`x = m &middot; 256 + j, &nbsp;&nbsp; j = 0, 1, 2, ...`) +
                    Fmt.note(`Multiplying by 256 is equivalent to appending a trailing byte: the last two hexadecimal
                        digits of <i>x</i> (highlighted) are simply <i>j</i>.`) +
                    `<div class="table-scroll"><table class="trace-table attempts">
                        <thead><tr><th><i>j</i></th><th>Candidate x-coordinate <i>x</i></th><th>Is <i>x</i><sup>3</sup> + 7 a square?</th></tr></thead>
                        <tbody>${attemptsRows}</tbody>
                    </table></div>` +
                    Fmt.desc(`Since <i>p</i> &equiv; 3 (mod 4), the square root is computed directly as
                        <i>y</i> = (<i>x</i><sup>3</sup> + 7)<sup>(p+1)/4</sup> mod <i>p</i>.`) +
                    Fmt.values(
                        Fmt.point("<i>M</i>", blk.M) +
                        Fmt.row("<i>y</i><sup>2</sup> mod <i>p</i>", ECC.toHex(ySq)) +
                        Fmt.row("<i>x</i><sup>3</sup> + 7 mod <i>p</i>", ECC.toHex(rhs))
                    ) +
                    Fmt.badge(ySq === rhs, "M is on the curve", "M is not on the curve")
            });

            // --- Step 4: ephemeral nonce k ---
            steps.push({
                short: "Nonce k",
                title: "Choosing the ephemeral nonce <i>k</i>",
                tag: Fmt.tag("sec"),
                body:
                    Fmt.desc(`The sender picks a random integer <i>k</i> in [1, <i>n</i> - 1], fresh for each
                        block. It must remain secret and be discarded immediately afterward: anyone who knows <i>k</i> can compute
                        <i>k</i> &middot; <i>Q</i> and recover <i>M</i>.`) +
                    Fmt.values(
                        Fmt.row("<i>k</i> (hex)", ECC.toHex(blk.k)) +
                        Fmt.row("<i>k</i> (decimal)", blk.k.toString()) +
                        Fmt.row("size", `${blk.k.toString(2).length} bits`)
                    ) +
                    Fmt.note(`A fresh <i>k</i> for every block ensures that encrypting the same message twice
                        produces different ciphertexts.`)
            });

            // --- Step 5: C1 = k * G ---
            const kBits = blk.k.toString(2);
            const kOnes = kBits.split("1").length - 1;
            steps.push({
                short: "C1 = kG",
                title: "First component: <i>C</i><sub>1</sub> = <i>k</i> &middot; <i>G</i>",
                tag: Fmt.tag("pub"),
                body:
                    Fmt.desc(`The generator <i>G</i> is multiplied by <i>k</i> using Double-and-Add.
                        <i>k</i> has ${kBits.length} bits, of which ${kOnes} are 1: this requires
                        ${kBits.length - 1} doublings and ${kOnes - 1} additions.`) +
                    Fmt.formula(`C<sub>1</sub> = k &middot; G`) +
                    Fmt.values(Fmt.point("<i>G</i>", ECC.G) + Fmt.point("<i>C</i><sub>1</sub>", blk.C1, "result")) +
                    Fmt.note(`<i>C</i><sub>1</sub> is transmitted. By itself it does not reveal <i>k</i>: recovering it from
                        <i>C</i><sub>1</sub> and <i>G</i> is the discrete logarithm problem, and here <i>k</i> is
                        chosen from about 2<sup>256</sup> values.`)
            });

            // --- Step 6: shared secret S = k * Q ---
            steps.push({
                short: "S = kQ",
                title: "Shared secret: <i>S</i> = <i>k</i> &middot; <i>Q</i>",
                tag: Fmt.tag("shared"),
                body:
                    Fmt.desc(`The sender multiplies the recipient's public key <i>Q</i> by the same
                        <i>k</i>. The point <i>S</i> acts as a "mask" to hide <i>M</i> and is never
                        transmitted.`) +
                    Fmt.formula(`S = k &middot; Q = k &middot; (d &middot; G)`) +
                    Fmt.values(Fmt.point("<i>Q</i>", ctx.Q) + Fmt.point("<i>S</i>", blk.S, "result")) +
                    Fmt.note(`The recipient will be able to recompute the same <i>S</i> as <i>d</i> &middot;
                        <i>C</i><sub>1</sub>, without knowing <i>k</i>.`)
            });

            // --- Step 7: C2 = M + S ---
            const s = Fmt.slope(blk.M, blk.S);
            steps.push({
                short: "C2 = M + S",
                title: "Second component: <i>C</i><sub>2</sub> = <i>M</i> + <i>S</i>",
                tag: Fmt.tag("pub"),
                body:
                    Fmt.desc(`The message point and the shared secret are added using the secant rule
                        (the two points are distinct).`) +
                    Fmt.formula(`s = (y<sub>S</sub> - y<sub>M</sub>) &middot; (x<sub>S</sub> - x<sub>M</sub>)<sup>-1</sup> mod p`) +
                    Fmt.formula(`x<sub>C2</sub> = s<sup>2</sup> - x<sub>M</sub> - x<sub>S</sub>, &nbsp;&nbsp;
                        y<sub>C2</sub> = s(x<sub>M</sub> - x<sub>C2</sub>) - y<sub>M</sub> &nbsp; (mod p)`) +
                    Fmt.values(
                        Fmt.point("<i>M</i>", blk.M) +
                        Fmt.point("<i>S</i>", blk.S) +
                        (s !== null ? Fmt.row("slope <i>s</i>", ECC.toHex(s)) : "") +
                        Fmt.point("<i>C</i><sub>2</sub>", blk.C2, "result")
                    ) +
                    Fmt.note(`Without <i>S</i>, the point <i>C</i><sub>2</sub> looks like a random point on the
                        curve and reveals nothing about <i>M</i>.`)
            });

            // --- Step 8: serialization ---
            const c1 = ECC.compressPoint(blk.C1);
            const c2 = ECC.compressPoint(blk.C2);
            const allLines = lines.map((l, i) =>
                `<div class="cipher-line ${i === b ? "sel" : ""}"><span class="cipher-idx">${i + 1}</span><span class="mono">${l}</span></div>`
            ).join("");
            steps.push({
                short: "Ciphertext",
                title: "Encrypted block (<i>C</i><sub>1</sub>, <i>C</i><sub>2</sub>) in compressed form",
                tag: Fmt.tag("pub"),
                body:
                    Fmt.desc(`Each point is written with only <i>x</i> plus a prefix: <b>02</b> if <i>y</i> is even,
                        <b>03</b> if it is odd. From <i>x</i> the recipient derives two possible <i>y</i> values (one
                        even and one odd) and the prefix indicates which one to pick.`) +
                    Fmt.values(
                        Fmt.row("Compressed <i>C</i><sub>1</sub>", `<mark>${c1.slice(0, 2)}</mark>${c1.slice(2)}`) +
                        Fmt.row("Compressed <i>C</i><sub>2</sub>", `<mark>${c2.slice(0, 2)}</mark>${c2.slice(2)}`)
                    ) +
                    Fmt.desc(`Full ciphertext (line ${b + 1} is this block):`) +
                    `<div class="cipher-lines">${allLines}</div>` +
                    Fmt.note(`Only <i>C</i><sub>1</sub> and <i>C</i><sub>2</sub> are transmitted. The values <i>k</i>,
                        <i>S</i>, and <i>M</i> stay with the sender and are discarded.`)
            });

            return steps;
        };
    }
};


// =========================================================
// DECRYPTION STEPS
// =========================================================
const DecryptionSteps = {
    // ctx = { lines, result, d, encBlocks, original }
    // encBlocks (if present) is used only to compare values against the sender's.
    build(ctx) {
        const { lines, result, d, encBlocks, original } = ctx;
        const p = ECC.CURVE.p;

        // Compare with sender only if the ciphertext matches the last encryption
        const sameCipher = encBlocks && encBlocks.length === result.details.length &&
            encBlocks.every((e, i) => ECC.compressPoint(e.C1) + ECC.compressPoint(e.C2) === lines[i]);

        return b => {
            const blk = result.details[b];
            const ref = sameCipher ? encBlocks[b] : null;
            const steps = [];

            // --- Step 1: reading the block ---
            const line = lines[b];
            steps.push({
                short: "Read",
                title: `Block ${b + 1}: reading <i>C</i><sub>1</sub> and <i>C</i><sub>2</sub>`,
                tag: Fmt.tag("pub"),
                body:
                    Fmt.desc(`The recipient takes line ${b + 1} of the ciphertext and splits it in half: the first 66
                        characters are <i>C</i><sub>1</sub>, and the remaining 66 are <i>C</i><sub>2</sub>.`) +
                    `<div class="cipher-split">
                        <div><span class="split-label"><i>C</i><sub>1</sub></span><span class="mono"><mark>${line.slice(0, 2)}</mark>${line.slice(2, 66)}</span></div>
                        <div><span class="split-label"><i>C</i><sub>2</sub></span><span class="mono"><mark>${line.slice(66, 68)}</mark>${line.slice(68)}</span></div>
                    </div>`
            });

            // --- Step 2: decompression ---
            const decompressInfo = (name, hex, P) => {
                const odd = hex.slice(0, 2) === "03";
                const y0 = ECC.modSqrt(ECC.curveRhs(P.x));
                const flipped = y0 !== P.y;
                return Fmt.row(`${name}.x`, ECC.toHex(P.x)) +
                    Fmt.row(`root <i>y</i><sub>0</sub>`, ECC.toHex(y0)) +
                    Fmt.row(`${name}.y`, ECC.toHex(P.y), "result") +
                    `<div class="val-explain">Prefix ${hex.slice(0, 2)}: ${odd ? "odd" : "even"} <i>y</i> needed.
                        ${flipped ? `<i>y</i><sub>0</sub> is not, so we take <i>p</i> - <i>y</i><sub>0</sub>.` : `<i>y</i><sub>0</sub> already matches.`}</div>`;
            };
            steps.push({
                short: "Decompression",
                title: "Reconstructing the <i>y</i>-coordinates",
                tag: Fmt.tag("local"),
                body:
                    Fmt.desc(`For each point, compute <i>x</i><sup>3</sup> + 7 and take its square root
                        modulo <i>p</i>. The prefix tells which of the two roots to use.`) +
                    Fmt.formula(`y<sub>0</sub> = (x<sup>3</sup> + 7)<sup>(p+1)/4</sup> mod p, &nbsp;&nbsp; y = y<sub>0</sub> or p - y<sub>0</sub>`) +
                    Fmt.values(decompressInfo("<i>C</i><sub>1</sub>", line.slice(0, 66), blk.C1)) +
                    Fmt.values(decompressInfo("<i>C</i><sub>2</sub>", line.slice(66), blk.C2))
            });

            // --- Step 3: S = d * C1 ---
            const dBits = d.toString(2);
            const dOnes = dBits.split("1").length - 1;
            const sOk = ref ? (blk.S && ref.S.x === blk.S.x && ref.S.y === blk.S.y) : null;
            steps.push({
                short: "S = dC1",
                title: "Recomputing the secret: <i>S</i> = <i>d</i> &middot; <i>C</i><sub>1</sub>",
                tag: Fmt.tag("shared"),
                body:
                    Fmt.desc(`Only the recipient knows <i>d</i>. By multiplying <i>C</i><sub>1</sub> by
                        <i>d</i>, they obtain the exact same point <i>S</i> computed by the sender, without ever seeing
                        <i>k</i>.`) +
                    Fmt.formula(`d &middot; C<sub>1</sub> = d &middot; (k &middot; G) = k &middot; (d &middot; G) = k &middot; Q = S`) +
                    Fmt.values(
                        Fmt.row("<i>d</i>", `${Fmt.formatInt(d)} = ${dBits}<sub>2</sub>`) +
                        Fmt.point("<i>S</i>", blk.S, "result")
                    ) +
                    (sOk === null ? "" : Fmt.badge(sOk,
                        "Matches the secret S computed by the sender",
                        "Differs from the sender's secret: wrong private key")) +
                    Fmt.note(`<i>d</i> has only ${dBits.length} bits: ${dBits.length - 1} doublings and
                        ${dOnes - 1} additions suffice. This is also the weakness of the scheme: an attacker can try
                        all values from 1 to 50,000 until <i>d</i> &middot; <i>G</i> matches <i>Q</i>.`)
            });

            // --- Step 4: negation of S ---
            steps.push({
                short: "Negate -S",
                title: "Negation of the secret: -<i>S</i>",
                tag: Fmt.tag("local"),
                body:
                    Fmt.desc(`On the curve, subtracting a point means adding its opposite, i.e., its reflection
                        across the <i>x</i>-axis: <i>x</i> stays the same, while <i>y</i> flips sign.`) +
                    Fmt.formula(`-S = (x<sub>S</sub>, p - y<sub>S</sub>)`) +
                    Fmt.values(
                        Fmt.row("<i>S</i>.y", blk.S ? ECC.toHex(blk.S.y) : "O") +
                        Fmt.row("-<i>S</i>.y = <i>p</i> - <i>S</i>.y", blk.negS ? ECC.toHex(blk.negS.y) : "O", "result")
                    )
            });

            // --- Step 5: M = C2 + (-S) ---
            const s = Fmt.slope(blk.C2, blk.negS);
            const mOk = ref ? (blk.M && ref.M.x === blk.M.x && ref.M.y === blk.M.y) : null;
            steps.push({
                short: "M = C2 - S",
                title: "Recovering the point: <i>M</i> = <i>C</i><sub>2</sub> + (-<i>S</i>)",
                tag: Fmt.tag("local"),
                body:
                    Fmt.desc(`Removing the mask <i>S</i> from <i>C</i><sub>2</sub> brings back the message point.
                        Here too, the secant rule is used.`) +
                    Fmt.formula(`C<sub>2</sub> - S = (M + S) - S = M`) +
                    Fmt.formula(`s = (y<sub>-S</sub> - y<sub>C2</sub>) &middot; (x<sub>-S</sub> - x<sub>C2</sub>)<sup>-1</sup> mod p`) +
                    Fmt.values(
                        Fmt.point("<i>C</i><sub>2</sub>", blk.C2) +
                        Fmt.point("-<i>S</i>", blk.negS) +
                        (s !== null ? Fmt.row("slope <i>s</i>", ECC.toHex(s)) : "") +
                        Fmt.point("<i>M</i>", blk.M, "result")
                    ) +
                    (mOk === null ? "" : Fmt.badge(mOk,
                        "Matches the point M encoded by the sender",
                        "Differs from the sender's point M"))
            });

            // --- Step 6: M -> m ---
            const xh = blk.M ? Fmt.rawHex(blk.M.x) : "";
            steps.push({
                short: "M to m",
                title: "From point <i>M</i> to integer <i>m</i>",
                tag: Fmt.tag("local"),
                body:
                    Fmt.desc(`Invert the Koblitz encoding: dividing by 256 strips the last byte
                        of <i>x</i>, which is the counter <i>j</i> used to find the point. The <i>y</i>-coordinate is not needed.`) +
                    Fmt.formula(`m = &lfloor; x<sub>M</sub> / 256 &rfloor;`) +
                    (blk.M ? Fmt.values(
                        Fmt.row("<i>M</i>.x", `${xh.slice(0, -2)}<del>${xh.slice(-2)}</del>`) +
                        Fmt.row("Discarded <i>j</i>", (blk.M.x % ECC.KOBLITZ_K).toString()) +
                        Fmt.row("<i>m</i> (hex)", Fmt.rawHex(blk.m), "result")
                    ) : Fmt.badge(false, "", "M is the point at infinity: block cannot be decrypted"))
            });

            // --- Step 7: m -> bytes ---
            steps.push({
                short: "m to bytes",
                title: "From integer <i>m</i> to block bytes",
                tag: Fmt.tag("local"),
                body:
                    Fmt.desc(`Write <i>m</i> in base 256 to recover the bytes. The first byte must be the
                        sentinel <b>01</b>: if it is not, the resulting point <i>M</i> is random and the wrong
                        key was used.`) +
                    `<div class="byte-line">${blk.chunk.length ? Fmt.bytes(blk.chunk.slice(0, 1), blk.valid ? "prefix" : "bad") + Fmt.bytes(blk.data) : ""}</div>` +
                    Fmt.badge(blk.valid, "Sentinel 01 present: valid block", "Sentinel missing: invalid block") +
                    `<p class="fragment">Block text: <span>"${Fmt.escapeHtml(Fmt.decode(blk.data))}"</span></p>`
            });

            // --- Step 8: reassembly (all blocks) ---
            const allBytes = result.details.map((x, i) =>
                `<span class="blk-group blk-${i % 4} ${i === b ? "sel" : ""}">${Fmt.bytes(x.data)}</span>`
            ).join("");
            steps.push({
                short: "Message",
                title: "Message reassembly",
                tag: Fmt.tag("local"),
                global: true,
                body:
                    Fmt.desc(`The bytes of all blocks, without the sentinels, are concatenated in order and
                        converted back to text using UTF-8 decoding.`) +
                    `<div class="byte-line wrap">${allBytes}</div>` +
                    `<div class="plain-result">${Fmt.escapeHtml(result.text)}</div>` +
                    (original !== null
                        ? Fmt.badge(result.valid && result.text === original,
                            "Decrypted text matches the original",
                            "Decrypted text does not match the original")
                        : "")
            });

            return steps;
        };
    }
};
