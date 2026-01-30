import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectSnackbar, hideSnackbar } from '../../store/slices/bootstrapSlice';
import { useToast } from '@/hooks/use-toast';

const GlobalSnackbar = () => {
  const dispatch = useDispatch();
  const { open, message, severity } = useSelector(selectSnackbar);
  const { toast } = useToast();

  useEffect(() => {
    if (open && message) {
      toast({
        title: message,
        variant: severity === 'error' ? 'destructive' : 'default',
        duration: 4000,
      });
      dispatch(hideSnackbar());
    }
  }, [open, message, severity, toast, dispatch]);

  return null;
};

export default GlobalSnackbar;
