"""Print a QR code with Ollie's network URL for mobile access."""
import socket
import sys

# Ensure UTF-8 output encoding on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def get_local_ip():
    """Get the primary local network IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def main():
    ip = get_local_ip()
    url = f"https://{ip}:8000"

    print()
    print("  ============================================================")
    print()
    print("   🏠  Ollie is starting at:")
    print()
    print(f"      Local:   https://localhost:8000")
    print(f"      Network: {url}")
    print()
    print("   📱 Open this URL on your phone/tablet browser.")
    print("      (Accept the self-signed certificate warning)")
    print()
    print("  ============================================================")
    print()

    try:
        import qrcode
        qr = qrcode.QRCode(border=1)
        qr.add_data(url)
        qr.make(fit=True)
        qr.print_ascii(invert=True)
    except Exception as e:
        print(f"  (QR code unavailable: {e})")

    print()


if __name__ == "__main__":
    main()
