import type { Metadata } from 'next';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Cookies Policy | Mr LAD',
  description:
    'How Mr LAD (TechieMaya FZE) uses cookies and similar technologies on mrlads.com, and how you can manage your preferences.',
};

export default function CookiesPolicyPage() {
  return (
    <LegalPageLayout
      title="Cookies Policy"
      lastUpdated="June 2026"
      activePath="/cookies-policy"
      intro="This Cookies Policy explains how Mr LAD uses cookies and similar technologies when you visit mrlads.com or use our Services, and the choices you have."
    >
      <h2 id="intro">1. Introduction</h2>
      <p>
        This Cookies Policy should be read together with our{' '}
        <a href="/privacy-policy">Privacy Policy</a>, which explains how we handle personal data more
        broadly. By using mrlads.com, you agree to our use of cookies as described here, except where
        your consent is required and not given.
      </p>

      <h2 id="what-are-cookies">2. What are cookies?</h2>
      <p>
        Cookies are small text files placed on your device when you visit a website. They are widely
        used to make websites work, to remember your preferences, and to provide information to the
        site owner. We also use similar technologies such as local storage and pixels, which we refer
        to collectively as &ldquo;cookies&rdquo; in this policy. Cookies may be{' '}
        <strong>session cookies</strong> (deleted when you close your browser) or{' '}
        <strong>persistent cookies</strong> (which remain until they expire or you delete them), and
        either <strong>first-party</strong> (set by us) or <strong>third-party</strong> (set by other
        providers).
      </p>

      <h2 id="how-we-use">3. How we use cookies</h2>
      <p>We use cookies to:</p>
      <ul>
        <li>Keep you signed in and secure your session;</li>
        <li>Remember your preferences, such as theme (light/dark) and language;</li>
        <li>Operate core features of the Services;</li>
        <li>Understand how the Services are used so we can improve them.</li>
      </ul>

      <h2 id="types">4. Types of cookies we use</h2>
      {/* Mobile Card View (< sm) */}
      <div className="block sm:hidden space-y-4 my-6">
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1a2f6b]/20 space-y-3">
          <div>
            <strong className="text-base text-[#0b1957] dark:text-white">Strictly necessary</strong>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-0.5">
              Purpose
            </span>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-0">
              Required for the Services to function, including authentication, security, and load
              balancing. These cannot be switched off in our systems.
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-0.5">
              Examples
            </span>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-0">
              Session/authentication token, CSRF and security cookies
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1a2f6b]/20 space-y-3">
          <div>
            <strong className="text-base text-[#0b1957] dark:text-white">Functional</strong>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-0.5">
              Purpose
            </span>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-0">
              Remember your choices and preferences to provide a more personalized experience.
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-0.5">
              Examples
            </span>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-0">
              Theme preference, language, UI settings
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1a2f6b]/20 space-y-3">
          <div>
            <strong className="text-base text-[#0b1957] dark:text-white">Analytics / performance</strong>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-0.5">
              Purpose
            </span>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-0">
              Help us understand how visitors interact with the Services so we can measure and improve
              performance. Used where permitted by your consent settings.
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-0.5">
              Examples
            </span>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-0">
              Aggregated usage and performance metrics
            </p>
          </div>
        </div>
      </div>

      {/* Desktop / Tablet Table View (>= sm) */}
      <div className="hidden sm:block my-6 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="!mb-0">
          <thead>
            <tr>
              <th className="w-1/4">Category</th>
              <th className="w-1/2">Purpose</th>
              <th className="w-1/4">Examples</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Strictly necessary</strong>
              </td>
              <td>
                Required for the Services to function, including authentication, security, and load
                balancing. These cannot be switched off in our systems.
              </td>
              <td>Session/authentication token, CSRF and security cookies</td>
            </tr>
            <tr>
              <td>
                <strong>Functional</strong>
              </td>
              <td>
                Remember your choices and preferences to provide a more personalized experience.
              </td>
              <td>Theme preference, language, UI settings</td>
            </tr>
            <tr>
              <td>
                <strong>Analytics / performance</strong>
              </td>
              <td>
                Help us understand how visitors interact with the Services so we can measure and improve
                performance. Used where permitted by your consent settings.
              </td>
              <td>Aggregated usage and performance metrics</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="specific">5. Authentication and preference storage</h2>
      <p>
        To keep you signed in securely, we use an <strong>httpOnly authentication cookie</strong> that
        cannot be read by client-side scripts, which helps protect against certain attacks. We also
        store non-sensitive preferences (such as your theme choice) in your browser&rsquo;s local
        storage so the interface looks the way you expect on your next visit. These are essential or
        functional in nature and are not used for advertising.
      </p>

      <h2 id="third-party">6. Third-party cookies</h2>
      <p>
        Some features rely on third-party providers (for example, payment processing, embedded
        content, or analytics) that may set their own cookies. We do not control these cookies. Please
        refer to the relevant third party&rsquo;s cookie and privacy policies for more information.
      </p>

      <h2 id="managing">7. Managing your cookie preferences</h2>
      <p>
        Most browsers let you view, manage, block, and delete cookies through their settings. You can
        usually find these controls in the &ldquo;Settings&rdquo;, &ldquo;Preferences&rdquo;, or
        &ldquo;Privacy&rdquo; menu of your browser. Helpful guides are available for{' '}
        <a
          href="https://support.google.com/chrome/answer/95647"
          target="_blank"
          rel="noopener noreferrer"
        >
          Chrome
        </a>
        ,{' '}
        <a
          href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
          target="_blank"
          rel="noopener noreferrer"
        >
          Firefox
        </a>
        ,{' '}
        <a
          href="https://support.apple.com/en-us/HT201265"
          target="_blank"
          rel="noopener noreferrer"
        >
          Safari
        </a>
        , and{' '}
        <a
          href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
          target="_blank"
          rel="noopener noreferrer"
        >
          Edge
        </a>
        . Please note that blocking strictly necessary cookies may prevent parts of the Services from
        working properly, including signing in.
      </p>

      <h2 id="dnt">8. Do Not Track</h2>
      <p>
        Some browsers offer a &ldquo;Do Not Track&rdquo; (DNT) signal. Because there is no common
        industry standard for DNT, we currently do not respond to DNT signals. We will update this
        policy if that changes.
      </p>

      <h2 id="changes">9. Changes to this policy</h2>
      <p>
        We may update this Cookies Policy from time to time to reflect changes in technology, law, or
        our practices. When we make changes, we will update the &ldquo;Last updated&rdquo; date above.
        Please revisit this page periodically to stay informed.
      </p>

      <h2 id="contact">10. Contact us</h2>
      <p>If you have questions about our use of cookies, contact us at:</p>
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
