export type FileTreeNode = {
  name: string;
  path: string;
  kind: "file" | "folder";
  children?: FileTreeNode[];
};

export type NoteContent = {
  path: string;
  content: string;
  modifiedAt: string;
  contentHash: string;
};
