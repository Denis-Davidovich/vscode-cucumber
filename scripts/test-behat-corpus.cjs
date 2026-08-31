#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

const languageServiceRoot = path.resolve(
  path.dirname(require.resolve('@cucumber/language-service')),
  '../../..'
)
const { phpLanguage } = require(
  path.join(languageServiceRoot, 'dist/cjs/src/language/phpLanguage.js')
)

const roots = process.argv.slice(2).map((root) => path.resolve(root))
if (roots.length === 0) {
  console.error('Usage: node scripts/test-behat-corpus.cjs <glue-dir> [...]')
  process.exit(2)
}

function phpFiles(root) {
  const entries = fs.readdirSync(root, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const target = path.join(root, entry.name)
    if (entry.isDirectory()) return phpFiles(target)
    return entry.isFile() && entry.name.endsWith('.php') ? [target] : []
  })
}

const files = roots.flatMap(phpFiles)
const failures = []
let annotations = 0

for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const annotation = lines[index].match(/@(Given|When|Then)\s+(.+)$/)
    if (!annotation) continue

    const expression = annotation[2].replace(/\s*\*\/\s*$/, '').trim()
    annotations += 1
    try {
      phpLanguage.toStepDefinitionExpression({
        text: `/** @${annotation[1]} ${expression} */`,
      })
    } catch (error) {
      failures.push(`${file}:${index + 1}: ${error.message}`)
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  console.error(`Failed to compile ${failures.length} of ${annotations} Behat annotations.`)
  process.exit(1)
}

console.log(`Compiled ${annotations} Behat annotations from ${files.length} PHP glue files.`)
