"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

interface Transaction {
  id: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  description: string;
  date: string;
  invoiceId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface KPIStats {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  count: number;
}

interface DbCategory {
  id: number;
  name: string;
  type: "INCOME" | "EXPENSE";
  isSystem: boolean;
}

export default function TransactionsPage() {
  // State data transaksi & KPI
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kpis, setKpis] = useState<KPIStats>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    count: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State master kategori dinamis dari database
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  
  // Default filter tanggal: Bulan Berjalan
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];
  
  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(lastDayOfMonth);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  
  // Form states
  const [formType, setFormType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [formCategory, setFormCategory] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  // Format Mata Uang Rupiah (IDR)
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Fetch Kategori dari API Master Data Kategori
  const fetchDbCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/mikrotik/billing/categories");
      const json = await res.json();
      if (json.success) {
        setDbCategories(json.data);
      }
    } catch (e) {
      console.error("Gagal memuat kategori kas dari database", e);
    }
  }, []);

  // Fetch data transaksi dari API
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (typeFilter !== "ALL") queryParams.append("type", typeFilter);
      if (categoryFilter !== "ALL") queryParams.append("category", categoryFilter);
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);
      if (searchTerm) queryParams.append("search", searchTerm);

      const res = await fetch(`/api/mikrotik/billing/transactions?${queryParams.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTransactions(json.data);
        setKpis(json.kpis);
      } else {
        setError(json.message || "Gagal memuat data transaksi kas");
      }
    } catch {
      setError("Masalah jaringan saat menghubungi server");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, categoryFilter, startDate, endDate, searchTerm]);

  // Load Kategori & Transaksi saat inisiasi
  useEffect(() => {
    fetchDbCategories();
    fetchTransactions();
  }, [fetchDbCategories, fetchTransactions]);

  // Sesuaikan kategori default form saat jenis kas berganti (Pilih kategori non-sistem pertama)
  useEffect(() => {
    const available = dbCategories.filter((c) => c.type === formType && !c.isSystem);
    if (available.length > 0) {
      setFormCategory(available[0].name);
    } else {
      // Fallback
      setFormCategory(formType === "INCOME" ? "PENDAPATAN_LAIN" : "PENGELUARAN_LAIN");
    }
  }, [formType, dbCategories]);

  // Submit Tambah Transaksi
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const res = await fetch("/api/mikrotik/billing/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType,
          category: formCategory,
          amount: parseFloat(formAmount),
          description: formDescription,
          date: formDate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsAddModalOpen(false);
        // Reset Form
        setFormAmount("");
        setFormDescription("");
        setFormDate(new Date().toISOString().split("T")[0]);
        // Refresh
        fetchTransactions();
      } else {
        alert(json.message || "Gagal menyimpan transaksi");
      }
    } catch {
      alert("Masalah koneksi saat menyimpan data");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Edit Transaksi
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;
    setFormSubmitting(true);
    try {
      const res = await fetch(`/api/mikrotik/billing/transactions/${selectedTx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType,
          category: formCategory,
          amount: parseFloat(formAmount),
          description: formDescription,
          date: formDate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsEditModalOpen(false);
        setSelectedTx(null);
        fetchTransactions();
      } else {
        alert(json.message || "Gagal memperbarui transaksi");
      }
    } catch {
      alert("Masalah koneksi saat memperbarui data");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Transaksi
  const handleDelete = async (tx: Transaction) => {
    const isAutomatic = tx.invoiceId !== null;
    const confirmMessage = isAutomatic
      ? "Transaksi ini dicatat otomatis dari pelunasan tagihan bulanan. Menghapusnya akan mengubah status tagihan terkait menjadi BELUM LUNAS (PENDING). Apakah Anda yakin?"
      : "Apakah Anda yakin ingin menghapus catatan transaksi manual ini?";

    if (!confirm(confirmMessage)) {
      return;
    }
    try {
      const res = await fetch(`/api/mikrotik/billing/transactions/${tx.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        fetchTransactions();
      } else {
        alert(json.message || "Gagal menghapus transaksi");
      }
    } catch {
      alert("Masalah jaringan saat menghapus transaksi");
    }
  };

  // Persiapan Edit Modal
  const openEditModal = (tx: Transaction) => {
    if (tx.invoiceId !== null) return; // Proteksi transaksi otomatis
    setSelectedTx(tx);
    setFormType(tx.type);
    setFormCategory(tx.category);
    setFormAmount(String(tx.amount));
    setFormDescription(tx.description);
    setFormDate(new Date(tx.date).toISOString().split("T")[0]);
    setIsEditModalOpen(true);
  };

  // Hitung Kategori untuk Dropdown Filter Pencarian
  const filterCategories = useMemo(() => {
    return dbCategories.filter((c) => {
      if (typeFilter === "ALL") return true;
      return c.type === typeFilter;
    });
  }, [dbCategories, typeFilter]);

  // Hitung Kategori manual yang bisa di-input (isSystem: false)
  const modalCategories = useMemo(() => {
    return dbCategories.filter((c) => c.type === formType && !c.isSystem);
  }, [dbCategories, formType]);

  // Memformat Label Kategori untuk Tampilan agar Rapi
  const getCategoryLabel = (name: string) => {
    const defaultLabels: Record<string, string> = {
      TAGIHAN_BULANAN: "Tagihan Bulanan",
      PENDAPATAN_LAIN: "Pendapatan Lain-lain",
      BANDWIDTH_ISP: "Bandwidth ISP",
      PEMBELIAN_ALAT: "Pembelian Alat",
      OPERASIONAL: "Operasional & Transport",
      GAJI_STAFF: "Gaji Staff/Teknisi",
      PENGELUARAN_LAIN: "Pengeluaran Lainnya",
    };
    
    if (defaultLabels[name]) return defaultLabels[name];
    // Ganti underscore dengan spasi untuk kategori manual kustom
    return name.replace(/_/g, " ");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageBreadcrumb pageTitle="Transaksi & Arus Kas" />

        {/* Action Button */}
        <button
          onClick={() => {
            setFormType("INCOME");
            // Cari kategori non-sistem pemasukan pertama
            const incomeCat = dbCategories.find(c => c.type === "INCOME" && !c.isSystem);
            setFormCategory(incomeCat ? incomeCat.name : "PENDAPATAN_LAIN");
            setFormAmount("");
            setFormDescription("");
            setFormDate(new Date().toISOString().split("T")[0]);
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 self-end sm:self-auto shadow-md cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Catat Transaksi Manual
        </button>
      </div>

      {/* Ringkasan Keuangan (KPI Grid) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* Total Uang Masuk */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col gap-1.5 border-l-4 border-l-success-500">
          <span className="text-xs font-semibold text-success-600 dark:text-success-400">Total Uang Masuk</span>
          <h2 className="text-xl font-bold text-success-600 dark:text-success-400 font-mono">
            {formatIDR(kpis.totalIncome)}
          </h2>
          <span className="text-[10px] text-gray-400">
            Arus dana masuk terhitung pada periode filter
          </span>
        </div>

        {/* Total Uang Keluar */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col gap-1.5 border-l-4 border-l-red-500">
          <span className="text-xs font-semibold text-red-500">Total Uang Keluar</span>
          <h2 className="text-xl font-bold text-red-500 font-mono">
            {formatIDR(kpis.totalExpense)}
          </h2>
          <span className="text-[10px] text-gray-400">
            Total biaya pengeluaran & operasional terhitung
          </span>
        </div>

        {/* Saldo Bersih / Kas */}
        <div className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col gap-1.5 border-l-4 ${
          kpis.netBalance >= 0 ? "border-l-brand-500" : "border-l-amber-500"
        }`}>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Saldo Kas Bersih</span>
          <h2 className={`text-xl font-bold font-mono ${
            kpis.netBalance >= 0 ? "text-brand-500" : "text-amber-500"
          }`}>
            {formatIDR(kpis.netBalance)}
          </h2>
          <span className="text-[10px] text-gray-400">
            Total Saldo Bersih: Masuk dikurangi Keluar
          </span>
        </div>
      </div>

      {/* Filter & Pencarian Box */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col gap-4">
        <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Pencarian & Penyaringan Kas</h4>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 items-end">
          {/* Kata Kunci */}
          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Keterangan Transaksi</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari deskripsi atau kata kunci..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-200 bg-transparent pl-8 pr-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900"
              />
              <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Tipe Transaksi */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Jenis Aliran</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCategoryFilter("ALL"); // Reset kategori saat tipe berganti
              }}
              className="h-9 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900 cursor-pointer"
            >
              <option value="ALL">Semua Jenis</option>
              <option value="INCOME">Uang Masuk (Income)</option>
              <option value="EXPENSE">Uang Keluar (Expense)</option>
            </select>
          </div>

          {/* Kategori */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Kategori Kas</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900 cursor-pointer"
            >
              <option value="ALL">Semua Kategori</option>
              {filterCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {getCategoryLabel(c.name)}
                </option>
              ))}
            </select>
          </div>

          {/* Mulai Tanggal */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900 cursor-pointer"
            />
          </div>

          {/* Selesai Tanggal */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900 cursor-pointer"
            />
          </div>
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

      {/* Tabel & Daftar Transaksi */}
      {loading ? (
        <div className="flex h-96 items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Memuat data pembukuan kas...</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">
              Riwayat Arus Kas ({transactions.length} Transaksi Tercatat)
            </h3>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-xs font-semibold">
              Tidak ada catatan transaksi keuangan yang sesuai dengan kriteria penyaringan Anda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.01]">
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center w-12">No</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 w-28">Tanggal</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center w-28">Aliran Kas</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 w-44">Kategori</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Deskripsi / Keterangan</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right w-36">Nominal</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center w-36">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                  {transactions.map((tx, index) => {
                    const isIncome = tx.type === "INCOME";
                    const isAutomatic = tx.invoiceId !== null;

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                      >
                        {/* No */}
                        <td className="px-4 py-3.5 text-xs text-center text-gray-500 font-mono">
                          {index + 1}
                        </td>

                        {/* Tanggal */}
                        <td className="px-4 py-3.5 text-xs font-mono font-medium text-gray-700 dark:text-gray-300">
                          {new Date(tx.date).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        {/* Aliran Kas (Badge) */}
                        <td className="px-4 py-3.5 text-xs text-center">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                            isIncome
                              ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                              : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                          }`}>
                            {isIncome ? "Masuk (In)" : "Keluar (Out)"}
                          </span>
                        </td>

                        {/* Kategori */}
                        <td className="px-4 py-3.5 text-xs font-semibold text-gray-900 dark:text-white">
                          {getCategoryLabel(tx.category)}
                        </td>

                        {/* Deskripsi */}
                        <td className="px-4 py-3.5 text-xs text-gray-700 dark:text-gray-300 leading-normal">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {tx.description}
                            {isAutomatic && (
                              <span 
                                className="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase"
                                title="Transaksi ini dicatat otomatis dari pelunasan tagihan"
                              >
                                Sistem
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Nominal */}
                        <td className={`px-4 py-3.5 text-xs font-bold text-right font-mono ${
                          isIncome ? "text-success-600 dark:text-success-400" : "text-red-500"
                        }`}>
                          {isIncome ? "+" : "-"}{formatIDR(tx.amount)}
                        </td>

                        {/* Aksi */}
                        <td className="px-4 py-3.5 text-xs text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Edit Button */}
                            {!isAutomatic ? (
                              <button
                                onClick={() => openEditModal(tx)}
                                className="px-2.5 py-1 rounded text-[10px] font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5 cursor-pointer"
                                title="Edit data transaksi manual"
                              >
                                Edit
                              </button>
                            ) : (
                              <span 
                                className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold italic cursor-help"
                                title="Kategori & nominal transaksi otomatis dikunci oleh sistem"
                              >
                                Terkunci 🔒
                              </span>
                            )}

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDelete(tx)}
                              className="text-gray-400 hover:text-red-500 transition cursor-pointer"
                              title={isAutomatic ? "Hapus transaksi otomatis & batalkan pelunasan tagihan" : "Hapus transaksi manual"}
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* DIALOG/MODAL: TAMBAH TRANSAKSI */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-950 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Catat Transaksi Baru (Kas Manual)
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
              {/* Type Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormType("INCOME")}
                    className={`h-9 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      formType === "INCOME"
                        ? "bg-success-50 text-success-600 border-success-500 dark:bg-success-500/10 dark:text-success-400"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
                    }`}
                  >
                    Uang Masuk (Income)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("EXPENSE")}
                    className={`h-9 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      formType === "EXPENSE"
                        ? "bg-red-50 text-red-600 border-red-500 dark:bg-red-500/10 dark:text-red-400"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
                    }`}
                  >
                    Uang Keluar (Expense)
                  </button>
                </div>
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Kategori</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900 cursor-pointer"
                >
                  {modalCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {getCategoryLabel(c.name)}
                    </option>
                  ))}
                  {modalCategories.length === 0 && (
                    <option value="">Belum ada kategori kustom terdaftar</option>
                  )}
                </select>
              </div>

              {/* Nominal & Date */}
              <div className="grid grid-cols-2 gap-4">
                {/* Nominal */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Nominal (Rp)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Contoh: 150000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900"
                  />
                </div>

                {/* Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tanggal Transaksi</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900 cursor-pointer"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Keterangan / Deskripsi</label>
                <textarea
                  required
                  placeholder="Tulis rincian deskripsi transaksi..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-transparent p-3 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900 h-20 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || modalCategories.length === 0}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG/MODAL: EDIT TRANSAKSI */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-950 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Ubah Data Transaksi Manual
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedTx(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              {/* Type Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormType("INCOME")}
                    className={`h-9 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      formType === "INCOME"
                        ? "bg-success-50 text-success-600 border-success-500 dark:bg-success-500/10 dark:text-success-400"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
                    }`}
                  >
                    Uang Masuk (Income)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("EXPENSE")}
                    className={`h-9 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      formType === "EXPENSE"
                        ? "bg-red-50 text-red-600 border-red-500 dark:bg-red-500/10 dark:text-red-400"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
                    }`}
                  >
                    Uang Keluar (Expense)
                  </button>
                </div>
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Kategori</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900 cursor-pointer"
                >
                  {modalCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {getCategoryLabel(c.name)}
                    </option>
                  ))}
                  {modalCategories.length === 0 && (
                    <option value="">Belum ada kategori kustom terdaftar</option>
                  )}
                </select>
              </div>

              {/* Nominal & Date */}
              <div className="grid grid-cols-2 gap-4">
                {/* Nominal */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Nominal (Rp)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Contoh: 150000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900"
                  />
                </div>

                {/* Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tanggal Transaksi</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900 cursor-pointer"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Keterangan / Deskripsi</label>
                <textarea
                  required
                  placeholder="Tulis rincian deskripsi transaksi..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-transparent p-3 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900 h-20 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedTx(null);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || modalCategories.length === 0}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  Perbarui Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
