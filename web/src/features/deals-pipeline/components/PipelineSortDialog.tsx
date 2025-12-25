import React from 'react';
import { Dialog, DialogTitle, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowUp, ArrowDown, X } from 'lucide-react';

interface PipelineSortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

interface PipelineSortDialogProps {
  open: boolean;
  onClose: () => void;
  sortConfig: PipelineSortConfig;
  onSortConfigChange: (config: PipelineSortConfig) => void;
}

const PipelineSortDialog: React.FC<PipelineSortDialogProps> = ({
  open,
  onClose,
  sortConfig,
  onSortConfigChange
}) => {
  const handleFieldChange = (field: string): void => {
    onSortConfigChange({ ...sortConfig, field });
  };

  const handleDirectionChange = (direction: 'asc' | 'desc'): void => {
    onSortConfigChange({ ...sortConfig, direction });
  };

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="p-6 pt-2 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="flex justify-between items-center">
          <span className="text-lg font-semibold text-[#3A3A4F]">Sort Leads</span>
          <button
            onClick={onClose}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogTitle>
        <div className="flex flex-col gap-6 mt-2">
          <div>
            <Label htmlFor="sort-field" className="text-sm font-medium mb-2 block">Sort By</Label>
            <Select
              value={sortConfig.field}
              onValueChange={(value: string) => handleFieldChange(value)}
            >
              <SelectTrigger id="sort-field" className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="createdAt">Created Date</SelectItem>
                <SelectItem value="updatedAt">Updated Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="closeDate">Close Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="sort-direction" className="text-sm font-medium mb-2 block">Direction</Label>
            <Select
              value={sortConfig.direction}
              onValueChange={(value: string) => handleDirectionChange(value as 'asc' | 'desc')}
            >
              <SelectTrigger id="sort-direction" className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button 
            onClick={onClose}
            className="rounded-lg font-semibold bg-blue-500 hover:bg-blue-600 text-white"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PipelineSortDialog;

