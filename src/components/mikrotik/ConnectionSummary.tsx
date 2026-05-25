"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface ConnectionSummaryProps {
  connection: {
    host: string;
    port: number;
    username: string;
    use_ssl: boolean;
    login_time: string;
    status: string;
  };
}

export default function ConnectionSummary({ connection }: ConnectionSummaryProps) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = React.useState(false);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/mikrotik/disconnect", { method: "POST" });
      router.push("/connect");
    } catch {
      setDisconnecting(false);
    }
  };

  const loginTime = new Date(connection.login_time).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      {/* Success Alert */}
      <div className="mb-5 flex items-center justify-between rounded-xl bg-success-50 px-4 py-3 dark:bg-success-500/10">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success-500">
            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <div>
            <span className="mr-2 rounded-full bg-success-100 px-2.5 py-0.5 text-xs font-semibold text-success-800 dark:bg-success-500/20 dark:text-success-400">
              Connected
            </span>
            <span className="text-sm text-success-800 dark:text-success-400">
              Successfully connected to MikroTik router
            </span>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="flex items-center gap-1.5 rounded-lg border border-error-300 px-3 py-1.5 text-xs font-medium text-error-600 transition hover:bg-error-50 disabled:opacity-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
        >
          {disconnecting ? "Disconnecting..." : "Disconnect"}
        </button>
      </div>

      {/* Connection Details */}
      <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
        Connection Summary
      </h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <InfoItem label="Host / IP" value={connection.host} />
        <InfoItem label="Port" value={String(connection.port)} />
        <InfoItem label="Username" value={connection.username} />
        <InfoItem label="Login Time" value={loginTime} />
        <InfoItem label="SSL / TLS" value={connection.use_ssl ? "Enabled" : "Disabled"} />
        <InfoItem
          label="Status"
          value={connection.status}
          highlight={connection.status === "connected" ? "success" : "error"}
        />
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "success" | "error";
}) {
  return (
    <div>
      <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">{label}</p>
      {highlight ? (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
            highlight === "success"
              ? "bg-success-100 text-success-800 dark:bg-success-500/20 dark:text-success-400"
              : "bg-error-100 text-error-800 dark:bg-error-500/20 dark:text-error-400"
          }`}
        >
          {value}
        </span>
      ) : (
        <p className="text-sm font-medium text-gray-800 dark:text-white">{value}</p>
      )}
    </div>
  );
}
