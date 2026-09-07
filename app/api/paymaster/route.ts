import { NextRequest, NextResponse } from "next/server";

// Server-side only env var - NEVER expose with NEXT_PUBLIC_
const CDP_PAYMASTER_URL = process.env.CDP_PAYMASTER_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!CDP_PAYMASTER_URL) {
      // Graceful error response so the client knows paymaster is not yet hooked up
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: body.id ?? 1,
          error: {
            code: -32603,
            message:
              "CDP_PAYMASTER_URL is not configured on the server. Please add CDP_PAYMASTER_URL to .env.local to sponsor transactions.",
          },
        },
        { status: 200 } // Return 200 with JSON-RPC error payload so RPC clients parse it gracefully
      );
    }

    // Forward JSON-RPC request to Coinbase CDP Paymaster
    const response = await fetch(CDP_PAYMASTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("[Paymaster Proxy Error]:", error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32603,
          message: error?.message || "Internal paymaster proxy error",
        },
      },
      { status: 500 }
    );
  }
}
