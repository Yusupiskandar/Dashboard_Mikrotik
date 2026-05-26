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
      tls: session.use_ssl as any,
      timeout: 8,
    });

    const api = await withTimeout(client.connect(), 9000);

    // Fetch all hotspot users
    const allUsersResult = await withTimeout(
      api.menu("/ip/hotspot/user").getAll(),
      5000
    );

    client.close();
    client = null;

    const mappedUsers = (allUsersResult as any[]).map((u: any) => {
      // Safely check if the user is disabled
      const isDisabled = u.disabled === "true" || u.disabled === true;

      // Extract uptime limit
      const uptimeLimit = String(u.limitUptime ?? u["limit-uptime"] ?? "-");

      // Calculate data limit (bytes total or individual in/out limits)
      const bytesInLimit = Number(u.limitBytesIn ?? u["limit-bytes-in"] ?? 0);
      const bytesOutLimit = Number(u.limitBytesOut ?? u["limit-bytes-out"] ?? 0);
      const bytesTotalLimit = Number(u.limitBytesTotal ?? u["limit-bytes-total"] ?? 0);

      const dataLimit = bytesTotalLimit > 0
        ? bytesTotalLimit
        : (bytesInLimit > 0 || bytesOutLimit > 0 ? (bytesInLimit + bytesOutLimit) : 0);

      return {
        id: String(u[".id"] ?? u.id ?? ""),
        name: String(u.name ?? "-"),
        profile: String(u.profile ?? "-"),
        server: String(u.server ?? "-"),
        limit_uptime: uptimeLimit,
        limit_bytes: dataLimit,
        disabled: isDisabled,
        comment: String(u.comment ?? ""),
      };
    });

    return NextResponse.json({
      success: true,
      data: mappedUsers,
    });
  } catch (error: any) {
    try { client?.close(); } catch {}

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal memuat seluruh daftar user hotspot",
      },
      { status: 500 }
    );
  }
}
