# Установка Cucumber for Behat

Этот fork исправляет разбор Behat-аннотаций в PHPDoc:

- однострочные определения вида `/** @Given ... */`;
- многострочные PHPDoc с пояснением после строки `@Given`, `@When` или `@Then`;
- slash-delimited regex с экранированным `\/`;
- PCRE-группы `(?P<name>...)` и ссылки `(?P=name)`.

Официальное расширение `CucumberOpen.cucumber-official` нельзя оставлять
активным одновременно с fork: оба запускают Cucumber Language Server для
`.feature`-файлов.

## Сборка и установка

```bash
cd /Volumes/Data/work/dev.lab/platform/vscode-ext/vscode-cucumber
make install
```

Команда сама установит зависимости (если они ещё не установлены), запустит
проверку Behat-совместимости, соберёт VSIX, удалит конфликтующее официальное
расширение и установит fork. После установки выполните в VS Code команду
`Developer: Reload Window`.

Проверить весь набор PHP glue-файлов конкретного проекта можно отдельно:

```bash
npm run test:behat-corpus -- /absolute/path/to/tests/Behat
```

Локальная сборка получает последовательный номер в SemVer build metadata.
Счётчик хранится в файле `BUILD_NUMBER` и увеличивается при каждом запуске
`npm run package`, `npm run extension:install` или
`npm run extension:reinstall`. Например:

```text
1.11.1+1
```

Следующая сборка получит `1.11.1+2`. Запись `1.11.1.2` не является корректным
SemVer и не загружается VS Code.

Для чистой переустановки с предварительным удалением старой версии fork:

```bash
make reinstall
```

Установка в отдельный профиль VS Code:

```bash
code . --profile "Cucumber Behat"
make install ARGS='--profile "Cucumber Behat"'
```

Первую команду достаточно выполнить один раз: она создаёт профиль, если его
ещё нет.

Дополнительные параметры:

- `--keep-official` — не удалять `CucumberOpen.cucumber-official`;
- `--skip-tests` — пропустить тест совместимости;
- `--dry-run` — проверить окружение и показать план без изменений;
- `--code code-insiders` — использовать другую команду VS Code CLI.

Проверка установленной версии:

```bash
code --list-extensions --show-versions \
  | rg '^denis-davidovich\.cucumber-behat@1\.11\.1\+[0-9]+$'
```

## Настройка проекта

Пример для Planner в `.vscode/settings.json`:

```json
{
  "cucumber.features": ["core/features/**/*.feature"],
  "cucumber.glue": ["core/tests/Behat/**/*.php"]
}
```

После изменения `cucumber.features` или `cucumber.glue` снова выполните
`Developer: Reload Window`: Cucumber Language Server 1.7.0 не всегда
перечитывает эти настройки без перезапуска.

## Обновление локальной сборки

```bash
cd /Volumes/Data/work/dev.lab/platform/vscode-ext/vscode-cucumber
git pull --ff-only
make reinstall
```

Затем выполните `Developer: Reload Window`.

## Возврат к официальному расширению

```bash
code --uninstall-extension denis-davidovich.cucumber-behat
code --install-extension CucumberOpen.cucumber-official
```
