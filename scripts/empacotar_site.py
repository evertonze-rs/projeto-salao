"""Empacota exclusivamente o build estático, sem dados locais ou credenciais."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
build = root / "dist"
assert (build / "index.html").is_file(), "Execute npm run build primeiro."
files = sorted(p for p in build.rglob("*") if p.is_file())
allowed = {".html", ".js", ".css", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".webp", ".woff", ".woff2"}
for p in files:
    assert p.resolve().is_relative_to(build.resolve()), f"Arquivo fora do build: {p.name}"
    assert p.suffix in allowed or p.name in {"_headers", "_redirects"}, f"Arquivo inesperado: {p.name}"
    assert p.stat().st_size < 25 * 1024 * 1024, f"Arquivo maior que 25 MiB: {p.name}"
out = root / "private" / "publicacao" / "gestao-eventos-site.zip"
out.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(out, "w", ZIP_DEFLATED) as archive:
    for p in files:
        archive.write(p, p.relative_to(build).as_posix())
print(f"Pacote pronto: {out} ({len(files)} arquivos)")
