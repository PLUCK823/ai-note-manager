import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useVaultStore } from "../features/vault/hooks";
import { App } from "./App";
import { Providers } from "./providers";

const getRecentVaultMock = vi.fn();

vi.mock("../features/vault/api", () => ({
  getRecentVault: () => getRecentVaultMock(),
  selectVault: vi.fn(),
}));

describe("App", () => {
  beforeEach(() => {
    getRecentVaultMock.mockReset();
    getRecentVaultMock.mockResolvedValue(null);
    useVaultStore.getState().setCurrentVault(null);
  });

  it("renders the initialized note manager workspace shell", () => {
    render(
      <Providers>
        <App />
      </Providers>,
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
      <Providers>
        <App />
      </Providers>,
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

  it("restores the most recent vault on startup", async () => {
    getRecentVaultMock.mockResolvedValue({
      id: "vault:/Users/test/notes",
      path: "/Users/test/notes",
      name: "notes",
      lastOpenedAt: "2026-06-30T12:00:00Z",
    });

    render(
      <Providers>
        <App />
      </Providers>,
    );

    expect(await screen.findByText("notes")).toBeInTheDocument();
    expect(screen.getByText("/Users/test/notes")).toBeInTheDocument();
  });
});
