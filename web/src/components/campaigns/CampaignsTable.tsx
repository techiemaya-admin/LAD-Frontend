'use client';
import React from 'react';
import { Plus, Play, Pause, Square, CheckCircle, MoreVertical, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
} from '@tanstack/react-table';
import type { Campaign, CampaignStatus } from '@lad/frontend-features/campaigns';
import { getStatusColor, renderChannelIcons, renderActionChips, getChannelsUsed, PLATFORM_CONFIG, renderPlatformMetrics } from './campaignUtils';
interface CampaignsTableProps {
  campaigns: Campaign[];
  loading: boolean;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, campaign: Campaign) => void;
}

const columnHelper = createColumnHelper<Campaign>();

export default function CampaignsTable({ campaigns, loading, onMenuOpen }: CampaignsTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  
  // Local filter states
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  
  // Filter campaigns based on local state
  const filteredCampaigns = React.useMemo(() => {
    let filtered = campaigns || [];
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(campaign => 
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }
    
    return filtered;
  }, [campaigns, searchQuery, statusFilter]);

  const getStatusIconComponent = (status: CampaignStatus) => {
    switch (status) {
      case 'running': return <Play className="h-3 w-3" />;
      case 'paused': return <Pause className="h-3 w-3" />;
      case 'stopped': return <Square className="h-3 w-3" />;
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const columns = React.useMemo<ColumnDef<Campaign>[]>(() => [
    columnHelper.accessor('name', {
      id: 'name',
      header: 'Campaign Name',
      cell: ({ getValue, row }) => (
        <span
          className="text-sm font-semibold text-[#6366F1] cursor-pointer hover:underline capitalize"
          onClick={() => router.push(`/campaigns/${row.original.id}/analytics`)}
        >
          {getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('status', {
      id: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue();
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs capitalize ${
            getStatusColor(status) === 'success' ? 'bg-green-100 text-green-700' : 
            getStatusColor(status) === 'warning' ? 'bg-yellow-100 text-yellow-700' : 
            getStatusColor(status) === 'error' ? 'bg-red-100 text-red-700' : 
            'bg-gray-100 text-gray-700'
          }`}>
            {getStatusIconComponent(status)}
            {status}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'channels',
      header: 'Channels',
      cell: ({ row }) => renderChannelIcons(row.original),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => renderActionChips(row.original),
    }),
    columnHelper.accessor('leads_count', {
      id: 'leads_count',
      header: 'Leads',
      cell: ({ getValue }) => getValue() || 0,
    }),
    columnHelper.accessor('sent_count', {
      id: 'sent_count',
      header: 'Sent',
      cell: ({ getValue }) => getValue() || 0,
    }),
    columnHelper.display({
      id: 'connected',
      header: 'Connected',
      cell: ({ row }) => renderPlatformMetrics(row.original, 'connected'),
    }),
    columnHelper.display({
      id: 'replied',
      header: 'Replied',
      cell: ({ row }) => renderPlatformMetrics(row.original, 'replied'),
    }),
    columnHelper.accessor('created_at', {
      id: 'created_at',
      header: 'Created',
      cell: ({ getValue }) => new Date(getValue()).toLocaleDateString(),
    }),
    columnHelper.display({
      id: 'actions_menu',
      header: '',
      cell: ({ row }) => (
        <div className="text-right">
          <button
            className="p-1 hover:bg-gray-100 rounded"
            onClick={(e) => onMenuOpen(e, row.original)}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      ),
    }),
  ], [router, onMenuOpen]);

  const table = useReactTable({
    data: filteredCampaigns,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
  });

  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden">
      {/* Filters Section */}
      <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="flex gap-3 flex-col sm:flex-row justify-end items-center">
          <div className="relative min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B] h-4 w-4" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="min-w-[150px] h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="stopped">Stopped</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Table Section */}
        {loading ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F8FAFC]">
                  <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap">Campaign Name</TableHead>
                  <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap">Status</TableHead>
                  <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap">Channels</TableHead>
                  <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap">Actions</TableHead>
                  <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap">Leads</TableHead>
                  <TableHead className="font-semibold text-[#1E293B]">Sent</TableHead>
                  <TableHead className="font-semibold text-[#1E293B]">Connected</TableHead>
                  <TableHead className="font-semibold text-[#1E293B]">Replied</TableHead>
                  <TableHead className="font-semibold text-[#1E293B]">Created</TableHead>
                  <TableHead className="font-semibold text-[#1E293B] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-6 bg-gray-200 rounded animate-pulse w-20"></div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
                        <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-8"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-8"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-8"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-8"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-6 w-6 bg-gray-200 rounded animate-pulse ml-auto"></div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Skeleton for pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-12"></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-12"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                <div className="flex gap-1">
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-[#64748B] mb-2">
              No campaigns found
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/onboarding')}
              className="max-w-[280px] w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Campaign
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-[#F8FAFC]">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={`font-semibold text-[#1E293B] whitespace-nowrap ${
                          header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-2">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())
                          }
                          {header.column.getCanSort() && (
                            <div className="flex flex-col">
                              {header.column.getIsSorted() === 'asc' && (
                                <ChevronUp className="h-3 w-3" />
                              )}
                              {header.column.getIsSorted() === 'desc' && (
                                <ChevronDown className="h-3 w-3" />
                              )}
                              {!header.column.getIsSorted() && (
                                <div className="h-3 w-3 opacity-50">
                                  <ChevronUp className="h-1.5 w-3 absolute" />
                                  <ChevronDown className="h-1.5 w-3 absolute mt-1.5" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-8 text-[#64748B]">
                      No campaigns found
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-gray-50">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* Pagination Controls */}
            {filteredCampaigns.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <span>Show</span>
                  <select
                    value={table.getState().pagination.pageSize}
                    onChange={(e) => {
                      table.setPageSize(Number(e.target.value));
                    }}
                    className="border border-[#E2E8F0] rounded px-2 py-1 text-sm"
                  >
                    {[5, 10, 20, 50].map((pageSize) => (
                      <option key={pageSize} value={pageSize}>
                        {pageSize}
                      </option>
                    ))}
                  </select>
                  <span>
                    of {table.getFilteredRowModel().rows.length} campaigns
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-sm text-[#64748B]">
                    Page {table.getState().pagination.pageIndex + 1} of{' '}
                    {table.getPageCount()}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.setPageIndex(0)}
                      disabled={!table.getCanPreviousPage()}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                      disabled={!table.getCanNextPage()}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
