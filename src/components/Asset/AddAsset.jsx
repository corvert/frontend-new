import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";

const ASSET_TYPES = ["STOCK", "P2P", "ETF", "BOND"];

const AddAsset = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const returnTo = params.get("returnTo") || "/portfolio";
  const accountId = params.get("accountId") || ""; // optional

  const [form, setForm] = useState({
    type: "STOCK",
    symbol: "",
    isin: "",
    name: "",
    currency: "EUR",
  });

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error(t("asset.nameRequired"));
      return;
    }

    if (form.type !== "P2P" && !form.symbol.trim() && !form.isin.trim()) {
      toast.error(t("asset.symbolOrIsinRequired") ?? "Either symbol or ISIN is required");
      return;
    }

    try {
      const res = await api.post("/assets", {
        type: form.type,
        symbol: form.symbol?.trim() || null,
        isin: form.isin?.trim() || null,
        name: form.name.trim(),
        currency: form.currency?.trim()?.toUpperCase() || null,
      });

      const created = res.data;
      toast.success(t("asset.created"));

      if (returnTo.startsWith("/trades/new")) {
        const q = new URLSearchParams();
        if (accountId) q.set("accountId", accountId);
        q.set("assetId", String(created.id));
        navigate(`${returnTo}?${q.toString()}`);
      } else {
        navigate(returnTo);
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || t("asset.createFailed"));
    }
  };

  return (
    <div className="p-6 max-w-xl w-full mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t("asset.title")}</h1>

      <form onSubmit={onSubmit} className="grid gap-3">
        <div>
          <label className="text-sm text-slate-600">{t("asset.type")}</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={form.type}
            onChange={(e) => setField("type", e.target.value)}
          >
            {ASSET_TYPES.map((x) => (
              <option key={x} value={x}>
                {t(`asset.type_${x}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-slate-600">{t("asset.name")}</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder={t("asset.namePlaceholder")}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">{t("asset.symbol")}</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.symbol}
              onChange={(e) => setField("symbol", e.target.value)}
              placeholder="AAPL"
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">{t("asset.isin")}</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.isin}
              onChange={(e) => setField("isin", e.target.value)}
              placeholder="US0378331005"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-600">{t("asset.currency")}</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={form.currency}
            onChange={(e) => setField("currency", e.target.value)}
            placeholder="EUR"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="bg-btnColor text-white px-4 py-2 rounded font-semibold">
            {t("asset.submit")}
          </button>
          <button
            type="button"
            onClick={() => navigate(returnTo)}
            className="px-4 py-2 border rounded"
          >
            {t("asset.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddAsset;
