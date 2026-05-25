"use client";

import React from "react";

interface StatsCardsProps {
  stats: {
    hotspot_active_users: number;
    total_hotspot_users: number;
    ppp_active_users: number;
    active_sessions: number;
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Hotspot Active Users",
      value: stats.hotspot_active_users,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      color: "brand",
    },
    {
      label: "Total Hotspot Users",
      value: stats.total_hotspot_users,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      color: "success",
    },
    {
      label: "PPP Active Users",
      value: stats.ppp_active_users,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      color: "warning",
    },
    {
      label: "Active Sessions",
      value: stats.active_sessions,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      color: "error",
    },
  ];

  const colorMap: Record<string, string> = {
    brand: "bg-brand-50 text-brand-500 dark:bg-brand-500/10",
    success: "bg-success-50 text-success-500 dark:bg-success-500/10",
    warning: "bg-warning-50 text-warning-500 dark:bg-warning-500/10",
    error: "bg-error-50 text-error-500 dark:bg-error-500/10",
  };

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${colorMap[card.color]}`}
          >
            {card.icon}
          </div>
          <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">
            {card.label}
          </p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
