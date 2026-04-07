import React, { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const PortfolioOverview = () => {
  const { t } = useTranslation();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [portfolio, setPortfolio] = useState(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [accountKind, setAccountKind] = useState("BROKER");
  const [tradingMode, setTradingMode] = useState("CASH");

  const [newAccountName, setNewAccountName] = useState("");

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await api.get("/accounts");
      const list = res.data || [];
      setAccounts(list);

      if (list.length > 0) {
        setSelectedAccountId(String(list[0].id));
      } else {
        setSelectedAccountId("");
        setPortfolio(null);
      }
    } catch (e) {
      console.error(e);
      toast.error(t("tracker.accountsLoadFailed"));
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadPortfolio = async (accountId) => {
    if (!accountId) return;
    setLoadingPortfolio(true);
    try {
      const res = await api.get(`/accounts/${accountId}/portfolio`);
      setPortfolio(res.data);
    } catch (e) {
      console.error(e);
      toast.error(t("tracker.portfolioLoadFailed"));
    } finally {
      setLoadingPortfolio(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadPortfolio(selectedAccountId);
    }
  }, [selectedAccountId]);

  const sortedPositions = useMemo(() => {
    const positions = portfolio?.positions || [];
    return [...positions].sort((a, b) => {
      const av = Number(a.marketValue ?? 0);
      const bv = Number(b.marketValue ?? 0);
      return bv - av; // DESC
    });
  }, [portfolio]);

  const onCreateAccount = async (e) => {
    e.preventDefault();

    if (!newAccountName.trim()) {
      toast.error(t("tracker.accountNameRequired"));
      return;
    }

    try {
      // adjust request fields if your CreateAccountRequest differs
      await api.post("/accounts", {
        name: newAccountName.trim(),
        accountKind,
        tradingMode,
      });
      toast.success(t("tracker.accountCreated"));
      setNewAccountName("");
      await loadAccounts();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || t("tracker.accountCreateFailed"));
    }
  };

  if (loadingAccounts) {
    return <div className="p-6">{t("tracker.loadingAccounts")}</div>;
  }

  // No accounts UX
  if (!accounts || accounts.length === 0) {
    return (
      <div className="p-6 max-w-xl">
        <h1 className="text-2xl font-bold mb-2">{t("tracker.portfolioTitle")}</h1>
        <p className="text-slate-600 mb-6">{t("tracker.noAccountsHint")}</p>

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

          <button type="submit" className="bg-btnColor text-white px-4 py-2 rounded font-semibold">
            {t("tracker.addAccount")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("tracker.portfolioTitle")}</h1>
          <p className="text-slate-600">{t("tracker.sortedByMarketValueDesc")}</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">{t("tracker.accountLabel")}</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="border rounded px-3 py-2"
          >
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.name ?? t("tracker.accountFallback", { id: a.id })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingPortfolio ? (
        <div>{t("tracker.loadingPortfolio")}</div>
      ) : !portfolio ? (
        <div>{t("tracker.portfolioMissing")}</div>
      ) : (
        <>
          {/* Base totals */}
          <div className="border rounded p-4 mb-6">
            <div className="font-semibold mb-2">{t("tracker.baseTotalsTitle")}</div>
            {portfolio.baseTotals?.complete ? (
              <div className="grid sm:grid-cols-4 grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-600">{t("tracker.baseCurrency")}</div>
                  <div className="font-mono">{portfolio.baseTotals.baseCurrency}</div>
                </div>
                <div>
                  <div className="text-slate-600">{t("tracker.cash")}</div>
                  <div className="font-mono">{String(portfolio.baseTotals.cashTotal)}</div>
                </div>
                <div>
                  <div className="text-slate-600">{t("tracker.positions")}</div>
                  <div className="font-mono">{String(portfolio.baseTotals.positionsTotal)}</div>
                </div>
                <div>
                  <div className="text-slate-600">{t("tracker.total")}</div>
                  <div className="font-mono">{String(portfolio.baseTotals.portfolioTotal)}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-600">{t("tracker.fxMissing")}</div>
            )}
          </div>

          {/* Positions table */}
          <div className="border rounded overflow-hidden">
            <div className="p-4 font-semibold border-b">{t("tracker.assetsTitle")}</div>

            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="p-3">{t("tracker.symbol")}</th>
                    <th className="p-3">{t("tracker.name")}</th>
                    <th className="p-3">{t("tracker.currency")}</th>
                    <th className="p-3">{t("tracker.quantity")}</th>
                    <th className="p-3">{t("tracker.lastPrice")}</th>
                    <th className="p-3">{t("tracker.marketValue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPositions.map((p) => (
                    <tr key={p.assetId} className="border-t">
                      <td className="p-3 font-mono">{p.assetSymbol}</td>
                      <td className="p-3">{p.assetName}</td>
                      <td className="p-3">{p.currency}</td>
                      <td className="p-3 font-mono">{String(p.quantity)}</td>
                      <td className="p-3 font-mono">
                        {p.lastPrice == null ? t("tracker.na") : String(p.lastPrice)}
                      </td>
                      <td className="p-3 font-mono">
                        {p.marketValue == null ? t("tracker.na") : String(p.marketValue)}
                      </td>
                    </tr>
                  ))}

                  {sortedPositions.length === 0 && (
                    <tr className="border-t">
                      <td className="p-3 text-slate-600" colSpan={6}>
                        {t("tracker.noPositions")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Currency totals table */}
          <div className="border rounded overflow-hidden mt-6">
            <div className="p-4 font-semibold border-b">{t("tracker.totalsByCurrencyTitle")}</div>

            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="p-3">{t("tracker.currency")}</th>
                    <th className="p-3">{t("tracker.cash")}</th>
                    <th className="p-3">{t("tracker.positions")}</th>
                    <th className="p-3">{t("tracker.total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(portfolio.totals || []).map((tRow) => (
                    <tr key={tRow.currency} className="border-t">
                      <td className="p-3">{tRow.currency}</td>
                      <td className="p-3 font-mono">{String(tRow.cashTotal)}</td>
                      <td className="p-3 font-mono">{String(tRow.positionsTotal)}</td>
                      <td className="p-3 font-mono">{String(tRow.portfolioTotal)}</td>
                    </tr>
                  ))}

                  {(portfolio.totals || []).length === 0 && (
                    <tr className="border-t">
                      <td className="p-3 text-slate-600" colSpan={4}>
                        {t("tracker.noTotals")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PortfolioOverview;
