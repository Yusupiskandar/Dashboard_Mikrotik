import { NextResponse } from "next/server";
import db from "@/lib/db";

// PATCH /api/mikrotik/billing/categories/[id]
// Memperbarui nama kategori manual (menolak jika kategori sistem bawaan)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "ID kategori tidak valid" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Nama kategori wajib diisi." },
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

    const existingCategory = await db.transactionCategory.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, message: "Kategori tidak ditemukan" },
        { status: 404 }
      );
    }

    // Proteksi kategori sistem
    if (existingCategory.isSystem) {
      return NextResponse.json(
        { success: false, message: "Kategori bawaan sistem tidak dapat diubah namanya." },
        { status: 403 }
      );
    }

    // Cek duplikasi dengan kategori lain
    const duplicate = await db.transactionCategory.findFirst({
      where: {
        name: cleanName,
        id: { not: id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: `Kategori dengan nama '${cleanName}' sudah terdaftar.` },
        { status: 400 }
      );
    }

    // Jika kategori yang diubah sedang dipakai oleh data transaksi,
    // kita juga harus memperbarui seluruh kolom `category` pada tabel `Transaction` terkait!
    // Ini demi menjaga sinkronisasi data teks.
    const updatedCategory = await db.$transaction(async (tx) => {
      // 1. Update nama kategori di Master Data
      const cat = await tx.transactionCategory.update({
        where: { id },
        data: { name: cleanName },
      });

      // 2. Cascade update nama kategori pada riwayat transaksi
      await tx.transaction.updateMany({
        where: { category: existingCategory.name },
        data: { category: cleanName },
      });

      return cat;
    });

    return NextResponse.json({
      success: true,
      data: updatedCategory,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui kategori" },
      { status: 500 }
    );
  }
}

// DELETE /api/mikrotik/billing/categories/[id]
// Menghapus kategori manual (menolak jika kategori sistem bawaan atau sedang terpakai)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "ID kategori tidak valid" },
        { status: 400 }
      );
    }

    const existingCategory = await db.transactionCategory.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, message: "Kategori tidak ditemukan" },
        { status: 404 }
      );
    }

    // Proteksi kategori sistem
    if (existingCategory.isSystem) {
      return NextResponse.json(
        { success: false, message: "Kategori bawaan sistem tidak dapat dihapus." },
        { status: 403 }
      );
    }

    // Proteksi Integritas Relasi: pastikan kategori tidak sedang dipakai oleh data transaksi manapun
    const usedInTx = await db.transaction.findFirst({
      where: {
        category: existingCategory.name,
      },
    });

    if (usedInTx) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Kategori '${existingCategory.name}' tidak dapat dihapus karena masih digunakan dalam riwayat transaksi kas.` 
        },
        { status: 400 }
      );
    }

    // Hapus kategori
    await db.transactionCategory.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Kategori transaksi berhasil dihapus",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus kategori" },
      { status: 500 }
    );
  }
}
