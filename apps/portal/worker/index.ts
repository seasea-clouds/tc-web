/**
 * Proxy Worker: sinotradecompliance.com/compli-service/* → compli-service.pages.dev
 */

const TARGET = 'https://compli-service.pages.dev';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const search = url.search;

    // Only handle /compli-service/ paths
    if (!path.startsWith('/compli-service/') && path !== '/compli-service') {
      return new Response('Not found', { status: 404 });
    }

    // Remove /compli-service prefix
    const targetPath = path.replace(/^\/compli-service/, '') || '/';

    const response = await fetch(`${TARGET}${targetPath}${search}`, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    });

    return response;
  },
};
