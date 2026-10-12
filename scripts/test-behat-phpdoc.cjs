const assert = require('node:assert/strict')
const path = require('node:path')

const languageServiceRoot = path.resolve(
  path.dirname(require.resolve('@cucumber/language-service')),
  '../../..'
)
const { phpLanguage } = require(
  path.join(languageServiceRoot, 'dist/cjs/src/language/phpLanguage.js')
)
const { ExpressionBuilder } = require(
  path.join(languageServiceRoot, 'dist/cjs/src/language/ExpressionBuilder.js')
)
const { WasmParserAdapter } = require(
  path.join(languageServiceRoot, 'dist/cjs/src/tree-sitter-wasm/WasmParserAdapter.js')
)

function parsePhpDoc(text) {
  return phpLanguage.toStepDefinitionExpression({ text })
}

const oneLine = parsePhpDoc('/** @Given существует аккаунт с токеном :token */')
assert.equal(oneLine.test('существует аккаунт с токеном "agent"'), true)

const multiline = parsePhpDoc(`/**
 * @Given /^на AC (\\d+) есть (\\d+) evidence с вердиктом "([^"]*)"$/
 *
 * Пояснение для разработчика не является частью регулярного выражения.
 */`)
assert.equal(multiline.test('на AC 1 есть 3 evidence с вердиктом "weak"'), true)

const escapedSlashWithUnicodeFlag = parsePhpDoc(`/**
 * @Then /^на профиле залипания таланта по вакансии (\\S+) видно соотношение «(\\d+) показа? \\/ (\\d+) задерж\\S+»$/u
 */`)
assert.equal(escapedSlashWithUnicodeFlag.flags, 'u')
assert.equal(
  escapedSlashWithUnicodeFlag.test(
    'на профиле залипания таланта по вакансии backend видно соотношение «3 показа / 2 задержки»'
  ),
  true
)

const multipleEscapedSlashesWithoutFlags = parsePhpDoc(
  '/** @When /^путь \\/api\\/v1 содержит [\\/] и конец$/ */'
)
assert.equal(multipleEscapedSlashesWithoutFlags.flags, '')
assert.equal(multipleEscapedSlashesWithoutFlags.test('путь /api/v1 содержит / и конец'), true)

const pcreNamedGroup = parsePhpDoc(
  '/** @Given /^активированный талант в состоянии (?P<case>.+)$/ */'
)
const namedGroupMatch = pcreNamedGroup.exec('активированный талант в состоянии ready')
assert.equal(namedGroupMatch?.groups?.case, 'ready')

const multiplePcreNamedGroups = parsePhpDoc(
  '/** @Given /^программа "(?P<id>[^"]+)" с бонусом (?P<amount>\\d+)$/u */'
)
const multipleNamedGroupsMatch = multiplePcreNamedGroups.exec('программа "referral" с бонусом 500')
assert.equal(multipleNamedGroupsMatch?.groups?.id, 'referral')
assert.equal(multipleNamedGroupsMatch?.groups?.amount, '500')

const pcreNamedBackreference = parsePhpDoc(
  '/** @Then /^(?P<word>\\S+) повторяется как (?P=word)$/u */'
)
assert.equal(pcreNamedBackreference.test('слово повторяется как слово'), true)

async function extractStepDefinitions(content) {
  const parserAdapter = new WasmParserAdapter(path.join(languageServiceRoot, 'dist'))
  await parserAdapter.init()
  return new ExpressionBuilder(parserAdapter).build(
    [{ languageName: 'php', uri: 'file:///Steps.php', content }],
    []
  )
}

async function checkStepDefinitionExtraction() {
  const result = await extractStepDefinitions(`<?php
trait Steps
{
  // ---------------------------------------------------------------------------
  // Шаги
  // ---------------------------------------------------------------------------

  /**
   * @Given /^пользователь с доступом к API$/
   */
  public function userWithApiAccess() {}

  /**
   * @Given /^реселлер подключил номер "([^"]+)"$/
   * @Given /^реселлер заново подключил номер "([^"]+)"$/
   * @When /^реселлер подключает номер "([^"]+)"$/
   */
  public function resellerConnectsNumber(string $number) {}

  // Обычный комментарий с упоминанием @Given не является определением шага.
  public function helper() {}
}
`)
  assert.deepEqual(result.errors, [])
  const sources = result.expressionLinks.map(({ expression }) => expression.source).sort()
  assert.deepEqual(sources, [
    '^пользователь с доступом к API$',
    '^реселлер заново подключил номер "([^"]+)"$',
    '^реселлер подключает номер "([^"]+)"$',
    '^реселлер подключил номер "([^"]+)"$',
  ])
  const matches = (text) => result.expressionLinks.some(({ expression }) => expression.match(text))
  assert.equal(matches('пользователь с доступом к API'), true)
  assert.equal(matches('реселлер заново подключил номер "79001234567"'), true)
}

checkStepDefinitionExtraction().then(
  () => console.log('Behat PHPDoc compatibility checks passed'),
  (error) => {
    console.error(error)
    process.exit(1)
  }
)
