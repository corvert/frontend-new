import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";

const CashOverview = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

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
      }
    } catch (e) {
      console.error(e);
      toast.error(t("tracker.accountsLoadFailed"));
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadBalances = async (accountId) => {
    const res = await api.get(`/accounts/${accountId}/cash-balances`);
    return res.data || [];
  };

  const loadTransactions = async (accountId, fromDate, toDate) => {
    const params = new URLSearchParams();
    params.set("accountId", String(accountId));
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);

    const res = await api.get(`/cash-transactions?${params.toString()}`);
    return res.data || [];
  };

  const refresh = async () => {
    if (!selectedAccountId) return;
    setLoadingData(true);
    try {
      const [bals, txs] = await Promise.all([
        loadBalances(selectedAccountId),
        loadTransactions(selectedAccountId, from, to),
      ]);
      setBalances(bals);
      setTransactions(txs);
    } catch (e) {
      console.error(e);
      toast.error(t("cash.loadFailed"));
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  const sortedBalances = useMemo(() => {
    return [...(balances || [])].sort((a, b) => (a.currency || "").localeCompare(b.currency || ""));
  }, [balances]);

  const sortedTxs = useMemo(() => {
    // newest first
    return [...(transactions || [])].sort((a, b) => String(b.executedAt).localeCompare(String(a.executedAt)));
  }, [transactions]);

  if (loadingAccounts) return <div className="p-6">{t("cash.loading")}</div>;

  if (!accounts || accounts.length === 0) {
    return (
      <div className="p-6 max-w-xl">
        <h1 className="text-2xl font-bold mb-2">{t("cash.overviewTitle")}</h1>
        <p className="text-slate-600">{t("tracker.noAccountsHint")}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t("cash.overviewTitle")}</h1>
          <p className="text-slate-600">{t("cash.overviewSubtitle")}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm text-slate-600">{t("tracker.accountLabel")}</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="border rounded px-3 py-2"
          >
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.accountName ?? t("tracker.accountFallback", { id: a.id })}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => navigate(`/cash-transactions/new?accountId=${encodeURIComponent(selectedAccountId)}`)}
            className="px-4 py-2 bg-btnColor text-white rounded font-semibold"
          >
            {t("cash.add")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="border rounded p-4 mb-6">
        <div className="font-semibold mb-3">{t("cash.filters")}</div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">{t("cash.from")}</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">{t("cash.to")}</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>

          <button
            type="button"
            onClick={refresh}
            className="px-4 py-2 border rounded hover:bg-slate-50"
            disabled={loadingData}
          >
            {loadingData ? t("cash.loading") : t("cash.apply")}
          </button>

          {(from || to) && (
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
              className="px-4 py-2 border rounded hover:bg-slate-50"
            >
              {t("tracker.clear")}
            </button>
          )}
        </div>
      </div>

      {/* Balances */}
      <div className="border rounded overflow-hidden mb-6">
        <div className="p-4 font-semibold border-b">{t("cash.balancesTitle")}</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="p-3">{t("tracker.currency")}</th>
                <th className="p-3">{t("tracker.balance")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedBalances.map((b) => (
                <tr key={b.currency} className="border-t">
                  <td className="p-3">{b.currency}</td>
                  <td className="p-3 font-mono">{String(b.balance)}</td>
                </tr>
              ))}

              {sortedBalances.length === 0 && (
                <tr className="border-t">
                  <td className="p-3 text-slate-600" colSpan={2}>
                    {t("cash.noBalances")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions */}
      <div className="border rounded overflow-hidden">
        <div className="p-4 font-semibold border-b">{t("cash.transactionsTitle")}</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="p-3">{t("cash.date")}</th>
                <th className="p-3">{t("cash.type")}</th>
                <th className="p-3">{t("tracker.currency")}</th>
                <th className="p-3">{t("cash.amount")}</th>
                <th className="p-3">{t("cash.note")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedTxs.map((tx) => (
                <tr key={tx.id} className="border-t">
                  <td className="p-3 font-mono">{String(tx.executedAt)}</td>
                  <td className="p-3">{String(tx.type)}</td>
                  <td className="p-3">{tx.currency}</td>
                  <td className="p-3 font-mono">{String(tx.amount)}</td>
                  <td className="p-3">{tx.note || ""}</td>
                </tr>
              ))}

              {sortedTxs.length === 0 && (
                <tr className="border-t">
                  <td className="p-3 text-slate-600" colSpan={5}>
                    {t("cash.noTransactions")}
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

export default CashOverview;