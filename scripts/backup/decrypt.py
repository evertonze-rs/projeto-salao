"""Decrypt locally. No network, SQL execution, extraction or overwriting."""
import getpass
import hashlib
import io
import json
from pathlib import Path
import sys
from zipfile import ZipFile
from crypto import decrypt

def unpack(source, target, password):
    source, target = Path(source), Path(target)
    if target.exists():
        raise ValueError('O arquivo de destino já existe.')
    plain = decrypt(source.read_bytes(), password)
    with ZipFile(io.BytesIO(plain)) as archive:
        manifest = json.loads(archive.read('manifest.json'))
        for name, expected in manifest['sha256'].items():
            if hashlib.sha256(archive.read(name)).hexdigest() != expected:
                raise ValueError('Falha na integridade do conteúdo.')
    with target.open('xb') as handle:
        handle.write(plain)

if __name__ == '__main__':
    try:
        if len(sys.argv) != 3:
            raise ValueError('Informe origem.exxbackup e destino.zip.')
        unpack(sys.argv[1], sys.argv[2], getpass.getpass('Senha do backup (não aparece na tela): '))
        print('ZIP local conferido. Nenhum dado foi restaurado no banco.')
    except Exception:
        print('Não foi possível abrir o backup. Confira senha, integridade e destino; nenhum banco foi alterado.', file=sys.stderr)
        sys.exit(1)
