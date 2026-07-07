export const publicSiteUrl = __PUBLIC_SITE_URL__;
export const seoIndexingEnabled = __SEO_INDEXING_ENABLED__;
export const seoRobots = seoIndexingEnabled
  ? "index,follow,max-image-preview:large"
  : "noindex,nofollow";

export const getPublicUrl = (pathname = "/") => {
  if (!seoIndexingEnabled || !publicSiteUrl) return "";
  return new URL(pathname, `${publicSiteUrl}/`).toString();
};
