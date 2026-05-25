import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("mikrotik_session");

    return NextResponse.json({
      success: true,
      message: "Disconnected successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to disconnect" },
      { status: 500 }
    );
  }
}
