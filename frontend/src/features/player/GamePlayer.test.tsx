import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { gameFixture, gameFixtureWith } from "@/test/fixtures";
import { GamePlayer } from "./GamePlayer";

vi.mock("./useGameSession", () => ({
  useGameSession: () => ({
    status: "ready",
    token: "test-token",
    error: null,
    postEvent: vi.fn(),
    closeSession: vi.fn(),
  }),
}));

describe("GamePlayer", () => {
  it("renders a sandboxed iframe with the API player_url and no cookie access", () => {
    const { container } = render(<GamePlayer game={gameFixture} />);
    const iframe = container.querySelector("iframe");

    expect(iframe).not.toBeNull();
    expect(iframe).toHaveAttribute("src", "http://127.0.0.1:8401/g/neon-runner/index.html");
    expect(iframe).toHaveAttribute("title", "Play Neon Runner");
    expect(iframe).toHaveAttribute("sandbox", "allow-scripts allow-pointer-lock allow-fullscreen");
    expect(iframe?.getAttribute("sandbox")).not.toContain("allow-same-origin");
    expect(iframe).toHaveAttribute("allow", "fullscreen; gamepad; autoplay");
    expect(iframe).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("provides a fullscreen control and how-to-play instructions", () => {
    render(<GamePlayer game={gameFixture} />);
    expect(screen.getByRole("button", { name: /fullscreen/i })).toBeInTheDocument();
    expect(screen.getByText("How to play")).toBeInTheDocument();
    expect(screen.getByText("Use the arrow keys to move.")).toBeInTheDocument();
  });

  it("refuses a player URL on the application origin", () => {
    const { container } = render(
      <GamePlayer game={gameFixtureWith({ player_url: "http://localhost:4300/g/neon-runner/index.html" })} />,
    );
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("Game unavailable");
  });
});
