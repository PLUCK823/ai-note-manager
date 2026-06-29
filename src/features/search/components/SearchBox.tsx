import { Search } from "lucide-react";

import { useSearchStore } from "../hooks";

export function SearchBox() {
  const query = useSearchStore((state) => state.query);
  const setQuery = useSearchStore((state) => state.setQuery);

  return (
    <label className="search-box">
      <Search size={15} aria-hidden="true" />
      <input
        aria-label="Search notes"
        placeholder="Search notes"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
    </label>
  );
}
