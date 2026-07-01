import { useSelector } from "react-redux";

const getCurrencyDetails = (currencyCode) => {
  switch (currencyCode) {
    case "USD":
    case "AUD":
      return { locale: "en-US", symbol: "$" };
    case "EUR":
      return { locale: "de-DE", symbol: "€" };
    case "GBP":
      return { locale: "en-GB", symbol: "£" };
    case "INR":
    default:
      return { locale: "en-IN", symbol: "₹" };
  }
};

const useCurrency = () => {
  const currencyCode = useSelector(
    (state) => state.user.restaurant?.currency || "INR"
  );
  
  const { locale, symbol } = getCurrencyDetails(currencyCode);

  const format = (value) => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  };

  return {
    format,
    symbol,
    currencyCode,
  };
};

export default useCurrency;
