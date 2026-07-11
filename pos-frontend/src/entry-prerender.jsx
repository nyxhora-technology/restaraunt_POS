import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Landing from "./pages/Landing";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import store from "./redux/store";
import {
  getPublicSeoPaths,
  getSeoIndexByPath,
  getSeoPageByPath,
} from "./content/seoContent";
import { SeoDetailPage, SeoIndexPage } from "./pages/SeoContent";

const PUBLIC_ROUTES = {
  "/": Landing,
  "/terms": Terms,
  "/privacy": Privacy,
};

export const publicPaths = [
  ...Object.keys(PUBLIC_ROUTES),
  ...getPublicSeoPaths(),
];

const getPublicElement = (pathname) => {
  const StaticPage = PUBLIC_ROUTES[pathname];
  if (StaticPage) return <StaticPage />;

  const index = getSeoIndexByPath(pathname);
  if (index) return <SeoIndexPage type={index.type} />;

  const page = getSeoPageByPath(pathname);
  if (page) return <SeoDetailPage page={page} />;

  throw new Error(`Unsupported public route: ${pathname}`);
};

export const renderPublicRoute = (pathname) => {
  const helmetContext = {};
  const queryClient = new QueryClient();
  const markup = renderToStaticMarkup(
    <HelmetProvider context={helmetContext}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <StaticRouter location={pathname}>
            {getPublicElement(pathname)}
          </StaticRouter>
        </QueryClientProvider>
      </Provider>
    </HelmetProvider>,
  );
  const { helmet } = helmetContext;

  return {
    markup,
    head: [
      helmet?.title?.toString(),
      helmet?.meta?.toString(),
      helmet?.link?.toString(),
      helmet?.script?.toString(),
    ]
      .filter(Boolean)
      .join("\n"),
  };
};
