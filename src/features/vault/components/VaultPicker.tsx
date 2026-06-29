import { FolderOpen } from "lucide-react";

import { Button } from "../../../shared/components/Button";

export function VaultPicker() {
  return (
    <Button type="button" variant="primary" className="wide-button">
      <FolderOpen size={16} aria-hidden="true" />
      Open vault
    </Button>
  );
}
