import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { RouterOSClient } from "routeros-client";

export async function GET() {
  let client: RouterOSClient | null = null;
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("mikrotik_session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ success: false, message: "No session" }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    client = new RouterOSClient({
      host: session.host,
      user: session.username,
      password: session.password,
      port: session.port,
      tls: session.use_ssl,
      timeout: 8,
    });

    const api = await client.connect();

    const [resource, hotspotSample] = await Promise.all([
      api.menu("/system/resource").getAll(),
      api.menu("/ip/hotspot/active").getAll(),
    ]);

    client.close();
    client = null;

    return NextResponse.json({
      resource_keys: Object.keys(resource[0] ?? {}),
      resource_sample: resource[0],
      hotspot_active_keys: Object.keys((hotspotSample as any[])[0] ?? {}),
      hotspot_active_sample: (hotspotSample as any[])[0],
    });
  } catch (e: any) {
    try { client?.close(); } catch {}
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
