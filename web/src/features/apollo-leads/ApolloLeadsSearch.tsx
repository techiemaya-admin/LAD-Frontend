'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useFeatureFlag, FeatureGate } from '../../featureFlags';

interface Company {
  id: string;
  name: string;
  website: string;
  industry: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  size: number;
  description: string;
  technologies: string[];
}

interface SearchFilters {
  keywords: string[];
  industry: string;
  location: string;
  company_size: string;
  revenue_range: string;
  technology: string;
}

const ApolloLeadsSearch: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeywords, setSearchKeywords] = useState('');
  const [filters, setFilters] = useState<Partial<SearchFilters>>({});
  const [showFilters, setShowFilters] = useState(false);

  const { isEnabled, loading: featureLoading } = useFeatureFlag('apollo_leads', 'admin');

  const handleSearch = async () => {
    if (!searchKeywords.trim()) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        keywords: searchKeywords,
        limit: '50',
        page: '1',
        ...filters
      });

      const response = await fetch(`/api/apollo-leads/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setCompanies(data.data);
      } else {
        console.error('Search failed:', data.message);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelect = (company: Company) => {
    // Navigate to company details or trigger lead generation
    console.log('Selected company:', company);
  };

  if (featureLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <FeatureGate 
      feature="apollo_leads" 
      userGroup="admin"
      fallback={
        <Card className="m-6">
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Apollo Leads Not Available</h3>
            <p className="text-muted-foreground">
              This feature is not available for your current plan. 
              Please upgrade to access Apollo.io lead generation.
            </p>
          </CardContent>
        </Card>
      }
    >
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Apollo Lead Search</h1>
            <p className="text-muted-foreground">
              Find companies and generate leads using Apollo.io
            </p>
          </div>
          <Badge variant="secondary">
            {companies.length} Companies Found
          </Badge>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Company Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter keywords (e.g., healthcare, fintech, AI)"
                  value={searchKeywords}
                  onChange={(e) => setSearchKeywords(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="flex items-center gap-2"
              >
                Filters
              </Button>
              <Button onClick={handleSearch} disabled={loading || !searchKeywords.trim()}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
                <Input
                  placeholder="Industry"
                  value={filters.industry || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, industry: e.target.value }))}
                />
                <Input
                  placeholder="Location"
                  value={filters.location || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                />
                <Input
                  placeholder="Company Size"
                  value={filters.company_size || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, company_size: e.target.value }))}
                />
                <Input
                  placeholder="Revenue Range"
                  value={filters.revenue_range || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, revenue_range: e.target.value }))}
                />
                <Input
                  placeholder="Technology"
                  value={filters.technology || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, technology: e.target.value }))}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <Card 
              key={company.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCompanySelect(company)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {company.name}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {company.size} employees
                  </div>
                  <div className="flex items-center gap-1">
                    {company.location.city}, {company.location.country}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {company.description}
                  </p>
                  
                  {company.industry && (
                    <Badge variant="secondary">{company.industry}</Badge>
                  )}

                  {company.technologies && company.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {company.technologies.slice(0, 3).map((tech, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                      {company.technologies.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{company.technologies.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      Get Emails
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Get Phones
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {!loading && companies.length === 0 && searchKeywords && (
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">No Companies Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search keywords or filters to find more results.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </FeatureGate>
  );
};

export default ApolloLeadsSearch;