/* eslint-disable no-undef */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddTrade from "./AddTrade";
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

test("submits trade and upserts price", async () => {
  api.get
    .mockResolvedValueOnce({
      data: [{ id: 1, accountName: "Main", accountKind: "CASH" }],
    })
    .mockResolvedValueOnce({
      data: [{ id: 10, name: "Apple", symbol: "AAPL", currency: "USD" }],
    });
  api.post.mockResolvedValue({ data: {} });

  render(<AddTrade />);

  await screen.findByText("trade.title");

  const numberInputs = screen.getAllByRole("spinbutton");
  const quantityInput = numberInputs[0];
  const priceInput = numberInputs[1];

  await userEvent.clear(quantityInput);
  await userEvent.type(quantityInput, "5");
  await userEvent.clear(priceInput);
  await userEvent.type(priceInput, "250");

  await userEvent.click(screen.getByRole("button", { name: "trade.submit" }));

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith(
      "/trades",
      expect.objectContaining({
        accountId: 1,
        assetId: 10,
        side: "BUY",
        quantity: "5",
        price: "250",
        executedAt: expect.any(String),
      }),
    );
  });

  expect(api.post).toHaveBeenCalledWith("/assets/10/prices", {
    priceDate: expect.any(String),
    price: "250",
  });
  expect(toast.success).toHaveBeenCalledWith("trade.created");
  expect(mockNavigate).toHaveBeenCalledWith("/portfolio");
});

test("shows empty assets hint when none exist", async () => {
  api.get
    .mockResolvedValueOnce({
      data: [{ id: 1, accountName: "Main", accountKind: "CASH" }],
    })
    .mockResolvedValueOnce({ data: [] });

  render(<AddTrade />);

  expect(await screen.findByText("trade.noAssetsHint")).toBeInTheDocument();
});
