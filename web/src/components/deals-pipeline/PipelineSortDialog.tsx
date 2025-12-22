import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '../../app/components/ui/dialog';
import { Button } from '../../app/components/ui/button';
import { Select } from '../../app/components/ui/select';
import { Label } from '../../app/components/ui/label';
import { ArrowUp, ArrowDown } from 'lucide-react';

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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogTitle>Sort Leads</DialogTitle>
      <DialogContent>
        <div className="flex flex-col gap-6 mt-2">
          <div>
            <Label htmlFor="sort-field" className="text-sm font-medium mb-2 block">Sort By</Label>
            <Select
              id="sort-field"
              value={sortConfig.field}
              onChange={(e) => handleFieldChange(e.target.value)}
              className="w-full"
            >
              <option value="name">Name</option>
              <option value="createdAt">Created Date</option>
              <option value="updatedAt">Updated Date</option>
              <option value="amount">Amount</option>
              <option value="closeDate">Close Date</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="sort-direction" className="text-sm font-medium mb-2 block">Direction</Label>
            <Select
              id="sort-direction"
              value={sortConfig.direction}
              onChange={(e) => handleDirectionChange(e.target.value as 'asc' | 'desc')}
              className="w-full"
            >
              <option value="asc">
                Ascending
              </option>
              <option value="desc">
                Descending
              </option>
            </Select>
          </div>
        </div>
      </DialogContent>
      <DialogActions className="px-6 py-4">
        <Button 
          onClick={onClose}
          className="rounded-lg font-semibold bg-blue-500 hover:bg-blue-600 text-white"
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PipelineSortDialog;

