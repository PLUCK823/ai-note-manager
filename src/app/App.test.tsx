import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";
import { Providers } from "./providers";

describe("App", () => {
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
});
