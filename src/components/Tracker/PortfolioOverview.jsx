import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useMyContext } from "../../store/ContextApi";
import PopModal from "../PopModal";

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
  const [perf, setPerf] = useState(null);
  const [loadingPerf, setLoadingPerf] = useState(false);
  const [assetPerf, setAssetPerf] = useState([]);
  const [loadingAssetPerf, setLoadingAssetPerf] = useState(false);
  const [series, setSeries] = useState([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [seriesFrom, setSeriesFrom] = useState("");
  const [seriesTo, setSeriesTo] = useState("");
  const [seriesInterval, setSeriesInterval] = useState("DAILY");
  const [seriesPreset, setSeriesPreset] = useState("ALL");
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceAsset, setPriceAsset] = useState(null);
  const [priceValue, setPriceValue] = useState("");
  const [priceDate, setPriceDate] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
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

      if (accountIdOrAll === "ALL") {
        const ids = (accounts || []).map((a) => a.id);

        const results = await Promise.all(
          ids.map((id) => api.get(`/accounts/${id}/portfolio${qs}`).then((r) => r.data)),
        );

        const positions = results.flatMap((p) => p.positions || []);

        const cashMap = new Map();
        for (const p of results) {
          for (const b of p.cashBalances || []) {
            const cur = b.currency;
            const amt = Number(b.balance ?? 0);
            const baseAmt = b.baseBalance == null ? null : Number(b.baseBalance ?? 0);
            const prev = cashMap.get(cur) || { balance: 0, baseBalance: 0, baseMissing: false };
            const baseMissing = prev.baseMissing || baseAmt == null || !Number.isFinite(baseAmt);
            cashMap.set(cur, {
              balance: Number(prev.balance) + amt,
              baseBalance: baseMissing ? 0 : Number(prev.baseBalance) + baseAmt,
              baseMissing,
            });
          }
        }
        const cashBalances = Array.from(cashMap.entries()).map(([currency, v]) => ({
          currency,
          balance: v.balance,
          baseBalance: v.baseMissing ? null : v.baseBalance,
        }));

        const totalsMap = new Map();
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

  const loadPerformance = async (accountIdOrAll, asOfDate) => {
    if (!accountIdOrAll) return;

    setLoadingPerf(true);
    try {
      const scope = accountIdOrAll === "ALL" ? "ALL" : "ACCOUNT";
      const params = new URLSearchParams();
      params.set("scope", scope);
      if (scope === "ACCOUNT") params.set("accountId", String(accountIdOrAll));
      if (asOfDate) params.set("to", asOfDate);

      const res = await api.get(`/performance/summary?${params.toString()}`);
      setPerf(res.data);
    } catch (e) {
      console.error(e);
      toast.error(t("tracker.performanceLoadFailed"));
      setPerf(null);
    } finally {
      setLoadingPerf(false);
    }
  };

  const loadAssetPerformance = async (accountIdOrAll, asOfDate) => {
    if (!accountIdOrAll) return;

    setLoadingAssetPerf(true);
    try {
      const scope = accountIdOrAll === "ALL" ? "ALL" : "ACCOUNT";
      const params = new URLSearchParams();
      params.set("scope", scope);
      if (scope === "ACCOUNT") params.set("accountId", String(accountIdOrAll));
      if (asOfDate) params.set("to", asOfDate);

      const res = await api.get(`/performance/assets?${params.toString()}`);
      setAssetPerf(res.data || []);
    } catch (e) {
      console.error(e);
      toast.error(t("tracker.assetsPerformanceLoadFailed") ?? "Failed to load asset performance");
      setAssetPerf([]);
    } finally {
      setLoadingAssetPerf(false);
    }
  };

  const loadPortfolioSeries = async (accountIdOrAll, from, to, interval) => {
    if (!accountIdOrAll) return;
    if (accountIdOrAll === "ALL" && (!accounts || accounts.length === 0)) return;

    setLoadingSeries(true);
    try {
      const scope = accountIdOrAll === "ALL" ? "ALL" : "ACCOUNT";
      const params = new URLSearchParams();
      params.set("scope", scope);
      if (scope === "ACCOUNT") params.set("accountId", String(accountIdOrAll));
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (interval) params.set("interval", interval);

      const res = await api.get(`/performance/portfolio-series?${params.toString()}`);
      setSeries(res.data || []);
    } catch (e) {
      console.error(e);
      toast.error(t("tracker.chartLoadFailed") ?? "Failed to load chart");
      setSeries([]);
    } finally {
      setLoadingSeries(false);
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
    loadPerformance(selectedAccountId, asOf);
    loadAssetPerformance(selectedAccountId, asOf);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, asOf, accounts]);

  useEffect(() => {
    if (asOf && seriesPreset !== "CUSTOM") {
      setSeriesTo(asOf);
    }
  }, [asOf, seriesPreset]);

  useEffect(() => {
    if (!selectedAccountId) return;
    loadPortfolioSeries(selectedAccountId, seriesFrom, seriesTo, seriesInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, seriesFrom, seriesTo, seriesInterval, accounts]);

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

  const perfCurrencyImpact = useMemo(() => {
    return (assetPerf || []).reduce((s, r) => {
      const v = Number(r.currencyImpactBase ?? 0);
      return s + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [assetPerf]);

  const perfCapitalGrowth = useMemo(() => {
    if (!perf?.complete) return 0;
    return (
      Number(perf.totalReturn ?? 0) -
      Number(perf.income ?? 0) -
      Number(perf.fees ?? 0) -
      Number(perfCurrencyImpact ?? 0)
    );
  }, [perf, perfCurrencyImpact]);

  const perfCostBasisBase = useMemo(() => {
    return (assetPerf || []).reduce((s, r) => s + Number(r.openCostBasisBase ?? 0), 0);
  }, [assetPerf]);

  const formatRoiPct = (value) => {
    const base = Number(perfCostBasisBase ?? 0);
    const v = Number(value ?? 0);
    if (!Number.isFinite(base) || base === 0 || !Number.isFinite(v)) return null;
    const pct = (v / base) * 100;
    if (!Number.isFinite(pct)) return null;
    return `${Math.round(pct * 100) / 100}%`;
  };

  const formatPctOfPortfolio = (value) => {
    const total = Number(perf?.portfolioValue ?? 0);
    const v = Number(value ?? 0);
    if (!Number.isFinite(total) || total === 0 || !Number.isFinite(v)) return null;
    const pct = (v / total) * 100;
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

  const chartPoints = useMemo(() => {
    const data = (series || []).filter((p) => p && p.portfolioValue != null);
    const values = data.map((p) => Number(p.portfolioValue ?? 0)).filter(Number.isFinite);
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
      const y = padY + plotH * (1 - (Number(p.portfolioValue) - min) / range);
      return `${x},${y}`;
    });

    const area = `M ${padX},${height - padY} L ${points.join(" L ")} L ${padX + plotW},${height - padY} Z`;

    const xTickCount = Math.min(10, data.length);
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
  }, [series]);

  const onPresetChange = (value) => {
    setSeriesPreset(value);
    if (value === "ALL") {
      setSeriesFrom("");
      setSeriesTo(asOf || "");
      return;
    }

    const end = asOf || new Date().toISOString().slice(0, 10);
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

  const assetLinkQs = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedAccountId && selectedAccountId !== "ALL") {
      params.set("accountId", String(selectedAccountId));
    }
    if (asOf) params.set("to", asOf);
    const s = params.toString();
    return s ? `?${s}` : "";
  }, [selectedAccountId, asOf]);

  const getAgeDays = (dateStr, refStr) => {
    if (!dateStr) return null;
    const ref = refStr ? new Date(`${refStr}T00:00:00`) : new Date();
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime()) || Number.isNaN(ref.getTime())) return null;
    const diffMs = ref.getTime() - d.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const isPriceStale = (row) => {
    const days = getAgeDays(row?.lastPriceDate, asOf);
    return days != null && days > 7;
  };

  const getPriceAgeDays = (row) => getAgeDays(row?.lastPriceDate, asOf);

  const openPriceModal = (row) => {
    const today = new Date().toISOString().slice(0, 10);
    setPriceAsset(row);
    setPriceValue(row?.lastPrice != null ? String(row.lastPrice) : "");
    setPriceDate(asOf || today);
    setPriceModalOpen(true);
  };

  const onSavePrice = async () => {
    if (!priceAsset?.assetId) return;
    if (!priceDate) {
      toast.error(t("tracker.priceDateRequired") ?? "Please enter a date");
      return;
    }

    const priceNum = Number(priceValue);
    if (!Number.isFinite(priceNum)) {
      toast.error(t("tracker.priceValueRequired") ?? "Please enter a price");
      return;
    }

    setSavingPrice(true);
    try {
      await api.post(`/assets/${priceAsset.assetId}/prices`, {
        priceDate,
        price: priceNum,
      });
      toast.success(t("tracker.priceUpdated") ?? "Price updated");
      setPriceModalOpen(false);
      if (selectedAccountId) {
        loadPortfolio(selectedAccountId, asOf);
        loadPerformance(selectedAccountId, asOf);
        loadAssetPerformance(selectedAccountId, asOf);
      }
    } catch (e) {
      console.error(e);
      toast.error(t("tracker.priceUpdateFailed") ?? "Failed to update price");
    } finally {
      setSavingPrice(false);
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
    <div className="min-h-[calc(100vh-74px)] p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("tracker.portfolioTitle")}</h1>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">{t("tracker.accountLabel")}</label>
          <select
            value={selectedAccountId}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__ADD_ACCOUNT__") {
                navigate("/accounts/new");
                return;
              }
              setSelectedAccountId(v);
            }}
            className="border rounded px-3 py-2"
          >
            <option value="ALL">{t("tracker.allAccounts")}</option>
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.accountName ?? t("tracker.accountFallback", { id: a.id })}
              </option>
            ))}
            <option value="__ADD_ACCOUNT__">+ {t("tracker.addAccount")}</option>
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
          {/* Portfolio value chart */}
          <div className="border rounded p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="font-semibold">{t("tracker.portfolioValueChart")}</div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="text-slate-600">{t("tracker.rangePreset")}</label>
                <select
                  value={seriesPreset}
                  onChange={(e) => onPresetChange(e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="ALL">{t("tracker.rangeAll")}</option>
                  <option value="1M">{t("tracker.range1m")}</option>
                  <option value="3M">{t("tracker.range3m")}</option>
                  <option value="6M">{t("tracker.range6m")}</option>
                  <option value="1Y">{t("tracker.range1y")}</option>
                  <option value="CUSTOM">{t("tracker.rangeCustom")}</option>
                </select>

                <label className="text-slate-600">{t("tracker.rangeFrom")}</label>
                <input
                  type="date"
                  value={seriesFrom}
                  onChange={(e) => {
                    setSeriesFrom(e.target.value);
                    setSeriesPreset("CUSTOM");
                  }}
                  className="border rounded px-2 py-1"
                />

                <label className="text-slate-600">{t("tracker.rangeTo")}</label>
                <input
                  type="date"
                  value={seriesTo}
                  onChange={(e) => {
                    setSeriesTo(e.target.value);
                    setSeriesPreset("CUSTOM");
                  }}
                  className="border rounded px-2 py-1"
                />

                <label className="text-slate-600">{t("tracker.interval")}</label>
                <select
                  value={seriesInterval}
                  onChange={(e) => setSeriesInterval(e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="DAILY">{t("tracker.intervalDaily")}</option>
                  <option value="WEEKLY">{t("tracker.intervalWeekly")}</option>
                  <option value="MONTHLY">{t("tracker.intervalMonthly")}</option>
                </select>
              </div>
            </div>

            {loadingSeries ? (
              <div className="text-sm text-slate-600">{t("tracker.chartLoading")}</div>
            ) : chartPoints ? (
              <div>
                <svg
                  viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`}
                  className="w-full h-56"
                  role="img"
                  aria-label={t("tracker.portfolioValueChart")}
                >
                  <defs>
                    <linearGradient id="portfolioArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <path d={chartPoints.area} fill="url(#portfolioArea)" stroke="none" />
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    points={chartPoints.points}
                  />
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
              <div className="text-sm text-slate-600">{t("tracker.chartNoData")}</div>
            )}
          </div>

          {/* Base totals */}
          <div className="border rounded p-4 mb-6">
            <div className="font-semibold mb-2">{t("tracker.performanceTitle")}</div>

            {loadingPerf ? (
              <div className="text-sm text-slate-600">{t("tracker.loadingPerformance")}</div>
            ) : !perf ? (
              <div className="text-sm text-slate-600">{t("tracker.performanceMissing")}</div>
            ) : perf.complete ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                <div>
                  <div className="text-slate-600">{t("tracker.portfolioValue")}</div>
                  <div className="font-mono">
                    {String(Math.round(Number(perf.portfolioValue || 0) * 100) / 100)}
                  </div>
                </div>

                <div>
                  <div className="text-slate-600">{t("tracker.capitalGrowth")}</div>
                  <div className="font-mono">
                    {String(Math.round(Number(perfCapitalGrowth || 0) * 100) / 100)}
                  </div>
                  {formatRoiPct(perfCapitalGrowth) && (
                    <div className="text-xs text-slate-500">{formatRoiPct(perfCapitalGrowth)}</div>
                  )}
                </div>

                <div>
                  <div className="text-slate-600">{t("tracker.fees")}</div>
                  <div className="font-mono">
                    {String(Math.round(Number(perf.fees || 0) * 100) / 100)}
                  </div>
                  {formatRoiPct(perf.fees) && (
                    <div className="text-xs text-slate-500">{formatRoiPct(perf.fees)}</div>
                  )}
                </div>

                <div>
                  <div className="text-slate-600">{t("tracker.income")}</div>
                  <div className="font-mono">
                    {String(Math.round(Number(perf.income || 0) * 100) / 100)}
                  </div>
                  {formatRoiPct(perf.income) && (
                    <div className="text-xs text-slate-500">{formatRoiPct(perf.income)}</div>
                  )}
                </div>

                <div>
                  <div className="text-slate-600">{t("tracker.currencyImpact")}</div>
                  <div className="font-mono">
                    {String(Math.round(Number(perfCurrencyImpact || 0) * 100) / 100)}
                  </div>
                  {formatRoiPct(perfCurrencyImpact) && (
                    <div className="text-xs text-slate-500">{formatRoiPct(perfCurrencyImpact)}</div>
                  )}
                </div>

                <div>
                  <div className="text-slate-600">{t("tracker.totalReturn")}</div>
                  <div className="font-mono">
                    {String(Math.round(Number(perf.totalReturn || 0) * 100) / 100)}
                  </div>
                  {formatRoiPct(perf.totalReturn) && (
                    <div className="text-xs text-slate-500">{formatRoiPct(perf.totalReturn)}</div>
                  )}
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
                    <th className="p-3">{t("tracker.portfolioShare") ?? "Share of portfolio"}</th>
                  </tr>
                </thead>
                <tbody>
                  {(portfolio.cashBalances || []).map((b) => (
                    <tr key={b.currency} className="border-t">
                      <td className="p-3">
                        <Link to="/cash" className="underline">
                          {b.currency}
                        </Link>
                      </td>
                      <td className="p-3 font-mono">{String(Math.round(b.balance * 100) / 100)}</td>
                      <td className="p-3 font-mono">
                        {formatPctOfPortfolio(b.baseBalance) || t("tracker.na")}
                      </td>
                    </tr>
                  ))}

                  {(portfolio.cashBalances || []).length === 0 && (
                    <tr className="border-t">
                      <td className="p-3 text-slate-600" colSpan={3}>
                        {t("tracker.noCashBalances")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Positions table */}
          <div className="border rounded overflow-hidden mb-6">
            <div className="p-4 font-semibold border-b flex justify-between items-center">
              {t("tracker.assetsTitle")}

              <button
                type="button"
                onClick={() => {
                  const q =
                    selectedAccountId && selectedAccountId !== "ALL"
                      ? `?accountId=${encodeURIComponent(selectedAccountId)}`
                      : "";
                  navigate(`/trades/new${q}`);
                }}
                className="px-4 py-2 bg-btnColor text-white rounded font-semibold"
              >
                {t("trade.add")}
              </button>
            </div>

            {loadingAssetPerf ? (
              <div className="p-4 text-sm text-slate-600">
                {t("tracker.loading") ?? "Loading..."}
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left">
                      <th className="p-3">{t("tracker.symbol")}</th>
                      <th className="p-3">{t("tracker.name")}</th>
                      <th className="p-3">{t("tracker.lastPrice")}</th>
                      <th className="p-3">{t("tracker.quantity")}</th>
                      <th className="p-3">{t("tracker.costBaseEur") ?? "Cost base (EUR)"}</th>
                      <th className="p-3">{t("tracker.marketValueEur") ?? "Market value (EUR)"}</th>
                      <th className="p-3">{t("tracker.totalReturnEur") ?? "Total return (EUR)"}</th>
                      <th className="p-3">{t("tracker.portfolioShare") ?? "Share of portfolio"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(assetPerf || []).map((p) => {
                      const sharePct = formatPctOfPortfolio(p.marketValueBase);
                      return (
                        <tr key={p.assetId} className="border-t">
                          <td className="p-3">
                            <Link to={`/assets/${p.assetId}${assetLinkQs}`} className="underline">
                              {p.assetSymbol}
                            </Link>
                          </td>
                          <td className="p-3">
                            <Link to={`/assets/${p.assetId}${assetLinkQs}`} className="underline">
                              {p.assetName}
                            </Link>
                          </td>

                          {/* Price in original currency */}
                          <td className="p-3 font-mono">
                            <div className="flex items-center gap-2">
                              <span>
                                {p.lastPrice == null
                                  ? t("tracker.na")
                                  : String(Math.round(Number(p.lastPrice) * 100) / 100)}{" "}
                                {p.currency ?? ""}
                              </span>
                              {isPriceStale(p) && (
                                <button
                                  type="button"
                                  className="text-xs text-red-600 underline"
                                  title={t("tracker.priceStaleTitle", {
                                    days: getPriceAgeDays(p),
                                  })}
                                  onClick={() => openPriceModal(p)}
                                >
                                  {t("tracker.priceStale", { days: getPriceAgeDays(p) })}
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="p-3 font-mono">
                            {String(Math.round(Number(p.quantity ?? 0) * 100) / 100)}
                          </td>

                          {/* Cost base (EUR) */}
                          <td className="p-3 font-mono">
                            {String(Math.round(Number(p.openCostBasisBase ?? 0) * 100) / 100)}{" "}
                            {p.baseCurrency ?? "EUR"}
                          </td>

                          {/* Market value (EUR) */}
                          <td className="p-3 font-mono">
                            {String(Math.round(Number(p.marketValueBase ?? 0) * 100) / 100)}{" "}
                            {p.baseCurrency ?? "EUR"}
                          </td>

                          {/* Total return (EUR) */}
                          <td className="p-3 font-mono">
                            {String(Math.round(Number(p.totalReturnBase ?? 0) * 100) / 100)}{" "}
                            {p.baseCurrency ?? "EUR"}
                          </td>

                          {/* Share of portfolio */}
                          <td className="p-3 font-mono">{sharePct || t("tracker.na")}</td>
                        </tr>
                      );
                    })}

                    {(assetPerf || []).length === 0 && (
                      <tr className="border-t">
                        <td className="p-3 text-slate-600" colSpan={8}>
                          {t("tracker.noPositions")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
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
                      <td className="p-3 font-mono">
                        {String(Math.round(tRow.cashTotal * 100) / 100)}
                      </td>
                      <td className="p-3 font-mono">
                        {String(Math.round(tRow.positionsTotal * 100) / 100)}
                      </td>
                      <td className="p-3 font-mono">
                        {String(Math.round(tRow.portfolioTotal * 100) / 100)}
                      </td>
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

            <PopModal
              open={priceModalOpen}
              setOpen={setPriceModalOpen}
              title={t("tracker.updatePriceTitle")}
              message={t("tracker.updatePriceHint")}
              confirmText={t("tracker.updatePrice")}
              cancelText={t("tracker.cancel") ?? "Cancel"}
              onConfirm={onSavePrice}
              confirmLoading={savingPrice}
              confirmClassName="px-4 py-2 bg-btnColor text-white rounded-md hover:opacity-90"
              showWarningIcon={false}
            >
              <div className="mt-4 grid gap-3">
                <div className="text-white text-center text-sm">
                  {priceAsset?.assetName || priceAsset?.assetSymbol}
                </div>
                <div>
                  <label className="text-sm text-white">{t("tracker.priceDate")}</label>
                  <input
                    type="date"
                    value={priceDate}
                    onChange={(e) => setPriceDate(e.target.value)}
                    className="w-full border rounded px-3 py-2 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-sm text-white">{t("tracker.priceValue")}</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={priceValue}
                    onChange={(e) => setPriceValue(e.target.value)}
                    className="w-full border rounded px-3 py-2 bg-white text-slate-900"
                  />
                </div>
              </div>
            </PopModal>
          </div>
        </>
      )}
    </div>
  );
};

export default PortfolioOverview;
