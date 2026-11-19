"""Build index.html (one self-contained file) from the sources in this folder.

Usage:  python src/build.py
Reads shell.html, core.js, missions.js, render.js and ui.js and writes ../index.html.
"""
import os

d = os.path.dirname(os.path.abspath(__file__))
read = lambda name: open(os.path.join(d, name), encoding="utf-8", newline="").read()

shell = read("shell.html")
core = read("core.js")
app = "\n".join(read(f) for f in ["missions.js", "render.js", "ui.js"])
assert "</script" not in core + app, "sources must not contain the text </script"

out = shell.replace("/*__CORE__*/", core).replace("/*__APP__*/", app)
with open(os.path.join(d, "..", "index.html"), "w", encoding="utf-8", newline="") as f:
    f.write(out)
print("built index.html:", len(out.encode("utf-8")), "bytes,", out.count("\n") + 1, "lines")
