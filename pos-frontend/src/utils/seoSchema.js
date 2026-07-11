import { getSeoPagePath } from "../content/seoContent";
import { getPublicUrl, site } from "../config/site";

const cleanObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (Array.isArray(entry)) return entry.length > 0;
      return entry !== undefined && entry !== null && entry !== "";
    }),
  );

export const buildOrganizationSchema = () =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.legalName || site.brandName,
    alternateName: site.brandName,
    url: site.publicSiteUrl || undefined,
    logo: site.defaultOgImage || undefined,
    sameAs: Object.values(site.socialLinks || {}).filter(Boolean),
    contactPoint: site.supportEmail
      ? {
          "@type": "ContactPoint",
          email: site.supportEmail,
          contactType: "customer support",
          areaServed: "IN",
          availableLanguage: ["en"],
        }
      : undefined,
  });

export const buildWebsiteSchema = () =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.brandName,
    url: site.publicSiteUrl || undefined,
    inLanguage: "en-IN",
  });

export const buildSoftwareSchema = () =>
  cleanObject({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: site.brandName,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: site.publicSiteUrl || undefined,
    areaServed: "IN",
    description:
      "Modern restaurant POS and operations software for cafes and restaurants in India.",
    offers: [
      {
        "@type": "Offer",
        name: "Starter",
        price: "0",
        priceCurrency: "INR",
        description:
          "Starter restaurant operations workspace for early setup and smaller teams.",
      },
      {
        "@type": "Offer",
        name: "Professional",
        price: "2499",
        priceCurrency: "INR",
        billingIncrement: "P1M",
        description:
          "Professional restaurant operations workspace with inventory, analytics, QR menus, and exports.",
      },
    ],
  });

export const buildBreadcrumbSchema = (page) => {
  const section =
    page.type === "blog"
      ? { name: "Blog", path: "/blog" }
      : page.type === "resource"
        ? { name: "Resources", path: "/resources" }
        : page.type === "compare"
          ? { name: "Compare", path: "/compare" }
          : null;
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: getPublicUrl("/"),
    },
  ];

  if (section) {
    items.push({
      "@type": "ListItem",
      position: items.length + 1,
      name: section.name,
      item: getPublicUrl(section.path),
    });
  }

  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: page.title,
    item: getPublicUrl(getSeoPagePath(page)),
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.filter((item) => item.item),
  };
};

export const buildFaqSchema = (faq = []) => {
  if (!faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };
};

export const buildArticleSchema = (page) => {
  if (!["blog", "resource"].includes(page.type)) return null;
  const pathname = getSeoPagePath(page);
  return cleanObject({
    "@context": "https://schema.org",
    "@type": page.type === "blog" ? "BlogPosting" : "Article",
    headline: page.title,
    description: page.description,
    datePublished: page.publishedAt || page.updatedAt,
    dateModified: page.updatedAt || page.publishedAt,
    inLanguage: "en-IN",
    author: {
      "@type": "Organization",
      name: site.brandName,
    },
    publisher: cleanObject({
      "@type": "Organization",
      name: site.brandName,
      logo: site.defaultOgImage
        ? {
            "@type": "ImageObject",
            url: site.defaultOgImage,
          }
        : undefined,
    }),
    mainEntityOfPage: getPublicUrl(pathname)
      ? {
          "@type": "WebPage",
          "@id": getPublicUrl(pathname),
        }
      : undefined,
  });
};

export const buildPageSchemas = (page) =>
  [
    buildBreadcrumbSchema(page),
    buildArticleSchema(page),
    buildFaqSchema(page.faq),
  ].filter(Boolean);

export const buildHomeSchemas = () =>
  [
    buildOrganizationSchema(),
    buildWebsiteSchema(),
    buildSoftwareSchema(),
  ].filter(Boolean);
