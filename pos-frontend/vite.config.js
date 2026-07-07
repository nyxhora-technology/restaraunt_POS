import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

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

const createSeoPlugin = ({ publicSiteUrl, indexingEnabled }) => {
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
      let transformed = html.replaceAll(
        "__SEO_ROBOTS__",
        indexingEnabled
          ? "index,follow,max-image-preview:large"
          : "noindex,nofollow",
      );

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
      ];
      const urls = entries
        .map(
          ([pathname, changefreq, priority]) => `  <url>
    <loc>${publicSiteUrl}${pathname}</loc>
    <changefreq>${changefreq}</changefreq>
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

  return {
    define: {
      __PUBLIC_SITE_URL__: JSON.stringify(publicSiteUrl),
      __SEO_INDEXING_ENABLED__: JSON.stringify(indexingEnabled),
    },
    plugins: [react(), createSeoPlugin({ publicSiteUrl, indexingEnabled })],
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
          }
        ),
    },
  };
});
