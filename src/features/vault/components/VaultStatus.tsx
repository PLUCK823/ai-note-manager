import { useVaultStore } from "../hooks";

export function VaultStatus() {
  const currentVault = useVaultStore((state) => state.currentVault);

  return (
    <section className="vault-status" aria-label="Vault status">
      <span className="status-dot" aria-hidden="true" />
      {currentVault ? (
        <span>
          <strong>{currentVault.name}</strong>
          <span className="vault-path">{currentVault.path}</span>
        </span>
      ) : (
        "No vault selected"
      )}
    </section>
  );
}
