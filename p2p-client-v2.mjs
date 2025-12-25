#!/usr/bin/env node
// P2P Bridge v2 Client - Pure WebSocket via Nostr relays
// No WebRTC = works through any firewall/NAT

import WebSocket from 'ws';
import readline from 'readline';
import crypto from 'crypto';

const RELAYS = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band',
    'wss://nostr.wine'
];

const roomCode = process.argv[2];
if (!roomCode) {
    console.log('Usage: node p2p-client-v2.mjs <ROOM_CODE>');
    console.log('Example: node p2p-client-v2.mjs ABC123');
    process.exit(1);
}

console.log(`\n🌐 P2P Bridge v2 - WebSocket Relay`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Room: ${roomCode}`);
console.log(`Mode: Pure WebSocket (no WebRTC)\n`);

const myId = crypto.randomBytes(16).toString('hex');
const peers = new Set();
const sockets = new Map();
const subId = 'sub-' + crypto.randomBytes(4).toString('hex');

function connectRelay(url) {
    try {
        const ws = new WebSocket(url);

        ws.on('open', () => {
            sockets.set(url, ws);
            console.log(`✅ Connected: ${url}`);

            // Subscribe to room messages
            const filter = {
                kinds: [30078],
                '#d': [`p2p-bridge-${roomCode}`],
                since: Math.floor(Date.now() / 1000) - 60
            };
            ws.send(JSON.stringify(['REQ', subId, filter]));

            // Announce presence
            broadcast({ type: 'join', peerId: myId });
        });

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg[0] === 'EVENT' && msg[2]?.kind === 30078) {
                    handleEvent(msg[2]);
                }
            } catch (err) {}
        });

        ws.on('close', () => {
            sockets.delete(url);
            console.log(`❌ Disconnected: ${url}`);
            // Reconnect after 5s
            setTimeout(() => connectRelay(url), 5000);
        });

        ws.on('error', (err) => {
            console.log(`⚠️  Error on ${url}: ${err.message}`);
        });

    } catch (err) {
        console.log(`⚠️  Failed to connect: ${url}`);
        setTimeout(() => connectRelay(url), 5000);
    }
}

function handleEvent(event) {
    try {
        const content = JSON.parse(event.content);

        // Ignore our own messages
        if (content.peerId === myId) return;

        const shortId = content.peerId.substring(0, 8);

        if (content.type === 'join') {
            if (!peers.has(content.peerId)) {
                peers.add(content.peerId);
                console.log(`\n👋 Peer ${shortId} joined (${peers.size} total)`);

                // Respond with presence
                broadcast({ type: 'here', peerId: myId });
            }
        } else if (content.type === 'here') {
            if (!peers.has(content.peerId)) {
                peers.add(content.peerId);
                console.log(`\n👋 Peer ${shortId} is here (${peers.size} total)`);
            }
        } else if (content.type === 'leave') {
            peers.delete(content.peerId);
            console.log(`\n👋 Peer ${shortId} left (${peers.size} remaining)`);
        } else if (content.type === 'msg') {
            console.log(`\n📨 [${shortId}]: ${content.text}`);
        }
    } catch (err) {}
}

function broadcast(content) {
    const event = {
        kind: 30078,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['d', `p2p-bridge-${roomCode}`]],
        content: JSON.stringify(content),
        pubkey: myId,
        id: crypto.randomBytes(32).toString('hex'),
        sig: crypto.randomBytes(64).toString('hex')
    };

    const msg = JSON.stringify(['EVENT', event]);
    sockets.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(msg);
        }
    });
}

function sendMessage(text) {
    broadcast({ type: 'msg', text, peerId: myId });
    console.log(`📤 Sent: ${text}`);
}

// Connect to all relays
console.log('📡 Connecting to Nostr relays...\n');
RELAYS.forEach(connectRelay);

// Setup readline for input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log(`\n💬 Type a message and press Enter to send`);
console.log(`   Commands: /peers, /status, /quit\n`);

rl.on('line', (input) => {
    const text = input.trim();
    if (!text) return;

    if (text === '/peers') {
        console.log(`Connected peers: ${peers.size}`);
        peers.forEach(p => console.log(`  - ${p.substring(0,8)}`));
    } else if (text === '/status') {
        console.log(`Relays: ${sockets.size}/${RELAYS.length} connected`);
        console.log(`Peers: ${peers.size}`);
        console.log(`Room: ${roomCode}`);
    } else if (text === '/quit') {
        broadcast({ type: 'leave', peerId: myId });
        console.log('Goodbye! 👋');
        process.exit(0);
    } else {
        sendMessage(text);
    }
});

// Handle exit
process.on('SIGINT', () => {
    broadcast({ type: 'leave', peerId: myId });
    process.exit(0);
});

console.log('⏳ Waiting for peers...\n');
