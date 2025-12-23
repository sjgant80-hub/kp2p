/**
 * @file test/core/csv-loader.js
 * @desc CSV parser for test parameters
 * @size ~80 tokens
 * @deps []
 * @exports parseCSV, loadCSV
 */

export function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l && !l.startsWith('#'))
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim())

  return lines.slice(1).map(line => {
    const values = []
    let current = '', inQuotes = false

    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else current += char
    }
    values.push(current.trim())

    const row = {}
    headers.forEach((h, i) => {
      let v = values[i] ?? ''
      if (v === 'true') v = true
      else if (v === 'false') v = false
      else if (!isNaN(v) && v !== '') v = Number(v)
      row[h] = v
    })
    return row
  })
}

export async function loadCSV(path) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Failed to load: ${path}`)
  return parseCSV(await res.text())
}
