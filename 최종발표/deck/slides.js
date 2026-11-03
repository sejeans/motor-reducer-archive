/* 슬라이드 내용. 좌표는 manim 장면과 같은 단위(가로 -7.1~7.1, 세로 -4~4, 위가 +)로 적고 픽셀로 바꾼다.
   요소 옵션: s 나오는 단계, o 사라지는 단계, a 등장 효과(fade pop grow gx gxr gy up drop draw fly rise),
   d 지연(ms), n 훅에서 찾을 이름, add "단계:클래스"(앞에 !를 붙이면 그 단계부터 뺀다). */
(() => {
  const U = 135;
  const X = x => +(960 + x * U).toFixed(1), Y = y => +(540 - y * U).toFixed(1), L = v => +(v * U).toFixed(1);
  // 라이트 모드 (프로젝터용): 흰 배경에서 잘 보이도록 진한 색을 쓴다
  const C = { bg: "#FFFFFF", fg: "#16191F", mu: "#5B6472", dim: "#C3C9D2", ac: "#1F6FD1", good: "#16924F", warn: "#D97B00",
    bad: "#D9363E", yel: "#C99200", sky: "#1F8FB0" };
  const ST = { NORMAL: ["정상", C.good], ECC10: ["편심 주의", "#B8960A"], ECC20: ["편심 결함", C.warn],
    DEMAG: ["감자 결함", C.bad], REDUC: ["감속기 기어 결함", "#7B45D6"] };
  const D = window.DECK_DATA;
  const TAU = Math.PI * 2;
  // 훑기 애니메이션 속도: 느리게 출발 → 가운데서 빠르게 → 느리게 멈춤
  const chewy = p => (p < 0.5 ? 16 * p ** 5 : 1 - (-2 * p + 2) ** 5 / 2);

  // ── 기본 부품 ──
  function W(o, inner) {
    if (!o || !["s", "o", "a", "cls", "n", "add", "d", "style", "origin", "vars"].some(k => o[k] != null)) return inner;
    const cls = ["el", ...(o.a ? o.a.split(" ") : []), ...(o.cls ? [o.cls] : [])];
    let at = ` data-s="${o.s ?? 0}"`;
    if (o.o != null) at += ` data-o="${o.o}"`;
    if (o.add) at += ` data-add="${o.add}"`;
    if (o.n) at += ` data-n="${o.n}"`;
    let st = "";
    if (o.d) st += `--d:${o.d}ms;`;
    if (o.origin) st += `transform-origin:${X(o.origin[0])}px ${Y(o.origin[1])}px;transform-box:view-box;`;
    if (o.vars) st += o.vars;
    if (o.style) st += o.style;
    return `<g class="${cls.join(" ")}"${at}${st ? ` style="${st}"` : ""}>${inner}</g>`;
  }
  const G = (inner, o) => W(o, `<g>${inner}</g>`);
  const fpx = s => Math.max(s, 26) * 1.6;

  function t(s, x, y, o = {}) {
    const anchor = { l: "start", r: "end", m: "middle" }[o.al || "m"];
    const rot = o.rot ? ` transform="rotate(${o.rot} ${X(x)} ${Y(y)})"` : "";
    const body = Array.isArray(s)
      ? s.map(g => `<tspan${g.c ? ` fill="${g.c}"` : ""}${g.b ? ' font-weight="600"' : ""}${g.size ? ` font-size="${fpx(g.size)}"` : ""}>${g.t}</tspan>`).join("")
      : s;
    return W(o, `<text x="${X(x)}" y="${Y(y)}" font-size="${o.px || fpx(o.size || 32)}" fill="${o.c || C.fg}" text-anchor="${anchor}" dominant-baseline="central"${o.b ? ' font-weight="600"' : ""}${rot}>${body}</text>`);
  }
  const TT = (s, o = {}) => t(s, 0, 3.27, { size: 42, b: 1, ...o });

  const sty = o => `fill="${o.fill || "none"}"${o.fo != null ? ` fill-opacity="${o.fo}"` : ""} stroke="${o.c || "none"}" stroke-width="${o.w ?? 3}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}${o.op != null ? ` opacity="${o.op}"` : ""}`;
  const rc = (cx, cy, w, h, o = {}) => W(o, `<rect x="${X(cx - w / 2)}" y="${Y(cy + h / 2)}" width="${L(w)}" height="${L(h)}"${o.r ? ` rx="${L(o.r)}"` : ""} ${sty(o)}/>`);
  const ci = (cx, cy, r, o = {}) => W(o, `<circle cx="${X(cx)}" cy="${Y(cy)}" r="${L(r)}" ${sty(o)}/>`);
  const ln = (x1, y1, x2, y2, o = {}) => W(o, `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" ${sty({ c: C.fg, ...o })} stroke-linecap="round"/>`);
  const ptStr = pts => pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ");
  const pl = (pts, o = {}) => W(o, `<${o.close ? "polygon" : "polyline"} points="${ptStr(pts)}" ${sty(o)} stroke-linejoin="round" stroke-linecap="round"/>`);
  const im = (href, cx, cy, w, h, o = {}) => W(o, `<image href="assets/${href}" x="${X(cx - w / 2)}" y="${Y(cy + h / 2)}" width="${L(w)}" height="${L(h)}" preserveAspectRatio="none"${o.pix ? ' style="image-rendering:pixelated"' : ""}/>`);
  function ar(x1, y1, x2, y2, o = {}) {
    const b = o.buff || 0, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const ax = x1 + ux * b, ay = y1 + uy * b, bx = x2 - ux * b, by = y2 - uy * b;
    const tip = Math.min(o.tip || 0.3, (len - 2 * b) * 0.45), hw = tip * 0.55;
    const hx = bx - ux * tip, hy = by - uy * tip;
    const inner = `<line x1="${X(ax)}" y1="${Y(ay)}" x2="${X(hx)}" y2="${Y(hy)}" stroke="currentColor" stroke-width="${o.w ?? 4}"/>` +
      `<polygon points="${ptStr([[bx, by], [hx - uy * hw, hy + ux * hw], [hx + uy * hw, hy - ux * hw]])}" fill="currentColor"/>`;
    const grow = o.a && o.a.includes("grow");
    return W({ ...o, style: `color:${o.c || C.mu};` + (o.style || ""), origin: grow ? [ax, ay] : o.origin }, inner);
  }
  // 점 (cx,cy)를 중심으로 s배 한 좌표계
  const F = (cx, cy, s = 1) => ({ p: (x, y) => [cx + x * s, cy + y * s], l: v => v * s });
  const spinG = (inner, cx, cy, T, rev) => `<g class="spin${rev ? " rev" : ""}" style="transform-origin:${X(cx)}px ${Y(cy)}px;--T:${T}s">${inner}</g>`;

  // ── 그림 부품 (common.py와 같은 모양) ──
  function motor(cx, cy, r, o = {}) {
    let mags = "";
    for (let i = 0; i < 6; i++) {
      const a = TAU * i / 6, mx = cx + 0.38 * r * Math.cos(a), my = cy + 0.38 * r * Math.sin(a);
      mags += `<rect x="${X(mx) - L(0.09 * r)}" y="${Y(my) - L(0.16 * r)}" width="${L(0.18 * r)}" height="${L(0.32 * r)}" fill="${i % 2 ? C.bad : C.ac}" opacity="${0.8 * (o.magOp ?? 1)}" transform="rotate(${-a * 180 / Math.PI} ${X(mx)} ${Y(my)})"/>`;
    }
    const col = o.c || C.fg;
    return ci(cx, cy, r, { c: col, w: 3 }) + ci(cx, cy, 0.55 * r, { c: col, w: 3 }) +
      (o.spin ? spinG(mags, cx, cy, o.spin, o.rev) : mags) + ci(cx, cy, 0.08 * r, { fill: col });
  }
  function gearPts(cx, cy, r, teeth, broken) {
    const pts = [];
    for (let i = 0; i < teeth; i++) {
      const a = TAU * i / teeth, da = TAU / teeth, outer = broken === i ? r * 0.82 : r;
      for (const [f, rad] of [[0, r * 0.8], [0.15, outer], [0.45, outer], [0.6, r * 0.8]])
        pts.push([cx + rad * Math.cos(a + f * da), cy + rad * Math.sin(a + f * da)]);
    }
    return pts;
  }
  function gear(cx, cy, r, teeth = 12, o = {}) {
    const col = o.c || C.fg;
    const g = pl(gearPts(cx, cy, r, teeth, o.broken), { close: 1, c: col, w: o.w || 3 }) + ci(cx, cy, 0.25 * r, { c: col, w: 3 });
    return o.spin ? spinG(g, cx, cy, o.spin, o.rev) : g;
  }
  function car(cx, cy, width, o = {}) {
    const f = F(cx, cy, width / 4), col = o.c || C.fg;
    const P = pts => pts.map(([x, y]) => f.p(x, y - 0.075));
    const body = [[-2, -0.35], [-2, 0.15], [-1.55, 0.3], [-0.9, 0.85], [0.6, 0.85], [1.25, 0.3], [2, 0.15], [2, -0.35]];
    const win = [[-0.75, 0.32], [-0.45, 0.72], [0.5, 0.72], [0.95, 0.32]];
    return pl(P(body), { close: 1, c: col, w: 4 }) + pl(P(win), { close: 1, c: col, w: 3 }) +
      [-1.2, 1.2].map(x => { const [px, py] = f.p(x, -0.38 - 0.075); return ci(px, py, f.l(0.32), { c: col, w: 4, fill: C.bg }); }).join("");
  }
  function piBoard(cx, cy, width) {
    const Wd = 3.4, H = 2.24, f = F(cx, cy, width / Wd), silver = "#C4C8CE", dark = "#1C1F24";
    const part = (w, h, fill, x, y, stroke = "#8E949C") => { const [px, py] = f.p(x, y); return rc(px, py, f.l(w), f.l(h), { fill, c: stroke, w: 1.2, r: f.l(0.03) }); };
    let s = (() => { const [px, py] = f.p(0, 0); return rc(px, py, f.l(Wd), f.l(H), { fill: "#46A957", c: "#2F7D3D", w: 2, r: f.l(0.16) }); })();
    for (const x of [-Wd / 2 + 0.2, 0.95]) for (const y of [-H / 2 + 0.2, H / 2 - 0.2]) {
      const [px, py] = f.p(x, y);
      s += ci(px, py, f.l(0.11), { fill: "#E9C84A" }) + ci(px, py, f.l(0.05), { fill: "#2F7D3D" });
    }
    for (let i = 0; i < 20; i++) for (let j = 0; j < 2; j++) {
      const [px, py] = f.p(-1.3 + 0.112 * i, H / 2 - 0.13 - 0.12 * j);
      s += rc(px, py, f.l(0.095), f.l(0.095), { fill: dark }) + ci(px, py, f.l(0.022), { fill: "#D9B44A" });
    }
    s += part(0.55, 0.42, dark, -0.95, 0.15, "#3A3F47") + part(0.72, 0.72, silver, -0.15, 0.05);
    { const [px, py] = f.p(-0.15, 0.05); s += rc(px, py, f.l(0.56), f.l(0.56), { c: "#9EA3AA", w: 1 }); }
    for (const [y, slot] of [[0.62, dark], [0.05, "#2F6FD6"]]) s += part(0.62, 0.48, silver, Wd / 2 - 0.25, y) + part(0.4, 0.12, slot, Wd / 2 - 0.25, y, slot);
    s += part(0.62, 0.55, silver, Wd / 2 - 0.25, -0.6) + part(0.34, 0.26, dark, Wd / 2 - 0.25, -0.6, dark);
    s += part(0.3, 0.14, silver, -1.05, -H / 2 + 0.08) + part(0.24, 0.12, silver, -0.45, -H / 2 + 0.07) + part(0.24, 0.12, silver, 0.05, -H / 2 + 0.07);
    for (const [x, y] of [[-0.06, 0], [0.06, 0], [0, 0.1], [-0.12, 0.1], [0.12, 0.1], [-0.06, 0.2], [0.06, 0.2], [0, -0.1]]) {
      const [px, py] = f.p(-1.15 + x, -0.45 - 0.1 + y); s += ci(px, py, f.l(0.055), { c: "#fff", w: 1.6 });
    }
    return s;
  }
  function server(cx, cy, height) {
    const f = F(cx, cy, height / 1.51);
    let s = "";
    for (const y of [0.53, 0, -0.53]) {
      const [px, py] = f.p(0, y);
      s += rc(px, py, f.l(1.3), f.l(0.45), { c: C.fg, w: 2, r: f.l(0.05) });
      const [lx, ly] = f.p(0.45, y); s += ci(lx, ly, f.l(0.04), { fill: C.good });
    }
    return s;
  }
  function warning(cx, cy, size, col = C.warn) {
    const h = size, w = h * 2 / Math.sqrt(3);
    return pl([[cx, cy + h / 2], [cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2]], { close: 1, c: col, w: 4, fill: col, fo: 0.15 }) +
      t("!", cx, cy - h * 0.1, { px: size * 46 * 1.6, b: 1, c: col });
  }
  const arcPts = (cx, cy, r, a0, a1, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  function tunnel(cx, cy, size) {
    const s = size / 1.2;
    return pl(arcPts(cx, cy, 0.5 * s, 0, Math.PI), { c: C.fg, w: 4 }) + pl(arcPts(cx, cy, 0.3 * s, 0, Math.PI), { c: C.fg, w: 4 }) +
      ln(cx - 0.6 * s, cy, cx + 0.6 * s, cy, { w: 4 });
  }
  const parking = (cx, cy, size) => rc(cx, cy, size, size, { c: C.fg, w: 4, r: size * 0.1 }) + t("P", cx, cy, { px: size * 70, b: 1 });
  function checkbox(cx, cy, size, done, col = C.good, o = {}) {
    const box = rc(cx, cy, size, size, { c: C.mu, w: 3, r: 0.06 });
    if (!done) return box;
    return box + pl([[-0.32, 0.02], [-0.08, -0.25], [0.35, 0.3]].map(([x, y]) => [cx + x * size, cy + y * size]), { c: col, w: 6, ...o });
  }
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const gauss = r => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(TAU * r());
  const lerpC = (a, b, v) => { const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const A = h(a), B = h(b); return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * v).toString(16).padStart(2, "0")).join(""); };

  function seriesIcon(cx, cy, w, h, o = {}) {
    const r = rng(5), cols = [C.ac, C.good, C.warn];
    let s = "";
    for (let i = 0; i < 3; i++) {
      const y0 = h / 2 - h * (i + 0.5) / 3, pts = [];
      for (let k = 0; k < 60; k++) { const x = -w / 2 + w * k / 59; pts.push([cx + x, cy + y0 + (0.12 * Math.sin(x * (5 + 2 * i) + i) + 0.05 * gauss(r)) * h / 1.4]); }
      s += pl(pts, { c: cols[i], w: 3 });
    }
    return W(o, s);
  }
  function sigmoidIcon(cx, cy, w, h) {
    const pts = Array.from({ length: 80 }, (_, k) => { const x = -w / 2 + w * k / 79; return [cx + x, cy - h / 2 + h / (1 + Math.exp(-x * 9 / w))]; });
    return ln(cx - w / 2, cy - h / 2, cx + w / 2, cy - h / 2, { c: C.mu, w: 2 }) + ln(cx - w / 2, cy - h / 2, cx - w / 2, cy + h / 2, { c: C.mu, w: 2 }) + pl(pts, { c: C.ac, w: 5 });
  }
  function rocketIcon(cx, cy, w) {
    const k = w / 2, f = F(cx, cy, k);
    const wave = Array.from({ length: 50 }, (_, i) => { const x = -1 + 1.05 * i / 49; return f.p(x, 0.25 + 0.18 * Math.sin(x * 9)); });
    let s = pl(wave, { c: C.fg, w: 3 });
    { const [px, py] = f.p(-0.45, 0.25); s += rc(px, py, f.l(0.32), f.l(0.75), { c: C.warn, w: 3, fill: C.warn, fo: 0.25 }); }
    const r = rng(2);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
      const [px, py] = f.p(0.6 - 0.3 + j * 0.2, 0.4 - i * 0.2);
      s += rc(px, py, f.l(0.17), f.l(0.17), { fill: lerpC("#DCE6F2", C.ac, r()) });
    }
    const [a1, a2] = [f.p(0.1, 0.25), f.p(0.27, 0.25)];
    return s + ar(a1[0], a1[1], a2[0], a2[1], { c: C.mu, w: 3, tip: f.l(0.12) });
  }
  function deviceIcon(cx, cy, w) {
    const k = w / 2.175, f = F(cx - 0.0125 * k, cy, k);
    const [px, py] = f.p(-0.45, -0.2), [sx, sy] = f.p(0.6, 0.25);
    return piBoard(px, py, f.l(1.25)) + rc(sx, sy, f.l(1.0), f.l(0.75), { c: C.fg, w: 3, r: f.l(0.06) }) + ci(sx, sy, f.l(0.12), { fill: C.good });
  }

  // 전체 과정 지도
  const MAP = ["스펙트로그램", "Time Series", "MiniRocket", "로지스틱 회귀", "라즈베리파이"];
  // 과정 묶음: [첫 칸, 끝 칸, 이름, 설명]. 경량 모델 묶음은 빨간 테두리로 강조
  const GROUPS = [[0, 1, "데이터 준비", "이미지의 시계열 변환"], [2, 3, "경량 모델", "시계열 기반 고장 판정"], [4, 4, "배포", "저사양 장치 실행"]];
  function pipeline(cy, width, o = {}) {
    const s = width / 14.2, iw = 2 * s, ih = 1.36 * s;
    const fy = cy + 0.29 * s, ly = cy - 0.99 * s;
    let out = "";
    GROUPS.forEach(([a, b, name, sub], gi) => {
      const xa = (a - 2) * 2.95 * s - 1.35 * s, xb = (b - 2) * 2.95 * s + 1.35 * s;
      const top = fy + 1.03 * s, bot = ly - 0.42 * s, key = gi === 1;
      const g = rc((xa + xb) / 2, (top + bot) / 2, xb - xa, top - bot, { fill: key ? C.bad : "#EEF1F5", fo: key ? 0.06 : 1, c: key ? C.bad : "none", w: 3, r: 0.12 * s }) +
        ln(xa, top + 0.72 * s, xa + 0.3 * s, top + 0.72 * s, { c: key ? C.bad : C.fg, w: 4 }) +
        t(name, xa + 0.42 * s, top + 0.72 * s, { px: fpx(30) * s, b: 1, c: key ? C.bad : C.fg, al: "l" }) +
        t(sub, xa, top + 0.3 * s, { px: 30 * s, c: key ? C.bad : C.mu, al: "l" });
      out += W(o.steps ? { s: a, a: "fade" } : null, g);
    });
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 2.95 * s;
      const act = o.active === i, faded = o.active != null && !act && !(o.done || []).includes(i);
      let icon = [() => im("pair_DEMAG.jpg", x, fy, iw, ih), () => seriesIcon(x, fy, iw, ih), () => rocketIcon(x, fy, iw),
        () => sigmoidIcon(x, fy, iw, ih), () => deviceIcon(x, fy, iw)][i]();
      const card = rc(x, fy, 2.4 * s, 1.76 * s, { fill: C.bg, r: 0.2 * s, s: o.steps ? i : undefined, a: o.steps ? "fade" : undefined });
      const frame = rc(x, fy, 2.4 * s, 1.76 * s, { c: act ? C.ac : C.dim, w: act ? 6 : 2, r: 0.2 * s });
      const item = card + (o.steps ? W({ s: i, a: "draw", vars: "--dur:.6s" }, frame) : act ? `<g class="beat">${frame}</g>` : frame) +
        W(o.steps ? { s: i, a: "pop", d: 150 } : null, icon) + t(MAP[i], x, ly, { px: fpx(30) * s, b: 1, c: act ? C.ac : C.fg, s: o.steps ? i : undefined });
      out += faded ? `<g opacity="0.25">${item}</g>` : item;
      if (i < 4) out += ar(x + 1.2 * s, fy, x + 1.75 * s, fy, { buff: 0.06, c: C.mu, w: 4, tip: 0.25 * s, op: 1, a: o.steps ? "grow" : undefined, s: o.steps ? i + 1 : undefined, style: o.active != null ? "opacity:.5" : "" });
    }
    return out;
  }
  // 왼쪽 위 작은 과정 지도: 지금 설명하는 칸만 채운다 (픽셀 좌표)
  function miniMap(act) {
    const w = 142, h = 34, gap = 22, y0 = 16;
    let s = "", x = 6;
    MAP.forEach((name, i) => {
      if (i === 2 || i === 4) x += 12;  // 묶음 사이를 조금 더 띄운다
      const on = act.includes(i), key = i === 2 || i === 3;
      s += `<rect x="${x}" y="${y0}" width="${w}" height="${h}" rx="${h / 2}" fill="${on ? C.ac : C.bg}" stroke="${on ? C.ac : key ? "#E9A9AC" : C.dim}" stroke-width="2"/>` +
        `<text x="${x + w / 2}" y="${y0 + h / 2}" font-size="19" fill="${on ? "#FFFFFF" : C.mu}"${on ? ' font-weight="600"' : ""} text-anchor="middle" dominant-baseline="central">${name}</text>`;
      if (i < 4) s += `<text x="${x + w + gap / 2 + (i === 1 || i === 3 ? 6 : 0)}" y="${y0 + h / 2}" font-size="22" fill="${C.dim}" text-anchor="middle" dominant-baseline="central">›</text>`;
      x += w + gap;
    });
    return `<g>${s}</g>`;
  }

  // 상태 그림 (02b 카드와 00b 고장 그림)
  function pictogram(key, cx, cy, s) {
    const col = ST[key][1];
    if (key === "NORMAL") return motor(cx, cy, 0.7 * s, { spin: 3 }) + checkbox(cx + 0.62 * s, cy - 0.62 * s, 0.45 * s, true, C.good);
    if (key === "ECC10" || key === "ECC20") {
      const off = (key === "ECC10" ? 0.12 : 0.26) * s;
      return ci(cx, cy, 0.7 * s, { c: C.fg, w: 3 }) + ci(cx, cy, 0.05 * s, { fill: C.mu }) +
        spinG(ci(cx + off, cy, 0.4 * s, { c: col, w: 4 }) + ci(cx + off, cy, 0.07 * s, { fill: col }), cx, cy, 1.6, true);
    }
    if (key === "DEMAG") return motor(cx, cy, 0.7 * s, { magOp: 0.25, spin: 3 });
    const [x, y] = [cx + 0.6 * s, cy + 0.35 * s], k = 0.13 * s;
    return gear(cx, cy, 0.7 * s, 12, { broken: 2 }) + ln(x - k, y - k, x + k, y + k, { c: col, w: 4 }) + ln(x - k, y + k, x + k, y - k, { c: col, w: 4 });
  }
  function vib(cx, cy, half, col) {
    let s = "";
    [[1, -Math.PI / 4], [-1, 3 * Math.PI / 4]].forEach(([side, a0]) => [0, 1].forEach(k => {
      s += `<g class="blink" style="--bd:${k * 0.25 + (side < 0 ? 0.5 : 0)}s">${pl(arcPts(cx + side * (half - 0.15), cy, 0.35 + 0.18 * k, a0, a0 + Math.PI / 2, 16), { c: col, w: 4 })}</g>`;
    }));
    return s;
  }
  const cross = (cx, cy, k, col = C.bad, w = 6) => ln(cx - k, cy - k, cx + k, cy + k, { c: col, w }) + ln(cx - k, cy + k, cx + k, cy - k, { c: col, w });

  // 축 (manim Axes처럼 0을 지나는 자리에 축선)
  function axes(cx, cy, xl, yl, xr, yr, o = {}) {
    const x0 = cx - xl / 2, y0 = cy - yl / 2;
    const c2p = (x, y) => [x0 + (x - xr[0]) / (xr[1] - xr[0]) * xl, y0 + (y - yr[0]) / (yr[1] - yr[0]) * yl];
    const ax = yr[0] <= 0 && yr[1] >= 0 ? 0 : yr[0], ay = xr[0] <= 0 && xr[1] >= 0 ? 0 : xr[0];
    const col = o.c || C.mu;
    const svg = ln(...c2p(xr[0], ax), ...c2p(xr[1], ax), { c: col, w: 2 }) + ln(...c2p(ay, yr[0]), ...c2p(ay, yr[1]), { c: col, w: 2 });
    return { c2p, svg };
  }
  const curve = (A, xs, ys) => xs.map((x, i) => (ys[i] == null ? null : A.c2p(x, ys[i]))).filter(Boolean);
  const pathD = pts => pts.length ? "M" + pts.map(([x, y]) => `${X(x)},${Y(y)}`).join("L") : "";

  // 발표 대본 (사람이 읽는 원고). ▶ = 그 자리에서 클릭. 슬라이드를 넘기는 클릭은 표시하지 않는다.
  const N = {
    "00": "전기차의 모터와 감속기에 고장이 생기면 진동과 전류에 작은 변화가 나타납니다. 저희는 이 변화를 차량 안의 작은 컴퓨터가 직접 판정하는 가벼운 고장 진단 모델을 만들었습니다. 그 과정을 소개하겠습니다.",
    "00b1": "전기차를 움직이는 두 부품입니다. ▶ 모터가 회전을 만들고, ▶ 감속기가 속도를 줄이고 힘을 키워 바퀴로 전달합니다.",
    "00b2": "이 부품에 생기는 고장은 세 가지입니다. 회전축이 어긋나거나, ▶ 자석이 약해지거나, ▶ 기어가 손상되는 경우입니다. ▶ 이런 고장이 생기면 주행 중에 차가 멈출 수 있습니다.",
    "00b3": "자율주행차에서는 운전자가 이런 이상을 알아채기 어렵습니다. ▶ 그래서 차량이 센서 신호로 고장을 스스로 감지해야 합니다.",
    "00b4": "저희는 센서 신호를 입력받는 ▶ AI 모델을 만들었습니다. ▶ 이 모델은 정상과 고장을 판정합니다. ▶ 그렇다면 이 판정은 어디서 해야 할까요?",
    "01a": "서버에서 판정한다면 차량은 측정한 신호를 서버로 계속 보내고, 서버에서 판정 결과를 받아야 합니다. ▶ 그런데 터널이나 지하주차장처럼 통신이 끊기는 곳에서는 판정이 멈춥니다. ▶ 통신망이 공격받으면 잘못된 판정 결과가 돌아올 수도 있습니다. ▶ 그래서 판정 장치는 차량 안에 있어야 합니다. 그러면 통신 상태와 관계없이 판정할 수 있습니다.",
    "01b": "저희는 차량용 컴퓨터 대신 라즈베리파이 4를 사용했습니다. 그래서 모델은 두 가지 조건을 만족해야 합니다. ▶ 이 작은 컴퓨터에 들어갈 만큼 모델이 작아야 하고, ▶ 다음 신호가 들어오기 전인 10초 안에 판정을 끝내야 합니다.",
    "02a": "데이터는 AI Hub의 모터 감속기 고장 진단 데이터를 사용했습니다. ▶ 아이오닉, 코나, 니로 세 차종을 센서 3종으로 측정한 데이터입니다.",
    "02a2": "센서는 세 가지입니다. 모터 전류 센서는 모터에 흐르는 전기의 세기를 측정합니다. ▶ 모터 진동 센서는 모터 몸체의 떨림을 측정하고, ▶ 감속기 진동 센서는 감속기 몸체의 떨림을 측정합니다. 세 센서는 같은 10초를 함께 기록합니다.",
    "02b": "차량 상태는 다섯 가지입니다. 고장이 없는 정상, ▶ 회전축 중심이 조금 어긋난 편심 주의, ▶ 많이 어긋난 편심 결함, ▶ 영구자석의 자력이 약해진 감자 결함, ▶ 그리고 기어 이가 손상된 감속기 기어 결함입니다.",
    "02c1": "센서 신호는 스펙트로그램이라는 이미지로 제공됩니다. 신호를 짧은 구간으로 나누고, 구간마다 FFT로 각 주파수의 세기를 계산해 한 열씩 색으로 칠한 그림입니다. 가로는 시간, 세로는 주파수입니다. ▶ 그래서 주파수가 올라가는 성분은 사선으로, 일정한 성분은 수평선으로 나타납니다.",
    "02c2": "실제 데이터입니다. 왼쪽은 정상, 오른쪽은 감자 결함 이미지입니다. ▶ 고장이 생기면 주파수별 에너지 분포가 달라집니다.",
    "02d": "이미지 한 장에는 차종, 센서, 상태가 하나씩 담겨 있고, 길이는 10초입니다. ▶ 전체 데이터는 550,800장입니다. ▶ 측정 시간으로는 약 510시간이고, 차종마다 약 1주일 분량입니다. 조합마다 12,240장씩 같은 수가 들어 있어 클래스 불균형이 없습니다.",
    "03a": "이 데이터와 함께 공개된 기존 모델은 DeepLabV3+입니다. 큰 이미지를 그대로 입력해 ▶ 정확도 99.63%를 기록했습니다. ▶ 하지만 모델 파일이 45.17MB로, 차량 안의 작은 컴퓨터에 넣기에는 무겁습니다.",
    "03b": "그래서 목표를 세 가지로 정했습니다. 정확도는 기존 모델과 같은 수준, ▶ 모델 크기는 MB 단위, ▶ 판정 시간은 10초 미만입니다. ▶ 판정 시간을 10초 미만으로 정한 이유는 이미지가 10초마다 하나씩 도착하기 때문입니다. ▶ 다음 이미지가 오기 전에 판정을 끝내야 합니다. ▶ 끝내지 못하면 판정이 계속 밀립니다.",
    "04": "전체 과정은 다음과 같습니다. 스펙트로그램 이미지를 ▶ Time Series로 바꾸고, ▶ MiniRocket이 Time Series의 패턴을 특징 벡터로 요약합니다. ▶ 로지스틱 회귀가 다섯 가지 상태 중 하나로 판정하고, ▶ 마지막으로 라즈베리파이에서 판정 시간을 측정해 결과를 화면에 표시합니다.",
    "05a": "첫 단계는 색을 에너지 값으로 되돌리는 것입니다. 스펙트로그램은 jet colormap으로 칠해져 있어서 색만으로는 어느 쪽이 더 강한지 비교하기 어렵습니다. ▶ 그래서 colormap을 역변환해 픽셀마다 에너지 세기를 구했습니다. 오른쪽 그림에서는 밝을수록 에너지가 강합니다.",
    "05b": "다음으로 이미지의 세로 한 줄을 꺼냅니다. 세로 한 줄은 한 시점의 주파수 분포이고, 1,280픽셀입니다. ▶ 이 줄을 눕히면 주파수별 에너지 그래프가 됩니다. ▶ 이 그래프에서 기본 특징 4개, 분포 특징 12개, 차수 특징 12개를 계산하고, ▶ RPM 1개를 더합니다. ▶ 그래서 1,280픽셀이 통계량 29개로 줄어듭니다.",
    "05c": "센서 세 개에서 같은 시점의 세로 줄을 꺼내면 한 시점에 통계량 87개가 나옵니다. ▶ 이 계산을 10초 동안 2,000번 반복합니다. 그 결과 87개 변수가 시간 순서로 기록된 Multivariate Time Series, 87 × 2,000이 만들어집니다.",
    "06a": "통계량을 정한 과정을 설명하겠습니다. 먼저 기본 특징 4개입니다. ▶ 가장 강한 주파수의 위치인 Peak Frequency, ▶ 에너지가 있는 대역의 시작과 끝인 Band Start와 Band End, ▶ 전체 세기인 RMS입니다. ▶ 여기에 모터의 RPM을 더해 센서마다 5개로 시작했습니다.",
    "06b1": "그런데 이 특징만으로는 감자 결함을 정상으로 자주 잘못 분류했습니다. RPM이 같은 두 이미지를 비교하면, ▶ 감자 결함에서는 기본 주파수 옆에 Sideband라는 작은 줄이 생깁니다.",
    "06b2": "두 상태의 이미지를 96장씩 평균해 주파수 분포를 겹쳐 그렸습니다. ▶ Peak 위치는 둘 다 같습니다. 그래서 기본 특징 4개로는 이 차이를 구분할 수 없습니다. ▶ 이 차이를 잡기 위해 주파수를 12개 구간으로 나눴습니다. ▶ 구간 하나의 에너지를 전체 에너지로 나눈 값이 구간별 에너지 비율, Band Energy Ratio입니다. 감자 결함은 Sideband가 있는 구간의 비율이 정상보다 높습니다. 이 12개 값이 분포 특징입니다.",
    "06c1": "또 하나의 문제는 RPM입니다. RPM이 올라가면 고장 주파수도 함께 올라가서, 같은 고장이 매번 다른 자리에 나타납니다. ▶ 주파수를 RPM으로 나누면 같은 고장이 항상 같은 자리에 나타납니다. 이렇게 나눈 주파수 축을 차수축이라고 합니다.",
    "06c2": "절대축은 RPM 정보를 그대로 담지만, RPM이 바뀌면 고장 위치가 움직입니다. 차수축은 고장 위치를 한 자리에 고정하지만, RPM 정보가 사라집니다. ▶ 두 축은 서로의 약점을 채우는 상호보완 관계입니다. 그래서 절대축 12개와 차수축 12개를 함께 넣었습니다.",
    "06d": "특징은 한 묶음씩 추가하고, 결과를 확인한 뒤 채택 여부를 정했습니다. 기본 특징 4개를 센서 3개에 적용한 12채널에서 Macro F1 0.874로 시작했습니다. ▶ RPM을 더하자 0.881로 조금 올라 채택했습니다. ▶ 온도는 세 차종 모두에서 성능이 떨어져 기각했습니다. 상태마다 온도 범위가 겹쳤기 때문입니다. ▶ 절대축 분포 특징 12개를 넣자 0.881에서 0.964로 올랐고, 감자 결함을 맞힌 비율이 12~16%p 높아졌습니다. ▶ 차수축 특징을 더하자 0.973이 되었고, 감자 결함과 정상을 혼동한 건수가 704건에서 433건으로 줄었습니다. ▶ 차량 정보 25개는 성능이 0.058%p 올랐지만, 이 차이는 우연과 구분되지 않아 기각했습니다. ▶ 최종 특징은 센서마다 29개, 모두 87채널입니다.",
    "07a1": "MiniRocket은 Time Series를 특징 벡터로 요약합니다. 값이 미리 정해진 짧은 Kernel을 Time Series를 따라 옮기면서 출력을 계산하고, 출력이 0보다 큰 비율을 특징값 하나로 기록합니다.",
    "07a2": "Kernel 약 1만 개에서 특징 9,996개가 나옵니다. Kernel마다 특징값을 하나씩 만듭니다. ▶ Kernel을 학습하지 않기 때문에 변환이 빠릅니다.",
    "07b1": "판정은 로지스틱 회귀가 맡습니다. 정상과 감자 결함 두 가지로 예를 들면, MiniRocket 특징으로 계산한 점수를 로지스틱 함수가 0에서 100% 사이의 확률로 바꿉니다. 확률이 50%보다 높으면 감자 결함, 낮으면 정상으로 판정합니다. ▶ 로지스틱 회귀를 선택한 이유는 세 가지입니다. 첫째, MiniRocket은 선형 분류기와 함께 쓰도록 설계되었고, 원 논문도 변환 결과를 선형 분류기로 판정합니다. ▶ 둘째, 다섯 가지 상태별 확률을 출력합니다. 대시보드의 이상 점수는 100에서 정상 확률을 뺀 값이므로, 확률을 출력하지 않는 분류기로는 이 점수를 계산할 수 없습니다. ▶ 셋째, 빠르고 가볍습니다. 라즈베리파이 4에서 분류 단계는 1.57ms로, 전체 판정 시간 455ms의 0.35%입니다.",
    "07b2": "실제 모델은 다섯 가지 상태의 확률을 모두 계산하고, 가장 높은 상태를 판정 결과로 선택합니다. 이 예에서는 감자 결함이 94%로 가장 높습니다. ▶ 이상 점수는 전체 100%에서 정상 확률을 뺀 값입니다. 이 예에서 정상 확률은 3%입니다. ▶ 그래서 이상 점수는 100에서 3을 뺀 97입니다. 이상 점수가 높을수록 차량에 이상이 있을 가능성이 큽니다.",
    "08a": "다음은 평가 방법입니다. 기존 연구는 측정 6번에서 나온 10초 조각을 ▶ 무작위로 Train과 Test에 나눴습니다. ▶ 그러면 같은 측정에서 나온 조각이 Train과 Test 양쪽에 들어갑니다. 실제로 Test 측정 1,066개 중 1,063개가 Train에도 있었습니다. 이것을 Data Leakage라고 합니다.",
    "08b": "저희는 같은 측정에서 나온 조각을 묶어서 나눴습니다. ▶ 측정 하나는 Train과 Test 중 한쪽에만 들어갑니다. ▶ 그래서 중복이 0개이고, 모델은 처음 보는 주행 데이터로만 평가받습니다.",
    "08c": "기존 모델을 Leakage가 있는 방식으로 평가하면 정확도가 99.65%입니다. ▶ Leakage를 없애고 다시 평가하자 96.33%로 3.3%p 내려갔습니다. ▶ 같은 기준에서 저희 모델은 96.90%로, 두 모델의 차이는 0.57%p입니다. ▶ 이 차이가 의미 있는지 가설 검정으로 확인했습니다. 귀무가설은 두 모델의 정확도가 같다는 것이고, 대립가설은 다르다는 것입니다. p값은 0.288로 유의수준 0.05보다 큽니다. 그래서 귀무가설을 기각할 수 없습니다. 따라서 두 모델은 통계적으로 유의한 차이가 없는 같은 수준의 정확도입니다.",
    "08d": "모델 크기입니다. 기존 모델은 45.17MB입니다. ▶ 저희 모델은 세 차종을 모델 하나로 판정하고, 크기는 2.17MB로 기존 모델의 약 1/20입니다.",
    "08e": "최종 혼동행렬입니다. 정확도는 96.90%입니다. 정답 칸인 대각선에 데이터가 모여 있습니다. ▶ 틀린 것의 78%는 감자 결함과 정상 사이의 오분류였습니다.",
    "091": "실제 동작 과정입니다. 모터 센서 신호가 10초마다 라즈베리파이로 들어오면, 탑재된 모델이 판정해 화면에 결과를 표시합니다. 판정 한 번에 걸린 시간은 0.455초입니다. 다음 신호는 10초 뒤에 들어오므로 판정은 그 전에 충분히 끝납니다.",
    "092": "10초와 비교하면 0.455초는 이 정도 길이입니다. ▶ 이 중 99%가 MiniRocket 변환 시간이고, 정규화와 분류는 1%입니다. 이 측정에는 스펙트로그램 변환과 통계량 계산 시간이 들어 있지 않습니다.",
    "10": "판정 결과는 두 화면에 표시됩니다. 왼쪽은 정비사가 보는 대시보드로, 이상 점수와 클래스별 확률을 보여줍니다. 이상 점수가 30 미만이면 정상, 30에서 70 사이면 주의, 70 이상이면 결함입니다. 오른쪽은 운전자가 보는 계기판입니다. 지금은 이상 점수가 12로 정상이어서 모터 아이콘이 회색입니다. ▶ 이상 점수가 48이면 주의 상태이고, 아이콘이 주황색으로 바뀝니다. ▶ 92가 되면 결함 상태이고, 아이콘이 빨간색으로 깜박입니다. 계기판은 이상이 있을 때만 색으로 알려서 운전자의 주의를 빼앗지 않습니다.",
    "11": "정리하겠습니다. 저희는 스펙트로그램 이미지를 Time Series로 바꾸고 MiniRocket과 로지스틱 회귀로 판정했습니다. ▶ 정확도는 96.90%로 기존 모델과 같은 수준이고, ▶ 모델 크기는 2.17MB로 기존의 약 1/20입니다. ▶ 라즈베리파이 4에서 판정은 0.455초 만에 끝나 목표인 10초보다 훨씬 짧습니다. 감사합니다.",
  };

  const S = [];
  const add = (id, notes, svg, more = {}) => S.push({ id, notes, svg, ...more });

  // ════════ 00 오프닝 ════════
  {
    const wave = `<path data-n="wave" d="" fill="none" stroke="${C.ac}" stroke-width="2.5"/>`;
    add("00_오프닝", N["00"],
      t("2026년 시스템설계   C321027 박세진, C321028 박솔", 0, -3.7, { size: 28, c: C.mu }) +
      G(W({ a: "draw", vars: "--dur:1.5s" }, car(0, 0.3, 7)), { o: 2, a: "fade" }) +
      W({ s: 1, o: 3, a: "pop" }, W({ add: "2:zoom", cls: "zoomable", origin: [1.6, -0.05] }, ci(1.6, -0.05, 0.55, { c: C.ac, w: 4 }))) +
      G(motor(-1.7, 0.35, 1.2, { spin: 3, rev: 1 }) + gear(1.9, 0.35, 1.0, 14, { spin: 6.4 }) + ln(-0.5, 0.35, 0.9, 0.35, { w: 5 }) +
        t("모터", -1.7, -1.28, { size: 30 }) + t("감속기", 1.9, -1.08, { size: 30 }), { s: 2, a: "fade", d: 500 }) +
      W({ s: 2, a: "fade", d: 900 }, wave) +
      t("차량 안에서 판정하는 가벼운 고장 진단 모델", 0, 3.2, { size: 40, b: 1, s: 3 }) +
      t("자율주행 전기차 모터-감속기 이상 탐지 기술 경량화", 0, 2.55, { size: 32, c: C.mu, s: 3 }),
      {
        css: ".zoom{transform:scale(6);opacity:0 !important;transition:transform 1s ease,opacity 1s ease !important}",
        loop(time, root) {
          const p = time * 3, pts = [];
          for (let i = 0; i <= 200; i++) { const x = -5.5 + 11 * i / 200; pts.push([x, -2.6 + 0.35 * Math.sin(6 * x + p) + 0.15 * Math.sin(17 * x + 2.3 * p)]); }
          root.querySelector('[data-n="wave"]').setAttribute("d", pathD(pts));
        },
      });
  }

  // ════════ 00b 배경 ════════
  add("00b_배경 ① 두 부품", N["00b1"],
    TT("전기차를 움직이는 두 부품") +
    ln(-4, 0.2, -1.58, 0.2, { w: 6 }) + ln(-0.3, 0.2, 4.5, 0.2, { w: 6 }) +
    G(motor(-5, 0.2, 1.0, { spin: 1.25, rev: 1 }), { a: "fade" }) +
    G(gear(-1.58, 0.2, 0.45, 8, { spin: 1.25, rev: 1 }) + gear(-0.3, 0.2, 0.95, 16, { spin: 2.5 }), { a: "fade" }) +
    G(spinG(ci(4.5, 0.2, 1.0, { c: C.fg, w: 8 }) + Array.from({ length: 6 }, (_, i) => ln(4.5, 0.2, 4.5 + 0.95 * Math.sin(i * TAU / 6), 0.2 + 0.95 * Math.cos(i * TAU / 6), { w: 4 })).join(""), 4.5, 0.2, 2.5), { a: "fade" }) +
    t("모터", -5, -1.35, { size: 34, b: 1 }) + t("감속기", -0.3, -1.3, { size: 34, b: 1 }) + t("바퀴", 4.5, -1.35, { size: 34, b: 1 }) +
    t("회전을 만든다", -5, -1.95, { size: 30, c: C.ac, s: 1 }) + t("속도를 줄이고 힘을 키운다", -0.3, -1.95, { size: 30, c: C.ac, s: 2 }));

  add("00b_배경 ② 고장", N["00b2"],
    TT("여기에 고장이 생기면") +
    [["ECC20", "회전축이 어긋남"], ["DEMAG", "자석이 약해짐"], ["REDUC", "기어가 손상됨"]].map(([k, name], i) => {
      const x = (i - 1) * 4.3;
      return W({ s: i, a: "pop" }, pictogram(k, x, 0.9, 1.3)) + t(name, x, -0.55, { size: 32, b: 1, c: ST[k][1], s: i });
    }).join("") +
    W({ s: 3, a: "pop" }, warning(-3.7, -2.9, 0.8, C.bad)) + t("주행 중 차가 멈출 수 있다", -3.05, -2.9, { size: 38, b: 1, c: C.bad, al: "l", s: 3 }));

  add("00b_배경 ③ 자율주행", N["00b3"],
    TT("자율주행차라면") +
    W({ a: "draw", vars: "--dur:.9s" }, car(0, 0.3, 6)) +
    t("?", -0.4, 1.85, { size: 90, b: 1, c: C.warn, o: 1, a: "pop", d: 600 }) +
    t("운전자가 이상을 알아채기 어렵다", 0, -1.8, { size: 38, b: 1, o: 1 }) +
    [[C.ac, -1.2], [C.good, 0.2], [C.warn, 1.4]].map(([c, dx], i) =>
      W({ s: 1, a: "pop", d: i * 250 }, ci(dx, 0.2, 0.13, { fill: c }) + `<g class="ping" style="--bd:${i * 0.3}s">${ci(dx, 0.2, 0.13, { c, w: 3 })}</g>`)).join("") +
    t("차량이 센서 신호로 스스로 감지해야 한다", 0, -1.8, { size: 38, b: 1, c: C.good, s: 1 }));

  add("00b_배경 ④ 이 프로젝트", N["00b4"],
    TT("이 프로젝트") +
    W({ a: "wipe", vars: "--dur:.8s" }, seriesIcon(-3.55, 0.85, 3.0, 1.6)) + t("센서 신호", -3.55, -0.5, { size: 32, b: 1 }) +
    ar(-2.05, 0.5, -0.45, 0.5, { buff: 0.25, c: C.mu, w: 5, s: 1, a: "grow" }) +
    W({ s: 1, a: "pop", d: 200 }, rc(0.95, 0.5, 2.8, 1.6, { c: C.ac, w: 4, fill: C.ac, fo: 0.15, r: 0.2 })) + t("AI 모델", 0.95, 0.5, { size: 36, b: 1, s: 1, d: 400 }) +
    ar(2.35, 0.5, 3.95, 0.5, { buff: 0.25, c: C.mu, w: 5, s: 2, a: "grow" }) +
    t("정상", 4.5, 0.83, { size: 34, b: 1, c: C.good, s: 2, d: 400 }) + t("고장", 4.5, 0.17, { size: 34, b: 1, c: C.bad, s: 2, d: 400 }) +
    t("그렇다면 판정은 어디서 해야 할까?", 0, -2.9, { size: 40, b: 1, c: C.warn, s: 3 }));

  // ════════ 01a 서버 판정의 문제 ════════
  add("01a_서버판정의_문제", N["01a"],
    TT("서버에서 판정하면", { o: 5 }) + TT("판정 장치를 차량 안에", { s: 5, d: 1400 }) +
    W({ a: "fade", add: "5:mv", vars: `transform-origin:${X(-4.6)}px ${Y(-0.3)}px;`, n: "car" }, car(-4.6, -0.3, 3.2)) +
    G(server(4.8, -0.3, 1.8), { o: 5, a: "fade" }) +
    t("서버", 4.8, -1.6, { size: 24, c: C.mu, o: 5 }) + t("차량", -4.6, -1.32, { size: 24, c: C.mu, o: 5 }) +
    W({ s: 1, o: 5, a: "fade", add: "3:dim 4:!dim" }, ar(-2.8, 0.05, 3.82, 0.05, { c: C.ac, w: 4, a: "grow", s: 1 })) +
    t("신호 전송", 0.5, 0.38, { size: 22, c: C.ac, s: 1, o: 5 }) +
    W({ s: 2, o: 5, a: "fade", add: "3:dim 4:!dim 4:red" }, ar(3.82, -0.65, -2.8, -0.65, { c: C.good, w: 4, a: "grow", s: 2 })) +
    t("판정 결과", 0.5, -0.98, { size: 22, c: C.good, s: 2, o: 4 }) +
    G(tunnel(-0.25, 1.6, 1.0) + parking(0.65, 1.6, 0.75), { s: 3, o: 4, a: "fade" }) + t("터널, 지하주차장", 0.5, 2.35, { size: 24, s: 3, o: 4 }) +
    W({ s: 3, o: 4, a: "pop" }, cross(2.2, 0.05, 0.22) + cross(2.2, -0.65, 0.22)) +
    t("통신이 끊기면 판정이 멈춘다", 0.5, -1.75, { size: 28, c: C.bad, s: 3, o: 4 }) +
    W({ s: 4, o: 5, a: "pop" }, warning(0.5, 1.6, 1.0)) + t("통신망 공격", 0.5, 2.38, { size: 24, s: 4, o: 5 }) +
    t("잘못된 판정", 0.5, -0.98, { size: 22, c: C.bad, s: 4, o: 5 }) +
    W({ s: 5, a: "fly", d: 700, vars: `--fx:${L(4.5)}px;--fy:${-L(1.65)}px;` }, piBoard(0, -0.15, 1.1)) +
    t("통신 상태와 관계없이 판정", 0, -2.8, { size: 30, c: C.good, s: 5, d: 1400 }),
    { css: `.mv{transform:translate(${L(4.6)}px,0) scale(1.6)}` });

  // ════════ 01b 차량 컴퓨터 조건 ════════
  add("01b_차량컴퓨터_조건", N["01b"],
    TT("차량 안 컴퓨터의 조건") +
    G(piBoard(-3.6, -0.2, 4.2), { a: "fade" }) +
    t("라즈베리파이 4", -3.6, -2.13, { size: 30, b: 1 }) +
    t("ARM Cortex-A72 4코어 1.5GHz", -3.6, -2.7, { size: 22, c: C.mu }) + t("MCU가 아닌 소형 컴퓨터", -3.6, -3.18, { size: 22, c: C.mu }) +
    t("차량용 컴퓨터 대신 사용", -3.6, 1.69, { size: 30, b: 1, c: C.ac }) +
    G(checkbox(0.9, 0.85, 0.55, false) + t("모델이 작아야 한다", 1.5, 0.85, { size: 38, b: 1, al: "l" }), { s: 1, a: "up" }) +
    G(checkbox(0.9, -0.45, 0.55, false) + t("10초 안에 판정", 1.5, -0.45, { size: 38, b: 1, al: "l" }), { s: 2, a: "up" }));

  // ════════ 02a 차종 3 × 센서 3 ════════
  {
    const SEN = [["Current_U", "모터 전류"], ["Vib_Motor", "모터 진동"], ["Vib_TM", "감속기 진동"]];
    let s = TT("데이터: AI Hub 모터 감속기 고장 진단 데이터", { size: 40 });
    SEN.forEach(([, ko], c) => { s += t(ko, (c - 1) * 2.7 - 1.0, 1.91, { size: 30, b: 1 }); });
    ["IONIQ", "KONA", "NIRO"].forEach((car_, r) => {
      const y = (1 - r) * 1.74 - 1.05;
      s += t(car_, -5.25, y, { size: 30, b: 1, al: "r" });
      SEN.forEach(([code], c) => { s += im(`grid_${car_}_${code}.jpg`, (c - 1) * 2.7 - 1.0, y, 2.4, 1.54, { s: 1, a: "fade", d: r * 350 + c * 90 }); });
    });
    s += t("차종 3종", 3.6, 0.0, { size: 38, b: 1, c: C.ac, al: "l", s: 2 }) + t("× 센서 3종", 3.6, -0.7, { size: 38, b: 1, c: C.ac, al: "l", s: 2 });
    add("02a_차종3_센서3", N["02a"], s);
  }

  // ════════ 02a2 센서 3종 ════════
  {
    const cols = [C.ac, C.good, C.warn];
    const info = [["모터 전류", "Current_U", ["모터에 흐르는", "전기의 세기"]], ["모터 진동", "Vib_Motor", ["모터 몸체의", "떨림"]], ["감속기 진동", "Vib_TM", ["감속기 몸체의", "떨림"]]];
    let s = TT("센서 3종");
    info.forEach(([ko, code, desc], i) => {
      const x = (i - 1) * 4.05, col = cols[i], py = 0.7;
      let pic;
      if (i === 0) {
        const wavePts = Array.from({ length: 40 }, (_, k) => { const xx = 0.9 * k / 39; return [x + 0.15 + xx, py + 0.34 + 0.22 * Math.sin(xx * 14)]; });
        pic = motor(x - 0.5, py, 0.6, { spin: 2, rev: 1 }) + ln(x + 0.1, py, x + 1.1, py, { w: 4 }) + pl(wavePts, { c: col, w: 4 }) +
          [0, 1, 2].map(k => `<g class="flow" style="--fl:${L(0.95)}px;--bd:${k * 0.4}s">${ci(x + 0.12, py, 0.06, { fill: col })}</g>`).join("");
      } else if (i === 1) pic = motor(x, py, 0.6, { spin: 2, rev: 1 }) + vib(x, py, 0.6, col);
      else pic = gear(x, py, 0.6, 12, { spin: 3 }) + vib(x, py, 0.6, col);
      s += G(rc(x, -0.3, 3.6, 4.4, { c: col, w: 3, fill: col, fo: 0.08, r: 0.18 }) + pic, { s: i, a: "pop" }) +
        t(ko, x, -0.57, { size: 34, b: 1, c: col, s: i }) + t(code, x, -1.1, { size: 26, c: C.mu, s: i }) +
        desc.map((d, k) => t(d, x, -1.68 - k * 0.5, { size: 30, s: i })).join("");
    });
    s += t("같은 10초를 세 센서가 함께 기록한다", 0, -3.36, { size: 36, b: 1, s: 3 });
    add("02a2_센서3종_설명", N["02a2"], s);
  }

  // ════════ 02b 상태 5종 ════════
  {
    const desc = { NORMAL: ["고장 없음"], ECC10: ["회전축 중심이", "조금 어긋남"], ECC20: ["회전축 중심이", "많이 어긋남"], DEMAG: ["영구자석의", "자력이 약해짐"], REDUC: ["기어 이가", "손상됨"] };
    let s = TT("차량 상태 5종");
    Object.entries(ST).forEach(([k, [ko, col]], i) => {
      const x = (i - 2) * 2.7;
      s += G(rc(x, -0.3, 2.5, 3.9, { c: col, w: 3, fill: col, fo: 0.08, r: 0.18 }) + pictogram(k, x, 0.6, 1), { s: i, a: "pop" }) +
        t(ko, x, -0.69, { px: k === "REDUC" ? 38 : fpx(30), b: 1, c: col, s: i }) +
        desc[k].map((d, j) => t(d, x, -1.3 - j * 0.45, { size: 26, s: i })).join("");
    });
    add("02b_상태5종", N["02b"], s);
  }

  // ════════ 02c STFT ════════
  {
    const sd = D.stft, axY = 1.34, sx = i => -5.5 + 11 * i / (sd.x.length - 1);
    const sig = sd.x.map((v, i) => [sx(i), axY + v * 0.5]);
    const fr = { x: -5.5, top: -0.36, w: 11, h: 3 };
    let s = TT("STFT: 진동 신호를 이미지로 바꾸기", { size: 36 }) +
      t("예시 신호 (합성)", -5.5, 2.6, { size: 20, c: C.mu, al: "l" }) +
      ln(-5.5, axY, 5.5, axY, { c: C.fg, w: 2 }) + ln(-5.5, axY - 1, -5.5, axY + 1, { c: C.fg, w: 2 }) +
      W({ a: "wipe", vars: "--dur:2s" }, pl(sig, { c: C.sky, w: 1.5 })) +
      `<defs><clipPath id="stftclip"><rect data-n="clip" x="${X(fr.x)}" y="${Y(fr.top)}" width="0" height="${L(fr.h)}"/></clipPath></defs>` +
      G(`<g clip-path="url(#stftclip)">${im("stft.png", 0, fr.top - fr.h / 2, fr.w, fr.h, { pix: 1 })}</g>` + rc(0, fr.top - fr.h / 2, fr.w, fr.h, { c: "#888", w: 1 }) +
        t("주파수 →", -5.88, fr.top - fr.h / 2, { size: 20, rot: -90 }), { s: 1 }) +
      t("시간 →", 0, -3.69, { size: 20, s: 1, o: 2 }) +
      t("짧은 구간마다 FFT → 한 열", 0, 0.03, { size: 22, c: C.yel, s: 1, o: 2 }) +
      W({ s: 1, o: 2, a: "fade", n: "win" }, `<rect x="${X(-5.5)}" y="${Y(axY + 1)}" width="${L(11 * sd.win / sd.n)}" height="${L(2)}" fill="${C.yel}" fill-opacity=".15" stroke="${C.yel}" stroke-width="3"/>`) +
      t("주파수가 오르는 성분은 사선, 일정한 성분은 수평선", 0, -3.69, { size: 24, c: C.yel, s: 2 });
    add("02c_STFT ① 원리", N["02c1"], s, {
      steps: 2,
      hook(ctx) {
        const clip = ctx.$("clip"), win = ctx.$("win").firstElementChild, cols = sd.cols;
        // 처음 세 열은 천천히, 나머지는 빠르게 (영상과 같은 속도)
        const T1 = 1.5, T2 = (cols - 3) * 0.05, tot = T1 + T2;
        ctx.anim(1, tot * 1000, p => {
          const tt = p * tot, i = Math.min(cols - 1, tt < T1 ? Math.floor(tt / 0.5) : 3 + Math.floor((tt - T1) / 0.05));
          clip.setAttribute("width", L(fr.w * (i + 1) / cols));
          win.setAttribute("x", X(-5.5 + 11 * (i * sd.hop) / sd.n));
        });
      },
    });
    add("02c_STFT ② 실제 데이터", N["02c2"],
      TT("실제 데이터: IONIQ 모터 진동 (Vib_Motor)", { size: 32 }) +
      im("normal_vib.jpg", -3.25, 0.63, 6, 3.84, { a: "up" }) + t("NORMAL", -3.25, -1.69, { size: 26, c: C.good }) +
      im("demag_vib.jpg", 3.25, 0.63, 6, 3.84, { s: 1, a: "up" }) + t("DEMAG (자석 감자)", 3.25, -1.69, { size: 26, c: C.bad, s: 1 }) +
      t("고장이 생기면 주파수별 에너지 분포가 달라진다", 0, -3.45, { size: 26, s: 2 }));
  }

  // ════════ 02d 한 장 → 550,800장 ════════
  {
    const tags = [["차종", "IONIQ", C.fg], ["센서", "모터 진동", C.fg], ["상태", "감자 결함", C.bad], ["길이", "10초", C.ac]];
    const sc = 0.35, fx = -4.2, fy = -0.3, iw = 6.4 * sc, ih = 4.1 * sc;
    let s = TT("이미지 한 장에 담긴 것") +
      W({ a: "fade", add: "2:mv", vars: `transform-origin:${X(-2.3)}px ${Y(-0.3)}px;` }, im("demag_vib.jpg", -2.3, -0.3, 6.4, 4.1)) +
      t("2000 × 1280 픽셀", -2.3, -2.68, { size: 26, c: C.mu, o: 2 });
    tags.forEach(([k, v, c], i) => { s += t([{ t: k, c: C.mu, size: 30 }, { t: "  " }, { t: v, c, b: 1, size: 40 }], 1.7, 1.25 - i * 1.0, { al: "l", s: 1, o: 2, d: i * 700 }); });
    for (let i = 0; i < 14; i++) {
      const o = 0.09 * (i + 1);
      s += rc(fx + o, fy + o, iw, ih, { c: C.ac, w: 1.5, fill: "#EEF3F9", s: 2, a: "drop", d: 600 + i * 150 });
    }
    s += t("550,800장", 2.4, 0.4, { size: 64, b: 1, s: 2, d: 2900 }) + t("한 장 = 10초", 2.4, -0.4, { size: 34, c: C.mu, s: 2, d: 2900 });
    // 데이터 규모 카드 3개
    [["총 측정 시간", "약 510시간", "(약 21일)", C.fg], ["차종당", "약 1주일치", "", C.fg], ["조합당 균등", "12,240장", "(불균형 없음)", C.good]]
      .forEach(([k, v, sub, col], i) => {
        const x = (i - 1) * 3.0, y = -2.45;
        s += G(rc(x, y, 2.7, 1.6, { fill: "#F4F6F9", c: i === 2 ? C.good : C.dim, w: 2, r: 0.12 }) +
          t(k, x, y + 0.5, { size: 24, c: C.mu }) + t(v, x, y - 0.05, { size: 36, b: 1, c: col }) +
          (sub ? t(sub, x, y - 0.55, { size: 22, c: C.mu }) : ""), { s: 3, a: "up", d: i * 250 });
      });
    add("02d_이미지한장_550800장", N["02d"], s,
      { css: `.mv{transform:translate(${L(fx + 2.3)}px,0) scale(${sc})}` });
  }

  // ════════ 03a 기존 모델 ════════
  add("03a_기존모델_DeepLabV3", N["03a"],
    TT("기존 모델: DeepLabV3+") +
    t("스펙트로그램에서 고장 영역을 픽셀 단위로 찾아 분류하는 딥러닝 모델", 0, 2.6, { size: 30, c: C.ac }) +
    im("normal_vib.jpg", -4.8, 0, 3.4, 2.18, { a: "fade" }) + t("2000 × 1280 이미지", -4.8, -1.42, { size: 26, c: C.mu }) +
    ar(-3.1, 0, -1.8, 0, { buff: 0.2, s: 1, a: "grow" }) +
    W({ s: 1, a: "pop" }, rc(0, 0, 3.6, 3.0, { c: C.warn, w: 4, fill: C.warn, fo: 0.1, r: 0.2 })) +
    Array.from({ length: 9 }, (_, i) => rc(-1.36 + i * 0.34, 0, 0.22, 2.2 - Math.abs(i - 4) * 0.35, { c: C.warn, w: 1, fill: C.warn, fo: 0.35, s: 1, a: "gy", d: 300 + i * 110 })).join("") +
    t("DeepLabV3+", 0, 1.85, { size: 28, b: 1, c: C.warn, s: 1, d: 1300 }) +
    ar(1.8, 0, 3.7, 0.2, { buff: 0.2, s: 2, a: "grow" }) +
    t("99.63%", 4.9, 0.5, { size: 54, b: 1, s: 2, d: 400 }) + t("정확도", 4.9, -0.2, { size: 30, c: C.mu, s: 2, d: 400 }) +
    t([{ t: "모델 파일", c: C.mu, size: 30 }, { t: "   " }, { t: "45.17MB", c: C.warn, b: 1, size: 40 }], 0, -2.25, { s: 3 }));

  // ════════ 03b 목표 ════════
  {
    let s = TT("이 프로젝트의 목표");
    [["정확도", "기준 모델과 같은 수준"], ["모델 크기", "MB 단위로"], ["판정 시간", "10초 미만"]].forEach(([h, b], i) => {
      const y = 2.0 - i;
      s += G(checkbox(-4.35, y, 0.5, false) + t(h, -3.8, y, { size: 34, b: 1, al: "l" }) + t(b, -1.4, y, { size: 30, c: C.ac, al: "l" }), { s: i, a: "up" });
    });
    const x0 = -6, sec = 1.15, y = -2.3;
    s += W({ s: 3, a: "gx" }, ln(x0, y, x0 + sec * 10.4, y, { c: C.mu, w: 2 })) +
      [0, 1].map(k => ln(x0 + sec * 10 * k, y + 0.1, x0 + sec * 10 * k, y - 0.1, { c: C.mu, w: 2, s: 3 }) + t(`${10 * k}초`, x0 + sec * 10 * k, y - 0.38, { size: 18, c: C.mu, s: 3 })).join("") +
      rc(x0, y + 1.0, 0.6, 0.4, { c: C.ac, fill: C.ac, fo: 0.5, s: 3, a: "pop", d: 400 }) + t("이미지 1 도착", x0 + 0.1, y + 1.45, { size: 18, s: 3, d: 400, al: "m" }) +
      rc(x0 + 0.05 + (sec * 10 - 0.35) / 2, y + 0.35, sec * 10 - 0.35, 0.3, { c: C.good, w: 1.5, fill: C.good, fo: 0.15, s: 4, a: "gx", vars: "--dur:1.2s" }) +
      t("이 안에 판정을 끝내야 한다", x0 + 0.05 + (sec * 10 - 0.35) / 2, y + 0.35, { size: 22, c: C.good, s: 4, d: 900 }) +
      rc(x0 + sec * 10, y + 1.0, 0.6, 0.4, { c: C.ac, fill: C.ac, fo: 0.5, s: 4, a: "pop", d: 1300 }) + t("이미지 2 도착", x0 + sec * 10, y + 1.45, { size: 18, s: 4, d: 1300 }) +
      t("늦으면 다음 판정이 계속 밀린다", x0 + sec * 5, y - 0.95, { size: 22, c: C.bad, s: 5 });
    add("03b_목표3개", N["03b"], s);
  }

  // ════════ 04 전체 과정 지도 ════════
  add("04_전체과정_지도", N["04"], TT("전체 과정") + pipeline(-0.1, 13.4, { steps: 1 }));
  const transition = i => add(`04_전환_${i + 1} (${MAP[i]})`, "", pipeline(-0.1, 13.4, { active: i, done: Array.from({ length: i }, (_, k) => k) }));

  // ════════ 05 이미지를 숫자로 ════════
  transition(1);
  add("05a_색을_에너지로", N["05a"],
    TT("① Colormap 역변환: 색 → 에너지") +
    im("normal_vib.jpg", -3.55, 0.1, 4.9, 3.136, { a: "fade" }) + t("jet colormap 스펙트로그램", -3.55, -1.85, { size: 22, c: C.mu }) +
    G(im("ramp_jet.png", -3.55, -2.55, 4.4, 0.22, { pix: 1 }) + t("약", -6.05, -2.55, { size: 18, c: C.mu }) + t("강", -1.05, -2.55, { size: 18, c: C.mu }), { s: 1, a: "fade" }) +
    t("색만으로는 크기 순서를 비교하기 어렵다", 0, -3.3, { size: 24, c: C.warn, s: 1, o: 2 }) +
    ar(-1.1, 0.1, 1.1, 0.1, { buff: 0.2, c: C.ac, s: 2, a: "grow" }) +
    t("colormap", 0, 0.85, { size: 20, c: C.ac, s: 2 }) + t("역변환", 0, 0.47, { size: 20, c: C.ac, s: 2 }) +
    im("gray_Vib_Motor.png", 3.55, 0.1, 4.9, 3.136, { s: 2 }) + rc(3.55, 0.1, 4.95, 3.2, { fill: C.bg, cls: "cover", add: "2:gone", d: 300 }) +
    G(im("ramp_gray.png", 3.55, -2.55, 4.4, 0.22, { pix: 1 }) + t("약", 1.05, -2.55, { size: 18, c: C.mu }) + t("강", 6.05, -2.55, { size: 18, c: C.mu }), { s: 2, a: "fade", d: 1200 }) +
    t("에너지 세기 (밝을수록 강함)", 3.55, -1.85, { size: 22, c: C.mu, s: 2, d: 1200 }) +
    t("픽셀마다 색 → 에너지 근삿값", 0, -3.3, { size: 24, c: C.good, s: 2, d: 1400 }));

  {
    const cd = D.column, ax = axes(3.3, 1.3, 6.0, 2.0, [0, 1280], [0, 1]);
    const xs = cd.y.map((_, i) => i * 4), lx = -6.2 + 4.6 * cd.idx / cd.w;
    const chip = (cx, n, col, name, s_) => {
      let r = ""; const w = n * 0.17 - 0.04;
      for (let i = 0; i < n; i++) r += rc(cx - w / 2 + 0.065 + i * 0.17, -0.85, 0.13, 0.13, { c: col, w: 1, fill: col, fo: 0.6 });
      return G(r, { s: s_, a: "pop" }) + t(`${name} ${n}`, cx, -1.22, { size: 20, c: col, s: s_ });
    };
    add("05b_세로한줄_29개", N["05b"],
      TT("② 세로 한 줄 → 통계량 29개") +
      im("gray_Vib_Motor.png", -3.9, -0.2, 4.6, 2.944, { a: "fade" }) +
      t("주파수 →", -6.5, -0.2, { size: 20, c: C.mu, rot: -90 }) + t("시간 →", -3.9, -1.97, { size: 20, c: C.mu }) +
      rc(lx, -0.2, 0.06, 2.944, { fill: C.warn, fo: 0.9, s: 1, a: "pop" }) + t("한 시점 = 세로 1,280픽셀", -3.9, 1.6, { size: 22, c: C.warn, s: 1 }) +
      // 세로줄 복사본이 옆으로 누워 그래프의 가로축 자리로 간다 (영상의 ghost)
      rc(lx, -0.2, 0.06, 2.944, { fill: C.warn, fo: 0.9, s: 2, a: "ghost",
        vars: `--gx:${L(3.3 - lx)}px;--gy:${-L(0.5)}px;--gk:${(6.0 / 2.944).toFixed(3)};` }) +
      G(ax.svg, { s: 2, a: "fade", d: 900 }) + W({ s: 2, a: "wipe", d: 900 }, pl(curve(ax, xs, cd.y), { c: C.warn, w: 2 })) +
      t("주파수 →", 3.3, 0.02, { size: 18, c: C.mu, s: 2, d: 900 }) + t("에너지", 0.15, 1.3, { size: 18, c: C.mu, al: "r", s: 2, d: 900 }) +
      ar(3.0, -0.25, 2.3, -0.65, { c: C.mu, w: 3, s: 3, a: "grow", tip: 0.2 }) +
      chip(0.02, 4, C.ac, "기본", 3) + chip(1.84, 12, C.ac, "분포", 3) + chip(4.18, 12, C.ac, "차수", 3) + chip(6.0, 1, C.good, "RPM", 4) +
      t("1,280픽셀 → 통계량 29개", 3.0, -2.15, { size: 34, b: 1, s: 5 }) + t("이미지에서 28개 + RPM 1개", 3.0, -2.75, { size: 28, c: C.mu, s: 5 }));
  }

  {
    const cols = [C.ac, C.good, C.warn], SEN = [["Current_U", "모터 전류"], ["Vib_Motor", "모터 진동"], ["Vib_TM", "감속기 진동"]];
    const Wd = 11, H = 2.75, left = -4.8, top = -0.1, iw = 2.9, ih = 1.856;
    let s = TT("③ 센서 3개 → Multivariate Time Series");
    SEN.forEach(([code, ko], i) => {
      const x = (i - 1) * 3.6;
      s += G(im(`gray_${code}.png`, x, 1.25, iw, ih) + rc(x, 1.25, iw + 0.06, ih + 0.06, { c: cols[i], w: 3 }), { a: "fade" }) +
        t(ko, x, 2.52, { size: 28, b: 1, c: cols[i] }) +
        W({ s: 1, n: "cur" }, ln(x - iw / 2 + 0.25, 1.25 + ih / 2, x - iw / 2 + 0.25, 1.25 - ih / 2, { c: C.warn, w: 5 }));
      s += G(ln(left - 0.15, top - H * i / 3 - 0.05, left - 0.15, top - H * (i + 1) / 3 + 0.05, { c: cols[i], w: 8 }) +
        t("29", left - 0.5, top - H * (i + 0.5) / 3, { size: 28, b: 1, c: cols[i] }), { s: 1 });
      s += rc(left + 0.06, top - H * (i + 0.5) / 3, 0.12, H / 3, { fill: cols[i], fo: 0.9, s: 1, o: 2, a: "pop", d: 300 });
    });
    s += `<defs><clipPath id="mtsclip"><rect data-n="clip" x="${X(left)}" y="${Y(top)}" width="0" height="${L(H)}"/></clipPath></defs>` +
      W({ s: 2 }, `<g clip-path="url(#mtsclip)">${im("mts.png", left + Wd / 2, top - H / 2, Wd, H, { pix: 1 })}</g>`) +
      rc(left + Wd / 2, top - H / 2, Wd, H, { c: C.dim, w: 2, s: 1, a: "fade" }) +
      t("한 시점 = 통계량 87개", 0, -3.5, { size: 34, b: 1, s: 1, o: 2, d: 400 }) +
      t("10초 동안 2,000번 반복", 0, -3.5, { size: 34, b: 1, s: 2, o: 3 }) +
      t("Multivariate Time Series: 87 × 2,000", 0, -3.5, { size: 34, b: 1, c: C.ac, s: 3 });
    add("05c_다변량시계열_87x2000", N["05c"], s, {
      hook(ctx) {
        const clip = ctx.$("clip"), curs = ctx.$$("cur");
        ctx.anim(2, 6000, p => {
          clip.setAttribute("width", L(Wd * p));
          curs.forEach(c => { c.style.transition = "opacity 0s"; c.style.transform = `translateX(${L((iw - 0.5) * p)}px)`; });
        }, chewy);
      },
    });
  }

  // ════════ 06 특징 ════════
  {
    const e = D.basic, xs = e.map((_, i) => i * 1280 / (e.length - 1));
    const ax = axes(-2.3, -0.4, 8.2, 4.2, [0, 1280], [0, 1.05]);
    let k = 0; e.forEach((v, i) => { if (v > e[k]) k = i; });
    const on = e.map((v, i) => (v > 0.12 ? i : -1)).filter(i => i >= 0), a = xs[on[0]], b = xs[on[on.length - 1]];
    const [ax0, ay0] = ax.c2p(a, 0), [bx0] = ax.c2p(b, 0), [, top] = ax.c2p(0, 1.05);
    const area = [ax.c2p(0, 0), ...curve(ax, xs, e), ax.c2p(1280, 0)];
    const tag = (s_, col, i, st) => t(s_, 2.2, 1.45 - 0.9 * i, { size: 32, b: 1, c: col, al: "l", s: st });
    add("06a_기본특징_회전수", N["06a"],
      TT("기본 특징 4개 + RPM") +
      ax.svg + t("주파수 →", -2.3, -2.87, { size: 28, c: C.mu }) + t("세기", -6.4, 2.02, { size: 28, c: C.mu, al: "l" }) +
      pl(area, { close: 1, fill: C.good, fo: 0.35, s: 3, a: "fade" }) +
      rc((ax0 + bx0) / 2, (ay0 + top) / 2, bx0 - ax0, top - ay0, { fill: C.ac, fo: 0.18, s: 2, a: "pop" }) +
      G(ln(ax0, ay0, ax0, top, { c: C.ac, w: 4 }) + ln(bx0, ay0, bx0, top, { c: C.ac, w: 4 }), { s: 2, a: "draw" }) +
      W({ a: "wipe", vars: "--dur:1.2s", d: 300 }, pl(curve(ax, xs, e), { c: C.fg, w: 3 })) +
      W({ s: 1, a: "gy" }, ln(...ax.c2p(xs[k], 0), ...ax.c2p(xs[k], e[k]), { c: C.warn, w: 3, dash: "10 8" })) +
      ci(...ax.c2p(xs[k], e[k]), 0.12, { fill: C.warn, s: 1, a: "pop" }) +
      tag("① Peak Frequency", C.warn, 0, 1) + tag("②③ Band Start, End", C.ac, 1, 2) + tag("④ RMS", C.good, 2, 3) +
      G(motor(2.95, -2.0, 0.75, { spin: 1.25, rev: 1 }), { s: 4, a: "fade" }) + t("RPM", 4.05, -2.0, { size: 32, b: 1, al: "l", s: 4 }) +
      t("센서마다 5개", 0, -3.45, { size: 36, b: 1, c: C.ac, s: 5 }));
  }

  {
    const [fN, fD] = D.demag.funds;
    const imgs = [[-3.45, "NORMAL", "정상", C.good, fN], [1.85, "DEMAG", "감자 결함", C.bad, fD]];
    const bot = -2.4, H = 4.2, yrow = (h, f) => bot + H * f * h;
    let s = TT("감자 결함은 정상과 무엇이 다른가");
    imgs.forEach(([x, cls, ko, col, f]) => {
      s += im(`pair_${cls}.jpg`, x, -0.3, 3.9, H, { a: "fade" }) + t(ko, x, 2.22, { size: 34, b: 1, c: col }) + t("시간 →", x, -2.74, { size: 28, c: C.mu }) +
        ar(x + 1.95 + 0.7, -0.3, x + 2.0, yrow(1, f), { c: C.fg, w: 4, s: 1, a: "grow", tip: 0.25 });
    });
    s += t("주파수 →", -5.77, -0.3, { size: 28, c: C.mu, rot: -90 }) + t("Fundamental", 4.6, (yrow(1, fD) - 0.3) / 2, { size: 28, b: 1, al: "l", s: 1 }) +
      [0.5, 0.75, 1.25, 1.5].map((h, i) => ln(1.85 - 1.95 - 0.27, yrow(h, fD), 1.85 - 1.95 - 0.04, yrow(h, fD), { c: C.warn, w: 7, s: 2, a: "gx", d: i * 200 })).join("") +
      t("Sideband가 생긴다", 0, -3.45, { size: 34, b: 1, c: C.warn, s: 2, d: 800 });
    add("06b_감자결함 ① 사이드밴드", N["06b1"], s);
  }

  {
    const dm = D.demag, ax = axes(0, -0.15, 11.5, 4.0, [0, 2.4], [0, 0.7]);
    const pk = dm.h.reduce((bi, v, i) => (Math.abs(v - 1) < Math.abs(dm.h[bi] - 1) ? i : bi), 0);
    const yb = ax.c2p(0, 0)[1], yt = ax.c2p(0, 0.7)[1];
    // 주파수를 12구간으로 나누고, 구간 에너지 ÷ 전체 에너지 = Band Energy Ratio
    const NB = 12, bw = 2.4 / NB, KB = 3, SB = [1, 2, 3, 6, 7];  // KB: 예시로 칠하는 구간, SB: Sideband가 있는 구간
    const ratio = a => { const b = Array(NB).fill(0); dm.h.forEach((h, i) => { b[Math.min(NB - 1, Math.floor(h / bw + 1e-9))] += a[i]; }); const tot = b.reduce((x, y) => x + y, 0); return b.map(v => v / tot); };
    const rN = ratio(dm.normal), rD = ratio(dm.demag);
    const under = (lo, hi) => { const p = dm.h.map((h, i) => [h, dm.demag[i]]).filter(([h]) => h >= lo - 1e-9 && h <= hi + 1e-9); return [ax.c2p(p[0][0], 0), ...p.map(([h, v]) => ax.c2p(h, v)), ax.c2p(p[p.length - 1][0], 0)]; };
    const [kx] = ax.c2p(bw * (KB + 0.5), 0);
    const g = ax.svg +
      [[0.5, "½"], [1, "기본"], [1.5, "1½"], [2, "2"]].map(([v, l]) => t(l, ax.c2p(v, 0)[0], -2.5, { size: 28, c: C.mu })).join("") +
      t("기본 주파수의 몇 배인가 →", 0, -2.95, { size: 28, c: C.mu }) + t("평균 세기 →", -6.1, -0.15, { size: 28, c: C.mu, rot: -90 }) +
      pl(under(0, 2.4), { close: 1, fill: C.bad, fo: 0.12, s: 5, a: "fade", d: 900 }) +
      pl(under(bw * KB, bw * (KB + 1)), { close: 1, fill: C.ac, fo: 0.55, s: 5, a: "fade", d: 1400 }) +
      [0.25, 0.5, 0.75, 1.25, 1.5].map(c => rc(ax.c2p(c, 0)[0], (yb + yt) / 2, 11.5 * 0.04 / 2.4, yt - yb, { fill: C.warn, fo: 0.2, s: 2, a: "fade" })).join("") +
      W({ a: "wipe", vars: "--dur:1s" }, pl(curve(ax, dm.h, dm.normal), { c: C.mu, w: 5 })) +
      W({ s: 1, a: "wipe", vars: "--dur:1s" }, pl(curve(ax, dm.h, dm.demag), { c: C.bad, w: 5 })) +
      t("정상", 6.5, 2.55, { size: 30, b: 1, c: C.mu, al: "r" }) + t("감자 결함", 6.5, 2.1, { size: 30, b: 1, c: C.bad, al: "r", s: 1 }) +
      ci(...ax.c2p(1.0, dm.demag[pk]), 0.14, { fill: C.warn, s: 3, o: 4, a: "pop" }) +
      Array.from({ length: NB - 1 }, (_, i) => W({ s: 4, a: "gy", d: i * 70 }, ln(...ax.c2p(bw * (i + 1), 0), ...ax.c2p(bw * (i + 1), 0.7), { c: C.ac, w: 3, dash: "10 8" }))).join("") +
      t("구간 k", kx, yt + 0.3, { size: 30, b: 1, c: C.ac, s: 5, d: 1400 });
    // 단계 5: 그래프가 왼쪽으로 줄어든 뒤, 칠한 넓이의 복사본이 오른쪽 식으로 날아간다
    // 파란 넓이(구간 k) → 분자, 빨간 넓이(전체) → 분모
    const P = [-7.8, 1.2], k6 = 0.6, shr = ([x, y]) => [P[0] + k6 * (x - P[0]), P[1] + k6 * (y - P[1])];
    const fx = 4.6, lineY = 0, fl = 2.6, fr = 6.6;
    const flyTo = (pts, tx, ty, tw, th, col, fo) => {
      const q = pts.map(shr), xs_ = q.map(p => p[0]), ys_ = q.map(p => p[1]);
      const x0 = Math.min(...xs_), x1 = Math.max(...xs_), y0 = Math.min(...ys_), y1 = Math.max(...ys_);
      const k = Math.min(tw / (x1 - x0), th / (y1 - y0));
      return pl(q, { close: 1, fill: col, fo, cls: "fly2", vars: `--dx:${L(tx - (x0 + x1) / 2)}px;--dy:${-L(ty - (y0 + y1) / 2)}px;--k:${k.toFixed(3)};`, s: 5 });
    };
    const s = TT("96장씩 평균하면") +
      W({ add: "5:shrink", cls: "mv", origin: P }, g) +
      G(t([{ t: "BER", b: 1 }, { t: "k", c: C.ac, b: 1, size: 24 }, { t: " =" }], 1.15, lineY, { size: 38, al: "l" }) +
        ln(fl, lineY, fr, lineY, { c: C.fg, w: 4 }), { s: 5, a: "fade", d: 1000 }) +
      flyTo(under(0, 2.4), fx, lineY - 0.85, fr - fl - 0.2, 1.2, C.bad, 0.35) +
      flyTo(under(bw * KB, bw * (KB + 1)), fx, lineY + 0.85, 1.6, 1.2, C.ac, 0.75) +
      t("구간 k 에너지", fx, lineY + 1.85, { size: 32, b: 1, c: C.ac, s: 5, d: 3300 }) +
      t("전체 에너지", fx, lineY - 1.85, { size: 32, b: 1, c: C.bad, s: 5, d: 3300 }) +
      t(`이 구간의 비율: ${(rD[KB] * 100).toFixed(1)}%`, fx, lineY - 2.55, { size: 28, c: C.mu, s: 5, d: 3500 }) +
      t("Peak 위치는 둘 다 같다 → 기본 4개로는 구분 못 함", 0, -3.45, { size: 32, b: 1, s: 3, o: 4 }) +
      t("주파수를 12개 구간으로 나눈다", 0, -3.45, { size: 36, b: 1, c: C.ac, s: 4, o: 5 }) +
      t("Band Energy Ratio 12개 = 분포 특징 12개", 0, -3.45, { size: 36, b: 1, c: C.ac, s: 5, d: 3700 });
    add("06b_감자결함 ② 분포 특징", N["06b2"], s, { css: ".shrink{transform:scale(.6)}" });
  }

  {
    const od = D.order, n = od.rpm.length;
    const ax1 = axes(0.9, 1.05, 10.5, 2.0, [0, 1280], [0, 1.05]), ax2 = axes(0.9, -2.0, 10.5, 2.0, [0, 3], [0, 1.05]);
    const xa = od.abs[0].map((_, i) => i * 5), xo = od.ord[0].map((_, i) => i * 0.015);
    let s = TT("차수(Order) 변환을 통한 고장 신호 위치 고정") +
      ax1.svg + t("Frequency", -4.65, 1.05, { size: 30, b: 1, al: "r" }) +
      `<path data-n="c1" fill="none" stroke="${C.fg}" stroke-width="3" stroke-linejoin="round"/>` +
      W({ n: "rpm" }, t("", 6.6, 2.5, { size: 36, b: 1, c: C.warn, al: "r" })) +
      t("RPM ↑ → Peak가 오른쪽으로 이동", 0.9, -0.5, { size: 32, b: 1, s: 1 }) +
      G(ax2.svg, { s: 2, a: "fade" }) + t("÷ RPM", -4.65, -2.0, { size: 30, b: 1, c: C.ac, al: "r", s: 2 }) +
      W({ s: 2 }, `<path data-n="c2" fill="none" stroke="${C.ac}" stroke-width="3" stroke-linejoin="round"/>`) +
      t("같은 고장이 항상 같은 자리에 (차수축)", 0.9, -3.55, { size: 32, b: 1, c: C.ac, s: 3 });
    const setRow = (ctx, i, both) => {
      i = Math.max(0, Math.min(n - 1, Math.round(i)));
      ctx.root.querySelector('[data-n="c1"]').setAttribute("d", pathD(curve(ax1, xa, od.abs[i])));
      if (both) ctx.root.querySelector('[data-n="c2"]').setAttribute("d", pathD(curve(ax2, xo, od.ord[i]).filter(([x]) => x <= 6.15)));
      ctx.$("rpm").querySelector("text").textContent = `${od.rpm[i].toLocaleString()} rpm`;
    };
    add("06c_절대축_차수축 ① 움직이는 주파수", N["06c1"], s, {
      hook(ctx) {
        if (ctx.step >= 2) ctx.anim(2, 5000, p => setRow(ctx, p * (n - 1), true));
        else ctx.anim(0, 5000, p => setRow(ctx, p * (n - 1), false), t => t, 300);
      },
    });
  }

  // ════════ 06c ② 절대축과 차수축은 서로의 약점을 채운다 ════════
  {
    const cw = 5.9, top = 2.5, bot = -1.5, yP = -0.35, yC = -1.05;
    const card = (cx, ord, d) => {
      const col = ord ? C.ac : C.warn, x0 = cx - 1.5, x1 = cx + 1.7, y0 = 0.6, y1 = 1.6, left = cx - cw / 2 + 0.4;
      let m = ln(x0, y0, x1, y0, { c: C.mu, w: 2 }) + ln(x0, y0, x0, y1, { c: C.mu, w: 2 }) +
        t("RPM ↑", x0 - 0.15, (y0 + y1) / 2, { size: 20, c: C.mu, al: "r" }) + t(ord ? "Frequency ÷ RPM →" : "Frequency →", (x0 + x1) / 2, y0 - 0.25, { size: 20, c: C.mu });
      // 절대축: RPM이 오르면 고장 성분이 오른쪽으로 기운다 / 차수축: 늘 같은 자리
      [1, 2, 3].forEach(k => { m += ord ? ln(x0 + 0.95 * k, y0 + 0.05, x0 + 0.95 * k, y1, { c: col, w: 4 }) : ln(x0 + 0.3 * k, y0 + 0.05, x0 + 0.98 * k, y1, { c: col, w: 4 }); });
      const pros = ord ? "고장 위치가 한 자리에 고정" : "RPM 정보를 그대로 담는다", cons = ord ? "RPM 정보가 사라진다" : "RPM이 바뀌면 고장 위치가 이동";
      const okMark = pl([[left - 0.12, yP + 0.01], [left - 0.02, yP - 0.11], [left + 0.15, yP + 0.13]], { c: C.good, w: 5 });
      return G(rc(cx, (top + bot) / 2, cw, top - bot, { c: col, w: 3, fill: col, fo: 0.05, r: 0.18 }) +
        t([{ t: ord ? "차수축" : "절대축", b: 1, c: col }, { t: ord ? "  Order" : "  Frequency", c: C.mu, size: 26 }], cx, 2.1, { size: 36 }) + m +
        okMark + t(pros, left + 0.35, yP, { size: 28, b: 1, al: "l" }), { a: "up", d }) +
        W({ a: "up", add: "1:dim", d }, cross(left + 0.01, yC, 0.12, C.bad, 5) + t(cons, left + 0.35, yC, { size: 28, b: 1, c: C.bad, al: "l" }));
    };
    // 가운데 X: 한쪽 장점이 다른 쪽 약점을 채운다
    const xs = 0.6;
    add("06c_절대축_차수축 ② 상호보완", N["06c2"],
      TT("절대축과 차수축의 상호보완") + card(-3.55, false, 0) + card(3.55, true, 400) +
      t("보완", 0, 0.25, { size: 30, b: 1, c: C.good, s: 1, a: "pop" }) +
      ar(-xs - 0.05, yP, xs, yC, { c: C.good, w: 5, tip: 0.26, s: 1, a: "grow", d: 200 }) +
      ar(xs + 0.05, yP, -xs, yC, { c: C.good, w: 5, tip: 0.26, s: 1, a: "grow", d: 500 }) +
      t([{ t: "상호보완관계", c: C.ac }, { t: "  →  ", c: C.mu }, { t: "절대축 12 + 차수축 12" }], 0, -2.6, { size: 42, b: 1, s: 1, d: 900 }));
  }

  {
    const lo = 0.85, hi = 0.98, H = 4.2, base = -2.6, x0 = -5.7, gap = 1.35;
    const steps = [
      ["12", 0.874, C.mu, "1단계", "기본 4개 × 센서 3", "출발점", ["감자 결함을 정상으로", "자주 착각한다"], C.mu],
      ["15", 0.881, C.ac, "2단계", "+ RPM", "채택", ["조금 올랐다", "보조 정보로 유지"], C.good],
      ["18", 0.873, C.dim, "3단계", "+ 온도", "기각", ["3차종 모두 떨어졌다"], C.bad],
      ["51", 0.964, C.ac, "4단계", "+ 분포 12 (절대축)", "채택", ["감자 결함을 맞히는 비율", "+12~16%p"], C.good],
      ["87", 0.973, C.ac, "5단계", "+ 차수 12 (차수축)", "채택", ["감자↔정상 착각", "704건 → 433건"], C.good],
      [null, null, null, "6단계", "+ 차량 정보 25개", "기각", ["+0.058%p", "우연과 구분되지 않는다"], C.bad],
    ];
    let s = TT("입력 피처 조합에 따른 모델 성능 변화") + ln(x0 - 0.7, base, x0 + gap * 4 + 0.7, base, { c: C.mu, w: 2 }) +
      t("macro-F1", x0 - 0.7, 2.1, { size: 28, c: C.mu, al: "l" });
    let bi = 0;
    steps.forEach(([ch, f1, bcol, step, title, verdict, reason, vcol], k) => {
      if (ch) {
        const h = (f1 - lo) / (hi - lo) * H, x = x0 + gap * bi;
        s += rc(x, base + h / 2, 0.95, h, { fill: bcol, fo: 0.9, s: k, a: "gy" }) +
          t(f1.toFixed(3), x, base + h + 0.3, { size: 30, b: 1, c: bcol === C.dim ? C.mu : C.fg, s: k, d: 500 }) +
          t(ch, x, base - 0.37, { size: 30, b: 1, c: C.mu, s: k });
        if (verdict === "기각") s += W({ s: k, a: "pop", d: 700 }, cross(x, base + h / 2, 0.33));
        bi++;
      }
      const vw = verdict.length * 0.55 + 0.45, vx = 1.2 + vw / 2;
      s += G(t(step, 1.2, 1.72, { size: 30, b: 1, c: C.mu, al: "l" }) + t(title, 1.2, 1.08, { size: 40, b: 1, al: "l" }) +
        rc(vx, 0.25, vw, 0.82, { c: vcol, w: 4, r: 0.1 }) + t(verdict, vx, 0.25, { size: 46, b: 1, c: vcol }) +
        reason.map((r, j) => t(r, 1.2, -0.55 - j * 0.5, { size: 30, b: 1, al: "l" })).join(""), { s: k, o: k + 1, a: "up" });
    });
    s += t("최종", 3.5, 1.3, { size: 40, b: 1, c: C.mu, s: 6 }) + t("87채널", 3.5, 0.35, { size: 64, b: 1, c: C.ac, s: 6 }) + t("29개 × 센서 3", 3.5, -0.6, { size: 36, b: 1, s: 6 });
    add("06d_시행착오_채택기각", N["06d"], s);
  }

  // ════════ 07 MiniRocket, 로지스틱 회귀 ════════
  transition(2);
  {
    const rk = D.rocket, n = 200, out = rk.out;
    const ax = axes(0, 1.4, 11, 1.8, [0, n], [-2.2, 2.2], { c: C.dim });
    const omin = Math.min(...out), omax = Math.max(...out);
    const ax2 = axes(0, -1.45, 11, 1.6, [0, n], [omin, omax], { c: C.dim });
    let bars = "";
    out.forEach((v, i) => { if (v > 0) bars += `<line data-i="${i}" x1="${X(ax2.c2p(i, 0)[0])}" y1="${Y(ax2.c2p(i, 0)[1])}" x2="${X(ax2.c2p(i, v)[0])}" y2="${Y(ax2.c2p(i, v)[1])}" stroke="${C.good}" stroke-width="2.2" opacity="0"/>`; });
    const s = TT("MiniRocket: Time Series → Feature Vector") +
      ax.svg + W({ a: "wipe", vars: "--dur:1s" }, pl(rk.x.map((v, i) => ax.c2p(i, v)), { c: C.fg, w: 2 })) +
      t("시계열 한 줄", -5.5, 2.6, { size: 30, c: C.mu, al: "l" }) +
      G(ax2.svg + ln(...ax2.c2p(0, 0), ...ax2.c2p(n, 0), { c: C.mu, w: 1.5, dash: "8 6" }) + t("Kernel 출력", -5.5, -0.36, { size: 30, c: C.mu, al: "l" }), { s: 1, a: "fade" }) +
      W({ s: 1 }, `<g data-n="bars">${bars}</g><path data-n="trace" fill="none" stroke="${C.ac}" stroke-width="2"/>`) +
      W({ s: 1, a: "fade", n: "win" }, rc(-5.5 + 11 * 4.5 / n, 1.4, 11 * 9 / n, 1.8, { c: C.warn, w: 3, fill: C.warn, fo: 0.18 })) +
      t("Kernel: 값이 미리 정해져 있다", 0, 0.14, { size: 30, b: 1, c: C.warn, s: 1 });
    add("07a_MiniRocket ① 커널", N["07a1"], s, {
      hook(ctx) {
        const trace = ctx.$("trace") || ctx.root.querySelector('[data-n="trace"]'), win = ctx.$("win"), lines = [...ctx.root.querySelectorAll('[data-n="bars"] line')];
        ctx.anim(1, 5000, p => {
          const k = Math.round(p * (out.length - 1));
          trace.setAttribute("d", pathD(out.slice(0, k + 1).map((v, i) => ax2.c2p(i, v))));
          lines.forEach(l => l.setAttribute("opacity", +l.dataset.i <= k ? 1 : 0));
          win.style.transition = "opacity .45s";
          win.style.transform = `translateX(${L(11 * k / n)}px)`;
        }, chewy);
      },
    });
  }
  {
    // Time Series 하나에 Kernel을 하나씩 대면 값이 하나씩 나오고, 그 값을 세로로 쌓은 것이 Feature Vector
    // Kernel 그림: 길이 9, 가중치 2(위로 3개)와 −1(아래로 6개). 칸 간격(dilation)이 Kernel마다 다르다
    const rows = [["#1", 1, [0, 3, 7], "0.42"], ["#2", 1.5, [1, 4, 5], "0.17"], ["#3", 2.1, [2, 6, 8], "0.88"], null, ["#9,996", 2.5, [0, 1, 8], "0.35"]];
    const ys = [1.85, 0.95, 0.05, -0.75, -1.55], gx = -2.05, vx = 2.3;
    const kernel = (y, dil, twos) => {
      const sp = 0.075 * dil;
      let k = ln(gx - 0.05, y, gx + sp * 8 + 0.05, y, { c: C.dim, w: 2 });
      for (let j = 0; j < 9; j++) { const up = twos.includes(j), x = gx + sp * j; k += ln(x, y, x, up ? y + 0.27 : y - 0.14, { c: up ? C.warn : C.mu, w: 6 }); }
      return k;
    };
    let s = TT("Kernel 약 1만 개 → Feature 9,996개") +
      G(im("mts.png", -5.6, 0.15, 2.3, 1.6, { pix: 1 }) + rc(-5.6, 0.15, 2.34, 1.64, { c: C.dim, w: 2 }) +
        t("Time Series", -5.6, -0.95, { size: 30, b: 1 }) + t("87 × 2,000", -5.6, -1.45, { size: 26, c: C.mu }), { a: "fade" }) +
      ar(-4.35, 0.15, -3.55, 0.15, { c: C.mu, w: 4, a: "grow", d: 300 }) +
      rc(-1.3, 0.15, 4.4, 4.5, { c: C.warn, w: 2, fill: C.warn, fo: 0.06, r: 0.15, a: "fade", d: 300 }) +
      t("Kernel", -1.3, 2.65, { size: 28, b: 1, c: C.warn, a: "fade", d: 300 });
    rows.forEach((r, i) => {
      const y = ys[i], d = 600 + i * 350;
      if (!r) { s += t("⋮", -3.0, y, { size: 36, b: 1, c: C.mu, a: "fade", d }) + t("⋮", -1.2, y, { size: 36, b: 1, c: C.mu, a: "fade", d }) + t("⋮", vx, y, { size: 36, b: 1, c: C.mu, a: "fade", d }); return; }
      const [name, dil, twos, v] = r;
      s += t(name, -3.3, y, { size: 26, b: 1, al: "l", a: "fade", d }) + G(kernel(y, dil, twos), { a: "pop", d }) +
        rc(0.45, y, 0.75, 0.42, { c: C.good, w: 2, fill: C.good, fo: 0.12, r: 0.08, s: 2, a: "pop", d: i * 90 }) + t("고정", 0.45, y, { size: 20, b: 1, c: C.good, s: 2, d: i * 90 }) +
        ar(1.0, y, 1.62, y, { c: C.mu, w: 3, tip: 0.18, a: "grow", d: d + 150 }) +
        rc(vx, y, 0.9, 0.6, { c: C.ac, w: 2, fill: "#F4F6F9", r: 0.08, a: "pop", d: d + 300 }) + t(v, vx, y, { size: 26, b: 1, a: "pop", d: d + 300 });
    });
    // 값들을 묶는 괄호 = Feature Vector
    const bt = 2.35, bb = -2.0, bl = 1.7, br = 2.9;
    s += W({ a: "draw", d: 2300, vars: "--dur:.5s" }, pl([[bl + 0.15, bt], [bl, bt], [bl, bb], [bl + 0.15, bb]], { c: C.ac, w: 4 }) + pl([[br - 0.15, bt], [br, bt], [br, bb], [br - 0.15, bb]], { c: C.ac, w: 4 })) +
      t("Feature Vector", 3.3, 0.6, { size: 32, b: 1, al: "l", a: "fade", d: 2500 }) + t("9,996개", 3.3, -0.2, { size: 58, b: 1, c: C.ac, al: "l", a: "fade", d: 2500 }) +
      t("Kernel 하나 → 특징값 하나 (출력이 0보다 큰 비율)", 0, -2.85, { size: 32, b: 1, s: 1 }) +
      t("Kernel 값이 미리 정해져 있어 학습하지 않는다 → 변환이 빠르다", 0, -3.5, { size: 32, b: 1, c: C.good, s: 2 });
    add("07a_MiniRocket ② 특징 9,996개", N["07a2"], s);
  }

  transition(3);
  {
    const ax = axes(1.3, -0.55, 9.6, 4.4, [-6, 6], [0, 1], { c: C.mu });
    const sig = x => 1 / (1 + Math.exp(-1.4 * x));
    const r = rng(4), clip = v => Math.max(-5.9, Math.min(5.9, v));
    const dN = Array.from({ length: 18 }, () => clip(-2.6 + 1.1 * gauss(r))), dD = Array.from({ length: 18 }, () => clip(2.6 + 1.1 * gauss(r)));
    const [lx] = ax.c2p(-6, 0);
    let g = ax.svg +
      t("Score →", 1.3, -3.12, { size: 28, c: C.mu }) +
      t("100%", lx - 0.1, ax.c2p(0, 1)[1], { size: 26, c: C.mu, al: "r" }) + t("0%", lx - 0.1, ax.c2p(0, 0)[1], { size: 26, c: C.mu, al: "r" }) +
      t("감자 결함일", lx - 1.0, -0.35, { size: 28, c: C.mu, al: "r" }) + t("확률", lx - 1.0, -0.8, { size: 28, c: C.mu, al: "r" }) +
      dN.map((x, i) => ci(...ax.c2p(x, 0), 0.09, { fill: C.good, s: 1, a: "pop", d: i * 15 })).join("") + t("정상", ...ax.c2p(-5.0, 0.1), { size: 30, b: 1, c: C.good, s: 1 }) +
      dD.map((x, i) => ci(...ax.c2p(x, 1), 0.09, { fill: C.bad, s: 2, a: "pop", d: i * 15 })).join("") + t("감자 결함", ...ax.c2p(4.0, 1.14), { size: 30, b: 1, c: C.bad, s: 2 }) +
      W({ s: 3, a: "wipe", vars: "--dur:.6s" }, pl(Array.from({ length: 121 }, (_, i) => { const x = -6 + i * 0.1; return ax.c2p(x, sig(x)); }), { c: C.ac, w: 6 })) +
      W({ s: 3, a: "gx", d: 600, vars: "--dur:.3s" }, ln(...ax.c2p(-6, 0.5), ...ax.c2p(6, 0.5), { c: C.mu, w: 2, dash: "10 8" })) +
      t("50%", lx - 0.1, ax.c2p(0, 0.5)[1], { size: 26, c: C.mu, al: "r", s: 3, d: 800 });
    [[2.0, C.bad, "감자 결함", 4], [-2.2, C.good, "정상", 5]].forEach(([x, col, name, st]) => {
      const p = sig(x), [px, py] = ax.c2p(x, p), [, by] = ax.c2p(x, 0);
      // 판정 글자는 각 점 옆에 둔다. 두 예시 모두 끝까지 남긴다
      const hi = p >= 0.5;
      g += W({ s: st, a: "gy", d: 300, vars: "--dur:.3s" }, ln(px, by, px, py, { c: C.fg, w: 3, dash: "8 6" })) +
        W({ s: st, a: "gxr", d: 300 }, ln(lx, py, px, py, { c: col, w: 4 })) +
        W({ s: st, a: "rise", vars: `--ry:${L(py - (by - 0.6))}px;` }, `<circle class="el tint" data-s="${st}" style="--d:300ms" cx="${X(px)}" cy="${Y(py)}" r="${L(0.14)}" fill="${col}"/>`) +
        t(`${Math.round(p * 100)}%`, px + (hi ? 0.75 : -0.85), py + (hi ? -0.45 : 0.45), { size: 40, b: 1, c: col, s: st, d: 500 }) +
        t([{ t: "→ 판정  ", c: C.mu, size: 28 }, { t: name, c: col, b: 1, size: 34 }], hi ? px + 0.3 : px + 0.2, hi ? py - 1.05 : py + 1.0, { al: hi ? "l" : "r", s: st, d: 500 });
    });
    // 단계 6부터 그래프를 왼쪽으로 줄여 밀고, 오른쪽에 로지스틱 회귀를 고른 이유 3개를 하나씩
    const why = [["MiniRocket의 표준 분류기", "원 논문도 선형 분류기로 판정"], ["상태별 확률을 출력", "이상 점수 = 100 − P(정상)"], ["빠르고 가볍다", "분류 단계 1.57ms, 판정의 0.35%"]];
    let cards = t("로지스틱 회귀를 선택한 이유", 0.75, 2.45, { size: 32, b: 1, c: C.ac, al: "l", s: 6, d: 500 });
    why.forEach(([h, d], i) => {
      const y = 1.25 - i * 1.65;
      cards += G(rc(3.65, y, 6.2, 1.4, { c: C.dim, w: 2, fill: "#F4F6F9", r: 0.08 }) + rc(1.15, y + 0.3, 0.5, 0.5, { fill: C.ac }) +
        t(`${i + 1}`, 1.15, y + 0.3, { size: 28, b: 1, c: "#FFFFFF" }) + t(h, 1.6, y + 0.3, { size: 32, b: 1, al: "l" }) +
        t(d, 1.6, y - 0.28, { size: 26, c: C.mu, al: "l" }), { s: 6 + i, a: "up", d: i ? 0 : 600 });
    });
    add("07b_로지스틱회귀 ① 확률", N["07b1"], TT("로지스틱 회귀: 확률로 판정") + W({ add: "6:shift", cls: "mv", origin: [-7.1, 0.3] }, g) + cards,
      { css: ".shift{transform:scale(.52)}" });
  }
  {
    const probs = [["NORMAL", 0.03], ["ECC10", 0.01], ["ECC20", 0.01], ["DEMAG", 0.94], ["REDUC", 0.01]];
    let bars = "";
    probs.forEach(([k, p], i) => {
      const [ko, col] = ST[k], x = -4.6 + 2.3 * i, h = Math.max(4.2 * p, 0.05);
      bars += W(i === 3 ? { add: "1:pulse 2:!pulse" } : null, rc(x, -2 + h / 2, 1.3, h, { fill: col, fo: 0.9, a: "gy", d: 200 })) +
        t(k === "REDUC" ? "기어 결함" : ko, x, -2.42, { size: 28, b: 1, c: col }) + t(`${Math.round(p * 100)}%`, x, -2 + h + 0.32, { size: 32, b: 1, d: 1000 });
    });
    // 이상 점수: 막대들을 왼쪽으로 줄이고, 100% 기둥에서 정상 확률을 빼고 남은 부분이 이상 점수
    const sc = 0.68, tx = -3.1, cx = 2.4, H = 4.2, pN = 0.03, hN = H * pN;
    const SCORE = "#B91010", SCORE_T = "#D52F2F";  // 이상 점수: 채움은 진한 빨강, 글자는 조금 밝은 빨강
    let s = TT("5가지 상태 확률 모델을 활용한 최종 이상 점수 판정") +
      W({ add: "2:shrink", vars: `transform-origin:${X(0)}px ${Y(-2)}px;` }, bars) +
      rc(cx, -2 + H / 2, 1.4, H, { c: C.fg, w: 2, dash: "10 8", s: 2, a: "fade", d: 500 }) +
      t("100%", cx, 2.55, { size: 32, b: 1, s: 2, d: 500 }) +
      rc(cx, -2 + hN / 2, 1.4, hN, { fill: C.good, s: 2, a: "fly", d: 700, vars: `--fx:${L(tx + sc * -4.6 - cx)}px;--fy:0px;` }) +
      t([{ t: "P(정상)  ", c: C.mu, size: 28 }, { t: "3%", c: C.good, b: 1, size: 34 }], cx + 0.95, -1.85, { al: "l", s: 2, d: 2000 }) +
      rc(cx, -2 + hN + (H - hN) / 2, 1.4, H - hN, { fill: SCORE, s: 3, a: "gy" }) +
      t("97", cx, 0.2, { size: 54, b: 1, c: "#FFFFFF", s: 3, d: 700 }) +
      t("Anomaly Score", cx + 0.95, 0.85, { size: 32, b: 1, c: SCORE_T, al: "l", s: 3, d: 900 }) +
      t("= 100 − P(정상)", cx + 0.95, 0.2, { size: 32, c: C.mu, al: "l", s: 3, d: 1300 }) +
      t("= 100 − 3 = 97", cx + 0.95, -0.45, { size: 36, b: 1, al: "l", s: 3, d: 1800 }) +
      // 점수가 높으면 차량에 이상: 빨간 차 위에서 경고등이 깜빡인다
      G(car(5.3, 1.95, 2.6, { c: SCORE_T }) +
        `<g class="ping">${ci(5.3, 2.62, 0.13, { c: SCORE_T, w: 3 })}</g>` +
        `<g class="ping" style="--bd:.8s">${ci(5.3, 2.62, 0.13, { c: SCORE_T, w: 3 })}</g>` +
        `<g class="blink" style="animation-duration:.8s">${ci(5.3, 2.62, 0.13, { fill: "#FF3B3B" })}</g>`, { s: 4, a: "up" });
    add("07b_로지스틱회귀 ② 다섯 상태", N["07b2"], s, { css: `.pulse > *{animation:none} .shrink{transform:translate(${L(tx)}px,0) scale(${sc})}` });
  }

  // ════════ 08 공정한 비교 ════════
  {
    const PAL = ["#1F6FD1", "#16924F", "#D97B00", "#D9363E", "#7B45D6", "#B8960A"];
    const split = (grouped) => {
      const toTest = grouped ? [20, 21, 22, 23, 24] : [2, 8, 11, 17, 23, 26];
      const trUL = [1.2 - 2.15, 1.0], teUL = [5.0 - 1.15, 1.0];
      const slot = (ul, i, cols) => [ul[0] + 0.35 + (i % cols) * 0.55, ul[1] - 0.35 - Math.floor(i / cols) * 0.45];
      let s = TT(grouped ? "우리 연구: Session 단위 분할" : "기존 연구: 10초 조각 Random 분할") +
        t("측정 6번", -4.6, 1.55, { size: 30, c: C.mu, o: 2 }) +
        G(rc(1.2, -0.5, 4.3, 3.0, { c: C.mu, w: 2, r: 0.15 }) + rc(5.0, -0.5, 2.3, 3.0, { c: C.mu, w: 2, r: 0.15 }), { s: 1, a: "fade" }) +
        t("Train", 1.2, 1.32, { size: 24, s: 1 }) + t("Test", 5.0, 1.32, { size: 24, s: 1 });
      let ntr = 0, nte = 0, hl = "";
      const trainPos = {};
      for (let i = 0; i < 30; i++) {
        const r = Math.floor(i / 5), c = i % 5, x = -4.6 + (c - 2) * 0.5, y = -0.5 + 1.4 - r * 0.56;
        const test = toTest.includes(i), [tx, ty] = test ? slot(teUL, nte++, 4) : slot(trUL, ntr++, 7);
        if (!test) (trainPos[r] = trainPos[r] || []).push([tx, ty]);
        s += W({ a: "fade", add: "2:mv2", vars: `--dx:${L(tx - x)}px;--dy:${-L(ty - y)}px;--d:${i * 70}ms;` },
          rc(x, y, 0.5, 0.36, { fill: PAL[r], fo: 0.75, c: C.bg, w: 1.5 }));
      }
      if (!grouped) {
        for (const i of toTest) for (const [tx, ty] of trainPos[Math.floor(i / 5)] || []) hl += rc(tx, ty, 0.56, 0.42, { c: C.fg, w: 2.5 });
        s += G(hl, { s: 3, a: "fade" }) +
          t("같은 측정이 Train과 Test 양쪽에 → Data Leakage", 0, -2.95, { size: 36, b: 1, c: C.bad, s: 3 }) +
          t("Test 측정 1,066개 중 1,063개가 Train에도 있었다", 0, -3.5, { size: 30, b: 1, s: 3 });
      } else {
        s += t("데이터 누수 제거", 0, -2.95, { size: 36, b: 1, c: C.good, s: 3 }) + t("처음 보는 주행으로만 평가", 0, -3.5, { size: 32, b: 1, s: 3 });
      }
      return s;
    };
    const css = ".mv2{transform:translate(var(--dx),var(--dy));transition:transform .9s cubic-bezier(.4,0,.2,1) var(--d) !important}";
    add("08a_기존연구_무작위분할_누수", N["08a"], split(false), { css });
    add("08b_우리연구_측정단위분할", N["08b"], split(true), { css });
  }

  {
    const lo = 90, H = 3.4, base = -1.9;
    const data = [["기존 연구", "Leakage 있음", 99.65, C.dim], ["기존 연구", "Leakage 제거", 96.33, C.warn], ["우리 모델", "Leakage 제거", 96.90, C.ac]];
    let chart = ln(-5.2, base, 5.2, base, { c: C.mu, w: 2 });
    const vy = [];
    data.forEach(([who, how, v, col], i) => {
      const h = (v - lo) / 10 * H, x = -3.4 + 3.4 * i;
      vy.push(base + h + 0.42);
      chart += rc(x, base + h / 2, 1.8, h, { fill: col, fo: 0.9, s: i, a: "gy" }) + t(`${v.toFixed(2)}%`, x, base + h + 0.42, { size: 38, b: 1, c: i ? C.fg : C.mu, s: i, d: 600 }) +
        t(who, x, -2.32, { size: 32, b: 1, s: i }) + t(how, x, -2.8, { size: 28, b: 1, c: i === 0 ? C.bad : C.good, s: i });
    });
    chart += ar(-2.55, vy[0], -0.9, vy[1], { buff: 0.15, c: C.mu, w: 3, s: 1, a: "grow", d: 900 }) + t("−3.3%p", -1.1, 1.75, { size: 30, b: 1, c: C.bad, s: 1, d: 1300 });
    // 위로 볼록한 곡선 화살표 (96.33 → 96.90)
    const p0 = [0, vy[1] + 0.4], p1 = [3.4, vy[2] + 0.4], R = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    // 우리 모델 막대와 초록 화살표(+0.57%p)는 같은 클릭에 함께 나온다
    chart += W({ s: 2, a: "draw", d: 900, vars: "--dur:.6s" }, `<path d="M${X(p0[0])},${Y(p0[1])} A${L(R)},${L(R)} 0 0 1 ${X(p1[0])},${Y(p1[1])}" fill="none" stroke="${C.good}" stroke-width="4"/>`) +
      pl([[p1[0] - 0.05, p1[1] + 0.3], [p1[0], p1[1]], [p1[0] - 0.3, p1[1] + 0.05]], { c: C.good, w: 4, s: 2, d: 1500 }) +
      t("+0.57%p", 1.7, 2.45, { size: 36, b: 1, c: C.good, s: 2, d: 1500 }) + t("p = 0.288", 1.7, 1.95, { size: 28, s: 2, o: 3, d: 1500 });
    // 가설 검정은 한 클릭에 전부
    const tx = 0.7, hd = 700;
    const s = TT("Data Leakage 제거 후 비교") + t("Y축 90%부터", -6.6, 2.55, { size: 26, c: C.mu, al: "l", o: 3 }) +
      W({ add: "3:shrink", vars: `transform-origin:${X(0)}px ${Y(-0.2)}px;` }, chart) +
      G(t("가설 검정", tx, 2.0, { size: 34, b: 1, c: C.mu, al: "l" }) +
        t([{ t: "H₀  ", c: C.ac, size: 34 }, { t: "두 모델의 정확도가 같다", size: 32 }], tx, 1.2, { b: 1, al: "l" }) +
        t([{ t: "H₁  ", c: C.warn, size: 34 }, { t: "두 모델의 정확도가 다르다", size: 32 }], tx, 0.45, { b: 1, al: "l" }) +
        t([{ t: "p = 0.288   " }, { t: "> 0.05", c: C.mu }], tx, -0.45, { size: 36, b: 1, al: "l" }) +
        t("→ H₀를 기각할 수 없다", tx, -1.15, { size: 32, b: 1, al: "l" }) +
        rc(tx + 2.9, -2.35, 6.1, 1.25, { c: C.good, w: 4, r: 0.12 }) +
        t("통계적으로 유의한 차이 없음", tx + 0.2, -2.1, { size: 36, b: 1, c: C.good, al: "l" }) +
        t("= 같은 수준의 정확도", tx + 0.2, -2.62, { size: 32, b: 1, al: "l" }), { s: 3, a: "fade", d: hd });
    add("08c_정확도_비교", N["08c"], s, { css: `.shrink{transform:translate(${-L(3.4)}px,${L(0.2)}px) scale(.68)}` });
  }

  {
    const sc = 9.5 / 45.17, left = -5.75;
    add("08d_모델크기", N["08d"],
      TT("모델 크기") +
      t("기존 모델 (DeepLabV3+)", left, 1.5, { size: 34, b: 1, al: "l" }) +
      rc(left + 45.17 * sc / 2, 0.74, 45.17 * sc, 0.8, { fill: C.warn, fo: 0.9, a: "gx" }) + t("45.17MB", left + 45.17 * sc + 0.3, 0.74, { size: 42, b: 1, c: C.warn, al: "l", d: 800 }) +
      t("우리 모델 (3차종)", left, -0.76, { size: 34, b: 1, al: "l", s: 1 }) +
      rc(left + 2.17 * sc / 2, -1.52, 2.17 * sc, 0.8, { fill: C.ac, fo: 0.9, a: "gx", s: 1 }) + t("2.17MB", left + 2.17 * sc + 0.3, -1.52, { size: 42, b: 1, c: C.ac, al: "l", s: 1, d: 800 }) +
      t("약 1/20 크기", left, -2.92, { size: 44, b: 1, c: C.good, al: "l", s: 1, d: 1300 }));
  }

  {
    const names = [["감자"], ["편심", "주의"], ["편심", "결함"], ["정상"], ["기어"]];
    const pct = [[94.5, 0, 0, 5.5, 0], [0.1, 98.9, 1.0, 0.1, 0], [0.1, 1.4, 98.5, 0, 0], [5.6, 0.1, 0, 94.1, 0.2], [0.2, 0.1, 0, 0.5, 99.3]];
    const cw = 1.35, chh = 0.92, ox = -3.6, oy = 1.2, cx = c => ox + c * cw, cy = r => oy - r * chh;
    let s = TT("결과: Confusion Matrix");
    names.forEach((n, c) => { s += n.length === 1 ? t(n[0], cx(c), 1.98, { size: 26, b: 1 }) : t(n[0], cx(c), 2.2, { size: 26, b: 1 }) + t(n[1], cx(c), 1.8, { size: 26, b: 1 }); });
    names.forEach((n, r) => { s += t(n.join(" "), -4.4, cy(r), { size: 26, b: 1, al: "r" }); });
    s += t("Predicted →", -0.9, 2.65, { size: 26, c: C.mu }) + t("Actual ↓", -4.4, 1.85, { size: 26, c: C.mu, al: "r" });
    pct.forEach((row, r) => row.forEach((v, c) => {
      s += G(rc(cx(c), cy(r), cw - 0.08, chh - 0.08, { fill: lerpC("#F1F4F8", "#2F6FD6", Math.min(v / 60, 1)), r: 0.06 }) +
        t(v.toFixed(1), cx(c), cy(r), { size: r === c ? 28 : 26, b: r === c, c: v >= 40 ? "#FFFFFF" : v >= 1 ? C.fg : C.mu }), { a: "fade", d: r * 380 + c * 70 });
    }));
    s += G(Array.from({ length: 5 }, (_, i) => rc(cx(i), cy(i), cw - 0.04, chh - 0.04, { c: C.good, w: 4, r: 0.06 })).join(""), { s: 0, o: 1, a: "fade", d: 2500 }) +
      t("정확도", 3.6, 1.75, { size: 32, c: C.mu, al: "l", s: 1 }) + t("96.90%", 3.6, 1.05, { size: 64, b: 1, c: C.ac, al: "l", s: 1 }) +
      G(rc(cx(3), cy(0), cw - 0.02, chh - 0.02, { c: C.bad, w: 6, r: 0.06 }) + rc(cx(0), cy(3), cw - 0.02, chh - 0.02, { c: C.bad, w: 6, r: 0.06 }), { s: 2, a: "pop" }) +
      t("틀린 것의", 3.6, -0.85, { size: 32, c: C.mu, al: "l", s: 2, d: 400 }) + t("78%", 3.6, -1.55, { size: 64, b: 1, c: C.bad, al: "l", s: 2, d: 400 }) +
      t("감자 결함 ↔ 정상", 3.6, -2.25, { size: 36, b: 1, c: C.bad, al: "l", s: 2, d: 400 });
    add("08e_혼동행렬", N["08e"], s);
  }

  // ════════ 09 라즈베리파이 실측 ════════
  transition(4);
  {
    const res = [["정상", C.good], ["정상", C.good], ["감자 결함", C.bad]];
    let pkt = "";
    for (let i = 0; i < 10; i++) { const x = -4.4 + 0.05 + 0.07 * i, h = 0.15 + 0.25 * Math.abs(Math.sin(i * 1.7)); pkt += ln(x, 0.45, x, 0.45 + h, { c: C.warn, w: 5 }); }
    const s = TT("차량 안에서 실시간 판정") +
      ln(-4.4, 0.3, -1.7, 0.3, { c: C.dim, w: 6 }) + ln(1.7, 0.3, 3.5, 0.6, { c: C.dim, w: 6 }) +
      G(motor(-5.3, 0.3, 0.9, { spin: 2, rev: 1 }), { a: "fade" }) + t("모터 센서", -5.3, -1.14, { size: 30, b: 1 }) +
      G(piBoard(0, 0.3, 3.4), { a: "fade" }) +
      `<rect data-n="model" class="flash" x="${X(-1.78)}" y="${Y(1.5)}" width="${L(3.56)}" height="${L(2.4)}" rx="${L(0.18)}" fill="none" stroke="${C.ac}" stroke-width="0"/>` +
      t("우리 모델 탑재", 0, 1.93, { size: 32, b: 1, c: C.ac }) + t("라즈베리파이 4", 0, -1.36, { size: 30, b: 1 }) +
      rc(5.0, 0.6, 3.0, 2.2, { c: C.fg, w: 4, r: 0.15 }) + ln(5.0, -0.5, 5.0, -0.8, { w: 4 }) + ln(4.5, -0.8, 5.5, -0.8, { w: 4 }) +
      `<circle data-n="lamp" cx="${X(5)}" cy="${Y(0.9)}" r="${L(0.38)}" fill="${C.dim}" style="transition:fill .3s"/>` +
      `<text data-n="status" x="${X(5)}" y="${Y(0.2)}" font-size="${fpx(34)}" font-weight="600" text-anchor="middle" dominant-baseline="central"></text>` +
      t("화면", 5.0, -1.29, { size: 30, b: 1 }) +
      `<text data-n="clock" x="${X(6.6)}" y="${Y(2.43)}" font-size="${fpx(44)}" font-weight="600" fill="${C.warn}" text-anchor="end" dominant-baseline="central">0초</text>` +
      `<g data-n="pkt" class="packet" style="--px:${L(4.4)}px;opacity:0">${pkt}</g>` +
      t("판정 0.455초", 0, -2.03, { size: 40, b: 1, c: C.ac, s: 1, d: 1500 });
    add("09_라즈베리파이_실측 ① 실시간 판정", N["091"], s, {
      steps: 3,
      hook(ctx) {
        const lamp = ctx.$("lamp"), st = ctx.$("status"), clock = ctx.$("clock"), pk = ctx.$("pkt"), model = ctx.$("model");
        const show = k => {
          if (k <= 0) { lamp.setAttribute("fill", C.dim); st.textContent = ""; clock.textContent = "0초"; return; }
          const [name, col] = res[Math.min(k, 3) - 1];
          lamp.setAttribute("fill", col); st.textContent = name; st.setAttribute("fill", col);
          clock.textContent = `${Math.min(k, 3) * 10}초`;
        };
        pk.classList.remove("go");
        if (ctx.fwd && ctx.step >= 1 && ctx.step <= 3) {
          show(ctx.step - 1);
          ctx.replay(pk);
          ctx.after(1200, () => { ctx.replay(model); show(ctx.step); });
        } else show(ctx.step);
      },
    });
    const Wd = 12, jw = Wd * 0.455 / 10, segs = [[452.08, C.ac], [1.35, C.warn], [1.57, C.good]];
    let x = -6, sg = "";
    segs.forEach(([ms, col]) => { const w = Math.max(Wd * ms / 455, 0.07); sg += rc(x + w / 2, -1.6, w, 0.9, { fill: col, fo: 0.95 }); x += Wd * ms / 455; });
    add("09_라즈베리파이_실측 ② 0.455초의 구성", N["092"],
      TT("판정 시간") +
      rc(0, 0.9, Wd, 0.9, { fill: C.mu, fo: 0.25, a: "gx" }) + t("다음 신호까지 10초", 6, 1.82, { size: 34, b: 1, c: C.mu, al: "r", d: 700 }) +
      rc(-6 + jw / 2, 0.9, jw, 0.9, { fill: C.bad, s: 1, a: "gx" }) + t("판정 0.455초", -6, 1.82, { size: 40, b: 1, c: C.bad, al: "l", s: 1 }) +
      W({ s: 2, a: "fade", vars: "--dur:.6s" }, ln(-6, 0.45, -6, -1.15, { c: C.mu, w: 2, dash: "8 6" }) + ln(-6 + jw, 0.45, 6, -1.15, { c: C.mu, w: 2, dash: "8 6" })) +
      W({ s: 2, a: "gx", d: 300 }, sg) +
      t("MiniRocket 99%", 0, -1.6, { size: 36, b: 1, s: 2, d: 900 }) + t("Normalize, Classifier 1%", 6, -2.54, { size: 30, b: 1, c: C.mu, al: "r", s: 2, d: 900 }));
  }

  // ════════ 10 대시보드와 계기판 (디자인 시안 화면을 정상, 주의, 결함으로 고정해 찍은 이미지) ════════
  {
    const S3 = [["ok", "정상", C.good, 12, "회색"], ["warn", "주의", C.warn, 48, "주황"], ["fail", "결함", C.bad, 92, "빨강"]];
    const bx0 = -5.9, bw = 11.8, by = 1.95, px = v => bx0 + bw * v / 100;
    const stack = (img, cx, cy, w, h) => S3.map(([k], i) => im(`${img}_${k}.jpg`, cx, cy, w, h, i ? { s: i, a: "fade" } : {})).join("");
    let s = TT("결과 화면: 대시보드와 계기판");
    // 점수 띠: 0~30 정상, 30~70 주의, 70~100 결함
    [[0, 30, 0], [30, 70, 1], [70, 100, 2]].forEach(([a, b, i]) => {
      const [, ko, col] = S3[i], cx = px((a + b) / 2);
      s += rc(cx, by, bw * (b - a) / 100 - 0.04, 0.3, { fill: col, fo: 0.9, r: 0.04, a: "gx", d: i * 150 }) +
        t([{ t: ko, c: col, b: 1, size: 30 }, { t: `  ${a}~${b}`, c: C.mu, size: 26 }], cx, by - 0.45, {});
    });
    // 바늘: 단계마다 12 → 48 → 92로 옮겨 간다
    s += W({ add: "1:p1 2:p2", cls: "needle" },
      pl([[px(12), by + 0.2], [px(12) - 0.14, by + 0.44], [px(12) + 0.14, by + 0.44]], { close: 1, fill: C.fg }) +
      S3.map(([, ko, col, v], i) => t([{ t: `${v}`, b: 1, size: 34 }, { t: `  ${ko}`, c: col, b: 1, size: 30 }], px(12), by + 0.72,
        { s: i, o: i < 2 ? i + 1 : undefined })).join(""));
    // 대시보드 (정비사용)
    s += stack("dash", -3.45, -1.15, 7.0, 4.375) + rc(-3.45, -1.15, 7.0, 4.375, { c: C.dim, w: 2, r: 0.04 }) +
      t([{ t: "대시보드", b: 1, size: 30 }, { t: "   정비사용, 이상 점수와 클래스별 확률", c: C.mu, size: 26 }], -3.45, -3.68, {});
    // 계기판 (운전자용) + 모터 아이콘 확대
    const ix = 3.428, iy = -0.529, zx = 2.29, zy = -2.0;
    s += stack("clus", 3.65, -0.95, 6.3, 3.94) + rc(3.65, -0.95, 6.3, 3.94, { c: C.dim, w: 2, r: 0.04 }) +
      S3.map(([k, , band, , gray], i) => {
        const col = i ? band : C.mu;  // 계기판은 정상일 때 회색 아이콘이라 테두리도 회색
        const ring = ci(ix, iy, 0.24, { c: col, w: 3 });
        return G((i === 2 ? `<g class="blink">${ring}</g>` : ring) + ln(ix - 0.2, iy - 0.15, zx + 0.6, zy + 0.7, { c: col, w: 2, dash: "6 5" }) +
          rc(zx, zy, 1.7, 1.65, { fill: "#05070A", c: col, w: 3, r: 0.1 }) + im(`icon_${k}.png`, zx, zy + 0.18, 1.0, 1.0) +
          t(`${gray} = ${S3[i][1]}`, zx, zy - 0.56, { px: 30, b: 1, c: col }), { s: i, o: i < 2 ? i + 1 : undefined, a: i ? "pop" : undefined });
      }).join("") +
      t([{ t: "계기판", b: 1, size: 30 }, { t: "   운전자용, 이상이 있을 때만 색으로 강조", c: C.mu, size: 26 }], 3.65, -3.68, {});
    add("10_대시보드_계기판", N["10"], s,
      { css: `.needle{transition:transform .9s cubic-bezier(.4,0,.2,1) !important} .p1{transform:translateX(${L(px(48) - px(12))}px)} .p2{transform:translateX(${L(px(92) - px(12))}px)} .blink{animation-duration:1s}` });
  }

  // ════════ 11 정리 ════════
  {
    let s = TT("정리") + G(pipeline(0.85, 12.6), { a: "fade" });
    [["정확도", "96.90%  기존 모델과 같은 수준"], ["모델 크기", "2.17MB  기존의 약 1/20"], ["판정 시간", "0.455초  목표 10초"]].forEach(([h, r], i) => {
      const y = -1.25 - i * 0.9;
      s += checkbox(-4.32, y, 0.55, false) + W({ s: i + 1, a: "draw", vars: "--dur:.35s" }, checkbox(-4.32, y, 0.55, true).replace(/^<rect[^>]*\/>/, "")) +
        t(h, -3.75, y, { size: 36, b: 1, al: "l" }) + t(r, -1.45, y, { size: 36, b: 1, c: C.good, al: "l", s: i + 1, d: 250 });
    });
    add("11_정리", N["11"], s);
  }

  // 발표 흐름: stops에 든 단계만 클릭으로 넘기고, 나머지 단계는 앞 단계가 끝나면 저절로 이어진다.
  // wait[k] = 단계 k로 저절로 넘어가기 전에 기다리는 시간(ms, 기본 1100). 표에 없는 슬라이드는 모든 단계가 클릭.
  const FLOW = {
    "00_오프닝": { stops: [], wait: { 1: 600, 2: 1900, 3: 1800 } },
    "00b_배경 ① 두 부품": { stops: [1, 2] },
    "00b_배경 ② 고장": { stops: [1, 2, 3] },
    "00b_배경 ③ 자율주행": { stops: [1] },
    "00b_배경 ④ 이 프로젝트": { stops: [1, 2, 3] },
    "01a_서버판정의_문제": { stops: [3, 4, 5] },
    "01b_차량컴퓨터_조건": { stops: [1, 2] },
    "02a_차종3_센서3": { stops: [2] },
    "02a2_센서3종_설명": { stops: [1, 2] },
    "02b_상태5종": { stops: [1, 2, 3, 4] },
    "02c_STFT ① 원리": { stops: [2] },
    "02c_STFT ② 실제 데이터": { stops: [2] },
    "02d_이미지한장_550800장": { stops: [2, 3] },
    "03a_기존모델_DeepLabV3": { stops: [2, 3] },
    "04_전체과정_지도": { stops: [1, 2, 3, 4] },
    "05a_색을_에너지로": { stops: [2] },
    "05b_세로한줄_29개": { stops: [2, 3, 4, 5] },
    "05c_다변량시계열_87x2000": { stops: [2], wait: { 3: 6800 } },
    "06a_기본특징_회전수": { stops: [1, 2, 3, 4], wait: { 5: 1500 } },
    "06b_감자결함 ① 사이드밴드": { stops: [2] },
    "06b_감자결함 ② 분포 특징": { stops: [3, 4, 5] },
    "06c_절대축_차수축 ① 움직이는 주파수": { stops: [2], wait: { 1: 5600, 3: 5600 } },
    "06c_절대축_차수축 ② 상호보완": { stops: [1] },
    "07a_MiniRocket ① 커널": { stops: [], wait: { 1: 800 } },
    "07a_MiniRocket ② 특징 9,996개": { stops: [2], wait: { 1: 3000 } },
    "07b_로지스틱회귀 ① 확률": { stops: [6, 7, 8], wait: { 1: 100, 2: 250, 3: 250, 4: 700, 5: 300 } },
    "07b_로지스틱회귀 ② 다섯 상태": { stops: [2, 3], wait: { 4: 1500 } },
    "08a_기존연구_무작위분할_누수": { stops: [2, 3] },
    "08b_우리연구_측정단위분할": { stops: [2, 3] },
    "08e_혼동행렬": { stops: [2] },
    "09_라즈베리파이_실측 ① 실시간 판정": { stops: [], wait: { 1: 800, 2: 2800, 3: 2800 } },
    "09_라즈베리파이_실측 ② 0.455초의 구성": { stops: [2] },
  };
  // 18쪽(05a)부터 왼쪽 위에 작은 과정 지도: 슬라이드 id 앞부분 → 채울 칸
  const SEC = [["05", [1]], ["06", [1]], ["07a", [2]], ["07b", [3]], ["08", [2, 3]], ["09", [4]], ["10", [4]]];
  for (const s of S) {
    const m = SEC.find(([p]) => s.id.startsWith(p));
    if (m) s.svg += miniMap(m[1]);
    Object.assign(s, FLOW[s.id]);
    if (s.id.startsWith("04_전환")) s.next = 1600;  // 장면 전환은 잠깐 보이고 다음 슬라이드로
  }

  // 슬라이드별 css를 한 번에 넣는다 (사이드바 썸네일도 같은 data-sl을 달아 같은 css를 받는다)
  const css = S.map((s, i) => (s.css ? s.css.replace(/(^|\})\s*([^{}]+)\{/g, (m, a, sel) => `${a} ${sel.split(",").map(x => `[data-sl="${i}"]:is(.slide, .thumb) ${x.trim()}`).join(",")}{`) : "")).join("\n");
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  window.SLIDES = S;
})();
