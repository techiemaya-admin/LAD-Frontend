'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

type SpecsMap = Record<string, unknown>;

interface ServiceMeta {
  id: string;
  name: string;
  tech: string;
  port: number;
  desc: string;
  paths: number;
  ops: number;
}

const SERVICES: ServiceMeta[] = [
  {
    id: 'backend',
    name: 'LAD Backend',
    tech: 'Node.js · Express',
    port: 3004,
    paths: 492,
    ops: 576,
    desc: 'Auth, billing, users, campaigns, ICP assistant, Apollo, ABM, deals pipeline, voice agent, social integrations, community-ROI.',
  },
  {
    id: 'waba',
    name: 'WABA-Comms',
    tech: 'Python · FastAPI',
    port: 8000,
    paths: 82,
    ops: 110,
    desc: 'WhatsApp inbox, conversations, templates, labels, notes, prompts, follow-ups, assignments, leads, email contacts.',
  },
  {
    id: 'voag',
    name: 'VOAG',
    tech: 'Python · FastAPI',
    port: 8080,
    paths: 49,
    ops: 59,
    desc: 'Vonage voice agent platform with LiveKit. Calls, batch campaigns, voice agents, Gemini RAG knowledge base, OAuth, recordings.',
  },
  {
    id: 'frontend',
    name: 'Frontend Proxy',
    tech: 'Next.js · App Router',
    port: 3000,
    paths: 143,
    ops: 199,
    desc: 'Next.js /api routes - mostly thin proxies to the three backends with cookie-based auth translation.',
  },
];

const SWAGGER_CSS = 'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css';
const SWAGGER_BUNDLE = 'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js';
const SWAGGER_PRESET = 'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js';

type SwaggerUIBundleType = ((config: Record<string, unknown>) => unknown) & {
  presets: { apis: unknown };
  plugins: { DownloadUrl: unknown };
};

declare global {
  interface Window {
    SwaggerUIBundle?: SwaggerUIBundleType;
    SwaggerUIStandalonePreset?: unknown;
  }
}

export default function SwaggerExplorer({
  specs,
  currentUser,
  sessionToken,
}: {
  specs: SpecsMap;
  currentUser: { email: string; role: string };
  sessionToken: string;
}) {
  const [activeService, setActiveService] = useState<string | null>(null);
  const [bundleReady, setBundleReady] = useState(false);
  const [presetReady, setPresetReady] = useState(false);
  const [tokenInput, setTokenInput] = useState<string>(sessionToken);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [toast, setToast] = useState<string>('');
  const swaggerContainerRef = useRef<HTMLDivElement | null>(null);
  const tokenRef = useRef<string>(sessionToken);

  useEffect(() => {
    tokenRef.current = tokenInput;
  }, [tokenInput]);

  // Mount swagger UI when both scripts loaded and a service is selected.
  useEffect(() => {
    if (!activeService) return;
    if (!bundleReady || !presetReady) return;
    if (!window.SwaggerUIBundle || !window.SwaggerUIStandalonePreset) return;
    if (!swaggerContainerRef.current) return;

    const spec = specs[activeService];
    if (!spec) return;

    swaggerContainerRef.current.innerHTML = '';
    window.SwaggerUIBundle({
      spec,
      domNode: swaggerContainerRef.current,
      deepLinking: true,
      presets: [window.SwaggerUIBundle.presets.apis, window.SwaggerUIStandalonePreset],
      plugins: [window.SwaggerUIBundle.plugins.DownloadUrl],
      layout: 'StandaloneLayout',
      displayRequestDuration: true,
      defaultModelsExpandDepth: -1,
      docExpansion: 'none',
      filter: true,
      tryItOutEnabled: true,
      persistAuthorization: true,
      requestInterceptor: (req: { headers: Record<string, string> }) => {
        const tok = tokenRef.current;
        if (tok && !req.headers.Authorization) {
          req.headers.Authorization = 'Bearer ' + tok;
        }
        return req;
      },
    });
  }, [activeService, bundleReady, presetReady, specs]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  }

  function saveToken() {
    showToast(tokenInput.trim() ? 'Token updated for Try-it-out' : 'Token cleared');
  }

  function clearToken() {
    setTokenInput('');
    showToast('Token cleared');
  }

  return (
    <>
      <link rel="stylesheet" href={SWAGGER_CSS} />
      <Script src={SWAGGER_BUNDLE} strategy="afterInteractive" onLoad={() => setBundleReady(true)} />
      <Script
        src={SWAGGER_PRESET}
        strategy="afterInteractive"
        onLoad={() => setPresetReady(true)}
      />

      <style>{`
        .lad-swagger-root { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; min-height: 100vh; display: flex; flex-direction: column; background: #fff; }
        .lad-swagger-topbar { background: #0f172a; color: #e2e8f0; padding: 12px 20px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; border-bottom: 1px solid #334155; position: sticky; top: 0; z-index: 100; }
        .lad-swagger-topbar h1 { font-size: 16px; margin: 0; font-weight: 600; letter-spacing: 0.3px; }
        .lad-swagger-topbar h1 .subtitle { color: #94a3b8; font-weight: 400; margin-left: 8px; font-size: 13px; }
        .lad-swagger-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .lad-swagger-tab { background: #1e293b; border: 1px solid #334155; color: #e2e8f0; padding: 6px 12px; font-size: 13px; border-radius: 6px; cursor: pointer; transition: all 0.15s ease; font-family: inherit; display: flex; align-items: center; gap: 8px; }
        .lad-swagger-tab:hover { background: #334155; border-color: #38bdf8; }
        .lad-swagger-tab.active { background: #38bdf8; color: #0f172a; border-color: #38bdf8; font-weight: 600; }
        .lad-swagger-tab .badge { display: inline-block; background: rgba(255,255,255,0.15); padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 600; }
        .lad-swagger-tab.active .badge { background: rgba(15, 23, 42, 0.25); }
        .lad-swagger-spacer { flex: 1; }
        .lad-swagger-userpill { background: #1e293b; border: 1px solid #334155; padding: 4px 10px; border-radius: 6px; font-size: 12px; color: #94a3b8; }
        .lad-swagger-userpill strong { color: #e2e8f0; }
        .lad-swagger-authbox { display: flex; align-items: center; gap: 8px; background: #1e293b; border: 1px solid #334155; padding: 4px 8px; border-radius: 6px; }
        .lad-swagger-authbox label { font-size: 12px; color: #94a3b8; }
        .lad-swagger-authbox input { background: transparent; border: none; color: #e2e8f0; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; width: 260px; padding: 4px; outline: none; }
        .lad-swagger-authbox .indicator { width: 8px; height: 8px; border-radius: 50%; background: #64748b; transition: background 0.2s ease; }
        .lad-swagger-authbox .indicator.set { background: #4ade80; }
        .lad-swagger-btnicon { background: transparent; border: 1px solid #334155; color: #e2e8f0; width: 26px; height: 26px; border-radius: 4px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
        .lad-swagger-btnicon:hover { background: #334155; }
        .lad-swagger-landing { max-width: 1100px; margin: 0 auto; padding: 40px 20px; width: 100%; }
        .lad-swagger-landing h2 { margin: 0 0 6px 0; font-size: 22px; color: #0f172a; }
        .lad-swagger-landing p.lead { color: #64748b; margin: 0 0 28px 0; font-size: 14px; line-height: 1.6; }
        .lad-swagger-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
        .lad-swagger-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; gap: 10px; }
        .lad-swagger-card:hover { border-color: #0ea5e9; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15); transform: translateY(-1px); }
        .lad-swagger-cardhead { display: flex; align-items: center; gap: 10px; }
        .lad-swagger-dot { width: 10px; height: 10px; border-radius: 50%; }
        .lad-swagger-card.backend .lad-swagger-dot { background: #4ade80; }
        .lad-swagger-card.waba .lad-swagger-dot { background: #fb923c; }
        .lad-swagger-card.frontend .lad-swagger-dot { background: #f472b6; }
        .lad-swagger-card.voag .lad-swagger-dot { background: #c084fc; }
        .lad-swagger-card h3 { margin: 0; font-size: 15px; color: #0f172a; }
        .lad-swagger-card .tech { font-size: 12px; color: #94a3b8; }
        .lad-swagger-card .stats { display: flex; gap: 14px; font-size: 13px; color: #475569; flex-wrap: wrap; }
        .lad-swagger-card .stats strong { color: #0f172a; }
        .lad-swagger-card .desc { font-size: 13px; color: #64748b; line-height: 1.5; }
        .lad-swagger-card .port { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; color: #94a3b8; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; display: inline-block; }
        .lad-swagger-uihead { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 20px; display: flex; align-items: center; gap: 12px; font-size: 13px; }
        .lad-swagger-back { background: white; border: 1px solid #cbd5e1; color: #475569; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 12px; }
        .lad-swagger-back:hover { background: #f1f5f9; }
        .lad-swagger-crumb { color: #475569; }
        .lad-swagger-crumb strong { color: #0f172a; }
        /* Hide swagger's own auth scheme bar - we manage from the topbar */
        .swagger-ui .scheme-container { display: none; }
        .lad-swagger-toast { position: fixed; bottom: 20px; right: 20px; background: #0f172a; color: #e2e8f0; padding: 10px 16px; border-radius: 6px; font-size: 13px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); z-index: 200; }
      `}</style>

      <div className="lad-swagger-root">
        <header className="lad-swagger-topbar">
          <h1>
            🔌 LAD API Explorer
            <span className="subtitle">Admin-only · test all four services</span>
          </h1>

          <div className="lad-swagger-tabs">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`lad-swagger-tab ${activeService === s.id ? 'active' : ''}`}
                onClick={() => setActiveService(s.id)}
              >
                {s.name}
                <span className="badge">{s.ops}</span>
              </button>
            ))}
          </div>

          <div className="lad-swagger-spacer" />

          <span className="lad-swagger-userpill">
            <strong>{currentUser.email || 'admin'}</strong> · {currentUser.role || 'admin'}
          </span>

          <div className="lad-swagger-authbox" title="Bearer token sent with every Try-it-out request. Pre-filled with your session token.">
            <span className={`indicator ${tokenInput ? 'set' : ''}`} />
            <label>Bearer</label>
            <input
              type={tokenVisible ? 'text' : 'password'}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                  saveToken();
                }
              }}
              onBlur={saveToken}
              placeholder="JWT"
              autoComplete="off"
            />
            <button
              type="button"
              className="lad-swagger-btnicon"
              onClick={() => setTokenVisible((v) => !v)}
              title="Show/hide token"
            >
              👁
            </button>
            <button
              type="button"
              className="lad-swagger-btnicon"
              onClick={clearToken}
              title="Clear token"
            >
              ✕
            </button>
          </div>
        </header>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {activeService === null && (
            <section className="lad-swagger-landing">
              <h2>Pick a service to explore</h2>
              <p className="lead">
                Each card opens an interactive Swagger UI. Endpoints are grouped by tag. Click any
                operation, hit <strong>Try it out</strong>, fill the parameters, and execute against
                the running service - your bearer token (set in the top bar, pre-filled with your
                session) is sent automatically.
              </p>
              <div className="lad-swagger-grid">
                {SERVICES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`lad-swagger-card ${s.id}`}
                    onClick={() => setActiveService(s.id)}
                    style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: 18,
                      cursor: 'pointer',
                      textAlign: 'left',
                      font: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    <div className="lad-swagger-cardhead">
                      <div className="lad-swagger-dot" />
                      <div>
                        <h3>{s.name}</h3>
                        <div className="tech">{s.tech}</div>
                      </div>
                    </div>
                    <div className="desc">{s.desc}</div>
                    <div className="stats">
                      <span>
                        <strong>{s.paths}</strong> paths
                      </span>
                      <span>
                        <strong>{s.ops}</strong> operations
                      </span>
                      <span className="port">localhost:{s.port}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {activeService !== null && (
            <>
              <div className="lad-swagger-uihead">
                <button
                  type="button"
                  className="lad-swagger-back"
                  onClick={() => setActiveService(null)}
                >
                  ← All services
                </button>
                <span className="lad-swagger-crumb">
                  <strong>
                    {SERVICES.find((s) => s.id === activeService)?.name} (
                    {SERVICES.find((s) => s.id === activeService)?.tech})
                  </strong>
                </span>
                <span className="lad-swagger-crumb">·</span>
                <span className="lad-swagger-crumb">
                  localhost:{SERVICES.find((s) => s.id === activeService)?.port}
                </span>
              </div>
              <div ref={swaggerContainerRef} id="lad-swagger-ui" />
              {(!bundleReady || !presetReady) && (
                <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
                  Loading Swagger UI…
                </div>
              )}
            </>
          )}
        </main>

        {toast && <div className="lad-swagger-toast">{toast}</div>}
      </div>
    </>
  );
}
