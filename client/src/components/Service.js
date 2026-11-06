import React, { useState } from "react";
import { Link } from "react-router-dom";
import ReviewSystem from "../components/ReviewSystem";
import "./Service.css";

// Crisp vector icons
import {
    FaCalendarAlt,
    FaCamera,
    FaCheck,
    FaMapMarkerAlt,
    FaCheckCircle,
    FaStore
} from "react-icons/fa";

// Helper to display only first unit if merged or combined
const getFirstUnit = (unit, customUnit) => {
    let u = unit === "Other" ? (customUnit || "Other") : (unit || "per day");
    if (typeof u === 'string') {
        const parts = u.split(/\s*(?:and|\/|\+|&)\s*/i);
        return parts[0].trim();
    }
    return u;
};

function Service({ service, onClick, isLandingPage = false, bookingArea = null }) {
    // eslint-disable-next-line no-unused-vars
    const [averageRating, setAverageRating] = useState("No ratings yet");
    const displayUnit = getFirstUnit(service.unit, service.customUnit);

    // Direct price calculation based on bookingArea
    const calculateDisplayRent = () => {
        const basePrice = Number(service?.rentperday) || 0;

        if (!bookingArea) {
            return basePrice;
        }

        if (!service?.locationPricing || service.locationPricing.length === 0) {
            return basePrice;
        }

        let userLocationLower = "";
        if (typeof bookingArea === "string") {
            userLocationLower = bookingArea.toLowerCase();
        } else if (bookingArea.display_name) {
            userLocationLower = bookingArea.display_name.toLowerCase();
        } else if (bookingArea.city) {
            userLocationLower = String(bookingArea.city).toLowerCase();
        } else {
            userLocationLower = String(bookingArea).toLowerCase();
        }

        const userCity = userLocationLower.split(",")[0].trim();

        const matchedLocation = service.locationPricing.find((location) => {
            const locationName = (location.locationName || "").toLowerCase();
            const locationAddress = (location.locationAddress || "").toLowerCase();

            return (
                locationName.includes(userCity) ||
                userCity.includes(locationName) ||
                locationAddress.includes(userCity) ||
                userCity.includes(locationAddress)
            );
        });

        if (matchedLocation) {
            const extraPrice = Number(matchedLocation.extraPrice) || 0;
            return basePrice + extraPrice;
        }

        return basePrice;
    };

    const displayRent = calculateDisplayRent();
    const bookLinkState = bookingArea ? { selectedServiceArea: bookingArea } : undefined;
    const bookUrl = `/book/${service._id}`;

    // =========================================================================
    // Landing Page Compact Card View (Carousels)
    // =========================================================================
    if (isLandingPage) {
        return (
            <div className="sh-compact-card" onClick={onClick}>
                <div className="sh-compact-media">
                    <Link to={bookUrl} state={bookLinkState}>
                        <img
                            src={service.imageurls?.[0] || "/placeholder-image.jpg"}
                            className="sh-compact-img"
                            alt={service.name || "Service image"}
                            loading="lazy"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/placeholder-image.jpg";
                            }}
                        />
                    </Link>

                    {/* Floating Rating Badge */}
                    <div className="sh-compact-rating-box">
                        <ReviewSystem
                            serviceId={service._id}
                            showFullDetails={false}
                            onAverageRating={(rating) => setAverageRating(rating || "")}
                        />
                    </div>
                </div>

                <div className="sh-compact-body">
                    <div>
                        <h3 className="sh-compact-title" title={service.name}>
                            <Link to={bookUrl} state={bookLinkState} className="sh-compact-title-link">
                                {service.name}
                            </Link>
                        </h3>

                        <div className="sh-compact-company" title={service.companyname || "Verified Service Provider"}>
                            <FaStore style={{ fontSize: "0.75rem", flexShrink: 0, color: "#4f46e5" }} />
                            <span>{service.companyname || "Verified Provider"}</span>
                        </div>
                    </div>

                    <div className="sh-compact-footer">
                        <div>
                            <span className="sh-compact-price">₹{displayRent}</span>
                            {displayUnit && <span className="sh-compact-unit">/{displayUnit}</span>}
                        </div>

                        <Link to={bookUrl} state={bookLinkState} className="sh-compact-book-btn">
                            <span>Book</span>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // HomeScreen & Search Results Full 3-Part Card View
    // =========================================================================
    const matchedCity = bookingArea
        ? (typeof bookingArea === 'string' ? bookingArea.split(',')[0] : (bookingArea.display_name?.split(',')[0] || bookingArea.city || null))
        : (service.location && service.location !== "Location not specified" ? service.location.split(',')[0] : null);

    return (
        <article className="sh-service-card" onClick={onClick}>
            <div className="sh-service-inner">
                {/* 1. Left Thumbnail Area */}
                <div className="sh-service-media">
                    <Link to={bookUrl} state={bookLinkState} className="sh-service-img-link">
                        <img
                            src={service.imageurls?.[0] || "/placeholder-image.jpg"}
                            alt={`${service.name} - ${service.companyname || "Service Provider"}`}
                            className="sh-service-img"
                            loading="lazy"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/placeholder-image.jpg";
                            }}
                        />


                        {/* Rating badge */}
                        <div className="sh-badge-rating">
                            <ReviewSystem
                                serviceId={service._id}
                                showFullDetails={false}
                                onAverageRating={(rating) => setAverageRating(rating || "")}
                            />
                        </div>

                        {/* Photo count indicator */}
                        {service.imageurls?.length > 1 && (
                            <div className="sh-badge-photos" aria-label={`${service.imageurls.length} photos available`}>
                                <FaCamera style={{ fontSize: "0.65rem" }} />
                                <span>{service.imageurls.length}</span>
                            </div>
                        )}
                    </Link>
                </div>

                {/* 2. Center Content Area */}
                <div className="sh-service-center">
                    <div>
                        <h2 className="sh-service-title" style={{alignItems: "left", display: "flex"}}>
                            <Link to={bookUrl} state={bookLinkState} className="sh-service-title-link">
                                {service.name}
                            </Link>
                        </h2>

                        <div className="sh-service-meta-row">
                            <span className="sh-provider-tag">
                                <FaCheckCircle className="sh-provider-icon" />
                                <span>{service.companyname || "Verified Professional"}</span>
                            </span>

                            {matchedCity && (
                                <span className="sh-area-tag">
                                    <FaMapMarkerAlt style={{ color: "#94a3b8" }} />
                                    <span>{matchedCity}</span>
                                </span>
                            )}
                        </div>

                        {service.description && (
                            <p className="sh-service-desc">
                                {service.description}
                            </p>
                        )}
                    </div>

                    {/* Features Chips */}
                    {service.features && service.features.length > 0 && (
                        <ul className="sh-service-features">
                            {service.features.slice(0, 3).map((feature, idx) => (
                                <li key={idx} className="sh-feature-pill">
                                    <FaCheck className="sh-feature-pill-icon" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* 3. Right Pricing & CTA Area */}
                <div className="sh-service-right">
                    <div className="sh-price-block" style={{textAlign: "left"}}>
                        <div className="sh-price-current-wrap">
                            <span className="sh-price-currency">₹</span>
                            <span className="sh-price-val">{displayRent}</span>
                            {displayUnit && (
                                <span className="sh-price-unit">/{displayUnit}</span>
                            )}
                        </div>

                        {service.originalPrice && service.originalPrice > service.rentperday && (
                            <div className="sh-price-discount-wrap">
                                <span className="sh-price-original">₹{service.originalPrice}</span>
                                <span className="sh-discount-badge">
                                    {Math.round(((service.originalPrice - service.rentperday) / service.originalPrice) * 100)}% OFF
                                </span>
                            </div>
                        )}

                        <span className="sh-perk-hint">⚡ Instant Confirmation</span>
                    </div>

                    <Link
                        to={bookUrl}
                        state={bookLinkState}
                        className="sh-book-btn"
                    >
                        <FaCalendarAlt />
                        <span>Book Now</span>
                    </Link>
                </div>
            </div>
        </article>
    );
}

export default Service;
