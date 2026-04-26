/* eslint-disable no-undef */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddCashExchange from "./AddCashExchange";
import api from "../../services/api";
import toast from "react-hot-toast";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ search: "" }),
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
    get: vi.fn(),
    post: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("shows exchange rate when amounts are set", async () => {
  api.get.mockResolvedValueOnce({
    data: [{ id: 1, accountName: "Main" }],
  });

  render(<AddCashExchange />);

  await screen.findByText("cash.exchangeTitle");

  const amountInputs = screen.getAllByPlaceholderText("0.00");
  const sellAmountInput = amountInputs[0];
  const buyAmountInput = amountInputs[1];

  await userEvent.clear(sellAmountInput);
  await userEvent.type(sellAmountInput, "100");
  await userEvent.clear(buyAmountInput);
  await userEvent.type(buyAmountInput, "120");

  expect(screen.getByText("1 EUR = 1.2000 USD")).toBeInTheDocument();
});

test("submits withdraw, deposit, and fee transactions", async () => {
  api.get.mockResolvedValueOnce({
    data: [{ id: 1, accountName: "Main" }],
  });
  api.post.mockResolvedValue({ data: {} });

  render(<AddCashExchange />);

  await screen.findByText("cash.exchangeTitle");

  const amountInputs = screen.getAllByPlaceholderText("0.00");
  const sellAmountInput = amountInputs[0];
  const buyAmountInput = amountInputs[1];
  const feeAmountInput = amountInputs[2];

  await userEvent.clear(sellAmountInput);
  await userEvent.type(sellAmountInput, "100");
  await userEvent.clear(buyAmountInput);
  await userEvent.type(buyAmountInput, "120");
  await userEvent.clear(feeAmountInput);
  await userEvent.type(feeAmountInput, "1.5");

  await userEvent.click(screen.getByRole("button", { name: "cash.submit" }));

  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(3));

  const [withdrawCall, depositCall, feeCall] = api.post.mock.calls;

  expect(withdrawCall[0]).toBe("/cash-transactions");
  expect(withdrawCall[1]).toEqual(
    expect.objectContaining({
      accountId: 1,
      type: "WITHDRAW",
      currency: "EUR",
      amount: "100",
      executedAt: expect.any(String),
    }),
  );

  expect(depositCall[0]).toBe("/cash-transactions");
  expect(depositCall[1]).toEqual(
    expect.objectContaining({
      accountId: 1,
      type: "DEPOSIT",
      currency: "USD",
      amount: "120",
      executedAt: expect.any(String),
    }),
  );

  expect(feeCall[0]).toBe("/cash-transactions");
  expect(feeCall[1]).toEqual(
    expect.objectContaining({
      accountId: 1,
      type: "FEE",
      currency: "EUR",
      amount: "1.5",
      executedAt: expect.any(String),
    }),
  );

  expect(toast.success).toHaveBeenCalledWith("cash.exchangeCreated");
  expect(mockNavigate).toHaveBeenCalledWith("/cash");
});

test("shows empty state when no accounts exist", async () => {
  api.get.mockResolvedValueOnce({ data: [] });

  render(<AddCashExchange />);

  expect(await screen.findByText("tracker.noAccountsHint")).toBeInTheDocument();
});
