import type { Metadata } from "next";
import React from "react";
import db from "@/lib/db";
import DashboardKPIs from "@/components/dashboard/DashboardKPIs";
import IncomeExpenseChart from "@/components/dashboard/IncomeExpenseChart";
import RecentTransactions from "@/components/dashboard/RecentTransactions";

export const metadata: Metadata = {
  title: "Dashboard Billing & Keuangan MikroTik",
  description: "Panel Administrasi Billing Pelanggan & Transaksi Kas MikroTik",
};

export default async function DashboardPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // 1. Total Pelanggan Aktif
  const activeCustomersCount = await db.customer.count({
    where: { isActive: true },
  });

  // 2. Transaksi Bulan Ini
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  const currentMonthTransactions = await db.transaction.findMany({
    where: {
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  let monthlyIncome = 0;
  let monthlyExpense = 0;
  currentMonthTransactions.forEach((tx) => {
    if (tx.type === "INCOME") monthlyIncome += tx.amount;
    else if (tx.type === "EXPENSE") monthlyExpense += tx.amount;
  });

  // 3. Rasio Pelunasan Tagihan Bulan Ini
  const totalInvoicesThisMonth = await db.invoice.count({
    where: { month: currentMonth, year: currentYear },
  });
  const paidInvoicesThisMonth = await db.invoice.count({
    where: { month: currentMonth, year: currentYear, status: "PAID" },
  });
  const paymentRate = totalInvoicesThisMonth > 0
    ? Math.round((paidInvoicesThisMonth / totalInvoicesThisMonth) * 100)
    : 0;

  // 4. Data Tahunan untuk Grafik (Jan - Des)
  const allTransactionsThisYear = await db.transaction.findMany({
    where: {
      date: {
        gte: new Date(currentYear, 0, 1),
        lte: new Date(currentYear, 11, 31, 23, 59, 59, 999),
      },
    },
  });

  const monthlyChartData = Array.from({ length: 12 }, (_, i) => ({
    income: 0,
    expense: 0,
  }));

  allTransactionsThisYear.forEach((tx) => {
    const m = new Date(tx.date).getMonth(); // 0-11
    if (m >= 0 && m < 12) {
      if (tx.type === "INCOME") {
        monthlyChartData[m].income += tx.amount;
      } else if (tx.type === "EXPENSE") {
        monthlyChartData[m].expense += tx.amount;
      }
    }
  });

  const incomeSeries = monthlyChartData.map((d) => d.income);
  const expenseSeries = monthlyChartData.map((d) => d.expense);

  // 5. Ambil 5 Transaksi Kas Terakhir
  const recentTransactions = await db.transaction.findMany({
    take: 5,
    orderBy: {
      date: "desc",
    },
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome & Title Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white Outfit">
          Dashboard Billing & Keuangan
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Selamat datang kembali di panel administrasi billing pelanggan MikroTik Anda.
        </p>
      </div>

      {/* KPI Cards */}
      <DashboardKPIs
        activeCustomersCount={activeCustomersCount}
        monthlyIncome={monthlyIncome}
        monthlyExpense={monthlyExpense}
        paymentRate={paymentRate}
      />

      {/* Main Grid: Chart & Recent Transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Income Chart */}
        <div className="lg:col-span-8 flex flex-col">
          <IncomeExpenseChart
            incomeSeries={incomeSeries}
            expenseSeries={expenseSeries}
            currentYear={currentYear}
          />
        </div>

        {/* Recent Actions */}
        <div className="lg:col-span-4 flex flex-col">
          <RecentTransactions recentTransactions={recentTransactions} />
        </div>
      </div>
    </div>
  );
}
