"use client";

import React from "react";

interface RouterInfoProps {
  router: {
    identity: string;
    version: string;
    uptime: string;
    board_name: string;
    cpu_load: number;
    free_memory: number;
    total_memory: number;
  };
}

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function RouterInfoCard({ router }: RouterInfoProps) {
  const memoryUsed = router.total_memory - router.free_memory;
  const memoryPercent = router.total_memory
    ? Math.round((memoryUsed / router.total_memory) * 100)
    : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
          <svg
            className="h-5 w-5 text-brand-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
            />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">
          Router Information
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <InfoRow label="Identity" value={router.identity} />
        <InfoRow label="RouterOS Version" value={router.version} />
        <InfoRow label="Uptime" value={router.uptime} />
        <InfoRow label="Board / Model" value={router.board_name} />
      </div>

      {/* CPU Load Bar */}
      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">CPU Load</span>
          <span className="font-medium text-gray-700 dark:text-white">
            {router.cpu_load}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={`h-2 rounded-full transition-all ${
              router.cpu_load > 80
                ? "bg-error-500"
                : router.cpu_load > 50
                ? "bg-warning-500"
                : "bg-success-500"
            }`}
            style={{ width: `${router.cpu_load}%` }}
          />
        </div>
      </div>

      {/* Memory Bar */}
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            Memory Usage
          </span>
          <span className="font-medium text-gray-700 dark:text-white">
            {formatBytes(memoryUsed)} / {formatBytes(router.total_memory)} ({memoryPercent}%)
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={`h-2 rounded-full transition-all ${
              memoryPercent > 80
                ? "bg-error-500"
                : memoryPercent > 50
                ? "bg-warning-500"
                : "bg-brand-500"
            }`}
            style={{ width: `${memoryPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-white">
        {value || (
          <span className="text-gray-400 dark:text-gray-600">Unavailable</span>
        )}
      </p>
    </div>
  );
}
