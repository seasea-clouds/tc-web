/**
 * Get single report by ID
 * GET /api/report/:id
 *
 * Note: Report data is stored in localStorage by the frontend
 * before redirecting to Creem. This API is a backup/fallback
 * and will work once D1 binding is configured.
 */

export async function onRequest(context: { request: Request; env: any; params: { id: string } }) {
  if (context.request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { id } = context.params;

  if (!id) {
    return Response.json({ error: 'Missing report ID' }, { status: 400 });
  }

  // If D1 is available, try to fetch from DB
  if (context.env?.DB) {
    try {
      const row = await context.env.DB.prepare('SELECT * FROM reports WHERE id = ?').bind(id).first();
      if (row) {
        // Parse stored result data (the full compliance report)
        let resultData = { requiresRegistration: false, isHighRisk: false, riskCategory: '', summary: '', requiredDocuments: [] };
        let nextStepsData: string[] = [];
        if (row.result_data) {
          try {
            const parsed = JSON.parse(row.result_data);
            resultData = parsed.result || parsed;
            nextStepsData = parsed.nextSteps || [];
          } catch {}
        }
        
        // Parse product info from input_data
        let productInfo = { name: '', category: '', hsCode: '', originCountry: '' };
        if (row.input_data) {
          try {
            const inputData = JSON.parse(row.input_data);
            productInfo = {
              name: (inputData.productName as string) || row.product_name || '',
              category: (inputData.category as string) || '',
              hsCode: (inputData.hsCode as string) || row.hs_code || '',
              originCountry: (inputData.originCountry as string) || row.origin_country || '',
            };
          } catch {}
        }
        
        return Response.json({
          id: row.id,
          module: row.module,
          productInfo,
          result: resultData,
          nextSteps: nextStepsData,
          generatedAt: row.created_at || '',
        });
      }
    } catch {}
  }

  return Response.json({ error: 'Report not found' }, { status: 404 });
}
