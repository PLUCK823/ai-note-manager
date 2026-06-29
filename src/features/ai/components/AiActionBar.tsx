import { Sparkles } from "lucide-react";

import { aiActions } from "../actions";

export function AiActionBar() {
  return (
    <div className="ai-actions" aria-label="AI actions">
      {aiActions.map((action) => (
        <button className="ai-action" key={action.id} type="button">
          <Sparkles size={14} aria-hidden="true" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
