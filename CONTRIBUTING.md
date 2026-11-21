# 开发协作

## 派发与接手

Issue 是任务主记录。创建者写明目标、范围和验收条件，用 Assignee 或任务正文指明负责人。需要 AI 执行时，在选定项目的聊天中给出 Issue 链接并明确派发。Issue 创建本身不会启动 AI。需要看板时可用 GitHub Projects 展示状态。

## 本地任务目录

在存放各项目仓库的父目录下共用一个 `_tasks/`。用主 Issue 所属的项目和编号定位任务，参与的每个仓库各占一个子目录。构建包、日志和验收回执统一放在同级 `output/`。例如，`my-app` 的 Issue #42 同时修改产品和构建工具时，目录如下。

```text
_tasks/my-app/issue-42/
├── my-app/       产品仓库的工作树
├── build-tools/  构建工具仓库的工作树
└── output/       两个仓库共用的任务产物目录
```

从 `my-app` 主检出根目录执行以下命令。先查看已有 PR 和工作树，接续已有任务时复用对应工作树。

```sh
git status --short --branch
git worktree list
git fetch origin
mkdir -p ../_tasks/my-app/issue-42/output
git worktree add -b codex/42-config-validation ../_tasks/my-app/issue-42/my-app origin/main
cd ../_tasks/my-app/issue-42/my-app
```

人工任务可使用 `feat/42-描述` 或 `fix/42-描述`。同一任务换人接手时先确认已有分支和提交。

## 提交

在仓库根目录执行 `git config --local commit.template .gitmessage` 启用编辑器模板。每次提交聚焦一项可解释的修改，标题写出具体变化。任务提交在正文使用 `Refs #42` 关联 Issue。示例提交消息如下。

```text
补充配置缺失时的错误提示

缺少必填项时报告字段名，方便定位输入错误。

Refs #42
```

检查 diff，显式暂存本任务文件，验证后推送任务分支。不要在提交信息、日志或 Issue 中放入敏感值。

## 多分支整合（按需）

集中合并多个来源时，在整合 PR 中注明目标分支和起始提交，再填写来源清单。

| 来源分支及提交 SHA | 原 PR | 处理结果（本次纳入 / 此前已纳入 / 暂缓） | 冲突取舍及核对证据 |
| --- | --- | --- | --- |

对已 squash 合入的来源，核对原 PR、主线合并记录和最终差异。遇到冲突时记录保留了双方哪些行为，以及在整合后的提交上如何验证。引用历史验证时注明原提交和适用环境。

## 评审、合入与交接

PR 填写目标、影响、实际验证结果和回退方式。整项任务满足验收时使用 `Closes #42`，部分交付使用 `Refs #42`。由非作者审核，按项目约定决定合并。CODEOWNERS 中填写有权限的真实审核人，然后根据仓库权限配置主分支规则和必需检查。

若需中途交接，在 Issue 或 PR 留下分支、提交、已完成内容、已跑检查、未验证项和下一步。项目级变化写入 [当前状态](docs/status.md)，长期决定按 [ADR 模板](docs/adr/TEMPLATE.md) 记录。各仓库 PR 合并后，逐个确认主线包含变更，检查工作树干净且本地文件已妥善保存，再从对应仓库用 `git worktree remove <工作树路径>` 移除工作树。保留 `output/` 中的验收证据。若将产物迁入归档目录，先核对文件与摘要，更新 Issue、PR 和交接记录中的路径，再清理旧位置。发布与现场验收各自记录版本、批准人和结果。

有交付物时，将源提交与实际受测的产物版本或摘要一起记录。缺陷修复尽量在同一环境使用同一组步骤对照旧版和修复版。若实测条件不同，说明结论适用于哪个版本和环境。

## 同步模板规则

每次 `git fetch`、`git pull` 或其他同步代码的动作完成后运行 `python tooling/check_template_updates.py`。`.template-source.json` 记录模板仓库、分支和当前规则版本。检查报告 `TEMPLATE_RULE_UPDATE_AVAILABLE` 时，打开模板仓库的变更，判断哪些规则适用于当前项目，再通过 Issue 和 PR 移植。模板规则不能自动覆盖项目自己的修改。

检查需要访问模板仓库。私有模板源使用当前 GitHub CLI 登录状态，或设置 `TEMPLATE_GITHUB_TOKEN`、`GH_TOKEN` 或 `GITHUB_TOKEN`。如果当前环境不能访问源仓库，检查会报告 `TEMPLATE_RULE_CHECK_UNAVAILABLE`。需要把检查作为门禁时使用 `python tooling/check_template_updates.py --strict`。

延期验收时在原 Issue 记录阻塞判断、跟踪 Issue、责任人和补验里程碑。原验收条件仍未满足时使用 `Refs` 保留原任务；经明确决定调整范围时，记录决定人及后续任务。排障中途换人按 [交接与恢复](docs/HANDOFF.md) 留下可复现的下一步。
