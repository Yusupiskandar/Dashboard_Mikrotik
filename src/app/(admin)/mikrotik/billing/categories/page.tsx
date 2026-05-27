"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

interface Category {
  id: number;
  name: string;
  type: "INCOME" | "EXPENSE";
  isSystem: boolean;
  createdAt: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab state
  const [activeTab, setActiveTab] = useState<"INCOME" | "EXPENSE">("INCOME");
  
  // Search state
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Form fields
  const [formName, setFormName] = useState<string>("");
  const [formType, setFormType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Fetch categories from database API
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mikrotik/billing/categories");
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
      } else {
        setError(json.message || "Gagal memuat master data kategori");
      }
    } catch {
      setError("Masalah jaringan saat menghubungi server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Open modal to add category
  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormName("");
    setFormType(activeTab); // Prefill based on active tab
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal to edit category
  const handleOpenEditModal = (cat: Category) => {
    if (cat.isSystem) return; // Prevent system categories from edit modal
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormType(cat.type);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit Add or Edit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const name = formName.trim();
    if (!name) {
      setFormError("Nama kategori wajib diisi!");
      setSubmitting(false);
      return;
    }

    try {
      const url = editingCategory
        ? `/api/mikrotik/billing/categories/${editingCategory.id}`
        : "/api/mikrotik/billing/categories";
      const method = editingCategory ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: formType,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        fetchCategories();
      } else {
        setFormError(json.message || "Gagal menyimpan kategori");
      }
    } catch {
      setFormError("Masalah jaringan saat menghubungi server");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Category
  const handleDelete = async (cat: Category) => {
    if (cat.isSystem) {
      alert("Kategori sistem bawaan tidak dapat dihapus!");
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus kategori '${cat.name}'?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/mikrotik/billing/categories/${cat.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        fetchCategories();
      } else {
        alert(json.message || "Gagal menghapus kategori");
      }
    } catch {
      alert("Masalah jaringan saat menghubungi server");
    }
  };

  // Filtered categories lists
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchesTab = c.type === activeTab;
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [categories, activeTab, searchTerm]);

  // Dynamic label map for categories in case user updates a category
  // Tagihan Bulanan needs to look clean on UI
  const formatLabel = (name: string) => {
    const defaultLabels: Record<string, string> = {
      TAGIHAN_BULANAN: "Tagihan Bulanan (Lunas)",
      PENDAPATAN_LAIN: "Pendapatan Lain-lain",
      BANDWIDTH_ISP: "Biaya Bandwidth ISP",
      PEMBELIAN_ALAT: "Pembelian Alat & Inventaris",
      OPERASIONAL: "Biaya Operasional",
      GAJI_STAFF: "Gaji Teknisi/Staff",
      PENGELUARAN_LAIN: "Pengeluaran Lainnya",
    };
    return defaultLabels[name] || name;
  };

  // Aggregate statistics
  const stats = useMemo(() => {
    const totalIncome = categories.filter((c) => c.type === "INCOME").length;
    const totalExpense = categories.filter((c) => c.type === "EXPENSE").length;
    const totalSystem = categories.filter((c) => c.isSystem).length;

    return { totalIncome, totalExpense, totalSystem };
  }, [categories]);

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageBreadcrumb pageTitle="Master Kategori Transaksi" />
        
        {/* Add Category Button */}
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 self-end sm:self-auto shadow-md cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Kategori Baru
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* Total Income Categories */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col justify-between shadow-sm border-l-4 border-l-success-500">
          <div>
            <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400 font-semibold">Kategori Uang Masuk</p>
            <p className="text-2xl font-black text-success-600 dark:text-success-400 font-mono">
              {stats.totalIncome} <span className="text-xs font-normal text-gray-400">kategori</span>
            </p>
          </div>
        </div>

        {/* Total Expense Categories */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col justify-between shadow-sm border-l-4 border-l-red-500">
          <div>
            <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400 font-semibold">Kategori Uang Keluar</p>
            <p className="text-2xl font-black text-red-500 font-mono">
              {stats.totalExpense} <span className="text-xs font-normal text-gray-400">kategori</span>
            </p>
          </div>
        </div>

        {/* Total System Categories */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col justify-between shadow-sm border-l-4 border-l-brand-500">
          <div>
            <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400 font-semibold">Kategori Bawaan Sistem</p>
            <p className="text-2xl font-black text-brand-500 font-mono">
              {stats.totalSystem} <span className="text-xs font-normal text-gray-400">kunci 🔒</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab("INCOME")}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "INCOME"
              ? "border-success-500 text-success-600 dark:text-success-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          📈 Kategori Uang Masuk (Income)
        </button>
        <button
          onClick={() => setActiveTab("EXPENSE")}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "EXPENSE"
              ? "border-red-500 text-red-500"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          📉 Kategori Uang Keluar (Expense)
        </button>
      </div>

      {/* Search Input Box */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col md:flex-row gap-4 items-end shadow-sm">
        {/* Search */}
        <div className="flex-1 w-full flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Cari Kategori</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Cari berdasarkan nama kategori..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 bg-transparent pl-8 pr-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900"
            />
            <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
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

      {/* Loading state */}
      {loading ? (
        <div className="flex h-80 items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Memuat data kategori kas...</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
          <h3 className="mb-5 text-base font-semibold text-gray-800 dark:text-white">
            Daftar Master Kategori: {activeTab === "INCOME" ? "Uang Masuk" : "Uang Keluar"} ({filteredCategories.length} Ditemukan)
          </h3>

          {filteredCategories.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-xs font-semibold">
              Belum ada kategori terdaftar yang sesuai.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.01]">
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 w-16">No.</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Nama Kode Kategori</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Label Tampilan</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 w-44">Tipe Otoritas</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center w-36">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                  {filteredCategories.map((c, index) => (
                    <tr 
                      key={c.id} 
                      className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                    >
                      {/* Number */}
                      <td className="px-5 py-3.5 text-xs font-mono text-gray-400">
                        {index + 1}.
                      </td>

                      {/* Code Name */}
                      <td className="px-5 py-3.5 text-xs font-mono font-bold text-gray-800 dark:text-white">
                        {c.name}
                      </td>

                      {/* Display Label */}
                      <td className="px-5 py-3.5 text-xs text-gray-700 dark:text-gray-300 font-semibold">
                        {formatLabel(c.name)}
                      </td>
                      
                      {/* Authority Type */}
                      <td className="px-5 py-3.5 text-xs">
                        {c.isSystem ? (
                          <span className="inline-flex rounded-full bg-gray-100 dark:bg-white/5 px-2.5 py-0.5 text-[9px] font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
                            Sistem 🔒
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 px-2.5 py-0.5 text-[9px] font-bold border border-blue-100 dark:border-blue-500/20">
                            Custom ⚙️
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-xs text-center">
                        {c.isSystem ? (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold italic cursor-help" title="Kategori internal sistem dikunci secara otomatis">
                            Terkunci 🔒
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-3.5">
                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEditModal(c)}
                              className="text-gray-400 hover:text-brand-500 transition cursor-pointer"
                              title="Ubah nama kategori"
                            >
                              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            
                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(c)}
                              className="text-gray-400 hover:text-red-500 transition cursor-pointer"
                              title="Hapus kategori manual"
                            >
                              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DIALOG/MODAL: ADD / EDIT CATEGORY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-950 flex flex-col gap-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {editingCategory ? "Ubah Nama Kategori" : "Tambah Kategori Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Error Banner */}
            {formError && (
              <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {formError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Nama Kategori */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Nama Kategori (Gunakan Huruf Kapital & Underscore) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Contoh: BIAYA_SEWA, PENDAPATAN_KUSTOM"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                  className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900"
                />
              </div>

              {/* Tipe Transaksi */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Jenis Aliran Kas <span className="text-red-500">*</span>
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as "INCOME" | "EXPENSE")}
                  disabled={editingCategory !== null} // Type cannot be changed when editing
                  className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900 cursor-pointer disabled:opacity-50"
                >
                  <option value="INCOME">Uang Masuk (Income)</option>
                  <option value="EXPENSE">Uang Keluar (Expense)</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {editingCategory ? "Simpan Perubahan" : "Tambah Kategori"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
