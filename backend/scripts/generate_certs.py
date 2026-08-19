"""Generate self-signed SSL certificates for Ollie HTTPS."""
import datetime
import ipaddress
import subprocess
import sys
from pathlib import Path

cert_dir = Path(__file__).resolve().parent.parent.parent / "certs"
cert_dir.mkdir(exist_ok=True)

cert_path = cert_dir / "cert.pem"
key_path = cert_dir / "key.pem"

if cert_path.exists() and key_path.exists():
    print("  [OK] SSL certificates already exist.")
    sys.exit(0)

# Try OpenSSL first (cleaner, supports SAN IPs properly)
try:
    subprocess.run(
        [
            "openssl", "req", "-x509", "-newkey", "rsa:2048",
            "-keyout", str(key_path),
            "-out", str(cert_path),
            "-days", "365", "-nodes",
            "-subj", "/CN=ollie-home-assistant/O=Ollie/C=US",
            "-addext", "subjectAltName=IP:127.0.0.1,IP:0.0.0.0,DNS:localhost",
        ],
        check=True,
        capture_output=True,
    )
    print("  [OK] SSL certificates generated with OpenSSL.")
    sys.exit(0)
except (FileNotFoundError, subprocess.CalledProcessError):
    pass

# Fallback: Python cryptography library
try:
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, "ollie-home-assistant"),
    ])
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.now(datetime.timezone.utc))
        .not_valid_after(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=365))
        .add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("localhost"),
                x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
            ]),
            critical=False,
        )
        .sign(key, hashes.SHA256())
    )

    key_path.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.TraditionalOpenSSL,
            serialization.NoEncryption(),
        )
    )
    cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    print("  [OK] SSL certificates generated with cryptography library.")

except ImportError:
    print("  [ERROR] Neither OpenSSL nor the 'cryptography' package found.")
    print("     Install with: uv add cryptography")
    sys.exit(1)
