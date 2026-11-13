import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import LocationSearch from "./LocationSearch";
import "./Navbar.css";

// Crisp SVG icons
import {
    FaMapMarkerAlt,
    FaChevronDown,
    FaTimes,
    FaUser,
    FaClipboardList,
    FaHandshake,
    FaThLarge,
    FaShieldAlt,
    FaStar,
    FaInfoCircle,
    FaLifeRing,
    FaSignOutAlt,
    FaTrashAlt,
    FaTools,
    FaSearch,
    FaKey
} from "react-icons/fa";

function Navbar({ filterByLocation, searchService, onLocationSelect, selectedLocation }) {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showLocationSearch, setShowLocationSearch] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    // Helper panel states (only show to users whose email is added by admin)
    const [isHelperUser, setIsHelperUser] = useState(Boolean(user?.isHelper));
    const [helperInfo, setHelperInfo] = useState(null);
    const [showHelperModal, setShowHelperModal] = useState(false);
    const [helperInputCode, setHelperInputCode] = useState("");
    const [helperConnecting, setHelperConnecting] = useState(false);
    const [helperError, setHelperError] = useState("");

    // Refs to guard against rapid location updates and outside clicks
    const isProcessingLocation = useRef(false);
    const lastSelectedLocation = useRef(null);
    const dropdownRef = useRef(null);
    const locationSearchRef = useRef(null);

    // Track window resize for responsive layout
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sync currentLocation with selectedLocation prop if provided
    useEffect(() => {
        if (selectedLocation) {
            setCurrentLocation(selectedLocation);
        }
    }, [selectedLocation]);

    // Load saved location from localStorage on component mount (only if user is logged in)
    useEffect(() => {
        if (user) {
            const savedLocation = localStorage.getItem("selectedLocation");
            if (savedLocation && !isProcessingLocation.current) {
                try {
                    const location = JSON.parse(savedLocation);
                    if (JSON.stringify(currentLocation) !== JSON.stringify(location)) {
                        setCurrentLocation(location);
                        if (onLocationSelect) {
                            onLocationSelect(location);
                        }
                    }
                } catch (error) {
                    console.error("Error parsing saved location:", error);
                }
            }
        } else {
            setCurrentLocation(null);
            localStorage.removeItem("selectedLocation");
            if (onLocationSelect) {
                onLocationSelect(null);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Listen for cross-tab or external location updates via storage events
    useEffect(() => {
        const handleStorageChange = () => {
            if (user && !isProcessingLocation.current) {
                const savedLocation = localStorage.getItem("selectedLocation");
                if (savedLocation) {
                    try {
                        const location = JSON.parse(savedLocation);
                        if (JSON.stringify(currentLocation) !== JSON.stringify(location)) {
                            setCurrentLocation(location);
                            if (onLocationSelect) {
                                onLocationSelect(location);
                            }
                        }
                    } catch (error) {
                        console.error("Error parsing saved location:", error);
                    }
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [user, currentLocation, onLocationSelect]);

    // Close popovers on click outside and on Escape key
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (locationSearchRef.current && !locationSearchRef.current.contains(event.target)) {
                setShowLocationSearch(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsDropdownOpen(false);
                setShowLocationSearch(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Verify whether currentUser email was added by an admin as a helper
    useEffect(() => {
        let isMounted = true;
        const checkHelperStatus = async () => {
            if (!user || !user.email) {
                if (isMounted) {
                    setIsHelperUser(false);
                    setHelperInfo(null);
                }
                return;
            }

            try {
                const res = await axios.get('/api/helper/check-by-email', {
                    params: { email: user.email }
                });
                if (isMounted) {
                    if (res.data?.success && res.data?.isHelper) {
                        setIsHelperUser(true);
                        setHelperInfo(res.data.helper);
                    } else {
                        setIsHelperUser(false);
                        setHelperInfo(null);
                    }
                }
            } catch (err) {
                console.error("Error verifying helper email:", err);
            }
        };

        checkHelperStatus();
        return () => {
            isMounted = false;
        };
    }, [user?.email]);

    const logout = () => {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("selectedLocation");
        localStorage.removeItem("helperToken");
        window.location.href = "/login";
    };

    const handleHelperPanelClick = () => {
        setIsDropdownOpen(false);
        setShowLocationSearch(false);
        setHelperError("");

        const helperToken = localStorage.getItem("helperToken");
        if (helperToken && user?.isHelper) {
            navigate("/helperlogin");
            return;
        }

        setShowHelperModal(true);
    };

    const handleConnectHelper = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const cleanCode = helperInputCode.trim();
        if (!cleanCode) {
            setHelperError("Please enter your 5-digit unique code");
            return;
        }

        try {
            setHelperConnecting(true);
            setHelperError("");
            const res = await axios.post("/api/helper/login", {
                code: cleanCode,
                email: user?.email
            });

            if (res.data?.success) {
                const helper = res.data.helper;
                const token = res.data.token;

                localStorage.setItem("helperToken", token);
                const updatedUser = {
                    ...user,
                    _id: helper._id,
                    name: helper.name || user?.name,
                    email: helper.email || user?.email,
                    phone: helper.phone || user?.phone,
                    isHelper: true,
                    helperId: helper._id,
                    code: helper.code,
                    isConnected: true,
                    vendor: helper.vendor
                };
                localStorage.setItem("currentUser", JSON.stringify(updatedUser));

                setIsHelperUser(true);
                setHelperInfo(helper);
                setShowHelperModal(false);
                setHelperInputCode("");
                navigate("/helperlogin");
            } else {
                setHelperError(res.data?.message || "Invalid unique code");
            }
        } catch (err) {
            console.error("Helper connection error:", err);
            setHelperError(
                err.response?.data?.message || "Invalid unique code or failed to connect with admin/vendor."
            );
        } finally {
            setHelperConnecting(false);
        }
    };

    const handleSearchChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (searchService) {
            searchService(term);
        }
    };

    // Location selection handler with debounce lock
    const handleLocationSelect = useCallback((location) => {
        if (isProcessingLocation.current) {
            return;
        }

        if (lastSelectedLocation.current && JSON.stringify(lastSelectedLocation.current) === JSON.stringify(location)) {
            return;
        }

        if (!user) {
            setShowLocationSearch(false);
            return;
        }

        isProcessingLocation.current = true;
        lastSelectedLocation.current = location;

        try {
            if (location) {
                localStorage.setItem("selectedLocation", JSON.stringify(location));
                setCurrentLocation(location);
                if (onLocationSelect) {
                    onLocationSelect(location);
                }
            } else {
                localStorage.removeItem("selectedLocation");
                setCurrentLocation(null);
                if (onLocationSelect) {
                    onLocationSelect(null);
                }
            }
            setShowLocationSearch(false);
        } finally {
            setTimeout(() => {
                isProcessingLocation.current = false;
            }, 300);
        }
    }, [user, onLocationSelect]);

    const toggleLocationSearch = () => {
        if (!user) {
            return;
        }
        setShowLocationSearch((prev) => !prev);
        setIsDropdownOpen(false);
    };

    const toggleDropdown = () => {
        setIsDropdownOpen((prev) => !prev);
        setShowLocationSearch(false);
    };

    const handleNavigation = (path) => {
        navigate(path);
        setIsDropdownOpen(false);
        setShowLocationSearch(false);
    };

    // Role checks
    const isVendor = Boolean(user?.role === 'vendor' || user?.isVendor);
    const isAdmin = Boolean(user?.role === 'admin' || user?.isAdmin);
    const isSuperAdmin = Boolean(
        user?.email === 'himanshufa875@gmail.com' &&
        (user?.role === 'superadmin' || user?.isAdmin)
    );

    const getRoleInfo = () => {
        if (isSuperAdmin) return { text: "Super Admin", className: "superadmin" };
        if (isAdmin) return { text: "Admin", className: "admin" };
        if (isVendor) return { text: "Vendor", className: "vendor" };
        return { text: "Member", className: "user" };
    };

    const roleInfo = getRoleInfo();
    const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";
    const userFirstName = user?.name ? user.name.split(' ')[0] : "Account";

    const getDisplayLocationName = () => {
        if (!user) return "Select Location";
        if (!currentLocation) return "Select Location";
        return (
            currentLocation.display_name?.split(',')[0] ||
            currentLocation.city ||
            currentLocation.name ||
            "Location"
        );
    };

    return (
        <nav className="sh-navbar custom-navbar" aria-label="Main Navigation">
            <div className="sh-navbar-inner">
                {/* Brand / Logo Section */}
                <a
                    href="/home"
                    className="sh-brand-link navbar-brand"
                    onClick={(e) => {
                        e.preventDefault();
                        handleNavigation('/home');
                    }}
                >
                    <div className="sh-brand-logo-badge">
                        <FaTools className="sh-brand-logo-icon" />
                    </div>
                    <span className="sh-brand-text">
                        Service Hunt<span className="sh-brand-dot">.</span>
                    </span>
                </a>

                {/* Optional Search Bar (Visible when searchService prop is provided) */}
                {searchService && (
                    <div className="sh-nav-search-container">
                        <FaSearch className="sh-nav-search-icon" />
                        <input
                            type="text"
                            className="sh-nav-search-input"
                            placeholder="Search services..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                className="sh-nav-search-clear"
                                onClick={() => {
                                    setSearchTerm('');
                                    searchService('');
                                }}
                                aria-label="Clear search"
                            >
                                <FaTimes />
                            </button>
                        )}
                    </div>
                )}

                {/* Right Action Elements */}
                <div className="sh-nav-right">
                    {/* Direct Helper Panel Button: Only visible if user's email was added by an admin */}
                    {isHelperUser && (
                        <button
                            type="button"
                            className={`sh-helper-direct-pill ${user?.isHelper ? 'connected' : ''}`}
                            onClick={handleHelperPanelClick}
                            title={user?.isHelper ? "Open Helper Workstation" : "Enter Unique Code to Connect"}
                        >
                            <span className={`sh-helper-pulse-dot ${user?.isHelper ? 'connected' : ''}`} />
                            <FaLifeRing className="sh-helper-direct-icon" />
                            <span className="sh-helper-direct-label">Helper Panel</span>
                        </button>
                    )}

                    {/* Location Selector (Available when user is logged in) */}
                    {user && (
                        <div className="sh-location-wrapper" ref={locationSearchRef}>
                            <button
                                type="button"
                                className={`sh-location-pill ${currentLocation ? 'active' : ''}`}
                                onClick={toggleLocationSearch}
                                title={getDisplayLocationName()}
                                aria-expanded={showLocationSearch}
                            >
                                <FaMapMarkerAlt className="sh-location-icon" />
                                <span className="sh-location-name">
                                    {getDisplayLocationName()}
                                </span>
                                <FaChevronDown className={`sh-chevron-icon ${showLocationSearch ? 'open' : ''}`} />
                            </button>

                            {/* Location Search Popover / Sheet */}
                            {showLocationSearch && (
                                <>
                                    {isMobile && (
                                        <div
                                            className="sh-backdrop"
                                            onClick={() => setShowLocationSearch(false)}
                                        />
                                    )}
                                    <div className="sh-location-popover">
                                        <div className="sh-location-header">
                                            <div>
                                                <h4 className="sh-location-header-title">Select Location</h4>
                                                <p className="sh-location-header-sub">
                                                    Find services available near you
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                className="sh-close-btn"
                                                onClick={() => setShowLocationSearch(false)}
                                                aria-label="Close"
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>

                                        <LocationSearch
                                            onLocationSelect={handleLocationSelect}
                                            placeholder="Search for city, area..."
                                        />

                                        {currentLocation && (
                                            <button
                                                type="button"
                                                className="sh-clear-location-btn"
                                                onClick={() => handleLocationSelect(null)}
                                            >
                                                <FaTrashAlt style={{ fontSize: "0.8rem" }} />
                                                <span>Clear Current Location</span>
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* User Section (Logged In vs Logged Out) */}
                    {user ? (
                        <div className="sh-user-wrapper" ref={dropdownRef}>
                            <button
                                type="button"
                                className="sh-user-pill"
                                onClick={toggleDropdown}
                                aria-expanded={isDropdownOpen}
                                aria-label="User menu"
                            >
                                <div className="sh-user-avatar">
                                    {userInitial}
                                </div>
                                <span className="sh-user-name">
                                    {userFirstName}
                                </span>
                                <FaChevronDown className={`sh-chevron-icon ${isDropdownOpen ? 'open' : ''}`} />
                            </button>

                            {/* User Menu Dropdown */}
                            {isDropdownOpen && (
                                <>
                                    {isMobile && (
                                        <div
                                            className="sh-backdrop"
                                            onClick={() => setIsDropdownOpen(false)}
                                        />
                                    )}
                                    <div className="sh-user-menu">
                                        {/* Profile Card Header */}
                                        <div className="sh-user-menu-header">
                                            <div className="sh-user-menu-avatar">
                                                {userInitial}
                                            </div>
                                            <div className="sh-user-info-text">
                                                <div className="sh-user-info-name">{user.name}</div>
                                                <div className="sh-user-info-email">{user.email}</div>
                                                <span className={`sh-role-badge ${roleInfo.className}`}>
                                                    {roleInfo.text}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Account Links */}
                                        <div className="sh-menu-group">
                                            <div className="sh-menu-group-title">Account</div>
                                            <button
                                                type="button"
                                                className="sh-menu-item"
                                                onClick={() => handleNavigation("/profile")}
                                            >
                                                <span className="sh-menu-item-icon"><FaUser /></span>
                                                <span>Profile</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="sh-menu-item"
                                                onClick={() => handleNavigation("/myorders")}
                                            >
                                                <span className="sh-menu-item-icon"><FaClipboardList /></span>
                                                <span>My Orders</span>
                                            </button>
                                        </div>

                                        <div className="sh-menu-divider" />

                                        {/* Partner & Services Links */}
                                        <div className="sh-menu-group">
                                            <div className="sh-menu-group-title">Partner & Services</div>
                                            <button
                                                type="button"
                                                className="sh-menu-item"
                                                onClick={() => handleNavigation("/form")}
                                            >
                                                <span className="sh-menu-item-icon"><FaHandshake /></span>
                                                <span>Become a Partner</span>
                                            </button>
                                            {isVendor && (
                                                <button
                                                    type="button"
                                                    className="sh-menu-item"
                                                    onClick={() => handleNavigation("/vendor-dashboard")}
                                                >
                                                    <span className="sh-menu-item-icon"><FaThLarge /></span>
                                                    <span>Vendor Dashboard</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Admin & Management Links */}
                                        {((isAdmin && !isVendor) || isSuperAdmin) && (
                                            <>
                                                <div className="sh-menu-divider" />
                                                <div className="sh-menu-group">
                                                    <div className="sh-menu-group-title">Management</div>
                                                    {isAdmin && !isVendor && (
                                                        <button
                                                            type="button"
                                                            className="sh-menu-item"
                                                            onClick={() => handleNavigation("/adminscreen")}
                                                        >
                                                            <span className="sh-menu-item-icon"><FaShieldAlt /></span>
                                                            <span>Admin Panel</span>
                                                        </button>
                                                    )}
                                                    {isSuperAdmin && (
                                                        <button
                                                            type="button"
                                                            className="sh-menu-item"
                                                            onClick={() => handleNavigation("/superadmin")}
                                                        >
                                                            <span className="sh-menu-item-icon"><FaStar /></span>
                                                            <span>Super Admin</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        <div className="sh-menu-divider" />

                                        {/* Support Links */}
                                        <div className="sh-menu-group">
                                            <div className="sh-menu-group-title">Help & Support</div>
                                            <button
                                                type="button"
                                                className="sh-menu-item"
                                                onClick={() => handleNavigation("/about")}
                                            >
                                                <span className="sh-menu-item-icon"><FaInfoCircle /></span>
                                                <span>About Us</span>
                                            </button>
                                            {isHelperUser && (
                                                <button
                                                    type="button"
                                                    className="sh-menu-item"
                                                    onClick={handleHelperPanelClick}
                                                >
                                                    <span className="sh-menu-item-icon"><FaLifeRing /></span>
                                                    <span>Helper Panel</span>
                                                    {user?.isHelper && (
                                                        <span className="sh-helper-status-tag">Connected</span>
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        <div className="sh-menu-divider" />

                                        {/* Logout Action */}
                                        <button
                                            type="button"
                                            className="sh-menu-item logout"
                                            onClick={logout}
                                        >
                                            <span className="sh-menu-item-icon"><FaSignOutAlt /></span>
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        /* Non-logged in action buttons */
                        <div className="sh-auth-buttons">
                            <button
                                type="button"
                                className="sh-btn-register"
                                onClick={() => handleNavigation("/register")}
                            >
                                Register
                            </button>
                            <button
                                type="button"
                                className="sh-btn-login"
                                onClick={() => handleNavigation("/login")}
                            >
                                Login
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Helper Station Unique Code Connection Modal */}
            {showHelperModal && (
                <div
                    className="sh-helper-modal-overlay"
                    onClick={() => setShowHelperModal(false)}
                >
                    <div
                        className="sh-helper-modal-dialog"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sh-helper-modal-header">
                            <div className="sh-helper-modal-title-wrap">
                                <div className="sh-helper-modal-icon-badge">
                                    <FaLifeRing />
                                </div>
                                <div>
                                    <h3 className="sh-helper-modal-title">Helper Panel Access</h3>
                                    <p className="sh-helper-modal-subtitle">
                                        Connect with your assigned Admin or Vendor
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="sh-helper-modal-close"
                                onClick={() => setShowHelperModal(false)}
                                aria-label="Close"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="sh-helper-modal-body">
                            <div className="sh-helper-auth-status-card">
                                <div className="sh-helper-auth-row">
                                    <span className="sh-helper-label">Helper Account:</span>
                                    <span className="sh-helper-val">{user?.email}</span>
                                </div>
                                {helperInfo?.vendor?.name && (
                                    <div className="sh-helper-auth-row">
                                        <span className="sh-helper-label">Assigned By:</span>
                                        <span className="sh-helper-val highlight">
                                            {helperInfo.vendor.name} (Admin/Vendor)
                                        </span>
                                    </div>
                                )}
                            </div>

                            <p className="sh-helper-modal-instruction">
                                Enter the <strong>unique 5-digit code</strong> generated by your Admin or Vendor to activate your workstation and connect.
                            </p>

                            <form onSubmit={handleConnectHelper}>
                                <div className="sh-helper-input-wrapper">
                                    <FaKey className="sh-helper-input-key-icon" />
                                    <input
                                        type="text"
                                        className="sh-helper-code-input"
                                        placeholder="Enter 5-digit code (e.g. 12345)"
                                        maxLength={8}
                                        value={helperInputCode}
                                        onChange={(e) => {
                                            setHelperInputCode(e.target.value.toUpperCase());
                                            setHelperError("");
                                        }}
                                        autoFocus
                                    />
                                </div>

                                {helperError && (
                                    <div className="sh-helper-modal-error">
                                        ⚠️ {helperError}
                                    </div>
                                )}

                                <div className="sh-helper-modal-actions">
                                    <button
                                        type="button"
                                        className="sh-helper-btn-cancel"
                                        onClick={() => setShowHelperModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="sh-helper-btn-submit"
                                        disabled={helperConnecting || !helperInputCode.trim()}
                                    >
                                        {helperConnecting ? "Connecting..." : "Connect & Open Panel →"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}

export default Navbar;
