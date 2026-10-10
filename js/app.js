document.addEventListener("DOMContentLoaded", () => {
    // --- State ---
    let state = {
        a: 0,
        b: 7,
        p: 17,
        G: null,
        k: 6,
        points: [],
        frames: [],
        currentFrame: 0,
        timer: null,
        isPlaying: false
    };

    // --- Math Utilities ---
    function mod(n, m) { return ((n % m) + m) % m; }

    function extEuclid(a, b) {
        let old_r = a, r = b;
        let old_s = 1, s = 0;
        let old_t = 0, t = 1;
        while (r !== 0) {
            let quotient = Math.floor(old_r / r);
            let temp_r = r; r = old_r - quotient * r; old_r = temp_r;
            let temp_s = s; s = old_s - quotient * s; old_s = temp_s;
            let temp_t = t; t = old_t - quotient * t; old_t = temp_t;
        }
        return { gcd: old_r, x: old_s, y: old_t };
    }

    function modInverse(a, m) {
        a = mod(a, m);
        let res = extEuclid(a, m);
        if (res.gcd !== 1) return null;
        return mod(res.x, m);
    }

    // --- Curve Logic ---
    function isSingular(a, b, p) {
        let discriminant = mod(4 * Math.pow(a, 3) + 27 * Math.pow(b, 2), p);
        return discriminant === 0;
    }

    function calculatePoints(a, b, p) {
        let pts = [];
        for (let x = 0; x < p; x++) {
            let rhs = mod(Math.pow(x, 3) + a * x + b, p);
            for (let y = 0; y < p; y++) {
                if (mod(y * y, p) === rhs) {
                    pts.push({ x, y });
                }
            }
        }
        return pts;
    }

    function isOnCurve(x, y, a, b, p) {
        let lhs = mod(y * y, p);
        let rhs = mod(Math.pow(x, 3) + a * x + b, p);
        return lhs === rhs;
    }

    function addPoints(P, Q, a, p) {
        if (!P) return Q;
        if (!Q) return P;
        if (P.x === Q.x && P.y === mod(-Q.y, p)) return null; // Punto all'infinito

        let s, sNum, sDen;
        if (P.x === Q.x && P.y === Q.y) {
            sNum = mod(3 * P.x * P.x + a, p);
            sDen = mod(2 * P.y, p);
        } else {
            sNum = mod(Q.y - P.y, p);
            sDen = mod(Q.x - P.x, p);
        }

        let inv = modInverse(sDen, p);
        if (inv === null) return null;

        s = mod(sNum * inv, p);
        let x3 = mod(s * s - P.x - Q.x, p);
        let y3 = mod(s * (P.x - x3) - P.y, p);
        let negY3 = mod(-y3, p);

        let sVis = s > Math.floor(p / 2) ? s - p : s;

        return {
            res: { x: x3, y: y3 },
            intersect: { x: x3, y: negY3 },
            s, sVis, sNum, sDen
        };
    }

    // --- Visualization Setup ---
    const plotSize = 400;
    const margin = { top: 20, right: 20, bottom: 30, left: 30 };
    const innerSize = plotSize - margin.left - margin.right;

    d3.select("#real-plot").selectAll("*").remove();
    d3.select("#fp-plot").selectAll("*").remove();

    const realSvgRoot = d3.select("#real-plot").append("svg")
        .attr("viewBox", `0 0 ${plotSize} ${plotSize}`);

    const fpSvgRoot = d3.select("#fp-plot").append("svg")
        .attr("viewBox", `0 0 ${plotSize} ${plotSize}`);

    // SVG Defs with clipPath to prevent overflow
    const realDefs = realSvgRoot.append("defs");
    realDefs.append("clipPath").attr("id", "real-clip")
        .append("rect").attr("x", 0).attr("y", 0).attr("width", innerSize).attr("height", innerSize);

    const fpDefs = fpSvgRoot.append("defs");
    fpDefs.append("clipPath").attr("id", "fp-clip")
        .append("rect").attr("x", 0).attr("y", 0).attr("width", innerSize).attr("height", innerSize);

    const realSvg = realSvgRoot.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const fpSvg = fpSvgRoot.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    let realScaleX, realScaleY, fpScaleX, fpScaleY;
    let xDomainMin, xDomainMax, yDomainMax;

    function drawPlots() {
        realSvg.selectAll("*").remove();
        fpSvg.selectAll("*").remove();

        const p = state.p;

        // --- Finite Field Plot Setup ---
        fpScaleX = d3.scaleLinear().domain([-0.5, p - 0.5]).range([0, innerSize]);
        fpScaleY = d3.scaleLinear().domain([-0.5, p - 0.5]).range([innerSize, 0]);

        // Background Grid
        const fpGrid = fpSvg.append("g");
        for (let i = 0; i < p; i++) {
            fpGrid.append("line").attr("class", "grid-line")
                .attr("x1", fpScaleX(i)).attr("x2", fpScaleX(i))
                .attr("y1", fpScaleY(-0.5)).attr("y2", fpScaleY(p - 0.5));
            fpGrid.append("line").attr("class", "grid-line")
                .attr("y1", fpScaleY(i)).attr("y2", fpScaleY(i))
                .attr("x1", fpScaleX(-0.5)).attr("x2", fpScaleX(p - 0.5));

            let stepInterval = p > 25 ? Math.ceil(p / 8) : (p > 15 ? 2 : 1);
            if (i % stepInterval === 0 || i === p - 1) {
                fpGrid.append("text").attr("class", "axis-label")
                    .attr("x", fpScaleX(i)).attr("y", innerSize + 18)
                    .attr("text-anchor", "middle").text(i);
                fpGrid.append("text").attr("class", "axis-label")
                    .attr("x", -10).attr("y", fpScaleY(i) + 4)
                    .attr("text-anchor", "end").text(i);
            }
        }

        // Discrete Curve Points
        const fpPointsGroup = fpSvg.append("g").attr("clip-path", "url(#fp-clip)");
        fpPointsGroup.selectAll(".bg-point").data(state.points).enter().append("circle")
            .attr("class", "curve-point bg-point")
            .attr("cx", d => fpScaleX(d.x)).attr("cy", d => fpScaleY(d.y)).attr("r", 3.5).style("opacity", 0.45);

        // --- Real Plot Setup ---
        // Find real roots of x^3 + ax + b = 0
        let roots = [];
        for (let x = -20; x <= 20; x += 0.05) {
            let v1 = x * x * x + state.a * x + state.b;
            let xNext = x + 0.05;
            let v2 = xNext * xNext * xNext + state.a * xNext + state.b;
            if (v1 * v2 <= 0) roots.push(x);
        }
        let minRoot = roots.length > 0 ? Math.min(...roots) : -2;
        let maxRoot = roots.length > 0 ? Math.max(...roots) : 2;

        let maxX = Math.max(6.5, maxRoot + 3.5);
        let maxY = 8;
        if (state.frames && state.frames.length > 0) {
            for (let f of state.frames) {
                if (f.R_real && isFinite(f.R_real.x)) {
                    maxX = Math.max(maxX, f.R_real.x + 2);
                    maxY = Math.max(maxY, Math.abs(f.R_real.y) + 3);
                }
                if (f.G_real && isFinite(f.G_real.x)) {
                    maxX = Math.max(maxX, f.G_real.x + 2);
                    maxY = Math.max(maxY, Math.abs(f.G_real.y) + 3);
                }
                if (f.nextR_real && isFinite(f.nextR_real.x)) {
                    maxX = Math.max(maxX, f.nextR_real.x + 2);
                    maxY = Math.max(maxY, Math.abs(f.nextR_real.y) + 3);
                }
            }
        }
        maxX = Math.min(20, maxX);
        let yAtEdge = Math.sqrt(Math.max(1, Math.pow(maxX, 3) + state.a * maxX + state.b));
        yDomainMax = Math.min(70, Math.max(maxY, yAtEdge * 1.05));
        xDomainMin = Math.min(-3.5, minRoot - 1.5);
        xDomainMax = maxX;

        realScaleX = d3.scaleLinear().domain([xDomainMin, xDomainMax]).range([0, innerSize]);
        realScaleY = d3.scaleLinear().domain([-yDomainMax, yDomainMax]).range([innerSize, 0]);

        // Real Axes
        const realAxes = realSvg.append("g");
        realAxes.append("line").attr("class", "axis-line")
            .attr("x1", 0).attr("x2", innerSize)
            .attr("y1", realScaleY(0)).attr("y2", realScaleY(0));
        realAxes.append("line").attr("class", "axis-line")
            .attr("x1", realScaleX(0)).attr("x2", realScaleX(0))
            .attr("y1", 0).attr("y2", innerSize);

        // Axis tick marks / labels
        for (let tick of [-5, 5, 10, 15]) {
            if (tick >= xDomainMin + 1 && tick <= xDomainMax - 1) {
                realAxes.append("text").attr("class", "axis-label")
                    .attr("x", realScaleX(tick)).attr("y", innerSize + 15)
                    .attr("text-anchor", "middle").text(tick);
            }
        }

        // Draw Continuous Real Elliptic Curve Path
        const realCurveGroup = realSvg.append("g").attr("clip-path", "url(#real-clip)");
        let dUpper = "";
        let dLower = "";
        let inSeg = false;
        const samples = 450;
        for (let i = 0; i <= samples; i++) {
            let px = (i / samples) * innerSize;
            let xVal = realScaleX.invert(px);
            let y2 = xVal * xVal * xVal + state.a * xVal + state.b;
            if (y2 >= 0) {
                let yVal = Math.sqrt(y2);
                let pyU = realScaleY(yVal);
                let pyL = realScaleY(-yVal);
                if (!inSeg) {
                    dUpper += `M ${px.toFixed(1)} ${pyU.toFixed(1)} `;
                    dLower += `M ${px.toFixed(1)} ${pyL.toFixed(1)} `;
                    inSeg = true;
                } else {
                    dUpper += `L ${px.toFixed(1)} ${pyU.toFixed(1)} `;
                    dLower += `L ${px.toFixed(1)} ${pyL.toFixed(1)} `;
                }
            } else {
                inSeg = false;
            }
        }
        if (dUpper) realCurveGroup.append("path").attr("class", "curve-path").attr("d", dUpper);
        if (dLower) realCurveGroup.append("path").attr("class", "curve-path").attr("d", dLower);

        // Dynamic groups with clipPath protection
        realSvg.append("g").attr("id", "real-dynamic").attr("clip-path", "url(#real-clip)");
        fpSvg.append("g").attr("id", "fp-dynamic").attr("clip-path", "url(#fp-clip)");
    }

    // --- Mathematical Line Clipping ---
    function getClippedRealLine(x0, y0, s, xMin, xMax, yMin, yMax) {
        if (!isFinite(s) || Math.abs(s) > 1e6) {
            let cx = Math.max(xMin, Math.min(xMax, x0));
            return { x1: cx, y1: yMin, x2: cx, y2: yMax };
        }
        let tMin = xMin;
        let tMax = xMax;
        if (Math.abs(s) > 1e-9) {
            let xAtYmin = x0 + (yMin - y0) / s;
            let xAtYmax = x0 + (yMax - y0) / s;
            let xLow = Math.min(xAtYmin, xAtYmax);
            let xHigh = Math.max(xAtYmin, xAtYmax);
            tMin = Math.max(tMin, xLow);
            tMax = Math.min(tMax, xHigh);
        }
        if (tMin > tMax) return null;
        return {
            x1: tMin,
            y1: y0 + s * (tMin - x0),
            x2: tMax,
            y2: y0 + s * (tMax - x0)
        };
    }

    function getWrappedPathFp(x1, y1, s, p, scaleX, scaleY) {
        let pathData = "";
        if (s === 0) {
            return `M ${scaleX(-0.5).toFixed(1)} ${scaleY(y1).toFixed(1)} L ${scaleX(p - 0.5).toFixed(1)} ${scaleY(y1).toFixed(1)}`;
        }

        let Y_a = s * (-0.5 - x1) + y1;
        let Y_b = s * (p - 0.5 - x1) + y1;
        let Y_min = Math.min(Y_a, Y_b);
        let Y_max = Math.max(Y_a, Y_b);

        let k_start = Math.floor((Y_min - (p - 0.5)) / p);
        let k_end = Math.ceil((Y_max + 0.5) / p);

        for (let k = k_start; k <= k_end; k++) {
            let xA, xB;
            if (s > 0) {
                xA = Math.max(-0.5, x1 + (-0.5 - y1 + k * p) / s);
                xB = Math.min(p - 0.5, x1 + (p - 0.5 - y1 + k * p) / s);
            } else {
                xA = Math.max(-0.5, x1 + (p - 0.5 - y1 + k * p) / s);
                xB = Math.min(p - 0.5, x1 + (-0.5 - y1 + k * p) / s);
            }

            if (xA < xB - 1e-6) {
                let yA = s * (xA - x1) + y1 - k * p;
                let yB = s * (xB - x1) + y1 - k * p;
                pathData += `M ${scaleX(xA).toFixed(1)} ${scaleY(yA).toFixed(1)} L ${scaleX(xB).toFixed(1)} ${scaleY(yB).toFixed(1)} `;
            }
        }
        return pathData;
    }

    function buildAnimationFrames() {
        state.frames = [];
        let R = null;

        // Choose representative point on real curve
        let gxReal = state.G ? state.G.x : 1;
        let gyReal2 = gxReal * gxReal * gxReal + state.a * gxReal + state.b;
        if (gyReal2 < 0) {
            for (let cx = 0; cx <= 10; cx += 0.2) {
                let testY2 = cx * cx * cx + state.a * cx + state.b;
                if (testY2 >= 0) {
                    gxReal = cx;
                    gyReal2 = testY2;
                    break;
                }
            }
        }
        let G_real = { x: gxReal, y: Math.sqrt(Math.max(0, gyReal2)) };
        let R_real = { ...G_real };

        for (let i = 1; i <= state.k; i++) {
            if (i === 1) {
                R = state.G;
                state.frames.push({
                    step: i,
                    type: 'base',
                    R: R,
                    R_real: R_real,
                    G_real: G_real,
                    log: `
                        <div class="phase">
                            <div class="phase-title">Punto Base Iniziale: 1G</div>
                            <div class="math-row">Partenza al punto generatore <i>G</i> = (${R.x}, ${R.y}) mod ${state.p}</div>
                            <div class="math-result"><strong>Stato Corrente:</strong> <span class="badge-result">1G = (${R.x}, ${R.y})</span></div>
                        </div>
                    `
                });
                continue;
            }

            let op = addPoints(R, state.G, state.a, state.p);

            if (!op) {
                state.frames.push({
                    step: i,
                    type: 'inf',
                    prevR: R,
                    R_real: R_real,
                    G_real: G_real,
                    log: `
                        <div class="phase">
                            <div class="phase-title">Passo ${i} di ${state.k}: Punto all'Infinito</div>
                            <div class="math-row">I punti <i>${i-1}G</i> e <i>G</i> sono simmetrici rispetto all'asse orizzontale.</div>
                            <div class="math-result"><strong>Risultato:</strong> <span class="badge-result">${i}G = O (Punto all'Infinito)</span></div>
                        </div>
                    `
                });
                R = null;
                continue;
            }

            // Real geometry step
            let s_real;
            if (Math.abs(R_real.x - G_real.x) < 1e-5 && Math.abs(R_real.y - G_real.y) < 1e-5) {
                s_real = (3 * R_real.x * R_real.x + state.a) / (2 * Math.max(0.1, R_real.y));
            } else if (Math.abs(R_real.x - G_real.x) < 1e-5) {
                s_real = 1e6;
            } else {
                s_real = (G_real.y - R_real.y) / (G_real.x - R_real.x);
            }
            let rx3 = s_real * s_real - R_real.x - G_real.x;
            let ry3 = s_real * (R_real.x - rx3) - R_real.y;
            let nextR_real = { x: rx3, y: ry3 };

            let opName = (i === 2) ? "Raddoppio: 2G = G + G" : `Addizione: ${i}G = ${i-1}G + G`;
            let slopeFormula = (i === 2) ?
                `s &equiv; (3x<sub>P</sub><sup>2</sup> + a) / (2y<sub>P</sub>)` :
                `s &equiv; (y<sub>Q</sub> - y<sub>P</sub>) / (x<sub>Q</sub> - x<sub>P</sub>)`;

            let logHtml = `
                <div class="phase">
                    <div class="phase-title">Passo ${i} di ${state.k}: ${opName}</div>
                    <div class="math-row">
                        <span><b>Punti:</b> P = (${R.x}, ${R.y}), Q = (${state.G.x}, ${state.G.y})</span>
                    </div>
                    <div class="math-row">
                        <span><b>Pendenza:</b> ${slopeFormula} &equiv; ${op.sNum} / ${op.sDen} &equiv; ${op.sNum} &times; ${op.sDen}<sup>-1</sup> &equiv; <b>${op.s}</b> (mod ${state.p})</span>
                    </div>
                    <div class="math-row">
                        <span><b>Intersezione:</b> x<sub>3</sub> &equiv; s<sup>2</sup> - x<sub>P</sub> - x<sub>Q</sub> &equiv; <b>${op.res.x}</b> (mod ${state.p})</span> |
                        <span>-y<sub>3</sub> &equiv; <b>${op.intersect.y}</b> (mod ${state.p})</span>
                    </div>
                    <div class="math-row">
                        <span><b>Riflessione:</b> y<sub>3</sub> &equiv; -(-y<sub>3</sub>) &equiv; <b>${op.res.y}</b> (mod ${state.p})</span>
                    </div>
                    <div class="math-result">
                        <strong>Risultato:</strong> <span class="badge-result">${i}G = (${op.res.x}, ${op.res.y})</span>
                    </div>
                </div>
            `;

            state.frames.push({
                step: i,
                type: 'add',
                prevR: R,
                op: op,
                R_real: R_real,
                G_real: G_real,
                nextR_real: nextR_real,
                realSlope: s_real,
                log: logHtml
            });

            R = op.res;
            R_real = nextR_real;
        }
    }

    function getSpeedConfig() {
        let speed = parseInt(document.getElementById("input-speed").value) || 3;
        const map = {
            1: { anim: 500, pause: 450 },
            2: { anim: 350, pause: 300 },
            3: { anim: 220, pause: 180 },
            4: { anim: 120, pause: 100 },
            5: { anim: 60, pause: 50 }
        };
        return map[speed] || map[3];
    }

    function renderFrame(index, animate = false, onComplete = null, animDuration = 250) {
        let realDyn = d3.select("#real-dynamic");
        let fpDyn = d3.select("#fp-dynamic");

        realDyn.selectAll("*").remove();
        fpDyn.selectAll("*").remove();

        const frame = state.frames[index];
        if (!frame) {
            if (onComplete) onComplete();
            return;
        }

        // Draw Base Generator G on finite field
        if (state.G) {
            fpDyn.append("circle")
                .attr("class", "curve-point generator")
                .attr("cx", fpScaleX(state.G.x))
                .attr("cy", fpScaleY(state.G.y))
                .attr("r", 5);
            fpDyn.append("text").attr("class", "axis-label")
                .attr("x", fpScaleX(state.G.x) + 7).attr("y", fpScaleY(state.G.y) - 5)
                .style("font-weight", "bold").style("fill", "#004488")
                .text("G");
        }

        // Draw subtle dots for past points (2G, 3G, ...) up to current
        for (let j = 0; j < index; j++) {
            let pastFrame = state.frames[j];
            let pt = pastFrame.type === 'base' ? pastFrame.R : (pastFrame.op ? pastFrame.op.res : null);
            if (pt) {
                fpDyn.append("circle")
                    .attr("cx", fpScaleX(pt.x)).attr("cy", fpScaleY(pt.y))
                    .attr("r", 3.5).style("fill", "#666").style("opacity", 0.6);
            }
        }

        if (frame.type === 'base') {
            let pt = fpDyn.append("circle")
                .attr("class", "curve-point current")
                .attr("cx", fpScaleX(frame.R.x)).attr("cy", fpScaleY(frame.R.y))
                .attr("r", animate ? 2 : 8);

            if (animate) {
                pt.transition().duration(animDuration).attr("r", 8);
            }

            // Real plot base point
            if (frame.R_real && frame.R_real.x >= xDomainMin && frame.R_real.x <= xDomainMax) {
                realDyn.append("circle")
                    .attr("cx", realScaleX(frame.R_real.x))
                    .attr("cy", realScaleY(frame.R_real.y))
                    .attr("r", 6).style("fill", "var(--secondary-color)");
                realDyn.append("text").attr("class", "axis-label")
                    .attr("x", realScaleX(frame.R_real.x) + 7).attr("y", realScaleY(frame.R_real.y) - 5)
                    .style("font-weight", "bold").style("fill", "#004488")
                    .text("G");
            }

            if (onComplete) setTimeout(onComplete, animDuration + 20);
        }
        else if (frame.type === 'add') {
            let P = frame.prevR;
            let R = frame.op.res;
            let intersect = frame.op.intersect;

            // 1. Draw modular line on Fp (strictly wrapped and clipped)
            let fpPathD = getWrappedPathFp(P.x, P.y, frame.op.sVis, state.p, fpScaleX, fpScaleY);
            let pathFp = fpDyn.append("path").attr("class", "wrap-line").attr("d", fpPathD);

            // 2. Draw line on Real plot (strictly clipped to inner bounds)
            let clipped = getClippedRealLine(frame.R_real.x, frame.R_real.y, frame.realSlope, xDomainMin, xDomainMax, -yDomainMax, yDomainMax);
            if (clipped) {
                let pathReal = realDyn.append("line").attr("class", "wrap-line")
                    .attr("x1", realScaleX(clipped.x1))
                    .attr("y1", realScaleY(clipped.y1))
                    .attr("x2", realScaleX(clipped.x2))
                    .attr("y2", realScaleY(clipped.y2));

                if (animate) {
                    pathReal.style("opacity", 0).transition().duration(animDuration * 0.4).style("opacity", 1);
                }
            }

            if (animate) {
                pathFp.style("opacity", 0).transition().duration(animDuration * 0.4).style("opacity", 1);
            }

            // 3. Mark P on Fp
            fpDyn.append("circle")
                .attr("cx", fpScaleX(P.x)).attr("cy", fpScaleY(P.y))
                .attr("r", 5).style("fill", "#8e44ad");
            fpDyn.append("text").attr("class", "axis-label")
                .attr("x", fpScaleX(P.x) + 7).attr("y", fpScaleY(P.y) + 12)
                .style("fill", "#8e44ad").style("font-weight", "bold")
                .text("P");

            // 4. Mark Intersection point -R on Fp
            let intFp = fpDyn.append("circle")
                .attr("cx", fpScaleX(intersect.x)).attr("cy", fpScaleY(intersect.y))
                .attr("r", animate ? 0 : 5.5).style("fill", "#e67e22");
            fpDyn.append("text").attr("class", "axis-label")
                .attr("x", fpScaleX(intersect.x) + 7).attr("y", fpScaleY(intersect.y) - 5)
                .style("fill", "#e67e22").style("font-weight", "bold")
                .text("-R");

            // 5. Mark Vertical reflection line on Fp
            let constFp = fpDyn.append("line").attr("class", "construction-line")
                .attr("x1", fpScaleX(intersect.x)).attr("x2", fpScaleX(R.x))
                .attr("y1", fpScaleY(intersect.y)).attr("y2", fpScaleY(R.y));

            // 6. Mark Result Point R on Fp
            let resFp = fpDyn.append("circle")
                .attr("class", "curve-point current")
                .attr("cx", fpScaleX(R.x)).attr("cy", fpScaleY(R.y))
                .attr("r", animate ? 0 : 8);
            fpDyn.append("text").attr("class", "axis-label")
                .attr("x", fpScaleX(R.x) + 9).attr("y", fpScaleY(R.y) + 4)
                .style("fill", "var(--primary-color)").style("font-weight", "bold")
                .text("R");

            // Real plot geometric points:
            // Point G
            if (frame.G_real && frame.G_real.x >= xDomainMin && frame.G_real.x <= xDomainMax && Math.abs(frame.G_real.y) <= yDomainMax) {
                realDyn.append("circle")
                    .attr("cx", realScaleX(frame.G_real.x)).attr("cy", realScaleY(frame.G_real.y))
                    .attr("r", 5).style("fill", "#004488").style("stroke", "#002244").style("stroke-width", 2);
                realDyn.append("text").attr("class", "axis-label")
                    .attr("x", realScaleX(frame.G_real.x) + 7).attr("y", realScaleY(frame.G_real.y) - 5)
                    .style("font-weight", "bold").style("fill", "#004488")
                    .text("G");
            }

            // Point P
            if (frame.R_real && frame.R_real.x >= xDomainMin && frame.R_real.x <= xDomainMax && Math.abs(frame.R_real.y) <= yDomainMax) {
                realDyn.append("circle")
                    .attr("cx", realScaleX(frame.R_real.x)).attr("cy", realScaleY(frame.R_real.y))
                    .attr("r", 5.5).style("fill", "#8e44ad");
                realDyn.append("text").attr("class", "axis-label")
                    .attr("x", realScaleX(frame.R_real.x) + 7).attr("y", realScaleY(frame.R_real.y) + 12)
                    .style("fill", "#8e44ad").style("font-weight", "bold")
                    .text("P");
            }

            // Intersection point -R and result R
            if (frame.nextR_real) {
                let rIntY = -frame.nextR_real.y;
                let inBounds = frame.nextR_real.x >= xDomainMin && frame.nextR_real.x <= xDomainMax && Math.abs(rIntY) <= yDomainMax;
                if (inBounds) {
                    let intReal = realDyn.append("circle")
                        .attr("cx", realScaleX(frame.nextR_real.x)).attr("cy", realScaleY(rIntY))
                        .attr("r", animate ? 0 : 5.5).style("fill", "#e67e22");
                    realDyn.append("text").attr("class", "axis-label")
                        .attr("x", realScaleX(frame.nextR_real.x) + 7).attr("y", realScaleY(rIntY) - 5)
                        .style("fill", "#e67e22").style("font-weight", "bold")
                        .text("-R");

                    let constReal = realDyn.append("line").attr("class", "construction-line")
                        .attr("x1", realScaleX(frame.nextR_real.x)).attr("x2", realScaleX(frame.nextR_real.x))
                        .attr("y1", realScaleY(rIntY)).attr("y2", realScaleY(frame.nextR_real.y));

                    let resReal = realDyn.append("circle")
                        .attr("cx", realScaleX(frame.nextR_real.x)).attr("cy", realScaleY(frame.nextR_real.y))
                        .attr("r", animate ? 0 : 6.5).style("fill", "var(--primary-color)");
                    realDyn.append("text").attr("class", "axis-label")
                        .attr("x", realScaleX(frame.nextR_real.x) + 7).attr("y", realScaleY(frame.nextR_real.y) + 12)
                        .style("fill", "var(--primary-color)").style("font-weight", "bold")
                        .text("R");

                    if (animate) {
                        intReal.transition().delay(animDuration * 0.3).duration(animDuration * 0.3).attr("r", 5.5);
                        constReal.style("opacity", 0).transition().delay(animDuration * 0.5).duration(animDuration * 0.3).style("opacity", 1);
                        resReal.transition().delay(animDuration * 0.7).duration(animDuration * 0.3).attr("r", 6.5);
                    }
                } else {
                    realDyn.append("text").attr("class", "axis-label")
                        .attr("x", 10).attr("y", 18)
                        .style("fill", "#e67e22").style("font-weight", "bold")
                        .text(`-R a (${frame.nextR_real.x.toFixed(1)}, ${rIntY.toFixed(1)}) oltre il bordo`);
                }
            }

            if (animate) {
                constFp.style("opacity", 0);
                intFp.transition().delay(animDuration * 0.3).duration(animDuration * 0.3).attr("r", 5.5);
                constFp.transition().delay(animDuration * 0.5).duration(animDuration * 0.3).style("opacity", 1);
                resFp.transition().delay(animDuration * 0.7).duration(animDuration * 0.3).attr("r", 8);

                if (onComplete) setTimeout(onComplete, animDuration + 20);
            } else {
                if (onComplete) onComplete();
            }
        } else {
            if (onComplete) onComplete();
        }

        const logContainer = document.getElementById("log-container");
        logContainer.innerHTML = frame.log;
    }

    // --- Control Handlers ---
    function step() {
        if (state.isPlaying) stopPlay();
        clearTimeout(state.timer);

        if (state.currentFrame < state.frames.length - 1) {
            state.currentFrame++;
            let cfg = getSpeedConfig();
            renderFrame(state.currentFrame, true, null, cfg.anim);
        }
    }

    function playNext() {
        if (!state.isPlaying) return;
        if (state.currentFrame < state.frames.length - 1) {
            state.currentFrame++;
            let cfg = getSpeedConfig();
            renderFrame(state.currentFrame, true, () => {
                if (state.isPlaying) {
                    state.timer = setTimeout(playNext, cfg.pause);
                }
            }, cfg.anim);
        } else {
            stopPlay();
        }
    }

    function play() {
        if (state.isPlaying) {
            stopPlay();
        } else {
            if (state.currentFrame >= state.frames.length - 1) {
                state.currentFrame = 0;
                renderFrame(0, false);
            }
            state.isPlaying = true;
            document.getElementById("btn-play").innerText = "Pausa";
            state.timer = setTimeout(playNext, 60);
        }
    }

    function stopPlay() {
        state.isPlaying = false;
        clearTimeout(state.timer);
        document.getElementById("btn-play").innerText = "Riproduci";
    }

    function resetAnim() {
        stopPlay();
        state.currentFrame = 0;
        renderFrame(0, false);
    }

    // --- UI Init & Event Listeners ---
    function initApp() {
        stopPlay();
        state.a = parseInt(document.getElementById("input-a").value);
        state.b = parseInt(document.getElementById("input-b").value);
        state.p = parseInt(document.getElementById("input-p").value);

        const statusEl = document.getElementById("curve-status");
        if (isSingular(state.a, state.b, state.p)) {
            statusEl.innerText = "Errore: La curva è singolare (discriminante = 0). Cambia a o b.";
            return;
        }
        statusEl.innerText = "";

        document.getElementById("curve-equation-display").innerHTML =
            `<span class="math">y<sup>2</sup> = x<sup>3</sup> + ${state.a}x + ${state.b} (mod ${state.p})</span>`;

        state.points = calculatePoints(state.a, state.b, state.p);

        if (state.points.length === 0) {
            statusEl.innerText = "Nessun punto trovato sulla curva.";
            return;
        }

        updateBasePoint();
    }

    function updateBasePoint() {
        stopPlay();
        const statusEl = document.getElementById("curve-status");

        let gx = parseInt(document.getElementById("input-gx").value);
        let gy = parseInt(document.getElementById("input-gy").value);

        if (isNaN(gx) || isNaN(gy)) return;

        if (!isOnCurve(gx, gy, state.a, state.b, state.p)) {
            statusEl.innerText = `Errore: il punto (${gx}, ${gy}) non appartiene alla curva.`;
            return;
        }
        statusEl.innerText = "";

        state.G = { x: gx, y: gy };
        state.k = parseInt(document.getElementById("input-k").value) || 1;

        buildAnimationFrames();
        drawPlots();
        resetAnim();
    }

    document.getElementById("btn-update-curve").addEventListener("click", initApp);
    document.getElementById("input-gx").addEventListener("change", updateBasePoint);
    document.getElementById("input-gy").addEventListener("change", updateBasePoint);
    document.getElementById("input-k").addEventListener("change", updateBasePoint);

    document.getElementById("btn-step").addEventListener("click", step);
    document.getElementById("btn-play").addEventListener("click", play);
    document.getElementById("btn-reset").addEventListener("click", resetAnim);

    // Modals
    const helpModal = document.getElementById("help-modal");
    document.getElementById("btn-help").addEventListener("click", () => helpModal.classList.remove("hidden"));
    document.querySelectorAll(".close-modal").forEach(btn => btn.addEventListener("click", () => helpModal.classList.add("hidden")));

    const hintModal = document.getElementById("hint-g-modal");
    document.getElementById("btn-hint-g").addEventListener("click", () => hintModal.classList.remove("hidden"));
    document.querySelector(".close-hint-modal").addEventListener("click", () => hintModal.classList.add("hidden"));

    window.addEventListener("click", (e) => {
        if (e.target === helpModal) helpModal.classList.add("hidden");
        if (e.target === hintModal) hintModal.classList.add("hidden");
    });

    // Boot
    initApp();
});
