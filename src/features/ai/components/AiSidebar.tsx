import { Bot, ShieldCheck } from "lucide-react";

import { AiActionBar } from "./AiActionBar";
import { AiResultPreview } from "./AiResultPreview";
import { ApplyChangeDialog } from "./ApplyChangeDialog";

export function AiSidebar() {
  return (
    <aside
      className="ai-sidebar"
      role="complementary"
      aria-label="AI assistant"
    >
      <header className="panel-header">
        <div>
          <p className="eyebrow">Current note only</p>
          <h2>
            <Bot size={18} aria-hidden="true" />
            AI assistant
          </h2>
        </div>
      </header>
      <AiActionBar />
      <AiResultPreview />
      <div className="privacy-note">
        <ShieldCheck size={16} aria-hidden="true" />
        Writes require preview and confirmation.
      </div>
      <ApplyChangeDialog />
    </aside>
  );
}
