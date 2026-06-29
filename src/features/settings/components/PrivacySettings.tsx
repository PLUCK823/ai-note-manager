export function PrivacySettings() {
  return (
    <section className="settings-section">
      <h3>Privacy</h3>
      <label>
        <input defaultChecked type="checkbox" />
        Limit AI reads to the current note
      </label>
    </section>
  );
}
