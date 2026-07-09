import React from "react";
import { useNavigate } from "react-router-dom";
import { MdOutlineRoomService, MdArrowForward } from "react-icons/md";
import { HiOutlineSparkles } from "react-icons/hi";

const RankBadge = ({ index }) => {
  const medals = ["🥇", "🥈", "🥉"];
  if (index < 3) return <span className="dashboard-dish-medal">{medals[index]}</span>;
  return (
    <span className="dashboard-dish-rank">
      {String(index + 1).padStart(2, "0")}
    </span>
  );
};

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
          onClick={() => navigate("/app/menu")}
          className="dashboard-text-button"
        >
          View all
        </button>
      </div>

      <div className="dashboard-dish-list">
        {/* Loading skeletons */}
        {isLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="dashboard-dish-skeleton">
                <div className="skel" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                  <div className="skel" style={{ height: 12, width: "70%" }} />
                  <div className="skel" style={{ height: 10, width: "40%" }} />
                </div>
              </div>
            ))}
          </>
        )}

        {/* Meaningful empty state — Zeigarnik: turn dead-end into a CTA */}
        {!isLoading && dishes.length === 0 && (
          <div className="dashboard-empty-dishes-rich">
            <div className="dashboard-empty-dishes-icon">
              <MdOutlineRoomService />
            </div>
            <strong>No sales data yet</strong>
            <p>
              Once orders are completed, your most popular items will appear here so you
              can track what customers love most.
            </p>
            <button
              type="button"
              className="dashboard-empty-cta"
              onClick={() => navigate("/app/menu")}
            >
              <HiOutlineSparkles /> Add menu items <MdArrowForward />
            </button>
          </div>
        )}

        {/* Dish list with medal ranks for top 3 */}
        {!isLoading &&
          dishes.slice(0, 5).map((dish, index) => (
            <article key={dish.id} className="dashboard-dish-item">
              {dish.image ? (
                <img src={dish.image} alt={dish.name} className="dashboard-dish-image" loading="lazy" decoding="async" />
              ) : (
                <span className="dashboard-dish-placeholder">
                  <MdOutlineRoomService />
                </span>
              )}
              <div className="dashboard-dish-copy">
                <div>
                  <strong>
                    <RankBadge index={index} />{" "}
                    {dish.name}
                  </strong>
                  {!dish.available && <small>Unavailable</small>}
                </div>
                <span className="dashboard-dish-quantity-text">
                  {dish.quantityOrdered || 0} orders
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
