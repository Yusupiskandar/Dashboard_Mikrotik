"use client";

import React, { useState, useMemo } from "react";

interface ActivityUser {
  user: string;
  address: string;
  uptime: string;
  server: string;
  mac_address: string;
}

interface RecentActivityTableProps {
  data: ActivityUser[];
}

type SortKey = keyof ActivityUser;
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "user",        label: "User"        },
  { key: "address",     label: "IP Address"  },
  { key: "mac_address", label: "MAC Address" },
  { key: "uptime",      label: "Uptime"      },
  { key: "server",      label: "Server"      },
];

/** Sort icon component */
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

export default function RecentActivityTable({ data }: RecentActivityTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState(10);
  const [search, setSearch]           = useState("");
  const [sortKey, setSortKey]         = useState<SortKey>("user");
  const [sortDir, setSortDir]         = useState<SortDir>("asc");

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
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return data;
    return data.filter((row) =>
      String(row.user        ?? "").toLowerCase().includes(q) ||
      String(row.address     ?? "").toLowerCase().includes(q) ||
      String(row.mac_address ?? "").toLowerCase().includes(q) ||
      String(row.server      ?? "").toLowerCase().includes(q) ||
      String(row.uptime      ?? "").toLowerCase().includes(q)
    );
  }, [data, search]);

  // 2. Sort alphabetically
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = String(a[sortKey] ?? "").toLowerCase();
      const vb = String(b[sortKey] ?? "").toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  // 3. Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage   = Math.min(currentPage, totalPages);
  const start      = (safePage - 1) * pageSize;
  const paginated  = sorted.slice(start, start + pageSize);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handlePageSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">

      {/* ── Header ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">
            Active Hotspot Sessions
          </h3>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            {sorted.length} user{sorted.length !== 1 ? "s" : ""} aktif
            {search && ` (dari ${data.length} total)`}
            {" · "}
            <span className="font-medium text-gray-500 dark:text-gray-400">
              Urutkan: {COLUMNS.find((c) => c.key === sortKey)?.label}{" "}
              {sortDir === "asc" ? "A→Z" : "Z→A"}
            </span>
          </p>
        </div>

        {/* Search */}
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
            onChange={handleSearch}
            placeholder="Cari user, IP, MAC..."
            className="h-9 w-full rounded-lg border border-gray-200 bg-transparent pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
        </div>
      </div>

      {/* ── Empty / no-results states ── */}
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <svg className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-400 dark:text-gray-500">No recent activity yet</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <svg className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Tidak ada hasil untuk &ldquo;
            <span className="font-medium text-gray-600 dark:text-gray-300">{search}</span>
            &rdquo;
          </p>
        </div>
      ) : (
        <>
          {/* ── Table ── */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {/* Row number — not sortable */}
                  <th className="pb-3 pr-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500">
                    #
                  </th>

                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="pb-3 pr-4 text-left"
                    >
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
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {paginated.map((row, idx) => (
                  <tr
                    key={idx}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <td className="py-3 pr-3 text-xs text-gray-400 dark:text-gray-600">
                      {start + idx + 1}
                    </td>
                    <td className="py-3 pr-4 font-medium text-gray-800 dark:text-white">
                      {row.user}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {row.address}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {row.mac_address}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                      {row.uptime}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        {row.server}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination footer ── */}
          <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row dark:border-gray-800">
            {/* Rows per page */}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Tampilkan</span>
              <select
                value={pageSize}
                onChange={handlePageSize}
                className="rounded-md border border-gray-200 bg-transparent px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-gray-300"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span>
                baris · {start + 1}–{Math.min(start + pageSize, sorted.length)} dari{" "}
                <span className="font-medium text-gray-700 dark:text-gray-200">{sorted.length}</span>
              </span>
            </div>

            {/* Page buttons */}
            <div className="flex items-center gap-1">
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
  );
}
