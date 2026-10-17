// scene.js - portage JavaScript de exemples/demo_gfx/scene.cpp (les 9 pages)
function creerScene(g, P) {
  const rgb = Gfx.rgb, melange = Gfx.melange, L = g.L, H = g.H;
  const CENTRE = 1, DROITE = 2;
  const FOND_HAUT = rgb(4, 6, 18), FOND_BAS = rgb(16, 12, 42), PANNEAU = rgb(16, 22, 52), PANNEAU2 = rgb(28, 36, 80);
  const BORD = rgb(52, 66, 130), GRILLE = rgb(34, 44, 92), TEXTE = rgb(236, 242, 255), TEXTE2 = rgb(156, 168, 210);
  const TEXTE3 = rgb(96, 108, 156), CYAN = rgb(40, 228, 255), BLEU = rgb(70, 120, 255), VIOLET = rgb(140, 92, 255);
  const MAGENTA = rgb(255, 64, 200), JAUNE = rgb(255, 212, 64), ORANGE = rgb(255, 140, 60), ROUGE = rgb(255, 78, 106);
  const VERT = rgb(60, 255, 156), NOIR_BLEU = rgb(6, 10, 30);
  const PI = 3.14159265;
  const P11 = P.POLICE_11, P13 = P.POLICE_13, P16 = P.POLICE_16, P22 = P.POLICE_22, P30 = P.POLICE_30, P40 = P.POLICE_40;

  let t = 0, dt = 0.033, ips = 30, ms_prec = 0;
  const sat01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const approche = (v, c, k) => v + (c - v) * (1 - Math.exp(-k * dt));
  const sortie = x => { x = sat01(x); return 1 - (1 - x) * (1 - x) * (1 - x); };
  const lisse = x => { x = sat01(x); return x * x * (3 - 2 * x); };
  const rebond = x => {
    x = sat01(x); const n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) { x -= 1.5 / d; return n * x * x + 0.75; }
    if (x < 2.5 / d) { x -= 2.25 / d; return n * x * x + 0.9375; }
    x -= 2.625 / d; return n * x * x + 0.984375;
  };
  const pulse = (f, ph = 0) => 0.5 + 0.5 * Math.sin(t * f * 2 * PI + ph);
  const fmodf = (a, b) => a % b;
  let alea_e = 0x9E3779B9 >>> 0;
  const alea = () => {
    alea_e = (alea_e ^ (alea_e << 13)) >>> 0; alea_e = (alea_e ^ (alea_e >>> 17)) >>> 0; alea_e = (alea_e ^ (alea_e << 5)) >>> 0;
    return (alea_e >>> 8) * (1 / 16777216);
  };
  const dans = (x, y, rx, ry, rl, rh) => x >= rx && x < rx + rl && y >= ry && y < ry + rh;
  const fmt = (v, dec) => v.toFixed(dec).replace(".", ",");
  const panneau = (x, y, l, h, a = 150) => { g.rect_arrondi(x, y, l, h, 10, PANNEAU, a); g.contour_arrondi(x, y, l, h, 10, 1, BORD, 110); };
  const legende = (x, y, s) => g.texte(x, y, s, P11, TEXTE2, 255, CENTRE);

  const TITRES = ["Primitives", "Transparence", "Mouvement", "Arcs et jauges", "Texte", "Courbes", "Particules", "Tactile", "Découpe"];
  const NB_PAGES = 9;
  let page = 0, page_t0 = 0, mode_auto = true;
  const DUREE_AUTO = 8;
  let fondBuf = null;

  const C_RIEN = 0, C_CURSEUR = 1, C_BOUTON = 2;
  let tc_appui = false, tc_x0 = 0, tc_y0 = 0, tc_x = 0, tc_y = 0, tc_xp = 0, tc_t0 = 0, tc_bouge = false, tc_cible = C_RIEN;
  let toast_txt = "", toast_c = CYAN, toast_t0 = -10;
  const toast = (s, c) => { toast_txt = s; toast_c = c; toast_t0 = t; };
  const changer_page = p => { page = ((p % NB_PAGES) + NB_PAGES) % NB_PAGES; page_t0 = t; };

  const etoiles = [];
  function dessiner_fond_complet() {
    g.degrade_v(0, 0, L, H, FOND_HAUT, FOND_BAS);
    g.halo(255, 50, 150, VIOLET, 34); g.halo(40, 210, 140, BLEU, 26); g.halo(170, 250, 110, MAGENTA, 14);
  }
  function fond() {
    if (fondBuf) g.copier(fondBuf); else dessiner_fond_complet();
    for (const e of etoiles) {
      e.x -= e.v * dt;
      if (e.x < 0) { e.x += L; e.y = alea() * H; }
      const a = e.lum * (0.55 + 0.45 * Math.sin(t * 1.7 + e.ph));
      g.pixel_ajout(e.x | 0, e.y | 0, TEXTE, a | 0);
    }
  }

  // ---------------- 1. Primitives ----------------
  function case_prim(i) {
    const x = 6 + (i % 4) * 77, y = 28 + ((i / 4) | 0) * 59;
    panneau(x, y, 75, 57, 130);
    return [x + 37.5, y + 22, x, y];
  }
  function page_primitives() {
    let cx, cy, x, y; const ang = t * 0.9;
    [cx, cy, x, y] = case_prim(0);
    g.rect((cx | 0) - 24, (cy | 0) - 14, 30, 22, CYAN);
    g.rect((cx | 0) - 8, (cy | 0) - 6, 30, 22, MAGENTA, (60 + 160 * pulse(0.5)) | 0);
    legende(x + 37, y + 42, "rect");
    [cx, cy, x, y] = case_prim(1);
    g.degrade_v((cx | 0) - 30, (cy | 0) - 14, 28, 28, JAUNE, ROUGE);
    g.degrade_h((cx | 0) + 2, (cy | 0) - 14, 28, 28, BLEU, VERT);
    legende(x + 37, y + 42, "dégradés");
    [cx, cy, x, y] = case_prim(2);
    const r = (2 + 12 * pulse(0.4)) | 0;
    g.rect_arrondi_degrade((cx | 0) - 26, (cy | 0) - 14, 52, 28, r, rgb(70, 225, 255), rgb(100, 90, 255));
    g.contour_arrondi((cx | 0) - 29, (cy | 0) - 17, 58, 34, r + 3, 1.2, CYAN, 200);
    legende(x + 37, y + 42, "rect_arrondi");
    [cx, cy, x, y] = case_prim(3);
    g.disque(cx, cy, 6 + 9 * pulse(0.7), JAUNE); g.disque(cx + 18, cy - 8, 4, ORANGE, 200);
    legende(x + 37, y + 42, "disque");
    [cx, cy, x, y] = case_prim(4);
    g.anneau(cx, cy, 14, 1 + 6 * pulse(0.6), VERT); g.anneau(cx, cy, 5, 1.5, VERT, 160);
    legende(x + 37, y + 42, "anneau");
    [cx, cy, x, y] = case_prim(5);
    { const ax = [], ay = [];
      for (let k = 0; k < 3; k++) { const a = ang + k * 2 * PI / 3; ax[k] = cx + Math.cos(a) * 17; ay[k] = cy + Math.sin(a) * 17; }
      g.triangle(ax[0], ay[0], ax[1], ay[1], ax[2], ay[2], MAGENTA); }
    legende(x + 37, y + 42, "triangle");
    [cx, cy, x, y] = case_prim(6);
    for (let k = 0; k < 4; k++) {
      const a = ang * 0.6 + k * 0.35, ep = 0.8 + k * 1.2;
      g.trait(cx - Math.cos(a) * 22, cy - Math.sin(a) * 14 + (k - 1.5) * 6, cx + Math.cos(a) * 22, cy + Math.sin(a) * 14 + (k - 1.5) * 6, ep, TEXTE);
    }
    legende(x + 37, y + 42, "trait");
    [cx, cy, x, y] = case_prim(7);
    for (let k = 0; k < 3; k++) {
      const a = -ang + k * PI / 3;
      g.trait_pointille(cx - Math.cos(a) * 20, cy - Math.sin(a) * 16, cx + Math.cos(a) * 20, cy + Math.sin(a) * 16, 1.5, 5, 3, k === 0 ? JAUNE : TEXTE2);
    }
    legende(x + 37, y + 42, "pointillés");
    [cx, cy, x, y] = case_prim(8);
    g.anneau(cx, cy, 14, 4, PANNEAU2);
    const a2 = fmodf(ang * 2, 2 * PI);
    g.arc(cx, cy, 14, 4, a2, a2 + 1 + 3.5 * pulse(0.4), CYAN);
    legende(x + 37, y + 42, "arc");
    [cx, cy, x, y] = case_prim(9);
    g.halo(cx, cy, 24, ORANGE, (120 + 120 * pulse(0.8)) | 0); g.disque(cx, cy, 2.5, rgb(255, 245, 220));
    legende(x + 37, y + 42, "halo");
    [cx, cy, x, y] = case_prim(10);
    for (let i = 0; i < 60; i++) {
      const px = cx - 30 + i, py = cy + 12 * Math.sin(i * 0.2 - t * 4);
      g.pixel(px | 0, py | 0, VERT); g.pixel_ajout(px | 0, (py | 0) + 1, VERT, 90);
    }
    legende(x + 37, y + 42, "pixel");
    [cx, cy, x, y] = case_prim(11);
    g.texte(cx | 0, (cy | 0) - 14, "Aa", P22, TEXTE, (80 + 175 * pulse(0.5)) | 0, CENTRE);
    legende(x + 37, y + 42, "texte");
  }

  // ---------------- 2. Transparence ----------------
  function page_alpha() {
    const RGB3 = [rgb(255, 40, 40), rgb(40, 255, 60), rgb(50, 90, 255)];
    panneau(6, 28, 150, 136, 140);
    for (let k = 0; k < 3; k++) { const a = t * 0.8 + k * 2 * PI / 3; g.disque(81 + Math.cos(a) * 16, 90 + Math.sin(a) * 16, 28, RGB3[k], 150); }
    legende(81, 146, "Mélange alpha (a = 150)");
    g.rect_arrondi(164, 28, 150, 136, 10, NOIR_BLEU, 240); g.contour_arrondi(164, 28, 150, 136, 10, 1, BORD, 110);
    for (let k = 0; k < 3; k++) { const a = -t * 0.8 + k * 2 * PI / 3; g.halo(239 + Math.cos(a) * 16, 90 + Math.sin(a) * 16, 46, RGB3[k], 230); }
    legende(239, 146, "Additif : halo()");
    panneau(6, 168, 308, 38, 140);
    for (let i = 0; i < 8; i++) {
      const a = (32 + (i * 223 / 7)) | 0, x = 14 + i * 37;
      g.rect_arrondi(x, 174, 30, 14, 4, CYAN, a);
      g.texte(x + 15, 190, String(a), P11, TEXTE3, 255, CENTRE);
    }
  }

  // ---------------- 3. Mouvement ----------------
  const NB_PISTES = 6;
  let ressort_x = 0, ressort_v = 0, approche_x = 0;
  const trace = Array.from({ length: NB_PISTES }, () => new Array(8).fill(0));
  function page_easing() {
    const NOMS = ["linéaire", "sortie()", "lisse()", "rebond()", "ressort", "approche()"];
    const COUL = [TEXTE2, CYAN, VERT, JAUNE, MAGENTA, ORANGE];
    const CYCLE = 2.4, MOUV = 1.6;
    const k = Math.floor(t / CYCLE), u = sat01(fmodf(t, CYCLE) / MOUV), retour = k & 1, cible = retour ? 0 : 1;
    ressort_v += (cible - ressort_x) * 140 * dt; ressort_v *= Math.exp(-7 * dt); ressort_x += ressort_v * dt;
    approche_x = approche(approche_x, cible, 5);
    const val = [u, sortie(u), lisse(u), rebond(u), 0, 0];
    for (let i = 0; i < 4; i++) if (retour) val[i] = 1 - val[i];
    val[4] = ressort_x; val[5] = approche_x;
    panneau(6, 28, 308, 178, 140);
    for (let i = 0; i < NB_PISTES; i++) {
      const y = 46 + i * 28;
      g.texte(14, y - 7, NOMS[i], P11, TEXTE2);
      const x0 = 96, x1 = 300;
      g.trait(x0, y, x1, y, 1, GRILLE);
      const x = x0 + (x1 - x0) * val[i];
      for (let q = 7; q > 0; q--) trace[i][q] = trace[i][q - 1];
      trace[i][0] = x;
      for (let q = 1; q < 8; q++) g.disque(trace[i][q], y, 5 - q * 0.5, COUL[i], 140 - q * 17);
      g.halo(x, y, 14, COUL[i], 110); g.disque(x, y, 5, COUL[i]);
    }
  }

  // ---------------- 4. Arcs et jauges ----------------
  let aig = 0.3, aig_v = 0, aig_cible = 0.3, aig_t = 0, barres_t = -10;
  const barres = [0, 0, 0], barres_c = [0.5, 0.5, 0.5];
  function page_arcs() {
    panneau(6, 28, 308, 120, 140);
    const a0 = fmodf(t * 5, 2 * PI);
    g.anneau(58, 86, 26, 6, PANNEAU2);
    g.arc(58, 86, 26, 6, a0, a0 + 0.8 + 3.2 * pulse(0.5), CYAN);
    g.halo(58 + Math.cos(a0) * 26, 86 + Math.sin(a0) * 26, 10, CYAN, 120);
    legende(58, 126, "Chargement");
    const p = sortie(fmodf(t, 4) / 3.2);
    g.anneau(160, 86, 30, 7, PANNEAU2);
    g.arc(160, 86, 30, 7, -PI / 2, -PI / 2 + 2 * PI * p, VERT);
    g.texte(160, 72, Math.round(p * 100) + " %", P22, TEXTE, 255, CENTRE);
    legende(160, 126, "Progression");
    if (t - aig_t > 1.6) { aig_t = t; aig_cible = 0.1 + alea() * 0.85; }
    aig_v += (aig_cible - aig) * 90 * dt; aig_v *= Math.exp(-6 * dt); aig += aig_v * dt;
    const D0 = PI * 0.75, D1 = PI * 2.25, gx = 262, gy = 90;
    g.arc(gx, gy, 32, 5, D0, D0 + (D1 - D0) * 0.6, VERT, 180);
    g.arc(gx, gy, 32, 5, D0 + (D1 - D0) * 0.6, D0 + (D1 - D0) * 0.85, JAUNE, 180);
    g.arc(gx, gy, 32, 5, D0 + (D1 - D0) * 0.85, D1, ROUGE, 180);
    for (let i = 0; i <= 10; i++) {
      const a = D0 + (D1 - D0) * i / 10, r0 = i % 5 === 0 ? 20 : 24;
      g.trait(gx + Math.cos(a) * r0, gy + Math.sin(a) * r0, gx + Math.cos(a) * 27, gy + Math.sin(a) * 27, 1.2, TEXTE2);
    }
    const aa = D0 + (D1 - D0) * aig;
    g.trait(gx, gy, gx + Math.cos(aa) * 26, gy + Math.sin(aa) * 26, 2.2, TEXTE);
    g.disque(gx, gy, 4, TEXTE);
    g.texte(gx, gy + 14, fmt(aig * 100, 0), P13, TEXTE, 255, CENTRE);
    legende(gx, 126, "Cadran (ressort)");
    panneau(6, 152, 308, 54, 140);
    if (t - barres_t > 1.2) { barres_t = t; for (let i = 0; i < 3; i++) barres_c[i] = 0.1 + alea() * 0.9; }
    const NB = ["Canal 1", "Canal 2", "Canal 3"];
    for (let i = 0; i < 3; i++) {
      barres[i] = approche(barres[i], barres_c[i], 6);
      const y = 158 + i * 15;
      g.texte(14, y - 1, NB[i], P11, TEXTE3);
      g.rect_arrondi(70, y, 236, 10, 5, PANNEAU2, 230);
      const w = (236 * barres[i]) | 0;
      if (w > 10) g.rect_arrondi_degrade(70, y, w, 10, 5, CYAN, VIOLET);
      g.halo(70 + w, y + 5, 10, CYAN, 90);
    }
  }

  // ---------------- 5. Texte ----------------
  let compteur = 0, compteur_c = 343.2, compteur_t = 0;
  function page_texte() {
    panneau(6, 28, 308, 120, 140);
    const e = sortie((t - page_t0) / 0.6);
    g.texte(14 + ((60 * (1 - e)) | 0), 30, "SON ET LUMIÈRE", P30, TEXTE, (255 * e) | 0);
    g.texte(14, 68, "Écho à 17 m", P22, CYAN);
    g.texte(14, 94, "Fréquence : 440 Hz", P16, TEXTE);
    g.texte(14, 113, "Accents : é è ê à ç ù ô ï", P13, TEXTE2);
    g.texte(14, 130, "Symboles : ± × µ σ ° √ ≈ → ✓", P11, TEXTE3);
    g.texte(306, 74, "22 px", P11, TEXTE3, 255, DROITE); g.texte(306, 98, "16 px", P11, TEXTE3, 255, DROITE);
    g.texte(306, 115, "13 px", P11, TEXTE3, 255, DROITE); g.texte(306, 130, "11 px", P11, TEXTE3, 255, DROITE);
    panneau(6, 152, 150, 54, 140);
    const PHRASE = "c = 2d / t";
    const n = Math.trunc((t - page_t0) * 6) % 16;
    const lx = g.texte(16, 166, Array.from(PHRASE).slice(0, n).join(""), P16, JAUNE);
    if (pulse(2) > 0.5) g.rect(16 + lx + 1, 167, 2, 17, JAUNE);
    g.texte(16, 190, "machine à écrire", P11, TEXTE3);
    panneau(164, 152, 150, 54, 140);
    if (t - compteur_t > 2) { compteur_t = t; compteur_c = 300 + alea() * 60; }
    compteur = approche(compteur, compteur_c, 4);
    g.texte(304, 150, fmt(compteur, 1), P40, TEXTE, 255, DROITE);
    g.texte(172, 190, "m/s", P11, TEXTE3);
  }

  // ---------------- 6. Courbes ----------------
  const histo = new Array(16).fill(0), histo_c = new Array(16).fill(0); let histo_t = -10;
  const salve = u => Math.exp(-(u / 10) * (u / 10)) * Math.sin(u * 0.9);
  function page_courbes() {
    panneau(6, 28, 308, 110, 150);
    g.decoupe(8, 30, 312, 136);
    for (let x = 26; x < 312; x += 20) g.trait(x, 30, x, 136, 1, GRILLE, 140);
    for (let y = 43; y < 136; y += 20) g.trait(8, y, 312, y, 1, GRILLE, 140);
    const s = fmodf(t * 90, 420) - 40, yc = 83;
    let px = 8, py = yc;
    for (let x = 9; x < 312; x += 2) {
      const v = salve(x - s) + 0.45 * salve(x - s + 110), y = yc - 38 * v;
      g.trait(px, py, x, y, 1.6, CYAN); px = x; py = y;
    }
    g.trait_pointille(8, yc - 22, 312, yc - 22, 1, 6, 4, JAUNE, 200);
    g.texte(310, yc - 36, "seuil", P11, JAUNE, 255, DROITE);
    g.sans_decoupe();
    panneau(6, 142, 150, 64, 140);
    if (t - histo_t > 1) {
      histo_t = t;
      for (let i = 0; i < 16; i++) { const d = (i - 7.5) / 3.5; histo_c[i] = Math.exp(-d * d) * (0.6 + 0.4 * alea()); }
    }
    for (let i = 0; i < 16; i++) {
      histo[i] = approche(histo[i], histo_c[i], 8);
      const h = (40 * histo[i]) | 0;
      g.rect(14 + i * 8, 186 - h, 6, h, melange(VIOLET, CYAN, (255 * histo[i]) | 0));
    }
    g.texte(81, 192, "histogramme", P11, TEXTE3, 255, CENTRE);
    panneau(164, 142, 150, 64, 140);
    const u = fmodf(t, 3);
    for (let i = 0; i < 8; i++) {
      const x = 176 + i * 17, y = 194 - i * 6 + 4 * Math.sin(i * 2.3), ap = sat01((u - i * 0.08) / 0.3);
      g.disque(x, y, 3 * sortie(ap), JAUNE);
    }
    const e = sortie((u - 0.8) / 1.2);
    if (e > 0) g.trait(172, 196, 172 + 132 * e, 196 - 132 * e * 0.33, 1.6, CYAN);
    g.texte(172, 146, "régression", P11, TEXTE3);
  }

  // ---------------- 7. Particules ----------------
  const part = []; let emission = 0;
  const comete = Array.from({ length: 16 }, () => [0, 0]);
  const lancer = (x, y, vx, vy, vie, c) => { if (part.length < 160) part.push({ x, y, vx, vy, vie, age: 0, c }); };
  function explosion(x, y) {
    const cols = [CYAN, JAUNE, MAGENTA, VERT];
    for (let i = 0; i < 50; i++) { const a = alea() * 2 * PI, v = 40 + alea() * 140; lancer(x, y, Math.cos(a) * v, Math.sin(a) * v - 20, 0.8 + alea() * 0.8, cols[i % 4]); }
  }
  function page_particules() {
    panneau(6, 28, 308, 178, 110);
    g.decoupe(7, 29, 313, 205);
    emission += dt * 50;
    while (emission >= 1) { emission -= 1; lancer(160, 200, (alea() - 0.5) * 50, -130 - alea() * 50, 1.6, melange(CYAN, BLEU, (alea() * 255) | 0)); }
    for (let i = 0; i < part.length;) {
      const p = part[i];
      p.age += dt;
      if (p.age > p.vie) { part[i] = part[part.length - 1]; part.pop(); continue; }
      p.vy += 120 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const a = 1 - p.age / p.vie;
      g.halo(p.x, p.y, 5, p.c, (120 * a) | 0); g.disque(p.x, p.y, 1.4, p.c, (255 * a) | 0);
      i++;
    }
    for (let q = 15; q > 0; q--) { comete[q][0] = comete[q - 1][0]; comete[q][1] = comete[q - 1][1]; }
    comete[0][0] = 160 + 110 * Math.sin(t * 1.1); comete[0][1] = 100 + 40 * Math.sin(t * 2.2);
    for (let q = 15; q >= 0; q--) g.disque(comete[q][0], comete[q][1], 4.5 - q * 0.25, JAUNE, 220 - q * 13);
    g.halo(comete[0][0], comete[0][1], 22, ORANGE, 150);
    g.sans_decoupe();
    g.texte(160, 32, "Touchez l'écran : explosion", P11, TEXTE2, 255, CENTRE);
  }

  // ---------------- 8. Tactile ----------------
  let curseur = 40, curseur_v = 0, interrupteur = false, inter_aff = 0, nb_appuis = 0;
  const ondes = [];
  const CUR_X = 20, CUR_L = 280, CUR_Y = 64, BT_X = 14, BT_Y = 112, BT_L = 130, BT_H = 44, IN_X = 200, IN_Y = 118, IN_L = 64, IN_H = 32;
  function page_tactile() {
    panneau(6, 28, 308, 178, 140);
    if (tc_cible !== C_CURSEUR && Math.abs(curseur_v) > 0.5) {
      curseur += curseur_v * dt; curseur_v *= Math.exp(-3 * dt);
      if (curseur < 0) { curseur = 0; curseur_v = -curseur_v * 0.4; }
      if (curseur > 100) { curseur = 100; curseur_v = -curseur_v * 0.4; }
    }
    g.texte(20, 34, "Curseur (glisser, lancer)", P11, TEXTE2);
    g.texte(300, 30, fmt(curseur, 0), P22, CYAN, 255, DROITE);
    g.rect_arrondi(CUR_X, CUR_Y - 4, CUR_L, 8, 4, PANNEAU2, 230);
    const kx = CUR_X + CUR_L * curseur / 100;
    g.rect_arrondi_degrade(CUR_X, CUR_Y - 4, ((kx - CUR_X) | 0) + 4, 8, 4, CYAN, VIOLET);
    const tient = tc_cible === C_CURSEUR;
    g.halo(kx, CUR_Y, tient ? 26 : 16, CYAN, tient ? 160 : 90);
    g.disque(kx, CUR_Y, tient ? 11 : 9, TEXTE);
    const presse = tc_cible === C_BOUTON && dans(tc_x, tc_y, BT_X, BT_Y, BT_L, BT_H), m = presse ? 3 : 0;
    if (!presse) g.halo(BT_X + BT_L / 2, BT_Y + BT_H / 2, 70, CYAN, (20 + 25 * pulse(0.8)) | 0);
    g.rect_arrondi_degrade(BT_X + m, BT_Y + m, BT_L - 2 * m, BT_H - 2 * m, 12,
      presse ? rgb(40, 150, 200) : rgb(70, 225, 255), presse ? rgb(70, 60, 200) : rgb(100, 90, 255));
    g.texte(BT_X + BT_L / 2, BT_Y + 6, "APPUYER", P16, NOIR_BLEU, 255, CENTRE);
    g.texte(BT_X + BT_L / 2, BT_Y + 26, nb_appuis + " appui" + (nb_appuis > 1 ? "s" : ""), P11, NOIR_BLEU, 220, CENTRE);
    inter_aff = approche(inter_aff, interrupteur ? 1 : 0, 14);
    g.rect_arrondi(IN_X, IN_Y, IN_L, IN_H, IN_H / 2, melange(PANNEAU2, VERT, (255 * inter_aff) | 0), 240);
    g.disque(IN_X + 16 + (IN_L - 32) * inter_aff, IN_Y + IN_H / 2, 12, TEXTE);
    g.texte(IN_X + IN_L + 8, IN_Y + 8, interrupteur ? "OUI" : "NON", P13, interrupteur ? VERT : TEXTE3);
    g.texte(160, 176, "Touchez ailleurs : ondes", P11, TEXTE3, 255, CENTRE);
    for (let i = 0; i < ondes.length;) {
      const age = t - ondes[i].t0;
      if (age > 0.8) { ondes.splice(i, 1); continue; }
      g.anneau(ondes[i].x, ondes[i].y, 4 + 36 * sortie(age / 0.8), 2, CYAN, (220 * (1 - age / 0.8)) | 0);
      i++;
    }
    if (tc_appui && tc_y < 208) g.halo(tc_x, tc_y, 18, TEXTE, 70);
  }

  // ---------------- 9. Decoupe ----------------
  function page_decoupe() {
    panneau(6, 28, 308, 30, 160);
    const BANDEAU = "Vitesse du son ≈ 343 m/s à 20 °C  ·  Lumière ≈ 299 792 km/s  ·  ";
    const lb = g.largeur_texte(BANDEAU, P13), x = 10 - (fmodf(t * 50, lb) | 0);
    g.decoupe(10, 30, 310, 56);
    g.texte(x, 35, BANDEAU, P13, TEXTE); g.texte(x + lb, 35, BANDEAU, P13, TEXTE);
    for (let i = 0; i < 24; i++) { const a = (220 * (1 - i / 24)) | 0; g.rect(10 + i, 30, 1, 26, PANNEAU, a); g.rect(309 - i, 30, 1, 26, PANNEAU, a); }
    g.sans_decoupe();
    panneau(6, 62, 308, 40, 140);
    const p = fmodf(t / 3, 1), BX = 14, BY = 72, BL = 292, BH = 20;
    g.rect_arrondi(BX, BY, BL, BH, 10, PANNEAU2, 230);
    g.decoupe(BX, BY, BX + ((BL * p) | 0), BY + BH);
    g.rect_arrondi_degrade(BX, BY, BL, BH, 10, rgb(30, 190, 255), rgb(110, 70, 240));
    const sx = BX + fmodf(t * 160, BL + 60) - 30;
    g.trait(sx, BY, sx - 12, BY + BH, 10, TEXTE, 60);
    g.sans_decoupe();
    g.texte(BX + BL / 2, BY + 3, ((p * 100) | 0) + " %", P13, TEXTE, 255, CENTRE);
    panneau(6, 106, 308, 56, 140);
    const r = sortie(fmodf(t, 3) / 1.8), xr = 10 + ((300 * r) | 0);
    g.decoupe(10, 108, xr, 160);
    g.degrade_h(10, 108, 300, 52, rgb(20, 40, 100), rgb(60, 20, 90), 200);
    g.texte(160, 116, "RÉVÉLATION", P30, TEXTE, 255, CENTRE);
    g.sans_decoupe();
    if (r < 1) { g.trait(xr, 110, xr, 158, 2, CYAN); g.halo(xr, 134, 30, CYAN, 140); }
    panneau(6, 166, 308, 40, 140);
    g.texte(160, 178, "Fondu par voile : rect(..., alpha)", P13, JAUNE, 255, CENTRE);
    g.rect(8, 168, 304, 36, PANNEAU, (230 * pulse(0.4)) | 0);
  }

  // ---------------- barres ----------------
  function barre_haut() {
    g.rect(0, 0, L, 24, PANNEAU, 190); g.degrade_h(0, 24, L, 1, CYAN, VIOLET, 140);
    g.halo(12, 12, 11 + 2 * pulse(0.7), JAUNE, (110 + 60 * pulse(0.7)) | 0); g.disque(12, 12, 3.5, rgb(255, 245, 200));
    g.texte(24, 4, "GFX", P13, TEXTE);
    const e = sortie((t - page_t0) / 0.4);
    g.texte(56 + ((30 * (1 - e)) | 0), 5, (page + 1) + " · " + TITRES[page], P13, CYAN, (255 * e) | 0);
    g.texte(314, 6, Math.round(ips) + " i/s", P11, TEXTE3, 255, DROITE);
  }
  function barre_bas() {
    g.rect(0, 210, L, 30, PANNEAU, 215); g.degrade_h(0, 210, L, 1, VIOLET, CYAN, 120);
    g.texte(24, 210, "‹", P22, TEXTE2, 255, CENTRE); g.texte(296, 210, "›", P22, TEXTE2, 255, CENTRE);
    for (let i = 0; i < NB_PAGES; i++) {
      const x = 160 + (i - (NB_PAGES - 1) / 2) * 14;
      if (i === page) { g.halo(x, 217, 9, CYAN, 120); g.disque(x, 217, 3.5, CYAN); } else g.disque(x, 217, 2.5, TEXTE3);
    }
    if (mode_auto) { const p = sat01((t - page_t0) / DUREE_AUTO); g.rect(100, 237, (120 * p) | 0, 2, CYAN, 180); g.texte(160, 223, "AUTO", P11, CYAN, 200, CENTRE); }
    else g.texte(160, 223, "manuel", P11, TEXTE3, 200, CENTRE);
  }
  function dessiner_toast() {
    const age = t - toast_t0;
    if (age < 0 || age > 2 || !toast_txt) return;
    const e = age < 0.3 ? sortie(age / 0.3) : age > 1.6 ? 1 - (age - 1.6) / 0.4 : 1;
    const l = g.largeur_texte(toast_txt, P13) + 34, x = (L - l) >> 1, y = (-20 + 50 * e) | 0, a = (255 * sat01(e)) | 0;
    g.rect_arrondi(x, y, l, 24, 12, PANNEAU2, (a * 0.95) | 0); g.contour_arrondi(x, y, l, 24, 12, 1.2, toast_c, a);
    g.disque(x + 14, y + 12, 4, toast_c, a); g.texte(x + 24, y + 5, toast_txt, P13, TEXTE, a);
  }

  // ---------------- toucher ----------------
  function tap(x, y) {
    if (y >= 208) {
      if (x < 80) changer_page(page - 1);
      else if (x >= 240) changer_page(page + 1);
      else { mode_auto = !mode_auto; page_t0 = t; toast(mode_auto ? "Mode AUTO" : "Mode manuel", CYAN); }
      return;
    }
    if (page === 6) explosion(x, y);
    if (page === 7) {
      if (dans(x, y, BT_X, BT_Y, BT_L, BT_H)) return;
      if (dans(x, y, IN_X - 6, IN_Y - 6, IN_L + 40, IN_H + 12)) { interrupteur = !interrupteur; return; }
      if (ondes.length < 8) ondes.push({ x, y, t0: t });
    }
  }
  function toucher(appui, x, y) {
    if (appui && !tc_appui) {
      tc_x0 = tc_x = tc_xp = x; tc_y0 = tc_y = y; tc_t0 = t; tc_bouge = false; tc_cible = C_RIEN;
      if (page === 7 && dans(x, y, CUR_X - 14, CUR_Y - 18, CUR_L + 28, 36)) { tc_cible = C_CURSEUR; curseur_v = 0; }
      else if (page === 7 && dans(x, y, BT_X, BT_Y, BT_L, BT_H)) tc_cible = C_BOUTON;
    } else if (appui && tc_appui) {
      if (Math.abs(x - tc_x0) > 6 || Math.abs(y - tc_y0) > 6) tc_bouge = true;
      if (tc_cible === C_CURSEUR) {
        const dv = (x - tc_xp) * 100 / CUR_L;
        curseur = Math.min(100, Math.max(0, curseur + dv));
        const vinst = dt > 0 ? dv / dt : 0;
        curseur_v = curseur_v * 0.6 + vinst * 0.4;
      }
      tc_xp = tc_x = x; tc_y = y;
    } else if (!appui && tc_appui) {
      if (tc_cible === C_BOUTON) { if (dans(tc_x, tc_y, BT_X, BT_Y, BT_L, BT_H)) { nb_appuis++; toast("Bouton appuyé ✓", VERT); } }
      else if (tc_cible === C_CURSEUR) { if (Math.abs(curseur_v) < 5) curseur_v = 0; }
      else if (tc_bouge && Math.abs(tc_x - tc_x0) > 60 && Math.abs(tc_y - tc_y0) < 50) changer_page(page + (tc_x < tc_x0 ? 1 : -1));
      else if (!tc_bouge && t - tc_t0 < 0.8) tap(tc_x0, tc_y0);
      tc_cible = C_RIEN;
    }
    tc_appui = appui;
  }

  function init(avecFond = true) {
    if (avecFond) {
      fondBuf = new Uint16Array(L * H);
      const cur = g.fb; g.fb = fondBuf; dessiner_fond_complet(); g.fb = cur;
    }
    for (let i = 0; i < 48; i++) etoiles.push({ x: alea() * L, y: alea() * H, v: 2 + alea() * 8, ph: alea() * 6.28, lum: (60 + alea() * 160) | 0 });
  }
  const PAGES = [page_primitives, page_alpha, page_easing, page_arcs, page_texte, page_courbes, page_particules, page_tactile, page_decoupe];
  function image(ms) {
    if (ms_prec === 0) ms_prec = ms;
    dt = (ms - ms_prec) / 1000; if (dt > 0.1) dt = 0.1; if (dt < 0.001) dt = 0.001;
    ms_prec = ms; t += dt; ips = ips * 0.95 + (1 / dt) * 0.05;
    if (mode_auto && !tc_appui && t - page_t0 > DUREE_AUTO) changer_page(page + 1);
    fond();
    PAGES[page]();
    const f = (t - page_t0) / 0.3;
    if (f < 1) g.rect(0, 26, L, 182, FOND_HAUT, (230 * (1 - sortie(f))) | 0);
    barre_haut(); barre_bas(); dessiner_toast();
  }
  return {
    init, image, toucher,
    allerPage(p) { changer_page(p); },
    page: () => page,
    auto: v => { if (v !== undefined) { mode_auto = v; page_t0 = t; } return mode_auto; },
  };
}
if (typeof module !== "undefined") module.exports = { creerScene };
