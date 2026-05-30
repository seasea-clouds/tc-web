/**
 * API middleware: Add CORS headers for cross-origin requests from main site.
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://sinotradecompliance.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export async function onRequest(context: { request: Request; next: () => Promise<Response> }) {
  const { request } = context;

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const response = await context.next();

  // Add CORS headers to all API responses
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
