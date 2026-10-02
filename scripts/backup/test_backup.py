import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from crypto import encrypt, decrypt
from decrypt import unpack

PASSWORD='senha-ficticia-de-teste-com-mais-de-24-caracteres'
class BackupTests(unittest.TestCase):
    def test_roundtrip(self):
        content=b'dados ficticios de eventos e pagamentos'
        encrypted=encrypt(content,PASSWORD)
        self.assertNotIn(content,encrypted)
        self.assertEqual(decrypt(encrypted,PASSWORD),content)
        self.assertNotEqual(encrypt(content,PASSWORD),encrypted)
    def test_wrong_password_and_tampering(self):
        value=encrypt(b'dados',PASSWORD)
        for bad, password in [(value,PASSWORD+'outra'),(value[:-1]+bytes([value[-1]^1]),PASSWORD),(value[:-10],PASSWORD)]:
            with self.assertRaises(Exception):decrypt(bad,password)
    def test_short_password(self):
        with self.assertRaises(ValueError):encrypt(b'dados','curta')
    def test_archive_integrity_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp); buf=io.BytesIO(); content=b'SELECT 1;'
            with ZipFile(buf,'w') as z:
                z.writestr('schema.sql',content)
                z.writestr('manifest.json',json.dumps({'sha256':{'schema.sql':hashlib.sha256(content).hexdigest()}}))
            source=folder/'test.exxbackup';target=folder/'test.zip'
            source.write_bytes(encrypt(buf.getvalue(),PASSWORD));unpack(source,target,PASSWORD)
            self.assertEqual(target.read_bytes(),buf.getvalue())
            with self.assertRaises(ValueError):unpack(source,target,PASSWORD)
            self.assertEqual(target.read_bytes(),buf.getvalue())
    def test_invalid_manifest_writes_nothing(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp);buf=io.BytesIO()
            with ZipFile(buf,'w') as z:
                z.writestr('schema.sql','SELECT 1;')
                z.writestr('manifest.json',json.dumps({'sha256':{'schema.sql':'invalid'}}))
            source=folder/'test.exxbackup';target=folder/'test.zip'
            source.write_bytes(encrypt(buf.getvalue(),PASSWORD))
            with self.assertRaises(ValueError):unpack(source,target,PASSWORD)
            self.assertFalse(target.exists())
if __name__=='__main__':unittest.main()
