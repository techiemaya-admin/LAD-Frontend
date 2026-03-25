/**
 * Business Profile Proxy
 * GET /api/whatsapp-conversations/conversations/:id/business-profile → Returns empty profile (not yet implemented)
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Business profile endpoint is not yet implemented in the Python service
  // Return a success response with empty data so the frontend can continue functioning gracefully
  return NextResponse.json(
    {
      success: true,
      data: {
        company_name: null,
        industry: null,
        designation: null,
        services_offered: null,
        ideal_customer_profile: null,
        email: null,
        website_url: null,
        website_about: null,
        website_clients: null,
        website_services: null,
        icp_top_clients: null,
        icp_decision_maker: null,
        icp_ideal_referrals: null,
        icp_extra: null,
        kpi_members_met: null,
        kpi_referrals_given: null,
        kpi_referrals_received: null,
        kpi_one_to_ones: null,
        kpi_visitors_invited: null,
      },
    },
    { status: 200 }
  );
}
