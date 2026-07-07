import { useQuery } from "@tanstack/react-query";
import { MdLockOutline } from "react-icons/md";
import { getOrderUsage } from "../../https";

const PlanLimitBadge = ({ resource, warnAt = 5 }) => {
  const { data } = useQuery({
    queryKey: ["order-usage"],
    queryFn: getOrderUsage,
    staleTime: 60_000,
  });
  const usage = data?.data?.data?.resources?.[resource];
  if (!usage || usage.limit === null) return null;
  const remaining = Math.max(0, usage.limit - usage.used);
  const warning = remaining <= warnAt;
  return (
    <span className={`plan-limit-badge ${warning ? "is-warning" : ""}`}>
      {warning && <MdLockOutline />}
      {usage.used} / {usage.limit}
      <small>{remaining ? `${remaining} remaining` : "limit reached"}</small>
    </span>
  );
};

export default PlanLimitBadge;
