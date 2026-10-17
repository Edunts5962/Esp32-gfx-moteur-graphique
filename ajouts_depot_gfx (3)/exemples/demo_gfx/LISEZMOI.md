# demo_gfx : vitrine du moteur graphique

Un projet minimal pour la carte **ES3C28P** (ESP32-S3, écran 2,8" ILI9341 tactile FT6336) qui montre, en 9 pages animées, tout ce que l'on peut faire avec le moteur de dessin `gfx` de la console « Lumière », développé par Claude, l'IA d'Anthropic. Explications détaillées : [docs/TUTO_GRAPHISME.md](../../docs/TUTO_GRAPHISME.md).

![Vitrine](images/vitrine.gif)

| Page | Contenu |
|---|---|
| 1 Primitives | rect, dégradés, rect_arrondi, disque, anneau, triangle, trait, pointillés, arc, halo, pixel, texte |
| 2 Transparence | mélange alpha, lumière additive, rampe d'opacité |
| 3 Mouvement | linéaire, sortie(), lisse(), rebond(), ressort, approche() |
| 4 Arcs et jauges | chargement, anneau de progression, cadran à aiguille, barres |
| 5 Texte | les 6 polices, accents et symboles, machine à écrire, compteur |
| 6 Courbes | oscilloscope (signal + écho), histogramme, droite de régression |
| 7 Particules | fontaine, comète, explosion au toucher |
| 8 Tactile | curseur à inertie, bouton, interrupteur, ondes |
| 9 Découpe | bandeau défilant, barre de progression, révélation, voile |

Navigation : ‹ › en bas, balayage horizontal, ou toucher le milieu de la barre du bas pour basculer le mode **AUTO** (page suivante toutes les 8 s).

## Fichiers

| Fichier | Rôle |
|---|---|
| `demo_gfx.ino` | matériel : TFT_eSPI, double tampon PSRAM sur deux cœurs, tactile |
| `scene.cpp/.h` | **toutes les pages** (ne dépend que de gfx : compile aussi sur PC) |
| `sim_demo.cpp` | simulateur PC : rejoue un scénario et enregistre les images |
| `ppm_vers_png.py` | convertit les captures en PNG et l'animation en GIF |
| `gfx.*`, `polices.*`, `ft6336_touch.*` | copies identiques de `firmware/lumiere_console` |

## Sur la carte

Réglages de l'IDE Arduino (comme la console) : paquet **esp32 3.x**, carte **ESP32S3 Dev Module**, PSRAM **OPI PSRAM**, Flash 16 Mo. Bibliothèque **TFT_eSPI** configurée pour l'ILI9341 de l'ES3C28P (même `User_Setup.h` que la console, `SPI_FREQUENCY` ≥ 40 MHz).

Ouvrir `demo_gfx.ino`, téléverser. Au tout premier démarrage (si la console Lumière ou NES n'a jamais été installée), toucher les 3 croix d'étalonnage. Le nombre d'images/s s'affiche en haut à droite.

## Sur PC

```bash
cd exemples/demo_gfx
g++ -std=c++17 -O2 -I. sim_demo.cpp scene.cpp gfx.cpp polices.cpp -o sim_demo
mkdir -p sortie && ./sim_demo sortie
python3 ppm_vers_png.py sortie        # nécessite Pillow (pip install pillow)
```

## Partir de cette vitrine pour un nouveau projet

Copier le dossier, renommer le `.ino` comme le dossier, garder `gfx.*`, `polices.*`, `ft6336_touch.*` et le `.ino`, puis remplacer les pages de `scene.cpp` par vos propres écrans. Voir la section 15 du tutoriel.
