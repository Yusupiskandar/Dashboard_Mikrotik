import React from "react";

interface Transaction {
  id: number;
  type: string;
  category: string;
  amount: number;
  description: string;
  date: Date;
  invoiceId: number | null;
}

interface RecentTransactionsProps {
  recentTransactions: Transaction[];
}

export default function RecentTransactions({
  recentTransactions,
}: RecentTransactionsProps) {
  // Format Currency
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getCategoryLabel = (name: string) => {
    const defaultLabels: Record<string, string> = {
      TAGIHAN_BULANAN: "Tagihan Bulanan",
      PENDAPATAN_LAIN: "Pendapatan Lain-lain",
      BANDWIDTH_ISP: "Bandwidth ISP",
      PEMBELIAN_ALAT: "Pembelian Alat",
      OPERASIONAL: "Operasional & Transport",
      GAJI_STAFF: "Gaji Staff/Teknisi",
      PENGELUARAN_LAIN: "Pengeluaran Lainnya",
    };
    return defaultLabels[name] || name.replace(/_/g, " ");
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Aktivitas Kas Terbaru
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Daftar 5 catatan arus kas masuk & keluar terakhir
          </p>
        </div>
      </div>

      {recentTransactions.length === 0 ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-xs font-semibold">
          Belum ada catatan aktivitas kas terdaftar.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-white/[0.01]">
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 w-24">Tanggal</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center w-24">Aliran</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Kategori</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Keterangan</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right w-32">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
              {recentTransactions.map((tx) => {
                const isIncome = tx.type === "INCOME";

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                  >
                    {/* Date */}
                    <td className="px-3 py-2.5 text-xs font-mono text-gray-600 dark:text-gray-400">
                      {new Date(tx.date).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>

                    {/* Type Badge */}
                    <td className="px-3 py-2.5 text-xs text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[8px] font-bold ${
                        isIncome
                          ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                          : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                      }`}>
                        {isIncome ? "Masuk" : "Keluar"}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-2.5 text-xs font-bold text-gray-900 dark:text-white">
                      {getCategoryLabel(tx.category)}
                    </td>

                    {/* Description */}
                    <td className="px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300 font-medium truncate max-w-xs">
                      {tx.description}
                    </td>

                    {/* Amount */}
                    <td className={`px-3 py-2.5 text-xs font-black text-right font-mono ${
                      isIncome ? "text-success-600 dark:text-success-400" : "text-red-500"
                    }`}>
                      {isIncome ? "+" : "-"}{formatIDR(tx.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
