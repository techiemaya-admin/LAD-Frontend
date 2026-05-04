import React, { useState } from 'react';
import { 
  Sparkles, 
  Settings, 
  ArrowLeft, 
  ArrowRight, 
  Brain, 
  X, 
  ChevronRight,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { generateEmailTemplate } from '../../services/geminiService';
import { toast } from 'sonner';

interface CreateEmailTemplateFlowProps {
  onManual: () => void;
  onGenerated: (design: any) => void;
  onCancel: () => void;
}

export const CreateEmailTemplateFlow: React.FC<CreateEmailTemplateFlowProps> = ({
  onManual,
  onGenerated,
  onCancel
}) => {
  const [step, setStep] = useState<'choice' | 'wizard'>('choice');
  const [wizardStep, setWizardStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [answers, setAnswers] = useState({
    purpose: '',
    target: '',
    tone: 'Professional',
    includePricing: false,
    additionalNotes: ''
  });

  const totalSteps = 4;

  const handleNext = async () => {
    if (wizardStep < totalSteps) {
      setWizardStep(wizardStep + 1);
    } else {
      setIsGenerating(true);
      try {
        const design = await generateEmailTemplate(answers.purpose, answers);
        onGenerated(design);
      } catch (error) {
        toast.error('Failed to generate template');
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleBack = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    } else {
      setStep('choice');
    }
  };

  if (step === 'choice') {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-50/80 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
        <div className="w-full max-w-4xl">
          <div className="flex items-center gap-4 mb-20">
             <button onClick={onCancel} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors"><ArrowLeft className="w-6 h-6" /></button>
             <h1 className="text-4xl font-black text-slate-900">Create Email Template</h1>
          </div>

          <p className="text-slate-500 font-medium text-lg mb-12 ml-4">Choose how you'd like to create your email template:</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
            <motion.div 
              whileHover={{ scale: 1.02, y: -5 }}
              onClick={onManual}
              className="bg-white p-12 rounded-[48px] border-2 border-slate-100 shadow-xl shadow-slate-200/50 cursor-pointer group hover:border-blue-500 transition-all"
            >
              <div className="w-20 h-20 bg-blue-50 rounded-[28px] flex items-center justify-center text-blue-600 mb-10 group-hover:bg-blue-600 group-hover:text-white transition-all">
                 <Settings className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Create Manually</h3>
              <p className="text-slate-400 font-medium leading-relaxed mb-10">Write and customize your email content directly. Perfect for when you already know exactly what you want to say.</p>
              
              <ul className="space-y-4">
                {['Full control over content', 'Use dynamic placeholders', 'Quick and straightforward'].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {f}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div 
               whileHover={{ scale: 1.02, y: -5 }}
               onClick={() => setStep('wizard')}
               className="bg-white p-12 rounded-[48px] border-2 border-slate-100 shadow-xl shadow-slate-200/50 cursor-pointer group hover:border-blue-500 transition-all border-b-8 border-b-blue-600/10"
            >
              <div className="w-20 h-20 bg-amber-50 rounded-[28px] flex items-center justify-center text-amber-600 mb-10 group-hover:bg-amber-500 group-hover:text-white transition-all">
                 <Sparkles className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Generate with AI</h3>
              <p className="text-slate-400 font-medium leading-relaxed mb-10">Answer a few questions about your campaign and let AI generate professional email content for you.</p>

              <ul className="space-y-4">
                {['AI-powered content generation', 'Based on your campaign details', 'Edit and refine as needed'].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <CheckCircle2 className="w-5 h-5 text-blue-500" /> {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500">
      <header className="h-20 px-10 border-b border-slate-100 flex items-center justify-between shrink-0">
        <button onClick={handleBack} className="flex items-center gap-3 text-slate-400 hover:text-slate-900 font-bold transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <h2 className="text-2xl font-black text-slate-800">Generate Email with AI</h2>
        <button onClick={onCancel} className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><X className="w-6 h-6" /></button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-10 overflow-y-auto">
        <div className="w-full max-w-3xl">
          <div className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Step {wizardStep} of {totalSteps}</span>
              <span className="text-sm font-black text-blue-600">{Math.round((wizardStep / totalSteps) * 100)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
               <motion.div 
                initial={false}
                animate={{ width: `${(wizardStep / totalSteps) * 100}%` }}
                className="h-full bg-blue-600 rounded-full" 
               />
            </div>
          </div>

          <div className="bg-white p-16 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200/50 min-h-[400px] flex flex-col">
            <AnimatePresence mode="wait">
              {wizardStep === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">What is the purpose of this email?</h3>
                    <p className="text-slate-500 font-medium">What are you trying to achieve?</p>
                  </div>
                  <textarea 
                    autoFocus
                    value={answers.purpose}
                    onChange={(e) => setAnswers(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="e.g., Schedule a demo, request feedback, nurture relationship, propose partnership"
                    className="w-full h-48 px-8 py-6 bg-slate-50 border border-slate-100 rounded-[32px] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-lg resize-none"
                  />
                </motion.div>
              )}

              {wizardStep === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Who is the target audience?</h3>
                    <p className="text-slate-500 font-medium">Be specific about who will receive this email.</p>
                  </div>
                  <textarea 
                    autoFocus
                    value={answers.target}
                    onChange={(e) => setAnswers(prev => ({ ...prev, target: e.target.value }))}
                    placeholder="e.g., C-level executives in tech companies, existing customers who haven't ordered in 3 months"
                    className="w-full h-48 px-8 py-6 bg-slate-50 border border-slate-100 rounded-[32px] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-lg resize-none"
                  />
                </motion.div>
              )}

              {wizardStep === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Select desired tone</h3>
                    <p className="text-slate-500 font-medium">How should your company sound?</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {['Professional', 'Friendly', 'High Energy', 'Formal', 'Playful', 'Urgent'].map(t => (
                      <button
                        key={t}
                        onClick={() => setAnswers(prev => ({ ...prev, tone: t }))}
                        className={cn(
                          "px-8 py-6 rounded-[24px] border-2 font-black text-sm uppercase tracking-widest transition-all",
                          answers.tone === t ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20" : "bg-white border-slate-100 text-slate-400 hover:border-blue-200"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {wizardStep === 4 && (
                <motion.div 
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-12"
                >
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Final touches</h3>
                    <p className="text-slate-500 font-medium">Anything else our AI should know?</p>
                  </div>
                  
                  <div className="space-y-6">
                    <label className="flex items-center gap-4 p-6 bg-slate-50 rounded-[28px] border border-slate-100 cursor-pointer group">
                      <div className={cn(
                        "w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center",
                        answers.includePricing ? "bg-blue-600 border-blue-600" : "border-slate-300 group-hover:border-blue-400"
                      )}>
                        {answers.includePricing && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={answers.includePricing}
                        onChange={() => setAnswers(prev => ({ ...prev, includePricing: !prev.includePricing }))}
                      />
                      <div>
                        <p className="font-black text-slate-800 text-sm">Include placeholder pricing data</p>
                        <p className="text-xs text-slate-400 font-medium">AI will suggest logical places for pricing info</p>
                      </div>
                    </label>

                    <textarea 
                      value={answers.additionalNotes}
                      onChange={(e) => setAnswers(prev => ({ ...prev, additionalNotes: e.target.value }))}
                      placeholder="Special offers, required links, specific dates..."
                      className="w-full h-32 px-8 py-6 bg-slate-50 border border-slate-100 rounded-[28px] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm resize-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-auto pt-16 flex items-center justify-between">
               <button 
                onClick={handleBack}
                className="px-8 py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all flex items-center gap-3"
               >
                 <ArrowLeft className="w-4 h-4" /> Back
               </button>
               
               <div className="flex items-center gap-4">
                  <button onClick={onCancel} className="px-8 py-4 text-slate-400 font-black text-sm uppercase tracking-widest hover:text-slate-900 transition-colors">Cancel</button>
                  <button 
                    onClick={handleNext}
                    disabled={isGenerating || (wizardStep === 1 && !answers.purpose)}
                    className="px-10 py-5 bg-blue-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/20 flex items-center gap-3 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        {wizardStep === totalSteps ? 'Generate' : 'Next'} <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
