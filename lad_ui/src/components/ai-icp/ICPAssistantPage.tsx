/**
 * ICP Assistant Page Component
 * Main container for AI-powered ICP definition and company search
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Building2, 
  Users, 
  Download, 
  Phone as PhoneIcon,
  Loader2,
  RefreshCw
} from 'lucide-react';
import AIChatSection from './AIChatSection';
import { CompanyGrid } from './CompanyCard';
import { EmployeeGrid } from './EmployeeCard';
import { mayaAIService, type MayaAIChatMessage, type MayaAISuggestedParams } from '@/services/mayaAIService';
import { apolloLeadsService, type ApolloCompany, type ApolloEmployee } from '@/services/apolloLeadsService';

export default function ICPAssistantPage() {
  const { toast } = useToast();
  
  // Chat state
  const [chatHistory, setChatHistory] = useState<MayaAIChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Search results
  const [companies, setCompanies] = useState<ApolloCompany[]>([]);
  const [employees, setEmployees] = useState<ApolloEmployee[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // Selection state
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());

  // Contact reveal state
  const [revealingContacts, setRevealingContacts] = useState<Map<string, 'email' | 'phone'>>(new Map());

  // Active tab
  const [activeTab, setActiveTab] = useState<'companies' | 'employees'>('companies');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /**
   * Handle user message
   */
  const handleSendMessage = useCallback(async (message: string) => {
    try {
      // Add user message to history
      const userMessage: MayaAIChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, userMessage]);
      setChatLoading(true);

      // Send to Maya AI
      const response = await mayaAIService.chat(
        message,
        chatHistory,
        activeTab === 'companies' ? companies : employees
      );

      // Add AI response to history
      const aiMessage: MayaAIChatMessage & { suggestedParams?: any; actionResult?: any } = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        suggestedParams: response.suggestedParams,
        actionResult: response.actionResult
      };
      setChatHistory(prev => [...prev, aiMessage]);

      // Handle action results
      if (response.actionResult) {
        toast({
          title: 'Action Completed',
          description: `${response.actionResult.type}: ${response.actionResult.count} items`
        });
      }

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setChatLoading(false);
    }
  }, [chatHistory, companies, employees, activeTab, toast]);

  /**
   * Handle apply parameters and trigger search
   */
  const handleApplyParams = useCallback(async (params: MayaAISuggestedParams) => {
    try {
      if (params.searchType === 'company') {
        // Company search
        setCompaniesLoading(true);
        setActiveTab('companies');
        
        const result = await apolloLeadsService.searchLeads({
          query: params.keywords,
          location: params.location,
          company_size: params.companySize,
          max_results: 100,
          page: 1
        });

        setCompanies(result.companies);
        setCurrentPage(result.page);
        setTotalPages(Math.ceil(result.totalFound / 100));

        toast({
          title: 'Search Complete',
          description: `Found ${result.companies.length} companies${result.fromCache ? ' (from cache)' : ''}`
        });

      } else if (params.searchType === 'employee') {
        // Employee search
        setEmployeesLoading(true);
        setActiveTab('employees');
        
        const result = await apolloLeadsService.searchEmployees({
          person_titles: params.personTitles,
          company_keywords: params.companyKeywords,
          location: params.location,
          per_page: 25,
          page: 1
        });

        setEmployees(result.employees);
        toast({
          title: 'Employee Search Complete',
          description: `Found ${result.employees.length} employees`
        });
      }

    } catch (error: any) {
      toast({
        title: 'Search Failed',
        description: error.message || 'Failed to perform search',
        variant: 'destructive'
      });
    } finally {
      setCompaniesLoading(false);
      setEmployeesLoading(false);
    }
  }, [toast]);

  /**
   * Handle company selection
   */
  const handleSelectCompany = useCallback((companyId: string, selected: boolean) => {
    setSelectedCompanies(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(companyId);
      } else {
        newSet.delete(companyId);
      }
      return newSet;
    });
  }, []);

  /**
   * Handle employee selection
   */
  const handleSelectEmployee = useCallback((employeeId: string, selected: boolean) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(employeeId);
      } else {
        newSet.delete(employeeId);
      }
      return newSet;
    });
  }, []);

  /**
   * Handle contact reveal
   */
  const handleRevealContact = useCallback(async (employeeId: string, type: 'email' | 'phone') => {
    try {
      setRevealingContacts(prev => new Map(prev).set(employeeId, type));

      const result = await apolloLeadsService.revealContact(employeeId, type);

      // Update employee data
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId 
          ? { ...emp, [type]: result[type], revealed: true }
          : emp
      ));

      toast({
        title: 'Contact Revealed',
        description: `${type} revealed successfully (8 credits used)`
      });

    } catch (error: any) {
      toast({
        title: 'Reveal Failed',
        description: error.message || `Failed to reveal ${type}`,
        variant: 'destructive'
      });
    } finally {
      setRevealingContacts(prev => {
        const newMap = new Map(prev);
        newMap.delete(employeeId);
        return newMap;
      });
    }
  }, [toast]);

  /**
   * Reset conversation
   */
  const handleResetConversation = useCallback(async () => {
    try {
      await mayaAIService.resetConversation();
      setChatHistory([]);
      toast({
        title: 'Conversation Reset',
        description: 'Started a new conversation'
      });
    } catch (error: any) {
      toast({
        title: 'Reset Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  }, [toast]);

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background">
      {/* Chat Section */}
      <div className="lg:w-[40%] border-r flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Agent Maya</h2>
          <Button variant="ghost" size="sm" onClick={handleResetConversation}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
        <AIChatSection
          onSendPrompt={handleSendMessage}
          onApplyParams={handleApplyParams}
          loading={chatLoading}
          chatHistory={chatHistory}
          className="flex-1"
        />
      </div>

      {/* Results Section */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Search Results</h2>
            <div className="flex items-center space-x-2">
              {selectedCompanies.size > 0 && (
                <Badge variant="secondary">
                  {selectedCompanies.size} companies selected
                </Badge>
              )}
              {selectedEmployees.size > 0 && (
                <Badge variant="secondary">
                  {selectedEmployees.size} employees selected
                </Badge>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="companies">
                <Building2 className="h-4 w-4 mr-2" />
                Companies ({companies.length})
              </TabsTrigger>
              <TabsTrigger value="employees">
                <Users className="h-4 w-4 mr-2" />
                Employees ({employees.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'companies' ? (
            <CompanyGrid
              companies={companies}
              selectedCompanies={selectedCompanies}
              onSelectCompany={handleSelectCompany}
              loading={companiesLoading}
            />
          ) : (
            <EmployeeGrid
              employees={employees}
              selectedEmployees={selectedEmployees}
              onSelectEmployee={handleSelectEmployee}
              onRevealContact={handleRevealContact}
              revealingContacts={revealingContacts}
              loading={employeesLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
