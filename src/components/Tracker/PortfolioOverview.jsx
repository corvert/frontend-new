import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useMyContext } from "../../store/ContextApi";

const PortfolioOverview = () => {
  const { t } = useTranslation();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("ALL");
  const [portfolio, setPortfolio] = useState(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [accountKind, setAccountKind] = useState("BROKER");
  const [tradingMode, setTradingMode] = useState("CASH");
  const [asOf, setAsOf] = useState("");
  const { isAdmin } = useMyContext();
  const navigate = useNavigate();

  const [newAccountName, setNewAccountName] = useState("");

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await api.get("/accounts");
      const list = res.data || [];
      setAccounts(list);

      if (list.length > 0) {
        setSelectedAccountId("ALL");
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

  const loadPortfolio = async (accountIdOrAll, asOfDate) => {
    if (!accountIdOrAll) return;

    setLoadingPortfolio(true);
    try {
      const qs = asOfDate ? `?asOf=${encodeURIComponent(asOfDate)}` : "";

      // ALL accounts
      if (accountIdOrAll === "ALL") {
        const ids = (accounts || []).map((a) => a.id);

        const results = await Promise.all(
          ids.map((id) => api.get(`/accounts/${id}/portfolio${qs}`).then((r) => r.data)),
        );

        // positions: keep as separate rows (MVP)
        const positions = results.flatMap((p) => p.positions || []);

        // cashBalances: sum by currency
        const cashMap = new Map(); // currency -> amount
        for (const p of results) {
          for (const b of p.cashBalances || []) {
            const cur = b.currency;
            const amt = Number(b.balance ?? 0);
            cashMap.set(cur, Number(cashMap.get(cur) ?? 0) + amt);
          }
        }
        const cashBalances = Array.from(cashMap.entries()).map(([currency, balance]) => ({
          currency,
          balance,
        }));

        // totals by currency: sum by currency
        const totalsMap = new Map(); // currency -> totals row
        for (const p of results) {
          for (const row of p.totals || []) {
            const cur = row.currency;
            const prev = totalsMap.get(cur) || {
              currency: cur,
              cashTotal: 0,
              positionsTotal: 0,
              portfolioTotal: 0,
            };
            totalsMap.set(cur, {
              currency: cur,
              cashTotal: Number(prev.cashTotal) + Number(row.cashTotal ?? 0),
              positionsTotal: Number(prev.positionsTotal) + Number(row.positionsTotal ?? 0),
              portfolioTotal: Number(prev.portfolioTotal) + Number(row.portfolioTotal ?? 0),
            });
          }
        }
        const totals = Array.from(totalsMap.values());

        // baseTotals: sum only if all complete
        const allComplete = results.every((p) => p.baseTotals?.complete);
        const baseCurrency =
          results.find((p) => p.baseTotals?.baseCurrency)?.baseTotals?.baseCurrency || "EUR";

        const baseTotals = allComplete
          ? {
              complete: true,
              baseCurrency,
              cashTotal: results.reduce((s, p) => s + Number(p.baseTotals?.cashTotal ?? 0), 0),
              positionsTotal: results.reduce(
                (s, p) => s + Number(p.baseTotals?.positionsTotal ?? 0),
                0,
              ),
              portfolioTotal: results.reduce(
                (s, p) => s + Number(p.baseTotals?.portfolioTotal ?? 0),
                0,
              ),
            }
          : { complete: false, baseCurrency };

        setPortfolio({ positions, cashBalances, totals, baseTotals });
        return;
      }

      // single account
      const res = await api.get(`/accounts/${accountIdOrAll}/portfolio${qs}`);
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
    if (!selectedAccountId) return;
    if (selectedAccountId === "ALL" && (!accounts || accounts.length === 0)) return;

    loadPortfolio(selectedAccountId, asOf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, asOf, accounts]);

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

  const onImportEcbNow = async () => {
    try {
      await api.post("/fx-rates/import/ecb");
      toast.success(t("tracker.ecbImportStarted"));
      if (selectedAccountId) {
        loadPortfolio(selectedAccountId, asOf);
      }
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || t("tracker.ecbImportFailed"));
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
            <option value="ALL">{t("tracker.allAccounts")}</option>
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.accountName ?? t("tracker.accountFallback", { id: a.id })}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">{t("tracker.asOf")}</label>
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="border rounded px-3 py-2"
          />
          {asOf && (
            <button
              type="button"
              onClick={() => setAsOf("")}
              className="px-3 py-2 border rounded hover:bg-slate-50"
            >
              {t("tracker.clear")}
            </button>
          )}
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
                  <div className="font-mono">{String(Math.round(portfolio.baseTotals.cashTotal * 100) / 100)}</div>
                </div>
                <div>
                  <div className="text-slate-600">{t("tracker.positions")}</div>
                  <div className="font-mono">{String(Math.round(portfolio.baseTotals.positionsTotal * 100) / 100)}</div>
                </div>
                <div>
                  <div className="text-slate-600">{t("tracker.total")}</div>
                  <div className="font-mono">{String(Math.round(portfolio.baseTotals.portfolioTotal * 100) / 100)}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-slate-600">{t("tracker.fxMissing")}</div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={onImportEcbNow}
                    className="px-3 py-2 border rounded hover:bg-slate-50"
                  >
                    {t("tracker.importEcbNow")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Cash balances */}
          <div className="border rounded overflow-hidden mb-6">
            <div className="p-4 font-semibold border-b flex justify-between items-center">
              {t("tracker.cashBalancesTitle")}
              <button
                type="button"
                onClick={() => {
                  const q =
                    selectedAccountId && selectedAccountId !== "ALL"
                      ? `?accountId=${encodeURIComponent(selectedAccountId)}`
                      : "";
                  navigate(`/cash-transactions/new${q}`);
                }}
                className="px-4 py-2 bg-btnColor text-white rounded font-semibold"
              >
                {t("cash.add")}
              </button>
            </div>

            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="p-3">{t("tracker.currency")}</th>
                    <th className="p-3">{t("tracker.balance")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(portfolio.cashBalances || []).map((b) => (
                    <tr key={b.currency} className="border-t">
                        <Link to="/cash">
                          <td className="p-3">{b.currency}</td>
                        </Link>
                      <td className="p-3 font-mono">{String(Math.round(b.balance * 100) / 100)}</td>
                    </tr>
                  ))}

                  {(portfolio.cashBalances || []).length === 0 && (
                    <tr className="border-t">
                      <td className="p-3 text-slate-600" colSpan={2}>
                        {t("tracker.noCashBalances")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
                      <td className="p-3 font-mono">{String(Math.round(p.quantity * 100) / 100)}</td>
                      <td className="p-3 font-mono">
                        {p.lastPrice == null ? t("tracker.na") : String(Math.round(p.lastPrice * 100) / 100)}
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
                      <td className="p-3 font-mono">{String(Math.round(tRow.cashTotal * 100) / 100)}</td>
                      <td className="p-3 font-mono">{String(Math.round(tRow.positionsTotal * 100) / 100)}</td>
                      <td className="p-3 font-mono">{String(Math.round(tRow.portfolioTotal * 100) / 100)}</td>
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
