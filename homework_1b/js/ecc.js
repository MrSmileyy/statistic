/*
 * ecc.js
 * Modulo matematico per secp256k1 e Toy Scheme ECC.
 * Tutta l'aritmetica modulare e' implementata a mano tramite BigInt nativi.
 * Include anche la funzione di attacco a forza bruta all'ECDLP.
 */

const ECC = (() => {

    // 1. Parametri della curva secp256k1 (SEC 2)
    const CURVE = {
        p: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn,
        a: 0n,
        b: 7n,
        Gx: 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,
        Gy: 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n,
        n: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n,
        h: 1n
    };

    const G = { x: CURVE.Gx, y: CURVE.Gy };
    const INFINITY = null;

    // Spazio ristretto della chiave privata per il Toy Scheme
    const D_MIN = 1n;
    const D_MAX = 50000n;

    const KOBLITZ_K = 256n;
    const BLOCK_BYTES = 29;
    const BLOCK_PREFIX = 0x01;

    // 2. Aritmetica Modulare
    function mod(a, m = CURVE.p) {
        const r = a % m;
        return r >= 0n ? r : r + m;
    }

    function extendedEuclid(a, b) {
        let old_r = a, r = b;
        let old_s = 1n, s = 0n;
        let old_t = 0n, t = 1n;

        while (r !== 0n) {
            const q = old_r / r;
            [old_r, r] = [r, old_r - q * r];
            [old_s, s] = [s, old_s - q * s];
            [old_t, t] = [t, old_t - q * t];
        }
        return { gcd: old_r, x: old_s, y: old_t };
    }

    function modInverse(a, m = CURVE.p) {
        const aa = mod(a, m);
        if (aa === 0n) throw new Error("Inverso di 0 non definito");
        const { gcd, x } = extendedEuclid(aa, m);
        if (gcd !== 1n) throw new Error("Inverso modulare inesistente");
        return mod(x, m);
    }

    function modPow(base, exp, m = CURVE.p) {
        let result = 1n;
        base = mod(base, m);
        while (exp > 0n) {
            if (exp & 1n) result = (result * base) % m;
            base = (base * base) % m;
            exp >>= 1n;
        }
        return result;
    }

    function modSqrt(r) {
        const y = modPow(r, (CURVE.p + 1n) / 4n);
        return mod(y * y) === mod(r) ? y : null;
    }

    // 3. Geometria sulla Curva
    function curveRhs(x) {
        return mod(x * x * x + CURVE.a * x + CURVE.b);
    }

    function isOnCurve(P) {
        if (P === INFINITY) return true;
        return mod(P.y * P.y) === curveRhs(P.x);
    }

    function negate(P) {
        if (P === INFINITY) return INFINITY;
        return { x: P.x, y: mod(-P.y) };
    }

    function pointDouble(P) {
        if (P === INFINITY || P.y === 0n) return INFINITY;

        const num = mod(3n * P.x * P.x + CURVE.a);
        const den = modInverse(2n * P.y);
        const s = mod(num * den);

        const x3 = mod(s * s - 2n * P.x);
        const y3 = mod(s * (P.x - x3) - P.y);
        return { x: x3, y: y3 };
    }

    function pointAdd(P, Q) {
        if (P === INFINITY) return Q;
        if (Q === INFINITY) return P;

        if (P.x === Q.x) {
            if (P.y === Q.y) return pointDouble(P);
            return INFINITY;
        }

        const num = mod(Q.y - P.y);
        const den = modInverse(Q.x - P.x);
        const s = mod(num * den);

        const x3 = mod(s * s - P.x - Q.x);
        const y3 = mod(s * (P.x - x3) - P.y);
        return { x: x3, y: y3 };
    }

    // 4. Moltiplicazione Scalare (Double-and-Add)
    function scalarMult(k, P) {
        if (k < 0n) return scalarMult(-k, negate(P));
        if (k === 0n || P === INFINITY) return INFINITY;

        const bits = k.toString(2);
        let R = P;
        for (let i = 1; i < bits.length; i++) {
            R = pointDouble(R);
            if (bits[i] === "1") {
                R = pointAdd(R, P);
            }
        }
        return R;
    }

    // 5. Generazione Chiavi Toy Scheme
    function randomInRange(min, max) {
        const range = max - min + 1n;
        const bitLen = range.toString(2).length;
        const byteLen = Math.ceil(bitLen / 8);
        const mask = (1n << BigInt(bitLen)) - 1n;

        while (true) {
            const buf = new Uint8Array(byteLen);
            crypto.getRandomValues(buf);
            let r = 0n;
            for (const byte of buf) r = (r << 8n) | BigInt(byte);
            r &= mask;
            if (r < range) return min + r;
        }
    }

    function generateKeyPair(dInput = null) {
        let d;
        if (dInput === null) {
            d = randomInRange(D_MIN, D_MAX);
        } else {
            d = BigInt(dInput);
            if (d < D_MIN || d > D_MAX) {
                throw new Error(`La chiave privata deve essere compresa tra ${D_MIN} e ${D_MAX}`);
            }
        }
        const Q = scalarMult(d, G);
        return { d, Q };
    }

    // 6. Codifica di Koblitz e Cifratura EC-ElGamal
    function bytesToBigInt(bytes) {
        let r = 0n;
        for (const b of bytes) r = (r << 8n) | BigInt(b);
        return r;
    }

    function bigIntToBytes(v) {
        const out = [];
        while (v > 0n) {
            out.unshift(Number(v & 0xFFn));
            v >>= 8n;
        }
        return out;
    }

    function encodeToPoint(m) {
        for (let j = 0n; j < KOBLITZ_K; j++) {
            const x = m * KOBLITZ_K + j;
            const rhs = curveRhs(x);
            const y = modSqrt(rhs);
            if (y !== null) return { x, y, j };
        }
        throw new Error("Codifica di Koblitz fallita per il blocco");
    }

    function decodeFromPoint(M) {
        return M.x / KOBLITZ_K;
    }

    function textToBlocks(text) {
        const bytes = new TextEncoder().encode(text);
        const blocks = [];
        for (let i = 0; i < bytes.length; i += BLOCK_BYTES) {
            const data = Array.from(bytes.slice(i, i + BLOCK_BYTES));
            blocks.push({ data, m: bytesToBigInt([BLOCK_PREFIX, ...data]) });
        }
        return blocks;
    }

    function encrypt(text, Q) {
        if (!text) throw new Error("Il messaggio e' vuoto");
        if (!isOnCurve(Q)) throw new Error("Chiave pubblica non valida");

        return textToBlocks(text).map(({ data, m }) => {
            const M = encodeToPoint(m);
            const k = randomInRange(1n, CURVE.n - 1n);
            const C1 = scalarMult(k, G);
            const S = scalarMult(k, Q);
            const C2 = pointAdd({ x: M.x, y: M.y }, S);
            return { data, m, M, k, C1, S, C2 };
        });
    }

    function decryptBlock(C1, C2, d) {
        const S = scalarMult(d, C1);
        const negS = negate(S);
        const M = pointAdd(C2, negS);
        if (M === INFINITY) return { S, M, valid: false, data: [] };

        const m = decodeFromPoint(M);
        const chunk = bigIntToBytes(m);
        const valid = chunk[0] === BLOCK_PREFIX && chunk.length <= BLOCK_BYTES + 1;
        return { S, M, m, valid, data: chunk.slice(1) };
    }

    function decrypt(blocks, d) {
        const details = blocks.map(({ C1, C2 }) => ({ C1, C2, ...decryptBlock(C1, C2, d) }));
        const bytes = details.flatMap(b => b.data);
        const valid = details.every(b => b.valid);
        const text = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
        return { text, valid, details, bytes };
    }

    // 7. Serializzazione Punti
    function toHex(v, len = 64) {
        return v.toString(16).padStart(len, "0");
    }

    function compressPoint(P) {
        const prefix = (P.y & 1n) === 0n ? "02" : "03";
        return prefix + toHex(P.x);
    }

    function decompressPoint(hex) {
        if (!/^0[23][0-9a-fA-F]{64}$/.test(hex)) {
            throw new Error("Punto compresso non valido: " + hex.slice(0, 12) + "...");
        }
        const odd = hex.slice(0, 2) === "03";
        const x = BigInt("0x" + hex.slice(2));
        if (x >= CURVE.p) throw new Error("Ascissa fuori dal campo");

        let y = modSqrt(curveRhs(x));
        if (y === null) throw new Error("L'ascissa non appartiene alla curva");
        if (((y & 1n) === 1n) !== odd) y = CURVE.p - y;
        return { x, y };
    }

    function serializeCiphertext(blocks) {
        return blocks.map(b => compressPoint(b.C1) + compressPoint(b.C2)).join("\n");
    }

    function parseCiphertext(str) {
        const lines = str.split(/\s+/).filter(l => l.length > 0);
        if (lines.length === 0) throw new Error("Il cifrato e' vuoto");
        return lines.map(line => {
            if (line.length !== 132) throw new Error("Ogni blocco deve contenere 132 caratteri esadecimali");
            return {
                C1: decompressPoint(line.slice(0, 66)),
                C2: decompressPoint(line.slice(66))
            };
        });
    }

    // 8. Attacco a Forza Bruta (ECDLP Solver per Toy Scheme)
    // Sfrutta d in [1, 50.000]. Esegue addizioni iterative di G:
    // P_1 = G, P_2 = P_1 + G = 2G, P_3 = P_2 + G = 3G, ...
    // Evita di ricalcolare scalarMult da zero ogni volta, riducendo
    // il tempo da O(N log N) a O(N) addizioni di punti.
    // Include un callback opzionale per aggiornare la barra di progresso.
    async function bruteForceECDLP(targetQ, maxKey = D_MAX, onProgress = null) {
        const t0 = performance.now();
        let currentPoint = G;
        const batchSize = 1000n;
        let crackedD = null;
        let attempts = 0;

        for (let d = 1n; d <= maxKey; d++) {
            attempts++;
            if (currentPoint.x === targetQ.x && currentPoint.y === targetQ.y) {
                crackedD = d;
                break;
            }

            // Calcolo incrementale del punto successivo: (d+1)G = dG + G
            currentPoint = pointAdd(currentPoint, G);

            // Cede temporaneamente il controllo al rendering del browser
            if (onProgress && d % batchSize === 0n) {
                const percent = Number((d * 100n) / maxKey);
                const elapsedMs = performance.now() - t0;
                onProgress({ currentD: d, percent, elapsedMs, attempts });
                await new Promise(r => setTimeout(r, 0));
            }
        }

        const totalTimeMs = performance.now() - t0;
        return {
            found: crackedD !== null,
            privateKey: crackedD,
            attempts,
            timeMs: totalTimeMs,
            opsPerSec: totalTimeMs > 0 ? (attempts / (totalTimeMs / 1000)) : attempts
        };
    }

    return {
        CURVE, G, INFINITY, D_MIN, D_MAX, BLOCK_BYTES, BLOCK_PREFIX, KOBLITZ_K,
        mod, extendedEuclid, modInverse, modPow, modSqrt, curveRhs,
        isOnCurve, negate, pointAdd, pointDouble, scalarMult,
        randomInRange, generateKeyPair,
        textToBlocks, encodeToPoint, decodeFromPoint,
        encrypt, decrypt, decryptBlock,
        toHex, compressPoint, decompressPoint,
        serializeCiphertext, parseCiphertext,
        bruteForceECDLP
    };
})();
