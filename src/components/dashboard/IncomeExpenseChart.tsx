"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface IncomeExpenseChartProps {
  incomeSeries: number[];
  expenseSeries: number[];
  currentYear: number;
}

export default function IncomeExpenseChart({
  incomeSeries,
  expenseSeries,
  currentYear,
}: IncomeExpenseChartProps) {
  // Format Currency
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const options: ApexOptions = {
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontFamily: "Outfit",
      fontWeight: 600,
      fontSize: "12px",
    },
    colors: ["#12b76a", "#f04438"], // Hijau untuk Income, Merah untuk Expense
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 320,
      type: "area",
      toolbar: {
        show: false,
      },
    },
    stroke: {
      curve: "smooth",
      width: [3, 3],
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.05,
        stops: [0, 95, 100],
      },
    },
    markers: {
      size: 4,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: (val: number) => formatIDR(val),
      },
    },
    xaxis: {
      type: "category",
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "11px",
          colors: ["#6B7280"],
        },
        formatter: (val: number) => {
          if (val >= 1000000) return `${(val / 1000000).toFixed(1)} jt`;
          if (val >= 1000) return `${(val / 1000).toFixed(0)} rb`;
          return String(val);
        },
      },
    },
  };

  const series = [
    {
      name: "Uang Masuk (Income)",
      data: incomeSeries,
    },
    {
      name: "Uang Keluar (Expense)",
      data: expenseSeries,
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Grafik Arus Kas Bulanan
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Perbandingan total uang masuk dan keluar pada tahun {currentYear}
          </p>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar mt-2">
        <div className="min-w-[700px] xl:min-w-full">
          <ReactApexChart options={options} series={series} type="area" height={320} />
        </div>
      </div>
    </div>
  );
}
