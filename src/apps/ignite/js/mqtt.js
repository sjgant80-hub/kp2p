/**
 * Konomi Ignite - MQTT Protocol Handler
 */

import { $, escapeHtml, log } from './utils.js';

export const mqttState = {
  client: null,
  subscriptions: new Set()
};

export async function connectMQTT(conn, callbacks = {}) {
  const { host, port, ssl, clientId, username, password } = conn.config;
  const url = `${ssl ? 'wss' : 'ws'}://${host}:${port}/mqtt`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, 'mqtt');
    ws.binaryType = 'arraybuffer';

    let connected = false;

    ws.onopen = () => {
      log('info', 'WebSocket connected, sending CONNECT packet...', 'MQTT');
      const connectPacket = buildMQTTConnect(clientId, username, password);
      ws.send(connectPacket);
    };

    ws.onmessage = (e) => {
      const data = new Uint8Array(e.data);
      const packetType = (data[0] >> 4) & 0x0F;

      switch (packetType) {
        case 2: // CONNACK
          if (data[3] === 0) {
            connected = true;
            mqttState.client = ws;
            resolve();
          } else {
            reject(new Error('MQTT connection refused: ' + data[3]));
          }
          break;
        case 3: // PUBLISH
          handleMQTTPublish(data);
          break;
        case 4: // PUBACK
          break;
        case 9: // SUBACK
          log('info', 'Subscription confirmed', 'MQTT');
          break;
        case 11: // UNSUBACK
          log('info', 'Unsubscription confirmed', 'MQTT');
          break;
        case 13: // PINGRESP
          break;
      }
    };

    ws.onerror = () => {
      log('error', 'WebSocket error', 'MQTT');
      reject(new Error('WebSocket error'));
    };

    ws.onclose = () => {
      log('warn', 'WebSocket closed', 'MQTT');
      mqttState.client = null;
      if (callbacks.onClose) callbacks.onClose();
    };

    setTimeout(() => {
      if (!connected) {
        ws.close();
        reject(new Error('Connection timeout'));
      }
    }, 10000);

    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(new Uint8Array([0xC0, 0x00])); // PINGREQ
      }
    }, 30000);
  });
}

function buildMQTTConnect(clientId, username, password) {
  const protocolLevel = 4; // MQTT 3.1.1
  let connectFlags = 0x02; // Clean session

  if (username) connectFlags |= 0x80;
  if (password) connectFlags |= 0x40;

  const keepAlive = 60;

  let remainingLength = 10 + 2 + clientId.length;
  if (username) remainingLength += 2 + username.length;
  if (password) remainingLength += 2 + password.length;

  const packet = new Uint8Array(2 + remainingLength);
  let i = 0;

  packet[i++] = 0x10; // CONNECT
  packet[i++] = remainingLength;

  packet[i++] = 0; packet[i++] = 4;
  packet[i++] = 77; packet[i++] = 81; packet[i++] = 84; packet[i++] = 84; // "MQTT"
  packet[i++] = protocolLevel;
  packet[i++] = connectFlags;
  packet[i++] = (keepAlive >> 8) & 0xFF;
  packet[i++] = keepAlive & 0xFF;

  packet[i++] = (clientId.length >> 8) & 0xFF;
  packet[i++] = clientId.length & 0xFF;
  for (let j = 0; j < clientId.length; j++) packet[i++] = clientId.charCodeAt(j);

  if (username) {
    packet[i++] = (username.length >> 8) & 0xFF;
    packet[i++] = username.length & 0xFF;
    for (let j = 0; j < username.length; j++) packet[i++] = username.charCodeAt(j);
  }

  if (password) {
    packet[i++] = (password.length >> 8) & 0xFF;
    packet[i++] = password.length & 0xFF;
    for (let j = 0; j < password.length; j++) packet[i++] = password.charCodeAt(j);
  }

  return packet;
}

function handleMQTTPublish(data) {
  let i = 1;
  let multiplier = 1;
  let remainingLength = 0;
  let digit;

  do {
    digit = data[i++];
    remainingLength += (digit & 0x7F) * multiplier;
    multiplier *= 128;
  } while (digit >= 0x80);

  const topicLength = (data[i] << 8) | data[i + 1];
  i += 2;
  const topic = new TextDecoder().decode(data.slice(i, i + topicLength));
  i += topicLength;

  const payload = new TextDecoder().decode(data.slice(i));

  addMQTTMessage(topic, payload, 'subscribe');
  log('info', `Received: ${topic} = ${payload.substring(0, 50)}${payload.length > 50 ? '...' : ''}`, 'MQTT');
}

export function addMQTTMessage(topic, payload, type) {
  const container = $('mqttMessages');
  const msg = document.createElement('div');
  msg.className = 'mqtt-msg ' + type;

  let formattedPayload = payload;
  try {
    formattedPayload = JSON.stringify(JSON.parse(payload), null, 2);
  } catch {}

  msg.innerHTML = `
    <div class="mqtt-msg-header">
      <span class="mqtt-msg-topic">${escapeHtml(topic)}</span>
      <span class="mqtt-msg-time">${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="mqtt-msg-payload">${escapeHtml(formattedPayload)}</div>
  `;

  container.insertBefore(msg, container.firstChild);

  while (container.children.length > 100) {
    container.removeChild(container.lastChild);
  }
}

export function publish(topic, payload, qos = 0, retain = false) {
  if (!mqttState.client) {
    log('error', 'Not connected to MQTT broker', 'MQTT');
    return false;
  }

  const topicBytes = new TextEncoder().encode(topic);
  const payloadBytes = new TextEncoder().encode(payload);

  let flags = 0x30;
  if (retain) flags |= 0x01;
  flags |= (qos << 1);

  const remainingLength = 2 + topicBytes.length + payloadBytes.length + (qos > 0 ? 2 : 0);
  const packet = new Uint8Array(2 + remainingLength);

  let i = 0;
  packet[i++] = flags;
  packet[i++] = remainingLength;
  packet[i++] = (topicBytes.length >> 8) & 0xFF;
  packet[i++] = topicBytes.length & 0xFF;
  packet.set(topicBytes, i);
  i += topicBytes.length;

  if (qos > 0) {
    const packetId = Math.floor(Math.random() * 65535);
    packet[i++] = (packetId >> 8) & 0xFF;
    packet[i++] = packetId & 0xFF;
  }

  packet.set(payloadBytes, i);

  mqttState.client.send(packet);
  addMQTTMessage(topic, payload, 'publish');
  log('success', `Published: ${topic}`, 'MQTT');
  return true;
}

export function subscribe(topic) {
  if (!mqttState.client) {
    log('error', 'Not connected to MQTT broker', 'MQTT');
    return false;
  }

  const topicBytes = new TextEncoder().encode(topic);
  const packetId = Math.floor(Math.random() * 65535);

  const remainingLength = 2 + 2 + topicBytes.length + 1;
  const packet = new Uint8Array(2 + remainingLength);

  let i = 0;
  packet[i++] = 0x82; // SUBSCRIBE
  packet[i++] = remainingLength;
  packet[i++] = (packetId >> 8) & 0xFF;
  packet[i++] = packetId & 0xFF;
  packet[i++] = (topicBytes.length >> 8) & 0xFF;
  packet[i++] = topicBytes.length & 0xFF;
  packet.set(topicBytes, i);
  i += topicBytes.length;
  packet[i++] = 0;

  mqttState.client.send(packet);
  mqttState.subscriptions.add(topic);
  log('info', `Subscribed to: ${topic}`, 'MQTT');
  return true;
}

export function unsubscribe(topic) {
  if (!mqttState.client) return false;

  const topicBytes = new TextEncoder().encode(topic);
  const packetId = Math.floor(Math.random() * 65535);

  const remainingLength = 2 + 2 + topicBytes.length;
  const packet = new Uint8Array(2 + remainingLength);

  let i = 0;
  packet[i++] = 0xA2; // UNSUBSCRIBE
  packet[i++] = remainingLength;
  packet[i++] = (packetId >> 8) & 0xFF;
  packet[i++] = packetId & 0xFF;
  packet[i++] = (topicBytes.length >> 8) & 0xFF;
  packet[i++] = topicBytes.length & 0xFF;
  packet.set(topicBytes, i);

  mqttState.client.send(packet);
  mqttState.subscriptions.delete(topic);
  log('info', `Unsubscribed from: ${topic}`, 'MQTT');
  return true;
}
