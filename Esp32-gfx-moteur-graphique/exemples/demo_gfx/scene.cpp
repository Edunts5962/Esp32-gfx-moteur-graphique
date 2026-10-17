// scene.cpp - vitrine du moteur gfx : 9 pages qui montrent tout ce qu'on
// peut animer avec gfx.cpp (aucune bibliotheque graphique externe).
//
//   1 Primitives        rect, degrades, arrondis, disque, anneau, triangle,
//                       trait, pointilles, arc, halo, pixel, texte
//   2 Transparence      melange alpha et lumiere additive
//   3 Mouvement         courbes d'acceleration (easing), ressort, approche
//   4 Arcs et jauges    spinner, anneau de progression, cadran a aiguille
//   5 Texte             les 6 polices, accents, compteur, machine a ecrire
//   6 Courbes           oscilloscope, histogramme, nuage de points + droite
//   7 Particules        fontaine, comete, explosion au toucher
//   8 Tactile           curseur a inertie, bouton, interrupteur, ondes
//   9 Decoupe           bandeau defilant, barre de progression, revelation
//
// Navigation : barre du bas (‹ ›), glisser a gauche/droite, ou mode AUTO
// (touche du milieu) qui change de page toutes les 8 s.
// Ce fichier ne depend que de gfx.h / polices.h : il tourne sur la carte
// (demo_gfx.ino) et sur PC (sim_demo.cpp) sans modification.
#include "scene.h"
#include "gfx.h"
#include <math.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

using namespace gfx;

namespace scene {

// ============================ Palette ======================================
static const uint16_t FOND_HAUT = rgb(4, 6, 18);
static const uint16_t FOND_BAS  = rgb(16, 12, 42);
static const uint16_t PANNEAU   = rgb(16, 22, 52);
static const uint16_t PANNEAU2  = rgb(28, 36, 80);
static const uint16_t BORD      = rgb(52, 66, 130);
static const uint16_t GRILLE    = rgb(34, 44, 92);
static const uint16_t TEXTE     = rgb(236, 242, 255);
static const uint16_t TEXTE2    = rgb(156, 168, 210);
static const uint16_t TEXTE3    = rgb(96, 108, 156);
static const uint16_t CYAN      = rgb(40, 228, 255);
static const uint16_t BLEU      = rgb(70, 120, 255);
static const uint16_t VIOLET    = rgb(140, 92, 255);
static const uint16_t MAGENTA   = rgb(255, 64, 200);
static const uint16_t JAUNE     = rgb(255, 212, 64);
static const uint16_t ORANGE    = rgb(255, 140, 60);
static const uint16_t ROUGE     = rgb(255, 78, 106);
static const uint16_t VERT      = rgb(60, 255, 156);
static const uint16_t NOIR_BLEU = rgb(6, 10, 30);

static const float PI_F = 3.14159265f;

// ============================ Temps et outils ==============================
static float t = 0, dt = 0.033f, ips = 30;
static uint32_t ms_prec = 0;

static inline float sat01(float v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
// Rapproche v de la cible c, independamment du nombre d'images par seconde
static inline float approche(float v, float c, float k) { return v + (c - v) * (1.0f - expf(-k * dt)); }
// Courbes d'acceleration (0 -> 1)
static inline float sortie(float x) { x = sat01(x); return 1 - (1 - x) * (1 - x) * (1 - x); }
static inline float lisse(float x) { x = sat01(x); return x * x * (3 - 2 * x); }
static float rebond(float x)
{
    x = sat01(x);
    const float n = 7.5625f, d = 2.75f;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) { x -= 1.5f / d;   return n * x * x + 0.75f; }
    if (x < 2.5f / d) { x -= 2.25f / d; return n * x * x + 0.9375f; }
    x -= 2.625f / d;
    return n * x * x + 0.984375f;
}
// Oscillation 0..1 a la frequence f (Hz)
static inline float pulse(float f, float ph = 0) { return 0.5f + 0.5f * sinf(t * f * 2 * PI_F + ph); }

static uint32_t alea_e = 0x9E3779B9;
static float alea()
{
    alea_e ^= alea_e << 13; alea_e ^= alea_e >> 17; alea_e ^= alea_e << 5;
    return (alea_e >> 8) * (1.0f / 16777216.0f);
}

static bool dans(int x, int y, int rx, int ry, int rl, int rh)
{
    return x >= rx && x < rx + rl && y >= ry && y < ry + rh;
}

static void fmt(char *b, int n, float v, int dec)        // virgule decimale
{
    snprintf(b, n, "%.*f", dec, v);
    for (char *p = b; *p; p++) if (*p == '.') *p = ',';
}

static void panneau(int x, int y, int l, int h, uint8_t a = 150)
{
    rect_arrondi(x, y, l, h, 10, PANNEAU, a);
    contour_arrondi(x, y, l, h, 10, 1, BORD, 110);
}

static void legende(int x, int y, const char *s) { texte(x, y, s, POLICE_11, TEXTE2, 255, CENTRE); }

// ============================ Etat global ==================================
enum { P_PRIM, P_ALPHA, P_EASING, P_ARCS, P_TEXTE, P_COURBES, P_PART, P_TACTILE, P_DECOUPE, NB_PAGES };
static const char *TITRES[NB_PAGES] = {
    "Primitives", "Transparence", "Mouvement", "Arcs et jauges", "Texte",
    "Courbes", "Particules", "Tactile", "Découpe",
};
static int page = 0;
static float page_t0 = 0;
static bool mode_auto = true;
static const float DUREE_AUTO = 8.0f;

static uint16_t *s_fond = nullptr;

// Toucher
enum { C_RIEN, C_CURSEUR, C_BOUTON };
static bool tc_appui = false;
static int tc_x0 = 0, tc_y0 = 0, tc_x = 0, tc_y = 0, tc_xp = 0;
static float tc_t0 = 0;
static bool tc_bouge = false;
static int tc_cible = C_RIEN;

// Toast (message qui descend du haut)
static char toast_txt[48] = "";
static uint16_t toast_c = CYAN;
static float toast_t0 = -10;

static void toast(const char *s, uint16_t c)
{
    strncpy(toast_txt, s, sizeof toast_txt - 1);
    toast_txt[sizeof toast_txt - 1] = 0;
    toast_c = c;
    toast_t0 = t;
}

static void changer_page(int p)
{
    page = (p + NB_PAGES) % NB_PAGES;
    page_t0 = t;
}

// ============================ Fond =========================================
struct Etoile { float x, y, v, ph; uint8_t lum; };
static Etoile etoiles[48];

static void dessiner_fond_complet()
{
    degrade_v(0, 0, L, H, FOND_HAUT, FOND_BAS);
    halo(255, 50, 150, VIOLET, 34);
    halo(40, 210, 140, BLEU, 26);
    halo(170, 250, 110, MAGENTA, 14);
}

static void fond()
{
    // Le fond (degrade + halos) coute cher : il est calcule une seule fois
    // dans s_fond, puis recopie d'un bloc a chaque image.
    if (s_fond) copier(s_fond);
    else dessiner_fond_complet();
    for (auto &e : etoiles) {                       // etoiles qui defilent
        e.x -= e.v * dt;
        if (e.x < 0) { e.x += L; e.y = alea() * H; }
        float a = e.lum * (0.55f + 0.45f * sinf(t * 1.7f + e.ph));
        pixel_ajout((int)e.x, (int)e.y, TEXTE, (uint8_t)a);
    }
}

// ============================ 1. Primitives ================================
// 12 cases de 76 x 58 : une primitive par case.
static void case_prim(int i, float &cx, float &cy, int &x, int &y)
{
    x = 6 + (i % 4) * 77;
    y = 28 + (i / 4) * 59;
    panneau(x, y, 75, 57, 130);
    cx = x + 37.5f;
    cy = y + 22;
}

static void page_primitives()
{
    float cx, cy;
    int x, y;
    float ang = t * 0.9f;

    case_prim(0, cx, cy, x, y);                     // rect + alpha
    rect((int)cx - 24, (int)cy - 14, 30, 22, CYAN);
    rect((int)cx - 8, (int)cy - 6, 30, 22, MAGENTA, (uint8_t)(60 + 160 * pulse(0.5f)));
    legende(x + 37, y + 42, "rect");

    case_prim(1, cx, cy, x, y);                     // degrades
    degrade_v((int)cx - 30, (int)cy - 14, 28, 28, JAUNE, ROUGE);
    degrade_h((int)cx + 2, (int)cy - 14, 28, 28, BLEU, VERT);
    legende(x + 37, y + 42, "dégradés");

    case_prim(2, cx, cy, x, y);                     // rect arrondi
    int r = (int)(2 + 12 * pulse(0.4f));
    rect_arrondi_degrade((int)cx - 26, (int)cy - 14, 52, 28, r, rgb(70, 225, 255), rgb(100, 90, 255));
    contour_arrondi((int)cx - 29, (int)cy - 17, 58, 34, r + 3, 1.2f, CYAN, 200);
    legende(x + 37, y + 42, "rect_arrondi");

    case_prim(3, cx, cy, x, y);                     // disque
    disque(cx, cy, 6 + 9 * pulse(0.7f), JAUNE);
    disque(cx + 18, cy - 8, 4, ORANGE, 200);
    legende(x + 37, y + 42, "disque");

    case_prim(4, cx, cy, x, y);                     // anneau
    anneau(cx, cy, 14, 1 + 6 * pulse(0.6f), VERT);
    anneau(cx, cy, 5, 1.5f, VERT, 160);
    legende(x + 37, y + 42, "anneau");

    case_prim(5, cx, cy, x, y);                     // triangle qui tourne
    {
        float ax[3], ay[3];
        for (int k = 0; k < 3; k++) {
            float a = ang + k * 2 * PI_F / 3;
            ax[k] = cx + cosf(a) * 17;
            ay[k] = cy + sinf(a) * 17;
        }
        triangle(ax[0], ay[0], ax[1], ay[1], ax[2], ay[2], MAGENTA);
    }
    legende(x + 37, y + 42, "triangle");

    case_prim(6, cx, cy, x, y);                     // traits d'epaisseurs differentes
    for (int k = 0; k < 4; k++) {
        float a = ang * 0.6f + k * 0.35f;
        float ep = 0.8f + k * 1.2f;
        trait(cx - cosf(a) * 22, cy - sinf(a) * 14 + (k - 1.5f) * 6,
              cx + cosf(a) * 22, cy + sinf(a) * 14 + (k - 1.5f) * 6, ep, TEXTE);
    }
    legende(x + 37, y + 42, "trait");

    case_prim(7, cx, cy, x, y);                     // pointilles
    for (int k = 0; k < 3; k++) {
        float a = -ang + k * PI_F / 3;
        trait_pointille(cx - cosf(a) * 20, cy - sinf(a) * 16, cx + cosf(a) * 20, cy + sinf(a) * 16,
                        1.5f, 5, 3, k == 0 ? JAUNE : TEXTE2);
    }
    legende(x + 37, y + 42, "pointillés");

    case_prim(8, cx, cy, x, y);                     // arc
    anneau(cx, cy, 14, 4, PANNEAU2);
    float a2 = fmodf(ang * 2, 2 * PI_F);
    arc(cx, cy, 14, 4, a2, a2 + 1 + 3.5f * pulse(0.4f), CYAN);
    legende(x + 37, y + 42, "arc");

    case_prim(9, cx, cy, x, y);                     // halo (lumiere additive)
    halo(cx, cy, 24, ORANGE, (uint8_t)(120 + 120 * pulse(0.8f)));
    disque(cx, cy, 2.5f, rgb(255, 245, 220));
    legende(x + 37, y + 42, "halo");

    case_prim(10, cx, cy, x, y);                    // pixels (sinusoide point par point)
    for (int i = 0; i < 60; i++) {
        float px = cx - 30 + i;
        float py = cy + 12 * sinf(i * 0.2f - t * 4);
        pixel((int)px, (int)py, VERT);
        pixel_ajout((int)px, (int)py + 1, VERT, 90);
    }
    legende(x + 37, y + 42, "pixel");

    case_prim(11, cx, cy, x, y);                    // texte
    texte((int)cx, (int)cy - 14, "Aa", POLICE_22, TEXTE, (uint8_t)(80 + 175 * pulse(0.5f)), CENTRE);
    legende(x + 37, y + 42, "texte");
}

// ============================ 2. Transparence ==============================
static void page_alpha()
{
    const uint16_t RGB3[3] = { rgb(255, 40, 40), rgb(40, 255, 60), rgb(50, 90, 255) };

    // a gauche : melange alpha classique (le dernier dessine est "devant")
    panneau(6, 28, 150, 136, 140);
    for (int k = 0; k < 3; k++) {
        float a = t * 0.8f + k * 2 * PI_F / 3;
        disque(81 + cosf(a) * 16, 90 + sinf(a) * 16, 28, RGB3[k], 150);
    }
    legende(81, 146, "Mélange alpha (a = 150)");

    // a droite : lumiere additive, les couleurs s'ajoutent vers le blanc
    rect_arrondi(164, 28, 150, 136, 10, NOIR_BLEU, 240);
    contour_arrondi(164, 28, 150, 136, 10, 1, BORD, 110);
    for (int k = 0; k < 3; k++) {
        float a = -t * 0.8f + k * 2 * PI_F / 3;
        halo(239 + cosf(a) * 16, 90 + sinf(a) * 16, 46, RGB3[k], 230);
    }
    legende(239, 146, "Additif : halo()");

    // en bas : rampe d'opacite
    panneau(6, 168, 308, 38, 140);
    for (int i = 0; i < 8; i++) {
        uint8_t a = (uint8_t)(32 + i * 223 / 7);
        int x = 14 + i * 37;
        rect_arrondi(x, 174, 30, 14, 4, CYAN, a);
        char b[8];
        snprintf(b, sizeof b, "%d", a);
        texte(x + 15, 190, b, POLICE_11, TEXTE3, 255, CENTRE);
    }
}

// ============================ 3. Mouvement (easing) ========================
static const int NB_PISTES = 6;
static float ressort_x = 0, ressort_v = 0, approche_x = 0;
static float trace[NB_PISTES][8];

static void page_easing()
{
    static const char *NOMS[NB_PISTES] = { "linéaire", "sortie()", "lisse()", "rebond()", "ressort", "approche()" };
    static const uint16_t COUL[NB_PISTES] = { TEXTE2, CYAN, VERT, JAUNE, MAGENTA, ORANGE };
    const float CYCLE = 2.4f, MOUV = 1.6f;
    int k = (int)floorf(t / CYCLE);
    float u = sat01(fmodf(t, CYCLE) / MOUV);
    bool retour = k & 1;
    float cible = retour ? 0.0f : 1.0f;

    // les deux pistes "physiques" suivent une cible au lieu d'une formule
    ressort_v += (cible - ressort_x) * 140 * dt;      // force de rappel
    ressort_v *= expf(-7 * dt);                       // amortissement
    ressort_x += ressort_v * dt;
    approche_x = approche(approche_x, cible, 5);

    float val[NB_PISTES] = { u, sortie(u), lisse(u), rebond(u), 0, 0 };
    for (int i = 0; i < 4; i++) if (retour) val[i] = 1 - val[i];
    val[4] = ressort_x;
    val[5] = approche_x;

    panneau(6, 28, 308, 178, 140);
    for (int i = 0; i < NB_PISTES; i++) {
        int y = 46 + i * 28;
        texte(14, y - 7, NOMS[i], POLICE_11, TEXTE2);
        float x0 = 96, x1 = 300;
        trait(x0, y, x1, y, 1, GRILLE);
        float x = x0 + (x1 - x0) * val[i];
        // trainee : positions des images precedentes
        for (int q = 7; q > 0; q--) trace[i][q] = trace[i][q - 1];
        trace[i][0] = x;
        for (int q = 1; q < 8; q++) disque(trace[i][q], (float)y, 5 - q * 0.5f, COUL[i], (uint8_t)(140 - q * 17));
        halo(x, (float)y, 14, COUL[i], 110);
        disque(x, (float)y, 5, COUL[i]);
    }
}

// ============================ 4. Arcs et jauges ============================
static float aig = 0.3f, aig_v = 0, aig_cible = 0.3f, aig_t = 0;
static float barres[3] = { 0, 0, 0 }, barres_c[3] = { 0.5f, 0.5f, 0.5f };

static void page_arcs()
{
    panneau(6, 28, 308, 120, 140);

    // spinner : arc qui tourne et dont la longueur respire
    float a0 = fmodf(t * 5, 2 * PI_F);          // arc() veut des angles proches de 0..2π
    anneau(58, 86, 26, 6, PANNEAU2);
    arc(58, 86, 26, 6, a0, a0 + 0.8f + 3.2f * pulse(0.5f), CYAN);
    halo(58 + cosf(a0) * 26, 86 + sinf(a0) * 26, 10, CYAN, 120);
    legende(58, 126, "Chargement");

    // anneau de progression
    float p = sortie(fmodf(t, 4.0f) / 3.2f);
    anneau(160, 86, 30, 7, PANNEAU2);
    arc(160, 86, 30, 7, -PI_F / 2, -PI_F / 2 + 2 * PI_F * p, VERT);
    char b[24];
    snprintf(b, sizeof b, "%d %%", (int)(p * 100 + 0.5f));
    texte(160, 72, b, POLICE_22, TEXTE, 255, CENTRE);
    legende(160, 126, "Progression");

    // cadran a aiguille (ressort amorti vers une valeur qui change)
    if (t - aig_t > 1.6f) { aig_t = t; aig_cible = 0.1f + alea() * 0.85f; }
    aig_v += (aig_cible - aig) * 90 * dt;
    aig_v *= expf(-6 * dt);
    aig += aig_v * dt;
    const float D0 = PI_F * 0.75f, D1 = PI_F * 2.25f;    // 270 degres, ouvert en bas
    float gx = 262, gy = 90;
    arc(gx, gy, 32, 5, D0, D0 + (D1 - D0) * 0.6f, VERT, 180);
    arc(gx, gy, 32, 5, D0 + (D1 - D0) * 0.6f, D0 + (D1 - D0) * 0.85f, JAUNE, 180);
    arc(gx, gy, 32, 5, D0 + (D1 - D0) * 0.85f, D1, ROUGE, 180);
    for (int i = 0; i <= 10; i++) {
        float a = D0 + (D1 - D0) * i / 10;
        float r0 = i % 5 == 0 ? 20 : 24;
        trait(gx + cosf(a) * r0, gy + sinf(a) * r0, gx + cosf(a) * 27, gy + sinf(a) * 27, 1.2f, TEXTE2);
    }
    float aa = D0 + (D1 - D0) * aig;
    trait(gx, gy, gx + cosf(aa) * 26, gy + sinf(aa) * 26, 2.2f, TEXTE);
    disque(gx, gy, 4, TEXTE);
    fmt(b, sizeof b, aig * 100, 0);
    texte((int)gx, (int)gy + 14, b, POLICE_13, TEXTE, 255, CENTRE);
    legende((int)gx, 126, "Cadran (ressort)");

    // barres horizontales qui "approchent" leur cible
    panneau(6, 152, 308, 54, 140);
    static float barres_t = -10;
    if (t - barres_t > 1.2f) {
        barres_t = t;
        for (int i = 0; i < 3; i++) barres_c[i] = 0.1f + alea() * 0.9f;
    }
    static const char *NB[3] = { "Canal 1", "Canal 2", "Canal 3" };
    for (int i = 0; i < 3; i++) {
        barres[i] = approche(barres[i], barres_c[i], 6);
        int y = 158 + i * 15;
        texte(14, y - 1, NB[i], POLICE_11, TEXTE3);
        rect_arrondi(70, y, 236, 10, 5, PANNEAU2, 230);
        int w = (int)(236 * barres[i]);
        if (w > 10) rect_arrondi_degrade(70, y, w, 10, 5, CYAN, VIOLET);
        halo(70 + w, y + 5, 10, CYAN, 90);
    }
}

// ============================ 5. Texte =====================================
static float compteur = 0, compteur_c = 343.2f, compteur_t = 0;

static void page_texte()
{
    panneau(6, 28, 308, 120, 140);
    // titre qui glisse depuis la droite a l'arrivee sur la page
    float e = sortie((t - page_t0) / 0.6f);
    texte(14 + (int)(60 * (1 - e)), 30, "SON ET LUMIÈRE", POLICE_30, TEXTE, (uint8_t)(255 * e));
    texte(14, 68, "Écho à 17 m", POLICE_22, CYAN);
    texte(14, 94, "Fréquence : 440 Hz", POLICE_16, TEXTE);
    texte(14, 113, "Accents : é è ê à ç ù ô ï", POLICE_13, TEXTE2);
    texte(14, 130, "Symboles : ± × µ σ ° √ ≈ → ✓", POLICE_11, TEXTE3);
    texte(306, 74, "22 px", POLICE_11, TEXTE3, 255, DROITE);
    texte(306, 98, "16 px", POLICE_11, TEXTE3, 255, DROITE);
    texte(306, 115, "13 px", POLICE_11, TEXTE3, 255, DROITE);
    texte(306, 130, "11 px", POLICE_11, TEXTE3, 255, DROITE);

    // machine a ecrire (gauche)
    panneau(6, 152, 150, 54, 140);
    static const char *PHRASE = "c = 2d / t";
    int n = (int)((t - page_t0) * 6) % 16;
    char b[24];
    int nb = 0;
    const char *p = PHRASE;
    while (*p && nb < n) {                            // n caracteres UTF-8 entiers
        p++;
        while ((*p & 0xC0) == 0x80) p++;
        nb++;
    }
    int lg = (int)(p - PHRASE);
    memcpy(b, PHRASE, lg);
    b[lg] = 0;
    int lx = texte(16, 166, b, POLICE_16, JAUNE);
    if (pulse(2) > 0.5f) rect(16 + lx + 1, 167, 2, 17, JAUNE);
    texte(16, 190, "machine à écrire", POLICE_11, TEXTE3);

    // compteur qui roule vers sa valeur (droite)
    panneau(164, 152, 150, 54, 140);
    if (t - compteur_t > 2) { compteur_t = t; compteur_c = 300 + alea() * 60; }
    compteur = approche(compteur, compteur_c, 4);
    fmt(b, sizeof b, compteur, 1);
    texte(304, 150, b, POLICE_40, TEXTE, 255, DROITE);
    texte(172, 190, "m/s", POLICE_11, TEXTE3);
}

// ============================ 6. Courbes ===================================
static float histo[16], histo_c[16], histo_t = -10;

static float salve(float u) { return expf(-(u / 10) * (u / 10)) * sinf(u * 0.9f); }

static void page_courbes()
{
    // oscilloscope
    panneau(6, 28, 308, 110, 150);
    decoupe(8, 30, 312, 136);
    for (int x = 26; x < 312; x += 20) trait((float)x, 30, (float)x, 136, 1, GRILLE, 140);
    for (int y = 43; y < 136; y += 20) trait(8, (float)y, 312, (float)y, 1, GRILLE, 140);
    float s = fmodf(t * 90, 420) - 40;               // position de l'emission
    const float yc = 83;
    float px = 8, py = yc;
    for (int x = 9; x < 312; x += 2) {
        float v = salve(x - s) + 0.45f * salve(x - s + 110);   // signal + echo
        float y = yc - 38 * v;
        trait(px, py, (float)x, y, 1.6f, CYAN);
        px = (float)x; py = y;
    }
    trait_pointille(8, yc - 22, 312, yc - 22, 1, 6, 4, JAUNE, 200);
    texte(310, yc - 36, "seuil", POLICE_11, JAUNE, 255, DROITE);
    sans_decoupe();

    // histogramme anime
    panneau(6, 142, 150, 64, 140);
    if (t - histo_t > 1) {
        histo_t = t;
        for (int i = 0; i < 16; i++) {
            float d = (i - 7.5f) / 3.5f;
            histo_c[i] = expf(-d * d) * (0.6f + 0.4f * alea());
        }
    }
    for (int i = 0; i < 16; i++) {
        histo[i] = approche(histo[i], histo_c[i], 8);
        int h = (int)(40 * histo[i]);
        rect(14 + i * 8, 186 - h, 6, h, melange(VIOLET, CYAN, (uint8_t)(255 * histo[i])));
    }
    texte(81, 192, "histogramme", POLICE_11, TEXTE3, 255, CENTRE);

    // nuage de points + droite qui se trace
    panneau(164, 142, 150, 64, 140);
    float u = fmodf(t, 3.0f);
    for (int i = 0; i < 8; i++) {
        float x = 176 + i * 17;
        float y = 194 - i * 6 + 4 * sinf(i * 2.3f);
        float apparu = sat01((u - i * 0.08f) / 0.3f);
        disque(x, y, 3 * sortie(apparu), JAUNE);
    }
    float e = sortie((u - 0.8f) / 1.2f);
    if (e > 0) trait(172, 196, 172 + 132 * e, 196 - 132 * e * 0.33f, 1.6f, CYAN);
    texte(172, 146, "régression", POLICE_11, TEXTE3);
}

// ============================ 7. Particules ================================
struct Particule { float x, y, vx, vy, vie, age; uint16_t c; };
static Particule part[160];
static int nb_part = 0;
static float emission = 0;
static float comete[16][2];

static void lancer(float x, float y, float vx, float vy, float vie, uint16_t c)
{
    if (nb_part >= 160) return;
    part[nb_part++] = { x, y, vx, vy, vie, 0, c };
}

static void explosion(float x, float y)
{
    const uint16_t cols[4] = { CYAN, JAUNE, MAGENTA, VERT };
    for (int i = 0; i < 50; i++) {
        float a = alea() * 2 * PI_F, v = 40 + alea() * 140;
        lancer(x, y, cosf(a) * v, sinf(a) * v - 20, 0.8f + alea() * 0.8f, cols[i % 4]);
    }
}

static void page_particules()
{
    panneau(6, 28, 308, 178, 110);
    decoupe(7, 29, 313, 205);
    // fontaine
    emission += dt * 50;
    while (emission >= 1) {
        emission -= 1;
        lancer(160, 200, (alea() - 0.5f) * 50, -130 - alea() * 50, 1.6f, melange(CYAN, BLEU, (uint8_t)(alea() * 255)));
    }
    for (int i = 0; i < nb_part;) {
        Particule &p = part[i];
        p.age += dt;
        if (p.age > p.vie) { p = part[--nb_part]; continue; }
        p.vy += 120 * dt;                              // gravite
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        float a = 1 - p.age / p.vie;
        halo(p.x, p.y, 5, p.c, (uint8_t)(120 * a));
        disque(p.x, p.y, 1.4f, p.c, (uint8_t)(255 * a));
        i++;
    }
    // comete sur une orbite en 8, avec trainee
    for (int q = 15; q > 0; q--) { comete[q][0] = comete[q - 1][0]; comete[q][1] = comete[q - 1][1]; }
    comete[0][0] = 160 + 110 * sinf(t * 1.1f);
    comete[0][1] = 100 + 40 * sinf(t * 2.2f);
    for (int q = 15; q >= 0; q--)
        disque(comete[q][0], comete[q][1], 4.5f - q * 0.25f, JAUNE, (uint8_t)(220 - q * 13));
    halo(comete[0][0], comete[0][1], 22, ORANGE, 150);
    sans_decoupe();
    texte(160, 32, "Touchez l'écran : explosion", POLICE_11, TEXTE2, 255, CENTRE);
}

// ============================ 8. Tactile ===================================
static float curseur = 40, curseur_v = 0;          // valeur 0..100
static bool interrupteur = false;
static float inter_aff = 0;
static int nb_appuis = 0;
struct Onde { float x, y, t0; };
static Onde ondes[8];
static int nb_ondes = 0;

static const int CUR_X = 20, CUR_L = 280, CUR_Y = 64;
static const int BT_X = 14, BT_Y = 112, BT_L = 130, BT_H = 44;
static const int IN_X = 200, IN_Y = 118, IN_L = 64, IN_H = 32;

static void page_tactile()
{
    panneau(6, 28, 308, 178, 140);

    // curseur avec inertie : on le lance d'un geste, il ralentit seul
    if (tc_cible != C_CURSEUR && fabsf(curseur_v) > 0.5f) {
        curseur += curseur_v * dt;
        curseur_v *= expf(-3 * dt);
        if (curseur < 0) { curseur = 0; curseur_v = -curseur_v * 0.4f; }      // petit rebond
        if (curseur > 100) { curseur = 100; curseur_v = -curseur_v * 0.4f; }
    }
    texte(20, 34, "Curseur (glisser, lancer)", POLICE_11, TEXTE2);
    char b[32];
    fmt(b, sizeof b, curseur, 0);
    texte(300, 30, b, POLICE_22, CYAN, 255, DROITE);
    rect_arrondi(CUR_X, CUR_Y - 4, CUR_L, 8, 4, PANNEAU2, 230);
    float kx = CUR_X + CUR_L * curseur / 100;
    rect_arrondi_degrade(CUR_X, CUR_Y - 4, (int)(kx - CUR_X) + 4, 8, 4, CYAN, VIOLET);
    bool tient = tc_cible == C_CURSEUR;
    halo(kx, CUR_Y, tient ? 26 : 16, CYAN, tient ? 160 : 90);
    disque(kx, CUR_Y, tient ? 11 : 9, TEXTE);

    // bouton : s'enfonce quand on appuie
    bool presse = tc_cible == C_BOUTON && dans(tc_x, tc_y, BT_X, BT_Y, BT_L, BT_H);
    int m = presse ? 3 : 0;
    if (!presse) halo(BT_X + BT_L / 2, BT_Y + BT_H / 2, 70, CYAN, (uint8_t)(20 + 25 * pulse(0.8f)));
    rect_arrondi_degrade(BT_X + m, BT_Y + m, BT_L - 2 * m, BT_H - 2 * m, 12,
                         presse ? rgb(40, 150, 200) : rgb(70, 225, 255), presse ? rgb(70, 60, 200) : rgb(100, 90, 255));
    texte(BT_X + BT_L / 2, BT_Y + 6, "APPUYER", POLICE_16, NOIR_BLEU, 255, CENTRE);
    snprintf(b, sizeof b, "%d appui%s", nb_appuis, nb_appuis > 1 ? "s" : "");
    texte(BT_X + BT_L / 2, BT_Y + 26, b, POLICE_11, NOIR_BLEU, 220, CENTRE);

    // interrupteur : le bouton rond glisse, la couleur se fond
    inter_aff = approche(inter_aff, interrupteur ? 1.0f : 0.0f, 14);
    uint16_t c = melange(PANNEAU2, VERT, (uint8_t)(255 * inter_aff));
    rect_arrondi(IN_X, IN_Y, IN_L, IN_H, IN_H / 2, c, 240);
    float bx = IN_X + 16 + (IN_L - 32) * inter_aff;
    disque(bx, IN_Y + IN_H / 2.0f, 12, TEXTE);
    texte(IN_X + IN_L + 8, IN_Y + 8, interrupteur ? "OUI" : "NON", POLICE_13, interrupteur ? VERT : TEXTE3);

    texte(160, 176, "Touchez ailleurs : ondes", POLICE_11, TEXTE3, 255, CENTRE);

    // ondes la ou on touche
    for (int i = 0; i < nb_ondes;) {
        float age = t - ondes[i].t0;
        if (age > 0.8f) { ondes[i] = ondes[--nb_ondes]; continue; }
        anneau(ondes[i].x, ondes[i].y, 4 + 36 * sortie(age / 0.8f), 2, CYAN, (uint8_t)(220 * (1 - age / 0.8f)));
        i++;
    }
    // le doigt lui-meme
    if (tc_appui && tc_y < 208) halo((float)tc_x, (float)tc_y, 18, TEXTE, 70);
}

// ============================ 9. Decoupe et transitions ====================
static void page_decoupe()
{
    // bandeau defilant : le texte deborde, decoupe() le coupe au panneau
    panneau(6, 28, 308, 30, 160);
    static const char *BANDEAU = "Vitesse du son ≈ 343 m/s à 20 °C  ·  Lumière ≈ 299 792 km/s  ·  ";
    int lb = largeur_texte(BANDEAU, POLICE_13);
    int x = 10 - (int)fmodf(t * 50, (float)lb);
    decoupe(10, 30, 310, 56);
    texte(x, 35, BANDEAU, POLICE_13, TEXTE);
    texte(x + lb, 35, BANDEAU, POLICE_13, TEXTE);
    for (int i = 0; i < 24; i++) {                   // fondu des bords
        uint8_t a = (uint8_t)(220 * (1 - i / 24.0f));
        rect(10 + i, 30, 1, 26, PANNEAU, a);
        rect(309 - i, 30, 1, 26, PANNEAU, a);
    }
    sans_decoupe();

    // barre de progression : un degrade complet, decoupe a la longueur voulue
    panneau(6, 62, 308, 40, 140);
    float p = fmodf(t / 3, 1.0f);
    const int BX = 14, BY = 72, BL = 292, BH = 20;
    rect_arrondi(BX, BY, BL, BH, 10, PANNEAU2, 230);
    decoupe(BX, BY, BX + (int)(BL * p), BY + BH);
    rect_arrondi_degrade(BX, BY, BL, BH, 10, rgb(30, 190, 255), rgb(110, 70, 240));
    float sx = BX + fmodf(t * 160, BL + 60) - 30;   // reflet qui balaie
    trait(sx, BY, sx - 12, BY + BH, 10, TEXTE, 60);
    sans_decoupe();
    char b[16];
    snprintf(b, sizeof b, "%d %%", (int)(p * 100));
    texte(BX + BL / 2, BY + 3, b, POLICE_13, TEXTE, 255, CENTRE);

    // revelation : le texte apparait derriere une ligne lumineuse
    panneau(6, 106, 308, 56, 140);
    float r = sortie(fmodf(t, 3.0f) / 1.8f);
    int xr = 10 + (int)(300 * r);
    decoupe(10, 108, xr, 160);
    degrade_h(10, 108, 300, 52, rgb(20, 40, 100), rgb(60, 20, 90), 200);
    texte(160, 116, "RÉVÉLATION", POLICE_30, TEXTE, 255, CENTRE);
    sans_decoupe();
    if (r < 1) {
        trait((float)xr, 110, (float)xr, 158, 2, CYAN);
        halo((float)xr, 134, 30, CYAN, 140);
    }

    // fondu : un voile semi-transparent qui va et vient
    panneau(6, 166, 308, 40, 140);
    texte(160, 178, "Fondu par voile : rect(..., alpha)", POLICE_13, JAUNE, 255, CENTRE);
    rect(8, 168, 304, 36, PANNEAU, (uint8_t)(230 * pulse(0.4f)));
}

// ============================ Barres communes ==============================
static void barre_haut()
{
    rect(0, 0, L, 24, PANNEAU, 190);
    degrade_h(0, 24, L, 1, CYAN, VIOLET, 140);
    halo(12, 12, 11 + 2 * pulse(0.7f), JAUNE, (uint8_t)(110 + 60 * pulse(0.7f)));
    disque(12, 12, 3.5f, rgb(255, 245, 200));
    texte(24, 4, "GFX", POLICE_13, TEXTE);
    // titre de page qui glisse
    float e = sortie((t - page_t0) / 0.4f);
    char b[48];
    snprintf(b, sizeof b, "%d · %s", page + 1, TITRES[page]);
    texte(56 + (int)(30 * (1 - e)), 5, b, POLICE_13, CYAN, (uint8_t)(255 * e));
    snprintf(b, sizeof b, "%d i/s", (int)(ips + 0.5f));
    texte(314, 6, b, POLICE_11, TEXTE3, 255, DROITE);
}

static void barre_bas()
{
    rect(0, 210, L, 30, PANNEAU, 215);
    degrade_h(0, 210, L, 1, VIOLET, CYAN, 120);
    texte(24, 210, "‹", POLICE_22, TEXTE2, 255, CENTRE);
    texte(296, 210, "›", POLICE_22, TEXTE2, 255, CENTRE);
    // points de pagination
    for (int i = 0; i < NB_PAGES; i++) {
        float x = 160 + (i - (NB_PAGES - 1) / 2.0f) * 14;
        if (i == page) { halo(x, 217, 9, CYAN, 120); disque(x, 217, 3.5f, CYAN); }
        else disque(x, 217, 2.5f, TEXTE3);
    }
    // mode AUTO : barre de temps avant la page suivante
    if (mode_auto) {
        float p = sat01((t - page_t0) / DUREE_AUTO);
        rect(100, 237, (int)(120 * p), 2, CYAN, 180);
        texte(160, 223, "AUTO", POLICE_11, CYAN, 200, CENTRE);
    } else {
        texte(160, 223, "manuel", POLICE_11, TEXTE3, 200, CENTRE);
    }
}

static void dessiner_toast()
{
    float age = t - toast_t0;
    if (age < 0 || age > 2.0f || !toast_txt[0]) return;
    float e = age < 0.3f ? sortie(age / 0.3f) : (age > 1.6f ? 1 - (age - 1.6f) / 0.4f : 1);
    int l = largeur_texte(toast_txt, POLICE_13) + 34;
    int x = (L - l) / 2;
    int y = (int)(-20 + 50 * e);
    uint8_t a = (uint8_t)(255 * sat01(e));
    rect_arrondi(x, y, l, 24, 12, PANNEAU2, (uint8_t)(a * 0.95f));
    contour_arrondi(x, y, l, 24, 12, 1.2f, toast_c, a);
    disque(x + 14, y + 12, 4, toast_c, a);
    texte(x + 24, y + 5, toast_txt, POLICE_13, TEXTE, a);
}

// ============================ Toucher ======================================
static void tap(int x, int y)
{
    if (y >= 208) {                                  // barre du bas
        if (x < 80) changer_page(page - 1);
        else if (x >= 240) changer_page(page + 1);
        else {
            mode_auto = !mode_auto;
            page_t0 = t;
            toast(mode_auto ? "Mode AUTO" : "Mode manuel", CYAN);
        }
        return;
    }
    if (page == P_PART) explosion((float)x, (float)y);
    if (page == P_TACTILE) {
        if (dans(x, y, BT_X, BT_Y, BT_L, BT_H)) return;   // gere au relachement
        if (dans(x, y, IN_X - 6, IN_Y - 6, IN_L + 40, IN_H + 12)) { interrupteur = !interrupteur; return; }
        if (nb_ondes < 8) ondes[nb_ondes++] = { (float)x, (float)y, t };
    }
}

void toucher(bool appui, int x, int y)
{
    if (appui && !tc_appui) {                        // le doigt se pose
        tc_x0 = tc_x = tc_xp = x;
        tc_y0 = tc_y = y;
        tc_t0 = t;
        tc_bouge = false;
        tc_cible = C_RIEN;
        if (page == P_TACTILE && dans(x, y, CUR_X - 14, CUR_Y - 18, CUR_L + 28, 36)) {
            tc_cible = C_CURSEUR;
            curseur_v = 0;
        } else if (page == P_TACTILE && dans(x, y, BT_X, BT_Y, BT_L, BT_H)) {
            tc_cible = C_BOUTON;
        }
    } else if (appui && tc_appui) {                  // le doigt glisse
        if (abs(x - tc_x0) > 6 || abs(y - tc_y0) > 6) tc_bouge = true;
        if (tc_cible == C_CURSEUR) {
            float dv = (x - tc_xp) * 100.0f / CUR_L;
            curseur += dv;
            if (curseur < 0) curseur = 0;
            if (curseur > 100) curseur = 100;
            float vinst = dt > 0 ? dv / dt : 0;
            curseur_v = curseur_v * 0.6f + vinst * 0.4f;   // vitesse lissee pour l'inertie
        }
        tc_xp = tc_x = x;
        tc_y = y;
    } else if (!appui && tc_appui) {                 // le doigt se leve
        if (tc_cible == C_BOUTON) {
            if (dans(tc_x, tc_y, BT_X, BT_Y, BT_L, BT_H)) {
                nb_appuis++;
                toast("Bouton appuyé ✓", VERT);
            }
        } else if (tc_cible == C_CURSEUR) {
            if (fabsf(curseur_v) < 5) curseur_v = 0;
        } else if (tc_bouge && abs(tc_x - tc_x0) > 60 && abs(tc_y - tc_y0) < 50) {
            changer_page(page + (tc_x < tc_x0 ? 1 : -1));   // glissement = page suivante
        } else if (!tc_bouge && t - tc_t0 < 0.8f) {
            tap(tc_x0, tc_y0);
        }
        tc_cible = C_RIEN;
    }
    tc_appui = appui;
}

// ============================ Boucle =======================================
void init(uint16_t *fond_buf)
{
    s_fond = fond_buf;
    if (s_fond) {                                    // fond calcule une seule fois
        uint16_t *cur = gfx::fb;
        gfx::fb = s_fond;
        dessiner_fond_complet();
        gfx::fb = cur;
    }
    for (auto &e : etoiles) {
        e.x = alea() * L;
        e.y = alea() * H;
        e.v = 2 + alea() * 8;
        e.ph = alea() * 6.28f;
        e.lum = (uint8_t)(60 + alea() * 160);
    }
}

void image(uint32_t ms)
{
    // pas de temps reel : les animations vont a la meme vitesse a 15 ou 40 i/s
    if (ms_prec == 0) ms_prec = ms;
    dt = (ms - ms_prec) / 1000.0f;
    if (dt > 0.1f) dt = 0.1f;
    if (dt < 0.001f) dt = 0.001f;
    ms_prec = ms;
    t += dt;
    ips = ips * 0.95f + (1.0f / dt) * 0.05f;

    if (mode_auto && !tc_appui && t - page_t0 > DUREE_AUTO) changer_page(page + 1);

    fond();
    switch (page) {
    case P_PRIM:    page_primitives(); break;
    case P_ALPHA:   page_alpha(); break;
    case P_EASING:  page_easing(); break;
    case P_ARCS:    page_arcs(); break;
    case P_TEXTE:   page_texte(); break;
    case P_COURBES: page_courbes(); break;
    case P_PART:    page_particules(); break;
    case P_TACTILE: page_tactile(); break;
    case P_DECOUPE: page_decoupe(); break;
    }
    // fondu d'entree a chaque changement de page
    float f = (t - page_t0) / 0.3f;
    if (f < 1) rect(0, 26, L, 182, FOND_HAUT, (uint8_t)(230 * (1 - sortie(f))));
    barre_haut();
    barre_bas();
    dessiner_toast();
}

}  // namespace scene
