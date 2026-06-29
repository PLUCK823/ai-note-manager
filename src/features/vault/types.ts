import type { EntityId, IsoTimestamp } from "../../shared/types/common";

export type VaultInfo = {
  id: EntityId;
  name: string;
  path: string;
  lastOpenedAt: IsoTimestamp | null;
};
