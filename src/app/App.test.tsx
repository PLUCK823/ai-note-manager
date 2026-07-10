import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";

import { useVaultStore } from "../features/vault/hooks";
import { App } from "./App";

const getRecentVaultMock = vi.fn();
const getSettingsMock = vi.fn();
const updateSettingsMock = vi.fn();

vi.mock("../features/vault/api", () => ({
  getRecentVault: () => getRecentVaultMock(),
  selectVault: vi.fn(),
}));

vi.mock("../features/settings/api", () => ({
  getSettings: () => getSettingsMock(),
  updateSettings: (input: unknown) => updateSettingsMock(input),
  saveApiKey: vi.fn(),
}));

function TestProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            gcTime: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("App", () => {
  beforeEach(() => {
    getRecentVaultMock.mockReset();
    getRecentVaultMock.mockResolvedValue(null);
    getSettingsMock.mockReset();
    getSettingsMock.mockResolvedValue({
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
    });
    updateSettingsMock.mockReset();
    updateSettingsMock.mockImplementation((input) => Promise.resolve(input));
    useVaultStore.getState().setCurrentVault(null);
  });

  it("renders the initialized note manager workspace shell", () => {
    render(
      <TestProviders>
        <App />
      </TestProviders>,
    );

    expect(
      screen.getByRole("heading", { name: "AI Note Manager" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open vault/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Markdown file tree")).toBeInTheDocument();
    expect(screen.getByLabelText("Markdown editor")).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "AI assistant" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /settings/i }),
    ).toBeInTheDocument();
  });

  it("switches between edit, split, and preview editor modes", () => {
    render(
      <TestProviders>
        <App />
      </TestProviders>,
    );

    expect(
      screen.getByRole("group", { name: "Editor view mode" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Markdown editor")).toBeInTheDocument();
    expect(screen.getByLabelText("Markdown preview")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.queryByLabelText("Markdown editor")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Markdown preview")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByLabelText("Markdown editor")).toBeInTheDocument();
    expect(screen.queryByLabelText("Markdown preview")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Split" }));

    expect(screen.getByLabelText("Markdown editor")).toBeInTheDocument();
    expect(screen.getByLabelText("Markdown preview")).toBeInTheDocument();
  });

  it("resizes the outer workspace panes with separator handles", () => {
    render(
      <TestProviders>
        <App />
      </TestProviders>,
    );

    const shell = screen.getByTestId("app-shell");
    const vaultSeparator = screen.getByRole("separator", {
      name: "Resize file navigation",
    });
    const aiSeparator = screen.getByRole("separator", {
      name: "Resize AI assistant",
    });

    expect(vaultSeparator).toHaveAttribute("aria-valuenow", "288");
    expect(aiSeparator).toHaveAttribute("aria-valuenow", "336");

    fireEvent.pointerDown(vaultSeparator, { clientX: 288, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 328, pointerId: 1 });
    fireEvent.pointerUp(window, { pointerId: 1 });

    expect(shell).toHaveStyle({ "--vault-pane-width": "328px" });
    expect(vaultSeparator).toHaveAttribute("aria-valuenow", "328");

    fireEvent.pointerDown(aiSeparator, { clientX: 900, pointerId: 2 });
    fireEvent.pointerMove(window, { clientX: 860, pointerId: 2 });
    fireEvent.pointerUp(window, { pointerId: 2 });

    expect(shell).toHaveStyle({ "--ai-pane-width": "376px" });
    expect(aiSeparator).toHaveAttribute("aria-valuenow", "376");
  });

  it("resizes the editor and preview panes in split mode", () => {
    render(
      <TestProviders>
        <App />
      </TestProviders>,
    );

    const shell = screen.getByTestId("app-shell");
    const splitSeparator = screen.getByRole("separator", {
      name: "Resize editor and preview",
    });

    expect(splitSeparator).toHaveAttribute("aria-valuenow", "360");

    fireEvent.pointerDown(splitSeparator, { clientX: 720, pointerId: 3 });
    fireEvent.pointerMove(window, { clientX: 680, pointerId: 3 });
    fireEvent.pointerUp(window, { pointerId: 3 });

    expect(shell).toHaveStyle({ "--preview-pane-width": "400px" });
    expect(splitSeparator).toHaveAttribute("aria-valuenow", "400");

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(
      screen.queryByRole("separator", { name: "Resize editor and preview" }),
    ).not.toBeInTheDocument();
  });

  it("syncs preview scrolling from the editor in split mode", async () => {
    const { container } = render(
      <TestProviders>
        <App />
      </TestProviders>,
    );

    await screen.findByLabelText("Sync editor and preview scrolling");

    const editorScroller = container.querySelector(".cm-scroller") as HTMLElement;
    const previewSurface = screen.getByLabelText("Markdown preview");
    defineScrollMetrics(editorScroller, { clientHeight: 100, scrollHeight: 500 });
    defineScrollMetrics(previewSurface, { clientHeight: 200, scrollHeight: 800 });

    editorScroller.scrollTop = 100;
    fireEvent.scroll(editorScroller);

    await waitFor(() => {
      expect(previewSurface.scrollTop).toBe(150);
    });
  });

  it("syncs editor scrolling from the preview in split mode", async () => {
    const { container } = render(
      <TestProviders>
        <App />
      </TestProviders>,
    );

    await screen.findByLabelText("Sync editor and preview scrolling");

    const editorScroller = container.querySelector(".cm-scroller") as HTMLElement;
    const previewSurface = screen.getByLabelText("Markdown preview");
    defineScrollMetrics(editorScroller, { clientHeight: 100, scrollHeight: 500 });
    defineScrollMetrics(previewSurface, { clientHeight: 200, scrollHeight: 800 });

    previewSurface.scrollTop = 300;
    fireEvent.scroll(previewSurface);

    await waitFor(() => {
      expect(editorScroller.scrollTop).toBe(200);
    });
  });

  it("does not sync editor and preview scrolling when the setting is disabled", async () => {
    getSettingsMock.mockResolvedValue({
      model: "gpt-4.1-mini",
      aiReadScope: "current_note",
      autosave: true,
      syncPreviewScroll: false,
      leftPaneWidth: 288,
      rightPaneWidth: 336,
      previewPaneWidth: 360,
      leftPaneVisible: true,
      rightPaneVisible: true,
      aiPaneOnLeft: false,
    });
    const { container } = render(
      <TestProviders>
        <App />
      </TestProviders>,
    );

    const syncToggle = await screen.findByLabelText(
      "Sync editor and preview scrolling",
    );
    expect(syncToggle).not.toBeChecked();

    const editorScroller = container.querySelector(".cm-scroller") as HTMLElement;
    const previewSurface = screen.getByLabelText("Markdown preview");
    defineScrollMetrics(editorScroller, { clientHeight: 100, scrollHeight: 500 });
    defineScrollMetrics(previewSurface, { clientHeight: 200, scrollHeight: 800 });

    editorScroller.scrollTop = 100;
    fireEvent.scroll(editorScroller);

    expect(previewSurface.scrollTop).toBe(0);
  });

  it("restores the most recent vault on startup", async () => {
    getRecentVaultMock.mockResolvedValue({
      id: "vault:/Users/test/notes",
      path: "/Users/test/notes",
      name: "notes",
      lastOpenedAt: "2026-06-30T12:00:00Z",
    });

    render(
      <TestProviders>
        <App />
      </TestProviders>,
    );

    expect(await screen.findByText("notes")).toBeInTheDocument();
    expect(screen.getByText("/Users/test/notes")).toBeInTheDocument();
  });

  it("restores persisted pane widths from settings", async () => {
    getSettingsMock.mockResolvedValue({
      model: "gpt-4.1-mini",
      aiReadScope: "current_note",
      autosave: true,
      syncPreviewScroll: true,
      leftPaneWidth: 320,
      rightPaneWidth: 400,
      previewPaneWidth: 450,
      leftPaneVisible: true,
      rightPaneVisible: true,
      aiPaneOnLeft: false,
    });

    render(
      <TestProviders>
        <App />
      </TestProviders>,
    );

    // Wait for settings to load
    await screen.findByTestId("app-shell");

    const vaultSeparator = screen.getByRole("separator", {
      name: "Resize file navigation",
    });
    const aiSeparator = screen.getByRole("separator", {
      name: "Resize AI assistant",
    });
    const splitSeparator = screen.getByRole("separator", {
      name: "Resize editor and preview",
    });

    // After settings load, pane widths should be restored
    await waitFor(() => {
      expect(vaultSeparator).toHaveAttribute("aria-valuenow", "320");
    });
    await waitFor(() => {
      expect(aiSeparator).toHaveAttribute("aria-valuenow", "400");
    });
    await waitFor(() => {
      expect(splitSeparator).toHaveAttribute("aria-valuenow", "450");
    });
  });

  it("hides the left pane when leftPaneVisible is false", async () => {
    getSettingsMock.mockResolvedValue({
      model: "gpt-4.1-mini",
      aiReadScope: "current_note",
      autosave: true,
      syncPreviewScroll: true,
      leftPaneWidth: 288,
      rightPaneWidth: 336,
      previewPaneWidth: 360,
      leftPaneVisible: false,
      rightPaneVisible: true,
      aiPaneOnLeft: false,
    });

    render(
      <TestProviders>
        <App />
      </TestProviders>,
    );

    // Wait for settings to load
    await screen.findByTestId("app-shell");

    // Left pane should not be visible
    await waitFor(() => {
      expect(screen.queryByLabelText("Vault navigation")).not.toBeInTheDocument();
    });
    // Left pane toggle button should be visible (the floating one when pane is hidden)
    const showButtons = screen.getAllByLabelText("Show file navigation");
    expect(showButtons.length).toBeGreaterThan(0);
    // Right pane should still be visible
    expect(screen.getByLabelText("AI assistant")).toBeInTheDocument();
  });

  it("hides the right pane when rightPaneVisible is false", async () => {
    getSettingsMock.mockResolvedValue({
      model: "gpt-4.1-mini",
      aiReadScope: "current_note",
      autosave: true,
      syncPreviewScroll: true,
      leftPaneWidth: 288,
      rightPaneWidth: 336,
      previewPaneWidth: 360,
      leftPaneVisible: true,
      rightPaneVisible: false,
      aiPaneOnLeft: false,
    });

    render(
      <TestProviders>
        <App />
      </TestProviders>,
    );

    // Wait for settings to load
    await screen.findByTestId("app-shell");

    // Left pane should be visible
    expect(screen.getByLabelText("Vault navigation")).toBeInTheDocument();
    // Right pane should not be visible
    await waitFor(() => {
      expect(screen.queryByLabelText("AI assistant")).not.toBeInTheDocument();
    });
    // Right pane toggle button should be visible
    const showButtons = screen.getAllByLabelText("Show AI assistant");
    expect(showButtons.length).toBeGreaterThan(0);
  });

  it("swaps vault navigation and AI assistant panes when aiPaneOnLeft is true", async () => {
    getSettingsMock.mockResolvedValue({
      model: "gpt-4.1-mini",
      aiReadScope: "current_note",
      autosave: true,
      syncPreviewScroll: true,
      leftPaneWidth: 288,
      rightPaneWidth: 336,
      previewPaneWidth: 360,
      leftPaneVisible: true,
      rightPaneVisible: true,
      aiPaneOnLeft: true,
    });

    const { container } = render(
      <TestProviders>
        <App />
      </TestProviders>,
    );

    // Wait for settings to load and the shell to render
    await screen.findByTestId("app-shell");

    // When AI pane is on left, AI assistant should render first
    await waitFor(() => {
      expect(screen.getByLabelText("AI assistant")).toBeInTheDocument();
      expect(screen.getByLabelText("Vault navigation")).toBeInTheDocument();
    });

    // Verify AI pane appears before vault navigation in DOM order
    await waitFor(() => {
      const allAsides = container.querySelectorAll('.app-shell > aside');
      expect(allAsides[0]?.getAttribute("aria-label")).toBe("AI assistant");
    });
  });

  it("toggles pane visibility buttons are present", async () => {
    render(
      <TestProviders>
        <App />
      </TestProviders>,
    );

    await screen.findByTestId("app-shell");

    // Left pane should be visible initially
    expect(screen.getByLabelText("Vault navigation")).toBeInTheDocument();

    // Toggle buttons should be present in the toolbar
    const hideLeftButtons = screen.getAllByLabelText("Hide file navigation");
    const hideRightButtons = screen.getAllByLabelText("Hide AI assistant");

    expect(hideLeftButtons.length).toBeGreaterThan(0);
    expect(hideRightButtons.length).toBeGreaterThan(0);
  });

  it("renders a restore rail when file navigation is collapsed", async () => {
    getSettingsMock.mockResolvedValue({
      model: "gpt-4.1-mini",
      aiReadScope: "current_note",
      autosave: true,
      syncPreviewScroll: true,
      leftPaneWidth: 288,
      rightPaneWidth: 336,
      previewPaneWidth: 360,
      leftPaneVisible: false,
      rightPaneVisible: true,
      aiPaneOnLeft: false,
    });

    render(
      <TestProviders>
        <App />
      </TestProviders>,
    );

    const rail = await screen.findByLabelText("Collapsed file navigation");
    expect(rail).toHaveAttribute("data-edge", "left");
    expect(
      within(rail).getByRole("button", { name: "Show file navigation" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Vault navigation")).not.toBeInTheDocument();
  });

  it("restores a collapsed AI pane from its rail after moving it left", async () => {
    getSettingsMock.mockResolvedValue({
      model: "gpt-4.1-mini",
      aiReadScope: "current_note",
      autosave: true,
      syncPreviewScroll: true,
      leftPaneWidth: 288,
      rightPaneWidth: 336,
      previewPaneWidth: 360,
      leftPaneVisible: true,
      rightPaneVisible: false,
      aiPaneOnLeft: true,
    });

    render(
      <TestProviders>
        <App />
      </TestProviders>,
    );

    const rail = await screen.findByLabelText("Collapsed AI assistant");
    expect(rail).toHaveAttribute("data-edge", "left");

    fireEvent.click(
      within(rail).getByRole("button", { name: "Show AI assistant" }),
    );

    await waitFor(() => {
      expect(screen.getByLabelText("AI assistant")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Collapsed AI assistant")).not.toBeInTheDocument();
  });

  it("debounces pane width updates to settings", async () => {
    render(
      <TestProviders>
        <App />
      </TestProviders>,
    );

    await screen.findByTestId("app-shell");

    const vaultSeparator = screen.getByRole("separator", {
      name: "Resize file navigation",
    });

    // Resize the left pane
    fireEvent.pointerDown(vaultSeparator, { clientX: 288, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 320, pointerId: 1 });
    fireEvent.pointerUp(window, { pointerId: 1 });

    // Settings should not be updated immediately
    expect(updateSettingsMock).not.toHaveBeenCalled();

    // Wait for the debounce delay
    await waitFor(
      () => {
        expect(updateSettingsMock).toHaveBeenCalledWith(
          expect.objectContaining({
            leftPaneWidth: 320,
          }),
        );
      },
      { timeout: 1000 },
    );
  });
});

function defineScrollMetrics(
  element: HTMLElement,
  metrics: { clientHeight: number; scrollHeight: number },
) {
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: metrics.clientHeight,
  });
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: metrics.scrollHeight,
  });
}
