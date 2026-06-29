import type { PropsWithChildren } from "react";

type SidebarProps = PropsWithChildren<{
  label: string;
}>;

export function Sidebar({ children, label }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label={label}>
      {children}
    </aside>
  );
}
