'use client';

import { useState } from 'react';

interface QuestionnaireAnswers {
  campaign_purpose: string;
  target_audience_role: string;
  target_audience_industry: string;
  target_audience_company_size: string;
  company_name: string;
  company_product: string;
  company_value_prop: string;
  email_tone: string;
  additional_requirements: string;
}

interface AIEmailGeneratorQuestionnaireProps {
  onComplete: (answers: QuestionnaireAnswers) => void;
  onCancel: () => void;
}

export default function AIEmailGeneratorQuestionnaire({
  onComplete,
  onCancel,
}: AIEmailGeneratorQuestionnaireProps) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({
    campaign_purpose: '',
    target_audience_role: '',
    target_audience_industry: '',
    target_audience_company_size: '',
    company_name: '',
    company_product: '',
    company_value_prop: '',
    email_tone: 'formal',
    additional_requirements: '',
  });

  const questions = [
    {
      step: 1,
      title: 'What is the purpose of this email?',
      description: 'What are you trying to achieve?',
      field: 'campaign_purpose',
      type: 'textarea',
      placeholder: 'e.g., Schedule a demo, request feedback, nurture relationship, propose partnership',
    },
    {
      step: 2,
      title: 'Who is your target audience?',
      description: 'Tell us about the people receiving this email',
      fields: [
        { field: 'target_audience_role', label: 'Job Title/Role', placeholder: 'e.g., Sales Manager, VP of Marketing' },
        { field: 'target_audience_industry', label: 'Industry', placeholder: 'e.g., Technology, Healthcare, Finance' },
        { field: 'target_audience_company_size', label: 'Company Size', placeholder: 'e.g., Startup, Mid-size, Enterprise' },
      ],
    },
    {
      step: 3,
      title: 'Tell us about your company',
      description: 'What are you representing?',
      fields: [
        { field: 'company_name', label: 'Your Company Name', placeholder: 'e.g., Acme Inc.' },
        { field: 'company_product', label: 'Product/Service', placeholder: 'e.g., AI-powered analytics platform' },
        { field: 'company_value_prop', label: 'Value Proposition', placeholder: 'What makes you unique or valuable?' },
      ],
    },
    {
      step: 4,
      title: 'What tone should the email have?',
      description: 'How should it sound?',
      field: 'email_tone',
      type: 'select',
      options: [
        { value: 'formal', label: 'Formal & Professional' },
        { value: 'friendly', label: 'Friendly & Approachable' },
        { value: 'casual', label: 'Casual & Conversational' },
        { value: 'consultative', label: 'Consultative & Advisory' },
      ],
    },
    {
      step: 5,
      title: 'Any additional requirements?',
      description: 'Anything else we should know?',
      field: 'additional_requirements',
      type: 'textarea',
      placeholder: 'e.g., Must include specific benefits, Include a CTA, Mention previous interaction',
      optional: true,
    },
  ];

  const currentQuestion = questions.find((q) => q.step === step);

  const handleInputChange = (field: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const isStepValid = (): boolean => {
    if (!currentQuestion) return false;

    if ('field' in currentQuestion) {
      const { field, optional } = currentQuestion;
      return optional || !!answers[field as keyof QuestionnaireAnswers]?.trim();
    }

    if ('fields' in currentQuestion) {
      const requiredFields = [
        'target_audience_role',
        'target_audience_industry',
        'target_audience_company_size',
      ];
      return requiredFields.every((f) => !!answers[f as keyof QuestionnaireAnswers]?.trim());
    }

    if ('fields' in currentQuestion) {
      const fields = ['company_name', 'company_product', 'company_value_prop'];
      return fields.every((f) => !!answers[f as keyof QuestionnaireAnswers]?.trim());
    }

    return true;
  };

  const handleNext = () => {
    if (isStepValid()) {
      if (step < 5) {
        setStep(step + 1);
      } else {
        onComplete(answers);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">Step {step} of 5</span>
          <span className="text-sm font-medium text-gray-600">{Math.round((step / 5) * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentQuestion?.title}</h2>
        <p className="text-gray-600 mb-6">{currentQuestion?.description}</p>

        {/* Single field question */}
        {'field' in currentQuestion! && currentQuestion?.type === 'textarea' && (
          <textarea
            value={answers[currentQuestion.field as keyof QuestionnaireAnswers] as string}
            onChange={(e) => handleInputChange(currentQuestion.field, e.target.value)}
            placeholder={currentQuestion.placeholder}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}

        {'field' in currentQuestion! && currentQuestion?.type === 'select' && (
          <select
            value={answers[currentQuestion.field as keyof QuestionnaireAnswers] as string}
            onChange={(e) => handleInputChange(currentQuestion.field, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {currentQuestion.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {/* Multi-field questions */}
        {'fields' in currentQuestion! && (
          <div className="space-y-4">
            {currentQuestion.fields?.map((fieldConfig) => (
              <div key={fieldConfig.field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {fieldConfig.label}
                </label>
                <input
                  type="text"
                  value={answers[fieldConfig.field as keyof QuestionnaireAnswers] as string}
                  onChange={(e) => handleInputChange(fieldConfig.field, e.target.value)}
                  placeholder={fieldConfig.placeholder}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          disabled={!isStepValid()}
          className="flex-1 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
        >
          {step === 5 ? 'Generate Email Template' : 'Next Step →'}
        </button>
      </div>
    </div>
  );
}
