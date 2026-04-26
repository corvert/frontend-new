/* eslint-disable no-undef */
import React from "react";
import { render, screen } from "@testing-library/react";
import ProtectedRoute from "./ProtectedRoute";
import { useMyContext } from "../store/ContextApi";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
  };
});

vi.mock("../store/ContextApi", () => ({
  useMyContext: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("redirects to login when unauthenticated", () => {
  useMyContext.mockReturnValue({ token: null, isAdmin: false });

  render(
    <ProtectedRoute>
      <div>protected</div>
    </ProtectedRoute>,
  );

  expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/login");
});

test("redirects to access denied when admin page and not admin", () => {
  useMyContext.mockReturnValue({ token: "jwt", isAdmin: false });

  render(
    <ProtectedRoute adminPage>
      <div>protected</div>
    </ProtectedRoute>,
  );

  expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/access-denied");
});

test("renders children when allowed", () => {
  useMyContext.mockReturnValue({ token: "jwt", isAdmin: true });

  render(
    <ProtectedRoute adminPage>
      <div>protected</div>
    </ProtectedRoute>,
  );

  expect(screen.getByText("protected")).toBeInTheDocument();
});
