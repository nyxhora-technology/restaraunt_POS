import { useQuery } from "@tanstack/react-query";
import { MdArrowForward, MdInventory2, MdLockOutline } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { getInventoryAlerts } from "../../https";
import useFeature from "../../hooks/useFeature";

const InventorySignalCard = () => {
  const navigate = useNavigate();
  const { hasInventory } = useFeature();
  const { data } = useQuery({
    queryKey: ["inventoryAlerts", "dashboard"],
    queryFn: getInventoryAlerts,
    enabled: hasInventory,
  });
  const alerts = (data?.data?.data || []).filter((alert) => !alert.isRead).slice(0, 3);

  if (!hasInventory) {
    return (
      <article className="dashboard-panel inventory-signal is-locked">
        <div className="inventory-signal-ghost">
          <i /><i /><i />
        </div>
        <div className="inventory-signal-lock">
          <span><MdLockOutline /></span>
          <div>
            <h2>Know what will run out before service.</h2>
            <p>Live stock alerts and automatic order deductions are included with Professional.</p>
          </div>
          <button type="button" onClick={() => navigate("/app/inventory")}>
            Preview inventory <MdArrowForward />
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="dashboard-panel inventory-signal">
      <div className="dashboard-panel-header">
        <div><h2>Low stock signals</h2><p>Items requiring attention</p></div>
        <span className="inventory-signal-count">{alerts.length}</span>
      </div>
      <div className="inventory-signal-list">
        {alerts.length ? alerts.map((alert) => (
          <button key={alert.id} type="button" onClick={() => navigate("/app/inventory")}>
            <span><MdInventory2 /></span>
            <div><strong>{alert.message}</strong><small>{alert.level} priority</small></div>
            <MdArrowForward />
          </button>
        )) : (
          <div className="inventory-signal-clear">
            <MdInventory2 />
            <strong>Stock levels look healthy</strong>
            <small>No unread low-stock alerts.</small>
          </div>
        )}
      </div>
    </article>
  );
};

export default InventorySignalCard;
