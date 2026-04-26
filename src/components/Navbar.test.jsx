/* eslint-disable no-undef */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Navbar from "./Navbar";
import { useMyContext } from "../store/ContextApi";

const mockNavigate = vi.fn();
const mockSetToken = vi.fn();
const mockSetCurrentUser = vi.fn();
const mockSetIsAdmin = vi.fn();
const mockChangeLanguage = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: "/portfolio" }),
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      resolvedLanguage: "en",
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

vi.mock("../store/ContextApi", () => ({
  useMyContext: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

test("shows signup for guests", () => {
  useMyContext.mockReturnValue({
    token: null,
    setToken: mockSetToken,
    setCurrentUser: mockSetCurrentUser,
    isAdmin: false,
    setIsAdmin: mockSetIsAdmin,
  });

  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "nav.signup" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "lang.en" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "lang.et" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "nav.logout" })).not.toBeInTheDocument();
});

test("logs out and navigates", async () => {
  localStorage.setItem("JWT_TOKEN", "jwt");
  localStorage.setItem("USER", JSON.stringify({ username: "alice" }));
  localStorage.setItem("IS_ADMIN", JSON.stringify(true));

  useMyContext.mockReturnValue({
    token: "jwt",
    setToken: mockSetToken,
    setCurrentUser: mockSetCurrentUser,
    isAdmin: true,
    setIsAdmin: mockSetIsAdmin,
  });

  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "nav.admin" })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "nav.logout" }));

  expect(localStorage.getItem("JWT_TOKEN")).toBeNull();
  expect(localStorage.getItem("USER")).toBeNull();
  expect(localStorage.getItem("IS_ADMIN")).toBeNull();
  expect(mockSetToken).toHaveBeenCalledWith(null);
  expect(mockSetCurrentUser).toHaveBeenCalledWith(null);
  expect(mockSetIsAdmin).toHaveBeenCalledWith(false);
  expect(mockNavigate).toHaveBeenCalledWith("/login");
});
