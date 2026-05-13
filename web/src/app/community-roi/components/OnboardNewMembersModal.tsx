'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  Building2,
  Search,
  Users,
  MessageSquare,
  ChevronRight,
  Loader,
} from 'lucide-react';
import { useNewMembers, useOnboardNewMembers } from '@lad/frontend-features/community-roi';

interface OnboardNewMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
}

export default function OnboardNewMembersModal({
  isOpen,
  onClose,
  tenantId,
}: OnboardNewMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [sendTemplate, setSendTemplate] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);

  const { newMembers, isLoading, error, refetch } = useNewMembers(isOpen);
  const { mutate: onboardMembers, isPending: isOnboarding } = useOnboardNewMembers();

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return newMembers;

    const query = searchQuery.toLowerCase();
    return newMembers.filter((member) => {
      const nameMatch = member.name.toLowerCase().includes(query);
      const emailMatch = member.email?.toLowerCase().includes(query);
      const companyMatch = member.company?.toLowerCase().includes(query);

      return nameMatch || emailMatch || companyMatch;
    });
  }, [newMembers, searchQuery]);

  const handleSelectAll = () => {
    if (selectedIndexes.size === filteredMembers.length) {
      setSelectedIndexes(new Set());
    } else {
      const newSet = new Set<number>();
      filteredMembers.forEach((_, index) => {
        const originalIndex = newMembers.findIndex((m) => m === filteredMembers[index]);
        newSet.add(originalIndex);
      });
      setSelectedIndexes(newSet);
    }
  };

  const handleToggleSelect = (index: number) => {
    const newSet = new Set(selectedIndexes);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndexes(newSet);
  };

  const handleOnboard = () => {
    if (selectedIndexes.size === 0) {
      alert('Please select at least one member to onboard');
      return;
    }

    const selectedCount = selectedIndexes.size;
    setConfirmationData({
      selectedCount,
      sendTemplate,
    });
    setShowConfirmation(true);
  };

  const handleConfirmOnboard = () => {
    const selectedIds = Array.from(selectedIndexes).map((i) => i.toString());

    onboardMembers(
      { selectedMemberIds: selectedIds, sendTemplate },
      {
        onSuccess: (data: any) => {
          setShowConfirmation(false);
          let message = `Successfully onboarded ${data.created} member(s)!`;

          if (sendTemplate && data.templates) {
            message += `\n\n${data.templates.sent} onboarding message(s) queued for sending.`;
            if (data.templates.failed > 0) {
              message += `\n${data.templates.failed} message(s) failed.`;
            }
          }

          alert(message);
          setSelectedIndexes(new Set());
          setSearchQuery('');
          refetch();
        },
        onError: (error: any) => {
          alert(`Failed to onboard members: ${error.message}`);
        },
      }
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Onboard New Members
            </DialogTitle>
            <DialogDescription>
              Add new members from BNI Rising Phoenix chapter to your network
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-blue-600 mr-2" />
              <p className="text-sm text-gray-600">Fetching member list...</p>
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-900">Failed to fetch members</p>
                <p className="text-sm text-red-700 mt-1">{error.message}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetch()}
                  className="mt-3"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : newMembers.length === 0 ? (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">No new members found</p>
                <p className="text-sm text-amber-700 mt-1">
                  All members from BNI Rising Phoenix are already in your database.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">{newMembers.length}</div>
                  <div className="text-xs text-blue-700">New Members</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">{selectedIndexes.size}</div>
                  <div className="text-xs text-blue-700">Selected</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">{filteredMembers.length}</div>
                  <div className="text-xs text-blue-700">Filtered</div>
                </div>
              </div>

              {/* Search and Select All */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or company..."
                    className="pl-10 bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={
                        filteredMembers.length > 0 &&
                        selectedIndexes.size === filteredMembers.length
                      }
                      onChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {selectedIndexes.size === filteredMembers.length && filteredMembers.length > 0
                        ? 'Deselect All'
                        : 'Select All'}
                    </span>
                  </div>
                  <Badge variant="secondary">{selectedIndexes.size} selected</Badge>
                </div>
              </div>

              {/* Member List */}
              <ScrollArea className="flex-1 border rounded-lg">
                <div className="space-y-1 p-3">
                  {filteredMembers.map((member, displayIndex) => {
                    const originalIndex = newMembers.findIndex((m) => m === member);
                    const isSelected = selectedIndexes.has(originalIndex);

                    return (
                      <div
                        key={originalIndex}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleToggleSelect(originalIndex)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleToggleSelect(originalIndex)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{member.name}</div>
                            <div className="text-xs text-gray-600 space-y-1 mt-2">
                              {member.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-3 h-3" />
                                  {member.email}
                                </div>
                              )}
                              {member.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-3 h-3" />
                                  {member.phone}
                                </div>
                              )}
                              {member.company && (
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-3 h-3" />
                                  {member.company}
                                </div>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Send Template Option */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={sendTemplate}
                    onChange={(e) => setSendTemplate(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-green-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Send WhatsApp Onboarding Message
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Automatically send onboarding template message to selected members
                    </p>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={onClose} disabled={isOnboarding}>
                  Cancel
                </Button>
                <Button
                  onClick={handleOnboard}
                  disabled={selectedIndexes.size === 0 || isOnboarding}
                  className="gap-2"
                >
                  {isOnboarding && <Loader className="w-4 h-4 animate-spin" />}
                  Onboard {selectedIndexes.size > 0 ? `${selectedIndexes.size}` : ''} Member
                  {selectedIndexes.size !== 1 ? 's' : ''}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              Confirm Onboarding
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3 mt-4">
                <p>
                  You're about to add <span className="font-semibold">{confirmationData?.selectedCount}</span> new
                  member{confirmationData?.selectedCount !== 1 ? 's' : ''} to your network.
                </p>
                {confirmationData?.sendTemplate && (
                  <div className="flex items-start gap-2 p-2 bg-green-50 rounded border border-green-200">
                    <MessageSquare className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-green-800">
                      Onboarding template message will be sent to each member via WhatsApp.
                    </span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel disabled={isOnboarding}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOnboard} disabled={isOnboarding}>
              {isOnboarding && <Loader className="w-4 h-4 animate-spin mr-2" />}
              Confirm & Onboard
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
