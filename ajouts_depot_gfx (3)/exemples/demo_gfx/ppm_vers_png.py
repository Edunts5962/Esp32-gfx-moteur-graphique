#!/usr/bin/env python3
"""Convertit les captures .ppm du simulateur en .png et assemble anim_*.ppm en GIF.
Usage : python3 ppm_vers_png.py <dossier>        (necessite Pillow)"""
import glob, os, sys
from PIL import Image

d = sys.argv[1] if len(sys.argv) > 1 else "."
for f in sorted(glob.glob(os.path.join(d, "*.ppm"))):
    if not os.path.basename(f).startswith("anim_"):
        Image.open(f).save(f[:-4] + ".png")
        os.remove(f)
fichiers = sorted(glob.glob(os.path.join(d, "anim_*.ppm")))
images = [Image.open(f).convert("RGB") for f in fichiers]
if images:
    images[0].save(os.path.join(d, "vitrine.gif"), save_all=True, append_images=images[1:],
                   duration=66, loop=0, optimize=True)
    for f in fichiers:
        os.remove(f)
print("ok")
