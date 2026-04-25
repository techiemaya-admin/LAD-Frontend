/**
 * Template Media Upload Proxy
 * Receives JSON { file_base64, filename, content_type } from frontend.
 *   channel=waba  → Python service (Meta media upload API)
 *   channel=personal (default) → Node backend
 */
import { NextRequest } from 'next/server';
import { proxyToPythonService, getWhatsAppServiceUrl } from '../../../utils/python-proxy';

export async function POST(req: NextRequest) {
  return proxyToPythonService(
    req,
    getWhatsAppServiceUrl(),
    '/api/conversations/templates/upload-media'
  );
}
