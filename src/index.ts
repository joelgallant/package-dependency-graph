import minimist from 'minimist'
import * as fs from 'fs'
import * as util from 'util'

import { collectDependencies } from './collect'
import { toDotFile } from './dot'
import { checkDependencies } from './check'

import * as packageJson from '../package.json'

let suppressError: boolean | undefined = false

function showToolVersion() {
  console.log(`Version: ${packageJson.version}`)
}

const writeFileAsync = util.promisify(fs.writeFile)

async function executeCommandLine() {
  const argv = minimist(process.argv.slice(2), { '--': true }) as unknown as {
    v?: boolean
    version?: boolean
    suppressError?: boolean
    root?: string
    ['exclude-node_modules']?: boolean
    debug?: boolean
    check?: boolean
    dot?: boolean
  }

  const showVersion = argv.v || argv.version
  if (showVersion) {
    showToolVersion()
    return
  }

  suppressError = argv.suppressError

  const dependencies = await collectDependencies(argv.root || '.', argv['exclude-node_modules'])
  if (argv.debug) {
    console.info(dependencies)
  }

  if (argv.check) {
    const result = checkDependencies(dependencies)
    if (Object.keys(result).length > 0) {
      console.info(result)
      throw new Error('There are unnecessary dependencies.')
    }
  }

  const dot = toDotFile(dependencies)
  if (argv.dot && typeof argv.dot === 'string') {
    await writeFileAsync(argv.dot, dot)
  } else if (argv.debug) {
    console.info(dot)
  }
}

executeCommandLine().then(() => {
  console.log(`package-dependency-graph success.`)
}, (error: Error) => {
  if (error instanceof Error) {
    console.log(error.message)
  } else {
    console.log(error)
  }
  if (!suppressError) {
    process.exit(1)
  }
})
