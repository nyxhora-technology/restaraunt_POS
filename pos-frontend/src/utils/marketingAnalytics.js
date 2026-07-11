const EVENT_NAME = "pos:marketing-event";

export const trackMarketingEvent = (name, properties = {}) => {
  if (typeof window === "undefined") return;

  const payload = {
    event: name,
    page_path: window.location.pathname,
    ...properties,
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
};

export const marketingAnalyticsEventName = EVENT_NAME;
