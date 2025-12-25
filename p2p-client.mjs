#!/usr/bin/env node
// P2P Bridge Client - Connects to browser peers via Trystero

import { joinRoom } from 'trystero';
import readline from 'readline';

const APP_ID = 'konomi-p2p-bridge-v1';

// Get room code from command line
const roomCode = process.argv[2];

if (!roomCode) {
    console.log('Usage: node p2p-client.mjs <ROOM_CODE>');
    console.log('Example: node p2p-client.mjs ABC123');
    process.exit(1);
}

console.log(`\n🌉 P2P Bridge Client`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Connecting to room: ${roomCode}`);
console.log(`App ID: ${APP_ID}\n`);

// Join room
const room = joinRoom({ appId: APP_ID }, roomCode);

// Setup communication channels
const [sendMessage, getMessage] = room.makeAction('message');
const [sendAuth, getAuth] = room.makeAction('auth');
const [sendLink, getLink] = room.makeAction('link');

// Track peers
const peers = new Map();

// Handle peer events
room.onPeerJoin(peerId => {
    const shortId = peerId.substring(0, 8);
    peers.set(peerId, shortId);
    console.log(`✅ Peer connected: ${shortId}`);
    console.log(`   Total peers: ${peers.size}`);

    // Send hello
    sendMessage({ text: `Hello from Claude's Node.js client! 🤖`, data: { type: 'hello', timestamp: Date.now() } });
});

room.onPeerLeave(peerId => {
    const shortId = peers.get(peerId) || peerId.substring(0, 8);
    peers.delete(peerId);
    console.log(`❌ Peer disconnected: ${shortId}`);
});

// Handle incoming messages
getMessage((data, peerId) => {
    const from = peers.get(peerId) || 'Unknown';
    console.log(`\n📨 Message from ${from}:`);
    console.log(`   ${data.text}`);
    if (data.data) {
        console.log(`   Data:`, JSON.stringify(data.data, null, 2));
    }
});

getAuth((data, peerId) => {
    const from = peers.get(peerId) || 'Unknown';
    console.log(`\n🔐 Auth from ${from}:`, JSON.stringify(data, null, 2));
});

getLink((data, peerId) => {
    const from = peers.get(peerId) || 'Unknown';
    console.log(`\n🔗 Link from ${from}: ${data.url}`);
});

// Setup readline for sending messages
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log(`\n💬 Type a message and press Enter to send`);
console.log(`   Commands: /peers, /auth, /link <url>, /quit\n`);

rl.on('line', (input) => {
    const text = input.trim();
    if (!text) return;

    if (text === '/peers') {
        console.log(`Connected peers: ${peers.size}`);
        peers.forEach((short, full) => console.log(`  - ${short} (${full})`));
    } else if (text === '/auth') {
        const authData = {
            type: 'request',
            timestamp: Date.now(),
            nonce: Math.random().toString(36).substring(2),
            from: 'claude-node-client'
        };
        sendAuth(authData);
        console.log(`🔐 Sent auth request`);
    } else if (text.startsWith('/link ')) {
        const url = text.substring(6);
        sendLink({ url, title: 'Shared from Claude', sharedAt: Date.now() });
        console.log(`🔗 Sent link: ${url}`);
    } else if (text === '/quit') {
        console.log('Goodbye! 👋');
        process.exit(0);
    } else {
        sendMessage({ text, data: { from: 'claude-node', timestamp: Date.now() } });
        console.log(`📤 Sent: ${text}`);
    }
});

// Keep alive
console.log(`⏳ Waiting for peers...`);
