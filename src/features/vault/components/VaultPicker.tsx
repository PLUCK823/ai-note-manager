import { FolderOpen } from "lucide-react";
import { useState } from "react";

import { Button } from "../../../shared/components/Button";
import { selectVault } from "../api";
import { useVaultStore } from "../hooks";

export function VaultPicker() {
  const setCurrentVault = useVaultStore((state) => state.setCurrentVault);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpenVault() {
    setIsOpening(true);
    setError(null);

    try {
      const vault = await selectVault();
      setCurrentVault(vault);
    } catch {
      setError("Vault was not opened");
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <div className="vault-picker">
      <Button
        type="button"
        variant="primary"
        className="wide-button"
        disabled={isOpening}
        onClick={handleOpenVault}
      >
        <FolderOpen size={16} aria-hidden="true" />
        {isOpening ? "Opening..." : "Open vault"}
      </Button>
      {error ? <p className="inline-error">{error}</p> : null}
    </div>
  );
}
