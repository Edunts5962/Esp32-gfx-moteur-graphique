// gfx.js - portage JavaScript fidele de gfx.cpp (meme algorithme, meme RGB565)
// Une instance = un tampon L x H (Uint16Array) + une zone de decoupe.
function chargerPolices(data) {
  const P = {};
  for (const nom in data) {
    const d = data[nom];
    const bin = atob(d.b), bits = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bits[i] = bin.charCodeAt(i);
    P[nom] = { nom, bits, gl: d.g, asc: d.a, desc: d.d, il: d.i };
  }
  return P;
}

class Gfx {
  constructor(L = 320, H = 240) {
    this.L = L; this.H = H;
    this.fb = new Uint16Array(L * H);
    this.sans_decoupe();
  }
  static rgb(r, g, b) { return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3); }
  static melange(c0, c1, t) {
    const r0 = c0 >> 11, g0 = (c0 >> 5) & 63, b0 = c0 & 31;
    const r1 = c1 >> 11, g1 = (c1 >> 5) & 63, b1 = c1 & 31;
    const r = r0 + Math.trunc(((r1 - r0) * t + 127) / 255);
    const g = g0 + Math.trunc(((g1 - g0) * t + 127) / 255);
    const b = b0 + Math.trunc(((b1 - b0) * t + 127) / 255);
    return ((r << 11) | (g << 5) | b) & 0xFFFF;
  }
  decoupe(x0, y0, x1, y1) {
    this.cx0 = x0 < 0 ? 0 : x0; this.cy0 = y0 < 0 ? 0 : y0;
    this.cx1 = x1 > this.L ? this.L : x1; this.cy1 = y1 > this.H ? this.H : y1;
  }
  sans_decoupe() { this.cx0 = 0; this.cy0 = 0; this.cx1 = this.L; this.cy1 = this.H; }

  // melange rapide 5 bits (astuce des champs separes du RGB565)
  static mel(fond, c, a) {
    const al = (a + 4) >> 3;
    if (al === 0) return fond;
    if (al >= 32) return c;
    const b = (fond | (fond << 16)) & 0x07E0F81F;
    const f = (c | (c << 16)) & 0x07E0F81F;
    const r = (((Math.imul((f - b) | 0, al) >>> 5) + b) & 0x07E0F81F) >>> 0;
    return ((r >>> 16) | r) & 0xFFFF;
  }
  put(x, y, c, a) {
    const i = y * this.L + x;
    this.fb[i] = a >= 250 ? c : Gfx.mel(this.fb[i], c, a);
  }
  pixel(x, y, c, a = 255) {
    x |= 0; y |= 0;
    if (x < this.cx0 || x >= this.cx1 || y < this.cy0 || y >= this.cy1 || a <= 0) return;
    this.put(x, y, c, a | 0);
  }
  ajout(x, y, c, a) {
    const i = y * this.L + x, f = this.fb[i];
    let r = (f >> 11) + (((c >> 11) * a) >> 8);
    let g = ((f >> 5) & 63) + ((((c >> 5) & 63) * a) >> 8);
    let b = (f & 31) + (((c & 31) * a) >> 8);
    if (r > 31) r = 31; if (g > 63) g = 63; if (b > 31) b = 31;
    this.fb[i] = (r << 11) | (g << 5) | b;
  }
  pixel_ajout(x, y, c, a) {
    x |= 0; y |= 0;
    if (x < this.cx0 || x >= this.cx1 || y < this.cy0 || y >= this.cy1 || a <= 0) return;
    this.ajout(x, y, c, a | 0);
  }
  rect(x, y, l, h, c, a = 255) {
    x |= 0; y |= 0; l |= 0; h |= 0; a = a | 0;
    const x0 = Math.max(x, this.cx0), y0 = Math.max(y, this.cy0);
    const x1 = Math.min(x + l, this.cx1), y1 = Math.min(y + h, this.cy1);
    if (x0 >= x1 || y0 >= y1 || a <= 0) return;
    for (let j = y0; j < y1; j++) {
      let p = j * this.L + x0;
      if (a >= 250) for (let i = x0; i < x1; i++) this.fb[p++] = c;
      else for (let i = x0; i < x1; i++, p++) this.fb[p] = Gfx.mel(this.fb[p], c, a);
    }
  }
  degrade_v(x, y, l, h, c0, c1, a = 255) {
    for (let j = 0; j < h; j++) this.rect(x, y + j, l, 1, Gfx.melange(c0, c1, h > 1 ? Math.trunc(255 * j / (h - 1)) : 0), a);
  }
  degrade_h(x, y, l, h, c0, c1, a = 255) {
    for (let i = 0; i < l; i++) this.rect(x + i, y, 1, h, Gfx.melange(c0, c1, l > 1 ? Math.trunc(255 * i / (l - 1)) : 0), a);
  }
  static sat(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  static sdf_rect(px, py, mx, my, hx, hy, r) {
    const qx = Math.abs(px - mx) - (hx - r), qy = Math.abs(py - my) - (hy - r);
    const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0;
    let dedans = qx > qy ? qx : qy; if (dedans > 0) dedans = 0;
    return Math.sqrt(ox * ox + oy * oy) + dedans - r;
  }
  rect_arrondi_gen(x, y, l, h, r, c0, c1, a, ep) {
    x |= 0; y |= 0; l |= 0; h |= 0; r |= 0;
    if (l <= 0 || h <= 0) return;
    if (r * 2 > l) r = l >> 1;
    if (r * 2 > h) r = h >> 1;
    const mx = x + l * 0.5, my = y + h * 0.5, hx = l * 0.5, hy = h * 0.5;
    const y0 = Math.max(y, this.cy0), y1 = Math.min(y + h, this.cy1);
    const x0 = Math.max(x, this.cx0), x1 = Math.min(x + l, this.cx1);
    for (let j = y0; j < y1; j++) {
      const c = c0 === c1 ? c0 : Gfx.melange(c0, c1, Math.trunc(255 * (j - y) / (h > 1 ? h - 1 : 1)));
      const coin_v = j < y + r || j >= y + h - r;
      for (let i = x0; i < x1; i++) {
        const coin = coin_v && (i < x + r || i >= x + l - r);
        let cov;
        if (!coin && ep <= 0) cov = 1;
        else {
          const d = Gfx.sdf_rect(i + 0.5, j + 0.5, mx, my, hx, hy, r);
          cov = Gfx.sat(0.5 - d);
          if (ep > 0) { const inn = Gfx.sat(d + ep + 0.5); if (inn < cov) cov = inn; }
        }
        if (cov > 0) this.put(i, j, c, (a * cov) | 0);
      }
    }
  }
  rect_arrondi(x, y, l, h, r, c, a = 255) { this.rect_arrondi_gen(x, y, l, h, r, c, c, a, 0); }
  rect_arrondi_degrade(x, y, l, h, r, c0, c1, a = 255) { this.rect_arrondi_gen(x, y, l, h, r, c0, c1, a, 0); }
  contour_arrondi(x, y, l, h, r, ep, c, a = 255) { this.rect_arrondi_gen(x, y, l, h, r, c, c, a, ep); }

  borne(x0, y0, x1, y1) {
    return [Math.max(x0, this.cx0), Math.max(y0, this.cy0), Math.min(x1, this.cx1), Math.min(y1, this.cy1)];
  }
  disque(cx, cy, r, c, a = 255) {
    if (r <= 0) return;
    const [x0, y0, x1, y1] = this.borne(Math.floor(cx - r - 1), Math.floor(cy - r - 1), Math.ceil(cx + r + 1), Math.ceil(cy + r + 1));
    const rin = r - 0.7, rout = r + 0.7, rin2 = rin > 0 ? rin * rin : 0, rout2 = rout * rout;
    for (let j = y0; j < y1; j++) {
      const dy = j + 0.5 - cy;
      for (let i = x0; i < x1; i++) {
        const dx = i + 0.5 - cx, d2 = dx * dx + dy * dy;
        if (d2 >= rout2) continue;
        if (d2 <= rin2) { this.put(i, j, c, a); continue; }
        this.put(i, j, c, (a * Gfx.sat(r + 0.5 - Math.sqrt(d2))) | 0);
      }
    }
  }
  anneau(cx, cy, r, ep, c, a = 255) {
    const ro = r + ep * 0.5 + 1, ri = r - ep * 0.5 - 1;
    const [x0, y0, x1, y1] = this.borne(Math.floor(cx - ro), Math.floor(cy - ro), Math.ceil(cx + ro), Math.ceil(cy + ro));
    const ri2 = ri > 0 ? ri * ri : 0, ro2 = ro * ro;
    for (let j = y0; j < y1; j++) {
      const dy = j + 0.5 - cy;
      for (let i = x0; i < x1; i++) {
        const dx = i + 0.5 - cx, d2 = dx * dx + dy * dy;
        if (d2 >= ro2 || d2 <= ri2) continue;
        const cov = Gfx.sat(ep * 0.5 + 0.5 - Math.abs(Math.sqrt(d2) - r));
        if (cov > 0) this.put(i, j, c, (a * cov) | 0);
      }
    }
  }
  arc(cx, cy, r, ep, ang0, ang1, c, a = 255) {
    const DPI = 6.2831853, span = ang1 - ang0;
    if (span <= 0) return;
    if (span >= DPI) { this.anneau(cx, cy, r, ep, c, a); return; }
    const ro = r + ep * 0.5 + 1; let ri = r - ep * 0.5 - 1; if (ri < 0) ri = 0;
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    const inclure = an => {
      const co = Math.cos(an), s = Math.sin(an);
      for (const rr of [ri, ro]) {
        const x = cx + co * rr, y = cy + s * rr;
        bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y);
      }
    };
    const e0 = ang0 - 0.1, e1 = ang1 + 0.1;
    inclure(e0); inclure(e1);
    for (let q = Math.ceil(e0 / (DPI / 4)); q * (DPI / 4) < e1; q++) inclure(q * (DPI / 4));
    const [x0, y0, x1, y1] = this.borne(Math.floor(bx0) - 1, Math.floor(by0) - 1, Math.ceil(bx1) + 1, Math.ceil(by1) + 1);
    const ri2 = ri * ri, ro2 = ro * ro;
    for (let j = y0; j < y1; j++) {
      const dy = j + 0.5 - cy;
      for (let i = x0; i < x1; i++) {
        const dx = i + 0.5 - cx, d2 = dx * dx + dy * dy;
        if (d2 >= ro2 || d2 <= ri2) continue;
        const d = Math.sqrt(d2);
        let cov = Gfx.sat(ep * 0.5 + 0.5 - Math.abs(d - r));
        if (cov <= 0) continue;
        let t = Math.atan2(dy, dx) - ang0;
        t = (t + 4 * DPI) % DPI;            // comme fmodf en C (meme limite si ang0 est grand)
        const m = t <= span ? Math.min(t, span - t) : -Math.min(t - span, DPI - t);
        cov *= Gfx.sat(0.5 + m * d);
        if (cov > 0) this.put(i, j, c, (a * cov) | 0);
      }
    }
  }
  trait(x0, y0, x1, y1, ep, c, a = 255) {
    const vx = x1 - x0, vy = y1 - y0, l2 = vx * vx + vy * vy, hw = ep * 0.5;
    if (l2 < 1e-6) { this.disque(x0, y0, hw, c, a); return; }
    const inv = 1 / l2, marge = Math.ceil(hw + 1.5);
    const dist = (px, py) => {
      let t = ((px - x0) * vx + (py - y0) * vy) * inv; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = x0 + vx * t - px, qy = y0 + vy * t - py;
      return Math.sqrt(qx * qx + qy * qy);
    };
    if (Math.abs(vx) >= Math.abs(vy)) {
      const xa = Math.max(Math.floor(Math.min(x0, x1)) - marge, this.cx0), xb = Math.min(Math.ceil(Math.max(x0, x1)) + marge, this.cx1);
      const pente = vy / vx;
      for (let i = xa; i < xb; i++) {
        const px = i + 0.5, tx = Math.min(Math.max(px, Math.min(x0, x1)), Math.max(x0, x1));
        const yc = y0 + (tx - x0) * pente;
        const ya = Math.max(Math.floor(yc) - marge, this.cy0), yb = Math.min(Math.ceil(yc) + marge + 1, this.cy1);
        for (let j = ya; j < yb; j++) {
          const cov = Gfx.sat(hw + 0.5 - dist(px, j + 0.5));
          if (cov > 0) this.put(i, j, c, (a * cov) | 0);
        }
      }
    } else {
      const ya = Math.max(Math.floor(Math.min(y0, y1)) - marge, this.cy0), yb = Math.min(Math.ceil(Math.max(y0, y1)) + marge, this.cy1);
      const pente = vx / vy;
      for (let j = ya; j < yb; j++) {
        const py = j + 0.5, ty = Math.min(Math.max(py, Math.min(y0, y1)), Math.max(y0, y1));
        const xc = x0 + (ty - y0) * pente;
        const xa = Math.max(Math.floor(xc) - marge, this.cx0), xb = Math.min(Math.ceil(xc) + marge + 1, this.cx1);
        for (let i = xa; i < xb; i++) {
          const cov = Gfx.sat(hw + 0.5 - dist(i + 0.5, py));
          if (cov > 0) this.put(i, j, c, (a * cov) | 0);
        }
      }
    }
  }
  trait_pointille(x0, y0, x1, y1, ep, tiret, trou, c, a = 255) {
    let dx = x1 - x0, dy = y1 - y0;
    const l = Math.sqrt(dx * dx + dy * dy);
    if (l < 0.5) return;
    dx /= l; dy /= l;
    for (let s = 0; s < l; s += tiret + trou) {
      const e = Math.min(s + tiret, l);
      this.trait(x0 + dx * s, y0 + dy * s, x0 + dx * e, y0 + dy * e, ep, c, a);
    }
  }
  triangle(x0, y0, x1, y1, x2, y2, c, a = 255) {
    const aire = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    if (Math.abs(aire) < 1e-3) return;
    if (aire < 0) { [x1, y1, x2, y2] = [x2, y2, x1, y1]; }
    const ex = [x0, x1, x2], ey = [y0, y1, y2], nx = [], ny = [], nc = [];
    for (let k = 0; k < 3; k++) {
      const m = (k + 1) % 3, vx = ex[m] - ex[k], vy = ey[m] - ey[k], l = Math.sqrt(vx * vx + vy * vy);
      nx[k] = -vy / l; ny[k] = vx / l; nc[k] = -(nx[k] * ex[k] + ny[k] * ey[k]);
    }
    const [xa, ya, xb, yb] = this.borne(Math.floor(Math.min(x0, x1, x2)) - 1, Math.floor(Math.min(y0, y1, y2)) - 1,
                                          Math.ceil(Math.max(x0, x1, x2)) + 1, Math.ceil(Math.max(y0, y1, y2)) + 1);
    for (let j = ya; j < yb; j++)
      for (let i = xa; i < xb; i++) {
        const px = i + 0.5, py = j + 0.5;
        let m = 1e9;
        for (let k = 0; k < 3; k++) { const d = nx[k] * px + ny[k] * py + nc[k]; if (d < m) m = d; }
        const cov = Gfx.sat(m + 0.5);
        if (cov > 0) this.put(i, j, c, (a * cov) | 0);
      }
  }
  halo(cx, cy, r, c, intensite) {
    if (r < 1) return;
    const [x0, y0, x1, y1] = this.borne(Math.floor(cx - r), Math.floor(cy - r), Math.ceil(cx + r), Math.ceil(cy + r));
    const inv = 1 / (r * r);
    for (let j = y0; j < y1; j++) {
      const dy = j + 0.5 - cy;
      for (let i = x0; i < x1; i++) {
        const dx = i + 0.5 - cx, f = 1 - (dx * dx + dy * dy) * inv;
        if (f <= 0) continue;
        const al = (intensite * f * f) | 0;
        if (al) this.ajout(i, j, c, al);
      }
    }
  }
  // ---------------- texte ----------------
  static trouver(p, code) {
    let a = 0, b = p.gl.length - 1;
    while (a <= b) {
      const m = (a + b) >> 1, c = p.gl[m][0];
      if (c === code) return p.gl[m];
      if (c < code) a = m + 1; else b = m - 1;
    }
    return null;
  }
  static codes(s) { return Array.from(s, ch => { const c = ch.codePointAt(0); return c > 0xFFFF ? 63 : c; }); }
  largeur_texte(s, p) {
    let l = 0;
    for (const code of Gfx.codes(s)) { const g = Gfx.trouver(p, code) || Gfx.trouver(p, 63); if (g) l += g[5]; }
    return l;
  }
  hauteur(p) { return p.il; }
  texte(x, y, s, p, c, a = 255, align = 0) {
    x |= 0; y |= 0;
    const l = this.largeur_texte(s, p);
    if (align === 1) x -= l >> 1; else if (align === 2) x -= l;
    const base = y + p.asc;
    for (const code of Gfx.codes(s)) {
      const g = Gfx.trouver(p, code) || Gfx.trouver(p, 63);
      if (!g) continue;
      const [, gl, gh, gdx, gdy, av, pos] = g;
      const gx = x + gdx, gy = base + gdy;
      for (let j = 0; j < gh; j++) {
        const yy = gy + j;
        if (yy < this.cy0 || yy >= this.cy1) continue;
        for (let i = 0; i < gl; i++) {
          const xx = gx + i;
          if (xx < this.cx0 || xx >= this.cx1) continue;
          const k = j * gl + i;
          let v = p.bits[pos + (k >> 1)];
          v = k & 1 ? v & 0x0F : v >> 4;
          if (v) this.put(xx, yy, c, ((v * 17 * a) / 255) | 0);
        }
      }
      x += av;
    }
    return l;
  }
  copier(src) { this.fb.set(src); }
  // ---------------- affichage (navigateur) ----------------
  versImageData(img) {
    const d = img.data, fb = this.fb;
    for (let i = 0, k = 0; i < fb.length; i++, k += 4) {
      const c = fb[i];
      let r = (c >> 11) << 3, g = ((c >> 5) & 63) << 2, b = (c & 31) << 3;
      d[k] = r | (r >> 5); d[k + 1] = g | (g >> 6); d[k + 2] = b | (b >> 5); d[k + 3] = 255;
    }
  }
}
Gfx.GAUCHE = 0; Gfx.CENTRE = 1; Gfx.DROITE = 2;
if (typeof module !== "undefined") module.exports = { Gfx, chargerPolices };
