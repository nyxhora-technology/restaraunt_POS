import React, { useMemo, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  MdInfoOutline,
  MdOutlineRestaurantMenu,
  MdRoomService,
  MdSearch,
  MdTableRestaurant,
} from "react-icons/md";
import { FaLeaf, FaPepperHot, FaRegStar, FaStar } from "react-icons/fa";
import { getPublicMenu } from "../https";
import FullScreenLoader from "../components/shared/FullScreenLoader";

const handleImageError = (event) => {
  event.currentTarget.style.display = "none";
  event.currentTarget.parentElement?.classList.add("is-missing");
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getBasePrice = (item) => {
  if (item.variants?.length) {
    return Math.min(...item.variants.map((variant) => toNumber(variant.price)));
  }
  return toNumber(item.price);
};

const QrMenu = () => {
  const { slug } = useParams();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [galleryIndex, setGalleryIndex] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-menu", slug],
    queryFn: () => getPublicMenu(slug),
    retry: false,
  });

  const { restaurant, table, categories = [], label } = data?.data?.data || {};
  const currency = restaurant?.currency || "INR";

  const formatMoney = useMemo(() => {
    try {
      const formatter = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      });
      return (value) => formatter.format(toNumber(value));
    } catch {
      return (value) => `${currency} ${toNumber(value).toFixed(0)}`;
    }
  }, [currency]);

  const allItems = useMemo(
    () =>
      categories.flatMap((category) =>
        (category.menuItems || []).map((item) => ({
          ...item,
          categoryId: category.id,
          categoryName: category.name,
        })),
      ),
    [categories],
  );

  const galleryItems = useMemo(() => {
    return allItems.filter(item => item.image);
  }, [allItems]);

  const handleOpenGallery = (item) => {
    const index = galleryItems.findIndex((gItem) => gItem.id === item.id);
    if (index !== -1) {
      setGalleryIndex(index);
    }
  };

  const displayedItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return allItems.filter((item) => {
      const matchesCategory =
        activeCategory === "all" || item.categoryId === activeCategory;
      const matchesSearch =
        !normalizedSearch ||
        [item.name, item.description, item.categoryName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, allItems, searchTerm]);

  const featuredItems = useMemo(() => {
    const withImages = allItems.filter((item) => item.image);
    return (withImages.length ? withImages : allItems).slice(0, 4);
  }, [allItems]);

  const heroImage = featuredItems.find((item) => item.image)?.image;

  if (isLoading) return <FullScreenLoader />;

  if (isError) {
    return (
      <div className="qr-menu-error">
        <MdOutlineRestaurantMenu />
        <h1>Menu Unavailable</h1>
        <p>
          {error.response?.data?.message ||
            "This menu is currently not available or the link is invalid."}
        </p>
      </div>
    );
  }

  return (
    <div className="qr-menu-shell">
      <header className="qr-menu-topbar">
        <div className="qr-menu-brand">
          {restaurant?.logo ? (
            <img src={restaurant.logo} alt={restaurant.name} />
          ) : (
            <span>{restaurant?.name?.charAt(0) || "R"}</span>
          )}
          <div>
            <strong>{restaurant?.name}</strong>
            <small>{restaurant?.city || "Digital menu"}</small>
          </div>
        </div>

        <nav className="qr-menu-desktop-nav" aria-label="Menu sections">
          <button type="button" onClick={() => setActiveCategory("all")}>
            Home
          </button>
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("qr-menu-list")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Menu
          </button>
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("qr-featured")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Chef Picks
          </button>
        </nav>

        <div className="qr-menu-table-pill">
          <MdTableRestaurant />
          <span>
            {table
              ? table.label || `Table ${table.tableNo}`
              : label || "QR Menu"}
          </span>
          <small>Menu view</small>
        </div>
      </header>

      <main className="qr-menu-page">
        <section className="qr-menu-main">
          <section
            className="qr-menu-hero"
            style={
              heroImage ? { backgroundImage: `url(${heroImage})` } : undefined
            }
          >
            <div className="qr-menu-hero-overlay">
              <span>Welcome</span>
              <h1>Savor Every Moment</h1>
              <p>
                {restaurant?.description ||
                  "Explore our freshly prepared dishes and ask your server when you are ready to order."}
              </p>
            </div>
          </section>

          <aside className="qr-menu-service-note" aria-label="Ordering help">
            <span>
              <MdInfoOutline />
            </span>
            <div>
              <strong>This is our digital menu</strong>
              <p>
                Browse dishes and prices here. Your waiter will take your order
                and can help with ingredients, allergies, or recommendations.
              </p>
            </div>
          </aside>

          <div className="qr-menu-toolbar">
            <label className="qr-menu-search">
              <MdSearch />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search dishes, cuisines or ingredients..."
              />
            </label>

            <div className="qr-menu-category-row" aria-label="Categories">
              <button
                type="button"
                className={activeCategory === "all" ? "is-active" : ""}
                onClick={() => setActiveCategory("all")}
              >
                <MdOutlineRestaurantMenu />
                All Items
              </button>
              {categories.map((category, index) => (
                <button
                  key={category.id}
                  type="button"
                  className={activeCategory === category.id ? "is-active" : ""}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <span>{index + 1}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {featuredItems.length > 0 && (
            <section id="qr-featured" className="qr-menu-section">
              <div className="qr-menu-section-title">
                <span>
                  <FaStar /> Chef Picks
                </span>
                <button type="button" onClick={() => setActiveCategory("all")}>
                  View all
                </button>
              </div>
              <div className="qr-menu-featured-grid">
                {featuredItems.map((item) => (
                  <MenuCard
                    key={item.id}
                    item={item}
                    featured
                    formatMoney={formatMoney}
                    onOpenGallery={handleOpenGallery}
                  />
                ))}
              </div>
            </section>
          )}

          <section id="qr-menu-list" className="qr-menu-section">
            <div className="qr-menu-section-title">
              <span>
                <MdRoomService /> All Items
              </span>
              <small>{displayedItems.length} dishes</small>
            </div>

            {displayedItems.length ? (
              <div className="qr-menu-grid">
                {displayedItems.map((item) => (
                  <MenuCard
                    key={item.id}
                    item={item}
                    formatMoney={formatMoney}
                    onOpenGallery={handleOpenGallery}
                  />
                ))}
              </div>
            ) : (
              <div className="qr-menu-empty">
                <MdSearch />
                <strong>No dishes found</strong>
                <p>Try another category or search term.</p>
              </div>
            )}
          </section>

          <footer className="qr-menu-footer">
            <MdRoomService />
            <div>
              <strong>Ready to order?</strong>
              <p>Please let your waiter know. We will be happy to assist.</p>
            </div>
          </footer>
        </section>
      </main>

      {galleryIndex !== null && galleryItems.length > 0 && (
        <QrGalleryModal
          items={galleryItems}
          currentIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
          formatMoney={formatMoney}
        />
      )}
    </div>
  );
};

const MenuCard = ({ item, featured = false, formatMoney, onOpenGallery }) => {
  const price = getBasePrice(item);

  const handleCardClick = () => {
    if (item.image && onOpenGallery) {
      onOpenGallery(item);
    }
  };

  return (
    <article 
      className={`qr-menu-card ${featured ? "is-featured" : ""} ${item.image ? "is-clickable" : ""}`}
      onClick={handleCardClick}
    >
      {item.image && (
        <div className="qr-menu-card-image">
          <img src={item.image} alt={item.name} onError={handleImageError} />
          {featured && <span>Popular</span>}
        </div>
      )}

      <div className="qr-menu-card-body">
        <div className="qr-menu-card-heading">
          <div>
            <span
              className={item.isVeg ? "qr-food-mark is-veg" : "qr-food-mark"}
            >
              {item.isVeg ? <FaLeaf /> : <FaPepperHot />}
            </span>
            <h3>{item.name}</h3>
          </div>
          <FaRegStar />
        </div>

        {item.description && <p>{item.description}</p>}

        {item.variants?.length > 0 && (
          <div
            className="qr-menu-variant-row"
            aria-label={`${item.name} options`}
          >
            <strong>Available options</strong>
            <div>
              {item.variants.map((variant) => (
                <span key={variant.id} className="qr-menu-variant-option">
                  <span>{variant.label}</span>
                  <strong>{formatMoney(variant.price)}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="qr-menu-card-footer">
          <span>{item.variants?.length ? "Starting from" : "Price"}</span>
          <strong>{formatMoney(price)}</strong>
        </div>
      </div>
    </article>
  );
};

const QrGalleryModal = ({ items, currentIndex, onClose, formatMoney }) => {
  const [index, setIndex] = useState(currentIndex);

  useEffect(() => {
    setIndex(currentIndex);
  }, [currentIndex]);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  if (index === null || !items || !items[index]) return null;

  const item = items[index];
  const price = getBasePrice(item);

  const handleNext = (e) => {
    e?.stopPropagation();
    setIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = (e) => {
    e?.stopPropagation();
    setIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) handleNext();
    if (distance < -minSwipeDistance) handlePrev();
  };

  return (
    <div className="qr-gallery-overlay" onClick={onClose}>
      <button type="button" className="qr-gallery-close" onClick={onClose}>&times;</button>
      <div 
        className="qr-gallery-content" 
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        <button type="button" className="qr-gallery-nav prev" onClick={handlePrev}>&#10094;</button>
        <img src={item.image} alt={item.name} className="qr-gallery-image" />
        <button type="button" className="qr-gallery-nav next" onClick={handleNext}>&#10095;</button>
        
        <div className="qr-gallery-footer">
          <div className="qr-gallery-footer-info">
             <h2>{item.name}</h2>
             {item.description && <p>{item.description}</p>}
          </div>
          <div className="qr-gallery-footer-price">
             {formatMoney(price)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrMenu;
