---
title: "工程化:基于yarn和lerna的workspace工作流"
date: "2020-01-11"
---

monorepo 管理代码有众多好处，但是也带来了很多的技术上的挑战，github 上的很多的项目都是使用 lerna 管理 monorepo 项目，我们探讨下在 gitlab 上也通过 lerna 和 yarn workspace 结合来管理项目。

由于 yarn 和 lerna 在功能上有较多的重叠,我们采用 yarn 官方推荐的做法,用 yarn 来处理依赖问题，用 lerna 来处理发布问题。能用 yarn 做的就用 yarn 做吧

![img](https://internal-api.feishu.cn/space/api/file/out/wVfmeudg8d9QxzecojbYnoLn3mzFFGDfUhcaa7Nq237GqDJ4Da/)

一个非 monorepo 的普通项目，常见的开发流程如下，对于 monorepo 项目却可能存在各个问题

## 搭建环境

主要指安装依赖

- 普通项目：clone 下来后通过 yarn install,即可搭建完项目，有时需要配合 postinstall hooks,来进行自动编译，或者其他设置。

- monorepo: 各个库之间存在依赖，如 A 依赖于 B，因此我们通常需要将 B link 到 A 的 node_module 里，一旦仓库很多的话，手动的管理这些 link 操作负担很大，因此需要自动化的 link 操作，按照拓扑排序将各个依赖进行 link

- 解决方式：

通过使用 workspace，yarn install 会自动的帮忙解决安装和 link 问题（<https://github.com/lerna/lerna/issues/1308>）

```
$ yarn install # 等价于 lerna bootstrap --npm-client yarn --use-workspaces
```

## 清理环境

在依赖乱掉或者工程混乱的情况下，清理依赖

- 普通项目： 直接删除 node_modules 以及编译后的产物。

- monorepo： 不仅需要删除 root 的 node_modules 的编译产物还需要删除各个 package 里的 node_modules 以及编译产物

- 解决方式：使用 lerna clean 来删除所有的 node_modules，使用 yarn workspaces run clean 来执行所有 package 的清理工作

```
$ lerna clean # 清理所有的node_modules
$ yarn workspaces run clean # 执行所有package的clean操作
```

## 安装|删除依赖

普通项目： 通过 yarn add 和 yarn remove 即可简单姐解决依赖库的安装和删除问题

monorepo: 一般分为三种场景

- 给某个 package 安装依赖：yarn workspace packageB add packageA 将 packageA 作为 packageB 的依赖进行安装

- 给所有的 package 安装依赖: 使用 yarn workspaces add lodash 给所有的 package 安装依赖

- 给 root 安装依赖：一般的公用的开发工具都是安装在 root 里，如 typescript,我们使用 yarn add -W -D typescript 来给 root 安装依赖

对应的三种场景删除依赖如下

```
yarn workspace packageB remove packageA
yarn workspaces remove lodash
yarn remove -W -D typescript
```

> 对于安装 local dependency，yarn 的实现暂时有 bug，第一次安装需要指明版本号，否则会安装失败如下

> 如果 ui-button 没有发布到 npm 则

> yarn workspace ui-form add ui-button 会安装失败，但是

> yarn workspace ui-form add ui-button@1.0.0 会成功 ，详情见 <https://github.com/yarnpkg/yarn/issues/3973>

## 项目构建

普通项目：建立一个 build 的 npm script，使用 yarn build 即可完成项目构建

monorepo:区别于普通项目之处在于各个 package 之间存在相互依赖，如 packageB 只有在 packageA 构建完之后才能进行构建，否则就会出错，这实际上要求我们以一种拓扑排序的规则进行构建。

我们可以自己构建拓扑排序规则，很不幸的是 yarn 的 workspace 暂时并未支持按照拓扑排序规则执行命令,虽然该 [rfc](https://github.com/yarnpkg/rfcs/blob/master/accepted/0000-workspace-run-commands.md)已经被 accepted，但是尚未实现

![img](https://internal-api.feishu.cn/space/api/file/out/rRtALs4tDElwW84akByenP3IxLw6mVu62cFBf73fwHz4ekOKHq/)

幸运的是 lerna 支持按照拓扑排序规则执行命令, --sort 参数可以控制以拓扑排序规则执行命令

```
lerna run --stream --sort build
```

## 项目测试

普通项目： 建立一个 test 的 npm script 即可

monorepo 项目：有两种方式

- 使用统一的 jest 测试配置这样方便全局的跑 jest 即可，好处是可以方便统计所有代码的测试覆盖率，坏处是如果 package 比较异构（如小程序，前端，node 服务端等），统一的测试配置不太好编写

- 每个 package 单独支持 test 命令，使用 yarn workspace run test，坏处是不好统一收集所有代码的测试覆盖率

## 版本升级及发包

项目测试完成后，就涉及到版本发布，版本发布一般涉及到如下一些步骤

### 条件验证

如验证测试是否通过，是否存在未提交的代码，是否在主分支上进行版本发布操作，以及其他条件

> 更加严苛的一些验证操作可以通过 danger.js,如 rxjs <https://github.com/ReactiveX/rxjs/blob/master/dangerfile.js>

### version_bump

发版的时候需要更新版本号，这时候如何更新版本号就是个问题，一般大家都会遵循 [semVer 语义](https://semver.org/lang/zh-CN/)，如果版本之间的提交记录较少，能够较为容易的手动更新版本好，但这样也存在人为失误的可能，更好的办法是根据 git 的提交记录自动更新版本号，实际上只要我们的 git commit message 符合 [Conventional commit 规范](https://www.conventionalcommits.org/zh/v1.0.0-beta.2/)，即可通过工具根据 git 提交记录，更新版本号，简单的规则如下

- 存在 feat 提交： 需要更新 minor 版本

- 存在 fix 提交： 需要更新 major 版本

- 存在**BREAKING CHANGE**提交： 需要更新大版本

### 生成 changelog

为了方便查看每个 package 每个版本解决了哪些功能，我们需要给每个 package 都生成一份 changelog 方便用户查看各个版本的功能变化。同理只要我们的 commit 记录符合 [conventional commit 规范](https://www.conventionalcommits.org/zh/v1.0.0-beta.2/)，即可通过工具为每个 package 生成 changelog 文件

### 生成 git tag：

为了方便后续回滚问题及问题排查通常需要给每个版本创建一个 git tag

### git 发布版本：

每次发版我们都需要单独生成一个 commit 记录来标记 milestone

### 发布 npm 包：

发布完 git 后我们还需要将更新的版本发布到 npm 上，以便外部用户使用

我们发现手动的执行这些操作是很麻烦的且及其容易出错，幸运的是 lerna 可以帮助我们解决这些问题

> yarn 官方并不打算支持发布流程，只是想做好包管理工具，因此这部分还是需要通过 lerna 支持

![img](https://internal-api.feishu.cn/space/api/file/out/yIgnMYTi1A9jHyaCbGS5XHwcbJQ2ByYg5G4cyPQWH1ZzjhfyHd/)

lerna 提供了 publish 和 version 来支持版本的升级和发布

publish 的功能可以即包含 version 的工作，也可以单纯的只做发布操作。

### lerna version

lerna version 的作用是进行 version bump,支持手动和自动两种模式

只发布某个 package

不支持，lerna 官方不支持仅发布某个 package，见 <https://github.com/lerna/lerna/issues/1691>，如果需要，只能自己手动的进入 package 进行发布，这样 lerna 自带的各种功能就需要手动完成且可能和 lerna 的功能相互冲突

由于 lerna 会自动的监测 git 提交记录里是否包含指定 package 的文件修改记录，来确定版本更新，这要求设置好合理的 ignore 规则（否则会造成频繁的，无意义的某个版本更新），好处是其可以自动的帮助 package 之间更新版本

例如如果 ui-form 依赖了 ui-button，如果 ui-button 发生了版本变动，会自动的将 ui-form 的对 ui-button 版本依赖更新为 ui-button 的最新版本。 如果 ui-form 发生了版本变动，对 ui-button 并不会造成影响。

### 自动选择发布版本

使用--conventional-commits 参数会自动的根据 conventional commit 规范和 git commit message 记录帮忙确定更新的版本号。

```
lerna version --conventional-commits
```

自动确立了如下版本更新

![img](https://internal-api.feishu.cn/space/api/file/out/tIMLlykmeAtwfODe2fY9yWERaFkRAkcU5W6NazjeH3m3xHcCXc/)

> 经测试 version_bump 是依赖于文件检测和 subject 结合，并不依赖于 scope，scope 的作用是用来生成 changelog 的吧，即如果是修改了 ui-form 的文件，但是 commit 记录写的是 fix(ui-button)，lerna 是会生成 ui-form 的版本更新，并不会去更新 ui-button 的版本

### 手动选择发布版本

如果 git commit message 发现不太靠谱，且无法修改的话，那么需要手动的确认新版本，version 默认是手动选择版本

```
lerna version
```

![img](https://internal-api.feishu.cn/space/api/file/out/6sWDvXwyUSd3ZpiMMS7oR4gvLswQIk4xZ3KVvOCVD9ZvBSt9xE/)

> version 成功后会自动的推送到主分支，我一般是关闭主分支的推送权限的，这样就会导致推送失败，但是暂时没找到如何禁止推送主分支的好办法，使用--no-push 会把 tag 推送一起禁止掉，好在禁止推送主分支只会报错，但不影响整个流程

> lerna version 自动生成的提交格式为“ publish xxx",并不符合 conventional-commit 规范，因此需要加以修改，我们通过 message 参数可以修改自动生成的提交记录

```
// lerna.json
{
  "packages": [
    "packages/*"
  ],
  "version": "independent",
  "npmClient": "yarn",
  "command": {
    "publish": {
      "ignoreChanges": ["*.md"],
      "verifyAccess": false,
      "verifyRegistry": false,
      "message":"chore: publish" // 自定义version生成的message记录
    }
  }
}
```

### changelog.md

version 完成后会自动生成[changelog.md](http://www.changelog.md)，但是由于 lerna 是根据什么规则来生成 changelog 的规则尚不清楚，现在发现 A 库的 changlog 里可能包含 B 的 commit 记录，具体原因待查

![img](https://internal-api.feishu.cn/space/api/file/out/SRHH0nqCCutBQs5FA6CaRvOXObPC2uJidW4KluhYBQX9kLrMBR/)

lerna publish

git vesion_bump 完成后，就可以根据 version 生成的 tag 进行 npm 发包了

```
lerna publish from-git
```

> 这里没使用 from-package 是因为每次用 from-package 都会在 package.json 里生成个 gitHead 字段，来关联 package 和 git 记录，造成文件被修改，需要手动的 checkout 或者提交掉，暂时没找到方法禁掉这个修改

> 内网使用 lerna 进行 publish 的时候需要配置 registry 和设置--no-verify-access --no-verify-registry 参数

# 示例

完整的 demo 地址 https://github.com/hardfist/monorepo-starter

我们通过一个简单的项目来演示上述操作

### 创建项目

新建项目&&安装 lerna&& 初始化 lerna

```
mkdir monorepo-template && cd monorepo-template && yarn init -y && yarn add -D lerna && lerna init && mkdir packages
```

lerna 配置使用 yarn workspaces, 使用 independent 模式（根据需求选择是否使用 independent)

```
// lerna.json
{
  "packages": ["packages/*"], // 配置package目录
  "version": "independent",
  "npmClient": "yarn",
  "useWorkspaces": true // 使用yarn workspaces
}
```

配置 package.json 使用 yarn workspacess

```
// package.json
{
  "name": "monorepo-template",
  "private": true, // root禁止发布
  "workspaces": [ // 配置package目录
     "packages/*"
  ]
}
```

## 创建 package

创建 ui-lib 模块

初始化 ui-button 模块

```
cd packages && mkdir ui-lib && yarn init -y
```

配置

```
// package.json
{
 "name": "ui-button",
 "version": "1.0.0",
 "main": "index.js",
 "publishConfig": {
   "access": "publish" // 如果该模块需要发布，对于scope模块，需要设置为publish，否则需要权限验证
  }
}
```

### 创建 ui-app 模块

同上,或者使用 lerna create 快速创建 package

```
lerna create ui-app -y
```

将 ui-lib 作为 ui-app 的依赖

```
yarn workspace ui-app add ui-lib/1.0.0 # 这里必须加上版本号，否则报错
```

将 lodash 添加为所有 package 的依赖(不包含 root）

```
yarn workspaces run add lodash
```

将 typescript 设置为 root 的开发依赖

一般 root 只包含一些开发工具依赖如 webpack，babel，typescript 等

```
yarn add -W -D typescript jest
```

### 构建和测试

为 ui-lib 和 ui-app 添加 build 和 test 和 clean 脚本

- ui-lib

```
packages/ui-lib/package.json
{
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "clean": "rimraf lib"
  },
}
```

- ui-app

```
packages/ui-app/package.json
{
    "scripts": {
    "test": "echo success", // 如果对应脚本无事可做，可以直接echo success
    "build": "tsc",
    "clean": "rimraf lib"
  },
}
```

在 root 里添加 build、test 和 clean 脚本

```
"scripts": {
    "build": "lerna run --stream --sort build", // 按照拓扑依赖进行构建
    "clean": "yarn workspaces run clean", // 彼此独立，可以并行执行
    "test": "yarn workspaces run test" // 彼此独立可以并行执行
  },
```

### 添加 conventional-commit 支持

lerna 的 version_bump 和 changelog 生成都依赖于 conventional-commit，因此需要保证 commit-msg 符合规范。

添加@commitlint/cli 和@commitlint/config-conventional 以及 husky

```
yarn add -W -D @commitlint/cli @commitlint/conventional-commit lint-staged husky
```

配置 commitlint

```
// commmitlint.config.js
module.exports = {
  extends: [
    "@commitlint/config-conventional"
  ]
};
```

配置 commit-msg 的 hooks

```
  "husky": {
    "hooks": {
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  }
```

## 发版

开发测试通过后，每隔一段时间即可发版，我们使用 lerna version 来做发版

配置发版的 message

```
// lerna.json
  {
  "packages": ["packages/*"],
  "version": "independent",
  "npmClient": "yarn",
  "useWorkspaces": true,
  "command": {
    "publish": {
      "ignoreChanges": ["*.md"], // md文件更新，不触发版本变动
      "verifyAccess": false, // 内网发包需开启
      "verifyRegistry": false, // 内网发包需开启
      "message": "chore: publish" // 修改默认的publish的commit msg
    }
  }
}
```

``

配置发版的策略,我们积极 convention-commit 来发版

```
// package.json
{
  "scripts":
  {
    version: "lerna version --conventional-commits" ## 生成changelog文件以及根据commit来进行版本变动
  }
}
```

发版

```
$ yarn run version # 不要使用 yarn version,yarn version 是yarn自动的命令不是npm script
```

这个会提示用户输入版本，如果不想这个提示可以关闭

```
// package.json
{
  "scripts":
  {
     version: "lerna version --conventional-commits --yes" ## 生成changelog文件以及根据commit来进行版本变动,不提示用户输入版本
  }
}
```

``

### 发包

发版成功后既可以发包，使用 lerna publish 即可发包

```
$ lerna publish from-git
```

# 常见问题

- 非 fix|feat 提交也会造成 version_bump

见 <https://github.com/lerna/lerna/issues/1425> 原因是 conventional-changelog 造成的，讨论见 <https://github.com/conventional-changelog/standard-version/issues/163> 这可能造成很多的 patch version，如果在乎这个可以使用 canary release

- 我想只测试发生变动的 package 怎么办？
