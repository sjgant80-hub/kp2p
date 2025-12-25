/**
 * @file src/widgets/index.js
 * @desc Widgets module - UI components for P2P apps
 *
 * HTML widgets are in this directory:
 * - phone.html - Basic phone UI
 * - phone-v2.html - FreeComm multi-transport phone
 * - ai-comm.html - AI-powered free communication (LLM + P2P + SMS)
 * - p2p-mesh.html - WebRTC mesh network with data channels
 * - webtorrent-tracker.html - WebTorrent tracker signaling layer
 * - os-desktop.html - Embeddable KonomiOS desktop
 * - terminal.html - P2P shared terminal
 * - ai-chat.html - WebLLM browser AI chat
 * - presence.html - Who's online widget
 * - feedback.html - Feature requests & voting (Canny killer)
 * - changelog.html - Product updates feed (Beamer killer)
 * - testimonials.html - Review collector (Testimonial.to killer)
 * - timer.html - Time tracking (Toggl killer)
 * - docs.html - Rich text document editor (Google Docs killer)
 */

// Telephony UDTs
export { TELEPHONY_UDTS } from './udts.js'

// Widget paths for dynamic loading
export const WIDGET_PATHS = {
  phone: './phone.html',
  phoneV2: './phone-v2.html',
  aiComm: './ai-comm.html',
  aiCommV2: './ai-comm-v2.html',
  aiCommV3: './ai-comm-v3.html',
  p2pMesh: './p2p-mesh.html',
  webtorrentTracker: './webtorrent-tracker.html',
  osDesktop: './os-desktop.html',
  terminal: './terminal.html',
  aiChat: './ai-chat.html',
  presence: './presence.html',
  feedback: './feedback.html',
  changelog: './changelog.html',
  testimonials: './testimonials.html',
  timer: './timer.html',
  docs: './docs.html',
  bookmarks: './bookmarks.html',
  invoices: './invoices.html',
  roadmap: './roadmap.html',
  faq: './faq.html',
  snippets: './snippets.html',
}

/**
 * Load a widget HTML file
 */
export async function loadWidget(name) {
  const path = WIDGET_PATHS[name]
  if (!path) throw new Error(`Unknown widget: ${name}`)

  const response = await fetch(new URL(path, import.meta.url))
  return response.text()
}
