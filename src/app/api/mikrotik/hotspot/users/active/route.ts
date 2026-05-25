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

export async function GET() {
  let client: RouterOSClient | null = null;

  try {
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

    // Fetch active users live
    const activeUsersResult = await withTimeout(
      api.menu("/ip/hotspot/active").getAll(),
      5000
    );

    client.close();
    client = null;

    const mappedUsers = (activeUsersResult as any[]).map((u: any) => ({
      id: String(u[".id"] ?? u.id ?? ""),
      user: String(u.user ?? "-"),
      address: String(u.address ?? "-"),
      mac_address: String(u.macAddress ?? u["mac-address"] ?? "-"),
      uptime: String(u.uptime ?? "-"),
      server: String(u.server ?? "-"),
      login_by: String(u.loginBy ?? u["login-by"] ?? "-"),
      bytes_in: Number(u.bytesIn ?? u["bytes-in"] ?? 0),
      bytes_out: Number(u.bytesOut ?? u["bytes-out"] ?? 0),
    }));

    return NextResponse.json({
      success: true,
      data: mappedUsers,
    });
  } catch (error: any) {
    try { client?.close(); } catch {}

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal memuat daftar user hotspot aktif",
      },
      { status: 500 }
    );
  }
}
