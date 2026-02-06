"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, Search, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/app-toaster";
import {
  useCampaignLeads,
  type CampaignLead,
  useCampaign,
  useLeadsSummaries,
  useRevealLeadEmail,
  useRevealLeadLinkedIn,
  useLeadProfileSummary,
  useGenerateLeadProfileSummary,
} from "@lad/frontend-features/campaigns";
import { useApolloLeads } from "@lad/frontend-features/apollo-leads";
import { EmployeeCard, ProfileSummaryDialog } from "@/components/campaigns";
import { safeStorage } from "@/utils/storage";
import { motion } from "framer-motion";
// Extended CampaignLead interface for UI needs
interface ExtendedCampaignLead extends CampaignLead {
  apollo_person_id: string;
  lead_data?: any;
  custom_fields?: any;
  profile_summary?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  company?: string;
  photo_url?: string;
  is_inbound?: boolean;
}
export default function CampaignLeadsPage() {
  const params = useParams();
  const router = useRouter();
    //   const campaignId = params.id as string;
    // TODO: Once leads api done will update this code
  const campaignId = "85134050-5fca-40d9-8c99-46bedd55b814";
  const { push } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  // Fetch campaign to get campaign_type
  const { data: campaign, isLoading: campaignLoading } = useCampaign(
    "85134050-5fca-40d9-8c99-46bedd55b814",
  );
  const isInboundCampaign = campaign?.campaign_type === "inbound";

  // Use SDK hook for leads
  const {
    leads: campaignLeads,
    loading: leadsLoading,
    error: leadsError,
    refetch,
  } = useCampaignLeads("85134050-5fca-40d9-8c99-46bedd55b814");

  // Convert to extended type for UI
  const leads = (campaignLeads || []) as ExtendedCampaignLead[];
  const loading = leadsLoading || campaignLoading;

  // Fetch summaries for all leads using SDK hook
  const leadIds = leads.map(lead => lead.id);
  const { summaries } = useLeadsSummaries(campaignId, leadIds);

  // Use Apollo Leads SDK for reveal operations
  const apolloLeads = useApolloLeads();

  // Use campaigns SDK for reveal email and LinkedIn
  const revealEmailMutation = useRevealLeadEmail();
  const revealLinkedInMutation = useRevealLeadLinkedIn();
  const generateSummaryMutation = useGenerateLeadProfileSummary();

  // Debug: Log first lead to check photo_url
  useEffect(() => {
    if (leads.length > 0) {
      console.log("First lead data:", leads[0]);
      console.log("Photo URL:", leads[0].photo_url);
    }
  }, [leads]);
  // Note: Pagination would ideally come from SDK
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  // Reveal state for employee contacts
  const [revealedContacts, setRevealedContacts] = useState<
    Record<string, { phone?: boolean; email?: boolean; linkedin?: boolean }>
  >({});
  const [revealingContacts, setRevealingContacts] = useState<
    Record<string, { phone?: boolean; email?: boolean; linkedin?: boolean }>
  >({});
  const [revealedValues, setRevealedValues] = useState<
    Record<string, { phone?: string; email?: string; linkedin_url?: string }>
  >({});
  // Type-safe state setters
  const setRevealedContactsSafe = (
    updater: (
      prev: Record<
        string,
        { phone?: boolean; email?: boolean; linkedin?: boolean }
      >,
    ) => Record<
      string,
      { phone?: boolean; email?: boolean; linkedin?: boolean }
    >,
  ) => {
    setRevealedContacts(updater);
  };
  const setRevealingContactsSafe = (
    updater: (
      prev: Record<
        string,
        { phone?: boolean; email?: boolean; linkedin?: boolean }
      >,
    ) => Record<
      string,
      { phone?: boolean; email?: boolean; linkedin?: boolean }
    >,
  ) => {
    setRevealingContacts(updater);
  };
  // Profile summary dialog state
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] =
    useState<ExtendedCampaignLead | null>(null);
  const [profileSummary, setProfileSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  useEffect(() => {
    if (leadsError) {
      push({
        variant: "error",
        title: "Error",
        description: typeof leadsError === "string" ? leadsError : (leadsError instanceof Error ? leadsError.message : "Failed to load leads"),
      });
    }
  }, [leadsError, push]);
  // Update total when leads change (this would ideally come from SDK)
  useEffect(() => {
    if (leads) {
      setTotal(leads.length);
      setTotalPages(Math.ceil(leads.length / 50));
    }
  }, [leads]);

  const handleRevealPhone = async (employee: ExtendedCampaignLead) => {
    const idKey = employee.id || employee.name || "";
    setRevealingContactsSafe((prev) => ({
      ...prev,
      [idKey]: { ...prev[idKey], phone: true },
    }));
    try {
      const phone = await apolloLeads.revealPhone(employee.id);
      if (phone) {
        // Store the revealed phone value
        setRevealedValues((prev) => ({
          ...prev,
          [idKey]: { ...prev[idKey], phone },
        }));
        setRevealedContactsSafe((prev) => ({
          ...prev,
          [idKey]: { ...prev[idKey], phone: true },
        }));
        push({ title: "Success", description: "Phone number revealed" });
      } else {
        push({ title: "Error", description: "Failed to reveal phone number" });
      }
    } catch (error) {
      push({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to reveal phone",
      });
    } finally {
      setRevealingContactsSafe((prev) => ({
        ...prev,
        [idKey]: { ...prev[idKey], phone: false },
      }));
    }
  };
  const handleRevealEmail = async (employee: ExtendedCampaignLead) => {
    const idKey = employee.id || employee.name || "";
    setRevealingContactsSafe((prev) => ({
      ...prev,
      [idKey]: { ...prev[idKey], email: true },
    }));
    try {
      const result = await revealEmailMutation.mutateAsync({
        campaignId,
        leadId: employee.id,
        apolloPersonId: employee.apollo_person_id || employee.id,
      });
      
      // Store the revealed email value
      setRevealedValues((prev) => ({
        ...prev,
        [idKey]: { ...prev[idKey], email: result.email },
      }));
      setRevealedContactsSafe((prev) => ({
        ...prev,
        [idKey]: { ...prev[idKey], email: true },
      }));

      // Update the employee object with enriched email
      employee.enriched_email = result.email;
      employee.email = result.email;

      push({
        title: "Success",
        description: result.from_cache
          ? "Email retrieved (no credits used)"
          : `Email revealed (${result.credits_used} credit${result.credits_used !== 1 ? "s" : ""} used)`,
      });

      // Trigger re-render
      refetch();
    } catch (error) {
      push({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to reveal email",
      });
    } finally {
      setRevealingContactsSafe((prev) => ({
        ...prev,
        [idKey]: { ...prev[idKey], email: false },
      }));
    }
  };

  const handleRevealLinkedIn = async (employee: ExtendedCampaignLead) => {
    const idKey = employee.id || employee.name || "";
    setRevealingContactsSafe((prev) => ({
      ...prev,
      [idKey]: { ...prev[idKey], linkedin: true },
    }));
    try {
      const result = await revealLinkedInMutation.mutateAsync({
        campaignId,
        leadId: employee.id,
      });
      
      // Store the revealed LinkedIn URL value
      setRevealedValues((prev) => ({
        ...prev,
        [idKey]: { ...prev[idKey], linkedin_url: result.linkedin_url },
      }));
      setRevealedContactsSafe((prev) => ({
        ...prev,
        [idKey]: { ...prev[idKey], linkedin: true },
      }));

      // Update the employee object with the revealed LinkedIn URL
      employee.linkedin_url = result.linkedin_url;
      employee.enriched_linkedin_url = result.linkedin_url;

      push({
        title: "Success",
        description: result.from_database
          ? "LinkedIn profile retrieved (no credits used)"
          : "LinkedIn profile revealed",
      });
    } catch (error) {
      push({
        title: "Info",
        description:
          error instanceof Error ? error.message : "LinkedIn URL not available for this lead",
      });
    } finally {
      setRevealingContactsSafe((prev) => ({
        ...prev,
        [idKey]: { ...prev[idKey], linkedin: false },
      }));
    }
  };

  const handleViewSummary = async (employee: ExtendedCampaignLead) => {
    setSelectedEmployee(employee);
    setSummaryDialogOpen(true);
    setProfileSummary(null);
    setSummaryError(null);
    setSummaryLoading(true);

    try {
      // Try to generate/get summary using SDK
      const result = await generateSummaryMutation.mutateAsync({
        campaignId,
        leadId: employee.id,
        profileData: {
          ...employee,
          name:
            employee.name ||
            `${employee.first_name || ""} ${employee.last_name || ""}`.trim(),
          title: employee.title,
          company: employee.company,
          email: employee.email,
          phone: employee.phone,
          linkedin_url: employee.linkedin_url,
        },
      });
      
      setProfileSummary(result.summary);
    } catch (error: any) {
      console.error("[Profile Summary] Error:", error);
      setSummaryError(error.message || "Failed to load profile summary");
      push({
        variant: "error",
        title: "Error",
        description: error.message || "Failed to load profile summary",
      });
    } finally {
      setSummaryLoading(false);
    }
  };
  const handleCloseSummaryDialog = () => {
    setSummaryDialogOpen(false);
    setSelectedEmployee(null);
    setProfileSummary(null);
    setSummaryError(null);
  };
  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads;
    const query = searchTerm.toLowerCase().trim();
    return leads.filter(
      (lead) =>
        lead.name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.company?.toLowerCase().includes(query) ||
        lead.title?.toLowerCase().includes(query),
    );
  }, [leads, searchTerm]);
  if (loading && leads.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col gap-4 items-center">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Loading leads...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full h-screen overflow-auto bg-slate-50">
      <div className="p-6 pb-12">
        {/* Header */}

        <div className="mb-5 flex flex-col sm:flex-row justify-between mt-10 items-stretch sm:items-center gap-2 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-[#1E293B] mb-1">
              Campaign Leads
            </h1>
            <p className="text-sm text-slate-500">
              {filteredLeads.length} leads
            </p>
          </div>
          <Button
            onClick={() => router.push("/campaigns")}
            className="bg-[#0b1957] text-white rounded-xl font-semibold px-3 py-1.5 shadow-[0_4px_20px_rgba(11,25,87,0.3)] w-full sm:w-auto hover:bg-[#0a1540] hover:shadow-[0_8px_30px_rgba(11,25,87,0.5)]"
          >
            <ArrowLeft />
            Back
          </Button>
        </div>
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              className="pl-10 bg-white rounded-xl"
              placeholder="Search leads by name, email, company, or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        {/* Employee Cards Grid */}
        {filteredLeads.length === 0 ? (
          <Card className="rounded-2xl border border-slate-200 shadow-sm">
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h6 className="text-lg font-semibold text-slate-500 mb-2">
                {searchTerm ? "No leads match your search" : "No leads found"}
              </h6>
              <p className="text-sm text-slate-400">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Leads will appear here once the campaign starts generating them"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.05
                  }
                }
              }}
            >
              {filteredLeads.map((lead: CampaignLead, index: number) => {
                return (
                  <motion.div
                    key={lead.id}
                    variants={{
                      hidden: { 
                        opacity: 0, 
                        y: 20,
                        scale: 0.95
                      },
                      visible: { 
                        opacity: 1, 
                        y: 0,
                        scale: 1,
                        transition: {
                          duration: 0.4,
                          ease: [0.25, 0.46, 0.45, 0.94]
                        }
                      }
                    }}
                    whileHover={{ 
                      y: -8,
                      scale: 1.02,
                      transition: { 
                        duration: 0.2,
                        ease: "easeOut"
                      }
                    }}
                  >
                    <EmployeeCard
                      employee={{
                        id: lead.id,
                        name: lead.name,
                        first_name: lead.first_name,
                        last_name: lead.last_name,
                        title: lead.title,
                        email: lead.email,
                        phone: lead.phone,
                        linkedin_url: lead.linkedin_url,
                        enriched_email: lead.enriched_email,
                        enriched_linkedin_url: lead.enriched_linkedin_url,
                        photo_url: lead.photo_url, // Backend already extracts this from lead_data.photo_url
                        is_inbound: lead.is_inbound, // Pass is_inbound flag from backend
                      }}
                      employeeViewMode="grid"
                      revealedContacts={revealedContacts}
                      revealingContacts={revealingContacts}
                      handleRevealPhone={handleRevealPhone}
                      handleRevealEmail={handleRevealEmail}
                      handleRevealLinkedIn={handleRevealLinkedIn}
                      onViewSummary={handleViewSummary}
                      profileSummary={summaries?.get(lead.id) || lead.profile_summary || null}
                      hideUnlockFeatures={isInboundCampaign} // Hide unlock features for inbound campaigns
                    />
                  </motion.div>
                );
              })}
            </motion.div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-4 mt-8">
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  variant="outline"
                >
                  Previous
                </Button>
                <p className="flex items-center text-slate-500">
                  Page {page} of {totalPages}
                </p>
                <Button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
        {/* Profile Summary Dialog */}
        <ProfileSummaryDialog
          open={summaryDialogOpen}
          onClose={handleCloseSummaryDialog}
          employee={selectedEmployee}
          summary={profileSummary}
          loading={summaryLoading}
          error={summaryError}
        />
      </div>
    </div>
  );
}
