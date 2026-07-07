import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import Landing from "./pages/Landing";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

const PUBLIC_ROUTES = {
  "/": Landing,
  "/terms": Terms,
  "/privacy": Privacy,
};

export const renderPublicRoute = (pathname) => {
  const Page = PUBLIC_ROUTES[pathname];
  if (!Page) throw new Error(`Unsupported public route: ${pathname}`);

  const helmetContext = {};
  const markup = renderToStaticMarkup(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={pathname}>
        <Page />
      </StaticRouter>
    </HelmetProvider>,
  );
  const { helmet } = helmetContext;

  return {
    markup,
    head: [
      helmet?.title?.toString(),
      helmet?.meta?.toString(),
      helmet?.link?.toString(),
    ]
      .filter(Boolean)
      .join("\n"),
  };
};
