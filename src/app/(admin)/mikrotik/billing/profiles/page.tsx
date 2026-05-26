"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

interface BillingProfile {
  id: number;
  name: string;
  speed: string;
  price: number;
  createdAt: string;
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<BillingProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<BillingProfile | null>(null);
  
  // Form fields
  const [formData, setFormData] = useState({
    name: "",
    speed: "",
    price: "",
  });
  
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Format currency
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Fetch billing profiles from SQLite API
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mikrotik/billing/profiles");
      const json = await res.json();
      if (json.success) {
        setProfiles(json.data);
      } else {
        setError(json.message || "Gagal memuat data profil paket");
      }
    } catch {
      setError("Masalah jaringan saat menghubungi server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Open modal to add new profile
  const handleOpenAddModal = () => {
    setEditingProfile(null);
    setFormData({
      name: "",
      speed: "",
      price: "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal to edit existing profile
  const handleOpenEditModal = (profile: BillingProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      speed: profile.speed,
      price: String(profile.price),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Form Submission (Add or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const { name, speed, price } = formData;

    // Client-side validations
    if (!name || !speed || !price) {
      setFormError("Semua kolom (nama profil, kecepatan, tarif) wajib diisi!");
      setSubmitting(false);
      return;
    }

    try {
      const url = editingProfile
        ? `/api/mikrotik/billing/profiles/${editingProfile.id}`
        : "/api/mikrotik/billing/profiles";
      const method = editingProfile ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          speed,
          price: parseInt(price, 10),
        }),
      });

      const json = await res.json();
      
      if (json.success) {
        setIsModalOpen(false);
        fetchProfiles();
      } else {
        setFormError(json.message || "Gagal menyimpan profil paket");
      }
    } catch {
      setFormError("Masalah jaringan saat menghubungi server");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Profile
  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus profil paket ini? Penghapusan akan ditolak jika sedang digunakan pelanggan aktif.")) {
      return;
    }

    try {
      const res = await fetch(`/api/mikrotik/billing/profiles/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        fetchProfiles();
      } else {
        alert(json.message || "Gagal menghapus profil paket");
      }
    } catch {
      alert("Masalah jaringan saat menghubungi server");
    }
  };

  // Filtered profile list
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      return (
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.speed.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [profiles, searchTerm]);

  // Aggregate statistics for header cards
  const stats = useMemo(() => {
    const total = profiles.length;
    const avgPrice = total > 0 ? Math.round(profiles.reduce((acc, p) => acc + p.price, 0) / total) : 0;
    const highestPrice = total > 0 ? Math.max(...profiles.map((p) => p.price)) : 0;

    return { total, avgPrice, highestPrice };
  }, [profiles]);

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageBreadcrumb pageTitle="Profil Paket Langganan" />
        
        {/* Tambah Profil Button */}
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 self-end sm:self-auto shadow-md"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Profil Paket
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Profiles */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col justify-between shadow-sm">
          <div>
            <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Total Paket Terdaftar</p>
            <p className="text-2xl font-black text-gray-800 dark:text-white">
              {stats.total} <span className="text-xs font-normal text-gray-400">paket</span>
            </p>
          </div>
        </div>

        {/* Average Price */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col justify-between shadow-sm">
          <div>
            <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Rata-rata Tarif</p>
            <p className="text-2xl font-black text-brand-600 dark:text-brand-400">
              {formatIDR(stats.avgPrice)}
            </p>
          </div>
        </div>

        {/* Highest Price */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col justify-between shadow-sm">
          <div>
            <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Tarif Tertinggi</p>
            <p className="text-2xl font-black text-success-600 dark:text-success-400">
              {formatIDR(stats.highestPrice)}
            </p>
          </div>
        </div>
      </div>

      {/* Search Filter Box */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col md:flex-row gap-4 items-end">
        {/* Search */}
        <div className="flex-1 w-full flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Cari Profil Paket</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Cari nama profil atau kecepatan..."
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
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 flex items-center gap-2">
          <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex h-96 items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Memuat master data profil...</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
          <h3 className="mb-5 text-base font-semibold text-gray-800 dark:text-white">
            Daftar Master Paket Kecepatan ({filteredProfiles.length} Paket)
          </h3>

          {filteredProfiles.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-xs">
              Belum ada profil paket yang terdaftar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.01]">
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 w-16">No.</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Nama Profil Paket</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Batas Kecepatan</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Tarif Bulanan</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                  {filteredProfiles.map((p, index) => (
                    <tr 
                      key={p.id} 
                      className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                    >
                      {/* Number */}
                      <td className="px-5 py-3.5 text-xs font-mono text-gray-400">
                        {index + 1}.
                      </td>

                      {/* Profile Name */}
                      <td className="px-5 py-3.5 text-xs font-bold text-gray-900 dark:text-white">
                        {p.name}
                      </td>
                      
                      {/* Speed Limit */}
                      <td className="px-5 py-3.5 text-xs text-gray-700 dark:text-gray-300">
                        <span className="inline-flex rounded-md bg-gray-100 dark:bg-white/5 px-2 py-0.5 font-mono font-bold text-gray-600 dark:text-gray-400">
                          {p.speed}
                        </span>
                      </td>

                      {/* Monthly Fee */}
                      <td className="px-5 py-3.5 text-xs font-black text-success-600 dark:text-success-400 text-right font-mono">
                        {formatIDR(p.price)}
                      </td>
                      
                      {/* Actions */}
                      <td className="px-5 py-3.5 text-xs text-center">
                        <div className="flex items-center justify-center gap-3">
                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="text-gray-500 hover:text-brand-500 transition cursor-pointer"
                            title="Edit Profil"
                          >
                            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-gray-500 hover:text-red-500 transition cursor-pointer"
                            title="Hapus Profil"
                          >
                            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT PROFILE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-950 flex flex-col gap-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {editingProfile ? "Edit Profil Paket" : "Tambah Profil Paket Baru"}
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
              {/* Nama Profil */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Nama Profil Paket <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Contoh: Home-10Mbps atau 10M-PPPoE"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900"
                />
              </div>

              {/* Batas Kecepatan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Batas Kecepatan Bandwidth <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="speed"
                  required
                  placeholder="Contoh: 10 Mbps atau 10M/10M"
                  value={formData.speed}
                  onChange={handleInputChange}
                  className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900"
                />
              </div>

              {/* Tarif Bulanan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Tarif Bulanan (IDR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  required
                  placeholder="Contoh: 150000"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900"
                />
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
                  {editingProfile ? "Simpan Perubahan" : "Tambah Paket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
