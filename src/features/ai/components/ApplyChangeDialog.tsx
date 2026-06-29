import { Dialog } from "../../../shared/components/Dialog";

export function ApplyChangeDialog() {
  return (
    <Dialog open={false} title="Apply AI change">
      <p>Review the diff before applying it to the Markdown file.</p>
    </Dialog>
  );
}
