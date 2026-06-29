import type { PropsWithChildren } from "react";

type DialogProps = PropsWithChildren<{
  title: string;
  open: boolean;
}>;

export function Dialog({ children, open, title }: DialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog" role="dialog" aria-modal="true">
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}
