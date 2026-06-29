export type AppResult<TData, TError = string> =
  { ok: true; data: TData } | { ok: false; error: TError };
