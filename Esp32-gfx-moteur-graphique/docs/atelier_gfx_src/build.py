# build.py - assemble docs/atelier_gfx.html (page autonome) a partir de template.html,
# gfx.js, scene.js, des polices de polices.cpp et des extraits C++ reels.
# Usage : python3 docs/atelier_gfx_src/build.py
import re, json, pathlib
ICI = pathlib.Path(__file__).resolve().parent
R = ICI.parents[1]
import subprocess, sys
subprocess.run([sys.executable, str(ICI / "extraire_polices.py"), str(R / "exemples/demo_gfx/polices.cpp"), str(ICI / "polices.js")], check=True)
scene = (R / "exemples/demo_gfx/scene.cpp").read_text()
ino = (R / "exemples/demo_gfx/demo_gfx.ino").read_text()
def fonction(src, debut):
    i = src.index(debut)
    j = src.index("\n}\n", i)
    # remonte les commentaires juste au-dessus
    k = src.rfind("\n\n", 0, i)
    bloc = src[k + 2 if k >= 0 and i - k < 400 and src[k+2:i].lstrip().startswith("//") else i: j + 2]
    return bloc.strip("\n")
SRC = {}
for n in ["page_primitives", "page_alpha", "page_easing", "page_arcs", "page_texte", "page_courbes", "page_particules", "page_tactile", "page_decoupe"]:
    SRC[n] = fonction(scene, "static void %s()" % n)
SRC["toucher"] = fonction(scene, "void toucher(bool appui")
SRC["image"] = fonction(scene, "void image(uint32_t ms)")
SRC["tache_ecran"] = fonction(ino, "static void tache_ecran")
SRC["loop"] = fonction(ino, "void loop()")
gfxh = (R / "exemples/demo_gfx/gfx.h").read_text()
SRC["gfx_h"] = gfxh.strip()
t = (ICI / "template.html").read_text()
js = (ICI / "polices.js").read_text() + (ICI / "gfx.js").read_text() + (ICI / "scene.js").read_text()
js = js.replace('if (typeof module !== "undefined") module.exports = { Gfx, chargerPolices };', "").replace('if (typeof module !== "undefined") module.exports = { creerScene };', "")
t = t.replace("/*__MOTEUR__*/", js).replace("/*__SRC__*/", "const SRC=" + json.dumps(SRC, ensure_ascii=False) + ";")
(ICI.parent / "atelier_gfx.html").write_text(t)
print(len(t) // 1024, "Ko")
