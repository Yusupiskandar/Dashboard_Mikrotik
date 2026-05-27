import { NextResponse } from "next/server";
import db from "@/lib/db";

// GET /api/mikrotik/billing/categories
// Mengambil semua kategori transaksi. Melakukan auto-seeding jika tabel kosong.
export async function GET() {
  try {
    // 1. Cek apakah ada data di tabel. Jika kosong, lakukan seeding otomatis.
    const count = await db.transactionCategory.count();
    if (count === 0) {
      const defaultCategories = [
        { name: "TAGIHAN_BULANAN", type: "INCOME", isSystem: true },
        { name: "PENDAPATAN_LAIN", type: "INCOME", isSystem: false },
        { name: "BANDWIDTH_ISP", type: "EXPENSE", isSystem: false },
        { name: "PEMBELIAN_ALAT", type: "EXPENSE", isSystem: false },
        { name: "OPERASIONAL", type: "EXPENSE", isSystem: false },
        { name: "GAJI_STAFF", type: "EXPENSE", isSystem: false },
        { name: "PENGELUARAN_LAIN", type: "EXPENSE", isSystem: false },
      ];

      await db.transactionCategory.createMany({
        data: defaultCategories,
      });
    }

    // 2. Ambil seluruh kategori terdaftar
    const categories = await db.transactionCategory.findMany({
      orderBy: [
        { type: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat master data kategori" },
      { status: 500 }
    );
  }
}

// POST /api/mikrotik/billing/categories
// Membuat kategori transaksi manual baru
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type } = body;

    // Validasi input
    if (!name || !type) {
      return NextResponse.json(
        { success: false, message: "Kolom nama kategori dan jenis kas wajib diisi." },
        { status: 400 }
      );
    }

    if (type !== "INCOME" && type !== "EXPENSE") {
      return NextResponse.json(
        { success: false, message: "Jenis kas harus 'INCOME' atau 'EXPENSE'." },
        { status: 400 }
      );
    }

    const cleanName = String(name).trim();
    if (!cleanName) {
      return NextResponse.json(
        { success: false, message: "Nama kategori tidak boleh kosong." },
        { status: 400 }
      );
    }

    // Cek duplikasi nama kategori
    const existing = await db.transactionCategory.findFirst({
      where: {
        name: {
          equals: cleanName,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `Kategori '${cleanName}' sudah terdaftar dalam database.` },
        { status: 400 }
      );
    }

    // Buat kategori baru
    const newCategory = await db.transactionCategory.create({
      data: {
        name: cleanName,
        type,
        isSystem: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: newCategory,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal membuat kategori baru" },
      { status: 500 }
    );
  }
}
