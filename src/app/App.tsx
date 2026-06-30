import { useEffect } from "react";

import { getRecentVault } from "../features/vault/api";
import { useVaultStore } from "../features/vault/hooks";
import { AppLayout } from "./layout";

export function App() {
  const setCurrentVault = useVaultStore((state) => state.setCurrentVault);

  useEffect(() => {
    let isMounted = true;

    getRecentVault()
      .then((vault) => {
        if (isMounted && vault) {
          setCurrentVault(vault);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [setCurrentVault]);

  return <AppLayout />;
}
