import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { HiArrowLeft } from "react-icons/hi";
import logo from "../assets/images/logo.png";
import {
  getPublicUrl,
  seoIndexingEnabled,
  seoRobots,
  site,
} from "../config/site";

const EFFECTIVE_DATE = "July 4, 2026";

export default function Privacy() {
  return (
    <main className="legal-page">
      <Helmet>
        <title>{`Privacy Policy | ${site.brandName}`}</title>
        <meta
          name="description"
          content={`Learn how ${site.brandName} collects, uses, protects, and shares personal information.`}
        />
        <meta name="robots" content={seoRobots} />
        {seoIndexingEnabled && (
          <link rel="canonical" href={getPublicUrl("/privacy")} />
        )}
      </Helmet>
      <nav className="legal-nav">
        <Link className="marketing-brand" to="/">
          <img src={logo} alt="" />
          <span>{site.brandName}</span>
        </Link>
        <Link className="legal-back" to="/">
          <HiArrowLeft /> Back to home
        </Link>
      </nav>

      <article className="legal-document">
        <header>
          <span>Legal</span>
          <h1>Privacy Policy</h1>
          <p>Effective {EFFECTIVE_DATE}</p>
        </header>

        <div className="legal-intro">
          This policy explains what information {site.brandName} collects, why we use it,
          how it is shared, and the choices available to you.
        </div>

        <section>
          <h2>1. Information we collect</h2>
          <h3>Account and business information</h3>
          <p>
            We collect details such as names, email addresses, phone numbers,
            authentication identifiers, restaurant information, staff roles, and
            account preferences.
          </p>
          <h3>Operational information</h3>
          <p>
            When you use {site.brandName}, we process menu, order, table, inventory,
            supplier, payment-status, receipt, staff, and reporting data entered
            by authorized users.
          </p>
          <h3>Technical and usage information</h3>
          <p>
            We may collect IP address, browser and device type, timestamps,
            referring pages, feature interactions, logs, error reports, and
            security events.
          </p>
        </section>

        <section>
          <h2>2. How we use information</h2>
          <ul>
            <li>provide, maintain, and secure the {site.brandName} service;</li>
            <li>authenticate users and enforce role-based permissions;</li>
            <li>process restaurant workflows and requested integrations;</li>
            <li>provide support and communicate service information;</li>
            <li>monitor reliability, prevent fraud, and investigate abuse;</li>
            <li>understand usage and improve product performance;</li>
            <li>comply with legal obligations and enforce our agreements.</li>
          </ul>
        </section>

        <section>
          <h2>3. Legal bases</h2>
          <p>
            Where applicable, we process personal information to perform our
            contract, pursue legitimate interests such as security and product
            improvement, comply with legal obligations, and act with consent
            where consent is required.
          </p>
        </section>

        <section>
          <h2>4. How information is shared</h2>
          <p>We may share limited information with:</p>
          <ul>
            <li>service providers supporting hosting, email, authentication, analytics, support, and payments;</li>
            <li>restaurant account owners and authorized team members according to assigned roles;</li>
            <li>professional advisers, auditors, insurers, or authorities where legally necessary;</li>
            <li>a successor in connection with a merger, financing, acquisition, or sale of assets.</li>
          </ul>
          <p>
            We do not sell personal information or share it for cross-context
            behavioral advertising.
          </p>
        </section>

        <section>
          <h2>5. Google sign-in</h2>
          <p>
            If you register with Google, we receive basic account information
            authorized by you, typically your name, email address, profile image,
            and verification status. We use it to create and secure your {site.brandName}
            account. Google&apos;s handling of information is governed by its own
            privacy policy.
          </p>
        </section>

        <section>
          <h2>6. Cookies and similar technologies</h2>
          <p>
            {site.brandName} uses essential cookies to maintain secure sessions, remember
            preferences, and protect accounts. We may use limited analytics
            technologies to understand service performance. Browser settings can
            control cookies, but blocking essential cookies may prevent sign-in.
          </p>
        </section>

        <section>
          <h2>7. Data retention</h2>
          <p>
            We retain information while an account is active and as reasonably
            necessary to provide the service, meet legal and accounting
            requirements, resolve disputes, prevent abuse, and enforce
            agreements. Retention periods vary by data type and applicable law.
          </p>
        </section>

        <section>
          <h2>8. Security</h2>
          <p>
            We apply administrative, technical, and organizational safeguards
            designed to protect information, including access controls, secure
            authentication, and transport encryption. No method of storage or
            transmission is completely secure, so absolute security cannot be
            guaranteed.
          </p>
        </section>

        <section>
          <h2>9. Your rights and choices</h2>
          <p>
            Depending on your location, you may request access, correction,
            deletion, portability, or restriction of personal information, or
            object to certain processing. You may also withdraw consent where
            processing relies on consent. We may need to verify your identity
            before completing a request.
          </p>
        </section>

        <section>
          <h2>10. International transfers</h2>
          <p>
            Information may be processed in countries other than your own. Where
            required, we use recognized safeguards for international transfers.
          </p>
        </section>

        <section>
          <h2>11. Children&apos;s privacy</h2>
          <p>
            {site.brandName} is a business service and is not directed to children. We do
            not knowingly collect personal information from children through
            account registration.
          </p>
        </section>

        <section>
          <h2>12. Policy updates</h2>
          <p>
            We may update this policy as our practices, product, or legal
            obligations change. The effective date above identifies the latest
            version. We will provide additional notice for material changes where
            required.
          </p>
        </section>

        <section>
          <h2>13. Contact us</h2>
          <p>
            Privacy questions and rights requests can be sent to{" "}
            <a href={`mailto:${site.privacyEmail}`}>{site.privacyEmail}</a>.
          </p>
        </section>
      </article>

      <footer className="legal-footer">
        <span>© {new Date().getFullYear()} {site.legalName}</span>
        <div><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link></div>
      </footer>
    </main>
  );
}
