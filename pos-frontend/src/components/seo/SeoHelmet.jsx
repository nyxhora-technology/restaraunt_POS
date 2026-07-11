import { Helmet } from "react-helmet-async";
import {
  defaultOgImage,
  getPublicUrl,
  seoIndexingEnabled,
  seoRobots,
  site,
} from "../../config/site";
import {
  buildFaqSchema,
  buildHomeSchemas,
  buildPageSchemas,
} from "../../utils/seoSchema";

const serializeSchema = (schema) =>
  JSON.stringify(
    Array.isArray(schema) && schema.length === 1 ? schema[0] : schema,
  );

export default function SeoHelmet({
  title,
  description,
  pathname,
  type = "website",
  page,
  schemas,
  faq,
}) {
  const canonical = seoIndexingEnabled ? getPublicUrl(pathname) : "";
  const fullTitle = title.includes(site.brandName)
    ? title
    : `${title} | ${site.brandName}`;
  const schemaData =
    schemas ||
    (page
      ? buildPageSchemas(page)
      : pathname === "/"
        ? [...buildHomeSchemas(), buildFaqSchema(faq)].filter(Boolean)
        : []);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={seoRobots} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={site.brandName} />
      <meta property="og:locale" content="en_IN" />
      <meta
        name="twitter:card"
        content={defaultOgImage ? "summary_large_image" : "summary"}
      />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {canonical && (
        <>
          <link rel="canonical" href={canonical} />
          <meta property="og:url" content={canonical} />
        </>
      )}
      {defaultOgImage && (
        <>
          <meta property="og:image" content={defaultOgImage} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta
            property="og:image:alt"
            content={`${site.brandName} restaurant POS preview`}
          />
          <meta name="twitter:image" content={defaultOgImage} />
        </>
      )}
      {page?.publishedAt && (
        <meta property="article:published_time" content={page.publishedAt} />
      )}
      {page?.updatedAt && (
        <meta property="article:modified_time" content={page.updatedAt} />
      )}
      {schemaData.length > 0 && seoIndexingEnabled && (
        <script type="application/ld+json">
          {serializeSchema(schemaData)}
        </script>
      )}
    </Helmet>
  );
}
