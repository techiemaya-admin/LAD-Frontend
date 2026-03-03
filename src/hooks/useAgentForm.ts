import { useState, useCallback, useEffect, useRef } from 'react';
import { AgentFormData, DEFAULT_AGENT_FORM } from '@/types/agent';
import { useToast } from '../hooks/use-toast';
import { UserStorage } from '@/utils/userStorage';
import { getCurrentUser } from '@/lib/auth';

interface ValidationErrors {
  name?: string;
  agent_instructions?: string;
  system_instructions?: string;
  outbound_starter_prompt?: string;
}

interface UseAgentFormReturn {
  formData: AgentFormData;
  errors: ValidationErrors;
  isDirty: boolean;
  isValid: boolean;
  updateField: <K extends keyof AgentFormData>(field: K, value: AgentFormData[K]) => void;
  resetForm: (data?: AgentFormData) => void;
  validateForm: () => boolean;
  getCharCount: (field: keyof AgentFormData) => { current: number; max: number; percentage: number };
}

const DRAFT_KEY = 'voice-agent-draft';

export function useAgentForm(initialData?: AgentFormData): UseAgentFormReturn {
  const { toast } = useToast();
  const [formData, setFormData] = useState<AgentFormData>(initialData || DEFAULT_AGENT_FORM);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const initialRef = useRef<AgentFormData>(initialData || DEFAULT_AGENT_FORM);
  const userStorageRef = useRef<UserStorage | null>(null);

  // Initialize user storage on mount
  useEffect(() => {
    const initUserStorage = async () => {
      try {
        const user = await getCurrentUser();
        if (user?.id) {
          userStorageRef.current = new UserStorage(user.id);
        }
      } catch (e) {
        // User not available, will use regular localStorage fallback
      }
    };
    initUserStorage();
  }, []);

  // Load draft from user-scoped localStorage on mount
  useEffect(() => {
    if (!initialData && userStorageRef.current) {
      const draft = userStorageRef.current.getJSON<AgentFormData>(DRAFT_KEY);
      if (draft) {
        try {
          setFormData(draft);
          setIsDirty(true);
          toast({
            title: 'Draft Restored',
            description: 'Your unsaved changes have been restored.',
          });
        } catch (e) {
          userStorageRef.current?.removeItem(DRAFT_KEY);
        }
      }
    }
  }, []);

  // Auto-save draft when dirty
  useEffect(() => {
    if (isDirty && userStorageRef.current) {
      const timeout = setTimeout(() => {
        userStorageRef.current?.setJSON(DRAFT_KEY, formData);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [formData, isDirty]);

  const validate = useCallback((data: AgentFormData): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    if (!data.name.trim()) {
      newErrors.name = 'Agent name is required';
    }

    return newErrors;
  }, []);

  const updateField = useCallback(<K extends keyof AgentFormData>(
    field: K,
    value: AgentFormData[K]
  ) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      const newErrors = validate(updated);
      setErrors(newErrors);
      return updated;
    });
    setIsDirty(true);
  }, [validate]);

  const resetForm = useCallback((data?: AgentFormData) => {
    const resetData = data || initialRef.current;
    setFormData(resetData);
    setErrors({});
    setIsDirty(false);
    if (userStorageRef.current) {
      userStorageRef.current.removeItem(DRAFT_KEY);
    }
    initialRef.current = resetData;
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors = validate(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validate]);

  const getCharCount = useCallback((field: keyof AgentFormData) => {
    const value = formData[field];
    const current = typeof value === 'string' ? value.length : 0;

    return {
      current,
      max: 0,
      percentage: 0,
    };
  }, [formData]);

  const isValid = Object.keys(errors).length === 0 && formData.name.trim().length > 0;

  return {
    formData,
    errors,
    isDirty,
    isValid,
    updateField,
    resetForm,
    validateForm,
    getCharCount,
  };
}
