#!/usr/bin/env node
/**
 * Browser Streaming Server
 * Streams a Puppeteer-controlled Chrome to the browser widget via WebSocket
 *
 * Usage:
 *   node browser-server.mjs
 *   # or
 *   npx puppeteer  # (if you need to install puppeteer)
 *   node browser-server.mjs
 *
 * Then open browser.html and connect to ws://localhost:3000
 */

import { WebSocketServer } from 'ws';
import puppeteer from 'puppeteer';

const PORT = process.env.PORT || 3000;
const FPS = parseInt(process.env.FPS) || 15;
const WIDTH = parseInt(process.env.WIDTH) || 1280;
const HEIGHT = parseInt(process.env.HEIGHT) || 720;

console.log(`
╔════════════════════════════════════════════╗
║     🌐 Browser Streaming Server            ║
╠════════════════════════════════════════════╣
║  WebSocket: ws://localhost:${PORT}            ║
║  Resolution: ${WIDTH}x${HEIGHT}                   ║
║  FPS: ${FPS}                                   ║
╚════════════════════════════════════════════╝
`);

let browser = null;
let page = null;
let streaming = false;
let clients = new Set();

async function launchBrowser() {
  console.log('🚀 Launching Chrome...');

  browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      `--window-size=${WIDTH},${HEIGHT}`,
    ],
    defaultViewport: { width: WIDTH, height: HEIGHT },
  });

  page = await browser.newPage();

  // Capture console logs
  page.on('console', msg => {
    broadcast({ type: 'console', level: msg.type(), message: msg.text() });
  });

  // Capture URL changes
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      broadcast({ type: 'url', url: page.url() });
    }
  });

  await page.goto('https://example.com');
  console.log('✅ Browser ready at https://example.com');
}

function broadcast(msg) {
  const data = JSON.stringify(msg);
  clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(data);
  });
}

async function startStreaming() {
  if (streaming) return;
  streaming = true;
  console.log('📡 Streaming started');

  const stream = async () => {
    if (!streaming || !page || clients.size === 0) {
      streaming = false;
      return;
    }

    try {
      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 60,
        encoding: 'binary',
      });

      clients.forEach(ws => {
        if (ws.readyState === 1) {
          ws.send(screenshot);
        }
      });
    } catch (e) {
      console.error('Screenshot error:', e.message);
    }

    setTimeout(stream, 1000 / FPS);
  };

  stream();
}

async function handleMessage(ws, msg) {
  try {
    const data = JSON.parse(msg);

    switch (data.type) {
      case 'init':
        console.log('🔌 Client initialized:', data.viewport);
        if (data.viewport) {
          await page.setViewport({
            width: data.viewport.width || WIDTH,
            height: data.viewport.height || HEIGHT,
          });
        }
        if (data.url) {
          await page.goto(data.url);
        }
        ws.send(JSON.stringify({ type: 'url', url: page.url() }));
        startStreaming();
        break;

      case 'navigate':
        console.log('🔗 Navigate to:', data.url);
        await page.goto(data.url, { waitUntil: 'domcontentloaded' });
        ws.send(JSON.stringify({ type: 'url', url: page.url() }));
        break;

      case 'nav':
        if (data.action === 'back') {
          await page.goBack();
        } else if (data.action === 'forward') {
          await page.goForward();
        } else if (data.action === 'refresh') {
          await page.reload();
        } else if (data.action === 'goto' && data.url) {
          await page.goto(data.url, { waitUntil: 'domcontentloaded' });
        }
        ws.send(JSON.stringify({ type: 'url', url: page.url() }));
        break;

      case 'mouse':
        if (data.action === 'move') {
          await page.mouse.move(data.x, data.y);
        } else if (data.action === 'down') {
          await page.mouse.down({ button: data.button === 2 ? 'right' : 'left' });
        } else if (data.action === 'up') {
          await page.mouse.up({ button: data.button === 2 ? 'right' : 'left' });
        } else if (data.action === 'click') {
          await page.mouse.click(data.x, data.y, {
            button: data.button === 2 ? 'right' : 'left'
          });
        } else if (data.action === 'dblclick') {
          await page.mouse.click(data.x, data.y, { clickCount: 2 });
        }
        break;

      case 'scroll':
        await page.mouse.wheel({ deltaX: data.deltaX || 0, deltaY: data.deltaY || 0 });
        break;

      case 'key':
      case 'keyboard':
        if (data.action === 'down') {
          await page.keyboard.down(data.key);
        } else if (data.action === 'up') {
          await page.keyboard.up(data.key);
        } else if (data.action === 'press') {
          await page.keyboard.press(data.key);
        }
        break;

      case 'type':
        await page.keyboard.type(data.text, { delay: data.delay || 50 });
        break;

      case 'screenshot':
        console.log('📷 Screenshot requested');
        const shot = await page.screenshot({
          type: 'png',
          encoding: 'base64',
          fullPage: data.fullPage || false,
        });
        ws.send(JSON.stringify({ type: 'screenshot', data: shot }));
        break;

      case 'eval':
        console.log('💉 Eval:', data.script?.slice(0, 50) + '...');
        try {
          const result = await page.evaluate(data.script);
          ws.send(JSON.stringify({ type: 'eval-result', result }));
        } catch (e) {
          ws.send(JSON.stringify({ type: 'error', message: e.message }));
        }
        break;

      case 'select':
        // Get element info at coordinates
        const elementInfo = await page.evaluate((x, y) => {
          const el = document.elementFromPoint(x, y);
          if (!el) return null;
          return {
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            text: el.textContent?.slice(0, 100),
            href: el.href,
            src: el.src,
          };
        }, data.x, data.y);
        ws.send(JSON.stringify({ type: 'element', ...elementInfo }));
        break;

      case 'source':
        const html = await page.content();
        ws.send(JSON.stringify({ type: 'source', html }));
        break;

      case 'pdf':
        const pdf = await page.pdf({ format: 'A4' });
        ws.send(JSON.stringify({ type: 'pdf', data: pdf.toString('base64') }));
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  } catch (e) {
    console.error('Error handling message:', e.message);
    ws.send(JSON.stringify({ type: 'error', message: e.message }));
  }
}

// Start WebSocket server
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`🔌 Client connected from ${ip}`);
  clients.add(ws);

  ws.on('message', msg => handleMessage(ws, msg));

  ws.on('close', () => {
    console.log(`👋 Client disconnected from ${ip}`);
    clients.delete(ws);
    if (clients.size === 0) {
      streaming = false;
      console.log('📡 Streaming stopped (no clients)');
    }
  });

  ws.on('error', e => console.error('WebSocket error:', e.message));
});

// Launch browser and start server
launchBrowser().catch(e => {
  console.error('Failed to launch browser:', e.message);
  console.log('\n💡 Try installing puppeteer:');
  console.log('   npm install puppeteer');
  process.exit(1);
});

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  streaming = false;
  if (browser) await browser.close();
  process.exit(0);
});

console.log(`\n📡 WebSocket server listening on ws://localhost:${PORT}`);
console.log('💡 Open browser.html and connect to this server\n');
