"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/app-toaster";
import { logger } from "@/lib/logger";
import { CallConfiguration } from "../../components/CallConfiguration";
import { CallOptions } from "../../components/CallOptions";
import { getCurrentUser } from "@/lib/auth";
import { 
  useUserAvailableNumbers, 
  useAvailableAgents, 
  useResolvePhones 
} from "@sdk/features/voice-agent/features/voice-agent";

type NumberItem = {
  id: string;
  phone_number: string;
  provider?: string;
  type?: string;
  status?: string;
  label?: string;
  assignedAgentId?: string;
  e164?: string;
};

type VoiceAgent = {
  id: string;
  name: string;
  language: string;
  accent: string;
  gender: string;
  provider: string;
  description?: string;
  voice_sample_url?: string | null;
};

type BulkEntry = {
  to_number: string;
  name?: string;
  company_name?: string;
  summary?: string;
  requested_id?: string;
};

export default function MakeCallContent() {
  const params = useSearchParams();
  const { push } = useToast();

  // ----- Query params -----
  const qpDial = params.get("dial") || "";
  const qpClientName = params.get("clientName") || "";
  const qpPrefilled = params.get("prefilled") === "1";
  const qpBulk = params.get("bulk") || ""; // "1" => bulk mode
  const qpIds = params.get("ids"); // either comma-separated IDs or legacy base64(JSON)
  const qpSeed = params.get("seed"); // legacy fallback (optional)
  const qpSummary = params.get("summary") || params.get("sales_summary") || "";
  const qpType = params.get("type") || "company";



  // ----- Data state -----
  const [numbers, setNumbers] = useState<NumberItem[]>([]);
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [uniqueAccents, setUniqueAccents] = useState<string[]>([]);

  // ----- Selections -----
  const [selectedNumberId, setSelectedNumberId] = useState<string | undefined>();
  const [agentId, setAgentId] = useState<string | undefined>();
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>("en");
  const [selectedAccentId, setSelectedAccentId] = useState<string | undefined>();

  // ----- Single-call fields -----
  const [dial, setDial] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");

  // ----- Bulk -----
  const [useCsv, setUseCsv] = useState<boolean>(false);
  const [bulkEntries, setBulkEntries] = useState<BulkEntry[]>([]);

  const sanitizePhoneNumber = (phone: string): string =>
    phone ? String(phone).replace(/\s+/g, "") : "";

  const normalizeE164Like = (phone: unknown): string => {
    const s = sanitizePhoneNumber(String(phone ?? "").trim());
    // Defensive: if backend accidentally returns "++<digits>", collapse to "+<digits>".
    return s.replace(/^\+{2,}/, "+");
  };

  const setBulkEntriesSanitized = (
    entries: BulkEntry[] | ((prev: BulkEntry[]) => BulkEntry[])
  ) => {
    if (typeof entries === "function") {
      setBulkEntries((prev) => {
        const result = entries(prev);
        return result.map((entry) => ({
          ...entry,
          to_number: sanitizePhoneNumber(entry.to_number),
        }));
      });
    } else {
      setBulkEntries(
        entries.map((entry) => ({
          ...entry,
          to_number: sanitizePhoneNumber(entry.to_number),
        }))
      );
    }
  };

  const [dataSource, setDataSource] =
    useState<"backend" | "file" | "localStorage">("localStorage");
  const [dataType, setDataType] = useState<"company" | "employee">("company");

  const [loading, setLoading] = useState<boolean>(false);
  const [additionalInstructions, setAdditionalInstructions] =
    useState<string>("");
  const [initiatedBy, setInitiatedBy] = useState<string | undefined>(
    undefined
  );

  // User ID (UUID) - backend uses JWT req.user.id, so this is mainly for local state
  const [voiceAgentUserId, setVoiceAgentUserId] = useState<string | null>(null);

  // SDK Hooks for fetching numbers and agents
  const { data: availableNumbers = [], isLoading: numbersLoading, error: numbersError } = useUserAvailableNumbers();
  const { data: availableAgents = [], isLoading: agentsLoading, error: agentsError } = useAvailableAgents();

  // Get user ID from /auth/me (architecture-compliant: core platform returns user.id)
  useEffect(() => {
    (async () => {
      try {
        const meAny: any = await getCurrentUser();
        logger.debug("[make-call] User authenticated", { hasUser: !!meAny });
        // Use user.id from response (UUID format, not number)
        const userId = meAny?.user?.id || meAny?.id;
        if (userId) {
          logger.debug("[make-call] Setting initiatedBy userId");
          setInitiatedBy(userId);
          setVoiceAgentUserId(userId);
        }
      } catch (e) {
        logger.warn(
          "/api/auth/me failed or unauthenticated; proceeding without user ID"
        );
      }
    })();
  }, []);

  // Seed single-call from query params
  useEffect(() => {
    if (qpDial || qpClientName) {
      setDial(qpDial);
      setClientName(qpClientName);
      setUseCsv(false);
      setBulkEntries([]);
      if (qpSummary) {
        setAdditionalInstructions(qpSummary);
      }
    }
  }, [qpDial, qpClientName, qpSummary]);

  // ids → /resolve-phones
  useEffect(() => {
    (async () => {
      if (!qpIds) return;

      try {
        let ids: unknown;
        const decoded = decodeURIComponent(qpIds).trim();

        // Try base64(JSON)
        try {
          const maybeJson = atob(decoded);
          const parsed = JSON.parse(maybeJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            ids = parsed;
          }
        } catch {
          /* ignore */
        }

        // Fallback: comma-separated
        if (!ids && decoded.includes(",")) {
          ids = decoded
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }

        // Fallback: JSON array literal
        if (!ids && decoded.startsWith("[")) {
          try {
            const parsed = JSON.parse(decoded);
            if (Array.isArray(parsed) && parsed.length > 0) {
              ids = parsed;
            }
          } catch {
            /* ignore */
          }
        }

        // Last resort: single id
        if (!ids) {
          ids = decoded ? [decoded] : [];
        }

        if (!Array.isArray(ids) || ids.length === 0) {
          logger.debug("[make-call] No valid ids parsed from qpIds, skipping resolve-phones.");
          return;
        }

        let idsPayload: any[] = [];
        if (qpType === "employee") {
          const idSet = new Set<string>();
          for (let item of ids as any[]) {
            try {
              if (
                typeof item === "string" &&
                item.trim().startsWith("{")
              ) {
                item = JSON.parse(item);
              }
            } catch {
              /* ignore */
            }
            if (item && typeof item === "object") {
              const apollo_person_id =
                item.apollo_person_id ?? item.person_id ?? item.id;
              const apollo_organization_id =
                item.apollo_organization_id ??
                item.organization_id ??
                item.company_id ??
                (item.organization &&
                  (item.organization.id || item.organization.organization_id));
              if (apollo_person_id) idSet.add(String(apollo_person_id));
              if (apollo_organization_id)
                idSet.add(String(apollo_organization_id));
              continue;
            }
            if (item !== undefined && item !== null) {
              const pid = String(item).trim();
              if (pid) idSet.add(pid);
            }
          }
          idsPayload = Array.from(idSet);
        } else {
          idsPayload = (ids as any[])
            .map((v) =>
              v === undefined || v === null ? null : String(v).trim()
            )
            .filter((v) => Boolean(v));
        }

        if (!Array.isArray(idsPayload) || idsPayload.length === 0) {
          logger.debug("[make-call] Parsed ids are all empty after normalization; skipping.");
          return;
        }

        setLoading(true);

        // Use SDK service directly for resolvePhones
        const voiceAgentService = (
          await import("@sdk/features/voice-agent/features/voice-agent/services/voiceAgentService")
        ).default;
        const json = await voiceAgentService.resolvePhones(idsPayload, qpType as 'company' | 'employee');

        const totalResolved = Array.isArray(json)
          ? json.length
          : 0;

        const rows: BulkEntry[] = (Array.isArray(json)
          ? json
            .filter((row: any) => row?.phone)
            .map((row: any) => ({
              to_number: String(row.phone).trim().replace(/\s+/g, ""),

              name:
                (typeof row.name === "string" && row.name.trim()) ||
                (typeof row.employee_name === "string" &&
                  row.employee_name.trim()) ||
                (typeof row.company_name === "string" &&
                  row.company_name.trim()) ||
                undefined,

              company_name:
                row.company_name ||
                row.raw?.organization?.name ||
                row.raw?.organization?.display_name ||
                row.raw?.organization?.companyName ||
                row.raw?.rawData?.companyName ||
                undefined,

              requested_id: row.requested_id || undefined,

              summary:
                (qpType === "employee"
                  ? row.company_sales_summary ||
                    row.employee?.company_sales_summary
                  : row.sales_summary ||
                    row.company?.sales_summary) || undefined,
            }))
          : []);

        // Dedupe by phone + name/company
        const deduped: BulkEntry[] = [];
        const seen = new Set<string>();

        for (const r of rows) {
          const key =
            r.to_number + "|" + (r.name || r.company_name || "");
          if (!seen.has(key)) {
            seen.add(key);
            deduped.push(r);
          }
        }

        const sanitizedBulkEntries = deduped.map((entry) => ({
          ...entry,
          to_number: entry.to_number.replace(/\s+/g, ""),
        }));
        setBulkEntriesSanitized(sanitizedBulkEntries);

        if (deduped[0]?.to_number) {
          setDial(deduped[0].to_number);
          setClientName(
            deduped[0].name || deduped[0].company_name || ""
          );
        }
        if (deduped[0]?.summary) {
          setAdditionalInstructions(deduped[0].summary);
        }

        const first = rows[0];

        setDataSource("backend");
        setDataType(qpType === "employee" ? "employee" : "company");

        const loadedCount = rows.length;
        const skippedCount = Math.max(0, totalResolved - loadedCount);

        if (loadedCount > 1 || qpBulk === "1") {
          setUseCsv(true);
          setBulkEntriesSanitized(rows);
          if (first) {
            setDial(first.to_number);
            setClientName(first.name ?? first.company_name ?? "");
          }
          const parts = [`Loaded ${loadedCount} number(s)`];
          if (skippedCount > 0)
            parts.push(`${skippedCount} without phone skipped`);
          push({
            title: "Targets Loaded",
            description: `${parts.join(", ")} from resolve-phones.`,
          });
        } else if (loadedCount === 1) {
          setUseCsv(false);
          setBulkEntries([]);
          setDial(first?.to_number ?? "");
          setClientName(first?.name ?? first?.company_name ?? "");
          if (first?.summary) setAdditionalInstructions(first.summary);
          const parts = ["Loaded 1 number"];
          if (skippedCount > 0)
            parts.push(`${skippedCount} without phone skipped`);
          push({
            title: "Targets Loaded",
            description: `${parts.join(", ")} from resolve-phones.`,
          });
        } else {
          setUseCsv(false);
          setBulkEntries([]);
          push({
            variant: "warning",
            title: "No Usable Targets",
            description:
              totalResolved > 0
                ? "All resolved rows missing phone numbers."
                : "No targets resolved.",
          });
        }
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Failed loading target(s)";
        logger.error("[make-call] ids/resolve-phones failed", { error: msg });
        push({ variant: "error", title: "Error", description: msg });
      } finally {
        setLoading(false);
      }
    })();
  }, [qpIds, qpBulk, qpType, push]);

  // Fallbacks if no ids: localStorage / seed
  useEffect(() => {
    if (qpIds) return;

    try {
      let raw =
        localStorage.getItem("bulk_call_targets") ||
        localStorage.getItem("make_call_targets");

      let arrayLike: any[] | undefined;

      if (raw) {
        const parsed = JSON.parse(raw);
        arrayLike =
          (Array.isArray(parsed?.items) && parsed.items) ||
          (Array.isArray(parsed?.data) && parsed.data) ||
          (Array.isArray(parsed) ? parsed : undefined);
      }

      if ((!arrayLike || arrayLike.length === 0) && qpSeed) {
        try {
          const seedDecoded = JSON.parse(
            atob(decodeURIComponent(qpSeed))
          );
          if (Array.isArray(seedDecoded)) arrayLike = seedDecoded;
        } catch {
          /* ignore */
        }
      }

      if (Array.isArray(arrayLike) && arrayLike.length > 0) {
        const normalized: BulkEntry[] = arrayLike
          .filter((it: any) => it && (it.phone || it.to || it.number))
          .map((it: any) => ({
            to_number: String(it.phone || it.to || it.number).replace(
              /\s+/g,
              ""
            ),
            name: it.name || it.lead_name || it.leadName || undefined,
            summary: it.sales_summary || it.summary || undefined,
            company_name: it.company_name || undefined,
            requested_id: it.requested_id || undefined,
          }));

        const first = normalized[0];

        if (qpBulk === "1" || normalized.length > 1) {
          setUseCsv(true);
          setBulkEntries(normalized);
          setDataSource("localStorage");
          if (first) {
            setDial(first.to_number);
            setClientName(first.name ?? "");
            if (normalized.length === 1 && first.summary) {
              setAdditionalInstructions(first.summary);
            }
          }
        } else {
          setUseCsv(false);
          setBulkEntries([]);
          setDataSource("localStorage");
          setDial(first?.to_number ?? "");
          setClientName(first?.name ?? "");
          if (first?.summary) {
            setAdditionalInstructions(first.summary);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, [qpSeed, qpBulk, qpIds]);

  // 🔥 Sync SDK hook data to local state
  // Numbers should load even if agents API fails
  useEffect(() => {
    if (!voiceAgentUserId) return;

    // 1) Handle available numbers from SDK hook
    if (availableNumbers && availableNumbers.length > 0) {
      const formatted = (availableNumbers || []).map((n: any) => ({
        id: String(n.id),
        phone_number: normalizeE164Like(n.phone_number),
        provider: n.provider,
        type: n.type,
        assignedAgentId: n.assignedAgentId,
      })) as NumberItem[];

      setNumbers(formatted);

      logger.debug("[make-call] loaded available numbers", { count: formatted.length });

      if (formatted.length) {
        setSelectedNumberId((prev) => prev ?? formatted[0].id);
        if (formatted[0].assignedAgentId) {
          setAgentId(
            (prev) => prev ?? String(formatted[0].assignedAgentId)
          );
        }
      }
    }

    if (numbersError) {
      logger.error("[make-call] Failed to load numbers", { error: numbersError });
    }

    // 2) Handle available agents from SDK hook
    if (availableAgents && availableAgents.length > 0) {
      const voiceAgents: VoiceAgent[] = (availableAgents || []).map(
        (v: any) => ({
          id: String(v.agent_id ?? v.id),
          name: v.agent_name ?? v.name ?? "Unknown Agent",
          language: v.agent_language ?? v.language ?? "en",
          accent: v.accent ?? "",
          gender: v.gender ?? "",
          provider: v.provider ?? "",
          description: v.description,
          voice_sample_url: v.voice_sample_url || null,
        })
      );
      setAgents(voiceAgents);

      logger.debug("[make-call] loaded available agents", { count: voiceAgents.length });

      if (!agentId && voiceAgents.length) {
        setAgentId(voiceAgents[0].id);
      }

      const accents = Array.from(
        new Set(voiceAgents.map((a) => a.accent).filter(Boolean))
      ) as string[];
      setUniqueAccents(accents);
      if (accents.length > 0 && !selectedAccentId) {
        setSelectedAccentId(accents[0]);
      }
    }

    if (agentsError) {
      logger.warn("[make-call] Failed to load agents (non-fatal)", { error: agentsError });
    }
  }, [voiceAgentUserId, availableNumbers, availableAgents, numbersError, agentsError]);

  // Keep agent selection in sync with chosen number (if assigned)
  useEffect(() => {
    if (!selectedNumberId) return;
    const num = numbers.find((n) => n.id === selectedNumberId);
    if (num?.assignedAgentId) setAgentId(String(num.assignedAgentId));
  }, [selectedNumberId, numbers]);

  // Sync bulkEntries → localStorage
  useEffect(() => {
    if (
      bulkEntries.length > 0 &&
      (dataSource === "file" || dataSource === "localStorage")
    ) {
      try {
        localStorage.setItem(
          "bulk_call_targets",
          JSON.stringify({ data: bulkEntries })
        );
      } catch (e) {
        logger.warn("[make-call] Failed to sync to localStorage", { error: String(e) });
      }
    }
  }, [bulkEntries, dataSource]);

  const fromNumber = useMemo(
    () =>
      selectedNumberId
        ? numbers.find((n) => n.id === selectedNumberId)?.phone_number
        : undefined,
    [numbers, selectedNumberId]
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CallConfiguration
            numbers={numbers}
            agents={agents}
            selectedNumberId={selectedNumberId}
            onSelectedNumberChange={setSelectedNumberId}
            languages={[{ id: "en", label: "English", value: "en" }]}
            selectedLanguageId={selectedLanguageId}
            onSelectedLanguageChange={setSelectedLanguageId}
            selectedAccentId={selectedAccentId}
            onSelectedAccentChange={setSelectedAccentId}
            agentId={agentId}
            onAgentIdChange={setAgentId}
            additionalInstructions={additionalInstructions}
            onAdditionalInstructionsChange={setAdditionalInstructions}
          />

          <CallOptions
            useCsv={useCsv}
            onUseCsvChange={setUseCsv}
            dial={dial}
            onDialChange={setDial}
            clientName={clientName}
            onClientNameChange={setClientName}
            bulkEntries={bulkEntries}
            onBulkEntriesChange={setBulkEntriesSanitized}
            loading={loading}
            selectedNumberId={selectedNumberId}
            agentId={agentId}
            fromNumber={fromNumber}
            onLoadingChange={setLoading}
            additionalInstructions={additionalInstructions}
            isPrefilled={qpPrefilled}
            onAdditionalInstructionsChange={setAdditionalInstructions}
            initiatedBy={initiatedBy}
            dataSource={dataSource}
            dataType={dataType}
            onDataSourceChange={setDataSource}
          />
        </div>
      </div>
    </div>
  );
}
