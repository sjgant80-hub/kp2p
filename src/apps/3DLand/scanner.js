// Network scanner for 3D printers - ~50 lines

// Common printer ports
export const PORTS = [80, 8080, 5000, 7125, 9999]

// Test if printer responds with valid data
export async function testPrinter(ip, port = 80, onLog) {
  onLog?.(`Testing ${ip}:${port}...`)

  // Try common printer API endpoints
  const endpoints = [
    '/api/version',           // OctoPrint
    '/api/printer',           // OctoPrint
    '/printer/info',          // Klipper/Moonraker
    '/protocal.csp?fname=Info&opt=main', // Creality
  ]

  for (const ep of endpoints) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 3000)
      const r = await fetch(`http://${ip}:${port}${ep}`, { signal: ctrl.signal })
      clearTimeout(timer)
      if (r.ok) {
        const data = await r.json().catch(() => null)
        onLog?.(`✓ Found printer at ${ip}:${port} (${ep})`)
        return { ip, port, endpoint: ep, data }
      }
    } catch (e) {
      // CORS or network error - continue
    }
  }
  onLog?.(`✗ No printer found at ${ip}:${port}`)
  return null
}

// Note: Browser auto-scanning is limited by CORS.
// For reliable detection, use manual IP entry or run a local scan tool.
export async function scan(subnet = '192.168.1', onFound, onLog) {
  onLog?.(`⚠️ Browser scanning limited by CORS`)
  onLog?.(`Tip: Use "Add Printer" to enter IP manually`)
  onLog?.(`Or run: nmap -p 80,8080,5000,7125 ${subnet}.0/24`)
  return []
}

// Quick scan - just test a single IP
export async function quickScan(ip, port, onLog) {
  return await testPrinter(ip, port, onLog)
}
