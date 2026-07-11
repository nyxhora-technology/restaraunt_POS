import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { getSitemapEntries } from "./src/content/seoContent.js";

const parseBoolean = (value) => value?.trim().toLowerCase() === "true";

const normalizePublicSiteUrl = (rawValue, indexingEnabled, mode) => {
  if (!rawValue) {
    if (indexingEnabled && mode === "production") {
      throw new Error(
        "PUBLIC_SITE_URL is required when SEO_INDEXING_ENABLED=true",
      );
    }
    return "";
  }

  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error("PUBLIC_SITE_URL must be a valid absolute URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("PUBLIC_SITE_URL must use http or https");
  }
  if (
    indexingEnabled &&
    mode === "production" &&
    parsed.protocol !== "https:"
  ) {
    throw new Error(
      "PUBLIC_SITE_URL must use https when SEO indexing is enabled",
    );
  }
  return parsed.origin;
};

const assertIndexingIdentity = ({
  indexingEnabled,
  mode,
  brandName,
  legalName,
  supportEmail,
  privacyEmail,
}) => {
  if (!indexingEnabled || mode !== "production") return;

  const unresolved = [brandName, legalName].some(
    (value) => !value || value.includes("%placeholder"),
  );
  const invalidEmail = [supportEmail, privacyEmail].some(
    (value) => !value || !value.includes("@") || value.endsWith("@example.com"),
  );

  if (unresolved || invalidEmail) {
    throw new Error(
      "SEO indexing requires final BRAND_NAME, LEGAL_NAME, SUPPORT_EMAIL, and PRIVACY_EMAIL values",
    );
  }
};

const createSeoPlugin = ({
  publicSiteUrl,
  indexingEnabled,
  brandName,
  legalName,
  defaultOgImage,
}) => {
  let resolvedConfig;
  const robots = indexingEnabled
    ? `User-agent: *\nAllow: /\n\nSitemap: ${publicSiteUrl}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";

  return {
    name: "domain-safe-seo",
    configResolved(config) {
      resolvedConfig = config;
    },
    transformIndexHtml(html) {
      let transformed = html
        .replaceAll(
          "__SEO_ROBOTS__",
          indexingEnabled
            ? "index,follow,max-image-preview:large"
            : "noindex,nofollow",
        )
        .replaceAll("__BRAND_NAME__", brandName)
        .replaceAll("__BRAND_LEGAL_NAME__", legalName)
        .replaceAll("__DEFAULT_OG_IMAGE__", defaultOgImage);

      if (indexingEnabled) {
        return transformed
          .replaceAll("__PUBLIC_SITE_URL__", publicSiteUrl)
          .replaceAll(" data-seo-absolute", "");
      }

      transformed = transformed.replace(
        /^\s*<[^>]+data-seo-absolute[^>]*>\s*$/gm,
        "",
      );
      transformed = transformed.replace(
        /^\s*"url": "__PUBLIC_SITE_URL__\/",\s*$/gm,
        "",
      );
      return transformed;
    },
    closeBundle() {
      if (!resolvedConfig || resolvedConfig.build.ssr) return;
      const outDir = path.resolve(
        resolvedConfig.root,
        resolvedConfig.build.outDir,
      );
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, "robots.txt"), robots, "utf8");
      const sitemapPath = path.join(outDir, "sitemap.xml");

      if (!indexingEnabled) {
        fs.rmSync(sitemapPath, { force: true });
        return;
      }

      const entries = [
        ["/", "weekly", "1.0"],
        ["/terms", "yearly", "0.2"],
        ["/privacy", "yearly", "0.2"],
        ...getSitemapEntries().map((entry) => [
          entry.pathname,
          entry.changefreq,
          entry.priority,
          entry.lastmod,
        ]),
      ];
      const urls = entries
        .map(
          ([pathname, changefreq, priority, lastmod]) => `  <url>
    <loc>${publicSiteUrl}${pathname}</loc>
${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""}    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
        )
        .join("\n");
      fs.writeFileSync(
        sitemapPath,
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        "utf8",
      );
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isSsrBuild = process.argv.includes("--ssr");
  const indexingEnabled = parseBoolean(env.SEO_INDEXING_ENABLED);
  const publicSiteUrl = normalizePublicSiteUrl(
    env.PUBLIC_SITE_URL,
    indexingEnabled,
    mode,
  );
  const brandName = env.BRAND_NAME || "%placeholder for name%";
  const legalName = env.LEGAL_NAME || brandName;
  const supportEmail = env.SUPPORT_EMAIL || "support@example.com";
  const privacyEmail = env.PRIVACY_EMAIL || "privacy@example.com";
  const defaultOgImage =
    env.DEFAULT_OG_IMAGE_URL ||
    (publicSiteUrl ? `${publicSiteUrl}/og-image.png` : "");
  const socialLinks = {
    linkedin: env.PUBLIC_LINKEDIN_URL || "",
    instagram: env.PUBLIC_INSTAGRAM_URL || "",
    x: env.PUBLIC_X_URL || "",
  };

  assertIndexingIdentity({
    indexingEnabled,
    mode,
    brandName,
    legalName,
    supportEmail,
    privacyEmail,
  });

  return {
    define: {
      __PUBLIC_SITE_URL__: JSON.stringify(publicSiteUrl),
      __SEO_INDEXING_ENABLED__: JSON.stringify(indexingEnabled),
      __BRAND_NAME__: JSON.stringify(brandName),
      __LEGAL_NAME__: JSON.stringify(legalName),
      __SUPPORT_EMAIL__: JSON.stringify(supportEmail),
      __PRIVACY_EMAIL__: JSON.stringify(privacyEmail),
      __DEFAULT_OG_IMAGE__: JSON.stringify(defaultOgImage),
      __SOCIAL_LINKS__: JSON.stringify(socialLinks),
    },
    plugins: [
      react(),
      createSeoPlugin({
        publicSiteUrl,
        indexingEnabled,
        brandName,
        legalName,
        defaultOgImage,
      }),
    ],
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
        "/socket.io": {
          target: "ws://localhost:8000",
          ws: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 400,
      ...(isSsrBuild
        ? {}
        : {
            rollupOptions: {
              output: {
                manualChunks: {
                  "vendor-react": ["react", "react-dom", "react-router-dom"],
                  "vendor-redux": ["@reduxjs/toolkit", "react-redux"],
                  "vendor-query": ["@tanstack/react-query"],
                  "vendor-ui": ["react-icons", "notistack"],
                  "vendor-socket": ["socket.io-client"],
                },
              },
            },
          }),
    },
  };
});
