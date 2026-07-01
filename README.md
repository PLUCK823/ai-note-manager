# AI Note Manager

这是一个桌面 AI 笔记管理应用项目，已按 `PRD.md` 和 `TECHNICAL_DESIGN.md` 初始化为 Tauri + React + TypeScript + Rust 工程。

第一阶段目标是本地 Markdown 笔记库、SQLite 索引、当前笔记 AI 辅助，以及所有 AI 写入前的预览和确认。

## 技术栈

- Tauri 2
- React 19
- TypeScript
- Rust
- SQLite
- pnpm

## 常用命令

```bash
pnpm install
pnpm dev
pnpm check
pnpm build
```

单独检查：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
pnpm desktop:e2e
pnpm rust:fmt
pnpm rust:lint
pnpm rust:test
```

`pnpm e2e` 是浏览器内的前端 workflow smoke test，会 mock Tauri command/event 边界。
`pnpm desktop:e2e` 会构建带测试 feature 的 Tauri debug binary，启动真实桌面壳和临时 Vite server，并用 embedded WebDriver 验证真实 vault 恢复与 Markdown 文件树渲染。

## 目录

- `src/app`：应用入口、providers、主布局。
- `src/features`：vault、notes、editor、search、settings、ai 等功能模块。
- `src/shared`：通用组件、工具、样式和类型。
- `src-tauri/src/commands`：Tauri command 边界。
- `src-tauri/src/domain`：前后端共享语义的数据模型。
- `src-tauri/src/services`：业务服务层。
- `src-tauri/src/infrastructure`：SQLite、文件系统、AI、系统安全存储等基础设施。

## 产品文档

- `PRD.md`：产品需求文档。
- `TECHNICAL_DESIGN.md`：工程目录、工具链、设计边界、测试和发布流程。
- `NEXT_CHAT_PROMPT.md`：后续继续实现 MVP 时可复用的启动提示词。
