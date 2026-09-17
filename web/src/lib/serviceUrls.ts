/**
 * The two backend services the browser talks to directly (everything else goes
 * through /api/* → LAD-Backend).
 *
 * Until 2026-09 one Cloud Run service served both surfaces, so one variable was
 * enough. They are two services now, deployed from two repositories:
 *
 *   PLAYGROUND_WORKER_URL  LAD-VOAG's playground worker: in-browser test calls
 *                          (/playground-init, /playground-agents), the voice
 *                          knowledge base (/playground-rag/*), cloning (/voices/*).
 *   MEDIA_GEN_URL          LAD-MAGe: media generation (/playground-media/*), the
 *                          guided agent builder (/playground-builder/chat), brand
 *                          assets (/brand-assets/*), the MAGe console (/mage/*),
 *                          auto media (/auto-media/*).
 *
 * Both expose /worker-status, /hold-for-call and /release-call, so a hold must be
 * taken on the service the session is actually using.
 *
 * MEDIA_GEN_URL falls back to the playground worker so an environment that has
 * not set it yet behaves exactly as before. `process.env.NEXT_PUBLIC_*` must be
 * spelled out literally for Next to inline it at build time.
 */
export const PLAYGROUND_WORKER_URL: string =
  process.env.NEXT_PUBLIC_PLAYGROUND_WORKER_URL || "http://localhost:8080";

export const MEDIA_GEN_URL: string =
  process.env.NEXT_PUBLIC_MEDIA_GEN_URL || PLAYGROUND_WORKER_URL;
