// Creality printer UDTs - ~50 lines
import { printer } from './base.js'

// Creality API endpoints (WiFi Box / Creality Cloud)
const crealityApi = {
  status: '/protocal.csp?fname=Info&opt=main',
  temp: '/protocal.csp?fname=Info&opt=main',
  job: '/protocal.csp?fname=Info&opt=file',
  files: '/udisk/file-list',
  command: '/protocal.csp?fname=net&opt=wifi',
}

export const Ender3 = (ip) => printer({
  name: 'Ender 3', brand: 'Creality', model: 'Ender-3',
  ip, port: 8080,
  bed: { x: 220, y: 220, z: 250 },
  filament: ['PLA', 'PETG', 'TPU'],
  api: crealityApi
})

export const Ender3V2 = (ip) => printer({
  name: 'Ender 3 V2', brand: 'Creality', model: 'Ender-3 V2',
  ip, port: 8080,
  bed: { x: 220, y: 220, z: 250 },
  filament: ['PLA', 'PETG', 'TPU', 'ABS'],
  api: crealityApi
})

export const Ender5 = (ip) => printer({
  name: 'Ender 5', brand: 'Creality', model: 'Ender-5',
  ip, port: 8080,
  bed: { x: 220, y: 220, z: 300 },
  api: crealityApi
})

export const CR10 = (ip) => printer({
  name: 'CR-10', brand: 'Creality', model: 'CR-10',
  ip, port: 8080,
  bed: { x: 300, y: 300, z: 400 },
  api: crealityApi
})

export const K1 = (ip) => printer({
  name: 'K1', brand: 'Creality', model: 'K1',
  ip, port: 9999,
  bed: { x: 220, y: 220, z: 250 },
  filament: ['PLA', 'PETG', 'TPU', 'ABS', 'ASA'],
  api: { ...crealityApi, status: '/printer/info' }
})

// Model lookup by detected name
export const models = { Ender3, Ender3V2, Ender5, CR10, K1 }
