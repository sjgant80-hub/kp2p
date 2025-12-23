/**
 * @file test/e2e/playwright.test.js
 * @desc Playwright tests for all HTML pages
 * @size ~100 tokens
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const pages = [
  { path: '/', name: 'Root Landing' },
  { path: '/test/index.html', name: 'Test Runner' },
  { path: '/test/chat.html', name: 'Chat Room' },
  { path: '/test/e2e/dual-client.html', name: 'Dual Client' },
  { path: '/test/e2e/client.html?room=test&id=A', name: 'Client A' },
  { path: '/sandbox/index.html', name: 'Sandbox' },
];

async function runTests() {
  console.log('🎭 Starting Playwright tests...\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const page of pages) {
    const context = await browser.newContext();
    const tab = await context.newPage();
    const url = BASE_URL + page.path;

    const result = { name: page.name, url, passed: false, error: null, logs: [] };

    // Capture console logs
    tab.on('console', msg => {
      result.logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Capture errors
    tab.on('pageerror', err => {
      result.error = err.message;
    });

    try {
      const response = await tab.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

      if (!response) {
        result.error = 'No response';
      } else if (!response.ok()) {
        result.error = `HTTP ${response.status()}`;
      } else {
        // Check for JS errors by looking for error console messages
        const errors = result.logs.filter(l => l.startsWith('[error]'));
        if (errors.length > 0) {
          result.error = errors[0];
        } else {
          result.passed = true;
        }
      }

      // Wait a bit for any async errors
      await tab.waitForTimeout(500);

    } catch (err) {
      result.error = err.message;
    }

    await context.close();
    results.push(result);

    const icon = result.passed ? '✓' : '✗';
    const color = result.passed ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${icon}\x1b[0m ${page.name}`);
    if (result.error) {
      console.log(`  └─ Error: ${result.error}`);
    }
  }

  await browser.close();

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;

  console.log('\n' + '─'.repeat(40));
  console.log(`\x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m`);

  // Dual client test
  console.log('\n🔗 Running dual-client communication test...');
  await testDualClient(BASE_URL);

  return failed === 0;
}

async function testDualClient(baseUrl) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Open two chat tabs
  const tab1 = await context.newPage();
  const tab2 = await context.newPage();

  const chatUrl = baseUrl + '/test/chat.html';

  await tab1.goto(chatUrl, { waitUntil: 'domcontentloaded' });
  await tab2.goto(chatUrl, { waitUntil: 'domcontentloaded' });

  // Wait for connection
  await tab1.waitForTimeout(500);
  await tab2.waitForTimeout(500);

  // Send message from tab1
  await tab1.fill('#input', 'Hello from Tab 1!');
  await tab1.click('#send');

  // Wait for message to arrive
  await tab2.waitForTimeout(300);

  // Check if tab2 received it
  const messages = await tab2.$$eval('.msg', msgs => msgs.map(m => m.textContent));
  const received = messages.some(m => m.includes('Hello from Tab 1'));

  if (received) {
    console.log('\x1b[32m✓\x1b[0m Dual client communication works!');
  } else {
    console.log('\x1b[31m✗\x1b[0m Dual client communication failed');
    console.log('  Messages in tab2:', messages);
  }

  await browser.close();
}

runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
