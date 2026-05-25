"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

interface HotspotUser {
  id: string;
  name: string;
  profile: string;
  server: string;
  limit_uptime: string;
  limit_bytes: number;
  disabled: boolean;
  comment: string;
}

type SortKey = keyof HotspotUser;
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const COLUMNS: { key: SortKey; label: string; sortable: boolean }[] = [
  { key: "name",         label: "Username",     sortable: true  },
  { key: "profile",      label: "Profile",      sortable: true  },
  { key: "server",       label: "Server",       sortable: true  },
  { key: "limit_uptime", label: "Uptime Limit", sortable: true  },
  { key: "limit_bytes",  label: "Data Limit",   sortable: true  },
  { key: "disabled",     label: "Status",       sortable: true  },
  { key: "comment",      label: "Comment",      sortable: true  },
];

/** Format bytes into human readable format */
function formatBytes(bytes: number) {
  if (bytes === 0) return "-";
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

export default function HotspotUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<HotspotUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchUsers = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch("/api/mikrotik/hotspot/users");
      if (res.status === 401) {
        router.replace("/connect");
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Gagal mengambil daftar user hotspot");
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
    fetchUsers();
  }, [fetchUsers]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  // Summary Metrics (always calculated on full set)
  const metrics = useMemo(() => {
    const total = users.length;
    const enabled = users.filter((u) => !u.disabled).length;
    const disabled = users.filter((u) => u.disabled).length;
    return { total, enabled, disabled };
  }, [users]);

  // 1. Search Filter + Status Dropdown Filter
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    
    return users.filter((u) => {
      // Status Filter
      if (statusFilter === "enabled" && u.disabled) return false;
      if (statusFilter === "disabled" && !u.disabled) return false;

      // Text Search
      if (!q) return true;
      return (
        String(u.name ?? "").toLowerCase().includes(q) ||
        String(u.profile ?? "").toLowerCase().includes(q) ||
        String(u.server ?? "").toLowerCase().includes(q) ||
        String(u.comment ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, search, statusFilter]);

  // 2. Sorting
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];

      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();

      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortKey, sortDir]);

  // 3. Pagination
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedUsers = sortedUsers.slice(startIdx, startIdx + pageSize);

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      const s = Math.max(2, safePage - 1);
      const e = Math.min(totalPages - 1, safePage + 1);
      for (let i = s; i <= e; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageBreadcrumb pageTitle="User Hotspot Registry" />
        <button
          onClick={() => fetchUsers()}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.04] self-end sm:self-auto"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh Akun
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        {/* Total Users */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Total Akun Terdaftar</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">
            {metrics.total} <span className="text-xs font-normal text-gray-400">akun</span>
          </p>
        </div>

        {/* Enabled Users */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Akun Aktif (Enabled)</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">
            {metrics.enabled} <span className="text-xs font-normal text-gray-400">akun</span>
          </p>
        </div>

        {/* Disabled Users */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">Akun Nonaktif (Disabled)</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">
            {metrics.disabled} <span className="text-xs font-normal text-gray-400">akun</span>
          </p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        {/* Table Filters Header */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">
              Daftar Semua Akun Hotspot
            </h3>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              Menampilkan {sortedUsers.length} akun
              {statusFilter !== "all" || search ? ` (dari ${users.length} total)` : ""}
              {lastUpdated && ` · Diperbarui ${lastUpdated}`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="h-9 rounded-lg border border-gray-200 bg-transparent px-3 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-900"
            >
              <option value="all">Semua Status</option>
              <option value="enabled">Hanya Enabled</option>
              <option value="disabled">Hanya Disabled</option>
            </select>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
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
                placeholder="Cari username, profile, comment..."
                className="h-9 w-full rounded-lg border border-gray-200 bg-transparent pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Memuat data user hotspot...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-error-100 bg-error-50 p-6 text-center dark:border-error-500/20 dark:bg-error-500/5">
            <p className="text-sm font-medium text-error-800 dark:text-error-400 mb-2">{error}</p>
            <button
              onClick={() => fetchUsers()}
              className="rounded-lg bg-error-600 px-4 py-2 text-xs font-semibold text-white hover:bg-error-700 transition"
            >
              Coba Lagi
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada user hotspot yang terdaftar di router</p>
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
                  {paginatedUsers.map((uRow, idx) => (
                    <tr
                      key={uRow.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      <td className="py-3 pr-3 text-xs text-gray-400 dark:text-gray-600">
                        {startIdx + idx + 1}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gray-800 dark:text-white">
                        {uRow.name}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                          {uRow.profile}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 text-xs">
                        {uRow.server}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300 font-mono text-xs">
                        {uRow.limit_uptime !== "0" && uRow.limit_uptime !== "00:00:00" ? uRow.limit_uptime : "-"}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {formatBytes(uRow.limit_bytes)}
                      </td>
                      <td className="py-3 pr-4">
                        {uRow.disabled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/5 dark:text-gray-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
                            Disabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Enabled
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 text-xs max-w-[150px] truncate" title={uRow.comment}>
                        {uRow.comment || "-"}
                      </td>
                      <td className="py-3 text-right pr-2">
                        {/* Placeholder action for MVP, visually complete */}
                        <div className="flex justify-end gap-1.5">
                          <button
                            title="Edit Akun (Segera Hadir)"
                            className="p-1 text-gray-400 hover:text-brand-500 dark:text-gray-600 dark:hover:text-brand-400 cursor-not-allowed opacity-50"
                            disabled
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            title="Hapus Akun (Segera Hadir)"
                            className="p-1 text-gray-400 hover:text-error-500 dark:text-gray-600 dark:hover:text-error-400 cursor-not-allowed opacity-50"
                            disabled
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    </div>
  );
}
