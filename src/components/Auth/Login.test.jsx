/* eslint-disable no-undef */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";
import api from "../../services/api";
import toast from "react-hot-toast";
import { jwtDecode } from "jwt-decode";
import { useMyContext } from "../../store/ContextApi";

const mockNavigate = vi.fn();
const mockSetToken = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("../../services/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock("jwt-decode", () => ({
  jwtDecode: vi.fn(),
}));

vi.mock("../../store/ContextApi", () => ({
  useMyContext: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useMyContext.mockReturnValue({
    token: null,
    setToken: mockSetToken,
  });
});

test("logs in and navigates when 2FA is disabled", async () => {
  api.post.mockResolvedValueOnce({
    status: 200,
    data: { jwtToken: "jwt.token" },
  });
  jwtDecode.mockReturnValue({
    sub: "alice",
    roles: "ROLE_USER",
    is2faEnabled: false,
  });

  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

  await userEvent.type(screen.getByLabelText("auth.username"), "alice");
  await userEvent.type(screen.getByLabelText("auth.password"), "secret");
  await userEvent.click(screen.getByRole("button", { name: "auth.login" }));

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith("/auth/public/signin", {
      username: "alice",
      password: "secret",
      code: "",
    });
  });

  expect(toast.success).toHaveBeenCalledWith("toast.loginSuccess");
  expect(mockSetToken).toHaveBeenCalledWith("jwt.token");
  expect(mockNavigate).toHaveBeenCalledWith("/portfolio");
  expect(localStorage.getItem("JWT_TOKEN")).toBe("jwt.token");
});

test("shows 2FA step when enabled", async () => {
  api.post.mockResolvedValueOnce({
    status: 200,
    data: { jwtToken: "jwt.2fa" },
  });
  jwtDecode.mockReturnValue({
    sub: "bob",
    roles: "ROLE_USER",
    is2faEnabled: true,
  });

  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

  await userEvent.type(screen.getByLabelText("auth.username"), "bob");
  await userEvent.type(screen.getByLabelText("auth.password"), "secret");
  await userEvent.click(screen.getByRole("button", { name: "auth.login" }));

  expect(await screen.findByRole("button", { name: "auth.verify2faButton" })).toBeInTheDocument();
  expect(screen.getByLabelText("auth.enterCode")).toBeInTheDocument();
});
