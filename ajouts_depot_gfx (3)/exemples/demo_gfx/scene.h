// scene.h - exemple minimal d'ecran anime base sur gfx (tuto docs/TUTO_GRAPHISME.md)
//
// Meme decoupage que interface.h dans lumiere_console :
//   init()    une fois au demarrage
//   toucher() a chaque image, avec l'etat du doigt
//   image()   dessine une image complete dans gfx::fb
// Aucun #include Arduino : ce fichier compile aussi sur PC (sim_demo.cpp).
#pragma once
#include <stdint.h>

namespace scene {

void init(uint16_t *fond);                 // fond : tampon L*H pre-calcule, ou nullptr
void toucher(bool appui, int x, int y);    // coordonnees ecran 320x240
void image(uint32_t ms);                   // ms : horloge en millisecondes

}  // namespace scene
