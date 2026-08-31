#!/usr/bin/env node

const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const manifest = require(path.join(root, 'package.json'))
const buildNumberPath = path.join(root, 'BUILD_NUMBER')
const lockPath = path.join(root, '.build-number.lock')
const vsceCommand = path.join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vsce.cmd' : 'vsce'
)

function readBuildNumber() {
  const value = fs.readFileSync(buildNumberPath, 'utf8').trim()
  if (!/^\d+$/.test(value)) {
    throw new Error(`BUILD_NUMBER must contain a non-negative integer, got: ${value}`)
  }
  return Number(value)
}

function reserveBuildNumber() {
  let lock
  try {
    lock = fs.openSync(lockPath, 'wx')
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error('Another extension build is already reserving a build number.')
    }
    throw error
  }

  try {
    const buildNumber = readBuildNumber() + 1
    const temporaryPath = `${buildNumberPath}.${process.pid}.tmp`
    fs.writeFileSync(temporaryPath, `${buildNumber}\n`)
    fs.renameSync(temporaryPath, buildNumberPath)
    return buildNumber
  } finally {
    fs.closeSync(lock)
    fs.unlinkSync(lockPath)
  }
}

function formatCommand(command, args) {
  return [command, ...args]
    .map((part) => (/^[A-Za-z0-9_./:@=+-]+$/.test(part) ? part : JSON.stringify(part)))
    .join(' ')
}

function packageExtension({ dryRun = false, outPath, vsceArgs = [] } = {}) {
  const buildNumber = dryRun ? readBuildNumber() + 1 : reserveBuildNumber()
  const version = `${manifest.version}+${buildNumber}`
  const args = [
    'package',
    version,
    '--no-update-package-json',
    ...(outPath ? ['--out', outPath] : []),
    ...vsceArgs,
  ]

  console.log(`> ${formatCommand(vsceCommand, args)}`)
  if (dryRun) return { buildNumber, version }

  const result = spawnSync(vsceCommand, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
  })

  if (result.error) {
    throw new Error(`Could not run vsce: ${result.error.message}`)
  }
  if (result.status !== 0) {
    throw new Error(
      `vsce exited with status ${result.status}. Build number ${buildNumber} was reserved.`
    )
  }

  return { buildNumber, version }
}

if (require.main === module) {
  try {
    const { version } = packageExtension({ vsceArgs: process.argv.slice(2) })
    console.log(`Packaged extension build ${version}.`)
  } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

module.exports = { packageExtension, readBuildNumber }
