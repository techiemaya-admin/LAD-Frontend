/**
 * Template Edit Proxy
 *
 * POST /api/whatsapp-conversations/conversations/templates/:templateId/edit
 *      → Python svc /api/conversations/templates/:templateId/edit
 *
 * Separate from the PUT on the parent route on purpose. That one is the
 * personal-WhatsApp CRUD path, where a template is a row we own and a full
 * replace is meaningful. A WABA template is Meta's, and an edit is a partial
 * submission that sends it back for review — different verb, different
 * semantics, and conflating them would let a personal-template PUT reach Meta.
 *
 * templateId here is Meta's template id (the numeric one from the listing), NOT
 * the template name. Deletion keys on the name; editing keys on the id. They
 * are genuinely different identifiers and swapping them 404s.
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../../utils/python-proxy';

type Ctx = { params: Promise<{ templateId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { templateId } = await ctx.params;
  return proxyToPythonService(
    req,
    getWhatsAppServiceUrl(),
    `/api/conversations/templates/${templateId}/edit`,
  );
}
