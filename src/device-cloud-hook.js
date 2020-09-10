const fs = require('fs-extra')
const path = require('path')
const { execCmd, checkDepsChange, pullCode } = require('./utils')

function getModules (files) {
  return files
    .filter(file => file.includes('/'))
    .map(file => file.split('/').shift())
}

function getPkgChangedModules (files) {
  return files
    .filter(file => file.includes('package.json'))
    .map(file => file.split('/').shift())
}

function getModuleDeps (modules, projectRoot) {
  return modules.reduce((prev, cur) => {
    const pkg = fs.readJsonSync(path.resolve(projectRoot, `${cur}/package.json`))
    prev[cur] = {
      dependencies: pkg.dependencies,
      devDependencies: pkg.devDependencies
    }
    return prev
  }, {})
}

module.exports = async (repo, projectRoot, buildBranch) => {
  try {
    const { modified, added, removed } = repo.commits.reduce((prev, cur) => ({
      modified: [...prev.modified, ...cur.modified],
      added: [...prev.added, ...cur.added],
      removed: [...prev.removed, ...cur.removed],
    }), {
      modified: [],
      added: [],
      removed: []
    })

    // 所有变动的模块
    const allModuels = [
      ...new Set([
        ...getModules(modified),
        ...getModules(added),
        ...getModules(removed)
      ])
    ]

    // 没有模块更新，直接退出
    if (!allModuels.length) {
      console.log('No modules have changed.')
      return 
    }

    // package.json 变动的模块
    const pkgChangedModules = [
        ...new Set([
        ...getPkgChangedModules(modified),
        ...getPkgChangedModules(added)
      ])
    ]

    let reinstallModules = []
    if (pkgChangedModules.length) {
      const oldDeps = getModuleDeps(pkgChangedModules, projectRoot)
      // 更新代码 
      await pullCode(projectRoot, buildBranch)
      const newDeps = getModuleDeps(pkgChangedModules, projectRoot)
      // 需要重新安装依赖的模块
      reinstallModules = pkgChangedModules.filter(module => {
        return checkDepsChange(newDeps[module], oldDeps[module])
      })
    } else {
      // 更新代码 
      await pullCode(projectRoot, buildBranch)
    }

    // 获取部署配置
    let deployConfig
    try {
      deployConfig = await fs.readJson(path.resolve(projectRoot, '.deployrc.json'))
    } catch (error) {
      // 不存在配置文件，直接退出
      console.error(error.message)
      return
    }

    const { modulePath, buildCmd, deployRoot } = deployConfig

    if (reinstallModules.length) {
      // 直接构建的模块
      const directBuildModules = allModuels.filter(module => {
        return !reinstallModules.includes(module)
      })
      build_deploy(directBuildModules, buildCmd)
      build_deploy(reinstallModules, `npm install && ${buildCmd}`)
    } else {
      build_deploy(allModuels, buildCmd)
    }

    function build_deploy (modules, cmd) {
      modules.forEach(async module => {
        const buildPath = path.resolve(projectRoot, module)
        const deployPath = path.resolve(deployRoot, modulePath[module])
        const { stdout, stderr } = await execCmd(cmd, buildPath)
        console.log(stdout)
        console.error(stderr)
        await fs.copy(`${buildPath}/dist`, deployPath)
        console.log(`Done. '${module}' has been deployed to ${deployPath}`)
      })
    }
  } catch (error) {
    console.error('ERROR:', error.message)
  }
}