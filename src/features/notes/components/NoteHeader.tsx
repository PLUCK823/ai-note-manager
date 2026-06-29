import { Clock3 } from "lucide-react";

export function NoteHeader() {
  return (
    <header className="note-header">
      <div>
        <p className="eyebrow">Current note</p>
        <h2>Untitled note</h2>
      </div>
      <span className="note-meta">
        <Clock3 size={15} aria-hidden="true" />
        Not saved yet
      </span>
    </header>
  );
}
