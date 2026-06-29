# AI 笔记管理应用技术设计

## 1. 目标

这份文档给下一轮工程实现使用。目标是把技术栈、目录结构、开发命令、设计边界、测试和发布流程提前固定，避免实现时随意选型或把工程做复杂。

第一版只做一个可维护的 MVP：

- 本地 Markdown 笔记库。
- Tauri 桌面应用。
- React + TypeScript 前端。
- Rust 后端命令。
- SQLite 索引和元数据。
- 当前笔记 AI 辅助。
- AI 写入前必须预览和确认。

第一版不引入 Python，不做云同步、多人协作、插件系统、本地大模型或完整 Agent。

## 2. 推荐工具链

### 必装工具

- Node.js LTS。
- pnpm。
- Rust stable。
- Tauri CLI。
- Git。

### 前端工具

- Vite：前端构建和开发服务器。
- React：桌面应用界面。
- TypeScript：类型检查。
- ESLint：代码检查。
- Prettier：格式化。
- Vitest：前端单元测试。
- React Testing Library：组件测试。
- Playwright：端到端测试。
- CodeMirror 6：Markdown 编辑器。
- TanStack Query：管理异步请求状态。
- Zustand：管理轻量 UI 状态。

### Rust/Tauri 工具

- cargo：Rust 构建和测试。
- rustfmt：Rust 格式化。
- clippy：Rust 静态检查。
- serde：前后端数据序列化。
- tokio：异步运行时。
- thiserror：错误建模。
- tracing：日志。
- rusqlite：SQLite 访问，MVP 优先用它，简单直接。
- notify：监听文件变化。
- reqwest：调用 AI API。
- tauri-plugin-dialog：选择本地文件夹。
- tauri-plugin-fs：受控文件访问。
- tauri-plugin-store：保存非敏感设置。
- keyring 或系统安全存储方案：保存 API Key。
- tauri-plugin-updater：后续做自动更新时再启用。

## 3. 初始化建议

下一轮实现时建议使用 Tauri 官方创建方式：

```bash
pnpm create tauri-app ai-note-manager
```

选择：

- package manager：pnpm
- frontend：React
- language：TypeScript

创建后再根据本文档调整目录。不要一开始引入 Next.js，桌面应用 MVP 用 Vite + React 更简单。

## 4. 推荐工程目录

```txt
ai-note-manager/
  README.md
  PRD.md
  TECHNICAL_DESIGN.md
  NEXT_CHAT_PROMPT.md
  package.json
  pnpm-lock.yaml
  tsconfig.json
  vite.config.ts
  eslint.config.js
  prettier.config.js

  src/
    app/
      App.tsx
      providers.tsx
      layout.tsx

    features/
      vault/
        components/
          VaultPicker.tsx
          VaultStatus.tsx
        api.ts
        hooks.ts
        types.ts

      notes/
        components/
          FileTree.tsx
          NoteTabs.tsx
          NoteHeader.tsx
        api.ts
        hooks.ts
        types.ts

      editor/
        components/
          MarkdownEditor.tsx
          MarkdownPreview.tsx
          SaveStatus.tsx
        editorState.ts
        markdown.ts
        types.ts

      ai/
        components/
          AiSidebar.tsx
          AiActionBar.tsx
          AiResultPreview.tsx
          ApplyChangeDialog.tsx
        api.ts
        prompts.ts
        actions.ts
        types.ts

      search/
        components/
          SearchBox.tsx
          SearchResults.tsx
        api.ts
        hooks.ts
        types.ts

      settings/
        components/
          SettingsPage.tsx
          ModelSettings.tsx
          PrivacySettings.tsx
        api.ts
        types.ts

    shared/
      components/
        Button.tsx
        Dialog.tsx
        Sidebar.tsx
        Spinner.tsx
      lib/
        tauri.ts
        result.ts
        dates.ts
      styles/
        globals.css
      types/
        common.ts

  src-tauri/
    Cargo.toml
    tauri.conf.json
    capabilities/

    src/
      main.rs
      app_state.rs
      error.rs

      commands/
        mod.rs
        vault.rs
        notes.rs
        search.rs
        ai.rs
        settings.rs

      domain/
        mod.rs
        vault.rs
        note.rs
        search.rs
        ai.rs
        settings.rs

      services/
        mod.rs
        vault_service.rs
        note_service.rs
        search_service.rs
        ai_service.rs
        settings_service.rs

      infrastructure/
        mod.rs
        db/
          mod.rs
          migrations/
            001_init.sql
        fs/
          mod.rs
        ai/
          mod.rs
        security/
          mod.rs
```

## 5. 分层原则

### 前端

前端按 feature 分组，不按文件类型分组。一个功能的组件、hooks、API 和类型放在同一个 feature 下。

前端职责：

- 展示文件树、编辑器、搜索、AI 侧边栏。
- 管理用户交互和界面状态。
- 调用 Tauri command。
- 展示保存状态、错误、AI 预览和确认弹窗。

前端不做：

- 不直接访问本地文件系统。
- 不直接保存 API Key。
- 不直接把 Markdown 正文写入 SQLite。
- 不绕过 Rust command 调用系统能力。

### Rust

Rust 按 command、service、infrastructure、domain 分层。

Rust 职责：

- 受控读写 Markdown 文件。
- 扫描 vault。
- 建立和更新 SQLite 索引。
- 监听外部文件变化。
- 调用 AI API。
- 保存敏感设置。
- 返回稳定错误码给前端。

Rust command 只做入参校验、调用 service、返回结果。复杂逻辑放到 service。

## 6. 前端状态设计

建议分三类状态：

### 服务器状态

通过 TanStack Query 管理：

- vault 信息。
- 文件树。
- 当前笔记内容。
- 搜索结果。
- 设置读取结果。

### UI 状态

通过 Zustand 管理：

- 当前打开文件路径。
- 当前选中文本。
- AI 侧边栏是否打开。
- 当前主题。
- 当前编辑器布局。

### 编辑器临时状态

由 editor feature 管理：

- 当前未保存内容。
- 保存状态。
- 最近一次磁盘版本信息。
- 外部修改冲突状态。

不要把大段 Markdown 正文放进全局 store。正文优先放在编辑器局部状态中，保存时调用 command。

## 7. Tauri Command 边界

MVP command 建议：

```txt
select_vault() -> VaultInfo
open_recent_vault(path) -> VaultInfo
list_markdown_files(vault_id) -> FileTree
read_note(vault_id, path) -> NoteContent
save_note(vault_id, path, content, base_version) -> SaveResult
create_note(vault_id, parent_path, title) -> NoteInfo
rename_note(vault_id, old_path, new_name) -> NoteInfo
delete_note(vault_id, path) -> DeleteResult
search_notes(vault_id, query) -> SearchResults
get_settings() -> AppSettings
update_settings(input) -> AppSettings
save_api_key(provider, api_key) -> SaveKeyResult
run_ai_action(input) -> AiRunResult
apply_ai_change(input) -> ApplyChangeResult
```

流式 AI 输出优先用 Tauri event：

```txt
run_ai_action 启动请求
Rust 后端逐段 emit ai:chunk
完成时 emit ai:done
失败时 emit ai:error
前端可调用 cancel_ai_action 取消
```

如果下一轮实现发现 event 流式通信成本较高，可以先做非流式响应，但 UI 结构仍保留流式状态。

## 8. SQLite 设计

SQLite 只保存索引、缓存、设置和元数据。Markdown 文件正文仍以本地 `.md` 文件为事实来源。

### vaults

```sql
CREATE TABLE vaults (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_opened_at TEXT
);
```

### notes_index

```sql
CREATE TABLE notes_index (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  modified_at TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  summary TEXT,
  indexed_at TEXT NOT NULL,
  UNIQUE(vault_id, path)
);
```

### notes_fts

```sql
CREATE VIRTUAL TABLE notes_fts USING fts5(
  note_id UNINDEXED,
  title,
  body
);
```

### tags

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(vault_id, name)
);
```

### note_tags

```sql
CREATE TABLE note_tags (
  note_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY(note_id, tag_id)
);
```

### ai_cache

```sql
CREATE TABLE ai_cache (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  action TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

### snapshots

```sql
CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

## 9. 文件读写策略

### 事实来源

Markdown 文件是事实来源。SQLite 中的正文索引可以随时重建。

### 保存流程

1. 前端读取笔记时拿到 `content`、`modified_at`、`content_hash`。
2. 用户编辑后调用 `save_note`，提交 `base_version` 或 `content_hash`。
3. Rust 保存前检查磁盘文件是否被外部修改。
4. 如果未冲突，先写 snapshot，再原子写入文件。
5. 如果冲突，返回 `conflict`，前端展示“覆盖 / 重新加载 / 另存为”。

### 外部修改

使用 `notify` 监听 vault 文件变化：

- 文件新增：更新文件树和索引。
- 文件删除：标记索引失效。
- 文件修改：如果不是应用自己写入，提示当前用户。

## 10. AI 设计

### MVP AI 范围

第一版 AI 默认只读取当前笔记和用户选中文本。

内置动作：

- 总结当前笔记。
- 提取待办。
- 改写选中文本。
- 压缩选中文本。
- 扩写选中文本。
- 建议标题。
- 建议标签。
- 提出改进建议。

### Prompt 约束

AI system prompt 应明确：

- 只能根据提供的笔记内容回答。
- 不知道时说明不确定。
- 不假装读取了未提供文件。
- 不主动删除用户重要内容。
- 输出尽量结构化，适合直接写入 Markdown。
- 写入建议必须以 patch 或明确替换文本形式返回。

### AI 写入策略

AI 输出和文件写入必须分离。

写入流程：

1. AI 生成建议。
2. 前端展示原文、新文和影响范围。
3. 用户点击确认。
4. Rust 创建 snapshot。
5. Rust 写入文件。
6. 前端更新编辑器内容和保存状态。

MVP 可以先不用复杂 diff 算法。改写选中文本时只替换选区；总结和待办可以插入到用户选择的位置。

## 11. API Key 和隐私

API Key 不应保存到普通 JSON 配置中。

MVP 推荐：

- 非敏感设置：使用 Tauri store 或 SQLite。
- API Key：使用系统 keychain/keyring。
- 日志中禁止输出 API Key 和完整笔记正文。

AI 请求前，界面应让用户知道本次会发送的范围：

- 当前笔记。
- 选中文本。
- 后续版本才支持关联笔记或全库检索。

## 12. 错误处理

Rust 返回给前端的错误应稳定，不直接暴露内部错误字符串。

建议错误码：

```txt
vault_not_selected
file_not_found
file_not_markdown
file_read_failed
file_write_failed
file_conflict
db_error
ai_api_key_missing
ai_request_failed
ai_cancelled
permission_denied
unknown
```

前端根据错误码展示用户能理解的文案，并在开发模式下保留调试信息。

## 13. 开发命令

建议 `package.json` 统一脚本：

```json
{
  "scripts": {
    "dev": "tauri dev",
    "build": "tauri build",
    "frontend:dev": "vite",
    "frontend:build": "vite build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "vitest",
    "e2e": "playwright test",
    "rust:fmt": "cargo fmt --manifest-path src-tauri/Cargo.toml",
    "rust:lint": "cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings",
    "rust:test": "cargo test --manifest-path src-tauri/Cargo.toml",
    "check": "pnpm typecheck && pnpm lint && pnpm test && pnpm rust:fmt && pnpm rust:lint && pnpm rust:test"
  }
}
```

## 14. 格式化和检查

每次提交前应运行：

```bash
pnpm format
pnpm check
```

Rust 单独检查：

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

前端单独检查：

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## 15. 测试策略

### 前端单元测试

覆盖：

- 文件树渲染。
- 保存状态。
- AI 预览弹窗。
- 设置页表单。
- 搜索结果展示。

### Rust 单元测试

覆盖：

- Markdown 文件过滤。
- 路径安全校验。
- content hash。
- 保存冲突判断。
- SQLite migration。
- AI prompt 输入构造。

### 端到端测试

使用临时测试 vault，覆盖：

1. 打开测试 vault。
2. 文件树展示 `.md` 文件。
3. 打开一篇笔记。
4. 修改内容并保存。
5. 搜索刚保存的内容。
6. 模拟 AI 输出并展示预览。
7. 确认应用 AI 修改。

MVP 阶段 AI API 可以 mock，不要让 E2E 依赖真实付费 API。

## 16. 发布流程

### 本地发布包

```bash
pnpm build
```

其中 `build` 应执行 `tauri build`。

### CI 建议

GitHub Actions 分三类任务：

1. Pull Request 检查：typecheck、lint、test、cargo fmt、clippy、cargo test。
2. Release 构建：macOS、Windows、Linux 分平台打包。
3. 发布产物：上传到 GitHub Releases。

### 签名和更新

MVP 可以先手动安装，不急着做自动更新。

后续正式分发时再做：

- macOS 签名和 notarization。
- Windows code signing。
- Tauri updater 包签名。

自动更新必须纳入签名流程，不要发布未签名更新包。

## 17. 实现顺序

推荐下一轮按这个顺序做，不要并行摊太大：

1. 初始化 Tauri + React + TypeScript 项目。
2. 配好格式化、lint、typecheck、基础测试命令。
3. 建立前端主布局：左侧文件树、中间编辑器、右侧 AI 侧边栏。
4. 实现选择 vault 和扫描 Markdown 文件。
5. 实现读取、编辑、保存 Markdown。
6. 实现保存状态和外部修改冲突提示。
7. 接入 SQLite，保存 vault、索引和最近打开记录。
8. 实现基础搜索。
9. 实现设置页和 API Key 安全保存。
10. 实现 AI 侧边栏的非写入动作。
11. 实现 AI 写入预览和确认应用。
12. 补齐测试。
13. 本地打包验证。

## 18. MVP 完成标准

满足以下条件才算 MVP 完成：

- 能打开本地 Markdown 文件夹。
- 能浏览、打开、编辑、保存 `.md` 文件。
- 保存失败不会丢失用户编辑内容。
- 能搜索文件名和正文。
- 能配置 AI Key。
- AI 能总结当前笔记和改写选中文本。
- AI 写入前有预览，确认后才写入。
- Markdown 正文仍保存在用户本地文件夹中。
- `pnpm check` 通过。
- `pnpm build` 能生成桌面安装包。

## 19. 官方文档参考

- Tauri 创建项目：https://v2.tauri.app/start/create-project/
- Tauri 前端配置：https://v2.tauri.app/start/frontend/
- Tauri 测试：https://v2.tauri.app/develop/tests/
- Tauri updater：https://v2.tauri.app/plugin/updater/
