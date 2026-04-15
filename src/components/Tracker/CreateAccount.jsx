import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const CreateAccount = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [newAccountName, setNewAccountName] = useState("");
  const [accountKind, setAccountKind] = useState("BROKER");
  const [tradingMode, setTradingMode] = useState("CASH");
  const [saving, setSaving] = useState(false);

  const onCreateAccount = async (e) => {
    e.preventDefault();

    if (!newAccountName.trim()) {
      toast.error(t("tracker.accountNameRequired"));
      return;
    }

    setSaving(true);
    try {
      await api.post("/accounts", {
        name: newAccountName.trim(),
        accountKind,
        tradingMode,
      });

      toast.success(t("tracker.accountCreated"));
      navigate("/portfolio");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || t("tracker.accountCreateFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-xl w-full mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">{t("tracker.addAccount")}</h1>
        <button
          type="button"
          onClick={() => navigate("/portfolio")}
          className="px-4 py-2 border rounded"
        >
          {t("tracker.backToPortfolio") ?? "Back"}
        </button>
      </div>

      <form onSubmit={onCreateAccount} className="grid gap-2">
        <input
          value={newAccountName}
          onChange={(e) => setNewAccountName(e.target.value)}
          placeholder={t("tracker.accountNamePlaceholder")}
          className="border rounded px-3 py-2"
        />

        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <label className="text-sm text-slate-600">{t("tracker.accountKind")}</label>
            <select
              value={accountKind}
              onChange={(e) => setAccountKind(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="BROKER">{t("tracker.accountKindBroker")}</option>
              <option value="P2P">{t("tracker.accountKindP2P")}</option>
              <option value="MIXED">{t("tracker.accountKindMixed")}</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600">{t("tracker.tradingMode")}</label>
            <select
              value={tradingMode}
              onChange={(e) => setTradingMode(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="CASH">{t("tracker.tradingModeCash")}</option>
              <option value="MARGIN">{t("tracker.tradingModeMargin")}</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-btnColor text-white px-4 py-2 rounded font-semibold disabled:opacity-60"
        >
          {saving ? (t("tracker.saving") ?? "Saving...") : t("tracker.addAccount")}
        </button>
      </form>
    </div>
  );
};

export default CreateAccount;