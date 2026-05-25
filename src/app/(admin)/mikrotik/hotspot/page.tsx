"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

interface HotspotActiveUser {
  id: string;
  user: string;
  address: string;
  mac_address: string;
  uptime: string;
  server: string;
  login_by: string;
  bytes_in: number;
  bytes_out: number;
}

type SortKey = keyof HotspotActiveUser | "traffic";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const COLUMNS: { key: SortKey; label: string; sortable: boolean }[] = [
  { key: "user",        label: "Username",     sortable: true  },
  { key: "address",     label: "IP Address",   sortable: true  },
  { key: "mac_address", label: "MAC Address",  sortable: true  },
  { key: "uptime",      label: "Uptime",       sortable: true  },
  { key: "server",      label: "Server",       sortable: true  },
  { key: "login_by",    label: "Login Method", sortable: true  },
  { key: "traffic",     label: "Traffic (I/O)",sortable: true  },
];

/** Format bytes into human readable format */
function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/** Sort panah indicator */
function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="ml-1 inline-flex flex-col gap-[2px]">
      <svg
        className={`h-2.5 w-2.5 transition-colors ${active && dir === "asc" ? "text-brand-500" : "text-gray-300 dark:text-gray-600"}`}
        viewBox="0 0 10 6" fill="currentColor"
      >
        <path d="M5 0L10 6H0L5 0Z" />
      </svg>
      <svg
        className={`h-2.5 w-2.5 transition-colors ${active && dir === "desc" ? "text-brand-500" : "text-gray-300 dark:text-gray-600"}`}
        viewBox="0 0 10 6" fill="currentColor"
      >
        <path d="M5 6L0 0H10L5 6Z" />
      </svg>
    </span>
  );
}

export default function UserHotspotPage() {
  const router = useRouter();
  const [users, setUsers] = useState<HotspotActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI Controls
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("user");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Modal State
  const [targetUser, setTargetUser] = useState<HotspotActiveUser | null>(null);
  const [killingId, setKillingId] = useState<string | null>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchActiveUsers = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch("/api/mikrotik/hotspot/users/active");
      if (res.status === 401) {
        router.replace("/connect");
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Gagal mengambil daftar user hotspot aktif");
      } else {
        setUsers(json.data);
        setError(null);
        const now = new Date();
        setLastUpdated(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
    } catch {
      setError("Kesalahan jaringan. Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchActiveUsers();
    // Auto-refresh every 20 seconds
    const interval = setInterval(() => fetchActiveUsers(true), 20_000);
    return () => clearInterval(interval);
  }, [fetchActiveUsers]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  // 1. Filter
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      String(u.user ?? "").toLowerCase().includes(q) ||
      String(u.address ?? "").toLowerCase().includes(q) ||
      String(u.mac_address ?? "").toLowerCase().includes(q) ||
      String(u.server ?? "").toLowerCase().includes(q) ||
      String(u.login_by ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  // 2. Sort
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let va: any;
      let vb: any;

      if (sortKey === "traffic") {
        va = a.bytes_in + a.bytes_out;
        vb = b.bytes_in + b.bytes_out;
      } else {
        va = String(a[sortKey] ?? "").toLowerCase();
        vb = String(b[sortKey] ?? "").toLowerCase();
        
        // Handle IP sorting numerically
        if (sortKey === "address") {
          const partsA = va.split(".").map(Number);
          const partsB = vb.split(".").map(Number);
          for (let i = 0; i < 4; i++) {
            if (partsA[i] !== partsB[i]) {
              return sortDir === "asc" ? partsA[i] - partsB[i] : partsB[i] - partsA[i];
            }
          }
          return 0;
        }
      }

      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortKey, sortDir]);

  // 3. Paginate
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedUsers = sortedUsers.slice(startIdx, startIdx + pageSize);

  // Bandwidth calculation (Total bandwidth across all active users)
  const totalBandwidth = useMemo(() => {
    return users.reduce((sum, u) => sum + u.bytes_in + u.bytes_out, 0);
  }, [users]);

  const handleKillSession = async () => {
    if (!targetUser) return;
    setKillingId(targetUser.id);
    try {
      const res = await fetch("/api/mikrotik/hotspot/users/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: targetUser.id }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Sesi user "${targetUser.user}" berhasil diputus`, "success");
        setTargetUser(null);
        await fetchActiveUsers(true);
      } else {
        showToast(json.message || "Gagal memutus sesi user", "error");
      }
    } catch {
      showToast("Gagal memutus sesi user karena masalah jaringan", "error");
    } finally {
      setKillingId(null);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="relative flex flex-col gap-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed right-6 top-6 z-99999 flex items-center gap-3 rounded-xl p-4 shadow-xl border animate-slide-in-right ${
          toast.type === "success" 
            ? "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400" 
            : "bg-error-50 border-error-100 text-error-800 dark:bg-error-500/10 dark:border-error-500/20 dark:text-error-400"
        }`}>
          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
            toast.type === "success" 
              ? "bg-emerald-500 text-white" 
              : "bg-error-500 text-white"
          }`}>
            {toast.type === "success" ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">{toast.type === "success" ? "Berhasil" : "Gagal"}</p>
            <p className="text-xs opacity-90">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Page Title & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageBreadcrumb pageTitle="User Hotspot" />
        <button
          onClick={() => fetchActiveUsers()}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.04] self-end sm:self-auto"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh Sesi
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        {/* Active Hotspot User Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">User Hotspot Aktif</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">
            {users.length} <span className="text-xs font-normal text-gray-400">user</span>
          </p>
        </div>

        {/* Total Bandwidth Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-success-50 text-success-500 dark:bg-success-500/10">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </div>
          <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Total Akumulasi Trafik</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">
            {formatBytes(totalBandwidth)}
          </p>
        </div>

        {/* Last Refreshed Time Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-warning-50 text-warning-500 dark:bg-warning-500/10">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Pembaruan Terakhir</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">
            {lastUpdated || "--:--:--"}
          </p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">
              Hotspot Active Sessions
            </h3>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {sortedUsers.length} user aktif
              {search && ` (dari ${users.length} total)`}
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari username, IP, MAC..."
              className="h-9 w-full rounded-lg border border-gray-200 bg-transparent pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Memuat daftar user aktif...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-error-100 bg-error-50 p-6 text-center dark:border-error-500/20 dark:bg-error-500/5">
            <p className="text-sm font-medium text-error-800 dark:text-error-400 mb-2">{error}</p>
            <button
              onClick={() => fetchActiveUsers()}
              className="rounded-lg bg-error-600 px-4 py-2 text-xs font-semibold text-white hover:bg-error-700 transition"
            >
              Coba Lagi
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-gray-400 dark:text-gray-500">Tidak ada user hotspot aktif saat ini</p>
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Tidak ada hasil untuk &ldquo;<span className="font-medium text-gray-600 dark:text-gray-300">{search}</span>&rdquo;
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-3 pr-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500">#</th>
                    {COLUMNS.map((col) => (
                      <th key={col.key} className="pb-3 pr-4 text-left">
                        {col.sortable ? (
                          <button
                            onClick={() => handleSort(col.key)}
                            className={`flex items-center gap-0.5 text-xs font-medium transition-colors hover:text-brand-500 ${
                              sortKey === col.key
                                ? "text-brand-600 dark:text-brand-400"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                          >
                            {col.label}
                            <SortIcon active={sortKey === col.key} dir={sortDir} />
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{col.label}</span>
                        )}
                      </th>
                    ))}
                    <th className="pb-3 text-right text-xs font-medium text-gray-400 dark:text-gray-500 pr-2">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {paginatedUsers.map((userRow, idx) => (
                    <tr
                      key={userRow.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      <td className="py-3 pr-3 text-xs text-gray-400 dark:text-gray-600">
                        {startIdx + idx + 1}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gray-800 dark:text-white">
                        {userRow.user}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {userRow.address}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {userRow.mac_address}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                        {userRow.uptime}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                          {userRow.server}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 text-xs">
                        {userRow.login_by}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col text-xs gap-0.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                            {formatBytes(userRow.bytes_in)}
                          </span>
                          <span className="text-brand-600 dark:text-brand-400 font-mono flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            {formatBytes(userRow.bytes_out)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right pr-2">
                        <button
                          onClick={() => setTargetUser(userRow)}
                          className="inline-flex items-center gap-1 rounded-lg border border-error-100 bg-error-50 px-2.5 py-1.5 text-xs font-semibold text-error-600 transition hover:bg-error-100 hover:border-error-200 dark:border-error-800/30 dark:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/20"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                          Kill Sesi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row dark:border-gray-800">
              {/* Rows per page selector */}
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Tampilkan</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-md border border-gray-200 bg-transparent px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-gray-300"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span>
                  baris · {startIdx + 1}–{Math.min(startIdx + pageSize, sortedUsers.length)} dari{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-200">{sortedUsers.length}</span>
                </span>
              </div>

              {/* Page buttons navigation */}
              <div className="flex items-center gap-1">
                {/* Previous */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.04]"
                  aria-label="Previous page"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {getPageNumbers().map((pg, i) =>
                  pg === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span>
                  ) : (
                    <button
                      key={pg}
                      onClick={() => setCurrentPage(pg as number)}
                      className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg border px-2 text-xs font-medium transition ${
                        pg === safePage
                          ? "border-brand-500 bg-brand-500 text-white"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      {pg}
                    </button>
                  )
                )}

                {/* Next */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.04]"
                  aria-label="Next page"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Kill Session Modal */}
      {targetUser && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <div 
            onClick={() => setTargetUser(null)}
            className="absolute inset-0 bg-gray-400/30 backdrop-blur-md transition-opacity dark:bg-black/60"
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md transform rounded-3xl bg-white p-6 shadow-2xl transition-all dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            {/* Modal Header */}
            <div className="mb-4 flex items-start gap-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">
                  Konfirmasi Putus Sesi Hotspot
                </h4>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Apakah Anda yakin ingin memutuskan paksa koneksi user ini? Perangkat mereka akan langsung log out.
                </p>
              </div>
            </div>

            {/* Target Information Card */}
            <div className="mb-6 rounded-2xl bg-gray-50 p-4 text-xs dark:bg-white/[0.02] border border-gray-100 dark:border-gray-800 flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-gray-500">Username:</span>
                <span className="font-semibold text-gray-800 dark:text-white">{targetUser.user}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-gray-500">IP Address:</span>
                <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{targetUser.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-gray-500">MAC Address:</span>
                <span className="font-mono font-medium text-gray-500 dark:text-gray-400">{targetUser.mac_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-gray-500">Uptime:</span>
                <span className="text-gray-700 dark:text-gray-300">{targetUser.uptime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-gray-500">Hotspot Server:</span>
                <span className="text-gray-700 dark:text-gray-300">{targetUser.server}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTargetUser(null)}
                disabled={killingId !== null}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleKillSession}
                disabled={killingId !== null}
                className="flex items-center gap-1.5 rounded-xl bg-error-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-error-700 disabled:bg-error-500 disabled:cursor-not-allowed shadow-md shadow-error-500/20"
              >
                {killingId ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Memutus...
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Putuskan Sesi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
