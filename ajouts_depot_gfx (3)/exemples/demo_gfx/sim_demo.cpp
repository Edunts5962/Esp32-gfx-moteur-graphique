// sim_demo.cpp - simulateur PC de la vitrine gfx (meme scene.cpp que la carte).
// Rejoue un scenario tactile et enregistre une capture par page + les images
// d'une animation.
//
//   cd exemples/demo_gfx
//   g++ -std=c++17 -O2 -I. sim_demo.cpp scene.cpp gfx.cpp polices.cpp -o sim_demo
//   mkdir -p sortie && ./sim_demo sortie
//   python3 ppm_vers_png.py sortie          # captures PNG + animation GIF
#include "gfx.h"
#include "scene.h"
#include <cstdio>
#include <cstdint>

static uint16_t fb[320 * 240], fond[320 * 240];
static uint32_t g_ms = 0;
static const char *g_dossier = ".";
static bool g_anim = false;
static int g_num = 0, g_pas = 0;

static void ppm(const char *chemin)
{
    FILE *f = fopen(chemin, "wb");
    if (!f) return;
    fprintf(f, "P6\n320 240\n255\n");
    for (int i = 0; i < 320 * 240; i++) {
        uint16_t c = fb[i];                          // RGB565 -> RGB888
        uint8_t r = (c >> 11) << 3, g = ((c >> 5) & 63) << 2, b = (c & 31) << 3;
        r |= r >> 5; g |= g >> 6; b |= b >> 5;
        fputc(r, f); fputc(g, f); fputc(b, f);
    }
    fclose(f);
}

static void capture(const char *nom)
{
    char c[512];
    snprintf(c, sizeof c, "%s/%s.ppm", g_dossier, nom);
    ppm(c);
    printf("capture %s\n", nom);
}

// une image a 30 i/s avec l'etat du doigt
static void image(bool appui = false, int x = 0, int y = 0)
{
    g_ms += 33;
    scene::toucher(appui, x, y);
    scene::image(g_ms);
    if (g_anim && g_pas++ % 2 == 0) {               // animation a 15 i/s
        char c[512];
        snprintf(c, sizeof c, "%s/anim_%04d.ppm", g_dossier, g_num++);
        ppm(c);
    }
}

static void attendre(float s) { for (int i = 0; i < (int)(s * 30); i++) image(); }
static void taper(int x, int y) { image(true, x, y); image(true, x, y); image(false, x, y); }
static void glisser(int x0, int y0, int x1, int y1, int n)
{
    for (int i = 0; i <= n; i++) image(true, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n);
    image(false, x1, y1);
}

int main(int argc, char **argv)
{
    if (argc > 1) g_dossier = argv[1];
    gfx::init(fb);
    scene::init(fond);

    taper(160, 225);                 // mode manuel
    attendre(2.0f);
    static const char *NOMS[9] = { "p1_primitives", "p2_transparence", "p3_mouvement", "p4_arcs_jauges",
                                   "p5_texte", "p6_courbes", "p7_particules", "p8_tactile", "p9_decoupe" };
    for (int p = 0; p < 9; p++) {
        if (p == 0) g_anim = true;
        if (p == 6) {                                // particules : deux explosions
            attendre(0.6f);
            taper(90, 90);
            attendre(0.15f);
            taper(230, 120);
            attendre(0.35f);
        } else if (p == 7) {                         // tactile : curseur lance + bouton + interrupteur
            glisser(60, 64, 200, 64, 6);
            attendre(0.3f);
            image(true, 70, 130);
            image(true, 70, 130);
            capture("p8b_bouton_enfonce");
            image(false, 70, 130);
            taper(230, 134);
            taper(150, 190);
            attendre(0.3f);
        } else {
            attendre(1.6f);
        }
        capture(NOMS[p]);
        attendre(1.4f);
        if (p == 2) g_anim = false;
        if (p < 8) glisser(260, 120, 120, 120, 6);   // glissement vers la page suivante
    }
    return 0;
}
