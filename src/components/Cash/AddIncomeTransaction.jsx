import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";

const INCOME_TYPES = ["DIVIDEND", "INTEREST"];

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

const AddIncomeTransaction = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const accountIdFromQuery = params.get("accountId") || "";
  const assetIdFromQuery = params.get("assetId") || "";
  const typeFromQuery = params.get("type") || ""; // DIVIDEND/INTEREST

  const [accounts, setAccounts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    accountId: accountIdFromQuery,
    assetId: assetIdFromQuery,
    type: INCOME_TYPES.includes(typeFromQuery) ? typeFromQuery : "DIVIDEND",
    currency: "",
    executedAt: new Date().toISOString().slice(0, 10),
    grossAmount: "",
    withholdingTax: "",
    note: "",
  });

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, assetRes] = await Promise.all([api.get("/accounts"), api.get("/assets")]);
      const accList = accRes.data || [];
      const assetList = assetRes.data || [];

      setAccounts(accList);
      setAssets(assetList);

      // default account
      if (!form.accountId && accList.length > 0) {
        setForm((f) => ({ ...f, accountId: String(accList[0].id) }));
      }

      // default asset
      if (!form.assetId && assetList.length > 0) {
        setForm((f) => ({ ...f, assetId: String(assetList[0].id) }));
      }
    } catch (e) {
      console.error(e);
      toast.error(t("income.loadFailed") ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedAssets = useMemo(() => {
    return [...(assets || [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [assets]);

  const selectedAsset = useMemo(() => {
    return (assets || []).find((a) => String(a.id) === String(form.assetId)) || null;
  }, [assets, form.assetId]);

  // default currency from asset currency
  useEffect(() => {
    if (!form.currency && selectedAsset?.currency) {
      setForm((f) => ({ ...f, currency: selectedAsset.currency }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAsset?.currency]);

  const gross = Number(form.grossAmount || 0);
  const tax = Number(form.withholdingTax || 0);
  const net = round2(gross - tax);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!form.accountId) return toast.error(t("income.accountRequired") ?? "Account is required");
    if (!form.assetId) return toast.error(t("income.assetRequired") ?? "Asset is required");
    if (!form.executedAt) return toast.error(t("income.dateRequired") ?? "Date is required");
    if (!form.currency?.trim()) return toast.error(t("income.currencyRequired") ?? "Currency is required");
    if (!form.grossAmount) return toast.error(t("income.grossRequired") ?? "Gross amount is required");

    if (gross < 0) return toast.error(t("income.grossPositive") ?? "Gross amount must be positive");
    if (tax < 0) return toast.error(t("income.taxNonNegative") ?? "Withholding tax cannot be negative");
    if (net < 0) return toast.error(t("income.netNonNegative") ?? "Net amount cannot be negative");

    const sysNoteParts = [
      `gross=${round2(gross)}`,
      `withholdingTax=${round2(tax)}`,
      `net=${round2(net)}`
    ];
    const note = [form.note?.trim(), sysNoteParts.join(", ")].filter(Boolean).join(" | ");

    try {
      await api.post("/cash-transactions", {
        accountId: Number(form.accountId),
        assetId: Number(form.assetId),
        type: form.type,
        currency: form.currency.trim().toUpperCase(),
        amount: String(net),
        executedAt: form.executedAt,
        note: note || null,
      });

      toast.success(t("income.created") ?? "Income transaction created");
      navigate("/portfolio");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || (t("income.createFailed") ?? "Failed to create"));
    }
  };

  if (loading) return <div className="p-6">{t("income.loading") ?? "Loading..."}</div>;

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">{t("income.title") ?? "Add dividend / interest"}</h1>
        <button type="button" onClick={() => navigate("/portfolio")} className="px-4 py-2 border rounded">
          {t("income.cancel") ?? "Cancel"}
        </button>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3">
        <div>
          <label className="text-sm text-slate-600">{t("income.account") ?? "Account"}</label>
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

        <div>
          <label className="text-sm text-slate-600">{t("income.asset") ?? "Asset"}</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={form.assetId}
            onChange={(e) => setField("assetId", e.target.value)}
          >
            {sortedAssets.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.name} {a.symbol ? `(${a.symbol})` : ""} {a.currency ? `- ${a.currency}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">{t("income.type") ?? "Type"}</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.type}
              onChange={(e) => setField("type", e.target.value)}
            >
              {INCOME_TYPES.map((x) => (
                <option key={x} value={x}>
                  {t(`cash.type${x[0]}${x.slice(1).toLowerCase()}`) /* uses existing cash.typeDividend/Interest */}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600">{t("income.date") ?? "Date"}</label>
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
            <label className="text-sm text-slate-600">{t("income.currency") ?? "Currency"}</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.currency}
              onChange={(e) => setField("currency", e.target.value)}
              placeholder={selectedAsset?.currency || "USD"}
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">{t("income.grossAmount") ?? "Gross amount"}</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-3 py-2"
              value={form.grossAmount}
              onChange={(e) => setField("grossAmount", e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">{t("income.withholdingTax") ?? "Withholding tax"}</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-3 py-2"
              value={form.withholdingTax}
              onChange={(e) => setField("withholdingTax", e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">{t("income.netAmount") ?? "Net amount"}</label>
            <input
              className="w-full border rounded px-3 py-2 bg-slate-50"
              value={`${round2(net)}`}
              readOnly
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-600">{t("income.note") ?? "Note"}</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
            placeholder={t("income.notePlaceholder") ?? ""}
          />
        </div>

        <button type="submit" className="bg-btnColor text-white px-4 py-2 rounded font-semibold">
          {t("income.submit") ?? "Save"}
        </button>
      </form>
    </div>
  );
};

export default AddIncomeTransaction;