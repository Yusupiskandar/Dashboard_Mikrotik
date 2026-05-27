import { NextResponse } from "next/server";
import db from "@/lib/db";

// PATCH /api/mikrotik/billing/transactions/[id]
// Mengubah transaksi kas manual (ditolak jika transaksi terhubung dengan invoice otomatis)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "ID transaksi tidak valid" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { type, category, amount, description, date } = body;

    // Cari transaksi di database
    const existingTx = await db.transaction.findUnique({
      where: { id },
    });

    if (!existingTx) {
      return NextResponse.json(
        { success: false, message: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Proteksi transaksi otomatis agar tidak dimodifikasi secara langsung
    if (existingTx.invoiceId !== null) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Transaksi otomatis dari pelunasan tagihan tidak dapat diubah secara langsung dari menu Transaksi." 
        },
        { status: 403 }
      );
    }

    // Siapkan data pembaruan
    const updateData: any = {};
    if (type) {
      if (type !== "INCOME" && type !== "EXPENSE") {
        return NextResponse.json(
          { success: false, message: "Tipe transaksi harus INCOME atau EXPENSE." },
          { status: 400 }
        );
      }
      updateData.type = type;
    }
    if (category) updateData.category = category;
    if (amount !== undefined) {
      const nominal = parseInt(String(amount), 10);
      if (isNaN(nominal) || nominal <= 0) {
        return NextResponse.json(
          { success: false, message: "Nominal jumlah dana transaksi tidak valid." },
          { status: 400 }
        );
      }
      updateData.amount = nominal;
    }
    if (description) updateData.description = description;
    if (date) updateData.date = new Date(date);

    // Update transaksi
    const updatedTx = await db.transaction.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Transaksi berhasil diperbarui",
      data: updatedTx,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui data transaksi" },
      { status: 500 }
    );
  }
}

// DELETE /api/mikrotik/billing/transactions/[id]
// Menghapus transaksi kas manual (ditolak jika transaksi terhubung dengan invoice otomatis)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "ID transaksi tidak valid" },
        { status: 400 }
      );
    }

    // Cari transaksi di database
    const existingTx = await db.transaction.findUnique({
      where: { id },
    });

    if (!existingTx) {
      return NextResponse.json(
        { success: false, message: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Jika ini merupakan transaksi otomatis dari tagihan bulanan
    if (existingTx.invoiceId !== null) {
      await db.$transaction(async (tx) => {
        // 1. Kembalikan status tagihan terkait menjadi PENDING (Belum Lunas)
        await tx.invoice.update({
          where: { id: existingTx.invoiceId! },
          data: {
            status: "PENDING",
            paidAt: null,
          },
        });

        // 2. Hapus data transaksi kas masuknya
        await tx.transaction.delete({
          where: { id },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Transaksi pelunasan otomatis berhasil dihapus dan status tagihan terkait dikembalikan menjadi belum lunas.",
      });
    }

    // Hapus transaksi manual biasa
    await db.transaction.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Transaksi manual berhasil dihapus",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus data transaksi" },
      { status: 500 }
    );
  }
}
