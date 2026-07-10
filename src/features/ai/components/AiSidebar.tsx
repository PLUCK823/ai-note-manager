import { Bot, PanelLeftClose, PanelRightClose, ShieldCheck } from "lucide-react";

import { AiActionBar } from "./AiActionBar";
import { AiResultPreview } from "./AiResultPreview";
import { ApplyChangeDialog } from "./ApplyChangeDialog";
import { Button } from "../../../shared/components/Button";

export function AiSidebar({
  edge = "right",
  onCollapse,
}: {
  edge?: "left" | "right";
  onCollapse?: () => void;
}) {
  return (
    <aside
      className="ai-sidebar"
      data-edge={edge}
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
        {onCollapse ? (
          <Button
            type="button"
            variant="ghost"
            aria-label={`Collapse ${edge} sidebar`}
            onClick={onCollapse}
          >
            {edge === "left" ? (
              <PanelLeftClose size={18} aria-hidden="true" />
            ) : (
              <PanelRightClose size={18} aria-hidden="true" />
            )}
          </Button>
        ) : null}
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
