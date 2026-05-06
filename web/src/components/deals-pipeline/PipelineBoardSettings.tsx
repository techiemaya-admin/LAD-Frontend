import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Dialog, DialogTitle, DialogContent, DialogHeader, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings, RotateCcw, Save } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  selectPipelineSettings,
  setPipelineSettings
} from '@/store/slices/uiSlice';

interface VisibleColumns {
  name: boolean;
  stage: boolean;
  status: boolean;
  priority: boolean;
  amount: boolean;
  closeDate: boolean;
  dueDate: boolean;
  expectedCloseDate: boolean;
  source: boolean;
  assignee: boolean;
  createdAt: boolean;
  updatedAt: boolean;
  lastActivity: boolean;
}
interface PipelineSettings {
  viewMode: 'list' | 'kanban';
  visibleColumns: VisibleColumns;
  autoRefresh: boolean;
  refreshInterval: number;
  compactView: boolean;
  showCardCount: boolean;
  showStageValue: boolean;
  enableDragAndDrop: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  timezone: string;
}
interface PipelineBoardSettingsProps {
  open: boolean;
  onClose: () => void;
  onSettingsChange: (settings: PipelineSettings) => void;
}
const DEFAULT_VISIBLE_COLUMNS: VisibleColumns = {
  name: true,
  stage: true,
  status: true,
  priority: true,
  amount: true,
  closeDate: true,
  dueDate: false,
  expectedCloseDate: false,
  source: true,
  assignee: true,
  createdAt: false,
  updatedAt: false,
  lastActivity: false
};
const COLUMN_LABELS: Record<keyof VisibleColumns, string> = {
  name: 'Lead Name',
  stage: 'Stage',
  status: 'Status',
  priority: 'Priority',
  amount: 'Amount',
  closeDate: 'Close Date',
  dueDate: 'Due Date',
  expectedCloseDate: 'Expected Close Date',
  source: 'Source',
  assignee: 'Assignee',
  createdAt: 'Created Date',
  updatedAt: 'Last Updated',
  lastActivity: 'Last Activity'
};
const PipelineBoardSettings: React.FC<PipelineBoardSettingsProps> = ({
  open,
  onClose,
  onSettingsChange
}) => {
  const dispatch = useDispatch();
  const settings = useSelector(selectPipelineSettings);
  // Local state for settings - only save to Redux when Save is clicked
  const [localSettings, setLocalSettings] = useState<PipelineSettings>({
    ...settings,
    businessHoursStart: settings.businessHoursStart || '09:00',
    businessHoursEnd: settings.businessHoursEnd || '18:00',
    timezone: settings.timezone || 'GST'
  });
  // Update local settings when dialog opens or settings change
  useEffect(() => {
    if (open) {
      setLocalSettings({
        ...settings,
        businessHoursStart: settings.businessHoursStart || '09:00',
        businessHoursEnd: settings.businessHoursEnd || '18:00',
        timezone: settings.timezone || 'GST'
      });
    }
  }, [open, settings]);
  const handleSettingChange = (key: keyof PipelineSettings, value: unknown): void => {
    setLocalSettings({ ...localSettings, [key]: value });
  };
  const handleSave = (): void => {
    // Only now update Redux store
    dispatch(setPipelineSettings(localSettings));
    onSettingsChange(localSettings);
    onClose();
  };
  const handleCancel = (): void => {
    // Reset local settings to original values
    setLocalSettings({
      ...settings,
      businessHoursStart: settings.businessHoursStart || '09:00',
      businessHoursEnd: settings.businessHoursEnd || '18:00',
      timezone: settings.timezone || 'GST'
    });
    onClose();
  };
  const handleReset = (): void => {
    const defaultSettings: PipelineSettings = {
      viewMode: 'list',
      visibleColumns: DEFAULT_VISIBLE_COLUMNS,
      autoRefresh: true,
      refreshInterval: 30,
      compactView: false,
      showCardCount: true,
      showStageValue: true,
      enableDragAndDrop: true,
      businessHoursStart: '09:00',
      businessHoursEnd: '18:00',
      timezone: 'GST' // Gulf Standard Time (UTC+4)
    };
    setLocalSettings(defaultSettings);
  };
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-xl h-auto max-h-[90vh] overflow-hidden flex flex-col p-0 bg-white dark:bg-[#000724]">
        <DialogHeader>
          <div className="flex items-center gap-3 px-8 pt-6">
            <div className="p-2.5 rounded-full bg-blue-50 dark:bg-[#253456] text-blue-600 dark:text-[#60a5fa] border border-blue-100 dark:border-[#262831] shadow-sm">
              <Settings className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="dark:text-white">Pipeline Board Settings</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-gray-500 hover:text-gray-700 dark:text-[#7a8ba3] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#253456] rounded-xl flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Defaults
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Business Hours Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Business Hours
              </h3>
              <div className="h-px flex-1 bg-gray-100 dark:bg-[#262831]" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="business-start" className="text-sm font-medium text-gray-700 dark:text-[#7a8ba3]">
                  Start Time
                </Label>
                <div className="relative">
                  <Input
                    id="business-start"
                    type="time"
                    value={localSettings.businessHoursStart || '09:00'}
                    onChange={(e) => handleSettingChange('businessHoursStart', e.target.value)}
                    className="w-full h-11 rounded-xl bg-white dark:bg-[#1a2a43] border-gray-200 dark:border-[#262831] text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-end" className="text-sm font-medium text-gray-700 dark:text-[#7a8ba3]">
                  End Time
                </Label>
                <div className="relative">
                  <Input
                    id="business-end"
                    type="time"
                    value={localSettings.businessHoursEnd || '18:00'}
                    onChange={(e) => handleSettingChange('businessHoursEnd', e.target.value)}
                    className="w-full h-11 rounded-xl bg-white dark:bg-[#1a2a43] border-gray-200 dark:border-[#262831] text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-sm font-medium text-gray-700 dark:text-[#7a8ba3]">
                Timezone
              </Label>
              <Select
                value={localSettings.timezone || 'GST'}
                onValueChange={(value) => handleSettingChange('timezone', value)}
              >
                <SelectTrigger className="h-11 rounded-xl border-gray-200 dark:border-[#262831] bg-white dark:bg-[#1a2a43] text-gray-900 dark:text-white">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white dark:bg-[#000724] border-gray-200 dark:border-[#262831] text-gray-900 dark:text-white">
                  <SelectItem value="GST">GST (Gulf Standard Time - UTC+4)</SelectItem>
                  <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                  <SelectItem value="EST">EST (Eastern Standard Time - UTC-5)</SelectItem>
                  <SelectItem value="PST">PST (Pacific Standard Time - UTC-8)</SelectItem>
                  <SelectItem value="GMT">GMT (Greenwich Mean Time - UTC+0)</SelectItem>
                  <SelectItem value="IST">IST (India Standard Time - UTC+5:30)</SelectItem>
                  <SelectItem value="JST">JST (Japan Standard Time - UTC+9)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogActions className="px-8 pb-8 pt-4">
          <Button
            onClick={handleSave}
            className="w-full rounded-xl px-8 h-11 font-bold bg-[#0B1957] hover:bg-[#0B1957]/90 text-white shadow-lg transition-all"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};

export default PipelineBoardSettings;
};
export default PipelineBoardSettings;
