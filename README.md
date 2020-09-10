# 前端项目自动构建部署工具

## 服务器端配置
#### 准备工作
1. 确保服务器上已安装好 **node** 和 **git**，并配置好环境变量。
2. 由于内部服务器无法访问外网，需要将 **npm** 镜像设置为 midea 的镜像：

    ```sh
    npm config set registry http://npm.midea.com:7001/
    ```
3. 该工具使用 **pm2** 来管理 node 进程，需要在服务器上全局安装 **pm2**：

    ```sh
    npm install -g pm2
    ```
    
#### 安装和运行 hooks 服务

```sh
git clone http://git.meicloud.com/yangss5/webhooks-auto-deploy.git
cd webhooks-auto-deploy
npm install
npm start
```
hook server 会在后台运行，并默认监听 12345 端口上的 hook 事件。

#### 克隆项目到服务器本地
hook server 默认将 `/apps/front-build` 作为构建项目的根目录。请将你需要自动构建和部署的项目克隆到该路径下，并安装好项目依赖：
```sh
cd /apps/front-build
git clone http://git.meicloud.com/MIoT/IoT/Cloud/frontend/linkTree.git device-cloud
cd device-cloud
npm install
```
> 注意：请务必为项目配置好 git 凭据，确保本地仓库可免密与远程仓库通信。

你也可以更改这个构建根目录，只要修改 webhooks-auto-deploy 根目录下的 `config.js` 文件，并重新启动 hooks 服务即可：

修改 webhooks-auto-deploy/config.js
```
module.exports = {
   PORT: 12345,
-- PROJECT_ROOT: '/apps/front-build',
++ PROJECT_ROOT: '/your/build/root',
}
```
重启 hooks 服务：
```sh
pm2 restart webhooks
```
## Gitlab 远程仓库配置
为远程仓库添加 webhooks

进入需要配置的仓库主页，依次选择 Settings -> Integrations

在 URL 一栏填写你的 webhooks 服务地址，格式为：`http://[ip]:[port]/webhooks/[project]/[branch]`。

其中：
- ip：你的 webhooks 服务所在服务器的 ip 地址。
- port：webhooks 服务运行的端口。
- project：项目名称，必须与该项目在服务器上的本地仓库所在的文件夹名相同。不提供默认为该远程仓库名。
- branch：建分支，指定项目在哪个分支进行构建，如果推送的分支与该指定分支不匹配，构建过程将被忽略。不提供默认为 master 分支。

例如要为远程仓库 `http://git.meicloud.com/MIoT/IoT/Cloud/frontend/linkTree` 添加自动构建部署服务，假设部署服务器的 ip 地址为 `10.17.162.100`，hooks 服务运行在 `12345` 端口， 服务器上项目仓库文件夹名为 `device-cloud`，项目构建分支为 `develop` 分支。那么在 webhooks 的 URL一栏应填写：`http://10.17.162.100:12345/webhooks/device-cloud/develop`。如果忽略 `[project]` 和 `[branch]`，只填写 `http://10.17.162.100:12345/webhooks`，则等同于 `http://10.17.162.100:12345/webhooks/linkTree/master`。

填写 URL 后，勾选 trigger 事件为 "Push events"（默认勾选），然后点击下面的 "Add webhook" 按钮，即为该项目配置好一个 webhook。

后面只要该仓库接收到 push 提交，该 webhook 就会触发，并向上面的 URL 发起一个 post 请求。

## 本地开发仓库配置
在你的本地开发仓库的根目录下添加 `.deployrc.json` 配置文件，只需简单配置两个字段即可：

```json
{
  "deployRoot": "/apps/www/front/device-cloud",
  "buildCmd": "npm run build"
}
```
`deployRoot` 是该项目打包后部署在服务器上的路径， `buildCmd` 是打包命令

配置好 `.deployrc.json` 文件后，需要将其提交到你要进行自动构建的那个分支，并 push 到远程仓库。