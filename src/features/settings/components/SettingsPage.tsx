import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "../../../shared/components/Button";
import { getSettings, saveApiKey, updateSettings } from "../api";
import type { AiReadScope, AppSettings } from "../types";

const defaultSettings: AppSettings = {
  model: "gpt-4.1-mini",
  aiReadScope: "current_note",
  autosave: true,
  syncPreviewScroll: true,
  leftPaneWidth: 288,
  rightPaneWidth: 336,
  previewPaneWidth: 360,
  leftPaneVisible: true,
  rightPaneVisible: true,
  aiPaneOnLeft: false,
};

export function SettingsPage() {
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  if (settingsQuery.isLoading) {
    return (
      <section className="settings-page" aria-label="Settings panel">
        <p className="settings-message">Loading settings...</p>
      </section>
    );
  }

  return <SettingsForm initialSettings={settingsQuery.data ?? defaultSettings} />;
}

function SettingsForm({ initialSettings }: { initialSettings: AppSettings }) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [apiKey, setApiKey] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaveMessage(null);
    const savedSettings = await updateSettings(settings);
    if (apiKey.trim()) {
      await saveApiKey("openai", apiKey.trim());
    }
    setSettings(savedSettings);
    queryClient.setQueryData(["settings"], savedSettings);
    setSaveMessage("Settings saved");
  }

  return (
    <section className="settings-page" aria-label="Settings panel">
      <section className="settings-section">
        <h3>Settings</h3>
        <label>
          Model
          <input
            value={settings.model}
            onChange={(event) => {
              const model = event.currentTarget.value;
              setSettings((current) => ({
                ...current,
                model,
              }));
            }}
          />
        </label>
        <label>
          AI read scope
          <select
            value={settings.aiReadScope}
            onChange={(event) => {
              const aiReadScope = event.currentTarget.value as AiReadScope;
              setSettings((current) => ({
                ...current,
                aiReadScope,
              }));
            }}
          >
            <option value="current_note">Current note</option>
            <option value="linked_notes">Linked notes</option>
            <option value="full_vault">Full vault</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input
            checked={settings.autosave}
            type="checkbox"
            onChange={(event) => {
              const autosave = event.currentTarget.checked;
              setSettings((current) => ({
                ...current,
                autosave,
              }));
            }}
          />
          Autosave
        </label>
        <label className="checkbox-label">
          <input
            checked={settings.syncPreviewScroll}
            type="checkbox"
            onChange={(event) => {
              const syncPreviewScroll = event.currentTarget.checked;
              setSettings((current) => ({
                ...current,
                syncPreviewScroll,
              }));
            }}
          />
          Sync editor and preview scrolling
        </label>
        <label className="checkbox-label">
          <input
            checked={settings.leftPaneVisible}
            type="checkbox"
            onChange={(event) => {
              const leftPaneVisible = event.currentTarget.checked;
              setSettings((current) => ({
                ...current,
                leftPaneVisible,
              }));
            }}
          />
          Show file navigation
        </label>
        <label className="checkbox-label">
          <input
            checked={settings.rightPaneVisible}
            type="checkbox"
            onChange={(event) => {
              const rightPaneVisible = event.currentTarget.checked;
              setSettings((current) => ({
                ...current,
                rightPaneVisible,
              }));
            }}
          />
          Show AI assistant
        </label>
        <label className="checkbox-label">
          <input
            checked={settings.aiPaneOnLeft}
            type="checkbox"
            onChange={(event) => {
              const aiPaneOnLeft = event.currentTarget.checked;
              setSettings((current) => ({
                ...current,
                aiPaneOnLeft,
              }));
            }}
          />
          AI assistant on left side
        </label>
        <label>
          API key
          <input
            placeholder="Stored in the system keychain"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.currentTarget.value)}
          />
        </label>
        <Button type="button" variant="primary" onClick={handleSave}>
          Save settings
        </Button>
        {saveMessage ? <p className="settings-message">{saveMessage}</p> : null}
      </section>
    </section>
  );
}
