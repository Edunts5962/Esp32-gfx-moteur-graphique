const fs = require("fs");
global.atob = s => Buffer.from(s, "base64").toString("binary");
eval(fs.readFileSync("polices.js", "utf8") + "\nglobal.POLICES_DATA=POLICES_DATA;");
const { Gfx, chargerPolices } = require("./gfx.js"); global.Gfx = Gfx;
const { creerScene } = require("./scene.js");
const P = chargerPolices(POLICES_DATA), g = new Gfx(), s = creerScene(g, P);
s.init();
let ms = 0;
const img = (a = false, x = 0, y = 0) => { ms += 33; s.toucher(a, x, y); s.image(ms); };
const att = sec => { for (let i = 0; i < Math.trunc(sec * 30); i++) img(); };
const tap = (x, y) => { img(true, x, y); img(true, x, y); img(false, x, y); };
const gl = (x0, y0, x1, y1, n) => { for (let i = 0; i <= n; i++) img(true, x0 + Math.trunc((x1 - x0) * i / n), y0 + Math.trunc((y1 - y0) * i / n)); img(false, x1, y1); };
const ppm = nom => {
  const b = Buffer.alloc(320 * 240 * 3);
  for (let i = 0; i < 320 * 240; i++) { const c = g.fb[i]; let r = (c >> 11) << 3, gg = ((c >> 5) & 63) << 2, bb = (c & 31) << 3;
    b[i * 3] = r | (r >> 5); b[i * 3 + 1] = gg | (gg >> 6); b[i * 3 + 2] = bb | (bb >> 5); }
  fs.writeFileSync("out/" + nom + ".ppm", Buffer.concat([Buffer.from("P6\n320 240\n255\n"), b]));
};
fs.mkdirSync("out", { recursive: true });
tap(160, 225); att(2.0);
const N = ["p1_primitives", "p2_transparence", "p3_mouvement", "p4_arcs_jauges", "p5_texte", "p6_courbes", "p7_particules", "p8_tactile", "p9_decoupe"];
for (let p = 0; p < 9; p++) {
  if (p === 6) { att(0.6); tap(90, 90); att(0.15); tap(230, 120); att(0.35); }
  else if (p === 7) { gl(60, 64, 200, 64, 6); att(0.3); img(true, 70, 130); img(true, 70, 130); img(false, 70, 130); tap(230, 134); tap(150, 190); att(0.3); }
  else att(1.6);
  ppm(N[p]); att(1.4);
  if (p < 8) gl(260, 120, 120, 120, 6);
}
