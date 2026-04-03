import React, { useState } from "react";
import { Link } from "react-router-dom";
import ReviewSystem from "../components/ReviewSystem";
import { effectiveBaseRent } from "../utils/serviceAreaPricing";

function Service({ service, onClick, isLandingPage = false, bookingArea = null }) {
    const [averageRating, setAverageRating] = useState("No ratings yet");
    const displayUnit = service.unit === "Other" ? service.customUnit : service.unit;
    const displayRent = effectiveBaseRent(service, bookingArea);

    // Landing Page View - Keep as is (unchanged)
   if (isLandingPage) {
        return (
            <div className="coloum m-3 p-3 bs border rounded shadow-sm bg-light" style={{ width: '300px', height: "280px" }}>
                {/* Image Section - Clickable */}
                <div className="position-relative d-flex justify-content-center align-items-center mb-3 mb-md-0">

                    {/* Image Section */}
                    <Link
                        to={`/book/${service._id}`}
                        state={bookingArea ? { selectedServiceArea: bookingArea } : undefined}
                    >
                        <div
                            className="image-container"
                            style={{
                                width: "275px",
                                height: "200px", // Fixed height
                                overflow: "hidden",
                                borderRadius: "12px",
                                position: "relative"
                            }}
                        >
                            <img
                                src={service.imageurls[0]}
                                className="img-fluid"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover", // Ensures image covers the area without distortion
                                    objectPosition: "center", // Centers the image
                                    cursor: "pointer",
                                    transition: "transform 0.3s ease"
                                }}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "/placeholder-image.jpg"; // Fallback image
                                }}
                                alt={service.name || "Service image"}
                            />
                        </div>

                    </Link>

                    {/* Review Badge – Top Right Corner */}
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

                {/* Minimal Info Section */}
                <div className="col-12 col-md-2 mt-2">
                    <div className="d-flex flex-column flex-md-row align-items-left justify-content-between mb-2">
                        <h2 className="fw-bold " style={{ fontSize: "25px" }}>{service.name}</h2>
                    </div>
                </div>



            </div>
        );
    }
    // Home Screen View - Professional Redesign
    return (
        <div className="service-card premium-card mb-4">
            <div className="service-card-inner">
                {/* Image Section */}
                <div className="service-image-section">
                    <div className="image-main">
                        <img
                            src={service.imageurls[0]}
                            alt={service.name}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/placeholder-image.jpg";
                            }}
                        />
                        {/* Mobile Review Badge */}
                        <div className="mobile-review-badge d-md-none">
                            <ReviewSystem
                                serviceId={service._id}
                                showFullDetails={false}
                                onAverageRating={(rating) => setAverageRating(rating || "")}
                            />
                        </div>
                        {/* Image Counter Badge */}
                        {service.imageurls.length > 1 && (
                            <div className="image-counter">
                                <i className="fas fa-images"></i> {service.imageurls.length} photos
                            </div>
                        )}
                    </div>
                    
                    {/* Thumbnails for multiple images */}
                    
                </div>

                {/* Content Section */}
                <div className="service-content-section">
                    {/* Header */}
                    <div className="content-header">
                        <div className="title-section">
                            <h2 className="service-title" style={{textAlign:"left", paddingLeft:"20px"}}>{service.name}</h2>
                            <div className="company-info">
                                <i className="fas fa-building"></i>
                                <span>{service.companyname || "Professional Service Provider"}</span>
                            </div>
                        </div>
                        <div className="desktop-review-badge d-none d-md-block">
                            <ReviewSystem
                                serviceId={service._id}
                                showFullDetails={false}
                                onAverageRating={(rating) => setAverageRating(rating || "")}
                            />
                        </div>
                    </div>

                    {/* Key Details Grid */}
                        {/* Pricing */}
                            
                            <div className="detail-info" style={{marginLeft:"10px"}}>
                                <span className="detail-label">{bookingArea ? "Rate (your area)" : "Daily Rate"}</span>
                                    <span className="price">₹{displayRent ?? "N/A"}</span>
                                    {displayUnit && <span className="unit"> / {displayUnit}</span>}
                            </div>

                        {/* Availability */}
                        
                  

                        {/* Category if available */}
                        

                    {/* Action Buttons */}
                    <div className="action-buttons" style={{padding:"20px"}}>
                        <Link
                            to={`/book/${service._id}`}
                            state={bookingArea ? { selectedServiceArea: bookingArea } : undefined}
                            className="btn-book-now"
                        >
                            <span>Book Now</span>
                        </Link>
                        
                    </div>
                </div>
            </div>

            <style jsx>{`
                /* Professional CSS Styles */
                .premium-card {
                    background: #ffffff;
                    border-radius: 24px;
                    overflow: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1);
                }

                .premium-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 20px 25px -12px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
                }

                .service-card-inner {
                    display: flex;
                    flex-direction: column;
                }

                @media (min-width: 768px) {
                    .service-card-inner {
                        flex-direction: row;
                    }
                }

                /* Image Section */
                .service-image-section {
                    flex: 0 0 100%;
                    padding: 20px;
                    background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%);
                }

                @media (min-width: 768px) {
                    .service-image-section {
                        flex: 0 0 40%;
                        padding: 24px;
                    }
                }

                .image-main {
                    position: relative;
                    border-radius: 20px;
                    overflow: hidden;
                    background: #e9ecef;
                    aspect-ratio: 4/3;
                    cursor: pointer;
                }

                .image-main img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.4s ease;
                }

                .premium-card:hover .image-main img {
                    transform: scale(1.05);
                }

                .mobile-review-badge {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(8px);
                    padding: 6px 12px;
                    border-radius: 30px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }

                .image-counter {
                    position: absolute;
                    bottom: 12px;
                    right: 12px;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(8px);
                    color: white;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .image-thumbnails {
                    display: flex;
                    gap: 8px;
                    margin-top: 12px;
                }

                .thumbnail {
                    flex: 1;
                    aspect-ratio: 1;
                    border-radius: 12px;
                    overflow: hidden;
                    background: #dee2e6;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .thumbnail img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .thumbnail:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                /* Content Section */
                .service-content-section {
                    flex: 1;
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                }

                @media (min-width: 768px) {
                    .service-content-section {
                        padding: 28px 28px 28px 0;
                    }
                }

                .content-header {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #e9ecef;
                }

                @media (min-width: 768px) {
                    .content-header {
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: flex-start;
                    }
                }

                .title-section {
                    flex: 1;
                }

                .service-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #212529;
                    margin: 0 0 8px 0;
                    line-height: 1.3;
                }

                @media (min-width: 768px) {
                    .service-title {
                        font-size: 1.75rem;
                    }
                }

                .company-info {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 12px;
                    background: #f8f9fa;
                    border-radius: 30px;
                    font-size: 0.85rem;
                    color: #6c757d;
                }

                .company-info i {
                    font-size: 0.8rem;
                }

                .desktop-review-badge {
                    flex-shrink: 0;
                }

                /* Description */
                .description {
                    margin-bottom: 24px;
                }

                .description p {
                    color: #6c757d;
                    line-height: 1.6;
                    margin: 0;
                    text-align: justify;
                    font-size: 0.95rem;
                }

                /* Details Grid */
                .details-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                    margin-bottom: 28px;
                }

                .detail-item {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 14px;
                    background: #f8f9fa;
                    border-radius: 16px;
                    transition: all 0.2s ease;
                }

                .detail-item:hover {
                    background: #f1f3f5;
                    transform: translateX(4px);
                }

                .detail-icon {
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: white;
                    border-radius: 14px;
                    font-size: 1.25rem;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                }

                .pricing-icon {
                    color: #3b82f6;
                }

                .availability-icon {
                    color: #10b981;
                }

                .location-icon {
                    color: #ef4444;
                }

                .category-icon {
                    color: #8b5cf6;
                }

                .detail-info {
                    flex: 1;
                }

                .detail-label {
                    display: block;
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #9ca3af;
                    margin-bottom: 4px;
                }

                .detail-value {
                    display: block;
                    font-size: 1rem;
                    font-weight: 600;
                    color: #212529;
                }

                .price {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #3b82f6;
                }

                .unit {
                    font-size: 0.85rem;
                    font-weight: normal;
                    color: #6c757d;
                }

                /* Action Buttons */
                .action-buttons {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                    margin-top: auto;
                    padding-top: 20px;
                    border-top: 1px solid #e9ecef;
                }

                .btn-book-now {
                    flex: 1;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    padding: 12px 24px;
                    background: #212529;
                    color: white;
                    text-decoration: none;
                    border-radius: 14px;
                    font-weight: 600;
                    font-size: 0.95rem;
                    transition: all 0.2s ease;
                    border: none;
                    cursor: pointer;
                }

                .btn-book-now:hover {
                    background: #000;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                    color: white;
                }

                .btn-inquire {
                    flex: 1;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 12px 24px;
                    background: white;
                    color: #495057;
                    border: 1px solid #dee2e6;
                    border-radius: 14px;
                    font-weight: 500;
                    font-size: 0.95rem;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }

                .btn-inquire:hover {
                    background: #f8f9fa;
                    border-color: #ced4da;
                    transform: translateY(-1px);
                }

                @media (max-width: 768px) {
                    .action-buttons {
                        flex-direction: column;
                    }
                    
                    .details-grid {
                        grid-template-columns: 1fr;
                    }
                }

                /* Animation */
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

                .premium-card {
                    animation: fadeInUp 0.5s ease-out;
                }
            `}</style>
        </div>
    );
}

export default Service;