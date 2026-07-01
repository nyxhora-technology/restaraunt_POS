import { useSelector } from "react-redux";

const PLAN_FEATURES = {
  STARTER: ["CORE_POS"],
  PROFESSIONAL: ["CORE_POS", "INVENTORY", "QR_MENU"],
  ENTERPRISE: ["CORE_POS", "INVENTORY", "QR_MENU", "ADVANCED_ANALYTICS"],
};

const PLAN_LABELS = {
  STARTER: { label: "Starter", color: "#6b7280" },
  PROFESSIONAL: { label: "Professional", color: "#02ca3a" },
  ENTERPRISE: { label: "Enterprise", color: "#f59e0b" },
};

const DEV_UNLOCK_FEATURES =
  import.meta.env.DEV && import.meta.env.VITE_DEV_UNLOCK_FEATURES !== "false";
const ALL_FEATURES = Array.from(new Set(Object.values(PLAN_FEATURES).flat()));

const useFeature = () => {
  const restaurant = useSelector((state) => state.user.restaurant);
  const plan = restaurant?.plan || "STARTER";
  const features = DEV_UNLOCK_FEATURES
    ? ALL_FEATURES
    : PLAN_FEATURES[plan] || PLAN_FEATURES.STARTER;

  const hasFeature = (feature) => features.includes(feature);

  return {
    plan,
    planLabel: PLAN_LABELS[plan]?.label || "Starter",
    planColor: PLAN_LABELS[plan]?.color || "#6b7280",
    hasInventory: hasFeature("INVENTORY"),
    hasQrMenu: hasFeature("QR_MENU"),
    hasFeature,
    devUnlockFeatures: DEV_UNLOCK_FEATURES,
    PLAN_LABELS,
  };
};

export default useFeature;
