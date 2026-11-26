import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { gameFixture, gameFixtureWith } from "@/test/fixtures";
import { GameCard } from "./GameCard";

describe("GameCard", () => {
  it("renders the game title, description, category and only the API thumbnail", () => {
    render(<GameCard game={gameFixture} />);

    expect(screen.getByRole("heading", { name: "Neon Runner" })).toBeInTheDocument();
    expect(screen.getByText("A fast endless runner through a neon city.")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();

    const image = screen.getByRole("img", { name: "Neon Runner thumbnail" });
    expect(image).toHaveAttribute("src", gameFixture.thumbnail_url);
    expect(image).toHaveAttribute("loading", "lazy");
    expect(screen.getByRole("link", { name: /Play now/i })).toHaveAttribute("href", "/games/neon-runner");
  });

  it("shows a featured badge and a neutral fallback when no thumbnail is provided", () => {
    const { container } = render(<GameCard game={gameFixtureWith({ featured: true, thumbnail_url: null })} />);

    expect(screen.getByText("Featured")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("does not mark non-featured games as featured", () => {
    render(<GameCard game={gameFixtureWith({ featured: false })} />);
    expect(screen.queryByText("Featured")).toBeNull();
  });
});
