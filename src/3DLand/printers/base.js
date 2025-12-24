// Printer UDT base - ~40 lines
export const printer = (params) => ({
  id: params.id || crypto.randomUUID(),
  name: params.name || 'Unknown',
  brand: params.brand || 'Generic',
  model: params.model || '',
  ip: params.ip || null,
  port: params.port || 80,

  // Build volume (mm)
  bed: params.bed || { x: 220, y: 220, z: 250 },

  // Capabilities
  heated_bed: params.heated_bed ?? true,
  filament: params.filament || ['PLA', 'PETG', 'ABS'],
  nozzle: params.nozzle || 0.4,

  // Status
  status: 'offline',
  temp: { nozzle: 0, bed: 0 },
  progress: 0,
  file: null,

  // API endpoints (override per brand)
  api: {
    status: params.api?.status || '/api/printer',
    temp: params.api?.temp || '/api/printer/temp',
    job: params.api?.job || '/api/job',
    files: params.api?.files || '/api/files',
    command: params.api?.command || '/api/printer/command',
  },

  // Fetch status from printer
  async fetch(endpoint) {
    if (!this.ip) return null
    try {
      const r = await fetch(`http://${this.ip}:${this.port}${endpoint}`)
      return r.ok ? await r.json() : null
    } catch { return null }
  }
})
