import React, { useState } from "react";
import { Link } from "react-router-dom";
import ReviewSystem from "../components/ReviewSystem";

function Service({ service, onClick, isLandingPage = false, bookingArea = null }) {
    const [averageRating, setAverageRating] = useState("No ratings yet");
    const displayUnit = service.unit === "Other" ? service.customUnit : service.unit;

    // ✅ DIRECT PRICE CALCULATION - No utils file needed
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

        const matchedLocation = service.locationPricing.find(location => {
            const locationName = (location.locationName || "").toLowerCase();
            const locationAddress = (location.locationAddress || "").toLowerCase();

            return locationName.includes(userCity) ||
                userCity.includes(locationName) ||
                locationAddress.includes(userCity) ||
                userCity.includes(locationAddress);
        });

        if (matchedLocation) {
            const extraPrice = Number(matchedLocation.extraPrice) || 0;
            return basePrice + extraPrice;
        }

        return basePrice;
    };

    const displayRent = calculateDisplayRent();

    // Landing Page View
    if (isLandingPage) {
        return (
            <div className="coloum m-3 p-3 bs border rounded shadow-sm bg-light" style={{ width: '300px', height: "280px" }}>
                <div className="position-relative d-flex justify-content-center align-items-center mb-3 mb-md-0">
                    <Link
                        to={`/book/${service._id}`}
                        state={bookingArea ? { selectedServiceArea: bookingArea } : undefined}
                    >
                        <div
                            className="image-container"
                            style={{
                                width: "275px",
                                height: "200px",
                                overflow: "hidden",
                                borderRadius: "12px",
                                position: "relative"
                            }}
                        >
                            <img
                                src={service.imageurls?.[0] || "/placeholder-image.jpg"}
                                className="img-fluid"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    objectPosition: "center",
                                    cursor: "pointer",
                                    transition: "transform 0.3s ease"
                                }}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "/placeholder-image.jpg";
                                }}
                                alt={service.name || "Service image"}
                            />
                        </div>
                    </Link>

                    <div
                        className="position-absolute"
                        style={{
                            top: "10px",
                            right: "10px",
                            background: "white",
                            padding: "5px 10px",
                            borderRadius: "10px",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
                            zIndex: 10,
                        }}
                    >
                        <ReviewSystem
                            serviceId={service._id}
                            showFullDetails={false}
                            onAverageRating={(rating) => setAverageRating(rating || "")}
                        />
                    </div>
                </div>

                <div className="col-12 col-md-2 mt-2">
                    <div className="d-flex flex-column flex-md-row align-items-left justify-content-between mb-2">
                        <h2 className="fw-bold" style={{ fontSize: "25px", textAlign: "left" }}>{service.name}</h2>
                    </div>
                </div>
            </div>
        );
    }

    // Home Screen View - Professional Redesign
    return (
        <article className="service-card premium-card">
            <div className="service-card__inner">
                {/* Image Section */}
                <figure className="service-card__media"style={{ marginRight:"20px"}}>
                    <div 
                        className="service-card__image-wrapper"
                        onClick={() => window.location.href = `/book/${service._id}`}
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e) => e.key === 'Enter' && (window.location.href = `/book/${service._id}`)}
                    >
                    


                         <div
                            className="image-container"
                            style={{
                                width: "275px",
                                height: "200px",
                                overflow: "hidden",
                                borderRadius: "12px",
                                position: "relative",
                            }}
                        >
                               <img
                            src={service.imageurls?.[0] || "/placeholder-image.jpg"}
                            alt={`${service.name} - ${service.companyname || "Service Provider"}`}
                             style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    objectPosition: "center",
                                    cursor: "pointer",
                                    transition: "transform 0.3s ease"
                                }}
                                className="service-card__image"
                            loading="lazy"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/placeholder-image.jpg";
                            }}
                        
                               
                               
                            />
                        </div>
                        
                        {service.imageurls?.length > 1 && (
                            <div className="service-card__badge service-card__badge--photos" aria-label={`${service.imageurls.length} photos available`}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="2" width="20" height="20" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="2.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                </svg>
                                <span>{service.imageurls.length}</span>
                            </div>
                        )}
                    </div>

                    {/* Mobile Review Badge */}
                    <div className="service-card__review service-card__review--mobile">
                        <ReviewSystem
                            serviceId={service._id}
                            showFullDetails={false}
                            onAverageRating={(rating) => setAverageRating(rating || "")}
                        />
                    </div>
                </figure>

                {/* Content Section */}
                <div className="service-card__content" >
                    <header className="service-card__header">
                        <div className="service-card__info">
                            <h2 className="service-card__title" style={{textAlign:"left"}}>
                                <Link to={`/book/${service._id}`} className="service-card__title-link" >
                                    {service.name}
                                </Link>
                            </h2>
                            
                            <div className="service-card__company">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="4" y="8" width="16" height="12" rx="1" ry="1"/>
                                    <polyline points="8 12 12 16 16 12"/>
                                    <line x1="4" y1="12" x2="8" y2="12"/>
                                    <line x1="16" y1="12" x2="20" y2="12"/>
                                </svg>
                                <span>{service.companyname || "Professional Service Provider"}</span>
                            </div>
                        </div>

                        {/* Desktop Review Badge */}
                        <div className="service-card__review service-card__review--desktop">
                            <ReviewSystem
                                serviceId={service._id}
                                showFullDetails={false}
                                onAverageRating={(rating) => setAverageRating(rating || "")}
                            />
                        </div>
                    </header>

                    {/* Pricing Section */}
                    <div className="service-card__pricing">
                        <div className="service-card__price-wrapper">
                            <span className="service-card__price-currency">₹</span>
                            <span className="service-card__price-value">{displayRent}</span>
                            {displayUnit && (
                                <span className="service-card__price-unit"> / {displayUnit}</span>
                            )}
                        </div>
                        
                        {service.originalPrice && service.originalPrice > service.rentperday && (
                            <div className="service-card__original-price">
                                <span className="service-card__original-price-label">Original:</span>
                                <span className="service-card__original-price-value">₹{service.originalPrice}</span>
                                <span className="service-card__discount-badge">
                                    {Math.round(((service.originalPrice - service.rentperday) / service.originalPrice) * 100)}% OFF
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Key Features */}
                    {service.features && service.features.length > 0 && (
                        <ul className="service-card__features">
                            {service.features.slice(0, 3).map((feature, index) => (
                                <li key={index} className="service-card__feature-item">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Action Buttons */}
                    <div className="service-card__actions">
                        <Link
                            to={`/book/${service._id}`}
                            state={bookingArea ? { selectedServiceArea: bookingArea } : undefined}
                            className="btn btn--primary btn--book"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            <span>Book Now</span>
                        </Link>
                    </div>
                </div>
            </div>

<style jsx>{`
    /* CSS Custom Properties for theming */
    .service-card {
        --card-radius: 20px;
        --card-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1);
        --card-shadow-lg: 0 20px 25px -12px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
        --transition-base: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        --color-primary: #2563eb;
        --color-primary-dark: #1d4ed8;
        --color-gray-50: #f8f9fa;
        --color-gray-100: #f3f4f6;
        --color-gray-200: #e5e7eb;
        --color-gray-600: #6b7280;
        --color-gray-900: #111827;
        
        background: white;
        border-radius: var(--card-radius);
        transition: var(--transition-base);
        box-shadow: var(--card-shadow-sm);
        animation: fadeInUp 0.5s ease-out;
        margin-bottom: 24px;
        width: 100%;
        max-width: 1200px; /* Maximum width constraint */
        margin-left: auto;
        margin-right: auto;
    }

    .service-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--card-shadow-lg);
    }

    .service-card__inner {
        display: flex;
        flex-direction: column;
        width: 100%;
    }

    @media (min-width: 768px) {
        .service-card__inner {
            flex-direction: row;
            align-items: stretch; /* Ensures both sections have equal height */
        }
    }

    /* Media Section */
    .service-card__media {
        flex: 0 0 auto;
        margin: 0;
        padding: 20px;
        background: linear-gradient(135deg, var(--color-gray-50) 0%, var(--color-gray-100) 100%);
        position: relative;
        width: 100%;
    }

    @media (min-width: 768px) {
        .service-card__media {
            flex: 0 0 35%; /* Fixed width on desktop - adjust as needed (35%, 40%, or 300px) */
            min-width: 280px; /* Minimum width to prevent too small */
            max-width: 400px; /* Maximum width constraint */
            padding: 24px;
        }
        
        .service-card__content {
            flex: 1; /* Takes remaining space */
            min-width: 0; /* Prevents overflow */
        }
    }

    /* For landscape tablets */
    @media (min-width: 768px) and (max-width: 1024px) {
        .service-card__media {
            flex: 0 0 40%;
            min-width: 250px;
        }
    }

    .service-card__image-wrapper {
        position: relative;
        border-radius: 16px;
        overflow: hidden;
        background: var(--color-gray-200);
        aspect-ratio: 4 / 3;
        cursor: pointer;
        transition: var(--transition-base);
        width: 100%;
    }

    .service-card__image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.4s ease;
    }

    .service-card__image-wrapper:hover .service-card__image {
        transform: scale(1.05);
    }

    .service-card__badge {
        position: absolute;
        bottom: 12px;
        right: 12px;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        color: white;
        padding: 6px 10px;
        border-radius: 24px;
        font-size: 0.75rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
        letter-spacing: 0.3px;
    }

    .service-card__review {
        position: absolute;
        top: 12px;
        right: 12px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(8px);
        padding: 6px 12px;
        border-radius: 32px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        z-index: 2;
    }

    .service-card__review--desktop {
        display: none;
    }

    @media (min-width: 768px) {
        .service-card__review--mobile {
            display: none;
        }
        
        .service-card__review--desktop {
            display: block;
            position: static;
        }
    }

    /* Content Section */
    .service-card__content {
        flex: 1;
        padding: 24px;
        display: flex;
        flex-direction: column;
        width: 100%;
        overflow: hidden; /* Prevents content overflow */
    }

    @media (min-width: 768px) {
        .service-card__content {
            padding: 28px 28px 28px 0;
        }
    }

    .service-card__header {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--color-gray-200);
    }

    @media (min-width: 768px) {
        .service-card__header {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
        }
    }

    .service-card__info {
        flex: 1;
        min-width: 0; /* Prevents text overflow */
    }

    .service-card__title {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 8px 0;
        line-height: 1.3;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }

    @media (min-width: 768px) {
        .service-card__title {
            font-size: 1.5rem;
        }
    }

    .service-card__title-link {
        color: var(--color-gray-900);
        text-decoration: none;
        transition: color 0.2s ease;
    }

    .service-card__title-link:hover {
        color: var(--color-primary);
    }

    .service-card__company {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 5px 12px;
        background: var(--color-gray-100);
        border-radius: 30px;
        font-size: 0.813rem;
        color: var(--color-gray-600);
        max-width: 100%;
        word-wrap: break-word;
    }

    .service-card__company svg {
        flex-shrink: 0;
    }

    .service-card__company span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* Pricing */
    .service-card__pricing {
        margin-bottom: 20px;
    }

    .service-card__price-wrapper {
        display: flex;
        align-items: baseline;
        gap: 2px;
        flex-wrap: wrap;
    }

    .service-card__price-currency {
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-primary);
    }

    .service-card__price-value {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--color-primary);
        line-height: 1;
    }

    .service-card__price-unit {
        font-size: 0.875rem;
        font-weight: normal;
        color: var(--color-gray-600);
        margin-left: 4px;
    }

    .service-card__original-price {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        flex-wrap: wrap;
    }

    .service-card__original-price-label {
        font-size: 0.75rem;
        color: var(--color-gray-600);
    }

    .service-card__original-price-value {
        font-size: 0.875rem;
        color: var(--color-gray-600);
        text-decoration: line-through;
    }

    .service-card__discount-badge {
        background: #ef4444;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.688rem;
        font-weight: 600;
    }

    /* Features */
    .service-card__features {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin: 0 0 20px 0;
        padding: 0;
        list-style: none;
    }

    .service-card__feature-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.813rem;
        color: var(--color-gray-600);
    }

    .service-card__feature-item svg {
        color: #10b981;
        flex-shrink: 0;
    }

    /* Actions */
    .service-card__actions {
        display: flex;
        gap: 12px;
        margin-top: auto;
        padding-top: 20px;
        border-top: 1px solid var(--color-gray-200);
    }

    @media (max-width: 768px) {
        .service-card__actions {
            flex-direction: column;
        }
    }

    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 24px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.875rem;
        transition: var(--transition-base);
        border: none;
        cursor: pointer;
        text-decoration: none;
    }

    .btn--primary {
        background: var(--color-gray-900);
        color: white;
        flex: 1;
    }

    .btn--primary:hover {
        background: black;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    /* Container wrapper for multiple cards (if you're mapping through services) */
    /* Add this to your parent container */
    /*
    .services-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(900px, 1fr));
        gap: 24px;
        padding: 20px;
        max-width: 1400px;
        margin: 0 auto;
    }
    
    @media (max-width: 768px) {
        .services-grid {
            grid-template-columns: 1fr;
            padding: 16px;
        }
    }
    */

    /* Animations */
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    /* Accessibility */
    .service-card__image-wrapper:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }

    .btn:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }

    /* Responsive Typography */
    @media (max-width: 480px) {
        .service-card__title {
            font-size: 1.25rem;
        }
        
        .service-card__price-value {
            font-size: 1.5rem;
        }
        
        .btn {
            padding: 10px 20px;
        }
        
        .service-card__media {
            padding: 16px;
        }
        
        .service-card__content {
            padding: 20px;
        }
        
        .service-card__company span {
            white-space: normal; /* Allows text to wrap on mobile */
        }
    }
`}</style>
        </article>
    );
}

export default Service;