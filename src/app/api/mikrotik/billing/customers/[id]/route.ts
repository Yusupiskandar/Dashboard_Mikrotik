import { NextResponse } from "next/server";
import db from "@/lib/db";

// PUT /api/mikrotik/billing/customers/[id]
// Update an existing customer record in SQLite with profile relations
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id, 10);

    if (isNaN(customerId)) {
      return NextResponse.json(
        { success: false, message: "ID pelanggan tidak valid" },
        { status: 400 }
      );
    }

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

    // Verify customer exists
    const customer = await db.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Pelanggan tidak ditemukan" },
        { status: 404 }
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

    // Verify username uniqueness if it's changing
    if (pppoeUsername !== customer.pppoeUsername) {
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
    }

    const updated = await db.customer.update({
      where: { id: customerId },
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
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal memperbarui data pelanggan",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/mikrotik/billing/customers/[id]
// Delete a customer record from SQLite
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id, 10);

    if (isNaN(customerId)) {
      return NextResponse.json(
        { success: false, message: "ID pelanggan tidak valid" },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await db.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Pelanggan tidak ditemukan" },
        { status: 404 }
      );
    }

    await db.customer.delete({
      where: { id: customerId },
    });

    return NextResponse.json({
      success: true,
      message: "Data pelanggan berhasil dihapus dari database lokal",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal menghapus data pelanggan",
      },
      { status: 500 }
    );
  }
}
