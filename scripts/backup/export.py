"""Supabase CLI logical backup; only encrypted files leave the temporary folder."""
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from urllib.parse import urlsplit
from zipfile import ZipFile, ZIP_DEFLATED
from crypto import encrypt, decrypt

ROOT = Path(__file__).resolve().parents[2]
CLI_VERSION = '2.119.0'

def main():
    url = os.environ.get('SUPABASE_DB_URL', '')
    password = os.environ.get('BACKUP_PASSWORD', '')
    parsed = urlsplit(url)
    if parsed.scheme not in ('postgres', 'postgresql') or not parsed.password:
        raise ValueError('Cadastre SUPABASE_DB_URL com a conexão Session pooler completa.')
    if parsed.port != 5432 or not parsed.hostname.endswith('.supabase.com'):
        raise ValueError('Use Session pooler do Supabase na porta 5432.')
    if len(password) < 24:
        raise ValueError('Cadastre BACKUP_PASSWORD com pelo menos 24 caracteres.')
    output = ROOT / 'private' / 'backups'
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='exx-backup-') as temp:
        folder = Path(temp)
        commands = [
            ('roles.sql', ['--role-only']),
            ('schema.sql', []),
            ('data.sql', ['--data-only', '--use-copy', '-x', 'storage.buckets_vectors', '-x', 'storage.vector_indexes']),
        ]
        env = dict(os.environ, PGSSLMODE='require', PGCONNECT_TIMEOUT='30')
        for name, args in commands:
            command = ['npx', '--yes', f'supabase@{CLI_VERSION}', 'db', 'dump',
                       '--db-url', url, '-f', str(folder / name), *args]
            result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                    env=env, timeout=900)
            # CLI error output may contain credentials: do not forward it to public logs.
            if result.returncode or not (folder / name).is_file() or not (folder / name).stat().st_size:
                raise RuntimeError(f'Falha ao exportar {name}. Confira conexão, senha e disponibilidade do banco.')
        data = (folder / 'data.sql').read_text(encoding='utf-8')
        for schema, table in [('public', 'saloes'), ('public', 'eventos'), ('auth', 'users')]:
            if not re.search(r'COPY\s+"?' + schema + r'"?\."?' + table + r'"?\s*\(', data):
                raise RuntimeError('Exportação incompleta: uma tabela obrigatória não foi encontrada.')
        files = {name: (folder / name).read_bytes() for name, _ in commands}
        # Supabase excludes custom triggers on managed schemas. Preserve our auth hook separately.
        files['auth-trigger.sql'] = (ROOT / 'scripts/backup/auth-trigger.sql').read_bytes()
        for source in (ROOT / 'supabase').rglob('*'):
            if source.is_file() and source.suffix in ('.sql', '.html', '.json', '.md'):
                files['project/' + str(source.relative_to(ROOT)).replace('\\', '/')] = source.read_bytes()
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        manifest = {'created_utc': stamp, 'commit': os.environ.get('GITHUB_SHA', 'local'),
                    'cli_version': CLI_VERSION,
                    'sha256': {name: hashlib.sha256(value).hexdigest() for name, value in files.items()},
                    'excludes': ['SMTP credentials and Auth dashboard configuration', 'Storage object files',
                                 'encryption root keys / external secrets']}
        buf = io.BytesIO()
        with ZipFile(buf, 'w', ZIP_DEFLATED) as archive:
            for name, value in files.items():
                archive.writestr(name, value)
            archive.writestr('manifest.json', json.dumps(manifest, indent=2))
        encrypted = encrypt(buf.getvalue(), password)
        if decrypt(encrypted, password) != buf.getvalue():
            raise RuntimeError('Falha na conferência da criptografia.')
        target = output / f'exxeventos-{stamp}.exxbackup'
        target.write_bytes(encrypted)
        target.with_suffix('.sha256').write_text(hashlib.sha256(encrypted).hexdigest() + '  ' + target.name + '\n')
        print('Backup exportado, criptografado e conferido. Restauração em outro banco ainda precisa ser validada.')

if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('Backup NÃO concluído. Verifique os secrets, a conexão Session pooler e a disponibilidade do Supabase.', file=sys.stderr)
        sys.exit(1)
