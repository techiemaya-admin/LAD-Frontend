import type { Metadata } from 'next';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Account Deletion Policy | Mr LAD',
  description:
    'How to request deletion of your Mr LAD (TechieMaya FZE) account, what data is deleted or retained, and the timeframe for processing.',
};

export default function AccountDeletionPolicyPage() {
  return (
    <LegalPageLayout
      title="Account Deletion Policy"
      lastUpdated="June 2026"
      activePath="/account-deletion-policy"
      intro="At Mr LAD, we respect our clients&rsquo; privacy and their right to control their data. This page explains how account deletion requests are handled and what happens to associated data."
    >
      <h2 id="requesting-deletion">1. Requesting account deletion</h2>
      <p>
        Mr LAD accounts are created by our team for authorized tenants. To delete your account and
        associated data, contact us:
      </p>
      <ul>
        <li>
          <strong>Email:</strong>{' '}
          <a href="mailto:support@techiemaya.com?subject=Account%20Deletion%20Request">
            support@techiemaya.com
          </a>
        </li>
        <li>
          <strong>Subject:</strong> Account Deletion Request
        </li>
      </ul>
      <p>Please include the following so we can locate and verify your account:</p>
      <ul>
        <li>Company name</li>
        <li>Registered user name</li>
        <li>Registered email address</li>
        <li>Registered phone number</li>
      </ul>
      <p>Our team may verify your identity before processing the request.</p>

      <h2 id="data-deleted">2. Data that will be deleted</h2>
      <p>Upon approval, we will permanently delete or anonymize:</p>
      <ul>
        <li>User profile information</li>
        <li>Login credentials and account access</li>
        <li>Conversation history</li>
        <li>Chat messages</li>
        <li>Lead journey records</li>
        <li>Campaign-related data</li>
        <li>Contact information stored within the account</li>
        <li>Account preferences and settings</li>
      </ul>

      <h2 id="data-retained">3. Data that may be retained</h2>
      <p>Certain information may be retained when required for:</p>
      <ul>
        <li>Legal obligations</li>
        <li>Regulatory compliance</li>
        <li>Fraud prevention</li>
        <li>Security investigations</li>
        <li>Internal audit requirements</li>
      </ul>
      <p>Retained information will be securely stored with restricted access.</p>

      <h2 id="timeframe">4. Deletion timeframe</h2>
      <p>Requests are processed within 30 days of verification and approval.</p>

      <h2 id="important-notes">5. Important notes</h2>
      <ul>
        <li>Deletion is permanent and cannot be reversed.</li>
        <li>Account access cannot be restored after deletion.</li>
        <li>Removed data cannot be recovered.</li>
        <li>
          Active services or contractual obligations may need to be resolved before deletion
          proceeds.
        </li>
      </ul>

      <h2 id="contact">6. Contact us</h2>
      <p>If you have questions about this policy or wish to request deletion, contact us at:</p>
      <ul>
        <li>
          <strong>Email:</strong> <a href="mailto:support@techiemaya.com">support@techiemaya.com</a>
        </li>
        <li>
          <strong>Company:</strong> TechieMaya FZE
        </li>
        <li>
          <strong>Address:</strong> IDS Business Center, Al Karama, Dubai, United Arab Emirates
        </li>
      </ul>
    </LegalPageLayout>
  );
}
