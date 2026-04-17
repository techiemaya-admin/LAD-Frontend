'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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
        message:
          '✅ Thank you! We received your message and will get back to you shortly.',
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
        message:
          error instanceof Error
            ? error.message
            : '⚠️ Failed to send message. Please try again.',
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

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(11, 25, 87, 0.15)',
          position: 'relative',
          animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .form-group {
            margin-bottom: 24px;
          }
          .form-label {
            display: block;
            margin-bottom: 10px;
            font-size: 13.5px;
            font-weight: 600;
            color: #111827;
            font-family: 'Space Grotesk', system-ui, sans-serif;
            text-transform: uppercase;
            letter-spacing: 0.01em;
          }
          .form-input {
            width: 100%;
            padding: 12px 14px;
            border: 1.5px solid #e5e7eb;
            border-radius: 10px;
            font-size: 14px;
            font-family: 'Inter', system-ui, sans-serif;
            box-sizing: border-box;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            background: #f9fafb;
          }
          .form-input:focus {
            outline: none;
            border-color: #0b1957;
            background: #fff;
            box-shadow: 0 0 0 4px rgba(11, 25, 87, 0.08), 0 2px 8px rgba(11, 25, 87, 0.1);
          }
          .form-input::placeholder {
            color: #9ca3af;
          }
          .form-error {
            color: #dc2626;
            font-size: 12px;
            margin-top: 6px;
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .form-textarea {
            resize: vertical;
            min-height: 140px;
            font-family: 'Inter', system-ui, sans-serif;
          }
          .form-button {
            width: 100%;
            padding: 14px 20px;
            background: linear-gradient(135deg, #0b1957 0%, #1a3a8f 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Inter', system-ui, sans-serif;
            box-shadow: 0 4px 12px rgba(11, 25, 87, 0.25);
          }
          .form-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(11, 25, 87, 0.35);
          }
          .form-button:active:not(:disabled) {
            transform: translateY(0);
          }
          .form-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
          .close-button {
            position: absolute;
            top: 24px;
            right: 24px;
            background: none;
            border: none;
            cursor: pointer;
            color: #9ca3af;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 8px;
          }
          .close-button:hover {
            color: #111827;
            background: #f3f4f6;
          }
          .feedback {
            padding: 14px 16px;
            border-radius: 10px;
            margin-bottom: 24px;
            font-size: 14px;
            border: 1px solid;
            animation: fadeIn 0.3s ease;
          }
          .feedback.success {
            background: #dcfce7;
            color: #166534;
            border-color: #bbf7d0;
          }
          .feedback.error {
            background: #fee2e2;
            color: #991b1b;
            border-color: #fecaca;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>

        <button
          onClick={() => setIsOpen(false)}
          className="close-button"
          title="Close"
        >
          <X size={20} />
        </button>

        <h2
          style={{
            margin: '0 0 8px',
            fontSize: '24px',
            fontWeight: 800,
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            color: '#111827',
            letterSpacing: '-0.02em',
          }}
        >
          Get in Touch
        </h2>
        <p
          style={{
            margin: '0 0 28px',
            fontSize: '14px',
            color: '#6b7280',
            lineHeight: '1.6',
          }}
        >
          Have a question or want to work together? We'd love to hear from you.
          Send us a message and we'll respond as soon as possible.
        </p>

        {feedback && (
          <div className={`feedback ${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              placeholder="John Doe"
              disabled={isSubmitting}
            />
            {errors.name && (
              <div className="form-error">
                <span>⚠️</span> {errors.name}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="john@example.com"
              disabled={isSubmitting}
            />
            {errors.email && (
              <div className="form-error">
                <span>⚠️</span> {errors.email}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Company (Optional)</label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="form-input"
              placeholder="Your company name"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Message *</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              className="form-input form-textarea"
              placeholder="Tell us how we can help..."
              disabled={isSubmitting}
            />
            {errors.message && (
              <div className="form-error">
                <span>⚠️</span> {errors.message}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="form-button"
          >
            {isSubmitting ? '✓ Sending...' : '✓ Send Message'}
          </button>

          <p
            style={{
              marginTop: '16px',
              fontSize: '12px',
              color: '#9ca3af',
              textAlign: 'center',
            }}
          >
            We typically respond within 24 hours
          </p>
        </form>
      </div>
    </div>
  );
};

export default ContactFormModal;
