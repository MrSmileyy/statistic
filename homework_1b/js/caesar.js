/*
 * caesar.js
 * Modulo per il Cifrario di Cesare e la Crittanalisi Statistica tramite Chi-Quadro.
 *
 * Contenuto:
 *   1. encrypt(plaintext, shift) e decrypt(ciphertext, shift)
 *   2. Frequenze teoriche delle lettere per lingua italiana e inglese
 *   3. Calcolo delle frequenze relative ed empiriche
 *   4. Crittanalisi statistica con test Chi-Quadro per tutti i 25 shift
 *   5. Test comparativo di affidabilita': stringhe corte vs lunghe
 */

const Caesar = (() => {

    // 1. Frequenze teoriche percentuali dei grafemi (normalizzate a somma 1)
    const FREQUENCIES = {
        it: {
            A: 0.1174, B: 0.0092, C: 0.0450, D: 0.0373, E: 0.1179,
            F: 0.0115, G: 0.0164, H: 0.0064, I: 0.1128, J: 0.0001,
            K: 0.0001, L: 0.0651, M: 0.0251, N: 0.0688, O: 0.0983,
            P: 0.0305, Q: 0.0051, R: 0.0637, S: 0.0498, T: 0.0562,
            U: 0.0301, V: 0.0210, W: 0.0001, X: 0.0001, Y: 0.0001,
            Z: 0.0118
        },
        en: {
            A: 0.0817, B: 0.0149, C: 0.0278, D: 0.0425, E: 0.1270,
            F: 0.0223, G: 0.0202, H: 0.0609, I: 0.0697, J: 0.0015,
            K: 0.0077, L: 0.0403, M: 0.0241, N: 0.0675, O: 0.0751,
            P: 0.0193, Q: 0.0010, R: 0.0599, S: 0.0633, T: 0.0906,
            U: 0.0276, V: 0.0098, W: 0.0236, X: 0.0015, Y: 0.0197,
            Z: 0.0007
        }
    };

    // 2. Cifratura e Decifratura di Cesare
    // Gestisce sia maiuscole che minuscole, lasciando intatti punteggiatura, cifre e spazi.
    function encrypt(plaintext, shift) {
        if (typeof shift !== "number") shift = parseInt(shift) || 0;
        shift = ((shift % 26) + 26) % 26;

        let result = "";
        for (let i = 0; i < plaintext.length; i++) {
            const code = plaintext.charCodeAt(i);
            if (code >= 65 && code <= 90) {
                // Maiuscole (A-Z)
                result += String.fromCharCode(65 + ((code - 65 + shift) % 26));
            } else if (code >= 97 && code <= 122) {
                // Minuscole (a-z)
                result += String.fromCharCode(97 + ((code - 97 + shift) % 26));
            } else {
                result += plaintext[i];
            }
        }
        return result;
    }

    function decrypt(ciphertext, shift) {
        if (typeof shift !== "number") shift = parseInt(shift) || 0;
        shift = ((shift % 26) + 26) % 26;
        return encrypt(ciphertext, 26 - shift);
    }

    // 3. Conteggio Frequenze
    // Filtra solo le lettere alfabetiche A-Z (case-insensitive)
    function countLetterFrequencies(text) {
        const letters = text.toUpperCase().replace(/[^A-Z]/g, "");
        const counts = {};
        for (let i = 0; i < 26; i++) {
            counts[String.fromCharCode(65 + i)] = 0;
        }

        for (let i = 0; i < letters.length; i++) {
            counts[letters[i]]++;
        }

        const totalLetters = letters.length;
        const relative = {};
        for (let i = 0; i < 26; i++) {
            const ch = String.fromCharCode(65 + i);
            relative[ch] = totalLetters > 0 ? counts[ch] / totalLetters : 0;
        }

        return { counts, relative, totalLetters };
    }

    // 4. Crittanalisi Statistica tramite Test Chi-Quadro (Chi-Squared)
    // Formula: Chi2(s) = Somma_{i=A..Z} [ (O_i - E_i)^2 / E_i ]
    // dove:
    //   O_i = occorrenze osservate della lettera i nel testo decifrato con shift s
    //   E_i = occorrenze attese = N * p_i (con p_i frequenza teorica della lingua)
    // Lo shift che minimizza Chi2 e' la chiave piu' probabile.
    function chiSquaredAttack(ciphertext, lang = "it") {
        const langFreq = FREQUENCIES[lang] || FREQUENCIES.it;
        const lettersOnly = ciphertext.toUpperCase().replace(/[^A-Z]/g, "");
        const N = lettersOnly.length;

        if (N === 0) {
            return {
                bestShift: 0,
                bestChi2: 0,
                scores: [],
                decryptedText: ciphertext,
                letterCount: 0
            };
        }

        const scores = [];

        for (let shift = 1; shift <= 25; shift++) {
            // Decifratura parziale per il conteggio
            const counts = {};
            for (let i = 0; i < 26; i++) counts[String.fromCharCode(65 + i)] = 0;

            for (let i = 0; i < lettersOnly.length; i++) {
                const code = lettersOnly.charCodeAt(i) - 65;
                const decCode = (code - shift + 26) % 26;
                counts[String.fromCharCode(65 + decCode)]++;
            }

            let chi2 = 0;
            for (let i = 0; i < 26; i++) {
                const ch = String.fromCharCode(65 + i);
                const observed = counts[ch];
                const expected = N * langFreq[ch];
                chi2 += Math.pow(observed - expected, 2) / expected;
            }

            scores.push({
                shift,
                chi2,
                decryptedPreview: decrypt(ciphertext.slice(0, 80), shift)
            });
        }

        // Ordina dal valore di Chi-Quadro piu' basso (miglior corrispondenza) al piu' alto
        scores.sort((a, b) => a.chi2 - b.chi2);

        const best = scores[0];
        return {
            bestShift: best.shift,
            bestChi2: best.chi2,
            scores,
            decryptedText: decrypt(ciphertext, best.shift),
            letterCount: N
        };
    }

    // 5. Test Comparativo: Stringhe Corte vs Stringhe Lunghe
    // Dimostra empiricamente il fallimento su testi corti (< 15 lettere)
    // a causa della varianza campionaria e il successo su testi lunghi (> 150 lettere).
    function testLengthVulnerability(fullText, actualShift, lang = "it") {
        // Tagli progressivi di lettere utili
        const lettersOnly = fullText.replace(/[^A-Za-z]/g, "");
        const targetLengths = [10, 25, 60, 150, 300, lettersOnly.length];
        const uniqueLengths = Array.from(new Set(targetLengths)).filter(l => l <= lettersOnly.length && l >= 8);

        const results = [];

        for (const len of uniqueLengths) {
            // Estrae una porzione di testo originale con circa 'len' lettere
            let count = 0;
            let endIdx = 0;
            while (endIdx < fullText.length && count < len) {
                if (/[A-Za-z]/.test(fullText[endIdx])) count++;
                endIdx++;
            }

            const snippet = fullText.slice(0, endIdx);
            const cipherSnippet = encrypt(snippet, actualShift);
            const attackResult = chiSquaredAttack(cipherSnippet, lang);

            const isSuccess = attackResult.bestShift === actualShift;

            results.push({
                length: count,
                sample: snippet.length > 45 ? snippet.slice(0, 45) + "..." : snippet,
                predictedShift: attackResult.bestShift,
                actualShift,
                chi2: attackResult.bestChi2,
                success: isSuccess
            });
        }

        return results;
    }

    return {
        FREQUENCIES,
        encrypt,
        decrypt,
        countLetterFrequencies,
        chiSquaredAttack,
        testLengthVulnerability
    };
})();
