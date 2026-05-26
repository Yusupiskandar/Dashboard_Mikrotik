"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

// Dynamically import react-apexcharts to prevent SSR "window is not defined" error in Next.js
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface NetworkInterface {
  id: string;
  name: string;
  type: string;
  comment: string;
}

interface LiveTraffic {
  name: string;
  rx_bits_per_second: number;
  tx_bits_per_second: number;
  rx_packets_per_second: number;
  tx_packets_per_second: number;
  fp_rx_bits_per_second: number;
  fp_tx_bits_per_second: number;
  tx_queue_drops_per_second: number;
  rx_bytes: number;
  tx_bytes: number;
}

/** Formatter helper for bits per second in Mbps */
function formatSpeed(bps: number) {
  if (bps === 0) return "0 Mbps";
  const mbps = bps / 1000000;
  return mbps.toFixed(2) + " Mbps";
}

/** Formatter helper for data bytes */
function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0) return bytes + " Bytes";
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function TrafficPage() {
  const router = useRouter();
  
  // Lists and loading states
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>("");
  const [loadingInterfaces, setLoadingInterfaces] = useState(true);
  const [traffic, setTraffic] = useState<LiveTraffic | null>(null);
  const [loadingTraffic, setLoadingTraffic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Poller interval state
  const [intervalMs, setIntervalMs] = useState<number>(3000);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [isTicking, setIsTicking] = useState<boolean>(true);

  // Buffer state for Realtime Apex Chart (buffer size: last 15 ticks)
  const [rxHistory, setRxHistory] = useState<number[]>([]);
  const [txHistory, setTxHistory] = useState<number[]>([]);
  const [timeLabels, setTimeLabels] = useState<string[]>([]);
  
  // Refs to avoid state staleness inside interval poller
  const pollerRef = useRef<NodeJS.Timeout | null>(null);
  const isTickingRef = useRef(isTicking);
  const selectedInterfaceRef = useRef(selectedInterface);
  const intervalMsRef = useRef(intervalMs);

  // Sync refs
  useEffect(() => {
    isTickingRef.current = isTicking;
    selectedInterfaceRef.current = selectedInterface;
    intervalMsRef.current = intervalMs;
  }, [isTicking, selectedInterface, intervalMs]);

  // Load available interfaces on mount
  const fetchInterfaces = useCallback(async () => {
    setLoadingInterfaces(true);
    try {
      const res = await fetch("/api/mikrotik/interfaces");
      if (res.status === 401) {
        router.replace("/connect");
        return;
      }
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setInterfaces(json.data);
        setError(null);
        
        // Find default interface ether1, otherwise take the first
        const defaultInterface = json.data.find(
          (i: any) => i.name.toLowerCase() === "ether1"
        ) || json.data[0];
        
        setSelectedInterface(defaultInterface.name);
      } else {
        setError(json.message || "Tidak ada interface jaringan yang terdeteksi");
      }
    } catch {
      setError("Gagal terhubung ke server untuk memuat interface.");
    } finally {
      setLoadingInterfaces(false);
    }
  }, [router]);

  useEffect(() => {
    fetchInterfaces();
  }, [fetchInterfaces]);

  // Query traffic stats for selected interface
  const fetchTrafficData = useCallback(async (isSilent = false) => {
    const activeInterface = selectedInterfaceRef.current;
    if (!activeInterface) return;

    if (!isSilent) setLoadingTraffic(true);
    try {
      const res = await fetch(`/api/mikrotik/traffic?interface=${activeInterface}`);
      if (res.status === 401) {
        router.replace("/connect");
        return;
      }
      const json = await res.json();
      if (json.success) {
        const data: LiveTraffic = json.data;
        setTraffic(data);
        setError(null);

        const now = new Date();
        const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setLastRefreshed(timeStr);

        // Add to historical rolling buffer (speeds mapped to Mbps for smooth charting)
        const rxMbps = parseFloat((data.rx_bits_per_second / 1000000).toFixed(2));
        const txMbps = parseFloat((data.tx_bits_per_second / 1000000).toFixed(2));

        setRxHistory((prev) => {
          const next = [...prev, rxMbps];
          return next.slice(-15); // limit to 15 points
        });
        setTxHistory((prev) => {
          const next = [...prev, txMbps];
          return next.slice(-15); // limit to 15 points
        });
        setTimeLabels((prev) => {
          const next = [...prev, timeStr];
          return next.slice(-15);
        });

      } else {
        // If query failed silent background refresh, set error state
        if (!isSilent) setError(json.message || "Gagal memonitor data trafik");
      }
    } catch {
      if (!isSilent) setError("Masalah jaringan saat monitoring data");
    } finally {
      setLoadingTraffic(false);
    }
  }, [router]);

  // Interval poller
  useEffect(() => {
    // Reset buffer charts on interface change
    setRxHistory([]);
    setTxHistory([]);
    setTimeLabels([]);
    setTraffic(null);

    if (selectedInterface) {
      fetchTrafficData(false);

      const poller = () => {
        if (isTickingRef.current) {
          fetchTrafficData(true);
        }
      };

      pollerRef.current = setInterval(poller, intervalMsRef.current);
    }

    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, [selectedInterface, fetchTrafficData]);

  // Restart poller interval on interval Ms change
  useEffect(() => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = setInterval(() => {
        if (isTickingRef.current) {
          fetchTrafficData(true);
        }
      }, intervalMs);
    }
    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, [intervalMs, fetchTrafficData]);

  // Real-time Chart Options
  const chartOptions: any = {
    chart: {
      id: "realtime-traffic-chart",
      type: "area",
      height: 350,
      animations: {
        enabled: true,
        easing: "linear",
        dynamicAnimation: {
          speed: 1000,
        },
      },
      toolbar: {
        show: false,
      },
      sparkline: {
        enabled: false,
      },
    },
    colors: ["#465fff", "#12b76a"], // brand-500 (RX), success-500 (TX)
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    grid: {
      borderColor: "rgba(228, 231, 236, 0.4)",
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: true,
        },
      },
    },
    xaxis: {
      categories: timeLabels,
      labels: {
        show: true,
        style: {
          fontSize: "10px",
          colors: "#98a2b3",
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      title: {
        text: "Keluaran Trafik (Mbps)",
        style: {
          color: "#98a2b3",
          fontSize: "11px",
          fontWeight: 400,
        },
      },
      labels: {
        style: {
          colors: "#98a2b3",
          fontSize: "10px",
        },
        formatter: (val: number) => val.toFixed(2) + " Mbps",
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      fontSize: "12px",
      labels: {
        colors: "#667085",
      },
    },
    tooltip: {
      shared: true,
      x: {
        show: true,
      },
    },
  };

  const chartSeries = [
    {
      name: "Trafik RX (Masuk / Download)",
      data: rxHistory,
    },
    {
      name: "Trafik TX (Keluar / Upload)",
      data: txHistory,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageBreadcrumb pageTitle="Interface Traffic Monitor" />
        
        {/* Poller Switch toggler & manual refresh */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setIsTicking((t) => !t)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              isTicking 
                ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                : "bg-gray-100 border-gray-200 text-gray-500 dark:bg-white/5 dark:border-white/10 dark:text-gray-400"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isTicking ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
            {isTicking ? "Auto Polling On" : "Polling Off"}
          </button>
          <button
            onClick={() => fetchTrafficData(false)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.04]"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Primary Selector Control */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Interface dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Pilih Interface Jaringan</label>
              {loadingInterfaces ? (
                <div className="h-9 w-44 rounded-lg bg-gray-100 animate-pulse dark:bg-white/5" />
              ) : (
                <select
                  value={selectedInterface}
                  onChange={(e) => setSelectedInterface(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900"
                >
                  {interfaces.map((i) => (
                    <option key={i.id} value={i.name}>
                      {i.name} ({i.type}){i.comment ? ` - ${i.comment}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Refresh Interval Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Interval Update</label>
              <select
                value={intervalMs}
                onChange={(e) => setIntervalMs(Number(e.target.value))}
                className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900"
              >
                <option value={2000}>2 detik</option>
                <option value={3000}>3 detik</option>
                <option value={5000}>5 detik</option>
                <option value={10000}>10 detik</option>
              </select>
            </div>
          </div>

          {/* Time stamp updates info */}
          {lastRefreshed && (
            <p className="text-xs text-gray-400 dark:text-gray-500 self-start sm:self-center">
              Sinkronisasi live: <span className="font-semibold text-gray-600 dark:text-gray-300">{lastRefreshed}</span>
            </p>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* RX Speed bits per second */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
          <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Live Download (RX)</p>
          <p className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white truncate">
            {traffic ? formatSpeed(traffic.rx_bits_per_second) : "-"}
          </p>
        </div>

        {/* TX Speed bits per second */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-success-50 text-success-500 dark:bg-success-500/10">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          </div>
          <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Live Upload (TX)</p>
          <p className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white truncate">
            {traffic ? formatSpeed(traffic.tx_bits_per_second) : "-"}
          </p>
        </div>

        {/* RX Packets */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-warning-50 text-warning-500 dark:bg-warning-500/10">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </div>
          <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Packets/s Masuk (RX)</p>
          <p className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white truncate">
            {traffic ? traffic.rx_packets_per_second.toLocaleString("id-ID") + " pps" : "-"}
          </p>
        </div>

        {/* TX Packets */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-error-50 text-error-500 dark:bg-error-500/10">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </div>
          <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Packets/s Keluar (TX)</p>
          <p className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white truncate">
            {traffic ? traffic.tx_packets_per_second.toLocaleString("id-ID") + " pps" : "-"}
          </p>
        </div>
      </div>

      {/* Grid: Graph area + Detail Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Real-time Rolling Live Chart */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-8">
          <h3 className="mb-5 text-base font-semibold text-gray-800 dark:text-white">
            Grafik Throughput Live ({selectedInterface || "-"})
          </h3>
          
          {loadingTraffic && rxHistory.length === 0 ? (
            <div className="flex h-80 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : rxHistory.length === 0 ? (
            <div className="flex h-80 items-center justify-center text-center text-sm text-gray-400 dark:text-gray-500">
              Menunggu data throughput pertama dari router...
            </div>
          ) : (
            <div className="h-80 w-full overflow-hidden">
              <Chart
                options={chartOptions}
                series={chartSeries}
                type="area"
                height="100%"
              />
            </div>
          )}
        </div>

        {/* Detailed parameters panel */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-4 flex flex-col justify-between">
          <div>
            <h3 className="mb-5 text-base font-semibold text-gray-800 dark:text-white">
              Detail Parameter Interface
            </h3>

            {traffic ? (
              <div className="flex flex-col gap-4">
                {/* Interface target */}
                <div className="flex justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Interface Target</span>
                  <span className="text-xs font-bold text-gray-800 dark:text-white font-mono">{traffic.name}</span>
                </div>

                {/* RX speed details */}
                <div className="flex justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">RX Raw Rate</span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 font-mono">
                    {traffic.rx_bits_per_second.toLocaleString("id-ID")} bps
                  </span>
                </div>

                {/* TX speed details */}
                <div className="flex justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">TX Raw Rate</span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 font-mono">
                    {traffic.tx_bits_per_second.toLocaleString("id-ID")} bps
                  </span>
                </div>

                {/* Fast path RX details */}
                <div className="flex justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Fast Path RX Rate</span>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 font-mono">
                    {traffic.fp_rx_bits_per_second > 0 ? formatSpeed(traffic.fp_rx_bits_per_second) : "-"}
                  </span>
                </div>

                {/* Fast path TX details */}
                <div className="flex justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Fast Path TX Rate</span>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 font-mono">
                    {traffic.fp_tx_bits_per_second > 0 ? formatSpeed(traffic.fp_tx_bits_per_second) : "-"}
                  </span>
                </div>

                {/* Queue Drops */}
                <div className="flex justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Queue Drops / detik</span>
                  <span className={`text-xs font-semibold font-mono ${traffic.tx_queue_drops_per_second > 0 ? "text-error-500 font-bold" : "text-gray-600 dark:text-gray-300"}`}>
                    {traffic.tx_queue_drops_per_second} drop
                  </span>
                </div>

                {/* Total RX data */}
                <div className="flex justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Total RX (Download)</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatBytes(traffic.rx_bytes)}
                  </span>
                </div>

                {/* Total TX data */}
                <div className="flex justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Total TX (Upload)</span>
                  <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 font-mono">
                    {formatBytes(traffic.tx_bytes)}
                  </span>
                </div>

                {/* Combined Total Data */}
                <div className="flex justify-between pb-1 bg-brand-50/20 dark:bg-brand-500/5 px-2.5 py-2 rounded-xl border border-brand-100/20 dark:border-brand-500/10">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Total Konsumsi Data</span>
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400 font-mono">
                    {formatBytes(traffic.rx_bytes + traffic.tx_bytes)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-44 items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                Pilih interface untuk memuat parameter detail
              </div>
            )}
          </div>

          {/* Poller safety warnings */}
          <div className="mt-6 rounded-xl bg-brand-50/50 p-3 text-xs text-brand-700 dark:bg-brand-500/5 dark:text-brand-300 border border-brand-100/30 dark:border-brand-500/10">
            <div className="flex gap-2">
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>Mengambil data throughput live secara langsung dari router dengan menjalankan query /interface/monitor-traffic secara periodik.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
