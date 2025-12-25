/**
 * @file src/widgets/index.js
 * @desc Widgets module - UI components for P2P apps
 *
 * HTML widgets are in this directory:
 * - phone.html - Basic phone UI
 * - phone-v2.html - FreeComm multi-transport phone
 * - ai-comm.html - AI-powered free communication (LLM + P2P + SMS)
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
