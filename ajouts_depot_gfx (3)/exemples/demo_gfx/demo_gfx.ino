// =====================================================================
// demo_gfx.ino - vitrine du moteur graphique gfx sur la carte ES3C28P
// (ESP32-S3, ecran 2,8" ILI9341 320x240, tactile FT6336).
//
// 9 pages animees : primitives, transparence, easing, jauges, texte,
// courbes, particules, tactile, decoupe. Voir docs/TUTO_GRAPHISME.md.
//
// Ce croquis ne fait que le "materiel" :
//   - TFT_eSPI envoie les images a l'ecran (pushImage) ;
//   - deux tampons d'image en PSRAM : l'un part vers l'ecran (coeur 0)
//     pendant que loop() dessine l'autre (coeur 1) ;
//   - le pilote ft6336_touch lit le doigt (etalonnage 3 points en NVS,
//     partage avec la console "lumiere" et la console NES).
// Tout le dessin est dans scene.cpp, qui tourne aussi sur PC (sim_demo.cpp).
//
// Reglages Arduino IDE : paquet esp32 3.x, "ESP32S3 Dev Module",
// PSRAM "OPI PSRAM", Flash 16 Mo. TFT_eSPI configuree pour l'ILI9341
// de la carte (meme User_Setup.h que lumiere_console), SPI_FREQUENCY >= 40 MHz.
// =====================================================================
#include <Arduino.h>
#include <TFT_eSPI.h>
#include "esp_heap_caps.h"
#include "driver/i2c_master.h"
#include "ft6336_touch.h"
#include "gfx.h"
#include "scene.h"

#define LCD_BL_PIN  45
#define I2C_SDA     16
#define I2C_SCL     15
#define TOUCH_RST   18

TFT_eSPI tft = TFT_eSPI();

// ------------------------------------------------------------- Ecran
static uint16_t *s_tampon[2] = { nullptr, nullptr };
static uint16_t *s_fond = nullptr;
static bool s_double = false;
static int s_courant = 0;
static volatile int s_a_envoyer = 0;
static SemaphoreHandle_t s_sem_pret, s_sem_libre;

static void envoyer(const uint16_t *img) { tft.pushImage(0, 0, 320, 240, (uint16_t *)img); }

static void tache_ecran(void *)
{
    for (;;) {
        xSemaphoreTake(s_sem_pret, portMAX_DELAY);  // une image est prete
        envoyer(s_tampon[s_a_envoyer]);
        xSemaphoreGive(s_sem_libre);                // le tampon peut resservir
        vTaskDelay(1);
    }
}

static bool init_tampons()
{
    const size_t taille = 320 * 240 * sizeof(uint16_t);  // 150 Ko par image
    s_tampon[0] = (uint16_t *)heap_caps_malloc(taille, MALLOC_CAP_SPIRAM);
    s_tampon[1] = (uint16_t *)heap_caps_malloc(taille, MALLOC_CAP_SPIRAM);
    s_fond      = (uint16_t *)heap_caps_malloc(taille, MALLOC_CAP_SPIRAM);
    if (s_tampon[0] && s_tampon[1]) { s_double = true; return true; }
    // sans PSRAM : un seul tampon en memoire interne, pas de fond pre-calcule
    Serial.println("[GFX] PSRAM absente : un seul tampon");
    heap_caps_free(s_tampon[0]); heap_caps_free(s_tampon[1]); heap_caps_free(s_fond);
    s_tampon[1] = s_fond = nullptr;
    s_tampon[0] = (uint16_t *)heap_caps_malloc(taille, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    return s_tampon[0] != nullptr;
}

// ------------------------------------------------------------- Tactile
static bool s_tactile_ok = false;

static bool init_tactile()
{
    i2c_master_bus_handle_t bus = NULL;
    i2c_master_bus_config_t cfg = {};
    cfg.i2c_port = I2C_NUM_0;
    cfg.sda_io_num = (gpio_num_t)I2C_SDA;
    cfg.scl_io_num = (gpio_num_t)I2C_SCL;
    cfg.clk_source = I2C_CLK_SRC_DEFAULT;
    cfg.glitch_ignore_cnt = 7;
    cfg.flags.enable_internal_pullup = true;
    if (i2c_new_master_bus(&cfg, &bus) != ESP_OK) return false;
    return ft6336_touch_init(bus, (gpio_num_t)TOUCH_RST, 320, 240);
}

// Attend un appui complet et renvoie la mediane des positions brutes
static bool lire_appui_brut(int *rx, int *ry)
{
    static int xs[64], ys[64];
    while (ft6336_touch_get_raw(rx, ry)) delay(10);
    uint32_t t0 = millis();
    while (!ft6336_touch_get_raw(rx, ry)) {
        if (millis() - t0 > 30000) return false;
        delay(10);
    }
    int n = 0;
    while (ft6336_touch_get_raw(&xs[n % 64], &ys[n % 64])) { n++; delay(10); }
    if (n > 64) n = 64;
    if (n < 3) return false;
    auto cmp = [](const void *a, const void *b) { return *(const int *)a - *(const int *)b; };
    qsort(xs, n, sizeof(int), cmp);
    qsort(ys, n, sizeof(int), cmp);
    *rx = xs[n / 2];
    *ry = ys[n / 2];
    return true;
}

// Etalonnage 3 points, dessine avec gfx (seulement s'il n'existe pas deja en NVS)
static void etalonner()
{
    const int px[3] = { 30, 290, 160 }, py[3] = { 30, 120, 210 };
    int rx[3], ry[3];
    const uint16_t JAUNE = gfx::rgb(255, 212, 64);
    for (;;) {
        bool ok = true;
        for (int i = 0; i < 3 && ok; i++) {
            gfx::fb = s_tampon[0];
            gfx::degrade_v(0, 0, 320, 240, gfx::rgb(4, 6, 18), gfx::rgb(16, 12, 42));
            gfx::texte(160, 96, "Étalonnage de l'écran", POLICE_16, gfx::rgb(236, 242, 255), 255, gfx::CENTRE);
            gfx::texte(160, 120, "Touche le centre de la croix", POLICE_13, gfx::rgb(156, 168, 210), 255, gfx::CENTRE);
            gfx::halo(px[i], py[i], 18, JAUNE, 160);
            gfx::trait(px[i] - 12, py[i], px[i] + 12, py[i], 2, JAUNE);
            gfx::trait(px[i], py[i] - 12, px[i], py[i] + 12, 2, JAUNE);
            envoyer(s_tampon[0]);
            ok = lire_appui_brut(&rx[i], &ry[i]);
        }
        if (ok && ft6336_touch_set_calibration(rx[0], ry[0], px[0], py[0], rx[1], ry[1], px[1], py[1],
                                               rx[2], ry[2], px[2], py[2])) {
            ft6336_touch_save_calibration();
            return;
        }
    }
}

// ------------------------------------------------------------- Programme
void setup()
{
    Serial.begin(115200);
    delay(200);
    Serial.println("\n[GFX] Vitrine du moteur graphique");

    ledcAttachChannel(LCD_BL_PIN, 2000, 8, 0);      // retroeclairage en PWM
    ledcWrite(LCD_BL_PIN, 204);                     // 80 %
    tft.init();
    tft.setRotation(1);                             // paysage 320x240
    tft.setSwapBytes(true);                         // RGB565 "normal" -> ordre de l'ecran
    tft.fillScreen(TFT_BLACK);

    if (!init_tampons()) {
        tft.drawString("Memoire insuffisante", 10, 10, 2);
        for (;;) delay(1000);
    }
    gfx::init(s_tampon[0]);

    s_tactile_ok = init_tactile();
    if (!s_tactile_ok) Serial.println("[GFX] Tactile introuvable (la vitrine tourne en mode AUTO)");
    else if (!ft6336_touch_load_calibration()) etalonner();

    scene::init(s_fond);

    if (s_double) {
        s_sem_pret = xSemaphoreCreateBinary();
        s_sem_libre = xSemaphoreCreateBinary();
        xSemaphoreGive(s_sem_libre);
        xTaskCreatePinnedToCore(tache_ecran, "ecran", 4096, NULL, 2, NULL, 0);
    }
}

void loop()
{
    int x = 0, y = 0;
    bool appui = s_tactile_ok && ft6336_touch_read(&x, &y);
    scene::toucher(appui, x, y);

    gfx::fb = s_tampon[s_courant];                  // on dessine dans ce tampon
    scene::image(millis());

    if (s_double) {
        xSemaphoreTake(s_sem_libre, portMAX_DELAY); // attendre que l'image precedente soit partie
        s_a_envoyer = s_courant;
        xSemaphoreGive(s_sem_pret);
        s_courant ^= 1;                             // et dessiner dans l'autre
    } else {
        envoyer(s_tampon[0]);
    }
}
