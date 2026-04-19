#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src')
const CSS = path.join(SRC, 'index.css')

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const e of entries) {
    if (e.name.startsWith('.')) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) files.push(...await walk(full))
    else if (/\.(js|jsx|ts|tsx|mjs|html)$/.test(e.name)) files.push(full)
  }
  return files
}

async function main() {
  let files = []
  try {
    files = await walk(SRC)
  } catch (err) {
    console.error('[check-gradient-text] failed to walk src:', err.message)
    process.exit(2)
  }

  const hits = []
  for (const f of files) {
    try {
      const c = await fs.readFile(f, 'utf8')
      if (c.includes('bg-clip-text')) hits.push(f)
    } catch (err) {
      // ignore
    }
  }

  if (hits.length === 0) {
    console.log('[check-gradient-text] no bg-clip-text usages found in src/')
    process.exit(0)
  }

  console.log(`[check-gradient-text] found ${hits.length} file(s) using bg-clip-text:`)
  for (const f of hits) console.log(' -', path.relative(ROOT, f))

  let css = ''
  try { css = await fs.readFile(CSS, 'utf8') } catch (err) { css = '' }

  const ok = css.includes('.gradient-text-fix') || css.includes('-webkit-text-stroke')
  if (!ok) {
    console.error('\n[check-gradient-text] index.css is missing .gradient-text-fix (or -webkit-text-stroke).')
    console.error('Add the utility to frontend/src/index.css to stabilize gradient text rendering.')
    process.exit(1)
  }

  console.log('\n[check-gradient-text] index.css contains gradient-text-fix; CI check OK.')
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(2) })
