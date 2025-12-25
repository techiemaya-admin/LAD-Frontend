import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Dialog, DialogTitle, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Settings, LayoutGrid, List, RotateCcw, Save } from 'lucide-react';
import {
  selectPipelineSettings,
  setPipelineSettings
} from '@/store/slices/uiSlice';

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface ViewModeOptionProps extends Omit<React.ComponentProps<typeof RadioGroupItem>, 'checked'> {
  title: string;
  description: string;
  icon: IconComponent;
  checked?: boolean; // Optional: can be passed from parent to indicate active state
}

const ViewModeOption = React.forwardRef<HTMLButtonElement, ViewModeOptionProps>(({
  title,
  description,
  icon: Icon,
  id,
  className,
  value,
  checked,
  ...radioProps
}, ref) => {
  const optionId = id || `view-mode-${value}`;
  // RadioGroupItem is controlled by RadioGroup's value, but we use checked prop for visual state
  const isActive = Boolean(checked);

  return (
    <label
      htmlFor={optionId}
      className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-colors ${
        isActive ? 'bg-blue-50 border-2 border-blue-200' : 'hover:bg-gray-100 border-2 border-transparent'
      }`}
    >
      <RadioGroupItem
        {...radioProps}
        id={optionId}
        ref={ref}
        value={value}
        className={`sr-only ${className ?? ''}`}
      />
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${
          isActive
            ? 'border-blue-500 bg-blue-500'
            : 'border-slate-300 bg-white'
        }`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-sm transition-opacity ${
            isActive ? 'bg-white opacity-100' : 'bg-transparent opacity-0'
          }`}
        />
      </span>
      <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
      <div>
        <div className={`text-sm font-medium ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
          {title}
        </div>
        <div className="text-xs text-gray-500">
          {description}
        </div>
      </div>
    </label>
  );
});

ViewModeOption.displayName = 'ViewModeOption';

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
  viewMode: 'kanban' | 'list';
  visibleColumns: VisibleColumns;
  autoRefresh: boolean;
  refreshInterval: number;
  compactView: boolean;
  showCardCount: boolean;
  showStageValue: boolean;
  enableDragAndDrop: boolean;
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
  const [localSettings, setLocalSettings] = useState<PipelineSettings>(settings);
  
  // Update local settings when dialog opens or settings change
  useEffect(() => {
    if (open) {
      setLocalSettings(settings);
    }
  }, [open, settings]);

  const handleViewModeChange = (value: string): void => {
    setLocalSettings({ ...localSettings, viewMode: value as 'kanban' | 'list' });
  };

  const handleColumnVisibilityChange = (columnKey: keyof VisibleColumns): void => {
    setLocalSettings({
      ...localSettings,
      visibleColumns: {
        ...localSettings.visibleColumns,
        [columnKey]: !localSettings.visibleColumns?.[columnKey]
      }
    });
  };

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
    setLocalSettings(settings);
    onClose();
  };

  const handleReset = (): void => {
    const defaultSettings: PipelineSettings = {
      viewMode: 'kanban',
      visibleColumns: DEFAULT_VISIBLE_COLUMNS,
      autoRefresh: true,
      refreshInterval: 30,
      compactView: false,
      showCardCount: true,
      showStageValue: true,
      enableDragAndDrop: true
    };
    setLocalSettings(defaultSettings);
  };

  const visibleColumnCount = Object.values(localSettings.visibleColumns || {}).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="pb-2">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-semibold flex-grow">Pipeline Board Settings</h2>
            <button
              onClick={handleReset}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Reset to defaults"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </DialogTitle>
          {/* View Mode Section */}
          <div className="p-6 mb-6 bg-gray-50 rounded-lg">
            <fieldset>
              <Label className="mb-4 font-semibold text-gray-900 block">
                <div className="flex items-center gap-2">
                  View Mode
                </div>
              </Label>
              <RadioGroup
                value={localSettings.viewMode || 'kanban'}
                onValueChange={handleViewModeChange}
                className="flex flex-col gap-4"
              >
                <ViewModeOption
                  value="kanban"
                  id="view-kanban"
                  title="Kanban View"
                  description="Cards organized in columns by stage"
                  icon={LayoutGrid}
                  checked={localSettings.viewMode === 'kanban'}
                />
                <ViewModeOption
                  value="list"
                  id="view-list"
                  title="List View"
                  description="Tabular view with customizable columns"
                  icon={List}
                  checked={localSettings.viewMode === 'list'}
                />
              </RadioGroup>
            </fieldset>
          </div>

          {/* Column Visibility Section - Only show for List View */}
          {localSettings.viewMode === 'list' && (
            <div className="p-6 mb-6 bg-gray-50 rounded-lg">
              <h3 className="text-base font-semibold mb-4">
                Visible Columns ({visibleColumnCount} selected)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(COLUMN_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`column-${key}`}
                      checked={localSettings.visibleColumns?.[key as keyof VisibleColumns] || false}
                      onChange={() => handleColumnVisibilityChange(key as keyof VisibleColumns)}
                    />
                    <Label htmlFor={`column-${key}`} className="text-sm cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Display Options */}
          <div className="p-6 mb-6 bg-gray-50 rounded-lg">
            <h3 className="text-base font-semibold mb-4">
              Display Options
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="compact-view" className="cursor-pointer">
                  Compact View
                </Label>
                <Switch
                  id="compact-view"
                  checked={localSettings.compactView || false}
                  onCheckedChange={(checked) => handleSettingChange('compactView', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="show-card-count" className="cursor-pointer">
                  Show Card Count in Stage Headers
                </Label>
                <Switch
                  id="show-card-count"
                  checked={localSettings.showCardCount !== false}
                  onCheckedChange={(checked) => handleSettingChange('showCardCount', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="show-stage-value" className="cursor-pointer">
                  Show Total Value in Stage Headers
                </Label>
                <Switch
                  id="show-stage-value"
                  checked={localSettings.showStageValue !== false}
                  onCheckedChange={(checked) => handleSettingChange('showStageValue', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-drag-drop" className="cursor-pointer">
                  Enable Drag & Drop
                </Label>
                <Switch
                  id="enable-drag-drop"
                  checked={localSettings.enableDragAndDrop !== false}
                  onCheckedChange={(checked) => handleSettingChange('enableDragAndDrop', checked)}
                />
              </div>
            </div>
          </div>

          {/* Auto Refresh Settings */}
          <div className="p-6 bg-gray-50 rounded-lg">
            <h3 className="text-base font-semibold mb-4">
              Auto Refresh
            </h3>
            
            <div className="flex items-center justify-between mb-4">
              <Label htmlFor="auto-refresh" className="cursor-pointer">
                Enable Auto Refresh
              </Label>
              <Switch
                id="auto-refresh"
                checked={localSettings.autoRefresh !== false}
                onCheckedChange={(checked) => handleSettingChange('autoRefresh', checked)}
              />
            </div>
            
            {localSettings.autoRefresh && (
              <div className="px-4">
                <div className="text-sm mb-2">
                  Refresh Interval: {localSettings.refreshInterval || 30} seconds
                </div>
                <Slider
                  value={localSettings.refreshInterval || 30}
                  onValueChange={(value) => handleSettingChange('refreshInterval', value)}
                  min={10}
                  max={300}
                  step={10}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>30s</span>
                  <span>1m</span>
                  <span>2m</span>
                  <span>5m</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6 pt-6 border-t">
            <Button 
              onClick={handleCancel} 
              variant="outline"
              className="rounded-lg font-semibold bg-white text-blue-500 border-[1.5px] border-blue-100 hover:bg-blue-50"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              className="rounded-lg shadow-md font-semibold bg-blue-500 hover:bg-blue-600 text-white"
              style={{
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.15)',
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

export default PipelineBoardSettings;
