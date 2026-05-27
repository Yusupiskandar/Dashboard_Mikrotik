import { NextResponse } from "next/server";
import db from "@/lib/db";

// PATCH /api/mikrotik/billing/invoices/[id]
// Update payment status of a single invoice (mark as PAID or PENDING)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "ID tagihan tidak valid" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (status !== "PAID" && status !== "PENDING") {
      return NextResponse.json(
        { success: false, message: "Status tagihan hanya boleh 'PAID' atau 'PENDING'" },
        { status: 400 }
      );
    }

    const MONTHS_MAP: Record<number, string> = {
      1: "Januari", 2: "Februari", 3: "Maret", 4: "April", 5: "Mei", 6: "Juni",
      7: "Juli", 8: "Agustus", 9: "September", 10: "Oktober", 11: "November", 12: "Desember"
    };

    const invoiceData = await db.invoice.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!invoiceData) {
      return NextResponse.json(
        { success: false, message: "Tagihan tidak ditemukan" },
        { status: 404 }
      );
    }

    const monthName = MONTHS_MAP[invoiceData.month] || String(invoiceData.month);
    const desc = `Pelunasan Tagihan Internet - ${invoiceData.customer.name} (Periode ${monthName} ${invoiceData.year})`;

    const invoice = await db.$transaction(async (tx) => {
      // 1. Update invoice status
      const inv = await tx.invoice.update({
        where: { id },
        data: {
          status,
          paidAt: status === "PAID" ? new Date() : null,
        },
      });

      // 2. Add or Remove Cash Transaction
      if (status === "PAID") {
        const existingTx = await tx.transaction.findFirst({
          where: { invoiceId: id },
        });

        if (!existingTx) {
          await tx.transaction.create({
            data: {
              type: "INCOME",
              category: "TAGIHAN_BULANAN",
              amount: invoiceData.amount,
              description: desc,
              date: new Date(),
              invoiceId: id,
            },
          });
        }
      } else {
        // PENDING
        await tx.transaction.deleteMany({
          where: { invoiceId: id },
        });
      }

      return inv;
    });

    return NextResponse.json({
      success: true,
      message: status === "PAID" ? "Tagihan berhasil dilunasi" : "Status tagihan diubah menjadi belum lunas",
      data: invoice,
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal memperbarui status tagihan",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/mikrotik/billing/invoices/[id]
// Delete a single invoice from the database
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "ID tagihan tidak valid" },
        { status: 400 }
      );
    }

    await db.invoice.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Tagihan berhasil dihapus",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal menghapus data tagihan",
      },
      { status: 500 }
    );
  }
}
