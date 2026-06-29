import { File, Folder } from "lucide-react";

const placeholderFiles = [
  { icon: Folder, name: "Project notes" },
  { icon: File, name: "Welcome.md" },
  { icon: File, name: "Meeting notes.md" },
];

export function FileTree() {
  return (
    <nav className="file-tree" aria-label="Markdown file tree">
      {placeholderFiles.map(({ icon: Icon, name }) => (
        <button className="tree-item" key={name} type="button">
          <Icon size={15} aria-hidden="true" />
          {name}
        </button>
      ))}
    </nav>
  );
}
