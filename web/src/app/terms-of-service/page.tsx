import type { Metadata } from 'next';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Terms of Service | Mr LAD',
  description:
    'The terms and conditions governing your access to and use of the Mr LAD (TechieMaya FZE) AI-powered sales and marketing platform.',
};

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated="June 2026"
      activePath="/terms-of-service"
      intro="These Terms of Service govern your access to and use of Mr LAD. Please read them carefully. By creating an account or using the Services, you agree to be bound by these terms."
    >
      <h2 id="agreement">1. Agreement to terms</h2>
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) form a binding agreement between you (and the
        organization you represent, &ldquo;you&rdquo; or &ldquo;Customer&rdquo;) and{' '}
        <strong>TechieMaya FZE</strong>, operator of Mr LAD (&ldquo;Mr LAD&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;, or &ldquo;our&rdquo;), based at IDS Business Center, Al Karama, Dubai,
        United Arab Emirates. By accessing or using mrlads.com or the Services, you agree to these
        Terms and to our <a href="/privacy-policy">Privacy Policy</a>. If you do not agree, do not use
        the Services. If you are entering into these Terms on behalf of an organization, you represent
        that you have authority to bind that organization.
      </p>

      <h2 id="definitions">2. Definitions</h2>
      <ul>
        <li>
          <strong>&ldquo;Services&rdquo;</strong> means the Mr LAD platform, website, applications,
          APIs, and related features.
        </li>
        <li>
          <strong>&ldquo;Customer Data&rdquo;</strong> means data you submit to, generate within, or
          process through the Services, including data about your leads, prospects, and contacts.
        </li>
        <li>
          <strong>&ldquo;Account&rdquo;</strong> means the account you register to access the
          Services.
        </li>
      </ul>

      <h2 id="the-service">3. The Services</h2>
      <p>
        Mr LAD provides AI-powered tools to run outreach, engagement, nurture, and analytics across
        channels such as LinkedIn, WhatsApp, Instagram, email, advertising, and voice. The Services
        may evolve over time, and we may add, modify, or remove features. Certain features depend on
        third-party platforms and are subject to their availability and terms.
      </p>

      <h2 id="accounts">4. Eligibility and accounts</h2>
      <ul>
        <li>You must be at least 18 years old and able to form a binding contract.</li>
        <li>
          You are responsible for the accuracy of your registration information and for keeping it up
          to date.
        </li>
        <li>
          You are responsible for safeguarding your credentials and for all activity under your
          Account. Notify us promptly of any unauthorized use.
        </li>
        <li>
          You are responsible for your authorized users&rsquo; compliance with these Terms.
        </li>
      </ul>

      <h2 id="billing">5. Subscriptions, credits, and billing</h2>
      <ul>
        <li>
          Paid features are offered on a subscription and/or usage (credit/wallet) basis as described
          at the point of purchase.
        </li>
        <li>
          Fees are charged in advance or as consumed, depending on the plan. Usage-based charges
          (including AI, messaging, and voice usage) are deducted from your wallet or billed per your
          plan.
        </li>
        <li>
          Unless required by law or stated otherwise, fees are non-refundable and payments are
          non-cancelable.
        </li>
        <li>
          You authorize us and our payment processor to charge your designated payment method for
          amounts due. You are responsible for any applicable taxes.
        </li>
        <li>
          We may change pricing prospectively; we will provide reasonable notice of material changes
          to recurring fees.
        </li>
      </ul>

      <h2 id="acceptable-use">6. Acceptable use</h2>
      <p>You agree not to, and not to permit others to:</p>
      <ul>
        <li>
          Use the Services for unlawful, deceptive, harmful, or fraudulent purposes, or to send spam
          or unsolicited communications in violation of applicable law;
        </li>
        <li>
          Violate the terms, policies, or rate limits of any connected third-party platform
          (including LinkedIn, WhatsApp/Meta, Instagram, email providers, and telephony providers);
        </li>
        <li>
          Send messages to recipients without a lawful basis or required consent, or contact
          individuals who have opted out;
        </li>
        <li>
          Upload or transmit malicious code, or attempt to gain unauthorized access to the Services or
          related systems;
        </li>
        <li>
          Reverse engineer, scrape, resell, or build a competing product from the Services except to
          the extent permitted by law;
        </li>
        <li>Infringe the intellectual property or privacy rights of others;</li>
        <li>Interfere with or disrupt the integrity or performance of the Services.</li>
      </ul>

      <h2 id="customer-responsibilities">7. Customer Data and your responsibilities</h2>
      <p>
        You retain all rights to your Customer Data. You grant us a worldwide, non-exclusive license
        to host, process, and use Customer Data solely to provide and improve the Services and as
        instructed by you. You represent and warrant that you have all necessary rights, consents, and
        legal bases to provide the Customer Data and to conduct the outreach and communications you
        carry out through the Services, and that doing so complies with applicable laws (including
        data protection and anti-spam laws) and third-party platform terms. As between you and us, you
        are the controller of Customer Data; our processing is described in our{' '}
        <a href="/privacy-policy">Privacy Policy</a>.
      </p>

      <h2 id="third-party">8. Third-party services and platforms</h2>
      <p>
        The Services integrate with third-party platforms and providers. Your use of those
        integrations is subject to the applicable third party&rsquo;s terms and policies. We are not
        responsible for third-party services, their availability, or any changes they make that affect
        the Services. You are responsible for maintaining your own accounts and authorizations with
        those providers.
      </p>

      <h2 id="ai-output">9. AI-generated content</h2>
      <p>
        The Services use AI to generate content and suggestions. AI output may be inaccurate,
        incomplete, or unsuitable for your purpose. You are solely responsible for reviewing,
        editing, and approving any content before it is used or sent, and for ensuring it complies
        with applicable laws and platform policies. We make no warranty regarding the accuracy or
        suitability of AI-generated output.
      </p>

      <h2 id="ip">10. Intellectual property</h2>
      <p>
        The Services, including all software, design, text, and other materials (excluding Customer
        Data), are owned by TechieMaya FZE or its licensors and are protected by intellectual property
        laws. Subject to these Terms, we grant you a limited, non-exclusive, non-transferable,
        revocable right to access and use the Services for your internal business purposes. All rights
        not expressly granted are reserved.
      </p>

      <h2 id="feedback">11. Feedback</h2>
      <p>
        If you provide suggestions or feedback about the Services, you grant us a perpetual,
        irrevocable, royalty-free license to use it without restriction or obligation to you.
      </p>

      <h2 id="disclaimers">12. Disclaimers</h2>
      <p>
        The Services are provided <strong>&ldquo;as is&rdquo;</strong> and{' '}
        <strong>&ldquo;as available&rdquo;</strong> without warranties of any kind, whether express,
        implied, or statutory, including implied warranties of merchantability, fitness for a
        particular purpose, title, and non-infringement. We do not warrant that the Services will be
        uninterrupted, error-free, or secure, or that they will produce any particular business
        result.
      </p>

      <h2 id="liability">13. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, neither party will be liable for any indirect,
        incidental, special, consequential, or punitive damages, or for any loss of profits,
        revenue, data, or goodwill. To the maximum extent permitted by law, our total aggregate
        liability arising out of or relating to these Terms or the Services will not exceed the
        amounts you paid to us for the Services in the twelve (12) months preceding the event giving
        rise to the claim.
      </p>

      <h2 id="indemnification">14. Indemnification</h2>
      <p>
        You will defend, indemnify, and hold harmless TechieMaya FZE and its affiliates, officers, and
        employees from and against any claims, damages, liabilities, and expenses (including
        reasonable legal fees) arising out of or related to your Customer Data, your use of the
        Services, your communications and campaigns, or your breach of these Terms or applicable law.
      </p>

      <h2 id="termination">15. Term, suspension, and termination</h2>
      <ul>
        <li>
          These Terms remain in effect while you use the Services. You may stop using the Services and
          close your Account at any time.
        </li>
        <li>
          We may suspend or terminate your access if you breach these Terms, fail to pay fees, create
          risk or legal exposure, or to comply with law.
        </li>
        <li>
          Upon termination, your right to use the Services ends. We may delete Customer Data after a
          reasonable period, subject to our <a href="/privacy-policy">Privacy Policy</a> and legal
          requirements. Provisions that by their nature should survive termination will survive.
        </li>
      </ul>

      <h2 id="changes">16. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. When we make material changes, we will update the
        &ldquo;Last updated&rdquo; date above and, where appropriate, provide additional notice. Your
        continued use of the Services after the changes take effect constitutes acceptance of the
        updated Terms.
      </p>

      <h2 id="governing-law">17. Governing law and dispute resolution</h2>
      <p>
        These Terms are governed by the laws of the United Arab Emirates, as applied in the Emirate of
        Dubai, without regard to conflict-of-laws principles. The courts of Dubai, UAE will have
        exclusive jurisdiction over any disputes arising out of or relating to these Terms or the
        Services, subject to any mandatory rights you may have under applicable law.
      </p>

      <h2 id="general">18. General</h2>
      <ul>
        <li>
          <strong>Entire agreement:</strong> These Terms, together with any order or plan details and
          our policies referenced here, are the entire agreement between you and us regarding the
          Services.
        </li>
        <li>
          <strong>Assignment:</strong> You may not assign these Terms without our consent; we may
          assign them in connection with a merger, acquisition, or sale of assets.
        </li>
        <li>
          <strong>Severability:</strong> If any provision is held unenforceable, the remaining
          provisions remain in effect.
        </li>
        <li>
          <strong>Waiver:</strong> Failure to enforce any provision is not a waiver of our right to do
          so later.
        </li>
        <li>
          <strong>Force majeure:</strong> Neither party is liable for delays or failures caused by
          events beyond its reasonable control.
        </li>
      </ul>

      <h2 id="contact">19. Contact us</h2>
      <p>If you have questions about these Terms, contact us at:</p>
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
