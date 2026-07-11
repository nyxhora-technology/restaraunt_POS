export const publicSiteUrl = __PUBLIC_SITE_URL__;
export const seoIndexingEnabled = __SEO_INDEXING_ENABLED__;
export const brandName = __BRAND_NAME__;
export const legalName = __LEGAL_NAME__;
export const supportEmail = __SUPPORT_EMAIL__;
export const privacyEmail = __PRIVACY_EMAIL__;
export const defaultOgImage = __DEFAULT_OG_IMAGE__;
export const socialLinks = __SOCIAL_LINKS__;

export const site = {
  brandName,
  legalName,
  publicSiteUrl,
  supportEmail,
  privacyEmail,
  defaultOgImage,
  socialLinks,
};

export const seoRobots = seoIndexingEnabled
  ? "index,follow,max-image-preview:large"
  : "noindex,nofollow";

export const getPublicUrl = (pathname = "/") => {
  if (!seoIndexingEnabled || !publicSiteUrl) return "";
  return new URL(pathname, `${publicSiteUrl}/`).toString();
};
