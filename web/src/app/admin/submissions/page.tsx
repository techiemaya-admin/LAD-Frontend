'use client';

import React, { useEffect, useState } from 'react';
import { Trash2, RefreshCw } from 'lucide-react';

interface Submission {
  id: string;
  name: string;
  email: string;
  company?: string;
  message: string;
  createdAt: string;
  source: string;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const fetchSubmissions = async (adminToken: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/contact?token=${adminToken}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to fetch submissions');
        setAuthenticated(false);
      } else {
        setSubmissions(data.data || []);
        setAuthenticated(true);
        setError('');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch submissions'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      fetchSubmissions(urlToken);
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
      fetchSubmissions(token);
    }
  };

  const handleRefresh = () => {
    if (token) {
      fetchSubmissions(token);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this submission?')) {
      return;
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token }),
      });

      if (res.ok) {
        setSubmissions(submissions.filter((s) => s.id !== id));
      } else {
        setError('Failed to delete submission');
      }
    } catch (err) {
      setError('Error deleting submission');
    }
  };

  if (!authenticated && loading === false) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f2f7ff',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            background: 'white',
            padding: '40px',
            borderRadius: '16px',
            maxWidth: '400px',
            boxShadow: '0 10px 30px rgba(11, 25, 87, 0.1)',
          }}
        >
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
            Admin Access
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            Enter your admin token to view submissions
          </p>

          <form onSubmit={handleAuth}>
            <input
              type="password"
              placeholder="Admin Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1.5px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '14px',
                marginBottom: '16px',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: '#0b1957',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Access Admin Panel
            </button>
          </form>

          {error && (
            <p style={{ color: '#dc2626', marginTop: '12px', fontSize: '14px' }}>
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f2f7ff',
        padding: '40px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 800,
                margin: '0 0 8px',
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
              }}
            >
              Contact Submissions
            </h1>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Total: {submissions.length} messages
            </p>
          </div>
          <button
            onClick={handleRefresh}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: '#0b1957',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {error && (
          <div
            style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '16px',
              borderRadius: '10px',
              marginBottom: '24px',
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div
            style={{
              background: 'white',
              padding: '40px',
              borderRadius: '16px',
              textAlign: 'center',
              color: '#6b7280',
            }}
          >
            <p>No submissions yet</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {submissions.map((submission) => (
              <div
                key={submission.id}
                style={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '16px',
                  border: '1px solid #e5e7eb',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '20px',
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      margin: '0 0 8px',
                    }}
                  >
                    {submission.name}
                  </h3>
                  <div style={{ color: '#6b7280', fontSize: '14px' }}>
                    <p style={{ margin: '0 0 4px' }}>
                      <strong>Email:</strong> {submission.email}
                    </p>
                    {submission.company && (
                      <p style={{ margin: '0 0 4px' }}>
                        <strong>Company:</strong> {submission.company}
                      </p>
                    )}
                    <p style={{ margin: '0 0 4px' }}>
                      <strong>Date:</strong>{' '}
                      {new Date(submission.createdAt).toLocaleString()}
                    </p>
                    <p style={{ margin: '0 0 12px', fontSize: '12px' }}>
                      <strong>From:</strong> {submission.source}
                    </p>
                  </div>
                  <p
                    style={{
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: '#111827',
                      margin: 0,
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                    }}
                  >
                    {submission.message}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(submission.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    background: '#fee2e2',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#dc2626',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      '#fecaca';
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      '#fee2e2';
                  }}
                  title="Delete submission"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
