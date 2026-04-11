import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";

const CASH_TYPES = ["DEPOSIT", "WITHDRAW", "TRADE", "FEE", "DIVIDEND", "INTEREST"];

const AddCashTransaction = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const cashTypeLabelKey = {
    DEPOSIT: "cash.typeDeposit",
    WITHDRAW: "cash.typeWithdraw",
    TRADE: "cash.typeTrade",
    FEE: "cash.typeFee",
    DIVIDEND: "cash.typeDividend",
    INTEREST: "cash.typeInterest",
  };

  const params = new URLSearchParams(location.search);
  const accountIdFromQuery = params.get("accountId") || "";

  const [form, setForm] = useState({
    accountId: accountIdFromQuery,
    type: "DEPOSIT",
    currency: "EUR",
    amount: "",
    executedAt: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/accounts");
      const list = res.data || [];
      setAccounts(list);

      // if no accountId in query, default to first
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

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!form.accountId) return toast.error(t("cash.accountRequired"));
    if (!form.currency?.trim()) return toast.error(t("cash.currencyRequired"));
    if (!form.amount) return toast.error(t("cash.amountRequired"));
    if (!form.executedAt) return toast.error(t("cash.dateRequired"));

    try {
      await api.post("/cash-transactions", {
        accountId: Number(form.accountId),
        type: form.type,
        currency: form.currency.trim().toUpperCase(),
        amount: form.amount,
        executedAt: form.executedAt,
        note: form.note?.trim() || null,
      });

      toast.success(t("cash.created"));
      navigate("/portfolio");
    } catch (e2) {
      console.error(e2);
      toast.error(e2?.response?.data?.message || t("cash.createFailed"));
    }
  };

  if (loading) return <div className="p-6">{t("cash.loading")}</div>;

  if (!accounts || accounts.length === 0) {
    return (
      <div className="p-6 max-w-xl w-full mx-auto">
        <h1 className="text-2xl font-bold mb-2">{t("cash.title")}</h1>
        <p className="text-slate-600">{t("tracker.noAccountsHint")}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl w-full mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t("cash.title")}</h1>

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
            <label className="text-sm text-slate-600">{t("cash.type")}</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.type}
              onChange={(e) => setField("type", e.target.value)}
            >
              {CASH_TYPES.map((ct) => (
                <option key={ct} value={ct}>
                  {t(cashTypeLabelKey[ct])}
                </option>
              ))}
            </select>
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

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">{t("cash.currency")}</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.currency}
              onChange={(e) => setField("currency", e.target.value)}
              placeholder="EUR"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">{t("cash.amount")}</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-3 py-2"
              value={form.amount}
              onChange={(e) => setField("amount", e.target.value)}
              placeholder="0.00"
            />
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

        <div className="flex gap-2 pt-2">
          <button type="submit" className="bg-btnColor text-white px-4 py-2 rounded font-semibold">
            {t("cash.submit")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/portfolio")}
            className="px-4 py-2 border rounded"
          >
            {t("cash.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCashTransaction;
