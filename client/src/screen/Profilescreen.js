import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Profilescreen.css";

// Crisp SVG Icons
import {
    FaUser,
    FaEnvelope,
    FaShieldAlt,
    FaStar,
    FaClipboardList,
    FaSignOutAlt,
    FaStore,
    FaArrowRight,
    FaCheckCircle,
    FaIdBadge
} from "react-icons/fa";

function Profilescreen() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("currentUser"));

    useEffect(() => {
        if (!user) {
            navigate("/login");
        }
    }, [user, navigate]);

    if (!user) {
        return null;
    }

    const logout = () => {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("selectedLocation");
        window.location.href = "/login";
    };

    const isVendor = Boolean(user.role === 'vendor' || user.isVendor);
    const isAdmin = Boolean(user.role === 'admin' || user.isAdmin);
    const isSuperAdmin = Boolean(
        user.email === 'himanshufa875@gmail.com' &&
        (user.role === 'superadmin' || user.isAdmin)
    );

    const getRoleInfo = () => {
        if (isSuperAdmin) return { text: "Super Admin", className: "superadmin" };
        if (isAdmin) return { text: "Admin", className: "admin" };
        if (isVendor) return { text: "Vendor Partner", className: "vendor" };
        return { text: "Verified Member", className: "user" };
    };

    const roleInfo = getRoleInfo();
    const userInitial = user.name ? user.name.charAt(0).toUpperCase() : "U";

    return (
        <div className="sh-profile-page">
            <Navbar />

            <main className="sh-profile-container">
                {/* 1. Profile Hero Card */}
                <div className="sh-profile-hero-card">
                    <div className="sh-profile-user-intro">
                        <div className="sh-profile-avatar">
                            {userInitial}
                        </div>
                        <div className="sh-profile-names-wrap">
                            <h1>{user.name}</h1>
                            <p className="sh-profile-email-text">{user.email}</p>
                            <span className={`sh-profile-role-tag ${roleInfo.className}`}>
                                <FaCheckCircle style={{ fontSize: "0.7rem" }} />
                                {roleInfo.text}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="sh-profile-logout-btn"
                        onClick={logout}
                        aria-label="Logout"
                    >
                        <FaSignOutAlt />
                        <span>Sign Out</span>
                    </button>
                </div>

                {/* 2. Account Details Section */}
                <section className="sh-profile-section-card">
                    <h2 className="sh-profile-section-title">
                        <FaIdBadge style={{ color: "#4f46e5" }} />
                        <span>Account Information</span>
                    </h2>

                    <div className="sh-profile-info-grid">
                        <div className="sh-profile-info-item">
                            <span className="sh-info-label">
                                <FaUser /> Full Name
                            </span>
                            <span className="sh-info-value">{user.name}</span>
                        </div>

                        <div className="sh-profile-info-item">
                            <span className="sh-info-label">
                                <FaEnvelope /> Email Address
                            </span>
                            <span className="sh-info-value">{user.email}</span>
                        </div>

                        <div className="sh-profile-info-item">
                            <span className="sh-info-label">
                                <FaShieldAlt /> Admin Privileges
                            </span>
                            <span className="sh-info-value" style={{ color: user.isAdmin ? "#10b981" : "#64748b" }}>
                                {user.isAdmin ? "Yes (Full Access)" : "No"}
                            </span>
                        </div>

                        <div className="sh-profile-info-item">
                            <span className="sh-info-label">
                                <FaCheckCircle /> Account Status
                            </span>
                            <span className="sh-info-value" style={{ color: "#10b981" }}>
                                Active & Verified
                            </span>
                        </div>
                    </div>
                </section>

                {/* 3. Quick Action Shortcuts Section */}
                <section className="sh-profile-section-card">
                    <h2 className="sh-profile-section-title">
                        <span>Quick Shortcuts</span>
                    </h2>

                    <div className="sh-profile-shortcuts-grid">
                        <Link to="/myorders" className="sh-shortcut-card">
                            <div className="sh-shortcut-content">
                                <div className="sh-shortcut-icon-box indigo">
                                    <FaClipboardList />
                                </div>
                                <div>
                                    <h3 className="sh-shortcut-title">My Bookings</h3>
                                    <p className="sh-shortcut-desc">View past & active service orders</p>
                                </div>
                            </div>
                            <FaArrowRight className="sh-shortcut-arrow" />
                        </Link>

                        <Link to="/form" className="sh-shortcut-card">
                            <div className="sh-shortcut-content">
                                <div className="sh-shortcut-icon-box emerald">
                                    <FaStore />
                                </div>
                                <div>
                                    <h3 className="sh-shortcut-title">Partner Program</h3>
                                    <p className="sh-shortcut-desc">List services & earn as vendor</p>
                                </div>
                            </div>
                            <FaArrowRight className="sh-shortcut-arrow" />
                        </Link>

                        {isVendor && (
                            <Link to="/vendor-dashboard" className="sh-shortcut-card">
                                <div className="sh-shortcut-content">
                                    <div className="sh-shortcut-icon-box purple">
                                        <FaStore />
                                    </div>
                                    <div>
                                        <h3 className="sh-shortcut-title">Vendor Dashboard</h3>
                                        <p className="sh-shortcut-desc">Manage your listings & calendar</p>
                                    </div>
                                </div>
                                <FaArrowRight className="sh-shortcut-arrow" />
                            </Link>
                        )}

                        {isAdmin && !isVendor && (
                            <Link to="/adminscreen" className="sh-shortcut-card">
                                <div className="sh-shortcut-content">
                                    <div className="sh-shortcut-icon-box amber">
                                        <FaShieldAlt />
                                    </div>
                                    <div>
                                        <h3 className="sh-shortcut-title">Admin Panel</h3>
                                        <p className="sh-shortcut-desc">System moderation & services</p>
                                    </div>
                                </div>
                                <FaArrowRight className="sh-shortcut-arrow" />
                            </Link>
                        )}

                        {isSuperAdmin && (
                            <Link to="/superadmin" className="sh-shortcut-card">
                                <div className="sh-shortcut-content">
                                    <div className="sh-shortcut-icon-box amber">
                                        <FaStar />
                                    </div>
                                    <div>
                                        <h3 className="sh-shortcut-title">Super Admin</h3>
                                        <p className="sh-shortcut-desc">Full platform administration</p>
                                    </div>
                                </div>
                                <FaArrowRight className="sh-shortcut-arrow" />
                            </Link>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

export default Profilescreen;
