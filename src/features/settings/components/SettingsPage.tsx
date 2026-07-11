import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import {
  checkAiProvider,
  getSettings,
  saveApiKey,
  updateSettings,
} from "../api";
import type { AiProvider, AiReadScope, AppSettings } from "../types";

const defaultSettings: AppSettings = {
  provider: "openai",
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

const providerModels: Record<AiProvider, string[]> = {
  openai: ["gpt-4.1-mini", "gpt-4.1"],
  deepseek: ["deepseek-v4-flash", "deepseek-v4-pro"],
};

const providerLabels: Record<AiProvider, string> = {
  openai: "OpenAI",
  deepseek: "DeepSeek",
};

interface SettingsPageProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function SettingsPage({ isOpen = true, onClose }: SettingsPageProps) {
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  if (!isOpen) {
    return null;
  }

  if (settingsQuery.isLoading) {
    return (
      <SettingsDialog onClose={onClose}>
        <p className="settings-message">Loading settings...</p>
      </SettingsDialog>
    );
  }

  return (
    <SettingsDialog onClose={onClose}>
      <SettingsForm initialSettings={settingsQuery.data ?? defaultSettings} />
    </SettingsDialog>
  );
}

function SettingsDialog({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className="settings-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <section
        aria-label="Settings"
        aria-modal="true"
        className="settings-page"
        role="dialog"
      >
        {onClose ? (
          <div className="settings-dialog-actions">
            <Button
              aria-label="Close settings"
              onClick={onClose}
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" size={16} />
            </Button>
          </div>
        ) : null}
        {children}
      </section>
    </div>
  );
}

function SettingsForm({ initialSettings }: { initialSettings: AppSettings }) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [apiKey, setApiKey] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(
    null,
  );
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const provider = settings.provider ?? "openai";

  async function handleSave() {
    setSaveMessage(null);
    const savedSettings = await updateSettings(settings);
    if (apiKey.trim()) {
      await saveApiKey(provider, apiKey.trim());
    }
    setSettings(savedSettings);
    queryClient.setQueryData(["settings"], savedSettings);
    setSaveMessage("Settings saved");
  }

  async function handleCheckConnection() {
    setConnectionMessage(null);
    setIsCheckingConnection(true);
    try {
      await checkAiProvider(settings);
      setConnectionMessage(`${providerLabels[provider]} connection verified.`);
    } catch {
      setConnectionMessage(
        `${providerLabels[provider]} could not be reached. Check the saved API key and model.`,
      );
    } finally {
      setIsCheckingConnection(false);
    }
  }

  return (
    <section className="settings-section" aria-label="Settings panel">
      <h3>Settings</h3>
      <label>
        AI provider
        <select
          value={provider}
          onChange={(event) => {
            const nextProvider = event.currentTarget.value as AiProvider;
            setSettings((current) => ({
              ...current,
              provider: nextProvider,
              model: providerModels[nextProvider][0],
            }));
          }}
        >
          {(Object.keys(providerLabels) as AiProvider[]).map((value) => (
            <option key={value} value={value}>
              {providerLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Model
        <input
          list={`models-for-${provider}`}
          value={settings.model}
          onChange={(event) => {
            const model = event.currentTarget.value;
            setSettings((current) => ({
              ...current,
              model,
            }));
          }}
        />
        <datalist id={`models-for-${provider}`}>
          {providerModels[provider].map((model) => (
            <option key={model} value={model} />
          ))}
        </datalist>
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
      <label>
        API key
        <input
          placeholder="Stored in the system keychain"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.currentTarget.value)}
        />
      </label>
      <Button
        disabled={isCheckingConnection}
        type="button"
        variant="secondary"
        onClick={() => void handleCheckConnection()}
      >
        {isCheckingConnection
          ? "Checking connection..."
          : "Check AI connection"}
      </Button>
      {connectionMessage ? (
        <p className="settings-message">{connectionMessage}</p>
      ) : null}
      <Button type="button" variant="primary" onClick={handleSave}>
        Save settings
      </Button>
      {saveMessage ? <p className="settings-message">{saveMessage}</p> : null}
    </section>
  );
}
