import { useQuery } from "@tanstack/react-query";

import { useVaultStore } from "../../vault/hooks";
import { searchNotes } from "../api";
import { useSearchStore } from "../hooks";

export function SearchResults() {
  const currentVault = useVaultStore((state) => state.currentVault);
  const query = useSearchStore((state) => state.query.trim());
  const searchQuery = useQuery({
    queryKey: ["search-notes", currentVault?.id, query],
    queryFn: () => searchNotes(currentVault!.id, query),
    enabled: Boolean(currentVault && query),
  });

  if (!currentVault) {
    return (
      <section className="search-results" aria-label="Search results">
        <p>Open a vault to search notes.</p>
      </section>
    );
  }

  if (!query) {
    return (
      <section className="search-results" aria-label="Search results">
        <p>No results yet.</p>
      </section>
    );
  }

  if (searchQuery.isLoading) {
    return (
      <section className="search-results" aria-label="Search results">
        <p>Searching notes...</p>
      </section>
    );
  }

  if (searchQuery.isError) {
    return (
      <section className="search-results" aria-label="Search results">
        <p>Search failed.</p>
      </section>
    );
  }

  const results = searchQuery.data ?? [];

  return (
    <section className="search-results" aria-label="Search results">
      {results.length > 0 ? (
        results.map((result) => (
          <button className="search-result" key={result.path} type="button">
            <span className="search-result-title">{result.title}</span>
            <span className="search-result-path">{result.path}</span>
            <span className="search-result-snippet">{result.snippet}</span>
          </button>
        ))
      ) : (
        <p>No matching notes.</p>
      )}
    </section>
  );
}
