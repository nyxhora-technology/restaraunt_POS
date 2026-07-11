import { Helmet } from "react-helmet-async";
import { HiArrowLeft } from "react-icons/hi";
import { Link } from "react-router-dom";
import { PublicFooter, PublicNav } from "../components/public/PublicChrome";

export default function NotFound() {
  return (
    <main className="marketing-page landing-v2 seo-page">
      <Helmet>
        <title>Page not found</title>
        <meta name="robots" content="noindex,follow" />
      </Helmet>
      <PublicNav />
      <section className="seo-hero is-compact">
        <p className="seo-kicker">404</p>
        <h1>That page does not exist.</h1>
        <p>
          The address may have changed. Return to the product overview or use
          the restaurant POS resources in the navigation.
        </p>
        <div className="landing-hero-actions">
          <Link className="marketing-button" to="/">
            <HiArrowLeft /> Back to homepage
          </Link>
          <Link className="landing-secondary-button" to="/restaurant-pos-india">
            Explore restaurant POS
          </Link>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
