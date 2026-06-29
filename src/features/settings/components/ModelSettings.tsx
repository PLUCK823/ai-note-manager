export function ModelSettings() {
  return (
    <section className="settings-section">
      <h3>Model</h3>
      <label>
        Provider model
        <input defaultValue="gpt-4.1-mini" />
      </label>
    </section>
  );
}
