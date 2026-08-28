# Установка Cucumber for Behat

Этот fork исправляет разбор Behat-аннотаций в PHPDoc:

- однострочные определения вида `/** @Given ... */`;
- многострочные PHPDoc с пояснением после строки `@Given`, `@When` или `@Then`.

Официальное расширение `CucumberOpen.cucumber-official` нельзя оставлять
активным одновременно с fork: оба запускают Cucumber Language Server для
`.feature`-файлов.

## Сборка и установка

```bash
cd /Volumes/Data/work/dev.lab/platform/vscode-ext/vscode-cucumber
npm ci
npm run test:behat-phpdoc
npm run build
npm run package

code --uninstall-extension CucumberOpen.cucumber-official
code --install-extension ./cucumber-behat-1.11.1.vsix --force
```

После установки выполните в VS Code команду
`Developer: Reload Window`.

Проверка установленной версии:

```bash
code --list-extensions --show-versions \
  | rg '^denis-davidovich\.cucumber-behat@1\.11\.1$'
```

## Настройка проекта

Пример для Planner в `.vscode/settings.json`:

```json
{
  "cucumber.features": [
    "core/features/**/*.feature"
  ],
  "cucumber.glue": [
    "core/tests/Behat/**/*.php"
  ]
}
```

После изменения `cucumber.features` или `cucumber.glue` снова выполните
`Developer: Reload Window`: Cucumber Language Server 1.7.0 не всегда
перечитывает эти настройки без перезапуска.

## Обновление локальной сборки

```bash
cd /Volumes/Data/work/dev.lab/platform/vscode-ext/vscode-cucumber
git pull --ff-only
npm ci
npm run test:behat-phpdoc
npm run build
npm run package
code --install-extension ./cucumber-behat-1.11.1.vsix --force
```

Затем выполните `Developer: Reload Window`.

## Возврат к официальному расширению

```bash
code --uninstall-extension denis-davidovich.cucumber-behat
code --install-extension CucumberOpen.cucumber-official
```
