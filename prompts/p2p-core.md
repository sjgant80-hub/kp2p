# P2P Core Build Prompt

## Goal
Build serverless P2P communication for browser environments (GitHub Pages compatible).

## Components

### Transport Layer
```
WebRTC DataChannel
├─ Signaling: URL-encoded SDP (no server)
├─ ICE: STUN only (Google public)
├─ Encryption: DTLS (built-in)
└─ Fallback: WebTorrent trackers, GitHub Issues
```

### Connection Methods
```
1. Link-based (p2p-link.html)
   - Encode SDP offer in URL hash
   - Manual copy/paste exchange
   - No auth required

2. QR-based (p2p-qr.html)
   - QR code contains SDP
   - BarcodeDetector API for scanning
   - Good for cross-device

3. Tracker-based (p2p-global.html)
   - WebTorrent tracker protocol
   - Room = infohash
   - Pre-generate offers

4. GitHub Issues (p2p-github.html)
   - Issues as signaling channel
   - Requires token for write
   - Public repo = public discovery
```

### Build Commands
```bash
# Test locally
python -m http.server 8000

# Validate pages
curl -sL -o /dev/null -w "%{http_code}" http://localhost:8000/test/p2p-link.html
```

## Security Model
```
ENCRYPTED: All WebRTC traffic (DTLS)
EXPOSED: IP addresses in SDP
NO AUTH: Anyone with link can connect
EPHEMERAL: Keys regenerated each session
```

## Files
```
test/
├─ p2p-link.html    # Manual link exchange
├─ p2p-qr.html      # QR code exchange
├─ p2p-global.html  # WebTorrent tracker
├─ p2p-github.html  # GitHub Issues signaling
└─ chat.html        # BroadcastChannel (local only)
```
