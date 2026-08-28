const assert = require('node:assert/strict')
const path = require('node:path')

const languageServiceRoot = path.resolve(
  path.dirname(require.resolve('@cucumber/language-service')),
  '../../..'
)
const { phpLanguage } = require(
  path.join(languageServiceRoot, 'dist/cjs/src/language/phpLanguage.js')
)

function parsePhpDoc(text) {
  return phpLanguage.toStepDefinitionExpression({ text })
}

const oneLine = parsePhpDoc(
  '/** @Given существует аккаунт с токеном :token */'
)
assert.equal(oneLine.test('существует аккаунт с токеном "agent"'), true)

const multiline = parsePhpDoc(`/**
 * @Given /^на AC (\\d+) есть (\\d+) evidence с вердиктом "([^"]*)"$/
 *
 * Пояснение для разработчика не является частью регулярного выражения.
 */`)
assert.equal(
  multiline.test('на AC 1 есть 3 evidence с вердиктом "weak"'),
  true
)

console.log('Behat PHPDoc compatibility checks passed')
