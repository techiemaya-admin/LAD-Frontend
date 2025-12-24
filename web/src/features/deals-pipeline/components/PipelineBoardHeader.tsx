import React from 'react';
import { Button } from '../../../components/ui/button';
import { Plus, FileText, Settings } from 'lucide-react';

interface PipelineBoardHeaderProps {
  onAddStage: () => void;
  onCreateCard: () => void;
  onSettingsClick: () => void;
}

const PipelineBoardHeader: React.FC<PipelineBoardHeaderProps> = ({ onAddStage, onCreateCard, onSettingsClick }) => (
  <div
    className="flex items-center justify-between px-4 md:px-8 py-4 bg-white/70 backdrop-blur-md rounded-b-3xl mb-4 w-[88%] overflow-hidden shadow-lg"
    style={{
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
    }}
  >
    <h1 className="text-3xl font-extrabold text-[#3A3A4F] tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">
      Deals Pipeline
    </h1>
    {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-blue-50 via-white to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 shadow-lg rounded-3xl px-8 py-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight"> Deals Pipeline</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">Make a call to your leads with style ✨</p>
        </div> */}
    <div className="flex gap-4">
      <Button
        onClick={onAddStage}
        className="rounded-xl shadow-md font-semibold bg-blue-500 hover:bg-blue-600 text-white"
        style={{
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.15)',
        }}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Stage
      </Button>
      <Button
        variant="outline"
        onClick={onCreateCard}
        className="rounded-xl font-semibold bg-white text-blue-500 border-[1.5px] border-blue-100 hover:bg-blue-50"
      >
        <FileText className="mr-2 h-4 w-4" />
        Create Card
      </Button>
      <Button
        variant="ghost"
        disabled
        onClick={onSettingsClick}
        className="rounded-xl bg-white border-[1.5px] border-blue-100 text-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

export default PipelineBoardHeader;

