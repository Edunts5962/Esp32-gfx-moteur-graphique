import re, json, base64, sys
src = open(sys.argv[1], encoding="utf-8").read()
out = {}
for m in re.finditer(r"const PoliceAA (POLICE_\d+) = \{ (police_\d+)_bits, \w+, (\d+), (-?\d+), (-?\d+), (\d+) \};", src):
    nom, base, nb, asc, desc, il = m.groups()
    bits = re.search(r"static const uint8_t %s_bits\[\d+\] = \{(.*?)\};" % base, src, re.S).group(1)
    octets = bytes(int(x, 16) for x in re.findall(r"0x[0-9A-Fa-f]{2}", bits))
    gl = re.search(r"static const GlypheAA %s_glyphes\[\d+\] = \{(.*?)\n\};" % base, src, re.S).group(1)
    glyphes = [list(map(int, g)) for g in re.findall(r"\{(-?\d+),(-?\d+),(-?\d+),(-?\d+),(-?\d+),(-?\d+),(-?\d+)\}", gl)]
    assert len(glyphes) == int(nb), (nom, len(glyphes))
    out[nom] = {"b": base64.b64encode(octets).decode(), "g": glyphes, "a": int(asc), "d": int(desc), "i": int(il)}
open(sys.argv[2], "w").write("const POLICES_DATA=" + json.dumps(out, separators=(",", ":")) + ";\n")
print({k: len(v["g"]) for k, v in out.items()})
