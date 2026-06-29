import { ModelSettings } from "./ModelSettings";
import { PrivacySettings } from "./PrivacySettings";

export function SettingsPage() {
  return (
    <section className="settings-page" aria-label="Settings panel">
      <ModelSettings />
      <PrivacySettings />
    </section>
  );
}
