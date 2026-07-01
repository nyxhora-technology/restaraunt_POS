import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Provider } from "react-redux";
import store from "./redux/store.js";
import { SnackbarProvider } from "notistack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <SnackbarProvider autoHideDuration={3000}>
        <QueryClientProvider client={queryClient} >
          <App />
        </QueryClientProvider>
      </SnackbarProvider>
    </Provider>
  </StrictMode>
);
