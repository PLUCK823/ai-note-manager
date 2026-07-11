import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsPage } from "./SettingsPage";

const getSettingsMock = vi.fn();
const updateSettingsMock = vi.fn();
const saveApiKeyMock = vi.fn();
const checkAiProviderMock = vi.fn();

vi.mock("../api", () => ({
  getSettings: () => getSettingsMock(),
  updateSettings: (input: unknown) => updateSettingsMock(input),
  saveApiKey: (provider: string, apiKey: string) =>
    saveApiKeyMock(provider, apiKey),
  checkAiProvider: (input: unknown, apiKey?: string) =>
    checkAiProviderMock(input, apiKey),
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
    checkAiProviderMock.mockReset();
  });

  it("checks the unsaved provider key before it is persisted", async () => {
    getSettingsMock.mockResolvedValue({
      provider: "deepseek",
      model: "deepseek-v4-flash",
      aiReadScope: "current_note",
      autosave: true,
      syncPreviewScroll: true,
    });
    checkAiProviderMock.mockResolvedValue(true);

    render(<SettingsPage />, { wrapper: TestProvider });

    fireEvent.change(await screen.findByLabelText("API key"), {
      target: { value: "new-deepseek-key" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Check AI connection" }),
    );

    await waitFor(() => {
      expect(checkAiProviderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "deepseek",
          model: "deepseek-v4-flash",
        }),
        "new-deepseek-key",
      );
    });
    expect(
      await screen.findByText("DeepSeek connection verified."),
    ).toBeInTheDocument();
  });

  it("saves the selected provider, model, and provider-specific API key", async () => {
    getSettingsMock.mockResolvedValue({
      provider: "openai",
      model: "gpt-4.1-mini",
      aiReadScope: "current_note",
      autosave: true,
      syncPreviewScroll: true,
    });
    updateSettingsMock.mockImplementation((input) => Promise.resolve(input));
    saveApiKeyMock.mockResolvedValue({ provider: "openai", saved: true });

    render(<SettingsPage />, { wrapper: TestProvider });

    const providerInput = await screen.findByLabelText("AI provider");
    fireEvent.change(providerInput, { target: { value: "deepseek" } });
    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "deepseek-v4-flash" },
    });
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
        provider: "deepseek",
        model: "deepseek-v4-flash",
        aiReadScope: "full_vault",
        autosave: false,
        syncPreviewScroll: false,
      });
    });
    expect(saveApiKeyMock).toHaveBeenCalledWith("deepseek", "sk-test");
    expect(
      screen.queryByLabelText("Show file navigation"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Show AI assistant"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("AI assistant on left side"),
    ).not.toBeInTheDocument();
    expect(await screen.findByText("Settings saved")).toBeInTheDocument();
  });
});
