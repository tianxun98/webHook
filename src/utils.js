const child_process = require('child_process')
const { promisify } = require('util')
const exec = promisify(child_process.exec)

function execCmd(cmd, execPath) {
  return exec(execPath ? `cd ${execPath} && ${cmd}` : cmd)
}

function checkDepsChange (newPkg, oldPkg) {
  const depsChanged = Object.keys(newPkg.dependencies).some(key => {
    return newPkg.dependencies[key] !== oldPkg.dependencies[key]
  })
  const devDepsChanged = Object.keys(newPkg.devDependencies).some(key => {
    return newPkg.devDependencies[key] !== oldPkg.devDependencies[key]
  })
  return depsChanged || devDepsChanged
}

async function pullCode (projectPath, branch) {
  const { stdout, stderr } = await execCmd(
    `git checkout ${branch} && git pull`, projectPath
  )
  console.log(stdout)
  console.error(stderr)
}

module.exports = {
  execCmd,
  checkDepsChange,
  pullCode
}