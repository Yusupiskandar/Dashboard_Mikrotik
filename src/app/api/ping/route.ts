import { NextResponse } from 'next/server';
import ping from 'ping';

export async function POST(request: Request) {
  try {
    const { ip } = await request.json();

    if (!ip) {
      return NextResponse.json({ success: false, message: 'IP address is required' }, { status: 400 });
    }

    const res = await ping.promise.probe(ip, {
      timeout: 3,
    });

    return NextResponse.json({
      success: true,
      data: {
        host: res.host,
        isAlive: res.alive,
        time: res.time,
        output: res.output
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to ping IP' }, { status: 500 });
  }
}
