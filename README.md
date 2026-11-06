# knowledge-game-templates

在线测试游戏生成平台（[knowledge.feiyumdm.cn](https://knowledge.feiyumdm.cn)）的**游戏模板市场**仓库。

## 结构

```
templates/
  index.json          # 市场清单（权威数据源，平台市场页/生成向导从这里读取）
  {code}/             # 每个模板一个目录（入口 index.html + 静态文件）
  shared/             # 各模板共用的协议脚本（模板内以 ../shared/protocol.js 引用）
  fallback/           # 兜底模板
```

## 上架流程（投稿 → 审核 → 上架）

1. 创作者在平台「模板市场 → 投稿」上传 zip 包
2. 平台自动：基于 main 新建分支 `submit/{code}-{时间戳}` → 上传模板文件 → 更新 `templates/index.json` → 创建 Pull Request
3. 管理员在 GitHub 上 review，**合并 PR 即完成上架**，平台市场页自动出现新模板

## 手动投稿（可选）

也可以直接向本仓库提 PR：
- 新建目录 `templates/{code}/`，放入 `index.html` 及静态文件
- 在 `templates/index.json` 的 `templates` 数组中追加条目（`isOfficial: false`，`author` 填你的名字）
- PR 描述里写清模板玩法与适配题型
