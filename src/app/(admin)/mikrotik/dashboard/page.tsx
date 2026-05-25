"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ConnectionSummary from "@/components/mikrotik/ConnectionSummary";
import RouterInfoCard from "@/components/mikrotik/RouterInfoCard";
import StatsCards from "@/components/mikrotik/StatsCards";
import VoucherSalesCard from "@/components/mikrotik/VoucherSalesCard";
import RecentActivityTable from "@/components/mikrotik/RecentActivityTable";

interface DashboardData {
  connection: {
    host: string;
    port: number;
    username: string;
    use_ssl: boolean;
    login_time: string;
    status: string;
  };
  router: {
    identity: string;
    version: string;
    uptime: string;
    board_name: string;
    cpu_load: number;
    free_memory: number;
    total_memory: number;
  };
  stats: {
    hotspot_active_users: number;
    total_hotspot_users: number;
    ppp_active_users: number;
    active_sessions: number;
    vouchers_sold_this_month: number;
    vouchers_sold_today: number;
    estimated_revenue: number;
    voucher_target: number;
  };
  recent_activity: Array<{
    user: string;
    address: string;
    uptime: string;
    server: string;
    mac_address: string;
  }>;
}

export default function MikrotikDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/mikrotik/dashboard");
      if (res.status === 401) {
        // No valid session → redirect to Connect page
        router.replace("/connect");
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Failed to load dashboard data.");
      } else {
        setData(json);
        setError(null);
      }
    } catch {
      setError("Network error. Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboard, 30_000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const handleDisconnect = async () => {
    await fetch("/api/mikrotik/disconnect", { method: "POST" });
    router.push("/connect");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading router data...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="rounded-xl bg-error-50 p-6 text-center dark:bg-error-500/10">
          <p className="mb-4 text-sm font-medium text-error-800 dark:text-error-400">
            {error || "Unable to load dashboard."}
          </p>
          <button
            onClick={() => router.push("/connect")}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Back to Connect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">
            Dashboard
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="inline-block h-2 w-2 rounded-full bg-success-500 shadow shadow-success-500/50" />
            Connected to MikroTik Router ·{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {data.router.identity}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.04]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-2 text-sm font-medium text-error-600 transition hover:bg-error-100 hover:border-error-300 dark:border-error-800/30 dark:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Disconnect
          </button>
        </div>
      </div>

      {/* Row 1: Connection Summary + Router Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ConnectionSummary connection={data.connection} />
        <RouterInfoCard router={data.router} />
      </div>

      {/* Row 2: Stats Cards */}
      <StatsCards stats={data.stats} />

      {/* Row 3: Voucher Sales Card + Recent Activity Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[290px_1fr]">
        <VoucherSalesCard stats={data.stats} />
        <RecentActivityTable data={data.recent_activity} />
      </div>
    </div>
  );
}
