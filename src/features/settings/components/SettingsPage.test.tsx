import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsPage } from "./SettingsPage";

const getSettingsMock = vi.fn();
const updateSettingsMock = vi.fn();
const saveApiKeyMock = vi.fn();

vi.mock("../api", () => ({
  getSettings: () => getSettingsMock(),
  updateSettings: (input: unknown) => updateSettingsMock(input),
  saveApiKey: (provider: string, apiKey: string) =>
    saveApiKeyMock(provider, apiKey),
}));

function TestProvider({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("SettingsPage", () => {
  beforeEach(() => {
    getSettingsMock.mockReset();
    updateSettingsMock.mockReset();
    saveApiKeyMock.mockReset();
  });

  it("loads settings and saves model, privacy, autosave, and API key", async () => {
    getSettingsMock.mockResolvedValue({
      model: "gpt-4.1-mini",
      aiReadScope: "current_note",
      autosave: true,
      syncPreviewScroll: true,
    });
    updateSettingsMock.mockImplementation((input) => Promise.resolve(input));
    saveApiKeyMock.mockResolvedValue({ provider: "openai", saved: true });

    render(<SettingsPage />, { wrapper: TestProvider });

    const modelInput = await screen.findByLabelText("Model");
    fireEvent.change(modelInput, { target: { value: "gpt-4.1" } });
    fireEvent.change(screen.getByLabelText("AI read scope"), {
      target: { value: "full_vault" },
    });
    fireEvent.click(screen.getByLabelText("Autosave"));
    fireEvent.click(screen.getByLabelText("Sync editor and preview scrolling"));
    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "sk-test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() => {
      expect(updateSettingsMock).toHaveBeenCalledWith({
        model: "gpt-4.1",
        aiReadScope: "full_vault",
        autosave: false,
        syncPreviewScroll: false,
      });
    });
    expect(saveApiKeyMock).toHaveBeenCalledWith("openai", "sk-test");
    expect(await screen.findByText("Settings saved")).toBeInTheDocument();
  });
});
