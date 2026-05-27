import { NextResponse } from "next/server";
import db from "@/lib/db";

// GET /api/mikrotik/billing/invoices
// Fetch all invoices based on filters (month, year, status, customer search query)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || "";

    // Build conditional filtering
    const invoices = await db.invoice.findMany({
      where: {
        AND: [
          month ? { month } : {},
          year ? { year } : {},
          status && status !== "ALL" ? { status } : {},
          search ? {
            customer: {
              name: { contains: search }
            }
          } : {}
        ]
      },
      include: {
        customer: {
          include: {
            profile: true
          }
        }
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
        { createdAt: "desc" }
      ]
    });

    return NextResponse.json({
      success: true,
      data: invoices,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal mengambil data tagihan",
      },
      { status: 500 }
    );
  }
}

// POST /api/mikrotik/billing/invoices
// Bulk generate invoices for active monthly customers for a given month and year
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { month, year } = body;

    // Validation
    if (!month || !year) {
      return NextResponse.json(
        {
          success: false,
          message: "Bulan dan tahun penagihan wajib ditentukan",
        },
        { status: 400 }
      );
    }

    const targetMonth = parseInt(String(month), 10);
    const targetYear = parseInt(String(year), 10);

    // Fetch active customers
    const activeCustomers = await db.customer.findMany({
      where: {
        isActive: true,
      },
    });

    if (activeCustomers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada pelanggan aktif yang ditemukan untuk dibuatkan tagihan.",
        data: { generated: 0, skipped: 0 }
      });
    }

    let generatedCount = 0;
    let skippedCount = 0;

    for (const customer of activeCustomers) {
      // Check if invoice already exists for this month/year
      const existing = await db.invoice.findUnique({
        where: {
          customerId_month_year: {
            customerId: customer.id,
            month: targetMonth,
            year: targetYear,
          },
        },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Create new invoice copy the monthlyFee as the amount
      await db.invoice.create({
        data: {
          customerId: customer.id,
          month: targetMonth,
          year: targetYear,
          amount: customer.monthlyFee,
          status: "PENDING",
        },
      });

      generatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Proses penutupan tagihan berhasil. Dibuat: ${generatedCount}, Dilewati: ${skippedCount}`,
      data: {
        generated: generatedCount,
        skipped: skippedCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal membuat tagihan bulanan",
      },
      { status: 500 }
    );
  }
}
