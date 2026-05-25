import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { RouterOSClient } from "routeros-client";

interface MikrotikSession {
  host: string;
  port: number;
  username: string;
  password: string;
  use_ssl: boolean;
  login_time: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function POST(request: Request) {
  let client: RouterOSClient | null = null;

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Parameter id session wajib diisi" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("mikrotik_session");

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, message: "No active session" },
        { status: 401 }
      );
    }

    const session: MikrotikSession = JSON.parse(sessionCookie.value);

    client = new RouterOSClient({
      host: session.host,
      user: session.username,
      password: session.password,
      port: session.port,
      tls: session.use_ssl,
      timeout: 8,
    });

    const api = await withTimeout(client.connect(), 9000);

    // Remove the active session from /ip/hotspot/active using the unique id (.id)
    await withTimeout(
      api.menu("/ip/hotspot/active").remove(id),
      5000
    );

    client.close();
    client = null;

    return NextResponse.json({
      success: true,
      message: "Sesi hotspot user berhasil diputus",
    });
  } catch (error: any) {
    try { client?.close(); } catch {}

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal memutus sesi hotspot user",
      },
      { status: 500 }
    );
  }
}
