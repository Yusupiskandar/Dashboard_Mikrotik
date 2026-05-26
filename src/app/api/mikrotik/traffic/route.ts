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

export async function GET(request: Request) {
  let client: RouterOSClient | null = null;

  try {
    const { searchParams } = new URL(request.url);
    const interfaceName = searchParams.get("interface");

    if (!interfaceName) {
      return NextResponse.json(
        { success: false, message: "Parameter interface wajib ditentukan" },
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
      tls: session.use_ssl as any,
      timeout: 8,
    });

    const api = await withTimeout(client.connect(), 9000);

    // Call /interface/monitor-traffic and fetch interface stats in parallel
    const [trafficResult, interfaceDetailsResult] = await Promise.allSettled([
      withTimeout(
        api.menu("/interface").exec("monitor-traffic", {
          interface: interfaceName,
          once: true,
        }),
        5000
      ),
      withTimeout(
        api.menu("/interface").getAll({ name: interfaceName }),
        5000
      ),
    ]);

    client.close();
    client = null;

    const trafficRaw =
      trafficResult.status === "fulfilled" ? trafficResult.value : {};
    const interfaceDetails =
      interfaceDetailsResult.status === "fulfilled"
        ? (interfaceDetailsResult.value as any[])[0]
        : null;

    // The result from once=true is usually an array containing a single object
    const rawData = Array.isArray(trafficRaw) ? (trafficRaw[0] ?? {}) : (trafficRaw ?? {});

    const rxBytes = Number(interfaceDetails?.["rx-byte"] ?? interfaceDetails?.rxByte ?? 0);
    const txBytes = Number(interfaceDetails?.["tx-byte"] ?? interfaceDetails?.txByte ?? 0);

    const mappedTraffic = {
      name: String(interfaceName),
      rx_bits_per_second: Number(rawData["rx-bits-per-second"] ?? rawData.rxBitsPerSecond ?? 0),
      tx_bits_per_second: Number(rawData["tx-bits-per-second"] ?? rawData.txBitsPerSecond ?? 0),
      rx_packets_per_second: Number(rawData["rx-packets-per-second"] ?? rawData.rxPacketsPerSecond ?? 0),
      tx_packets_per_second: Number(rawData["tx-packets-per-second"] ?? rawData.txPacketsPerSecond ?? 0),
      fp_rx_bits_per_second: Number(rawData["fp-rx-bits-per-second"] ?? rawData.fpRxBitsPerSecond ?? 0),
      fp_tx_bits_per_second: Number(rawData["fp-tx-bits-per-second"] ?? rawData.fpTxBitsPerSecond ?? 0),
      tx_queue_drops_per_second: Number(rawData["tx-queue-drops-per-second"] ?? rawData.txQueueDropsPerSecond ?? 0),
      rx_bytes: rxBytes,
      tx_bytes: txBytes,
    };

    return NextResponse.json({
      success: true,
      data: mappedTraffic,
    });
  } catch (error: any) {
    try { client?.close(); } catch {}

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal memonitor trafik interface",
      },
      { status: 500 }
    );
  }
}
