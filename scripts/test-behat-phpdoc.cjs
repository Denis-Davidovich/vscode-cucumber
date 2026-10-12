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

async function stepSources(content) {
  const result = await extractStepDefinitions(`<?php\ntrait Steps\n{\n${content}\n}\n`)
  assert.deepEqual(result.errors, [])
  return result.expressionLinks.map(({ expression }) => expression.source).sort()
}

const extractionCases = {
  'PHPDoc after // separator comments is found': async () => {
    const sources = await stepSources(`
  // ---------------------------------------------------------------------------
  // Шаги
  // ---------------------------------------------------------------------------

  /**
   * @Given /^пользователь с доступом к API$/
   */
  public function userWithApiAccess() {}`)
    assert.deepEqual(sources, ['^пользователь с доступом к API$'])
  },

  'every annotation of one PHPDoc is a separate step': async () => {
    const sources = await stepSources(`
  /**
   * @Given /^реселлер подключил номер "([^"]+)"$/
   * @Given /^реселлер заново подключил номер "([^"]+)"$/
   * @When /^реселлер подключает номер "([^"]+)"$/
   */
  public function resellerConnectsNumber(string $number) {}`)
    assert.deepEqual(sources, [
      '^реселлер заново подключил номер "([^"]+)"$',
      '^реселлер подключает номер "([^"]+)"$',
      '^реселлер подключил номер "([^"]+)"$',
    ])
  },

  '// comment mentioning @Given is not a step and does not break the index': async () => {
    const sources = await stepSources(`
  // Обычный комментарий с упоминанием @Given не является определением шага.
  public function helper() {}

  /**
   * @Given /^пользователь с доступом к API$/
   */
  public function userWithApiAccess() {}`)
    assert.deepEqual(sources, ['^пользователь с доступом к API$'])
  },
}

async function checkStepDefinitionExtraction() {
  let failed = 0
  for (const [name, check] of Object.entries(extractionCases)) {
    try {
      await check()
      console.log(`ok - ${name}`)
    } catch (error) {
      failed++
      console.error(`not ok - ${name}\n${error.message}`)
    }
  }
  if (failed > 0) {
    process.exit(1)
  }
  console.log('Behat PHPDoc compatibility checks passed')
}

checkStepDefinitionExtraction()
