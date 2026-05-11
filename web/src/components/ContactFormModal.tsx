'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Mail, MessageSquare, Building2, Send, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface FormData {
  name: string;
  email: string;
  message: string;
  company?: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

interface Feedback {
  type: 'success' | 'error';
  message: string;
}

const ContactFormModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    message: '',
    company: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Listen for custom events
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    window.addEventListener('lad-contact-open', handleOpen);
    window.addEventListener('lad-contact-close', handleClose);

    return () => {
      window.removeEventListener('lad-contact-open', handleOpen);
      window.removeEventListener('lad-contact-close', handleClose);
    };
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit form');
      }

      setFeedback({
        type: 'success',
        message: 'Thank you! We received your message and will get back to you shortly.',
      });

      setFormData({ name: '', email: '', message: '', company: '' });
      setErrors({});

      // Auto-close after 4 seconds
      setTimeout(() => {
        setIsOpen(false);
        setFeedback(null);
      }, 4000);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to send message. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:w-[90vw] overflow-hidden flex flex-col p-0">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <DialogTitle>Get in Touch</DialogTitle>
              <p className="text-xs text-muted-foreground">We typically respond within 24 hours</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form id="contact-form" onSubmit={handleSubmit} className="space-y-6">
            {feedback && (
              <div className={cn(
                "p-4 rounded-xl text-sm font-medium border animate-in fade-in slide-in-from-top-1",
                feedback.type === 'success' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
              )}>
                {feedback.message}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> Full Name *
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="John Doe"
                className={cn("h-11 rounded-xl border-gray-200", errors.name && "border-red-500")}
              />
              {errors.name && <p className="text-xs text-red-500 font-medium pl-1">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> Email Address *
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="john@example.com"
                className={cn("h-11 rounded-xl border-gray-200", errors.email && "border-red-500")}
              />
              {errors.email && <p className="text-xs text-red-500 font-medium pl-1">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" /> Company (Optional)
              </Label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Your Company Name"
                className="h-11 rounded-xl border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" /> Message *
              </Label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                placeholder="Tell us how we can help..."
                className={cn("min-h-[120px] rounded-xl border-gray-200 resize-none", errors.message && "border-red-500")}
              />
              {errors.message && <p className="text-xs text-red-500 font-medium pl-1">{errors.message}</p>}
            </div>
          </form>
        </div>

        <DialogActions>
          <Button 
            form="contact-form"
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl px-8 h-11 font-bold bg-[#0B1957] hover:bg-[#0B1957]/90 text-white shadow-lg transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};

export default ContactFormModal;
