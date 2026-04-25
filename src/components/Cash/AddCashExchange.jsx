import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

const AddCashExchange = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const accountIdFromQuery = params.get("accountId") || "";

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    accountId: accountIdFromQuery,
    sellCurrency: "EUR",
    sellAmount: "",
    buyCurrency: "USD",
    buyAmount: "",
    feeAmount: "",
    executedAt: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    const loadAccounts = async () => {
      setLoading(true);
      try {
        const res = await api.get("/accounts");
        const list = res.data || [];
        setAccounts(list);

        if (!form.accountId && list.length > 0) {
          setForm((f) => ({ ...f, accountId: String(list[0].id) }));
        }
      } catch (e) {
        console.error(e);
        toast.error(t("tracker.accountsLoadFailed"));
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rate = useMemo(() => {
    const sell = Number(form.sellAmount || 0);
    const buy = Number(form.buyAmount || 0);
    if (!Number.isFinite(sell) || !Number.isFinite(buy) || sell <= 0 || buy <= 0) return null;
    return buy / sell;
  }, [form.sellAmount, form.buyAmount]);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!form.accountId) return toast.error(t("cash.accountRequired"));
    if (!form.executedAt) return toast.error(t("cash.dateRequired"));
    if (!form.sellCurrency?.trim() || !form.buyCurrency?.trim()) {
      return toast.error(t("cash.currencyRequired"));
    }

    if (form.sellCurrency.trim().toUpperCase() === form.buyCurrency.trim().toUpperCase()) {
      return toast.error(t("cash.exchangeSameCurrency"));
    }

    if (!form.sellAmount) return toast.error(t("cash.sellAmountRequired"));
    if (!form.buyAmount) return toast.error(t("cash.buyAmountRequired"));

    const sellAmount = Number(form.sellAmount || 0);
    const buyAmount = Number(form.buyAmount || 0);
    const feeAmount = form.feeAmount === "" ? null : Number(form.feeAmount || 0);

    if (sellAmount <= 0 || !Number.isFinite(sellAmount)) {
      return toast.error(t("cash.sellAmountRequired"));
    }
    if (buyAmount <= 0 || !Number.isFinite(buyAmount)) {
      return toast.error(t("cash.buyAmountRequired"));
    }
    if (feeAmount != null && (feeAmount < 0 || !Number.isFinite(feeAmount))) {
      return toast.error(t("cash.feeNonNegative"));
    }

    const sellCurrency = form.sellCurrency.trim().toUpperCase();
    const buyCurrency = form.buyCurrency.trim().toUpperCase();
    const ref = `FX-${Date.now()}`;

    const systemNoteParts = [
      `fxRef=${ref}`,
      `sell=${sellCurrency} ${round2(sellAmount)}`,
      `buy=${buyCurrency} ${round2(buyAmount)}`,
    ];
    if (feeAmount != null && feeAmount > 0) {
      systemNoteParts.push(`fee=${sellCurrency} ${round2(feeAmount)}`);
    }

    const note = [form.note?.trim(), systemNoteParts.join(", ")].filter(Boolean).join(" | ");

    setSaving(true);
    try {
      await api.post("/cash-transactions", {
        accountId: Number(form.accountId),
        type: "WITHDRAW",
        currency: sellCurrency,
        amount: String(sellAmount),
        executedAt: form.executedAt,
        note: note || null,
      });

      await api.post("/cash-transactions", {
        accountId: Number(form.accountId),
        type: "DEPOSIT",
        currency: buyCurrency,
        amount: String(buyAmount),
        executedAt: form.executedAt,
        note: note || null,
      });

      if (feeAmount != null && feeAmount > 0) {
        await api.post("/cash-transactions", {
          accountId: Number(form.accountId),
          type: "FEE",
          currency: sellCurrency,
          amount: String(feeAmount),
          executedAt: form.executedAt,
          note: note || null,
        });
      }

      toast.success(t("cash.exchangeCreated"));
      navigate("/cash");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || t("cash.exchangeCreateFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">{t("cash.loading")}</div>;

  if (!accounts || accounts.length === 0) {
    return (
      <div className="p-6 max-w-xl w-full mx-auto">
        <h1 className="text-2xl font-bold mb-2">{t("cash.exchangeTitle")}</h1>
        <p className="text-slate-600">{t("tracker.noAccountsHint")}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl w-full mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">{t("cash.exchangeTitle")}</h1>
        <button
          type="button"
          onClick={() => navigate("/cash")}
          className="px-4 py-2 border rounded"
        >
          {t("cash.cancel")}
        </button>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3">
        <div>
          <label className="text-sm text-slate-600">{t("cash.account")}</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={form.accountId}
            onChange={(e) => setField("accountId", e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.accountName ?? t("tracker.accountFallback", { id: a.id })}
              </option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">{t("cash.exchangeSellCurrency")}</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.sellCurrency}
              onChange={(e) => setField("sellCurrency", e.target.value)}
              placeholder="EUR"
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">{t("cash.exchangeSellAmount")}</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-3 py-2"
              value={form.sellAmount}
              onChange={(e) => setField("sellAmount", e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">{t("cash.exchangeBuyCurrency")}</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.buyCurrency}
              onChange={(e) => setField("buyCurrency", e.target.value)}
              placeholder="USD"
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">{t("cash.exchangeBuyAmount")}</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-3 py-2"
              value={form.buyAmount}
              onChange={(e) => setField("buyAmount", e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">{t("cash.exchangeFee")}</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-3 py-2"
              value={form.feeAmount}
              onChange={(e) => setField("feeAmount", e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">{t("cash.date")}</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={form.executedAt}
              onChange={(e) => setField("executedAt", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-600">{t("cash.exchangeRate")}</label>
          <div className="w-full border rounded px-3 py-2 bg-slate-50">
            {rate == null
              ? "-"
              : `1 ${form.sellCurrency.trim().toUpperCase()} = ${Number(rate).toFixed(4)} ${form.buyCurrency
                  .trim()
                  .toUpperCase()}`}
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-600">{t("cash.note")}</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
            placeholder={t("cash.notePlaceholder")}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-btnColor text-white px-4 py-2 rounded font-semibold disabled:opacity-60"
        >
          {saving ? t("tracker.saving") : t("cash.submit")}
        </button>
      </form>
    </div>
  );
};

export default AddCashExchange;
