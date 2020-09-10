const fs = require('fs-extra')
const { execCmd, checkDepsChange, pullCode } = require('./utils')

module.exports = async (repo, projectRoot, buildBranch) => {
  try {
    const oldPkg = await fs.readJson(`${projectRoot}/package.json`)
  
    // update code
    await pullCode(projectRoot, buildBranch)
    
    // retrieve configuration
    let deployConfig = {}
    try {
      deployConfig = await fs.readJson(`${projectRoot}/.deployrc.json`)
    } catch (error) {
      console.error(error.message)
      return
    }

    const modified = repo.commits.reduce(
      (prev, cur) => ([...prev, ...cur.modified]),
      []
    )

    let reinstall = false
    if (modified.includes('package.json')) {
      const newPkg = await fs.readJson(`${projectRoot}/package.json`)
      reinstall = checkDepsChange(newPkg, oldPkg)
    }

    // build
    const { buildCmd, deployRoot } = deployConfig
    const cmd = reinstall ? `npm install && ${buildCmd}` : buildCmd
    const { stdout, stderr } = await execCmd(cmd, projectRoot)
    console.log(stdout)
    console.error(stderr)
    
    // deploy
    await fs.copy(`${projectRoot}/dist`, deployRoot)
    console.log(`Done. ${repo.name} has been deployed to ${deployRoot}`)
  } catch (error) {
    console.error(error)
  }
}