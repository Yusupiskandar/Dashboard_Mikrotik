"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface QuickActionsProps {
  onDisconnect: () => void;
}

export default function QuickActions({ onDisconnect }: QuickActionsProps) {
  const router = useRouter();

  const actions = [
    {
      label: "Hotspot Users",
      description: "Manage hotspot accounts",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      color: "brand",
      onClick: () => router.push("/mikrotik/hotspot"),
    },
    {
      label: "Active Sessions",
      description: "View live connections",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      color: "success",
      onClick: () => router.push("/mikrotik/sessions"),
    },
    {
      label: "Generate Voucher",
      description: "Create access vouchers",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
          />
        </svg>
      ),
      color: "warning",
      onClick: () => router.push("/mikrotik/vouchers"),
    },
    {
      label: "Router Info",
      description: "System details",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
          />
        </svg>
      ),
      color: "gray",
      onClick: () => {},
    },
    {
      label: "Disconnect",
      description: "End router session",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      ),
      color: "error",
      onClick: onDisconnect,
    },
  ];

  const colorMap: Record<string, string> = {
    brand: "bg-brand-50 text-brand-500 dark:bg-brand-500/10 group-hover:bg-brand-100 dark:group-hover:bg-brand-500/20",
    success: "bg-success-50 text-success-500 dark:bg-success-500/10 group-hover:bg-success-100 dark:group-hover:bg-success-500/20",
    warning: "bg-warning-50 text-warning-500 dark:bg-warning-500/10 group-hover:bg-warning-100 dark:group-hover:bg-warning-500/20",
    error: "bg-error-50 text-error-500 dark:bg-error-500/10 group-hover:bg-error-100 dark:group-hover:bg-error-500/20",
    gray: "bg-gray-50 text-gray-500 dark:bg-gray-500/10 group-hover:bg-gray-100 dark:group-hover:bg-gray-500/20",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h3 className="mb-5 text-base font-semibold text-gray-800 dark:text-white">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 lg:grid-cols-1">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="group flex items-center gap-4 rounded-xl border border-gray-100 p-4 text-left transition-all hover:border-gray-200 hover:shadow-sm dark:border-gray-800 dark:hover:border-gray-700"
          >
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${colorMap[action.color]}`}
            >
              {action.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                {action.label}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {action.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
