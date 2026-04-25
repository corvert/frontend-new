import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../../services/api";
import { formatDdMmYyyyDot } from "../../utils/dateFormat";
import { DataGrid } from "@mui/x-data-grid";

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
  const [assetSeries, setAssetSeries] = useState([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [seriesFrom, setSeriesFrom] = useState("");
  const [seriesTo, setSeriesTo] = useState("");
  const [seriesInterval, setSeriesInterval] = useState("DAILY");
  const [seriesPreset, setSeriesPreset] = useState("ALL");

  const [accounts, setAccounts] = useState([]);
  const [trades, setTrades] = useState([]);
  const [cashTx, setCashTx] = useState([]);

  const loadAccounts = async () => {
    try {
      const res = await api.get("/accounts");
      setAccounts(res.data || []);
    } catch (e) {
      console.error(e);
      setAccounts([]);
    }
  };

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

  const loadAssetSeries = async (from, toDate, interval) => {
    if (accountId === "ALL") {
      setAssetSeries([]);
      return;
    }

    setLoadingSeries(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const resolvedFrom = from || "1900-01-01";
      const resolvedTo = toDate || to || today;

      const params = new URLSearchParams();
      params.set("from", resolvedFrom);
      params.set("to", resolvedTo);

      const res = await api.get(`/assets/${assetId}/prices?${params.toString()}`);
      const prices = res.data || [];

      const series = buildAssetSeries(prices, trades || [], resolvedFrom, resolvedTo, interval);
      setAssetSeries(series);
    } catch (e) {
      console.error(e);
      toast.error(t("asset.chartLoadFailed") ?? "Failed to load chart");
      setAssetSeries([]);
    } finally {
      setLoadingSeries(false);
    }
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
    loadAccounts();
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, accountId, to]);

  const selectedAccountName = useMemo(() => {
    if (accountId === "ALL") return t("tracker.allAccounts") ?? "All accounts";
    const match = (accounts || []).find((a) => String(a.id) === String(accountId));
    return match?.accountName ?? t("tracker.accountFallback", { id: accountId });
  }, [accounts, accountId, t]);

  useEffect(() => {
    if (to && seriesPreset !== "CUSTOM") {
      setSeriesTo(to);
    }
  }, [to, seriesPreset]);

  useEffect(() => {
    if (accountId === "ALL") return;
    loadAssetSeries(seriesFrom, seriesTo, seriesInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, accountId, seriesFrom, seriesTo, seriesInterval, trades]);

  const base = assetRow?.baseCurrency ?? "EUR";
  const assetCostBase = Number(assetRow?.openCostBasisBase ?? 0);
  const assetValueGain = (assetRow?.marketValueBase || 0) - assetCostBase;
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

  const formatChartDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = String(dateStr).split("-");
    if (parts.length !== 3) return String(dateStr);
    const [y, m, d] = parts;
    return `${d}.${m}.${y.slice(2)}`;
  };

  const buildAssetSeries = (prices, tradeRows, from, toDate, interval) => {
    if (!prices || prices.length === 0) return [];

    const sortedPrices = [...prices].sort((a, b) =>
      String(a.priceDate).localeCompare(String(b.priceDate)),
    );
    const start = from || sortedPrices[0]?.priceDate;
    const end = toDate || sortedPrices[sortedPrices.length - 1]?.priceDate;
    if (!start || !end) return [];

    const sortedTrades = [...tradeRows].sort((a, b) =>
      String(a.executedAt || "").localeCompare(String(b.executedAt || "")),
    );

    let tradeIdx = 0;
    let priceIdx = 0;
    let qty = 0;
    let lastPrice = null;

    const points = [];
    let cursor = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);

    while (cursor <= endDate) {
      const dateStr = cursor.toISOString().slice(0, 10);

      while (
        tradeIdx < sortedTrades.length &&
        String(sortedTrades[tradeIdx].executedAt) <= dateStr
      ) {
        const tr = sortedTrades[tradeIdx];
        const q = Number(tr.quantity ?? 0);
        qty += tr.side === "SELL" ? -q : q;
        tradeIdx += 1;
      }

      while (
        priceIdx < sortedPrices.length &&
        String(sortedPrices[priceIdx].priceDate) <= dateStr
      ) {
        lastPrice = Number(sortedPrices[priceIdx].price ?? 0);
        priceIdx += 1;
      }

      const value = lastPrice == null ? null : qty * lastPrice;
      points.push({ date: dateStr, value });
      cursor = stepDate(cursor, interval);
    }

    return points;
  };

  const stepDate = (date, interval) => {
    const d = new Date(date);
    if (interval === "WEEKLY") {
      d.setDate(d.getDate() + 7);
      return d;
    }
    if (interval === "MONTHLY") {
      d.setMonth(d.getMonth() + 1);
      return d;
    }
    d.setDate(d.getDate() + 1);
    return d;
  };

  const chartPoints = useMemo(() => {
    const data = (assetSeries || []).filter((p) => p && p.value != null);
    const values = data.map((p) => Number(p.value ?? 0)).filter(Number.isFinite);
    if (values.length === 0) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 1000;
    const height = 220;
    const padX = 24;
    const padY = 24;
    const plotW = width - padX * 2;
    const plotH = height - padY * 2;

    const points = data.map((p, i) => {
      const x = padX + (plotW * i) / Math.max(1, data.length - 1);
      const y = padY + plotH * (1 - (Number(p.value) - min) / range);
      return `${x},${y}`;
    });

    const area = `M ${padX},${height - padY} L ${points.join(" L ")} L ${padX + plotW},${height - padY} Z`;

    const xTickCount = Math.min(8, data.length);
    const xTickSet = new Set();
    const xTicks = [];
    for (let i = 0; i < xTickCount; i += 1) {
      const idx = Math.round((i * (data.length - 1)) / Math.max(1, xTickCount - 1));
      if (xTickSet.has(idx)) continue;
      xTickSet.add(idx);
      const x = padX + (plotW * idx) / Math.max(1, data.length - 1);
      xTicks.push({ x, label: formatChartDate(data[idx]?.date) });
    }

    const yTickCount = 5;
    const yTicks = [];
    for (let i = 0; i < yTickCount; i += 1) {
      const value = min + (range * i) / Math.max(1, yTickCount - 1);
      const y = padY + plotH * (1 - (value - min) / range);
      yTicks.push({ y, label: Math.round(value * 100) / 100 });
    }

    return {
      points: points.join(" "),
      area,
      xTicks,
      yTicks,
      height,
      width,
    };
  }, [assetSeries]);

  const onPresetChange = (value) => {
    setSeriesPreset(value);
    if (value === "ALL") {
      setSeriesFrom("");
      setSeriesTo(to || "");
      return;
    }

    const end = to || new Date().toISOString().slice(0, 10);
    const endDate = new Date(`${end}T00:00:00`);
    const startDate = new Date(endDate);

    if (value === "1M") startDate.setMonth(startDate.getMonth() - 1);
    if (value === "3M") startDate.setMonth(startDate.getMonth() - 3);
    if (value === "6M") startDate.setMonth(startDate.getMonth() - 6);
    if (value === "1Y") startDate.setFullYear(startDate.getFullYear() - 1);

    const start = startDate.toISOString().slice(0, 10);
    setSeriesFrom(start);
    setSeriesTo(end);
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

  const tradeRows = useMemo(() => {
    return tradesSorted.map((tr) => ({
      id: tr.id ?? `${tr.executedAt}-${tr.side}-${tr.quantity}-${tr.price}`,
      executedAt: tr.executedAt,
      side: tr.side,
      quantity: tr.quantity,
      price: tr.price,
      fee: tr.fee,
      currency: tr.currency ?? assetRow?.currency ?? "",
      note: tr.note ?? "",
    }));
  }, [tradesSorted, assetRow]);

  const tradeColumns = useMemo(() => {
    return [
      {
        field: "executedAt",
        headerName: t("trade.date") ?? "Date",
        flex: 1,
        renderCell: (params) => (
          <span className="font-mono">{formatDdMmYyyyDot(params.row?.executedAt)}</span>
        ),
      },
      { field: "side", headerName: t("trade.side") ?? "Side", flex: 0.8 },
      {
        field: "quantity",
        headerName: t("trade.quantity") ?? "Qty",
        flex: 0.9,
        renderCell: (params) => (
          <span className="font-mono">{String(params.row?.quantity ?? "")}</span>
        ),
      },
      {
        field: "price",
        headerName: t("trade.price") ?? "Price",
        flex: 1,
        renderCell: (params) => (
          <span className="font-mono">
            {String(params.row?.price ?? "")} {params.row?.currency ?? ""}
          </span>
        ),
      },
      {
        field: "fee",
        headerName: t("trade.fee") ?? "Fee",
        flex: 0.8,
        renderCell: (params) => <span className="font-mono">{String(params.row?.fee ?? "")}</span>,
      },
      {
        field: "transactionSum",
        headerName: t("trade.transactionSum") ?? "Transaction Sum",
        flex: 1.2,
        renderCell: (params) => {
          const qty = Number(params.row?.quantity ?? 0);
          const price = Number(params.row?.price ?? 0);
          const sum = Math.round(qty * price * 100) / 100;
          return (
            <span className="font-mono">
              {String(sum)} {params.row?.currency ?? ""}
            </span>
          );
        },
      },
      { field: "note", headerName: t("trade.note") ?? "Note", flex: 1.4 },
    ];
  }, [t, assetRow]);

  const cashRows = useMemo(() => {
    return cashSorted.map((ct) => ({
      id: ct.id ?? `${ct.executedAt}-${ct.type}-${ct.amount}`,
      executedAt: ct.executedAt,
      type: ct.type,
      currency: ct.currency,
      amount: ct.amount,
      note: ct.note ?? "",
    }));
  }, [cashSorted]);

  const cashColumns = useMemo(() => {
    return [
      {
        field: "executedAt",
        headerName: t("cash.date") ?? "Date",
        flex: 1,
        renderCell: (params) => (
          <span className="font-mono">{formatDdMmYyyyDot(params.row?.executedAt)}</span>
        ),
      },
      { field: "type", headerName: t("cash.type") ?? "Type", flex: 0.9 },
      { field: "currency", headerName: t("cash.currency") ?? "Currency", flex: 0.8 },
      {
        field: "amount",
        headerName: t("cash.amount") ?? "Amount",
        flex: 1,
        renderCell: (params) => (
          <span className="font-mono">{String(params.row?.amount ?? "")}</span>
        ),
      },
      { field: "note", headerName: t("cash.note") ?? "Note", flex: 1.5 },
    ];
  }, [t]);

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
            {t("tracker.accountLabel")}: {selectedAccountName}
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

      {/* Asset value chart */}
      <div className="border rounded p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="font-semibold">{t("asset.valueChart") ?? "Asset value over time"}</div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="text-slate-600">{t("asset.rangePreset") ?? "Range"}</label>
            <select
              value={seriesPreset}
              onChange={(e) => onPresetChange(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="ALL">{t("asset.rangeAll") ?? "All"}</option>
              <option value="1M">{t("asset.range1m") ?? "1M"}</option>
              <option value="3M">{t("asset.range3m") ?? "3M"}</option>
              <option value="6M">{t("asset.range6m") ?? "6M"}</option>
              <option value="1Y">{t("asset.range1y") ?? "1Y"}</option>
              <option value="CUSTOM">{t("asset.rangeCustom") ?? "Custom"}</option>
            </select>

            <label className="text-slate-600">{t("asset.rangeFrom") ?? "From"}</label>
            <input
              type="date"
              value={seriesFrom}
              onChange={(e) => {
                setSeriesFrom(e.target.value);
                setSeriesPreset("CUSTOM");
              }}
              className="border rounded px-2 py-1"
            />

            <label className="text-slate-600">{t("asset.rangeTo") ?? "To"}</label>
            <input
              type="date"
              value={seriesTo}
              onChange={(e) => {
                setSeriesTo(e.target.value);
                setSeriesPreset("CUSTOM");
              }}
              className="border rounded px-2 py-1"
            />

            <label className="text-slate-600">{t("asset.interval") ?? "Interval"}</label>
            <select
              value={seriesInterval}
              onChange={(e) => setSeriesInterval(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="DAILY">{t("asset.intervalDaily") ?? "Daily"}</option>
              <option value="WEEKLY">{t("asset.intervalWeekly") ?? "Weekly"}</option>
              <option value="MONTHLY">{t("asset.intervalMonthly") ?? "Monthly"}</option>
            </select>
          </div>
        </div>

        {accountId === "ALL" ? (
          <div className="text-sm text-slate-600">
            {t("asset.pickAccountForChart") ?? "Pick a single account to see chart."}
          </div>
        ) : loadingSeries ? (
          <div className="text-sm text-slate-600">
            {t("asset.chartLoading") ?? "Loading chart..."}
          </div>
        ) : chartPoints ? (
          <div>
            <svg
              viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`}
              className="w-full h-56"
              role="img"
              aria-label={t("asset.valueChart") ?? "Asset value over time"}
            >
              <defs>
                <linearGradient id="assetArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <path d={chartPoints.area} fill="url(#assetArea)" stroke="none" />
              <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={chartPoints.points} />
              {chartPoints.yTicks.map((tick) => (
                <text
                  key={`y-${tick.y}`}
                  x={chartPoints.width - 8}
                  y={tick.y + 4}
                  fill="#94a3b8"
                  fontSize="12"
                  textAnchor="end"
                >
                  {tick.label}
                </text>
              ))}
              {chartPoints.xTicks.map((tick, idx) => (
                <text
                  key={`x-${idx}`}
                  x={tick.x}
                  y={chartPoints.height - 6}
                  fill="#94a3b8"
                  fontSize="12"
                  textAnchor="middle"
                >
                  {tick.label}
                </text>
              ))}
            </svg>
          </div>
        ) : (
          <div className="text-sm text-slate-600">{t("asset.chartNoData") ?? "No data."}</div>
        )}
      </div>

      {/* Summary cards */}
      <div className="border rounded p-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
          <div>
            <div className="text-slate-600">{t("asset.value") ?? "Value"}</div>
            <div className="font-mono">
              {round2(assetRow.marketValueBase)} {base}
            </div>
            {formatRoiPct(assetValueGain) && (
              <div className="text-xs text-slate-500">{formatRoiPct(assetValueGain)}</div>
            )}
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
        <div className="overflow-x-auto w-full">
          <DataGrid
            className="w-full"
            rows={tradeRows}
            columns={tradeColumns}
            autoHeight
            disableRowSelectionOnClick
            disableColumnResize
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10 },
              },
            }}
            localeText={{ noRowsLabel: t("asset.noTrades") ?? "No trades found." }}
          />
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
        <div className="overflow-x-auto w-full">
          <DataGrid
            className="w-full"
            rows={cashRows}
            columns={cashColumns}
            autoHeight
            disableRowSelectionOnClick
            disableColumnResize
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10 },
              },
            }}
            localeText={{ noRowsLabel: t("asset.noCashflows") ?? "No cashflows found." }}
          />
        </div>
      </div>
    </div>
  );
};

export default AssetDetails;
