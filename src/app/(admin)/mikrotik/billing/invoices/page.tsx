"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

interface BillingProfile {
  id: number;
  name: string;
  speed: string;
  price: number;
}

interface Customer {
  id: number;
  name: string;
  whatsapp: string;
  address: string | null;
  pppoeUsername: string;
  pppoePassword: string;
  profileId: number;
  profile: BillingProfile;
  monthlyFee: number;
  dueDay: number;
  isActive: boolean;
}

interface Invoice {
  id: number;
  customerId: number;
  customer: Customer;
  month: number;
  year: number;
  amount: number;
  status: "PAID" | "PENDING";
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const MONTHS = [
  { value: 1, name: "Januari" },
  { value: 2, name: "Februari" },
  { value: 3, name: "Maret" },
  { value: 4, name: "April" },
  { value: 5, name: "Mei" },
  { value: 6, name: "Juni" },
  { value: 7, name: "Juli" },
  { value: 8, name: "Agustus" },
  { value: 9, name: "September" },
  { value: 10, name: "Oktober" },
  { value: 11, name: "November" },
  { value: 12, name: "Desember" },
];

const YEARS = [2025, 2026, 2027, 2028, 2029];

export default function InvoicesPage() {
  const currentDate = new Date();
  const currentMonthVal = currentDate.getMonth() + 1;
  const currentYearVal = currentDate.getFullYear();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthVal);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearVal);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Bulk Generator Modal State
  const [isGenModalOpen, setIsGenModalOpen] = useState<boolean>(false);
  const [genMonth, setGenMonth] = useState<number>(currentMonthVal);
  const [genYear, setGenYear] = useState<number>(currentYearVal);
  const [generating, setGenerating] = useState<boolean>(false);
  const [genResult, setGenResult] = useState<string | null>(null);

  // Status update state for spinner
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Format currency
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Fetch Invoices from API
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        month: String(selectedMonth),
        year: String(selectedYear),
      });
      if (statusFilter !== "ALL") {
        query.append("status", statusFilter);
      }
      
      const res = await fetch(`/api/mikrotik/billing/invoices?${query.toString()}`);
      const json = await res.json();
      if (json.success) {
        setInvoices(json.data);
      } else {
        setError(json.message || "Gagal memuat data tagihan");
      }
    } catch {
      setError("Masalah jaringan saat menghubungi server");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Handle Toggle payment status
  const handleToggleStatus = async (invoice: Invoice) => {
    setUpdatingId(invoice.id);
    const newStatus = invoice.status === "PAID" ? "PENDING" : "PAID";
    try {
      const res = await fetch(`/api/mikrotik/billing/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        // Update state locally
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === invoice.id
              ? {
                  ...inv,
                  status: newStatus,
                  paidAt: newStatus === "PAID" ? new Date().toISOString() : null,
                }
              : inv
          )
        );
      } else {
        alert(json.message || "Gagal memperbarui status tagihan");
      }
    } catch {
      alert("Masalah jaringan saat mengubah status");
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle Delete Invoice
  const handleDeleteInvoice = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data tagihan ini secara permanen?")) {
      return;
    }
    try {
      const res = await fetch(`/api/mikrotik/billing/invoices/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      } else {
        alert(json.message || "Gagal menghapus data tagihan");
      }
    } catch {
      alert("Masalah jaringan saat menghapus tagihan");
    }
  };

  // Handle Generate Invoices
  const handleGenerateInvoices = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await fetch("/api/mikrotik/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: genMonth, year: genYear }),
      });
      const json = await res.json();
      if (json.success) {
        setGenResult(json.message);
        // Refresh invoices list if the generated month matches current filters
        if (genMonth === selectedMonth && genYear === selectedYear) {
          fetchInvoices();
        }
      } else {
        setGenResult(`Error: ${json.message}`);
      }
    } catch {
      setGenResult("Error: Masalah jaringan atau kegagalan server.");
    } finally {
      setGenerating(false);
    }
  };

  // Calculate Financial KPI Summary
  const financialSummary = useMemo(() => {
    let totalGenerated = 0;
    let totalCollected = 0;
    let totalUnpaid = 0;
    let paidCount = 0;

    invoices.forEach((inv) => {
      totalGenerated += inv.amount;
      if (inv.status === "PAID") {
        totalCollected += inv.amount;
        paidCount++;
      } else {
        totalUnpaid += inv.amount;
      }
    });

    const paymentRate = invoices.length > 0 ? Math.round((paidCount / invoices.length) * 100) : 0;

    return {
      totalGenerated,
      totalCollected,
      totalUnpaid,
      paymentRate,
      paidCount,
      totalCount: invoices.length,
    };
  }, [invoices]);

  // Filtered invoices by search term (on top of month/year API filters)
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customer.pppoeUsername.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [invoices, searchTerm]);

  // Format WhatsApp Text
  const handleSendWA = (inv: Invoice) => {
    const custName = inv.customer.name;
    const phone = inv.customer.whatsapp.replace(/[^0-9]/g, "");
    const monthName = MONTHS.find((m) => m.value === inv.month)?.name || String(inv.month);
    const nominal = formatIDR(inv.amount);
    
    // Calculate custom due date based on dueDay and month/year
    const dueDateStr = `${inv.customer.dueDay} ${monthName} ${inv.year}`;

    const message = `Halo Bapak/Ibu *${custName}*,\n\nKami menginformasikan bahwa tagihan internet bulanan Anda untuk periode *${monthName} ${inv.year}* sebesar *${nominal}* telah terbit.\n\nMohon lakukan pembayaran sebelum tanggal *${dueDateStr}*.\n\n*Detail Akun PPPoE:* ${inv.customer.pppoeUsername}\n*Status:* ${inv.status === "PAID" ? "Lunas (Terbayar)" : "Belum Lunas (Menunggu Pembayaran)"}\n\nTerima kasih atas perhatian Anda.`;
    
    const encodedText = encodeURIComponent(message);
    const waUrl = `https://wa.me/${phone}?text=${encodedText}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageBreadcrumb pageTitle="Kelola Tagihan Bulanan" />

        {/* Action Button */}
        <button
          onClick={() => {
            setGenMonth(selectedMonth);
            setGenYear(selectedYear);
            setGenResult(null);
            setIsGenModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 self-end sm:self-auto shadow-md cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Generate Tagihan Bulanan
        </button>
      </div>

      {/* KPI Dashboard Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI Card 1: Total Tagihan */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Tagihan Terbit</span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white font-mono">
            {formatIDR(financialSummary.totalGenerated)}
          </h2>
          <span className="text-[10px] text-gray-400">
            Periode: {MONTHS.find((m) => m.value === selectedMonth)?.name} {selectedYear}
          </span>
        </div>

        {/* KPI Card 2: Total Lunas */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col gap-1.5 border-l-4 border-l-success-500">
          <span className="text-xs font-semibold text-success-600 dark:text-success-400">Total Lunas (Pendapatan)</span>
          <h2 className="text-xl font-bold text-success-600 dark:text-success-400 font-mono">
            {formatIDR(financialSummary.totalCollected)}
          </h2>
          <span className="text-[10px] text-gray-400">
            {financialSummary.paidCount} dari {financialSummary.totalCount} tagihan lunas
          </span>
        </div>

        {/* KPI Card 3: Belum Bayar */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col gap-1.5 border-l-4 border-l-red-500">
          <span className="text-xs font-semibold text-red-500">Tunggakan (Belum Bayar)</span>
          <h2 className="text-xl font-bold text-red-500 font-mono">
            {formatIDR(financialSummary.totalUnpaid)}
          </h2>
          <span className="text-[10px] text-gray-400">
            {financialSummary.totalCount - financialSummary.paidCount} tagihan tertunda
          </span>
        </div>

        {/* KPI Card 4: Rasio Pembayaran */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Rasio Pelunasan</span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white font-mono">
            {financialSummary.paymentRate}%
          </h2>
          {/* Progress Bar */}
          <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mt-1.5">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${financialSummary.paymentRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Box */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col lg:flex-row gap-4 items-end shadow-sm">
        {/* Search */}
        <div className="flex-1 w-full flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Cari Pelanggan</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Cari nama pelanggan atau username PPPoE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 bg-transparent pl-8 pr-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900"
            />
            <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Filter Month */}
        <div className="w-full lg:w-44 flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Bulan Tagihan</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="h-9 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900 cursor-pointer"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Year */}
        <div className="w-full lg:w-36 flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tahun</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="h-9 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900 cursor-pointer"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Payment Status */}
        <div className="w-full lg:w-44 flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status Bayar</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900 cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">Belum Lunas</option>
            <option value="PAID">Lunas</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 flex items-center gap-2 shadow-sm">
          <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex h-96 items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Memuat data penagihan...</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">
              Data Tagihan Periode: {MONTHS.find((m) => m.value === selectedMonth)?.name} {selectedYear} ({filteredInvoices.length} Ditemukan)
            </h3>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-xs font-semibold">
              Tidak ada data tagihan terdaftar untuk periode filter ini. Silakan generate baru.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.01]">
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center w-12">No</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Nama Pelanggan</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400">PPPoE User</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Paket Internet</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right w-36">Nominal</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center w-36">Jatuh Tempo</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center w-32">Status</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center w-40">Tanggal Bayar</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center w-44">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                  {filteredInvoices.map((inv, index) => {
                    const monthName = MONTHS.find((m) => m.value === inv.month)?.name || "";
                    const isPaid = inv.status === "PAID";
                    
                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                      >
                        {/* Number */}
                        <td className="px-4 py-3.5 text-xs text-center text-gray-500 font-mono">
                          {index + 1}
                        </td>

                        {/* Customer Name */}
                        <td className="px-4 py-3.5 text-xs font-bold text-gray-900 dark:text-white">
                          {inv.customer.name}
                        </td>

                        {/* PPPoE Username */}
                        <td className="px-4 py-3.5 text-xs font-mono text-gray-600 dark:text-gray-400 font-semibold">
                          {inv.customer.pppoeUsername}
                        </td>

                        {/* Profile Name & Speed */}
                        <td className="px-4 py-3.5 text-xs">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {inv.customer.profile?.name || "Kustom"}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {inv.customer.profile?.speed || ""}
                            </span>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3.5 text-xs font-bold text-success-600 dark:text-success-400 text-right font-mono">
                          {formatIDR(inv.amount)}
                        </td>

                        {/* Due Date calculation */}
                        <td className="px-4 py-3.5 text-xs text-center text-gray-700 dark:text-gray-300 font-medium">
                          {inv.customer.dueDay} {monthName} {inv.year}
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-3.5 text-xs text-center">
                          <button
                            onClick={() => handleToggleStatus(inv)}
                            disabled={updatingId === inv.id}
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold cursor-pointer transition-transform hover:scale-105 active:scale-95 ${
                              isPaid
                                ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                                : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                            }`}
                            title="Klik untuk mengubah status pembayaran"
                          >
                            {updatingId === inv.id ? (
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : isPaid ? (
                              "Lunas"
                            ) : (
                              "Belum Bayar"
                            )}
                          </button>
                        </td>

                        {/* Payment Date */}
                        <td className="px-4 py-3.5 text-xs text-center text-gray-600 dark:text-gray-300 font-medium font-mono">
                          {inv.paidAt ? (
                            new Date(inv.paidAt).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-xs text-center">
                          <div className="flex items-center justify-center gap-2.5">
                            {/* Toggle Quick Button */}
                            <button
                              onClick={() => handleToggleStatus(inv)}
                              disabled={updatingId === inv.id}
                              className={`px-2 py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                                isPaid
                                  ? "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
                                  : "bg-brand-500 text-white hover:bg-brand-600 shadow-sm"
                              }`}
                            >
                              {isPaid ? "Belum Lunas" : "Set Lunas"}
                            </button>

                            {/* WhatsApp Notification */}
                            <button
                              onClick={() => handleSendWA(inv)}
                              className="text-emerald-500 hover:text-emerald-600 transition cursor-pointer"
                              title="Kirim Penagihan via WhatsApp"
                            >
                              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.332 4.977L2 22l5.188-1.358a9.901 9.901 0 004.819 1.341h.005c5.507 0 9.99-4.478 9.991-9.985A9.972 9.972 0 0012.012 2zm5.836 14.22c-.255.719-1.282 1.313-1.764 1.385-.483.072-.962.133-3.136-.757-2.78-1.139-4.577-3.957-4.717-4.143-.139-.186-1.133-1.503-1.133-2.868 0-1.365.719-2.036 1.002-2.316.282-.28.614-.35.819-.35.205 0 .41.002.59.011.187.009.437-.072.684.523.255.614.872 2.128.948 2.28.077.152.128.328.025.53-.102.203-.153.328-.306.507-.153.18-.323.4-.461.536-.153.153-.314.32-.136.626.18.305.8 1.312 1.716 2.128.918.814 1.692 1.066 2.001 1.196.307.13.486.109.667-.101.18-.21.776-.902.981-1.213.205-.31.41-.258.693-.152.282.106 1.792.846 2.1 1 .307.153.513.228.59.359.077.132.077.76-.178 1.479z"/>
                              </svg>
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteInvoice(inv.id)}
                              className="text-gray-400 hover:text-red-500 transition cursor-pointer"
                              title="Hapus Tagihan"
                            >
                              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* BULK GENERATE MODAL */}
      {isGenModalOpen && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-950 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Buat Tagihan Bulanan Baru
              </h3>
              <button
                onClick={() => setIsGenModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-500 leading-normal">
              Sistem akan secara otomatis mendeteksi semua pelanggan bulanan yang **aktif** dan menerbitkan tagihan untuk bulan/tahun yang Anda pilih, menyalin biaya paket terkait ke dalam catatan tagihan. Jika tagihan sudah diterbitkan sebelumnya, sistem akan melewatinya secara otomatis untuk mencegah duplikasi.
            </p>

            {/* Form */}
            <form onSubmit={handleGenerateInvoices} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Month selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Bulan Penagihan</label>
                  <select
                    value={genMonth}
                    onChange={(e) => setGenMonth(parseInt(e.target.value, 10))}
                    className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900 cursor-pointer"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tahun</label>
                  <select
                    value={genYear}
                    onChange={(e) => setGenYear(parseInt(e.target.value, 10))}
                    className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900 cursor-pointer"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Banner */}
              {genResult && (
                <div className={`rounded-lg p-3 text-xs font-semibold ${
                  genResult.startsWith("Error")
                    ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                    : "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                }`}>
                  {genResult}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800 mt-2">
                <button
                  type="button"
                  onClick={() => setIsGenModalOpen(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {generating && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  Mulai Terbitkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
