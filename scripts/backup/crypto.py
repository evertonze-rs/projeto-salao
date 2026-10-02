"""Authenticated encryption for backups. Never print passwords or plaintext."""
import os
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

MAGIC = b'EXXBACKUP1'

def key(password, salt):
    if len(password) < 24:
        raise ValueError('Use uma senha de backup com pelo menos 24 caracteres.')
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt,
                     iterations=600000).derive(password.encode('utf-8'))

def encrypt(data, password):
    salt, nonce = os.urandom(16), os.urandom(12)
    header = MAGIC + salt + nonce
    return header + AESGCM(key(password, salt)).encrypt(nonce, data, header)

def decrypt(data, password):
    if not data.startswith(MAGIC) or len(data) < len(MAGIC) + 44:
        raise ValueError('Arquivo de backup inválido.')
    n = len(MAGIC)
    salt, nonce, header = data[n:n+16], data[n+16:n+28], data[:n+28]
    return AESGCM(key(password, salt)).decrypt(nonce, data[n+28:], header)
