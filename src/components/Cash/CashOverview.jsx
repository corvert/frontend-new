import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import { DataGrid } from "@mui/x-data-grid";

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

    const qs = params.toString();
    console.log("[CashOverview] GET /cash-transactions?" + qs, {
      accountId,
      fromDate,
      toDate,
    });

    const res = await api.get(`/cash-transactions?${qs}`);
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

  useEffect(() => {
    if (!selectedAccountId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const sortedBalances = useMemo(() => {
    return [...(balances || [])].sort((a, b) => (a.currency || "").localeCompare(b.currency || ""));
  }, [balances]);

  const sortedTxs = useMemo(() => {
    // newest first
    return [...(transactions || [])].sort((a, b) =>
      String(b.executedAt).localeCompare(String(a.executedAt)),
    );
  }, [transactions]);

  const balanceRows = useMemo(() => {
    return sortedBalances.map((b) => ({
      id: b.currency,
      currency: b.currency,
      balance: b.balance,
    }));
  }, [sortedBalances]);

  const balanceColumns = useMemo(() => {
    return [
      { field: "currency", headerName: t("tracker.currency"), flex: 1 },
      {
        field: "balance",
        headerName: t("tracker.balance"),
        flex: 1,
        renderCell: (params) => (
          <span className="font-mono">{String(params.row?.balance ?? "")}</span>
        ),
      },
    ];
  }, [t]);

  const transactionRows = useMemo(() => {
    return sortedTxs.map((tx) => ({
      id: tx.id ?? `${tx.executedAt}-${tx.currency}-${tx.amount}-${tx.type}`,
      executedAt: tx.executedAt,
      type: tx.type,
      currency: tx.currency,
      amount: tx.amount,
      note: tx.note || "",
    }));
  }, [sortedTxs]);

  const transactionColumns = useMemo(() => {
    return [
      {
        field: "executedAt",
        headerName: t("cash.date"),
        flex: 1,
        renderCell: (params) => (
          <span className="font-mono">{String(params.row?.executedAt ?? "")}</span>
        ),
      },
      { field: "type", headerName: t("cash.type"), flex: 1 },
      { field: "currency", headerName: t("tracker.currency"), flex: 1 },
      {
        field: "amount",
        headerName: t("cash.amount"),
        flex: 1,
        renderCell: (params) => (
          <span className="font-mono">{String(params.row?.amount ?? "")}</span>
        ),
      },
      { field: "note", headerName: t("cash.note"), flex: 1.5 },
    ];
  }, [t]);

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
            onClick={() =>
              navigate(`/cash-transactions/new?accountId=${encodeURIComponent(selectedAccountId)}`)
            }
            className="px-4 py-2 bg-btnColor text-white rounded font-semibold"
          >
            {t("cash.add")}
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(`/cash-exchange/new?accountId=${encodeURIComponent(selectedAccountId)}`)
            }
            className="px-4 py-2 border rounded"
          >
            {t("cash.exchange")}
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(`/cash-transfer/new?fromAccountId=${encodeURIComponent(selectedAccountId)}`)
            }
            className="px-4 py-2 border rounded"
          >
            {t("cash.transfer")}
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
        <div className="overflow-x-auto w-full">
          <DataGrid
            className="w-full"
            rows={balanceRows}
            columns={balanceColumns}
            autoHeight
            hideFooter
            disableRowSelectionOnClick
            disableColumnResize
            localeText={{ noRowsLabel: t("cash.noBalances") }}
          />
        </div>
      </div>

      {/* Transactions */}
      <div className="border rounded overflow-hidden">
        <div className="p-4 font-semibold border-b">{t("cash.transactionsTitle")}</div>
        <div className="overflow-x-auto w-full">
          <DataGrid
            className="w-full"
            rows={transactionRows}
            columns={transactionColumns}
            autoHeight
            disableRowSelectionOnClick
            disableColumnResize
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10 },
              },
            }}
            localeText={{ noRowsLabel: t("cash.noTransactions") }}
          />
        </div>
      </div>
    </div>
  );
};

export default CashOverview;
