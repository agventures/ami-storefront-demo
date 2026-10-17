#!/usr/bin/env node
// Looks for an Ami API key where a browser could read it.
//
//   node .agents/skills/ami-storefront/scripts/check-key-leak.mjs [project-dir]
//
// Fails (exit 1) when:
// - a secret key (ami_live_… / ami_test_…) is written into any source or
//   built file — keys belong in the server's environment, never in code;
// - the key is exposed through a browser-visible env prefix
//   (NEXT_PUBLIC_, VITE_, PUBLIC_, REACT_APP_, NUXT_PUBLIC_, EXPO_PUBLIC_);
// - AMI_API_KEY is read in a client component, a file that runs in the
//   browser.
//
// The skill's own folder is left out wherever it is installed: its notes
// and this file name the key on purpose.
import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.argv[2] ?? process.cwd()
const SKIP = new Set(['node_modules', '.git', '.agents', '.claude'])
const SELF = realpathSync(fileURLToPath(new URL('..', import.meta.url)))
const BUILT = ['.next/static', 'out', 'dist', 'build', '.output/public']
const TEXT = /\.(m?[jt]sx?|json|html|css|env|ya?ml|md|vue|svelte|astro)$|^\.env/
const SECRET = /\bami_(live|test)_[A-Za-z0-9_-]{24,}/
const PUBLIC_PREFIX = /\b(NEXT_PUBLIC|VITE|PUBLIC|REACT_APP|NUXT_PUBLIC|EXPO_PUBLIC)_[A-Z0-9_]*AMI[A-Z0-9_]*KEY\b/

const problems = []

function walk(dir, { built = false } = {}) {
  let entries = []
  try { entries = readdirSync(dir) } catch { return }
  for (const name of entries) {
    if (SKIP.has(name)) continue
    const path = join(dir, name)
    let info
    try { info = statSync(path) } catch { continue }
    if (info.isDirectory()) {
      if (realpathSync(path) === SELF) continue
      // Build output is checked separately and whole; skip it here.
      if (!built && ['.next', 'out', 'dist', 'build', '.output'].includes(name)) continue
      walk(path, { built })
      continue
    }
    if (!TEXT.test(name) || info.size > 5_000_000) continue
    const text = readFileSync(path, 'utf8')
    const where = relative(root, path)
    const isEnvFile = name.startsWith('.env')
    if (SECRET.test(text) && !(isEnvFile && !name.endsWith('.example') && !built)) {
      problems.push(`${where}: contiene una llave de Ami escrita en el archivo`)
    }
    if (PUBLIC_PREFIX.test(text)) {
      problems.push(`${where}: expone la llave con un prefijo público (${text.match(PUBLIC_PREFIX)[0]})`)
    }
    if (!built && /['"]use client['"]/.test(text) && /AMI_API_KEY/.test(text)) {
      problems.push(`${where}: lee AMI_API_KEY en un componente de cliente`)
    }
  }
}

walk(root)
for (const dir of BUILT) walk(join(root, dir), { built: true })

if (problems.length) {
  console.error('La llave de Ami podría quedar expuesta:\n- ' + problems.join('\n- '))
  console.error('\nLa llave solo se lee en el servidor, desde el entorno (AMI_API_KEY).')
  process.exit(1)
}
console.log('Bien: la llave de Ami no aparece en el código ni en lo que llega al navegador.')
