import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distDir = path.join(projectRoot, "dist");
const prerenderDir = path.join(projectRoot, ".prerender");
const entryUrl = pathToFileURL(
  path.join(prerenderDir, "entry-prerender.js"),
).href;
const { renderPublicRoute } = await import(entryUrl);
const baseHtml = fs.readFileSync(path.join(distDir, "index.html"), "utf8");

const injectMarkup = (html, markup) => {
  const placeholder = '<div id="root"></div>';
  if (!html.includes(placeholder)) {
    throw new Error("Prerender failed: root placeholder was not found");
  }
  return html.replace(placeholder, `<div id="root">${markup}</div>`);
};

const replacePageHead = (html, head) => {
  let next = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/i, "")
    .replace(/<meta\s+name="robots"[^>]*>/i, "")
    .replace(/<link\s+rel="canonical"[^>]*>/i, "");
  return next.replace("</head>", `${head}\n</head>`);
};

for (const pathname of ["/", "/terms", "/privacy"]) {
  const { markup, head } = renderPublicRoute(pathname);
  const routeHtml =
    pathname === "/"
      ? injectMarkup(baseHtml, markup)
      : injectMarkup(replacePageHead(baseHtml, head), markup);
  const outputPath =
    pathname === "/"
      ? path.join(distDir, "index.html")
      : path.join(distDir, pathname.slice(1), "index.html");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, routeHtml, "utf8");
}

fs.rmSync(prerenderDir, { recursive: true, force: true });
