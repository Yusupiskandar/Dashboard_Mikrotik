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

// Wrap a promise with a timeout so hung connections don't crash the server
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
      timeout: 8, // seconds
    });

    // connect() returns the API object on routeros-client
    const api = await withTimeout(client.connect(), 9000);

    // Fetch identity, resource, and hotspot data in parallel
    // api.menu() is the correct method on the returned API object
    const [identityResult, resourceResult, hotspotActiveResult, hotspotUsersResult] =
      await Promise.allSettled([
        withTimeout(api.menu("/system/identity").getAll(), 5000),
        withTimeout(api.menu("/system/resource").getAll(), 5000),
        withTimeout(api.menu("/ip/hotspot/active").getAll(), 5000),
        withTimeout(api.menu("/ip/hotspot/user").getAll(), 5000),
      ]);

    client.close();
    client = null;

    const identity =
      identityResult.status === "fulfilled" ? identityResult.value[0] : null;
    const resource =
      resourceResult.status === "fulfilled" ? resourceResult.value[0] : null;
    const hotspotActive =
      hotspotActiveResult.status === "fulfilled"
        ? hotspotActiveResult.value
        : [];
    const hotspotUsers =
      hotspotUsersResult.status === "fulfilled"
        ? hotspotUsersResult.value
        : [];

    return NextResponse.json({
      success: true,
      connection: {
        host: session.host,
        port: session.port,
        username: session.username,
        use_ssl: session.use_ssl,
        login_time: session.login_time,
        status: "connected",
      },
      router: (() => {
        const r = resource as any;
        // routeros-client may return either camelCase OR kebab-case keys
        const boardName   = r?.boardName   ?? r?.["board-name"]   ?? "Unknown";
        const cpuLoad     = r?.cpuLoad     ?? r?.["cpu-load"]     ?? 0;
        const freeMemory  = r?.freeMemory  ?? r?.["free-memory"]  ?? 0;
        const totalMemory = r?.totalMemory ?? r?.["total-memory"] ?? 0;
        return {
          identity:     (identity as any)?.name ?? "Unknown",
          version:      r?.version ?? "Unknown",
          uptime:       r?.uptime  ?? "Unknown",
          board_name:   String(boardName),
          cpu_load:     Number(cpuLoad),
          free_memory:  Number(freeMemory),
          total_memory: Number(totalMemory),
        };
      })(),
      stats: {
        hotspot_active_users: (hotspotActive as any[]).length,
        total_hotspot_users: (hotspotUsers as any[]).length,
        ppp_active_users: 0,
        active_sessions: (hotspotActive as any[]).length,
      },
      recent_activity: (hotspotActive as any[]).map((u: any) => ({
        user:        String(u.user                            ?? "-"),
        address:     String(u.address                        ?? "-"),
        uptime:      String(u.uptime                         ?? "-"),
        server:      String(u.server                         ?? "-"),
        mac_address: String(u.macAddress ?? u["mac-address"] ?? "-"),
      })),
    });
  } catch (error: any) {
    // Always close the client to free socket resources
    try { client?.close(); } catch {}

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch dashboard data",
      },
      { status: 500 }
    );
  }
}
