const express = require('express')
const app = express()
const path = require('path')
const fs = require('fs-extra')
const { PORT, PROJECTS_ROOT } = require('../config')

app.use(express.json())

app.post('/webhooks/:project/:branch', (req, res) => {
  const repo = {
    name: req.body.project.name,
    url: req.body.project.git_http_url,
    branch: req.body.ref.split('/').pop(),
    commits: req.body.commits
  }

  const buildBranch  = req.params.branch || 'master'
  const projectPath = path.resolve(PROJECTS_ROOT, req.params.project || repo.name)

  if(!fs.pathExistsSync(projectPath)) {
    return res.status(404).send(`project '${req.params.project}' was not found.`)
  }

  if (repo.branch === buildBranch) {
    res.send('build and deploy!')
    if (repo.name === 'linkTree') {
      require('./device-cloud-hook')(repo, projectPath, buildBranch)
    } else {
      require('./hook')(repo, projectPath, buildBranch)
    }
  } else {
    res.status(400).send('The push branch does not match the build branch.')
  }
}) 

app.listen(
  PORT,
  () => console.log(`webhooks server is running at port ${PORT}...`)
)