import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { RouterOSClient } from "routeros-client";

export async function POST(req: Request) {
  let client: RouterOSClient | null = null;

  try {
    const body = await req.json();
    const { host, port, username, password, use_ssl } = body;

    if (!host || !port || !username || !password) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    client = new RouterOSClient({
      host,
      user: username,
      password,
      port: Number(port),
      tls: Boolean(use_ssl),
      timeout: 8, // seconds
    });

    try {
      // connect() returns the api object — we just need to verify it works
      await client.connect();
      client.close();
      client = null;

      // Store connection info in a cookie (server-side session)
      const connectionData = {
        host,
        port: Number(port),
        username,
        password,
        use_ssl: Boolean(use_ssl),
        login_time: new Date().toISOString(),
      };

      const cookieStore = await cookies();
      cookieStore.set("mikrotik_session", JSON.stringify(connectionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 8, // 8 hours
        path: "/",
      });

      return NextResponse.json({
        success: true,
        message: "Connected to MikroTik successfully.",
        redirect: "/mikrotik/dashboard",
      });
    } catch (connectionError: any) {
      try { client?.close(); } catch {}
      client = null;

      return NextResponse.json(
        {
          success: false,
          message: connectionError.message || "Failed to connect to MikroTik",
        },
        { status: 401 }
      );
    }
  } catch (error: any) {
    try { client?.close(); } catch {}

    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
