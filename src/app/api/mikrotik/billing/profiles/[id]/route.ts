import { NextResponse } from "next/server";
import db from "@/lib/db";

// PUT /api/mikrotik/billing/profiles/[id]
// Update an existing master speed package in SQLite
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profileId = parseInt(id, 10);

    if (isNaN(profileId)) {
      return NextResponse.json(
        { success: false, message: "ID profil paket tidak valid" },
        { status: 400 }
      );
    }

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

    // Verify profile exists
    const profile = await db.billingProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Profil paket tidak ditemukan" },
        { status: 404 }
      );
    }

    // Verify uniqueness if name is changing
    if (name !== profile.name) {
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
    }

    const updated = await db.billingProfile.update({
      where: { id: profileId },
      data: {
        name,
        speed,
        price: parseInt(String(price), 10),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal memperbarui data profil paket",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/mikrotik/billing/profiles/[id]
// Delete a master speed package from SQLite (disallows deletion if used by active customers)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profileId = parseInt(id, 10);

    if (isNaN(profileId)) {
      return NextResponse.json(
        { success: false, message: "ID profil paket tidak valid" },
        { status: 400 }
      );
    }

    // Verify profile exists
    const profile = await db.billingProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Profil paket tidak ditemukan" },
        { status: 404 }
      );
    }

    // Safety constraint: check if any customer is using this profile
    const activeUsage = await db.customer.findFirst({
      where: { profileId },
    });

    if (activeUsage) {
      return NextResponse.json(
        {
          success: false,
          message: `Profil paket '${profile.name}' tidak dapat dihapus karena sedang digunakan oleh pelanggan bulanan aktif`,
        },
        { status: 400 }
      );
    }

    await db.billingProfile.delete({
      where: { id: profileId },
    });

    return NextResponse.json({
      success: true,
      message: "Profil paket berhasil dihapus dari database lokal",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal menghapus data profil paket",
      },
      { status: 500 }
    );
  }
}
