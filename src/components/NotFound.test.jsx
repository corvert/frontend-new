/* eslint-disable no-undef */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "./NotFound";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

test("renders 404 and back link", () => {
  render(
    <MemoryRouter>
      <NotFound />
    </MemoryRouter>,
  );

  expect(screen.getByText("404")).toBeInTheDocument();
  const backLink = screen.getByRole("link", { name: "notFound.backHome" });
  expect(backLink).toHaveAttribute("href", "/");
});
