// Network scanner for 3D printers - ~45 lines
import { models } from './printers/creality.js'

// Common printer ports
const PORTS = [80, 8080, 5000, 7125, 9999]

// Probe a single IP:port for printer
async function probe(ip, port, timeout = 2000) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), timeout)
  try {
    const r = await fetch(`http://${ip}:${port}/`, {
      signal: ctrl.signal, mode: 'no-cors'
    })
    clearTimeout(id)
    return true
  } catch {
    clearTimeout(id)
    return false
  }
}

// Scan subnet for printers
export async function scan(subnet = '192.168.1', onFound, onLog) {
  onLog?.(`Scanning ${subnet}.1-254...`)
  const found = []

  // Scan in batches of 20 to avoid overwhelming network
  for (let batch = 0; batch < 13; batch++) {
    const promises = []
    for (let i = batch * 20 + 1; i <= (batch + 1) * 20 && i <= 254; i++) {
      const ip = `${subnet}.${i}`
      for (const port of PORTS) {
        promises.push(
          probe(ip, port).then(ok => ok ? { ip, port } : null)
        )
      }
    }
    const results = await Promise.all(promises)
    for (const r of results.filter(Boolean)) {
      onLog?.(`Found: ${r.ip}:${r.port}`)
      found.push(r)
      onFound?.(r)
    }
  }
  onLog?.(`Scan complete. Found ${found.length} devices.`)
  return found
}

// Quick scan common printer IPs
export async function quickScan(onFound, onLog) {
  const common = ['.100', '.101', '.50', '.1']
  // Detect local subnet from common ranges
  for (const subnet of ['192.168.1', '192.168.0', '10.0.0']) {
    for (const suffix of common) {
      const ip = subnet + suffix
      for (const port of PORTS) {
        if (await probe(ip, port, 1000)) {
          onLog?.(`Found: ${ip}:${port}`)
          onFound?.({ ip, port })
        }
      }
    }
  }
}
