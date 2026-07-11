import { Link, Navigate } from "react-router-dom";
import {
  HiArrowRight,
  HiCheck,
  HiOutlineBookOpen,
  HiOutlineClipboardList,
  HiOutlineLocationMarker,
  HiOutlineSparkles,
} from "react-icons/hi";
import {
  getSeoPagePath,
  getSeoPagesByType,
  seoIndexes,
} from "../content/seoContent";
import SeoHelmet from "../components/seo/SeoHelmet";
import { PublicFooter, PublicNav } from "../components/public/PublicChrome";
import { site } from "../config/site";

const typeLabels = {
  landing: "Pillar page",
  city: "City page",
  blog: "Blog",
  resource: "Resource",
  compare: "Comparison",
};

const pageHelmetProps = (page) => ({
  title: page.seoTitle || page.title,
  description: page.description,
  pathname: getSeoPagePath(page),
  type: page.type === "blog" ? "article" : "website",
  page,
});

const getExpandedFaq = (page) => {
  const baseFaq = page.faq || [];
  if (baseFaq.length >= 4) return baseFaq;
  const additions = [
    {
      question: `Who should read this ${typeLabels[page.type].toLowerCase()}?`,
      answer:
        "This page is written for cafe owners, restaurant operators, managers, and teams evaluating a modern POS workflow for Indian restaurant service.",
    },
    {
      question: `How does this relate to ${page.primaryKeyword}?`,
      answer: `The page focuses on ${page.primaryKeyword} by connecting the search topic to practical restaurant operations: orders, billing, tables, staff, QR menus, inventory, and reporting.`,
    },
    {
      question: "Should restaurants decide only from this page?",
      answer:
        "No. Use this page as a shortlisting resource, then validate the workflow against the restaurant's menu, service model, staff roles, payment process, and reporting needs.",
    },
  ];
  return [...baseFaq, ...additions].slice(0, 4);
};

function PageCard({ page }) {
  const icon =
    page.type === "city"
      ? HiOutlineLocationMarker
      : page.type === "resource"
        ? HiOutlineClipboardList
        : HiOutlineBookOpen;
  const Icon = icon;

  return (
    <Link className="seo-card" to={getSeoPagePath(page)}>
      <span>
        <Icon /> {typeLabels[page.type]}
      </span>
      <h3>{page.title}</h3>
      <p>{page.description}</p>
      <small>
        Read page <HiArrowRight />
      </small>
    </Link>
  );
}

function SeoShell({ children }) {
  return (
    <main className="marketing-page landing-v2 seo-page">
      <PublicNav />
      {children}
      <PublicFooter />
    </main>
  );
}

export function SeoIndexPage({ type }) {
  const index = seoIndexes.find((item) => item.type === type);
  if (!index) return <Navigate to="/" replace />;
  const pages = getSeoPagesByType(type);

  return (
    <SeoShell>
      <SeoHelmet
        title={index.title}
        description={index.description}
        pathname={index.path}
      />
      <section className="seo-hero is-compact">
        <p className="seo-kicker">{type === "blog" ? "Blog" : "Resources"}</p>
        <h1>{index.title}</h1>
        <p>{index.description}</p>
      </section>
      <section className="seo-list-section">
        <div className="seo-grid">
          {pages.map((page) => (
            <PageCard key={page.slug} page={page} />
          ))}
        </div>
      </section>
    </SeoShell>
  );
}

function ComparisonTable({ rows }) {
  if (!rows?.length) return null;
  return (
    <div className="seo-table-wrap">
      <table className="seo-table">
        <thead>
          <tr>
            <th>Decision area</th>
            <th>Traditional approach</th>
            <th>Modern POS approach</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([area, traditional, modern]) => (
            <tr key={area}>
              <td>{area}</td>
              <td>{traditional}</td>
              <td>{modern}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Checklist({ items }) {
  if (!items?.length) return null;
  return (
    <div className="seo-checklist">
      {items.map((item) => (
        <div key={item}>
          <HiCheck />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function Faq({ items }) {
  if (!items?.length) return null;
  return (
    <section className="seo-faq">
      <p className="seo-kicker">FAQ</p>
      <h2>Common questions</h2>
      <div>
        {items.map(({ question, answer }) => (
          <article key={question}>
            <h3>{question}</h3>
            <p>{answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function TableOfContents({ sections }) {
  if (!sections?.length) return null;
  return (
    <nav className="seo-toc" aria-label="Article sections">
      <strong>On this page</strong>
      {sections.map((section) => (
        <a href={`#${section.id}`} key={section.id}>
          {section.heading}
        </a>
      ))}
    </nav>
  );
}

function RelatedPages({ page }) {
  const related = [
    ...getSeoPagesByType("landing"),
    ...getSeoPagesByType("resource"),
    ...getSeoPagesByType("blog"),
  ]
    .filter((item) => item.slug !== page.slug)
    .slice(0, 3);

  return (
    <section className="seo-related">
      <p className="seo-kicker">Keep reading</p>
      <h2>Related restaurant operations resources</h2>
      <div className="seo-grid">
        {related.map((item) => (
          <PageCard key={item.slug} page={item} />
        ))}
      </div>
    </section>
  );
}

export function SeoDetailPage({ page }) {
  if (!page) return <Navigate to="/" replace />;
  const articleSections = page.sections?.map((section, index) => ({
    ...section,
    id: `section-${index + 1}`,
  }));
  const expandedFaq = getExpandedFaq(page);
  const pageWithExpandedFaq = { ...page, faq: expandedFaq };

  return (
    <SeoShell>
      <SeoHelmet {...pageHelmetProps(pageWithExpandedFaq)} />
      <article className="seo-article">
        <header className="seo-hero">
          <p className="seo-kicker">{typeLabels[page.type]}</p>
          <h1>{page.title}</h1>
          <p>{page.intro}</p>
          <div className="seo-meta-row">
            <span>{page.primaryKeyword}</span>
            {page.city && <span>{page.city}</span>}
            {page.updatedAt && <span>Updated {page.updatedAt}</span>}
          </div>
        </header>

        <section className="seo-direct-answer">
          <p className="seo-kicker">Direct answer</p>
          <p>{page.intro}</p>
        </section>

        {page.type === "blog" && (
          <div className="seo-byline">
            <span>{site.brandName} editorial team</span>
            {page.updatedAt && <span>Last reviewed {page.updatedAt}</span>}
          </div>
        )}

        <TableOfContents sections={articleSections} />

        {page.takeaways?.length > 0 && (
          <section className="seo-summary">
            <div>
              <HiOutlineSparkles />
              <h2>Key takeaways</h2>
            </div>
            <Checklist items={page.takeaways} />
          </section>
        )}

        <Checklist items={page.checklist} />
        <ComparisonTable rows={page.comparison} />

        {articleSections?.map((section) => (
          <section
            className="seo-copy-section"
            id={section.id}
            key={section.heading}
          >
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
            <Checklist items={section.items} />
          </section>
        ))}

        <Faq items={expandedFaq} />

        <section className="seo-cta">
          <div>
            <p className="seo-kicker">Product fit</p>
            <h2>
              Built for modern cafes and restaurants that need connected
              service.
            </h2>
            <p>
              Use the platform to connect order entry, kitchen status, billing,
              payments, table flow, staff roles, QR menus, inventory, and owner
              review without locking the public site to a final brand or domain
              yet.
            </p>
          </div>
          <Link className="marketing-button" to="/auth?tab=register">
            Create account <HiArrowRight />
          </Link>
        </section>
      </article>
      <RelatedPages page={page} />
    </SeoShell>
  );
}
