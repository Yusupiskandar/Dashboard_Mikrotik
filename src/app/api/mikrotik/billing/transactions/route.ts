import { NextResponse } from "next/server";
import db from "@/lib/db";

// GET /api/mikrotik/billing/transactions
// Mengambil seluruh transaksi kas berdasarkan kriteria pencarian dan filter rentang waktu
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || undefined; // "INCOME" atau "EXPENSE"
    const category = searchParams.get("category") || undefined;
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;
    const search = searchParams.get("search") || "";

    // Konfigurasi filter tanggal
    const dateFilter: any = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      dateFilter.gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // Bangun kueri dinamis untuk filter tabel
    const whereClause: any = {
      AND: [
        type && type !== "ALL" ? { type } : {},
        category && category !== "ALL" ? { category } : {},
        Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {},
        search ? {
          OR: [
            { description: { contains: search } },
            { category: { contains: search } },
          ]
        } : {},
      ]
    };

    // 1. Ambil transaksi yang terfilter
    const transactions = await db.transaction.findMany({
      where: whereClause,
      orderBy: {
        date: "desc",
      },
    });

    // 2. Ambil total KPI global / sesuai filter waktu & kategori saja (tidak terpengaruh tipe)
    // Agar widget ringkasan kas (Saldo, Uang Masuk, Uang Keluar) terhitung akurat sesuai range filter
    const kpiWhereClause: any = {
      AND: [
        category && category !== "ALL" ? { category } : {},
        Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {},
        search ? {
          OR: [
            { description: { contains: search } },
            { category: { contains: search } },
          ]
        } : {},
      ]
    };

    const allFilteredTransactions = await db.transaction.findMany({
      where: kpiWhereClause,
    });

    let totalIncome = 0;
    let totalExpense = 0;
    allFilteredTransactions.forEach((tx) => {
      if (tx.type === "INCOME") {
        totalIncome += tx.amount;
      } else if (tx.type === "EXPENSE") {
        totalExpense += tx.amount;
      }
    });

    const netBalance = totalIncome - totalExpense;

    return NextResponse.json({
      success: true,
      data: transactions,
      kpis: {
        totalIncome,
        totalExpense,
        netBalance,
        count: transactions.length,
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat data transaksi" },
      { status: 500 }
    );
  }
}

// POST /api/mikrotik/billing/transactions
// Membuat catatan transaksi kas manual baru (Uang Masuk / Keluar)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, category, amount, description, date } = body;

    // Validasi input wajib
    if (!type || !category || !amount || !description) {
      return NextResponse.json(
        { success: false, message: "Field tipe, kategori, nominal, dan keterangan wajib diisi." },
        { status: 400 }
      );
    }

    if (type !== "INCOME" && type !== "EXPENSE") {
      return NextResponse.json(
        { success: false, message: "Tipe transaksi tidak valid (harus INCOME atau EXPENSE)." },
        { status: 400 }
      );
    }

    const nominal = parseInt(String(amount), 10);
    if (isNaN(nominal) || nominal <= 0) {
      return NextResponse.json(
        { success: false, message: "Nominal jumlah dana transaksi tidak valid." },
        { status: 400 }
      );
    }

    // Catat transaksi kas
    const newTx = await db.transaction.create({
      data: {
        type,
        category,
        amount: nominal,
        description,
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Transaksi berhasil ditambahkan secara manual",
      data: newTx,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menambahkan data transaksi" },
      { status: 500 }
    );
  }
}
