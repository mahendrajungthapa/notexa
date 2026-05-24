import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl } from '@/lib/api-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);

async function proxyBackend(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const apiUrl = getBackendApiUrl();
    const targetUrl = new URL(`${apiUrl}/${path.map(encodeURIComponent).join('/')}`);
    targetUrl.search = request.nextUrl.search;

    const headers: Record<string, string> = {
      Accept: request.headers.get('accept') || 'application/json',
    };

    const authorization = request.headers.get('authorization');
    const contentType = request.headers.get('content-type');
    if (authorization) headers.Authorization = authorization;
    if (contentType) headers['Content-Type'] = contentType;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: METHODS_WITHOUT_BODY.has(request.method) ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
      redirect: 'manual',
    });

    const responseHeaders = new Headers();
    const responseContentType = response.headers.get('content-type');
    const contentDisposition = response.headers.get('content-disposition');
    if (responseContentType) responseHeaders.set('Content-Type', responseContentType);
    if (contentDisposition) responseHeaders.set('Content-Disposition', contentDisposition);

    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error?.message || 'Unable to reach the backend service.',
    }, { status: 502 });
  }
}

export const GET = proxyBackend;
export const POST = proxyBackend;
export const PUT = proxyBackend;
export const PATCH = proxyBackend;
export const DELETE = proxyBackend;
