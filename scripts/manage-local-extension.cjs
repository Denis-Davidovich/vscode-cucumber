#!/usr/bin/env node

const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const { packageExtension, readBuildNumber } = require('./package-local-extension.cjs')

const root = path.resolve(__dirname, '..')
const manifest = require(path.join(root, 'package.json'))

const extensionId = `${manifest.publisher}.${manifest.name}`
const officialExtensionId = 'CucumberOpen.cucumber-official'
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const defaultCodeCommand = process.platform === 'win32' ? 'code.cmd' : 'code'

function usage() {
  console.log(`Usage:
  node scripts/manage-local-extension.cjs <install|reinstall> [options]

Options:
  --profile <name>   Install into a specific VS Code profile
  --code <command>   VS Code CLI command (default: code)
  --keep-official    Do not uninstall ${officialExtensionId}
  --skip-tests       Skip the Behat compatibility test
  --dry-run          Show the operations without changing anything
  --help             Show this help
`)
}

function parseArguments(argv) {
  const [mode, ...args] = argv
  const options = {
    codeCommand: process.env.VSCODE_CLI || defaultCodeCommand,
    dryRun: false,
    keepOfficial: false,
    profile: undefined,
    skipTests: false,
  }

  if (mode === '--help' || mode === '-h') {
    usage()
    process.exit(0)
  }

  if (mode !== 'install' && mode !== 'reinstall') {
    usage()
    throw new Error('The first argument must be either "install" or "reinstall".')
  }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === '--profile' || argument === '--code') {
      const value = args[index + 1]
      if (!value || value.startsWith('--')) {
        throw new Error(`${argument} requires a value.`)
      }

      if (argument === '--profile') options.profile = value
      else if (argument === '--code') options.codeCommand = value
      index += 1
      continue
    }

    if (argument === '--dry-run') options.dryRun = true
    else if (argument === '--keep-official') options.keepOfficial = true
    else if (argument === '--skip-tests') options.skipTests = true
    else if (argument === '--help' || argument === '-h') {
      usage()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }

  return { mode, options }
}

function formatCommand(command, args) {
  return [command, ...args]
    .map((part) => (/^[A-Za-z0-9_./:@=-]+$/.test(part) ? part : JSON.stringify(part)))
    .join(' ')
}

function run(command, args, { capture = false, dryRun = false } = {}) {
  console.log(`> ${formatCommand(command, args)}`)

  if (dryRun) return ''

  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  })

  if (result.error) {
    throw new Error(`Could not run ${command}: ${result.error.message}`)
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}.`)
  }

  return capture ? result.stdout : ''
}

function profileArguments(profile) {
  return profile ? ['--profile', profile] : []
}

function listInstalled(codeCommand, profile) {
  const output = run(
    codeCommand,
    ['--list-extensions', '--show-versions', ...profileArguments(profile)],
    { capture: true }
  )

  return new Map(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.lastIndexOf('@')
        const id = separator === -1 ? line : line.slice(0, separator)
        const version = separator === -1 ? '' : line.slice(separator + 1)
        return [id.toLowerCase(), version]
      })
  )
}

function main() {
  const { mode, options } = parseArguments(process.argv.slice(2))
  const nextBuildNumber = readBuildNumber() + 1
  const packagedVersion = `${manifest.version}+${nextBuildNumber}`
  const vsixPath = path.join(root, `${manifest.name}-${packagedVersion}.vsix`)
  const profileArgs = profileArguments(options.profile)
  const target = options.profile ? `profile "${options.profile}"` : 'the current VS Code profile'

  console.log(`Preparing ${extensionId}@${packagedVersion} for ${target}.`)

  run(options.codeCommand, ['--version'], { capture: true })
  let initiallyInstalled
  try {
    initiallyInstalled = listInstalled(options.codeCommand, options.profile)
  } catch (error) {
    if (options.profile) {
      throw new Error(
        `Cannot read profile "${options.profile}". Create it first with: ${options.codeCommand} . --profile ${JSON.stringify(options.profile)}`
      )
    }
    throw error
  }
  const executionOptions = { dryRun: options.dryRun }

  const localVsce = path.join(
    root,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'vsce.cmd' : 'vsce'
  )
  if (!fs.existsSync(localVsce)) {
    run(npmCommand, ['ci'], executionOptions)
  } else {
    console.log('Dependencies are already installed; skipping npm ci.')
  }

  if (!options.skipTests) {
    run(npmCommand, ['run', 'test:behat-phpdoc'], executionOptions)
  }

  const packaged = packageExtension({ dryRun: options.dryRun, outPath: vsixPath })
  if (packaged.version !== packagedVersion) {
    throw new Error(
      `Build number changed concurrently: expected ${packagedVersion}, got ${packaged.version}.`
    )
  }

  if (mode === 'reinstall' && initiallyInstalled.has(extensionId.toLowerCase())) {
    run(
      options.codeCommand,
      ['--uninstall-extension', extensionId, ...profileArgs],
      executionOptions
    )
  }

  run(
    options.codeCommand,
    ['--install-extension', vsixPath, '--force', ...profileArgs],
    executionOptions
  )

  if (!options.keepOfficial && initiallyInstalled.has(officialExtensionId.toLowerCase())) {
    run(
      options.codeCommand,
      ['--uninstall-extension', officialExtensionId, ...profileArgs],
      executionOptions
    )
  }

  if (options.dryRun) {
    console.log('Dry run: no build, uninstall, or install command was executed.')
    return
  }

  const installed = listInstalled(options.codeCommand, options.profile)
  const installedVersion = installed.get(extensionId.toLowerCase())
  if (installedVersion !== packagedVersion) {
    throw new Error(
      `Verification failed: expected ${extensionId}@${packagedVersion}, got ${installedVersion || 'not installed'}.`
    )
  }

  console.log(`Installed and verified ${extensionId}@${installedVersion}.`)
  console.log('Run "Developer: Reload Window" in VS Code to load the new build.')
}

try {
  main()
} catch (error) {
  console.error(`Error: ${error.message}`)
  process.exit(1)
}
