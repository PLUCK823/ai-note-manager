import { FileText, PanelRight, Search, Settings } from "lucide-react";

import { AiSidebar } from "../features/ai/components/AiSidebar";
import { MarkdownEditor } from "../features/editor/components/MarkdownEditor";
import { MarkdownPreview } from "../features/editor/components/MarkdownPreview";
import { SaveStatus } from "../features/editor/components/SaveStatus";
import { FileTree } from "../features/notes/components/FileTree";
import { NoteHeader } from "../features/notes/components/NoteHeader";
import { NoteTabs } from "../features/notes/components/NoteTabs";
import { SearchBox } from "../features/search/components/SearchBox";
import { SettingsPage } from "../features/settings/components/SettingsPage";
import { VaultPicker } from "../features/vault/components/VaultPicker";
import { VaultStatus } from "../features/vault/components/VaultStatus";
import { Button } from "../shared/components/Button";

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="vault-pane" aria-label="Vault navigation">
        <div className="brand-bar">
          <div>
            <p className="eyebrow">Local Markdown</p>
            <h1>AI Note Manager</h1>
          </div>
          <Button type="button" variant="ghost" aria-label="Settings">
            <Settings size={18} aria-hidden="true" />
          </Button>
        </div>
        <VaultPicker />
        <VaultStatus />
        <SearchBox />
        <FileTree />
      </aside>

      <main className="workspace" aria-label="Note workspace">
        <NoteTabs />
        <NoteHeader />
        <section className="editor-grid" aria-label="Editor and preview">
          <div className="editor-surface">
            <div className="surface-toolbar">
              <span className="toolbar-title">
                <FileText size={16} aria-hidden="true" />
                Markdown
              </span>
              <SaveStatus />
            </div>
            <MarkdownEditor />
          </div>
          <MarkdownPreview />
        </section>
      </main>

      <AiSidebar />

      <footer className="status-bar" aria-label="Application status">
        <span>
          <Search size={14} aria-hidden="true" />
          SQLite index idle
        </span>
        <span>
          <PanelRight size={14} aria-hidden="true" />
          AI reads current note only
        </span>
      </footer>

      <SettingsPage />
    </div>
  );
}
