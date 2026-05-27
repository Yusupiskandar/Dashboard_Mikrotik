import React from "react";

interface DashboardKPIsProps {
  activeCustomersCount: number;
  monthlyIncome: number;
  monthlyExpense: number;
  paymentRate: number;
}

export default function DashboardKPIs({
  activeCustomersCount,
  monthlyIncome,
  monthlyExpense,
  paymentRate,
}: DashboardKPIsProps) {
  // Format Currency
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {/* KPI 1: Active Customers */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col gap-1 border-l-4 border-l-brand-500">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Pelanggan Aktif</span>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white font-mono">
          {activeCustomersCount} <span className="text-xs font-normal text-gray-400">User</span>
        </h2>
        <span className="text-[10px] text-gray-400">Total pelanggan bulanan aktif PPPoE</span>
      </div>

      {/* KPI 2: Monthly Income */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col gap-1 border-l-4 border-l-success-500">
        <span className="text-xs font-semibold text-success-600 dark:text-success-400">Pendapatan Bulan Ini</span>
        <h2 className="text-2xl font-black text-success-600 dark:text-success-400 font-mono">
          {formatIDR(monthlyIncome)}
        </h2>
        <span className="text-[10px] text-gray-400">Akumulasi uang masuk bulan ini</span>
      </div>

      {/* KPI 3: Monthly Expense */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col gap-1 border-l-4 border-l-red-500">
        <span className="text-xs font-semibold text-red-500">Pengeluaran Bulan Ini</span>
        <h2 className="text-2xl font-black text-red-500 font-mono">
          {formatIDR(monthlyExpense)}
        </h2>
        <span className="text-[10px] text-gray-400">Total biaya operasional & ISP bulan ini</span>
      </div>

      {/* KPI 4: Payment Rate */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Rasio Penagihan</span>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white font-mono">
          {paymentRate}%
        </h2>
        {/* Progress Bar */}
        <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mt-1">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${paymentRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}
