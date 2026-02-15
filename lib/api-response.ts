import { NextResponse } from "next/server";

type ApiErrorInput = {
  status: number;
  code: string;
  message: string;
  requestId: string;
  details?: string;
  headers?: HeadersInit;
};

export function getRequestId(request?: Request): string {
  const headerValue = request?.headers.get("x-request-id")?.trim();
  if (headerValue) return headerValue;
  return crypto.randomUUID();
}

export function okJson<T>(
  data: T,
  options: { status?: number; requestId: string; headers?: HeadersInit },
) {
  const response = NextResponse.json(data, {
    status: options.status ?? 200,
    headers: options.headers,
  });
  response.headers.set("x-request-id", options.requestId);
  return response;
}

export function errorJson(input: ApiErrorInput) {
  const response = NextResponse.json(
    {
      error: {
        code: input.code,
        message: input.message,
        details: input.details,
      },
      requestId: input.requestId,
    },
    { status: input.status, headers: input.headers },
  );
  response.headers.set("x-request-id", input.requestId);
  return response;
}
