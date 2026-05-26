"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

// Dynamically import react-apexcharts to prevent SSR errors in Next.js
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DailyReportItem {
  day: number;
  vouchers_sold: number;
  revenue: number;
}

interface VoucherRecordItem {
  username: string;
  profile: string;
  price: number;
  day: number;
  comment: string;
  type: "hotspot" | "script" | "simulated";
}

interface ReportData {
  selected_month: number;
  selected_year: number;
  total_vouchers_sold: number;
  total_revenue: number;
  average_voucher_price: number;
  top_profile: string;
  top_profile_sales: number;
  daily_report: DailyReportItem[];
  voucher_records?: VoucherRecordItem[];
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const YEAR_OPTIONS = [2025, 2026, 2027];

export default function ReportPage() {
  const router = useRouter();
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartView, setChartView] = useState<"both" | "qty" | "rev">("both");
  const [activeTab, setActiveTab] = useState<"daily" | "profile" | "details">("daily");
  
  // Details filtering states
  const [voucherSearch, setVoucherSearch] = useState<string>("");
  const [profileFilter, setProfileFilter] = useState<string>("all");

  // Format currency
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Fetch report data from API
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mikrotik/report?month=${selectedMonth}&year=${selectedYear}`);
      if (res.status === 401) {
        router.replace("/connect");
        return;
      }
      const json = await res.json();
      if (json.success) {
        setReport(json.data);
      } else {
        setError(json.message || "Gagal memuat data laporan");
      }
    } catch {
      setError("Masalah jaringan saat memuat data laporan");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, router]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Vouchers list extracted
  const voucherRecords = useMemo(() => report?.voucher_records || [], [report]);

  // Extract unique profiles for detailed list filter
  const uniqueProfiles = useMemo(() => {
    const profiles = voucherRecords.map((vr) => vr.profile);
    return Array.from(new Set(profiles)).sort();
  }, [voucherRecords]);

  // Calculate profile summaries dynamically from detailed records
  const profileSummaries = useMemo(() => {
    const summaryMap: Record<string, { count: number; revenue: number }> = {};
    
    // Group from detail list if exists
    if (voucherRecords.length > 0) {
      voucherRecords.forEach((vr) => {
        if (!summaryMap[vr.profile]) {
          summaryMap[vr.profile] = { count: 0, revenue: 0 };
        }
        summaryMap[vr.profile].count++;
        summaryMap[vr.profile].revenue += vr.price;
      });
    } else if (report) {
      // If records are empty but report has values, use top profile as fallback
      if (report.top_profile && report.top_profile !== "Tidak Ada") {
        summaryMap[report.top_profile] = {
          count: report.top_profile_sales,
          revenue: report.top_profile_sales * report.average_voucher_price
        };
      }
    }

    return Object.entries(summaryMap)
      .map(([profile, data]) => ({
        profile,
        count: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [voucherRecords, report]);

  // Filtered detailed voucher records
  const filteredVoucherRecords = useMemo(() => {
    return voucherRecords.filter((vr) => {
      const matchesSearch = vr.username.toLowerCase().includes(voucherSearch.toLowerCase());
      const matchesProfile = profileFilter === "all" || vr.profile === profileFilter;
      return matchesSearch && matchesProfile;
    });
  }, [voucherRecords, voucherSearch, profileFilter]);

  // Construct chart data series
  const dailyReport = report?.daily_report || [];
  const daysLabels = dailyReport.map((item) => `Tgl ${item.day}`);
  const soldQtyData = dailyReport.map((item) => item.vouchers_sold);
  const revenueData = dailyReport.map((item) => item.revenue);

  const chartSeries = [];
  if (chartView === "both" || chartView === "qty") {
    chartSeries.push({
      name: "Voucher Terjual (Pcs)",
      type: "column",
      data: soldQtyData,
    });
  }
  if (chartView === "both" || chartView === "rev") {
    chartSeries.push({
      name: "Pendapatan (IDR)",
      type: "area",
      data: revenueData,
    });
  }

  // ApexCharts Configuration Options
  const chartOptions: any = {
    chart: {
      id: "sales-report-chart",
      height: 350,
      toolbar: {
        show: true,
      },
      zoom: {
        enabled: false,
      },
    },
    colors: ["#465fff", "#12b76a"], // brand-500 (Qty), success-500 (Rev)
    stroke: {
      width: chartView === "both" ? [0, 3] : [3],
      curve: "smooth",
    },
    fill: {
      opacity: chartView === "both" ? [0.85, 0.25] : [0.85],
      type: chartView === "both" ? ["solid", "gradient"] : ["gradient"],
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    dataLabels: {
      enabled: false,
    },
    grid: {
      borderColor: "rgba(228, 231, 236, 0.4)",
      strokeDashArray: 4,
    },
    xaxis: {
      categories: daysLabels,
      labels: {
        style: {
          fontSize: "10px",
          colors: "#98a2b3",
        },
      },
    },
    yaxis: chartView === "both" 
      ? [
          {
            title: {
              text: "Jumlah Voucher",
              style: { color: "#465fff", fontSize: "11px", fontWeight: 500 },
            },
            labels: {
              style: { colors: "#98a2b3" },
              formatter: (val: number) => Math.round(val),
            },
          },
          {
            opposite: true,
            title: {
              text: "Total Pendapatan (IDR)",
              style: { color: "#12b76a", fontSize: "11px", fontWeight: 500 },
            },
            labels: {
              style: { colors: "#98a2b3" },
              formatter: (val: number) => formatIDR(val),
            },
          }
        ]
      : {
          title: {
            text: chartView === "qty" ? "Jumlah Voucher" : "Pendapatan (IDR)",
            style: { color: chartView === "qty" ? "#465fff" : "#12b76a", fontSize: "11px", fontWeight: 500 },
          },
          labels: {
            style: { colors: "#98a2b3" },
            formatter: (val: number) => chartView === "qty" ? Math.round(val) : formatIDR(val),
          },
        },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: function (y: number, { seriesIndex }: any) {
          if (typeof y !== "undefined") {
            if (chartView === "both") {
              return seriesIndex === 0 ? `${y} pcs` : formatIDR(y);
            }
            return chartView === "qty" ? `${y} pcs` : formatIDR(y);
          }
          return y;
        }
      }
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      fontSize: "12px",
      labels: {
        colors: "#667085",
      },
    },
  };

  // Client-side CSV Download
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Daily Summary CSV
  const exportSummaryCSV = () => {
    if (!report) return;
    let csv = "\uFEFF"; // Add BOM for UTF-8 Excel support
    csv += "Tanggal,Hari,Voucher Terjual,Pendapatan (IDR)\n";
    report.daily_report.forEach((item) => {
      const dayOfWeekIndex = new Date(selectedYear, selectedMonth - 1, item.day).getDay();
      const dayOfWeekStr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][dayOfWeekIndex];
      csv += `"${String(item.day).padStart(2, "0")}-${String(selectedMonth).padStart(2, "0")}-${selectedYear}","${dayOfWeekStr}",${item.vouchers_sold},${item.revenue}\n`;
    });
    csv += `\nTotal,,${report.total_vouchers_sold},${report.total_revenue}\n`;
    downloadCSV(csv, `Laporan_Ringkasan_Harian_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.csv`);
  };

  // Export Vouchers List CSV
  const exportVouchersCSV = () => {
    if (!report || !voucherRecords.length) return;
    let csv = "\uFEFF"; // Add BOM for UTF-8 Excel support
    csv += "Tanggal,Kode Voucher,Profil,Harga (IDR),Keterangan,Tipe Log\n";
    voucherRecords.forEach((vr) => {
      const dateStr = `${String(vr.day).padStart(2, "0")}-${String(selectedMonth).padStart(2, "0")}-${selectedYear}`;
      const typeStr = vr.type === "hotspot" ? "Hotspot Aktif" : vr.type === "script" ? "Log Script" : "Simulasi";
      csv += `"${dateStr}","${vr.username}","${vr.profile}",${vr.price},"${vr.comment.replace(/"/g, '""')}","${typeStr}"\n`;
    });
    downloadCSV(csv, `Laporan_Rincian_Penjualan_Voucher_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.csv`);
  };

  // Trigger browser print cleanly
  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 printable-area">
      {/* Global CSS Style block for custom premium printing */}
      <style jsx global>{`
        @media print {
          /* Hide menus, layouts, header, footer, tabs, select boxes, scroll and buttons during print */
          header, footer, nav, aside, .print-hide, select, button, label, .tab-controls, .filter-box {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .printable-area {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            background: white !important;
          }
          .max-h-96 {
            max-height: none !important;
            overflow: visible !important;
          }
          .no-print-shadow {
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print-hide">
        <PageBreadcrumb pageTitle="Laporan Penjualan Voucher" />
        
        {/* Header Action Button Group */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          {/* Sync Button */}
          <button
            onClick={fetchReportData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.04]"
          >
            <svg className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Segarkan Data
          </button>

          {/* Cetak Report Button */}
          <button
            onClick={triggerPrint}
            disabled={loading || !report}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.04]"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Cetak Laporan
          </button>

          {/* Export Dropdown / Trigger */}
          {report && (
            <div className="relative group">
              <button
                className="flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Ekspor Laporan
              </button>
              <div className="absolute right-0 mt-1 hidden group-hover:block bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1 w-44">
                <button
                  onClick={exportSummaryCSV}
                  className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                >
                  Ekspor Ringkasan (CSV)
                </button>
                {voucherRecords.length > 0 && (
                  <button
                    onClick={exportVouchersCSV}
                    className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                  >
                    Ekspor Rincian Voucher (CSV)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Selectors and Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] print-hide">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Select Month */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Pilih Bulan</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900"
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={index} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Year */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Pilih Tahun</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900"
              >
                {YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Timeframe summary */}
          <div className="text-xs text-gray-400 dark:text-gray-500 self-start sm:self-center">
            Periode Laporan: <span className="font-bold text-brand-600 dark:text-brand-400">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
          </div>
        </div>
      </div>

      {/* Printable Header - visible only when printing */}
      <div className="hidden print:block border-b border-gray-200 pb-4 mb-4">
        <h2 className="text-xl font-bold text-black">LAPORAN PENJUALAN VOUCHER HOTSPOT</h2>
        <div className="text-xs text-gray-600 mt-1">
          <p>Periode Laporan: <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong></p>
          <p>Dicetak Pada: {new Date().toLocaleString("id-ID")}</p>
          <p>Sistem Basis: Record Histori ala Mikhmon</p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 flex items-center gap-2 print-hide">
          <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* Loading Overlay */}
      {loading ? (
        <div className="flex h-96 items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] print-hide">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Menghimpun statistik penjualan voucher...</p>
          </div>
        </div>
      ) : report ? (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 no-print-shadow">
            {/* Total Vouchers Sold */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col justify-between hover:shadow-md transition duration-200">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 print-hide">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                  />
                </svg>
              </div>
              <div>
                <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Total Voucher Terjual</p>
                <p className="text-2xl font-black text-gray-800 dark:text-white">
                  {report.total_vouchers_sold.toLocaleString("id-ID")} <span className="text-xs font-normal text-gray-400">voucher</span>
                </p>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col justify-between hover:shadow-md transition duration-200">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-success-50 text-success-500 dark:bg-success-500/10 print-hide">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v-1"
                  />
                </svg>
              </div>
              <div>
                <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Total Pendapatan</p>
                <p className="text-2xl font-black text-success-600 dark:text-success-400 truncate">
                  {formatIDR(report.total_revenue)}
                </p>
              </div>
            </div>

            {/* Average Voucher Price */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col justify-between hover:shadow-md transition duration-200">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-warning-50 text-warning-500 dark:bg-warning-500/10 print-hide">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Rata-rata Harga</p>
                <p className="text-2xl font-black text-gray-800 dark:text-white truncate">
                  {formatIDR(report.average_voucher_price)} <span className="text-[10px] font-normal text-gray-400">/vc</span>
                </p>
              </div>
            </div>

            {/* Top Selling Profile */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col justify-between hover:shadow-md transition duration-200">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 print-hide">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <div>
                <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Profil Voucher Terlaris</p>
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400 truncate">
                  {report.top_profile}
                </p>
              </div>
            </div>
          </div>

          {/* Grid Layout: Visual Chart Panel */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] print-hide">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                  Grafik Penjualan Voucher Harian
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Trafik penjualan voucher dan akumulasi pendapatan harian (meniru logic record Mikhmon)
                </p>
              </div>

              {/* Chart View Toggle Controls */}
              <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5 self-start">
                <button
                  onClick={() => setChartView("both")}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    chartView === "both" 
                      ? "bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-white" 
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setChartView("qty")}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    chartView === "qty" 
                      ? "bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-white" 
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  Jumlah
                </button>
                <button
                  onClick={() => setChartView("rev")}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    chartView === "rev" 
                      ? "bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-white" 
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  Pendapatan
                </button>
              </div>
            </div>

            <div className="h-80 w-full overflow-hidden">
              <Chart
                options={chartOptions}
                series={chartSeries}
                type="line"
                height="100%"
              />
            </div>
          </div>

          {/* Interactive Report View Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-800 tab-controls print-hide">
            <button
              onClick={() => setActiveTab("daily")}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "daily"
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              Ringkasan Harian
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "profile"
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              Rekap per Profil ({profileSummaries.length})
            </button>
            <button
              onClick={() => setActiveTab("details")}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "details"
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              Rincian Voucher ({voucherRecords.length})
            </button>
          </div>

          {/* TAB CONTENT: 1. DAILY SUMMARIES */}
          {activeTab === "daily" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] no-print-shadow">
              <h3 className="mb-5 text-base font-semibold text-gray-800 dark:text-white print:block">
                Laporan Ringkasan Harian Penjualan
              </h3>
              
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.01]">
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Tanggal</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Hari</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Voucher Terjual</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Total Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                    {dailyReport.map((item) => {
                      const dayOfWeekIndex = new Date(selectedYear, selectedMonth - 1, item.day).getDay();
                      const dayOfWeekStr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][dayOfWeekIndex];
                      const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;

                      return (
                        <tr 
                          key={item.day} 
                          className={`hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors ${
                            isWeekend ? "bg-brand-500/[0.01] dark:bg-brand-500/[0.005]" : ""
                          }`}
                        >
                          <td className="px-5 py-3 text-xs font-medium text-gray-800 dark:text-gray-300 font-mono">
                            {String(item.day).padStart(2, "0")}-{String(selectedMonth).padStart(2, "0")}-{selectedYear}
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-400">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isWeekend 
                                ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" 
                                : "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400"
                            }`}>
                              {dayOfWeekStr}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs font-bold text-gray-800 dark:text-white text-right font-mono">
                            {item.vouchers_sold} pcs
                          </td>
                          <td className="px-5 py-3 text-xs font-bold text-success-600 dark:text-success-400 text-right font-mono">
                            {formatIDR(item.revenue)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB CONTENT: 2. GROUP BY PROFILE */}
          {activeTab === "profile" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] no-print-shadow">
              <h3 className="mb-5 text-base font-semibold text-gray-800 dark:text-white print:block">
                Laporan Penjualan Berdasarkan Profil Hotspot
              </h3>
              
              {profileSummaries.length === 0 ? (
                <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-xs">
                  Tidak ada rekap profil penjualan pada bulan ini.
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.01]">
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">No.</th>
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Nama Profil</th>
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Voucher Terjual</th>
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Estimasi Total Omset</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                      {profileSummaries.map((item, idx) => (
                        <tr 
                          key={item.profile} 
                          className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                        >
                          <td className="px-5 py-3 text-xs font-mono text-gray-400">{idx + 1}.</td>
                          <td className="px-5 py-3 text-xs font-bold text-gray-800 dark:text-gray-300">
                            {item.profile}
                          </td>
                          <td className="px-5 py-3 text-xs font-bold text-gray-800 dark:text-white text-right font-mono">
                            {item.count} pcs
                          </td>
                          <td className="px-5 py-3 text-xs font-bold text-success-600 dark:text-success-400 text-right font-mono">
                            {formatIDR(item.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: 3. DETAILED VOUCHERS */}
          {activeTab === "details" && (
            <div className="flex flex-col gap-4">
              {/* Detailed search and filtering controllers */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] filter-box print-hide flex flex-col md:flex-row gap-4 items-end">
                {/* Search */}
                <div className="flex-1 w-full flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Cari Kode Voucher</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Masukkan kode voucher..."
                      value={voucherSearch}
                      onChange={(e) => setVoucherSearch(e.target.value)}
                      className="h-9 w-full rounded-lg border border-gray-200 bg-transparent pl-8 pr-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900"
                    />
                    <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Filter Profile */}
                <div className="w-full md:w-56 flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Filter Profil</label>
                  <select
                    value={profileFilter}
                    onChange={(e) => setProfileFilter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900"
                  >
                    <option value="all">Semua Profil</option>
                    {uniqueProfiles.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid Layout: Detailed Voucher Logs Table */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] no-print-shadow">
                <h3 className="mb-5 text-base font-semibold text-gray-800 dark:text-white print:block">
                  Daftar Rincian Voucher Terjual ({filteredVoucherRecords.length} Terfilter)
                </h3>
                
                {filteredVoucherRecords.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-xs">
                    Tidak ada rincian log voucher yang ditemukan.
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.01]">
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Tanggal</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Kode Voucher</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Profil</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Harga</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Sumber Log</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                        {filteredVoucherRecords.map((vr, index) => {
                          const dateStr = `${String(vr.day).padStart(2, "0")}-${String(selectedMonth).padStart(2, "0")}-${selectedYear}`;
                          const isWeekend = new Date(selectedYear, selectedMonth - 1, vr.day).getDay() % 6 === 0;

                          return (
                            <tr 
                              key={index} 
                              className={`hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors ${
                                isWeekend ? "bg-brand-500/[0.005]" : ""
                              }`}
                            >
                              <td className="px-4 py-2.5 text-xs font-medium text-gray-800 dark:text-gray-300 font-mono">
                                {dateStr}
                              </td>
                              <td className="px-4 py-2.5 text-xs font-bold text-gray-900 dark:text-white font-mono">
                                {vr.username}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300">
                                <span className="inline-flex rounded-md bg-gray-100 dark:bg-white/5 px-2 py-0.5 font-medium text-gray-600 dark:text-gray-400">
                                  {vr.profile}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-xs font-bold text-success-600 dark:text-success-400 text-right font-mono">
                                {formatIDR(vr.price)}
                              </td>
                              <td className="px-4 py-2.5 text-xs">
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                                  vr.type === "hotspot" 
                                    ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" 
                                    : vr.type === "script"
                                    ? "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
                                    : "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400"
                                }`}>
                                  {vr.type === "hotspot" ? "Aktif" : vr.type === "script" ? "Log Script" : "Simulasi"}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate" title={vr.comment}>
                                {vr.comment || "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
