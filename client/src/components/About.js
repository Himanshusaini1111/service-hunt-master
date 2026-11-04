import React, { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import Navbar from "./Navbar";
import "./About.css";

// Crisp SVG Icons
import {
    FaTwitter,
    FaFacebookF,
    FaInstagram,
    FaLinkedinIn,
    FaArrowLeft,
    FaCheckCircle,
    FaRocket,
    FaShieldAlt,
    FaEye,
    FaChartLine,
    FaMoneyBillWave,
    FaChartPie,
    FaTools
} from "react-icons/fa";

const About = () => {
    const [activeSection, setActiveSection] = useState(null);
    const location = useLocation();
    const isStandalonePage = location.pathname === "/about";

    const toggleSection = (section) => {
        setActiveSection((prev) => (prev === section ? null : section));
        if (section) {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    return (
        <div className={isStandalonePage ? "sh-about-standalone" : "sh-about-page"}>
            {/* If viewed directly on /about route, show modern top Navbar */}
            {isStandalonePage && <Navbar />}

            {/* If viewed on /about route and no section is open, default to showing the About Us content! */}
            {(isStandalonePage && activeSection === null) || activeSection === "aboutUs" ? (
                <div className="sh-detail-wrapper">
                    <div className="sh-detail-card">
                        <div className="sh-detail-header-bar">
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Company Overview
                            </span>
                            {activeSection && (
                                <button
                                    type="button"
                                    className="sh-back-btn"
                                    onClick={() => toggleSection(null)}
                                >
                                    <FaArrowLeft />
                                    <span>Back to Footer</span>
                                </button>
                            )}
                        </div>

                        <h1 className="sh-detail-title">About Service Hunt</h1>

                        <div className="sh-hero-media">
                            <img
                                src="https://th.bing.com/th/id/OIP.yn6JD0Y-ZbvHNU3gj3gauwHaHa?w=1210&h=1210&rs=1&pid=ImgDetMain"
                                alt="Service Hunt"
                            />
                        </div>

                        <p className="sh-detail-lead">
                            Welcome to <strong>Service Hunt</strong>, your premier on-demand platform for local home maintenance, specialized trade professionals, event coordination, and lifestyle services. We empower local service providers while delivering seamless, trusted booking experiences to households nationwide.
                        </p>

                        <div className="sh-subsections-grid">
                            <div className="sh-subsection-card">
                                <img
                                    src="https://www.success.com/wp-content/uploads/2019/06/thebalancebusiness.jpg"
                                    alt="Who We Are"
                                    className="sh-subsection-img"
                                />
                                <h3><FaTools style={{ color: "#4f46e5" }} /> Who We Are</h3>
                                <p style={{ fontSize: "0.875rem", color: "#64748b", lineHeight: 1.5 }}>
                                    We are a team of tech innovators bridging local customers, licensed vendors, and independent service professionals on a single trusted, verified platform.
                                </p>
                            </div>

                            <div className="sh-subsection-card">
                                <img
                                    src="https://th.bing.com/th/id/OIP.VjaDdG2ppXwMaEewed7TlgHaE7?w=800&h=533&rs=1&pid=ImgDetMain"
                                    alt="What We Do"
                                    className="sh-subsection-img"
                                />
                                <h3><FaRocket style={{ color: "#4f46e5" }} /> What We Do</h3>
                                <ul className="sh-checklist">
                                    <li className="sh-checklist-item">
                                        <FaCheckCircle className="sh-check-icon" />
                                        <span>Connect with vetted professionals</span>
                                    </li>
                                    <li className="sh-checklist-item">
                                        <FaCheckCircle className="sh-check-icon" />
                                        <span>Instant booking with dynamic pricing</span>
                                    </li>
                                    <li className="sh-checklist-item">
                                        <FaCheckCircle className="sh-check-icon" />
                                        <span>Event, ticket & transport solutions</span>
                                    </li>
                                    <li className="sh-checklist-item">
                                        <FaCheckCircle className="sh-check-icon" />
                                        <span>Empowering local service businesses</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="sh-subsection-card">
                                <img
                                    src="https://th.bing.com/th/id/OIP.Z9sBdTxSks6X1nOIVUz1vAHaE7?rs=1&pid=ImgDetMain"
                                    alt="Our Vision"
                                    className="sh-subsection-img"
                                />
                                <h3><FaEye style={{ color: "#4f46e5" }} /> Our Vision</h3>
                                <p style={{ fontSize: "0.875rem", color: "#64748b", lineHeight: 1.5 }}>
                                    To become the most reliable and customer-centric hyperlocal service ecosystem, transforming how communities find, book, and experience services every day.
                                </p>
                            </div>

                            <div className="sh-subsection-card">
                                <img
                                    src="https://th.bing.com/th/id/OIP.c3yLfXwSbnrQFsa1X-WqWAHaEo?w=1000&h=625&rs=1&pid=ImgDetMain"
                                    alt="Our Mission"
                                    className="sh-subsection-img"
                                />
                                <h3><FaShieldAlt style={{ color: "#4f46e5" }} /> Our Mission</h3>
                                <p style={{ fontSize: "0.875rem", color: "#64748b", lineHeight: 1.5 }}>
                                    To build a transparent, secure, and accessible platform offering upfront pricing, verified credentials, and unmatched service quality for all.
                                </p>
                            </div>
                        </div>

                        {activeSection && (
                            <div className="sh-detail-footer">
                                <button
                                    type="button"
                                    className="sh-back-btn"
                                    onClick={() => toggleSection(null)}
                                >
                                    <FaArrowLeft />
                                    <span>Back to Overview</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}

            {/* Vendor Partner Benefits Section */}
            {activeSection === "vendorUs" && (
                <div className="sh-detail-wrapper">
                    <div className="sh-detail-card">
                        <div className="sh-detail-header-bar">
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase" }}>
                                For Partners
                            </span>
                            <button
                                type="button"
                                className="sh-back-btn"
                                onClick={() => toggleSection(null)}
                            >
                                <FaArrowLeft />
                                <span>Back to Overview</span>
                            </button>
                        </div>

                        <h1 className="sh-detail-title">Grow Your Business with Service Hunt</h1>

                        <div className="sh-hero-media">
                            <img
                                src="https://th.bing.com/th/id/OIP.yELYmy4neggRJg7LrnCmagHaFS?w=1280&h=914&rs=1&pid=ImgDetMain"
                                alt="Partner with us"
                            />
                        </div>

                        <p className="sh-detail-lead">
                            Join hundreds of verified professionals, contractors, and agencies expanding their client base. We handle discovery, scheduling, and billing so you can focus on delivering exceptional work.
                        </p>

                        <div className="sh-subsections-grid">
                            <div className="sh-subsection-card">
                                <h3><FaEye style={{ color: "#4f46e5" }} /> Enhanced Visibility</h3>
                                <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                                    Get featured in front of targeted local customers actively looking to hire service professionals in your city.
                                </p>
                            </div>

                            <div className="sh-subsection-card">
                                <h3><FaChartLine style={{ color: "#4f46e5" }} /> Smart Management</h3>
                                <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                                    Real-time booking dashboard, helper dispatching, slot calendar control, and notification management.
                                </p>
                            </div>

                            <div className="sh-subsection-card">
                                <h3><FaMoneyBillWave style={{ color: "#4f46e5" }} /> Flexible & Secure Payouts</h3>
                                <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                                    Timely payouts directly to your bank account with integrated digital invoicing and transparent commissions.
                                </p>
                            </div>

                            <div className="sh-subsection-card">
                                <h3><FaChartPie style={{ color: "#4f46e5" }} /> Performance Insights</h3>
                                <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                                    Detailed job analytics, rating metrics, customer feedback, and growth tips to optimize your revenue.
                                </p>
                            </div>
                        </div>

                        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: "30px 0 16px" }}>
                            Simple 4-Step Onboarding Process
                        </h2>

                        <div className="sh-steps-grid">
                            <div className="sh-step-box">
                                <div className="sh-step-num">1</div>
                                <h4>Account Setup</h4>
                                <p>Register your business profile and submit necessary documents.</p>
                            </div>
                            <div className="sh-step-box">
                                <div className="sh-step-num">2</div>
                                <h4>Profile Creation</h4>
                                <p>Add your service offerings, photos, and location-based pricing.</p>
                            </div>
                            <div className="sh-step-box">
                                <div className="sh-step-num">3</div>
                                <h4>Go Live</h4>
                                <p>Start receiving direct booking requests from nearby customers.</p>
                            </div>
                            <div className="sh-step-box">
                                <div className="sh-step-num">4</div>
                                <h4>Growth Support</h4>
                                <p>Scale your business with dedicated support and marketing tools.</p>
                            </div>
                        </div>

                        <div className="sh-detail-footer">
                            <button
                                type="button"
                                className="sh-back-btn"
                                onClick={() => toggleSection(null)}
                            >
                                <FaArrowLeft />
                                <span>Back to Overview</span>
                            </button>
                            <Link to="/form" style={{ fontWeight: 700, color: "#4f46e5", textDecoration: "none" }}>
                                Apply as Partner →
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Benefits Section */}
            {activeSection === "userUs" && (
                <div className="sh-detail-wrapper">
                    <div className="sh-detail-card">
                        <div className="sh-detail-header-bar">
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase" }}>
                                For Customers
                            </span>
                            <button
                                type="button"
                                className="sh-back-btn"
                                onClick={() => toggleSection(null)}
                            >
                                <FaArrowLeft />
                                <span>Back to Overview</span>
                            </button>
                        </div>

                        <h1 className="sh-detail-title">Why Choose Service Hunt?</h1>

                        <div className="sh-hero-media">
                            <img
                                src="https://thumbs.dreamstime.com/z/great-customer-service-words-white-concept-exciting-experience-customers-45526322.jpg"
                                alt="Great Customer Experience"
                            />
                        </div>

                        <div className="sh-subsections-grid">
                            <div className="sh-subsection-card">
                                <h3><FaCheckCircle style={{ color: "#10b981" }} /> All-in-One Convenience</h3>
                                <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                                    Access plumbers, electricians, caterers, drivers, and party planners from a single intuitive platform.
                                </p>
                            </div>

                            <div className="sh-subsection-card">
                                <h3><FaRocket style={{ color: "#4f46e5" }} /> 3-Click Instant Booking</h3>
                                <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                                    Select your city, choose your preferred timing, and book verified service providers with upfront pricing.
                                </p>
                            </div>

                            <div className="sh-subsection-card">
                                <h3><FaShieldAlt style={{ color: "#f59e0b" }} /> Verified Quality Guarantee</h3>
                                <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                                    Every professional is background-checked and customer-reviewed, ensuring you receive top-quality work every time.
                                </p>
                            </div>
                        </div>

                        <div className="sh-detail-footer">
                            <button
                                type="button"
                                className="sh-back-btn"
                                onClick={() => toggleSection(null)}
                            >
                                <FaArrowLeft />
                                <span>Back to Overview</span>
                            </button>
                            <Link to="/home" style={{ fontWeight: 700, color: "#4f46e5", textDecoration: "none" }}>
                                Explore Services →
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Terms & Conditions Section */}
            {activeSection === "terms" && (
                <div className="sh-detail-wrapper">
                    <div className="sh-detail-card">
                        <div className="sh-detail-header-bar">
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase" }}>
                                Legal
                            </span>
                            <button
                                type="button"
                                className="sh-back-btn"
                                onClick={() => toggleSection(null)}
                            >
                                <FaArrowLeft />
                                <span>Back to Overview</span>
                            </button>
                        </div>

                        <h1 className="sh-detail-title">Terms & Conditions</h1>

                        <div className="sh-legal-card">
                            <h3>Terms for Customers</h3>
                            <ul>
                                <li>Customers must confirm bookings and slot details within the designated service window.</li>
                                <li>Cancellations made within 24 hours of scheduled service may incur policy-based processing fees.</li>
                                <li>Customer feedback and ratings must accurately reflect genuine service interactions.</li>
                            </ul>
                        </div>

                        <div className="sh-legal-card">
                            <h3>Terms for Vendors & Service Providers</h3>
                            <ul>
                                <li>Vendors must maintain valid business documentation, insurance, and professional certifications.</li>
                                <li>Service providers agree to arrive promptly during booked slots and deliver services as described.</li>
                                <li>Direct payments outside the platform for on-platform leads violate marketplace terms.</li>
                            </ul>
                        </div>

                        <div className="sh-detail-footer">
                            <button
                                type="button"
                                className="sh-back-btn"
                                onClick={() => toggleSection(null)}
                            >
                                <FaArrowLeft />
                                <span>Back to Overview</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Privacy Policy Section */}
            {activeSection === "privacy" && (
                <div className="sh-detail-wrapper">
                    <div className="sh-detail-card">
                        <div className="sh-detail-header-bar">
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase" }}>
                                Privacy
                            </span>
                            <button
                                type="button"
                                className="sh-back-btn"
                                onClick={() => toggleSection(null)}
                            >
                                <FaArrowLeft />
                                <span>Back to Overview</span>
                            </button>
                        </div>

                        <h1 className="sh-detail-title">Privacy Policy</h1>

                        <div className="sh-legal-card">
                            <h3>Data Collection</h3>
                            <ul>
                                <li>We collect basic account information (name, email address, contact number) to manage bookings.</li>
                                <li>Location details are processed to match you with nearby service availability and calculate accurate area pricing.</li>
                                <li>Vendor identification documents are collected strictly for partner onboarding and security verification.</li>
                            </ul>
                        </div>

                        <div className="sh-legal-card">
                            <h3>Data Usage & Security</h3>
                            <ul>
                                <li>Your contact and address details are shared only with the assigned service provider for confirmed orders.</li>
                                <li>We implement industry-standard 256-bit encryption for all payment transactions and sensitive credentials.</li>
                                <li>We do not sell personal data to third-party marketing companies under any circumstances.</li>
                            </ul>
                        </div>

                        <div className="sh-detail-footer">
                            <button
                                type="button"
                                className="sh-back-btn"
                                onClick={() => toggleSection(null)}
                            >
                                <FaArrowLeft />
                                <span>Back to Overview</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Default Footer Overview Grid (Visible when no active modal/detail view is open) */}
            {!activeSection && (
                <footer className="sh-footer-container">
                    <div className="sh-footer-grid">
                        {/* 1. Brand & Tagline */}
                        <div className="sh-footer-col-brand">
                            <h3>
                                <FaTools style={{ color: "#6366f1", fontSize: "1.2rem" }} />
                                <span>Service Hunt</span>
                            </h3>
                            <p className="sh-footer-tagline">
                                Your trusted on-demand local marketplace for home maintenance, specialized repairs, event planning, and trusted lifestyle professionals.
                            </p>
                            <div className="sh-social-row">
                                <a href="#twitter" className="sh-social-btn" aria-label="Twitter">
                                    <FaTwitter />
                                </a>
                                <a href="#facebook" className="sh-social-btn" aria-label="Facebook">
                                    <FaFacebookF />
                                </a>
                                <a href="#instagram" className="sh-social-btn" aria-label="Instagram">
                                    <FaInstagram />
                                </a>
                                <a href="#linkedin" className="sh-social-btn" aria-label="LinkedIn">
                                    <FaLinkedinIn />
                                </a>
                            </div>
                        </div>

                        {/* 2. Company */}
                        <div>
                            <h4 className="sh-footer-title">Company</h4>
                            <ul className="sh-footer-list">
                                <li>
                                    <button
                                        type="button"
                                        className="sh-footer-link"
                                        onClick={() => toggleSection("aboutUs")}
                                    >
                                        About Us
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        className="sh-footer-link"
                                        onClick={() => toggleSection("terms")}
                                    >
                                        Terms & Conditions
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        className="sh-footer-link"
                                        onClick={() => toggleSection("privacy")}
                                    >
                                        Privacy Policy
                                    </button>
                                </li>
                            </ul>
                        </div>

                        {/* 3. For Customers */}
                        <div>
                            <h4 className="sh-footer-title">For Customers</h4>
                            <ul className="sh-footer-list">
                                <li>
                                    <button
                                        type="button"
                                        className="sh-footer-link"
                                        onClick={() => toggleSection("userUs")}
                                    >
                                        Why Choose Us?
                                    </button>
                                </li>
                                <li>
                                    <Link to="/home" className="sh-footer-link">
                                        Explore Services
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/myorders" className="sh-footer-link">
                                        Track Bookings
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* 4. For Partners */}
                        <div>
                            <h4 className="sh-footer-title">For Partners</h4>
                            <ul className="sh-footer-list">
                                <li>
                                    <button
                                        type="button"
                                        className="sh-footer-link"
                                        onClick={() => toggleSection("vendorUs")}
                                    >
                                        Partner Benefits
                                    </button>
                                </li>
                                <li>
                                    <Link to="/form" className="sh-footer-link">
                                        Register as Partner
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/helperlogin" className="sh-footer-link">
                                        Helper Panel
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* 5. Mobile Apps */}
                        <div>
                            <h4 className="sh-footer-title">Get The App</h4>
                            <div className="sh-app-badges">
                                <a href="#playstore">
                                    <img
                                        src="https://upload.wikimedia.org/wikipedia/commons/a/a0/Get_it_on_Google_play.svg"
                                        alt="Get it on Google Play"
                                        className="sh-app-badge-img"
                                    />
                                </a>
                                <a href="#appstore">
                                    <img
                                        src="https://upload.wikimedia.org/wikipedia/commons/5/58/Download_on_the_App_Store_Badge.svg"
                                        alt="Download on the App Store"
                                        className="sh-app-badge-img"
                                    />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Copyright Bar */}
                    <div className="sh-footer-bottom">
                        <div>
                            © {new Date().getFullYear()} Service Hunt Technologies, Inc. All rights reserved.
                        </div>
                        <div style={{ display: "flex", gap: "16px" }}>
                            <button
                                type="button"
                                className="sh-footer-link"
                                onClick={() => toggleSection("privacy")}
                            >
                                Privacy
                            </button>
                            <span>•</span>
                            <button
                                type="button"
                                className="sh-footer-link"
                                onClick={() => toggleSection("terms")}
                            >
                                Terms
                            </button>
                            <span>•</span>
                            <Link to="/home" className="sh-footer-link">
                                Sitemap
                            </Link>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
};

export default About;
