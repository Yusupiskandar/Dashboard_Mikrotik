import { NextResponse } from "next/server";
import db from "@/lib/db";

// GET /api/mikrotik/billing/profiles
// Fetch all master speed packages from SQLite database
export async function GET() {
  try {
    const profiles = await db.billingProfile.findMany({
      orderBy: {
        price: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: profiles,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal mengambil master data profil paket",
      },
      { status: 500 }
    );
  }
}

// POST /api/mikrotik/billing/profiles
// Create a new master speed package in SQLite
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, speed, price } = body;

    // Validation
    if (!name || !speed || !price) {
      return NextResponse.json(
        {
          success: false,
          message: "Kolom nama profil, kecepatan, dan tarif harga wajib diisi",
        },
        { status: 400 }
      );
    }

    // Check unique constraint
    const existing = await db.billingProfile.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: `Profil paket '${name}' sudah terdaftar dalam database`,
        },
        { status: 400 }
      );
    }

    const newProfile = await db.billingProfile.create({
      data: {
        name,
        speed,
        price: parseInt(String(price), 10),
      },
    });

    return NextResponse.json({
      success: true,
      data: newProfile,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal membuat master data profil baru",
      },
      { status: 500 }
    );
  }
}
