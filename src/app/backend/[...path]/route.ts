import { NextRequest } from 'next/server';
import { proxyRequest } from '@/lib/proxy';

async function handle(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(
    {
      method: request.method,
      headers: request.headers,
      search: request.nextUrl.search,
      readBody: () => request.arrayBuffer(),
    },
    path,
  );
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
