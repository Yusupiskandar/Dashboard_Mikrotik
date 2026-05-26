import { NextResponse } from "next/server";
import db from "@/lib/db";

// GET /api/mikrotik/billing/customers
// Fetch all registered monthly clients from SQLite local database with profile relations
export async function GET() {
  try {
    const customers = await db.customer.findMany({
      include: {
        profile: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: customers,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal mengambil data pelanggan bulanan",
      },
      { status: 500 }
    );
  }
}

// POST /api/mikrotik/billing/customers
// Create a new monthly customer record in SQLite
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      whatsapp,
      address,
      pppoeUsername,
      pppoePassword,
      profileId,
      dueDay,
      isActive,
    } = body;

    // Validation
    if (!name || !whatsapp || !pppoeUsername || !pppoePassword || !profileId) {
      return NextResponse.json(
        {
          success: false,
          message: "Kolom nama, WhatsApp, username PPPoE, password, dan profil paket wajib diisi",
        },
        { status: 400 }
      );
    }

    // Get the billing profile details
    const selectedProfile = await db.billingProfile.findUnique({
      where: { id: parseInt(String(profileId), 10) },
    });

    if (!selectedProfile) {
      return NextResponse.json(
        {
          success: false,
          message: "Profil paket yang dipilih tidak valid atau tidak terdaftar dalam database",
        },
        { status: 400 }
      );
    }

    // Check unique username constraint manually for better error message
    const existing = await db.customer.findUnique({
      where: { pppoeUsername },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: `Username PPPoE '${pppoeUsername}' sudah digunakan oleh pelanggan lain`,
        },
        { status: 400 }
      );
    }

    const customer = await db.customer.create({
      data: {
        name,
        whatsapp,
        address: address || "",
        pppoeUsername,
        pppoePassword,
        profileId: selectedProfile.id,
        monthlyFee: selectedProfile.price, // copy price from profile table
        dueDay: dueDay ? parseInt(String(dueDay), 10) : 5,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: {
        profile: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal membuat master data pelanggan baru",
      },
      { status: 500 }
    );
  }
}
