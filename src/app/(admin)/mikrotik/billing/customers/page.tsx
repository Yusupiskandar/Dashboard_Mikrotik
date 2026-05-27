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
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profiles, setProfiles] = useState<BillingProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Form fields
  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
    address: "",
    pppoeUsername: "",
    pppoePassword: "",
    profileId: "",
    dueDay: "5",
    isActive: true,
  });
  
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Password visibility state
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});

  // Format currency
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Fetch profiles from SQLite API
  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/mikrotik/billing/profiles");
      const json = await res.json();
      if (json.success) {
        setProfiles(json.data);
      }
    } catch (err) {
      console.error("Gagal mengambil data profil paket:", err);
    }
  }, []);

  // Fetch customers from SQLite API
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mikrotik/billing/customers");
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data);
      } else {
        setError(json.message || "Gagal memuat data pelanggan");
      }
    } catch {
      setError("Masalah jaringan saat menghubungi server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchProfiles();
  }, [fetchCustomers, fetchProfiles]);

  // Open modal to add new customer
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      whatsapp: "",
      address: "",
      pppoeUsername: "",
      pppoePassword: "",
      profileId: profiles.length > 0 ? String(profiles[0].id) : "",
      dueDay: "5",
      isActive: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal to edit existing customer
  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      whatsapp: customer.whatsapp,
      address: customer.address || "",
      pppoeUsername: customer.pppoeUsername,
      pppoePassword: customer.pppoePassword,
      profileId: String(customer.profileId),
      dueDay: String(customer.dueDay),
      isActive: customer.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle Form Submission (Add or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const {
      name,
      whatsapp,
      address,
      pppoeUsername,
      pppoePassword,
      profileId,
      dueDay,
      isActive,
    } = formData;

    // Client-side validations
    if (!name || !whatsapp || !pppoeUsername || !pppoePassword || !profileId) {
      setFormError("Kolom nama, WhatsApp, username, password, dan profil wajib diisi!");
      setSubmitting(false);
      return;
    }

    try {
      const url = editingCustomer
        ? `/api/mikrotik/billing/customers/${editingCustomer.id}`
        : "/api/mikrotik/billing/customers";
      const method = editingCustomer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          whatsapp,
          address,
          pppoeUsername,
          pppoePassword,
          profileId: parseInt(profileId, 10),
          dueDay: parseInt(dueDay, 10),
          isActive,
        }),
      });

      const json = await res.json();
      
      if (json.success) {
        setIsModalOpen(false);
        fetchCustomers();
      } else {
        setFormError(json.message || "Gagal menyimpan data pelanggan");
      }
    } catch {
      setFormError("Masalah jaringan saat menghubungi server");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Customer
  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pelanggan bulanan ini dari database lokal?")) {
      return;
    }

    try {
      const res = await fetch(`/api/mikrotik/billing/customers/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        fetchCustomers();
      } else {
        alert(json.message || "Gagal menghapus pelanggan");
      }
    } catch {
      alert("Masalah jaringan saat menghubungi server");
    }
  };

  // Toggle Password visibility for a specific row
  const togglePasswordVisibility = (id: number) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.pppoeUsername.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && c.isActive) ||
        (statusFilter === "inactive" && !c.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter]);

  // Calculate total billing fee
  const totalBillingFee = useMemo(() => {
    return filteredCustomers.reduce((acc, c) => acc + c.monthlyFee, 0);
  }, [filteredCustomers]);

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print-hidden">
        <PageBreadcrumb pageTitle="Kelola Pelanggan Bulanan" />
        
        <div className="flex items-center gap-2 self-end sm:self-auto print-hidden">
          {/* Export PDF Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition dark:border-gray-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5 shadow-md cursor-pointer"
          >
            <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to PDF
          </button>

          {/* Tambah Pelanggan Button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 shadow-md cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Pelanggan
          </button>
        </div>
      </div>

      {/* Filter and Search Box */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col md:flex-row gap-4 items-end print-hidden">
        {/* Search */}
        <div className="flex-1 w-full flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Cari Pelanggan</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Cari nama atau username PPPoE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 bg-transparent pl-8 pr-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900"
            />
            <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Filter Status keaktifan */}
        <div className="w-full md:w-56 flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status Keaktifan</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white dark:bg-gray-900"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif / Terisolir</option>
          </select>
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
            <p className="text-xs text-gray-500 dark:text-gray-400">Memuat data pelanggan bulanan...</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
          <h3 className="mb-5 text-base font-semibold text-gray-800 dark:text-white">
            Daftar Pelanggan Bulanan ({filteredCustomers.length} Orang)
          </h3>

          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-xs">
              Tidak ada data pelanggan bulanan ditemukan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.01]">
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center">Terdaftar</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Nama Pelanggan</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Alamat</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400">No. WhatsApp</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Akun PPPoE (Lokal)</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Profil</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Tarif</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center">Jatuh Tempo</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center">Status</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                  {filteredCustomers.map((c) => {
                    const isPassVisible = visiblePasswords[c.id] || false;

                    return (
                      <tr 
                        key={c.id} 
                        className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                      >
                        {/* Created At */}
                        <td className="px-4 py-3.5 text-xs text-center text-gray-600 dark:text-gray-300 font-medium">
                          {new Date(c.createdAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        {/* Name */}
                        <td className="px-4 py-3.5 text-xs font-bold text-gray-900 dark:text-white">
                          {c.name}
                        </td>
                        
                        {/* Address */}
                        <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-300 max-w-xs truncate" title={c.address || ""}>
                          {c.address || "-"}
                        </td>
                        
                        {/* WhatsApp */}
                        <td className="px-4 py-3.5 text-xs">
                          <a
                            href={`https://wa.me/${c.whatsapp.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
                          >
                            <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.332 4.977L2 22l5.188-1.358a9.901 9.901 0 004.819 1.341h.005c5.507 0 9.99-4.478 9.991-9.985A9.972 9.972 0 0012.012 2zm5.836 14.22c-.255.719-1.282 1.313-1.764 1.385-.483.072-.962.133-3.136-.757-2.78-1.139-4.577-3.957-4.717-4.143-.139-.186-1.133-1.503-1.133-2.868 0-1.365.719-2.036 1.002-2.316.282-.28.614-.35.819-.35.205 0 .41.002.59.011.187.009.437-.072.684.523.255.614.872 2.128.948 2.28.077.152.128.328.025.53-.102.203-.153.328-.306.507-.153.18-.323.4-.461.536-.153.153-.314.32-.136.626.18.305.8 1.312 1.716 2.128.918.814 1.692 1.066 2.001 1.196.307.13.486.109.667-.101.18-.21.776-.902.981-1.213.205-.31.41-.258.693-.152.282.106 1.792.846 2.1 1 .307.153.513.228.59.359.077.132.077.76-.178 1.479z"/>
                            </svg>
                            {c.whatsapp}
                          </a>
                        </td>
                        
                        {/* PPPoE Credentials */}
                        <td className="px-4 py-3.5 text-xs font-mono text-gray-800 dark:text-gray-300">
                          <div>User: <span className="font-bold">{c.pppoeUsername}</span></div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-gray-400">
                            Pass: {isPassVisible ? <span className="text-gray-700 dark:text-gray-300 font-bold">{c.pppoePassword}</span> : "••••••••"}
                            <button
                              onClick={() => togglePasswordVisibility(c.id)}
                              className="text-[10px] text-gray-500 hover:text-brand-500 font-sans cursor-pointer"
                            >
                              {isPassVisible ? "Sembunyikan" : "Lihat"}
                            </button>
                          </div>
                        </td>
                        
                        {/* Profile */}
                        <td className="px-4 py-3.5 text-xs">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {c.profile?.name || "Tidak ada"}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              {c.profile?.speed || ""}
                            </span>
                          </div>
                        </td>
                        
                        {/* Tariff */}
                        <td className="px-4 py-3.5 text-xs font-bold text-success-600 dark:text-success-400 text-right font-mono">
                          {formatIDR(c.monthlyFee)}
                        </td>
                        
                        {/* Due Day */}
                        <td className="px-4 py-3.5 text-xs text-center text-gray-600 dark:text-gray-300">
                          Tanggal <span className="font-bold">{c.dueDay}</span>
                        </td>
                        
                        {/* Status */}
                        <td className="px-4 py-3.5 text-xs text-center">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            c.isActive 
                              ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400" 
                              : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                          }`}>
                            {c.isActive ? "Aktif" : "Isolir / Off"}
                          </span>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-4 py-3.5 text-xs text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEditModal(c)}
                              className="text-gray-500 hover:text-brand-500 transition cursor-pointer"
                              title="Edit Pelanggan"
                            >
                              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            
                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="text-gray-500 hover:text-red-500 transition cursor-pointer"
                              title="Hapus Pelanggan"
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
                <tfoot>
                  <tr className="bg-gray-50/50 dark:bg-white/[0.01] border-t-2 border-gray-200 dark:border-gray-800">
                    <td colSpan={6} className="px-4 py-4 text-xs font-bold text-gray-900 dark:text-white text-right">
                      TOTAL TAGIHAN BULANAN:
                    </td>
                    <td className="px-4 py-4 text-xs font-bold text-success-600 dark:text-success-400 text-right font-mono">
                      {formatIDR(totalBillingFee)}
                    </td>
                    <td colSpan={3} className="px-4 py-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT CUSTOMER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-950 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {editingCustomer ? "Edit Pelanggan Bulanan" : "Tambah Pelanggan Bulanan Baru"}
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
              {/* Nama */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Contoh: Yusup Iskandar"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900"
                />
              </div>

              {/* No WhatsApp & Alamat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    No. WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="whatsapp"
                    required
                    placeholder="Contoh: 628123456789"
                    value={formData.whatsapp}
                    onChange={handleInputChange}
                    className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Tanggal Jatuh Tempo <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="dueDay"
                    value={formData.dueDay}
                    onChange={handleInputChange}
                    className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Setiap Tanggal {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Alamat */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Alamat Pemasangan</label>
                <textarea
                  name="address"
                  rows={2}
                  placeholder="Contoh: Jl. Mawar No. 4, RT 02/RW 03"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="rounded-lg border border-gray-200 bg-transparent p-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900"
                />
              </div>

              <div className="border-t border-dashed border-gray-100 my-1 dark:border-gray-800" />

              {/* PPPoE Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Username PPPoE (MikroTik) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pppoeUsername"
                    required
                    placeholder="Contoh: yusup-home"
                    value={formData.pppoeUsername}
                    onChange={handleInputChange}
                    className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Password PPPoE <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pppoePassword"
                    required
                    placeholder="Contoh: pass123"
                    value={formData.pppoePassword}
                    onChange={handleInputChange}
                    className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900"
                  />
                </div>
              </div>

              {/* Profile & Tarif */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Pilihan Paket Speed <span className="text-red-500">*</span>
                  </label>
                  {profiles.length === 0 ? (
                    <div className="text-xs text-amber-600 dark:text-amber-400 py-2">
                      Belum ada paket. Silakan buat di menu Master Data.
                    </div>
                  ) : (
                    <select
                      name="profileId"
                      required
                      value={formData.profileId}
                      onChange={handleInputChange}
                      className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white dark:bg-gray-900 cursor-pointer"
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.speed})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Tarif Bulanan (Terisi Otomatis)
                  </label>
                  <div className="h-9 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50 px-3 flex items-center text-xs font-bold text-success-600 dark:text-success-400 font-mono">
                    {(() => {
                      const selected = profiles.find((p) => String(p.id) === formData.profileId);
                      return selected ? formatIDR(selected.price) : "Pilih paket";
                    })()}
                  </div>
                </div>
              </div>

              {/* Status Keaktifan Checkbox */}
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
                />
                <label htmlFor="isActive" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  Akun internet berstatus aktif (Lokal)
                </label>
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
                  {editingCustomer ? "Simpan Perubahan" : "Tambah Pelanggan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
