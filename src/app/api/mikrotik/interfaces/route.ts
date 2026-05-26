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

    // Fetch all interfaces
    const interfacesResult = await withTimeout(
      api.menu("/interface").getAll(),
      5000
    );

    client.close();
    client = null;

    const mappedInterfaces = (interfacesResult as any[]).map((i: any) => ({
      id: String(i[".id"] ?? i.id ?? ""),
      name: String(i.name ?? "-"),
      type: String(i.type ?? "ether"),
      comment: String(i.comment ?? ""),
    }));

    return NextResponse.json({
      success: true,
      data: mappedInterfaces,
    });
  } catch (error: any) {
    try { client?.close(); } catch {}

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal memuat daftar interface router",
      },
      { status: 500 }
    );
  }
}
