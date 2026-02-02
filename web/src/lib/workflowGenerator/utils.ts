/**
 * Workflow Generator Utilities
 * 
 * Helper functions for workflow generation
 */
/**
 * Build lead generation filters from mapped answers
 * Maps ICP answers to Apollo API parameter names
 */
export function buildLeadGenerationFilters(mappedAnswers: Record<string, any>): Record<string, any> {
  const filters: Record<string, any> = {};
  // Map roles to person_titles (Apollo API expects person_titles)
  if (mappedAnswers.roles && mappedAnswers.roles.length > 0) {
    filters.person_titles = mappedAnswers.roles;
  }
  // Map industries to organization_industries (Apollo API expects organization_industries)
  if (mappedAnswers.industries && mappedAnswers.industries.length > 0) {
    const validIndustries = mappedAnswers.industries.filter((industry: string) => {
      const trimmed = String(industry).trim();
      return trimmed.length >= 2 && !trimmed.match(/^[a-z]$/i);
    });
    if (validIndustries.length > 0) {
      filters.organization_industries = validIndustries;
    }
  }
  // Map location to organization_locations (Apollo API expects organization_locations as array)
  if (mappedAnswers.location) {
    filters.organization_locations = Array.isArray(mappedAnswers.location)
      ? mappedAnswers.location
      : [mappedAnswers.location];
  }
  return filters;
}