/*
 * ecc.js
 * Toy scheme di crittografia su curve ellittiche basato su secp256k1.
 *
 * Tutta l'aritmetica usa i BigInt nativi di JavaScript: i numeri in gioco
 * hanno 256 bit, mentre il tipo Number e' preciso solo fino a 2^53.
 * Nessuna libreria crittografica esterna: ogni operazione e' scritta a mano.
 *
 * Contenuto del modulo:
 *   1. Parametri della curva secp256k1
 *   2. Aritmetica modulare (mod, Euclide esteso, inverso, potenza, radice)
 *   3. Legge di gruppo (addizione e raddoppio di punti)
 *   4. Moltiplicazione scalare (Double-and-Add)
 *   5. Generazione delle chiavi (con chiave privata volutamente debole)
 *   6. Codifica testo -> punti (metodo di Koblitz)
 *   7. Cifratura e decifratura EC-ElGamal
 *   8. Serializzazione dei punti (formato compresso)
 */

const ECC = (() => {

    // =========================================================
    // 1. PARAMETRI DELLA CURVA secp256k1
    // =========================================================
    // Equazione di Weierstrass: y^2 = x^3 + a*x + b (mod p)
    // Per secp256k1 si ha a = 0 e b = 7, quindi y^2 = x^3 + 7 (mod p).
    const CURVE = {
        // Primo del campo finito: p = 2^256 - 2^32 - 977
        p: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn,
        a: 0n,
        b: 7n,
        // Coordinate del punto generatore G (fissato dallo standard SEC 2)
        Gx: 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,
        Gy: 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n,
        // Ordine del sottogruppo generato da G: n * G = O
        n: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n,
        // Cofattore: #E(Fp) = h * n. Per secp256k1 vale 1.
        h: 1n
    };

    const G = { x: CURVE.Gx, y: CURVE.Gy };

    // Il punto all'infinito O (elemento neutro del gruppo) e' rappresentato con null.
    const INFINITY = null;

    // Range della chiave privata. In un sistema reale d sarebbe scelto
    // uniformemente in [1, n-1] (circa 2^256 valori). Qui lo limitiamo
    // di proposito a [1, 50000]: e' questo che rende lo schema un "toy".
    const D_MIN = 1n;
    const D_MAX = 50000n;

    // Parametri della codifica di Koblitz (vedi sezione 6)
    const KOBLITZ_K = 256n;     // tentativi disponibili per ogni blocco
    const BLOCK_BYTES = 29;     // byte di testo per blocco
    const BLOCK_PREFIX = 0x01;  // byte sentinella in testa a ogni blocco


    // =========================================================
    // 2. ARITMETICA MODULARE
    // =========================================================

    // Riduzione modulo m sempre non negativa.
    // In JS l'operatore % mantiene il segno del dividendo (-3n % 7n = -3n),
    // quindi si aggiunge m e si riduce di nuovo.
    function mod(a, m = CURVE.p) {
        const r = a % m;
        return r >= 0n ? r : r + m;
    }

    // Algoritmo di Euclide esteso (versione iterativa).
    // Restituisce { gcd, x, y } tali che a*x + b*y = gcd(a, b).
    // Ad ogni passo si mantiene l'invariante:
    //   old_r = a*old_s + b*old_t   e   r = a*s + b*t
    function extendedEuclid(a, b) {
        let old_r = a, r = b;
        let old_s = 1n, s = 0n;
        let old_t = 0n, t = 1n;

        while (r !== 0n) {
            const q = old_r / r; // divisione intera tra BigInt
            [old_r, r] = [r, old_r - q * r];
            [old_s, s] = [s, old_s - q * s];
            [old_t, t] = [t, old_t - q * t];
        }
        return { gcd: old_r, x: old_s, y: old_t };
    }

    // Inverso moltiplicativo modulare: trova x tale che a*x = 1 (mod m).
    // Da Euclide esteso: a*x + m*y = 1  ==>  a*x = 1 (mod m).
    // Esiste solo se gcd(a, m) = 1; con m primo vale per ogni a != 0.
    function modInverse(a, m = CURVE.p) {
        const aa = mod(a, m);
        if (aa === 0n) throw new Error("Inverso di 0 non definito");
        const { gcd, x } = extendedEuclid(aa, m);
        if (gcd !== 1n) throw new Error("Inverso modulare inesistente");
        return mod(x, m);
    }

    // Esponenziazione modulare con il metodo square-and-multiply.
    // E' la versione moltiplicativa dello stesso schema del Double-and-Add.
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

    // Radice quadrata modulare.
    // Poiche' per secp256k1 vale p = 3 (mod 4), se r e' un residuo quadratico
    // una radice e' y = r^((p+1)/4) mod p. Restituisce null se r non e' un quadrato.
    function modSqrt(r) {
        const y = modPow(r, (CURVE.p + 1n) / 4n);
        return mod(y * y) === mod(r) ? y : null;
    }


    // =========================================================
    // 3. LEGGE DI GRUPPO SULLA CURVA
    // =========================================================

    // Lato destro dell'equazione: x^3 + a*x + b (mod p)
    function curveRhs(x) {
        return mod(x * x * x + CURVE.a * x + CURVE.b);
    }

    // Verifica che il punto soddisfi y^2 = x^3 + 7 (mod p)
    function isOnCurve(P) {
        if (P === INFINITY) return true;
        return mod(P.y * P.y) === curveRhs(P.x);
    }

    // Opposto di un punto: -P = (x, -y). E' la riflessione rispetto all'asse x.
    function negate(P) {
        if (P === INFINITY) return INFINITY;
        return { x: P.x, y: mod(-P.y) };
    }

    // RADDOPPIO DI PUNTO: R = P + P = 2P
    // Si traccia la retta tangente alla curva in P. La sua pendenza si ottiene
    // derivando implicitamente y^2 = x^3 + ax + b:  2y dy = (3x^2 + a) dx
    //   s  = (3*x^2 + a) / (2*y)
    //   x3 = s^2 - 2*x
    //   y3 = s*(x - x3) - y
    // Il segno meno su y3 corrisponde alla riflessione del terzo punto
    // di intersezione tra la tangente e la curva.
    // Se y = 0 la tangente e' verticale e il risultato e' O.
    function pointDouble(P) {
        if (P === INFINITY || P.y === 0n) return INFINITY;

        const num = mod(3n * P.x * P.x + CURVE.a);
        const den = modInverse(2n * P.y);
        const s = mod(num * den);

        const x3 = mod(s * s - 2n * P.x);
        const y3 = mod(s * (P.x - x3) - P.y);
        return { x: x3, y: y3 };
    }

    // ADDIZIONE DI PUNTI: R = P + Q
    // Casi particolari:
    //   O + Q = Q,  P + O = P               (O e' l'elemento neutro)
    //   P + (-P) = O                         (retta verticale)
    //   P + P                                -> si usa il raddoppio
    // Caso generale (P != Q): retta secante per P e Q con pendenza
    //   s  = (yQ - yP) / (xQ - xP)
    //   x3 = s^2 - xP - xQ                   (dalle relazioni di Viete)
    //   y3 = s*(xP - x3) - yP                (riflessione del terzo punto)
    function pointAdd(P, Q) {
        if (P === INFINITY) return Q;
        if (Q === INFINITY) return P;

        if (P.x === Q.x) {
            if (P.y === Q.y) return pointDouble(P);
            return INFINITY; // P e Q sono uno l'opposto dell'altro
        }

        const num = mod(Q.y - P.y);
        const den = modInverse(Q.x - P.x);
        const s = mod(num * den);

        const x3 = mod(s * s - P.x - Q.x);
        const y3 = mod(s * (P.x - x3) - P.y);
        return { x: x3, y: y3 };
    }


    // =========================================================
    // 4. MOLTIPLICAZIONE SCALARE (DOUBLE-AND-ADD)
    // =========================================================
    // Calcola k * P = P + P + ... + P (k volte).
    // Sommare P a se stesso k volte richiederebbe k-1 addizioni, impraticabile
    // per k da 256 bit. Il Double-and-Add sfrutta la scrittura binaria di k:
    //
    //   k = (b_{m-1} ... b_1 b_0)_2
    //
    // Si scorrono i bit dal piu' significativo al meno significativo:
    //   R = P                       (corrisponde al bit iniziale, sempre 1)
    //   per ogni bit successivo b_i:
    //       R = 2R                  (DOUBLE: sposta tutto di una posizione)
    //       se b_i = 1: R = R + P   (ADD: aggiunge il contributo del bit)
    //
    // Esempio, k = 13 = 1101b:
    //   bit 1 -> R = P
    //   bit 1 -> R = 2P + P   = 3P
    //   bit 0 -> R = 6P
    //   bit 1 -> R = 12P + P  = 13P
    //
    // Costo: circa log2(k) raddoppi e (numero di bit a 1) addizioni,
    // quindi O(log k) operazioni invece di O(k).
    //
    // Se viene passato un array "trace", ogni passo viene registrato
    // per poterlo mostrare nell'interfaccia.
    function scalarMult(k, P, trace = null) {
        if (k < 0n) return scalarMult(-k, negate(P), trace);
        if (k === 0n || P === INFINITY) return INFINITY;

        const bits = k.toString(2);
        let R = P;
        if (trace) trace.push({ step: 0, bit: "1", op: "init", R });

        for (let i = 1; i < bits.length; i++) {
            R = pointDouble(R);
            let op = "double";
            if (bits[i] === "1") {
                R = pointAdd(R, P);
                op = "double+add";
            }
            if (trace) trace.push({ step: i, bit: bits[i], op, R });
        }
        return R;
    }


    // =========================================================
    // 5. GENERAZIONE DELLE CHIAVI
    // =========================================================

    // Intero casuale uniforme in [min, max], con campionamento a rifiuto
    // per evitare il bias del modulo. Usa il generatore del browser.
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

    // Ruolo delle chiavi:
    //   - chiave PRIVATA d: un intero segreto, noto solo al destinatario.
    //   - chiave PUBBLICA Q = d * G: un punto della curva, pubblicato.
    // Calcolare Q da d e' veloce (Double-and-Add). Il passaggio inverso,
    // cioe' ricavare d da Q e G, e' il Problema del Logaritmo Discreto su
    // curve ellittiche (ECDLP), ritenuto intrattabile quando d e' scelto
    // tra ~2^256 valori. Qui d sta in [1, 50000]: basta provare tutti i
    // valori uno per uno per romperlo, ed e' esattamente la debolezza voluta.
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

        const trace = [];
        const Q = scalarMult(d, G, trace);
        return { d, Q, trace };
    }


    // =========================================================
    // 6. CODIFICA TESTO -> PUNTI (METODO DI KOBLITZ)
    // =========================================================
    // ElGamal su curve ellittiche cifra PUNTI, non numeri. Serve quindi una
    // mappa reversibile dal messaggio a un punto della curva.
    //
    // Idea di Koblitz: dato un intero m, si provano le ascisse
    //   x = m*K + j    per j = 0, 1, ..., K-1
    // finche' x^3 + 7 non risulta un quadrato modulo p. Circa meta' degli
    // elementi di Fp sono quadrati, quindi in media bastano 2 tentativi e la
    // probabilita' di fallire con K = 256 e' circa 2^-256.
    // Per tornare indietro basta calcolare m = floor(x / K).
    //
    // Il testo viene convertito in byte UTF-8 e diviso in blocchi da 29 byte.
    // A ogni blocco si antepone il byte 0x01, cosi' eventuali zeri iniziali
    // non vanno persi e in decifratura si puo' controllare la correttezza.
    // 30 byte = 240 bit, e m*256 + 255 < 2^248 < p.

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

    // Restituisce il punto M e l'elenco dei tentativi fatti (utile per la didattica)
    function encodeToPoint(m) {
        const attempts = [];
        for (let j = 0n; j < KOBLITZ_K; j++) {
            const x = m * KOBLITZ_K + j;
            const rhs = curveRhs(x);
            const y = modSqrt(rhs);
            attempts.push({ j, x, rhs, ok: y !== null });
            if (y !== null) return { x, y, j, attempts };
        }
        throw new Error("Codifica di Koblitz fallita per il blocco");
    }

    function decodeFromPoint(M) {
        return M.x / KOBLITZ_K;
    }

    // Divide il testo in blocchi. Per ogni blocco restituisce i byte
    // originali e l'intero m ottenuto anteponendo il prefisso 0x01.
    function textToBlocks(text) {
        const bytes = new TextEncoder().encode(text);
        const blocks = [];
        for (let i = 0; i < bytes.length; i += BLOCK_BYTES) {
            const data = Array.from(bytes.slice(i, i + BLOCK_BYTES));
            blocks.push({ data, m: bytesToBigInt([BLOCK_PREFIX, ...data]) });
        }
        return blocks;
    }


    // =========================================================
    // 7. CIFRATURA E DECIFRATURA EC-ELGAMAL
    // =========================================================
    // CIFRATURA (usa solo la chiave pubblica Q del destinatario).
    // Per ogni blocco codificato come punto M:
    //   1. si sceglie un nonce effimero casuale k in [1, n-1]
    //   2. C1 = k * G      (permette al destinatario di ricostruire il segreto)
    //   3. S  = k * Q      (segreto condiviso, mai trasmesso)
    //   4. C2 = M + S      (il messaggio "mascherato" dal segreto)
    // Il cifrato e' la coppia (C1, C2). Usare un k diverso per ogni blocco
    // fa si' che lo stesso testo produca ogni volta un cifrato differente.
    // Ogni blocco restituito contiene tutti i valori intermedi, cosi'
    // l'interfaccia puo' mostrare il processo passo per passo.
    function encrypt(text, Q) {
        if (!text) throw new Error("Il messaggio e' vuoto");
        if (!isOnCurve(Q)) throw new Error("Chiave pubblica non valida");

        return textToBlocks(text).map(({ data, m }) => {
            const enc = encodeToPoint(m);
            const M = { x: enc.x, y: enc.y };
            const k = randomInRange(1n, CURVE.n - 1n);
            const C1 = scalarMult(k, G);
            const S = scalarMult(k, Q);
            const C2 = pointAdd(M, S);
            return { data, m, M, j: enc.j, attempts: enc.attempts, k, C1, S, C2 };
        });
    }

    // DECIFRATURA (richiede la chiave privata d).
    // Il destinatario ricalcola il segreto condiviso partendo da C1:
    //   d * C1 = d * (k * G) = k * (d * G) = k * Q = S
    // e lo sottrae da C2:
    //   C2 - S = (M + S) - S = M
    // Chi conosce solo Q e C1 dovrebbe risolvere l'ECDLP per ottenere S.
    function decryptBlock(C1, C2, d) {
        const S = scalarMult(d, C1);
        const negS = negate(S);
        const M = pointAdd(C2, negS);
        if (M === INFINITY) return { S, negS, M, m: 0n, chunk: [], data: [], valid: false };

        const m = decodeFromPoint(M);
        const chunk = bigIntToBytes(m);
        // Se d e' sbagliata, M e' un punto casuale e il prefisso non torna
        const valid = chunk[0] === BLOCK_PREFIX && chunk.length <= BLOCK_BYTES + 1;
        return { S, negS, M, m, chunk, data: chunk.slice(1), valid };
    }

    function decrypt(blocks, d) {
        const details = blocks.map(({ C1, C2 }) => ({ C1, C2, ...decryptBlock(C1, C2, d) }));
        const bytes = details.flatMap(b => b.data);
        const valid = details.every(b => b.valid);
        const text = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
        return { text, valid, details, bytes };
    }


    // =========================================================
    // 8. SERIALIZZAZIONE DEI PUNTI (FORMATO COMPRESSO SEC 1)
    // =========================================================
    // Un punto si puo' descrivere con la sola x piu' un bit per la parita'
    // di y: dato x, le due radici di x^3 + 7 sono y e p - y, una pari e una
    // dispari. Prefisso 02 = y pari, 03 = y dispari. Totale 33 byte.

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
        if (y === null) throw new Error("L'ascissa non corrisponde a un punto della curva");
        if (((y & 1n) === 1n) !== odd) y = CURVE.p - y;
        return { x, y };
    }

    // Cifrato testuale: un blocco per riga, ciascuno formato da C1 || C2
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


    // API pubblica del modulo
    return {
        CURVE, G, INFINITY, D_MIN, D_MAX, BLOCK_BYTES, BLOCK_PREFIX, KOBLITZ_K,
        mod, extendedEuclid, modInverse, modPow, modSqrt, curveRhs,
        isOnCurve, negate, pointAdd, pointDouble, scalarMult,
        randomInRange, generateKeyPair,
        textToBlocks, encodeToPoint, decodeFromPoint,
        encrypt, decrypt, decryptBlock,
        toHex, compressPoint, decompressPoint,
        serializeCiphertext, parseCiphertext
    };
})();
