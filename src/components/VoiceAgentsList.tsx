import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Briefcase, Plus, ChevronRight } from "lucide-react";
import { logger } from "@/lib/logger";
import { apiGet } from "@/lib/api";

interface Agent {
  id: string;
  name: string;
  status: "active" | "draft" | "Active" | "Draft";
  language: string;
  [key: string]: any;
}

export function VoiceAgentsList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchAgents = async () => {
      try {
        setLoading(true);
        logger.debug("🔍 Fetching agents from /api/voice-agent/user/available-agents");

        const data = await apiGet<Agent[]>("/api/voice-agent/user/available-agents", {
          signal: abortController.signal
        });

        logger.debug("✅ Agents fetched successfully:", data);
        setAgents(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          const errorMsg = err instanceof Error ? err.message : "Failed to fetch agents";
          logger.debug("❌ Error fetching agents:", { errorMsg, err });
          setError(errorMsg);
          setAgents([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();

    return () => {
      abortController.abort();
    };
  }, []);

  const normalizeStatus = (status: string) => {
    return status.toLowerCase() === "active" ? "Active" : "Draft";
  };

  const handleCreateAgent = () => {
    logger.debug("Creating new agent...");
    // Navigate to create agent page
  };

  return (
    <div className="w-full max-w-md bg-white rounded-lg p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Voice Agents</h1>
        <p className="text-gray-500 mt-1">Select or create an agent</p>
      </div>

      <button
        onClick={handleCreateAgent}
        className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 px-4 rounded-full flex items-center justify-center gap-2 mb-6 transition-colors"
      >
        <Plus size={20} />
        Create New Agent
      </button>

      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading agents...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && agents.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No agents available</p>
        </div>
      )}

      {!loading && !error && agents.length > 0 && (
        <div className="space-y-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className={cn(
                "flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer hover:bg-gray-50"
              )}
              onClick={() => logger.debug("Selected agent:", agent.id)}
            >
              <div className="flex items-center gap-3 flex-1">
                <Briefcase size={20} className="text-gray-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded",
                        normalizeStatus(agent.status) === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {normalizeStatus(agent.status)}
                    </span>
                    <span className="text-xs text-gray-500 px-2 py-1">
                      {agent.language}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
