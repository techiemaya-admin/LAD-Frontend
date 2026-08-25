import type { Metadata } from 'next';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy | Mr LAD',
  description:
    'How Mr LAD (TechieMaya FZE) collects, uses, shares, and protects personal data across its AI-powered sales and marketing platform.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="June 2026"
      activePath="/privacy-policy"
      intro="This Privacy Policy explains how Mr LAD collects, uses, discloses, and safeguards your information when you visit mrlads.com or use our services. We are committed to protecting your privacy and handling your data transparently and responsibly."
    >
      <h2 id="who-we-are">1. Who we are</h2>
      <p>
        Mr LAD (&ldquo;Mr LAD&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is an
        AI-powered sales and marketing platform operated by <strong>TechieMaya FZE</strong>, based at IDS
        Business Center, Al Karama, Dubai, United Arab Emirates. This Privacy Policy applies to our
        website at <strong>mrlads.com</strong>, our applications, and the related services
        (collectively, the &ldquo;Services&rdquo;).
      </p>

      <h2 id="scope-and-roles">2. Our roles: controller and processor</h2>
      <p>
        Depending on the data involved, we act in one of two roles:
      </p>
      <ul>
        <li>
          <strong>As a data controller:</strong> for the personal data of our account holders,
          their authorized users, and website visitors (for example, your name, email, billing
          details, and how you use the Services). This policy describes that processing.
        </li>
        <li>
          <strong>As a data processor:</strong> for the personal data that our customers
          (&ldquo;Customers&rdquo;) upload to, generate within, or process through the Services about
          their own leads, prospects, and contacts (&ldquo;Customer Data&rdquo;). For Customer Data,
          the Customer is the controller and is responsible for having a lawful basis to process that
          data. We process it only on the Customer&rsquo;s documented instructions, as set out in our
          agreement with them. If you are a lead or contact of one of our Customers and wish to
          exercise your rights, please contact that Customer directly.
        </li>
      </ul>

      <h2 id="information-we-collect">3. Information we collect</h2>
      <h3>3.1 Information you provide to us</h3>
      <ul>
        <li>
          <strong>Account &amp; profile data:</strong> name, business name, email address, phone
          number, password, role, and time zone.
        </li>
        <li>
          <strong>Billing &amp; transaction data:</strong> billing contact, plan, wallet/credit
          balances, and payment records. Card details are handled by our payment processor and are
          not stored on our servers.
        </li>
        <li>
          <strong>Communications:</strong> messages you send us via contact forms, email, or
          support, and the content of your communications with us.
        </li>
        <li>
          <strong>Content &amp; configuration:</strong> campaigns, message templates, prompts,
          agent settings, and other content you create within the Services.
        </li>
      </ul>

      <h3>3.2 Information collected automatically</h3>
      <ul>
        <li>
          <strong>Usage data:</strong> pages viewed, features used, actions taken, and timestamps.
        </li>
        <li>
          <strong>Device &amp; technical data:</strong> IP address, browser type, operating system,
          device identifiers, and referring URLs.
        </li>
        <li>
          <strong>Cookies &amp; similar technologies:</strong> see our{' '}
          <a href="/cookies-policy">Cookies Policy</a> for details on what we use and how to manage
          your preferences.
        </li>
      </ul>

      <h3>3.3 Information from third parties</h3>
      <ul>
        <li>
          <strong>Connected accounts &amp; integrations:</strong> when you connect channels such as
          LinkedIn, WhatsApp, Instagram, email, Meta advertising accounts, or telephony, we receive
          data from those providers as needed to operate the integration (for example, account
          identifiers, message metadata, and conversation content).
        </li>
        <li>
          <strong>Data enrichment providers:</strong> we may obtain or verify business contact
          information from third-party enrichment and data sources to support outreach features.
        </li>
      </ul>

      <h2 id="how-we-use">4. How we use information</h2>
      <p>We use personal data to:</p>
      <ul>
        <li>Provide, operate, maintain, and improve the Services;</li>
        <li>Create and manage accounts and authenticate users;</li>
        <li>Process payments, manage wallets/credits, and prevent fraud;</li>
        <li>Run, automate, and optimize campaigns and conversations on behalf of Customers;</li>
        <li>Generate AI-assisted content, replies, and recommendations;</li>
        <li>Provide customer support and respond to inquiries;</li>
        <li>Send service, security, and transactional communications;</li>
        <li>Monitor usage, analyze trends, and ensure security and reliability;</li>
        <li>Comply with legal obligations and enforce our terms.</li>
      </ul>

      <h2 id="ai-processing">5. AI and automated processing</h2>
      <p>
        The Services use artificial intelligence and large language models to generate messages,
        summaries, suggestions, and other outputs. To provide these features, relevant content may be
        sent to AI model providers acting as our sub-processors. We do not authorize these providers
        to use your or your Customers&rsquo; data to train their general-purpose models except as
        permitted by our agreements. AI-generated output may be inaccurate or incomplete; you are
        responsible for reviewing it before relying on or sending it.
      </p>

      <h2 id="legal-bases">6. Legal bases for processing</h2>
      <p>
        Where the EU/UK General Data Protection Regulation (GDPR) or similar laws apply, we rely on
        the following legal bases: <strong>performance of a contract</strong> (to provide the
        Services), <strong>legitimate interests</strong> (to operate, secure, and improve the
        Services), <strong>consent</strong> (for example, certain cookies and marketing), and{' '}
        <strong>legal obligation</strong> (to comply with applicable law). Where we act as a
        processor, the Customer is responsible for establishing the legal basis for the Customer Data
        it processes.
      </p>

      <h2 id="how-we-share">7. How we share information</h2>
      <p>We do not sell your personal data. We share information only as described below:</p>
      <ul>
        <li>
          <strong>Service providers / sub-processors</strong> : vendors who process data on our
          behalf to deliver the Services, including cloud hosting, AI model providers, payment
          processing, communications and messaging platforms, data enrichment, and analytics. A
          representative list includes Google Cloud Platform (hosting), Anthropic and Google (AI
          models), Stripe (payments), Meta Platforms (WhatsApp, Instagram, advertising), and
          telephony/voice providers. A current list of sub-processors is available on request.
        </li>
        <li>
          <strong>At your direction:</strong> with third-party platforms and recipients when you use
          integrations or send communications through the Services.
        </li>
        <li>
          <strong>Legal &amp; safety:</strong> when required by law, regulation, legal process, or
          to protect the rights, property, or safety of Mr LAD, our users, or others.
        </li>
        <li>
          <strong>Business transfers:</strong> in connection with a merger, acquisition, financing,
          or sale of assets, subject to this Privacy Policy.
        </li>
      </ul>

      <h2 id="international-transfers">8. International data transfers</h2>
      <p>
        We are based in the United Arab Emirates and use service providers that may process data in
        other countries. Where we transfer personal data across borders, we take steps to ensure an
        appropriate level of protection, such as relying on adequacy decisions or standard
        contractual clauses where applicable.
      </p>

      <h2 id="retention">9. Data retention</h2>
      <p>
        We retain personal data for as long as needed to provide the Services, comply with our legal
        obligations, resolve disputes, and enforce our agreements. Customer Data is retained
        according to our agreement with the Customer and is deleted or returned on termination,
        subject to legal retention requirements. When data is no longer required, we delete or
        anonymize it.
      </p>

      <h2 id="security">10. Security</h2>
      <p>
        We implement technical and organizational measures designed to protect personal data,
        including encryption in transit, access controls, tenant data isolation, and authentication
        safeguards. No method of transmission or storage is completely secure, and we cannot
        guarantee absolute security. If you believe your account has been compromised, contact us
        immediately.
      </p>

      <h2 id="your-rights">11. Your rights and choices</h2>
      <p>
        Subject to applicable law, you may have the right to access, correct, update, delete, or
        port your personal data; to object to or restrict certain processing; and to withdraw consent.
        To exercise these rights, contact us using the details below. If your data is held by us as a
        processor on behalf of a Customer, we will refer your request to the relevant Customer. You
        also have the right to lodge a complaint with a data protection authority.
      </p>

      <h2 id="cookies">12. Cookies</h2>
      <p>
        We use cookies and similar technologies to operate the Services, remember your preferences,
        and analyze usage. For full details and how to manage them, see our{' '}
        <a href="/cookies-policy">Cookies Policy</a>.
      </p>

      <h2 id="children">13. Children&rsquo;s privacy</h2>
      <p>
        The Services are intended for business use and are not directed to individuals under the age
        of 18. We do not knowingly collect personal data from children. If you believe a child has
        provided us with personal data, please contact us so we can delete it.
      </p>

      <h2 id="third-party-links">14. Third-party links and services</h2>
      <p>
        The Services may link to or integrate with third-party websites and platforms that we do not
        control. This Privacy Policy does not apply to those third parties, and we encourage you to
        review their privacy policies.
      </p>

      <h2 id="changes">15. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. When we make material changes, we will
        update the &ldquo;Last updated&rdquo; date above and, where appropriate, provide additional
        notice. Your continued use of the Services after changes take effect constitutes acceptance of
        the updated policy.
      </p>

      <h2 id="contact">16. Contact us</h2>
      <p>
        If you have questions about this Privacy Policy or our data practices, contact us at:
      </p>
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
