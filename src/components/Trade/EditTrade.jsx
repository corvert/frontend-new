import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";

const TRADE_SIDES = ["BUY", "SELL"];

const EditTrade = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { tradeId } = useParams();

  const params = new URLSearchParams(location.search);
  const returnTo = params.get("returnTo") || "/portfolio";

  const [accounts, setAccounts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    accountId: "",
    assetId: "",
    side: "BUY",
    quantity: "",
    price: "",
    executedAt: "",
    fee: "",
    note: "",
  });

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const loadAll = async () => {
    setLoading(true);
    try {
      const [accRes, assetRes, tradeRes] = await Promise.all([
        api.get("/accounts"),
        api.get("/assets"),
        api.get(`/trades/${tradeId}`),
      ]);

      const accList = accRes.data || [];
      const assetList = assetRes.data || [];
      const trade = tradeRes.data;

      setAccounts(accList);
      setAssets(assetList);

      if (!trade) throw new Error("Trade not found");

      setForm({
        accountId: trade.accountId ? String(trade.accountId) : "",
        assetId: trade.assetId ? String(trade.assetId) : "",
        side: trade.side || "BUY",
        quantity: trade.quantity ?? "",
        price: trade.price ?? "",
        executedAt: trade.executedAt || new Date().toISOString().slice(0, 10),
        fee: trade.fee ?? "",
        note: trade.note ?? "",
      });
    } catch (e) {
      console.error(e);
      toast.error(t("trade.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId]);

  const tradeAccounts = useMemo(() => {
    return (accounts || []).filter((a) => a.accountKind !== "P2P");
  }, [accounts]);

  const sortedAssets = useMemo(() => {
    return [...(assets || [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [assets]);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!form.accountId) return toast.error(t("trade.accountRequired"));
    if (!form.assetId) return toast.error(t("trade.assetRequired"));
    if (!form.quantity) return toast.error(t("trade.quantityRequired"));
    if (!form.price) return toast.error(t("trade.priceRequired"));
    if (!form.executedAt) return toast.error(t("trade.dateRequired"));

    try {
      setSaving(true);
      await api.put(`/trades/${tradeId}`, {
        accountId: Number(form.accountId),
        assetId: Number(form.assetId),
        side: form.side,
        quantity: form.quantity,
        price: form.price,
        executedAt: form.executedAt,
        fee: form.fee ? form.fee : null,
        note: form.note?.trim() || null,
      });

      try {
        await api.post(`/assets/${Number(form.assetId)}/prices`, {
          priceDate: form.executedAt,
          price: form.price,
        });
      } catch (e) {
        console.error(e);
        toast.error(t("trade.priceUpsertFailed"));
      }

      toast.success(t("trade.updated"));
      navigate(returnTo);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || t("trade.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">{t("trade.loading")}</div>;

  return (
    <div className="p-6 max-w-xl w-full mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t("trade.editTitle")}</h1>

      <form onSubmit={onSubmit} className="grid gap-3">
        <div>
          <label className="text-sm text-slate-600">{t("trade.account")}</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={form.accountId}
            onChange={(e) => setField("accountId", e.target.value)}
          >
            {tradeAccounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.accountName ?? t("tracker.accountFallback", { id: a.id })}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-slate-600">{t("trade.asset")}</label>
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
          {sortedAssets.length === 0 && (
            <div className="text-sm text-slate-600 mt-2">{t("trade.noAssetsHint")}</div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">{t("trade.side")}</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.side}
              onChange={(e) => setField("side", e.target.value)}
            >
              {TRADE_SIDES.map((s) => (
                <option key={s} value={s}>
                  {t(`trade.side_${s}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600">{t("trade.date")}</label>
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
            <label className="text-sm text-slate-600">{t("trade.quantity")}</label>
            <input
              type="number"
              step="0.0001"
              className="w-full border rounded px-3 py-2"
              value={form.quantity}
              onChange={(e) => setField("quantity", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">{t("trade.price")}</label>
            <input
              type="number"
              step="0.0001"
              className="w-full border rounded px-3 py-2"
              value={form.price}
              onChange={(e) => setField("price", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-600">{t("trade.fee")}</label>
          <input
            type="number"
            step="0.01"
            className="w-full border rounded px-3 py-2"
            value={form.fee}
            onChange={(e) => setField("fee", e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">{t("trade.note")}</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
            placeholder={t("trade.notePlaceholder")}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            className="bg-btnColor text-white px-4 py-2 rounded font-semibold"
            disabled={saving}
          >
            {saving ? t("tracker.saving") : t("trade.saveChanges")}
          </button>
          <button
            type="button"
            onClick={() => navigate(returnTo)}
            className="px-4 py-2 border rounded"
          >
            {t("trade.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditTrade;
