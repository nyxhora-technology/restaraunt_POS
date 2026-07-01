import React from "react";
import { useNavigate } from "react-router-dom";
import { MdOutlineRoomService } from "react-icons/md";

const PopularDishes = ({ dishes, isLoading }) => {
  const navigate = useNavigate();

  return (
    <section className="dashboard-panel dashboard-popular-dishes">
      <div className="dashboard-panel-header">
        <div>
          <h2>Popular Dishes</h2>
          <p>Most ordered menu items</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/menu")}
          className="dashboard-text-button"
        >
          View all
        </button>
      </div>

      <div className="dashboard-dish-list">
        {isLoading && (
          <div className="dashboard-panel-state">Loading sales data…</div>
        )}
        {!isLoading && dishes.length === 0 && (
          <div className="dashboard-empty-dishes">
            <MdOutlineRoomService />
            <strong>No dish sales yet</strong>
            <span>Completed orders will appear here.</span>
          </div>
        )}
        {dishes.slice(0, 5).map((dish, index) => (
          <article key={dish.id} className="dashboard-dish-item">
            {dish.image ? (
              <img src={dish.image} alt="" />
            ) : (
              <span className="dashboard-dish-placeholder">
                <MdOutlineRoomService />
              </span>
            )}
            <div className="dashboard-dish-copy">
              <div>
                <strong>
                  <span className="dashboard-dish-rank">
                    {String(index + 1).padStart(2, "0")}
                  </span>{" "}
                  {dish.name}
                </strong>
                {!dish.available && <small>Unavailable</small>}
              </div>
              <span className="dashboard-dish-quantity-text">
                Quantity ordered: {dish.quantityOrdered || 0}
              </span>
            </div>
            {dish.rating && (
              <div className="dashboard-dish-rating">
                <span>⭐</span> {dish.rating}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

export default PopularDishes;
