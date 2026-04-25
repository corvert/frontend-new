import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";

const AddAccountTransfer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const fromAccountIdFromQuery = params.get("fromAccountId") || "";

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fromAccountId: fromAccountIdFromQuery,
    toAccountId: "",
    currency: "EUR",
    amount: "",
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

        if (!form.fromAccountId && list.length > 0) {
          setForm((f) => ({ ...f, fromAccountId: String(list[0].id) }));
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

  const fromAccount = useMemo(() => {
    return accounts.find((a) => String(a.id) === String(form.fromAccountId)) || null;
  }, [accounts, form.fromAccountId]);

  const toAccount = useMemo(() => {
    return accounts.find((a) => String(a.id) === String(form.toAccountId)) || null;
  }, [accounts, form.toAccountId]);

  const toAccounts = useMemo(() => {
    return (accounts || []).filter((a) => String(a.id) !== String(form.fromAccountId));
  }, [accounts, form.fromAccountId]);

  useEffect(() => {
    if (!form.toAccountId) return;
    if (String(form.toAccountId) === String(form.fromAccountId)) {
      setForm((f) => ({ ...f, toAccountId: "" }));
    }
  }, [form.fromAccountId, form.toAccountId]);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!form.fromAccountId) return toast.error(t("cash.accountRequired"));
    if (!form.toAccountId) return toast.error(t("cash.transferToRequired"));
    if (!form.executedAt) return toast.error(t("cash.dateRequired"));
    if (!form.currency?.trim()) return toast.error(t("cash.currencyRequired"));
    if (!form.amount) return toast.error(t("cash.transferAmountRequired"));

    if (String(form.fromAccountId) === String(form.toAccountId)) {
      return toast.error(t("cash.transferSameAccount"));
    }

    const amount = Number(form.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return toast.error(t("cash.transferAmountRequired"));
    }

    const currency = form.currency.trim().toUpperCase();
    const ref = `TR-${Date.now()}`;

    const systemNoteParts = [
      `transferRef=${ref}`,
      `from=${fromAccount?.accountName || form.fromAccountId}`,
      `to=${toAccount?.accountName || form.toAccountId}`,
    ];

    const note = [form.note?.trim(), systemNoteParts.join(", ")].filter(Boolean).join(" | ");

    setSaving(true);
    try {
      await api.post("/cash-transactions", {
        accountId: Number(form.fromAccountId),
        type: "WITHDRAW",
        currency,
        amount: String(amount),
        executedAt: form.executedAt,
        note: note || null,
      });

      await api.post("/cash-transactions", {
        accountId: Number(form.toAccountId),
        type: "DEPOSIT",
        currency,
        amount: String(amount),
        executedAt: form.executedAt,
        note: note || null,
      });

      toast.success(t("cash.transferCreated"));
      navigate("/cash");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || t("cash.transferCreateFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">{t("cash.loading")}</div>;

  if (!accounts || accounts.length === 0) {
    return (
      <div className="p-6 max-w-xl w-full mx-auto">
        <h1 className="text-2xl font-bold mb-2">{t("cash.transferTitle")}</h1>
        <p className="text-slate-600">{t("tracker.noAccountsHint")}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl w-full mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">{t("cash.transferTitle")}</h1>
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
          <label className="text-sm text-slate-600">{t("cash.transferFrom")}</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={form.fromAccountId}
            onChange={(e) => setField("fromAccountId", e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.accountName ?? t("tracker.accountFallback", { id: a.id })}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-slate-600">{t("cash.transferTo")}</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={form.toAccountId}
            onChange={(e) => setField("toAccountId", e.target.value)}
          >
            <option value="">{t("cash.transferToRequired")}</option>
            {toAccounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.accountName ?? t("tracker.accountFallback", { id: a.id })}
              </option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">{t("cash.transferCurrency")}</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.currency}
              onChange={(e) => setField("currency", e.target.value)}
              placeholder="EUR"
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">{t("cash.transferAmount")}</label>
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
          <label className="text-sm text-slate-600">{t("cash.date")}</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={form.executedAt}
            onChange={(e) => setField("executedAt", e.target.value)}
          />
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

export default AddAccountTransfer;
