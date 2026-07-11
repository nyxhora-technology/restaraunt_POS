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

export default function Terms() {
  return (
    <main className="legal-page">
      <Helmet>
        <title>{`Terms of Service | ${site.brandName}`}</title>
        <meta
          name="description"
          content={`Read the terms that govern your use of the ${site.brandName} restaurant operations platform.`}
        />
        <meta name="robots" content={seoRobots} />
        {seoIndexingEnabled && (
          <link rel="canonical" href={getPublicUrl("/terms")} />
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
          <h1>Terms of Service</h1>
          <p>Effective {EFFECTIVE_DATE}</p>
        </header>

        <div className="legal-intro">
          These Terms of Service govern access to and use of {site.brandName}.
          By creating an account or using the service, you agree to these terms.
        </div>

        <section>
          <h2>1. About {site.brandName}</h2>
          <p>
            {site.brandName} provides restaurant operations software, including tools for
            managing orders, tables, menus, staff, inventory, payments,
            reporting, and QR menus. Features may vary by plan, location, or
            integration availability.
          </p>
        </section>

        <section>
          <h2>2. Eligibility and accounts</h2>
          <p>
            You must be legally capable of entering a binding agreement and
            authorized to act for the business you register. You are responsible
            for accurate account information, safeguarding credentials, and all
            activity under your account.
          </p>
          <p>
            Restaurant owners and administrators are responsible for assigning
            appropriate staff roles and promptly removing access when it is no
            longer required. Shared credentials should not be used.
          </p>
        </section>

        <section>
          <h2>3. Acceptable use</h2>
          <p>You may not use {site.brandName} to:</p>
          <ul>
            <li>break applicable laws or infringe another person&apos;s rights;</li>
            <li>upload malicious code or interfere with service security;</li>
            <li>access accounts, data, or systems without authorization;</li>
            <li>reverse engineer or resell the service except where permitted by law or written agreement;</li>
            <li>use the service for fraudulent, deceptive, or abusive activity.</li>
          </ul>
        </section>

        <section>
          <h2>4. Restaurant data and responsibilities</h2>
          <p>
            You retain ownership of business data you submit to {site.brandName}. You grant
            us a limited right to host, process, transmit, and display that data
            only as needed to operate, secure, support, and improve the service.
          </p>
          <p>
            You are responsible for the legality and accuracy of menu,
            tax, pricing, employee, customer, and transaction information you
            enter, as well as any required notices or consents.
          </p>
        </section>

        <section>
          <h2>5. Payments and third-party services</h2>
          <p>
            Payment processing, email, authentication, and other integrations
            may be supplied by third parties under their own terms. {site.brandName} does
            not hold full payment-card details. You are responsible for fees,
            refunds, taxes, and compliance obligations associated with your
            restaurant&apos;s transactions.
          </p>
        </section>

        <section>
          <h2>6. Plans, fees, and changes</h2>
          <p>
            Paid plans, billing periods, taxes, and renewal terms will be shown
            before purchase. Unless stated otherwise, subscriptions renew until
            cancelled. We may change features or pricing with reasonable notice
            where required.
          </p>
        </section>

        <section>
          <h2>7. Service availability</h2>
          <p>
            We work to keep {site.brandName} reliable, but do not guarantee uninterrupted
            or error-free availability. Maintenance, internet failures,
            third-party outages, emergencies, or events outside our control may
            affect the service.
          </p>
        </section>

        <section>
          <h2>8. Intellectual property</h2>
          <p>
            {site.brandName} and its software, branding, interfaces, and documentation are
            owned by us or our licensors. These terms grant only a limited,
            non-exclusive, non-transferable right to use the service during your
            authorized access.
          </p>
        </section>

        <section>
          <h2>9. Suspension and termination</h2>
          <p>
            You may stop using {site.brandName} at any time. We may suspend or terminate
            access for material breach, non-payment, security risk, unlawful
            activity, or harm to the service or others. Where practical, we will
            provide notice and an opportunity to resolve the issue.
          </p>
        </section>

        <section>
          <h2>10. Disclaimers and liability</h2>
          <p>
            To the extent permitted by law, {site.brandName} is provided “as is” and
            without implied warranties. {site.brandName} is an operations tool and does
            not provide legal, tax, accounting, employment, or food-safety
            advice.
          </p>
          <p>
            To the extent permitted by law, neither party is liable for indirect,
            incidental, special, consequential, or punitive damages. Our total
            liability relating to the service will not exceed the amount paid
            for the service during the twelve months preceding the claim.
            Nothing in these terms excludes liability that cannot legally be
            excluded.
          </p>
        </section>

        <section>
          <h2>11. Changes to these terms</h2>
          <p>
            We may update these terms to reflect product, legal, or operational
            changes. We will post the revised date and provide additional notice
            for material changes where required. Continued use after a change
            becomes effective constitutes acceptance.
          </p>
        </section>

        <section>
          <h2>12. Contact</h2>
          <p>
            Questions about these terms can be sent to{" "}
            <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
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
