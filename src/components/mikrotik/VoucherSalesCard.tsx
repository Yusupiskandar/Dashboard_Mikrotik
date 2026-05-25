"use client";

import React from "react";

interface VoucherSalesCardProps {
  stats: {
    vouchers_sold_this_month: number;
    vouchers_sold_today: number;
    estimated_revenue: number;
    voucher_target: number;
  };
}

export default function VoucherSalesCard({ stats }: VoucherSalesCardProps) {
  // Format currency
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6 flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              {/* Ticket / Voucher Icon */}
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                Voucher Terjual
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">Bulan Ini</p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-600 dark:bg-success-500/10 dark:text-success-400">
            Live
          </span>
        </div>

        {/* Large Metric */}
        <div className="mb-6">
          <span className="text-5xl font-black tracking-tight text-gray-900 dark:text-white">
            {stats.vouchers_sold_this_month}
          </span>
          <span className="ml-2 text-sm text-gray-400 dark:text-gray-500">voucher</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 dark:border-gray-800">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Hari Ini</p>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-gray-800 dark:text-white">
                +{stats.vouchers_sold_today}
              </span>
              <span className="inline-flex items-center text-[10px] font-medium text-success-600 bg-success-50 dark:bg-success-500/10 dark:text-success-400 px-1 rounded">
                Active
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Total Pendapatan</p>
            <p className="text-base font-bold text-success-600 dark:text-success-400 truncate">
              {formatIDR(stats.estimated_revenue)}
            </p>
          </div>
        </div>
      </div>

      {/* Decorative Tips/Alert info */}
      <div className="mt-6 rounded-xl bg-brand-50/50 p-3 text-xs text-brand-700 dark:bg-brand-500/5 dark:text-brand-300 border border-brand-100/30 dark:border-brand-500/10">
        <div className="flex gap-2">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>Total pendapatan riil yang diperoleh dari akumulasi harga voucher hotspot yang terjual bulan ini.</p>
        </div>
      </div>
    </div>
  );
}
