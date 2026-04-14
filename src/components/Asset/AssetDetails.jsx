import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../../services/api";
import { formatDdMmYyyyDot } from "../../utils/dateFormat";

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

const AssetDetails = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { assetId } = useParams();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const accountId = params.get("accountId") || "ALL";
  const to = params.get("to") || "";

  const [loading, setLoading] = useState(true);
  const [assetRow, setAssetRow] = useState(null);
  const [perfSummary, setPerfSummary] = useState(null);

  const [trades, setTrades] = useState([]);
  const [cashTx, setCashTx] = useState([]);

  const loadSummary = async () => {
    const scope = accountId === "ALL" ? "ALL" : "ACCOUNT";
    const qs = new URLSearchParams();
    qs.set("scope", scope);
    if (scope === "ACCOUNT") qs.set("accountId", String(accountId));
    if (to) qs.set("to", to);

    const res = await api.get(`/performance/assets?${qs.toString()}`);
    const rows = res.data || [];
    const row = rows.find((r) => String(r.assetId) === String(assetId));
    setAssetRow(row || null);
  };

  const loadPerfSummary = async () => {
    const scope = accountId === "ALL" ? "ALL" : "ACCOUNT";
    const qs = new URLSearchParams();
    qs.set("scope", scope);
    if (scope === "ACCOUNT") qs.set("accountId", String(accountId));
    if (to) qs.set("to", to);

    const res = await api.get(`/performance/summary?${qs.toString()}`);
    setPerfSummary(res.data || null);
  };

  const loadTransactions = async () => {
    try {
      if (accountId !== "ALL") {
        const tParams = new URLSearchParams();
        tParams.set("accountId", String(accountId));
        const trRes = await api.get(`/trades?${tParams.toString()}`);
        setTrades((trRes.data || []).filter((x) => String(x.assetId) === String(assetId)));
      } else {
        setTrades([]);
      }
    } catch (e) {
      console.error(e);
      setTrades([]);
    }

    try {
      if (accountId !== "ALL") {
        const cParams = new URLSearchParams();
        cParams.set("accountId", String(accountId));
        if (to) cParams.set("to", to);
        const cashRes = await api.get(`/cash-transactions?${cParams.toString()}`);
        setCashTx(
          (cashRes.data || []).filter(
            (x) =>
              String(x.assetId) === String(assetId) &&
              (x.type === "DIVIDEND" || x.type === "INTEREST"),
          ),
        );
      } else {
        setCashTx([]);
      }
    } catch (e) {
      console.error(e);
      setCashTx([]);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadSummary(), loadTransactions(), loadPerfSummary()]);
    } catch (e) {
      console.error(e);
      toast.error(t("asset.detailsLoadFailed") ?? "Failed to load asset details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, accountId, to]);

  const base = assetRow?.baseCurrency ?? "EUR";
  const assetCostBase = Number(assetRow?.openCostBasisBase ?? 0);
  const assetCapitalGain =
    (assetRow?.totalReturnBase || 0) -
    (assetRow?.incomeBase || 0) -
    (assetRow?.feesBase || 0) -
    (assetRow?.currencyImpactBase || 0);

  const formatRoiPct = (value) => {
    const baseVal = Number(assetCostBase ?? 0);
    const v = Number(value ?? 0);
    if (!Number.isFinite(baseVal) || baseVal === 0 || !Number.isFinite(v)) return null;
    const pct = (v / baseVal) * 100;
    if (!Number.isFinite(pct)) return null;
    return `${Math.round(pct * 100) / 100}%`;
  };

  const tradesSorted = useMemo(() => {
    return [...(trades || [])].sort((a, b) =>
      String(b.executedAt || "").localeCompare(String(a.executedAt || "")),
    );
  }, [trades]);

  const cashSorted = useMemo(() => {
    return [...(cashTx || [])].sort((a, b) =>
      String(b.executedAt || "").localeCompare(String(a.executedAt || "")),
    );
  }, [cashTx]);

  if (loading) return <div className="p-6">{t("asset.loading") ?? "Loading..."}</div>;

  if (!assetRow) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{t("asset.detailsTitle") ?? "Asset details"}</h1>
          <button
            onClick={() => navigate("/portfolio")}
            className="px-4 py-2 bg-btnColor text-white rounded font-semibold hover:text-slate-300"
          >
            {t("asset.back") ?? "Back"}
          </button>
        </div>
        <div className="text-slate-600">
          {t("asset.notFoundInScope") ?? "Asset not found in selected scope/account."}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {assetRow.assetName}{" "}
            <span className="text-slate-500 font-mono">
              {assetRow.assetSymbol ? `(${assetRow.assetSymbol})` : ""}
            </span>
          </h1>
          <div className="text-slate-600 text-sm">
            {t("asset.asOf") ?? "As of"}:{" "}
            {formatDdMmYyyyDot(to || new Date().toISOString().slice(0, 10))} •{" "}
            {t("tracker.accountLabel")}:{" "}
            {accountId === "ALL" ? t("tracker.accountName") : accountId}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate("/portfolio")}
            className="px-4 py-2 bg-btnColor text-white rounded font-semibold hover:text-slate-300"
          >
            {t("asset.backToPortfolio") ?? "Back to portfolio"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="border rounded p-4 mb-6">
        <div className="grid sm:grid-cols-3 grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-slate-600">{t("asset.value") ?? "Value"}</div>
            <div className="font-mono">
              {round2(assetRow.marketValueBase)} {base}
            </div>
        
          </div>

          <div>
            <div className="text-slate-600">{t("asset.capitalGain") ?? "Capital gain"}</div>
            <div className="font-mono">
              {round2(assetCapitalGain)} {base}
            </div>
            {formatRoiPct(assetCapitalGain) && (
              <div className="text-xs text-slate-500">{formatRoiPct(assetCapitalGain)}</div>
            )}
          </div>

          <div>
            <div className="text-slate-600">{t("asset.fees") ?? "Fees"}</div>
            <div className="font-mono">
              {round2(assetRow.feesBase)} {base}
            </div>
            {formatRoiPct(assetRow.feesBase) && (
              <div className="text-xs text-slate-500">{formatRoiPct(assetRow.feesBase)}</div>
            )}
          </div>

          <div>
            <div className="text-slate-600">{t("asset.income") ?? "Income"}</div>
            <div className="font-mono">
              {round2(assetRow.incomeBase)} {base}
            </div>
            {formatRoiPct(assetRow.incomeBase) && (
              <div className="text-xs text-slate-500">{formatRoiPct(assetRow.incomeBase)}</div>
            )}
          </div>

          <div>
            <div className="text-slate-600">{t("asset.currencyImpact") ?? "Currency impact"}</div>
            <div className="font-mono">
              {round2(assetRow.currencyImpactBase)} {base}
            </div>
            {formatRoiPct(assetRow.currencyImpactBase) && (
              <div className="text-xs text-slate-500">
                {formatRoiPct(assetRow.currencyImpactBase)}
              </div>
            )}
          </div>

          <div>
            <div className="text-slate-600">{t("asset.totalReturn") ?? "Total return"}</div>
            <div className="font-mono">
              {round2(assetRow.totalReturnBase)} {base}
            </div>
            {formatRoiPct(assetRow.totalReturnBase) && (
              <div className="text-xs text-slate-500">{formatRoiPct(assetRow.totalReturnBase)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Trades */}
      <div className="border rounded overflow-hidden mb-6">
        <div className="p-4 font-semibold border-b flex justify-between items-center">
          {t("asset.trades") ?? "Trades"}
          <button
            onClick={() => {
              const q = new URLSearchParams();
              if (accountId !== "ALL") q.set("accountId", String(accountId));
              q.set("assetId", String(assetId));
              navigate(`/trades/new?${q.toString()}`);
            }}
            className="px-4 py-2 bg-btnColor text-white rounded font-semibold hover:text-slate-300"
          >
            {t("trade.add") ?? "Add trade"}
          </button>
          {accountId === "ALL" && (
            <div className="text-sm text-slate-600">
              {t("asset.pickAccountForTrades") ?? "Pick a single account to see trades/cashflow."}
            </div>
          )}
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="p-3">{t("trade.date") ?? "Date"}</th>
                <th className="p-3">{t("trade.side") ?? "Side"}</th>
                <th className="p-3">{t("trade.quantity") ?? "Qty"}</th>
                <th className="p-3">{t("trade.price") ?? "Price"}</th>
                <th className="p-3">{t("trade.fee") ?? "Fee"}</th>
                <th className="p-3">{t("trade.transactionSum") ?? "Transaction Sum"}</th>
                <th className="p-3">{t("trade.note") ?? "Note"}</th>
              </tr>
            </thead>
            <tbody>
              {tradesSorted.map((tr) => (
                <tr key={tr.id} className="border-t">
                  <td className="p-3 font-mono">{formatDdMmYyyyDot(tr.executedAt)}</td>
                  <td className="p-3 font-mono">{tr.side}</td>
                  <td className="p-3 font-mono">{tr.quantity}</td>
                  <td className="p-3 font-mono">
                    {tr.price} {tr.currency ?? assetRow.currency ?? ""}
                  </td>
                  <td className="p-3 font-mono">{tr.fee ?? ""}</td>
                  <td className="p-3 font-mono">
                    {Math.round(Number(tr.quantity ?? 0) * Number(tr.price ?? 0) * 100) / 100}{" "}
                    {tr.currency ?? assetRow.currency ?? ""}
                  </td>
                  <td className="p-3">{tr.note ?? ""}</td>
                </tr>
              ))}

              {tradesSorted.length === 0 && (
                <tr className="border-t">
                  <td className="p-3 text-slate-600" colSpan={6}>
                    {t("asset.noTrades") ?? "No trades found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cashflows */}
      <div className="border rounded overflow-hidden">
        <div className="p-4 font-semibold border-b flex justify-between items-center">
          {t("asset.cashflows") ?? "Cashflows (Dividend / Interest / Fees)"}
          <button
            type="button"
            onClick={() => {
              if (accountId === "ALL") {
                toast.error(t("asset.pickAccountForCash") ?? "Select a single account first");
                return;
              }
              navigate(
                `/income/new?accountId=${encodeURIComponent(accountId)}&assetId=${encodeURIComponent(assetId)}`,
              );
            }}
            className="px-4 py-2 bg-btnColor text-white rounded font-semibold hover:text-slate-300"
          >
            {t("income.addIncome") ?? "Add income"}
          </button>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="p-3">{t("cash.date") ?? "Date"}</th>
                <th className="p-3">{t("cash.type") ?? "Type"}</th>
                <th className="p-3">{t("cash.currency") ?? "Currency"}</th>
                <th className="p-3">{t("cash.amount") ?? "Amount"}</th>
                <th className="p-3">{t("cash.note") ?? "Note"}</th>
              </tr>
            </thead>
            <tbody>
              {cashSorted.map((ct) => (
                <tr key={ct.id} className="border-t">
                  <td className="p-3 font-mono">{formatDdMmYyyyDot(ct.executedAt)}</td>
                  <td className="p-3 font-mono">{ct.type}</td>
                  <td className="p-3 font-mono">{ct.currency}</td>
                  <td className="p-3 font-mono">{ct.amount}</td>
                  <td className="p-3">{ct.note ?? ""}</td>
                </tr>
              ))}

              {cashSorted.length === 0 && (
                <tr className="border-t">
                  <td className="p-3 text-slate-600" colSpan={5}>
                    {t("asset.noCashflows") ?? "No cashflows found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AssetDetails;
