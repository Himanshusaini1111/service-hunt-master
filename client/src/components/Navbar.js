import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LocationSearch from "./LocationSearch";

function Navbar({ filterByLocation, searchService, onLocationSelect, selectedLocation }) {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showLocationSearch, setShowLocationSearch] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    const menuRef = useRef(null);
    const dropdownRef = useRef(null);
    const locationSearchRef = useRef(null);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load saved location from localStorage on component mount (only if user is logged in)
    useEffect(() => {
        if (user) {
            const savedLocation = localStorage.getItem("selectedLocation");
            if (savedLocation) {
                try {
                    const location = JSON.parse(savedLocation);
                    setCurrentLocation(location);
                    if (onLocationSelect) {
                        onLocationSelect(location);
                    }
                } catch (error) {
                    console.error("Error parsing saved location:", error);
                }
            }
        } else {
            // Clear location when user logs out
            setCurrentLocation(null);
            localStorage.removeItem("selectedLocation");
            if (onLocationSelect) {
                onLocationSelect(null);
            }
        }
    }, [user, onLocationSelect]);

    // Listen for location selection from other components (only if user is logged in)
    useEffect(() => {
        const handleStorageChange = () => {
            if (user) {
                const savedLocation = localStorage.getItem("selectedLocation");
                if (savedLocation) {
                    try {
                        const location = JSON.parse(savedLocation);
                        setCurrentLocation(location);
                        if (onLocationSelect) {
                            onLocationSelect(location);
                        }
                    } catch (error) {
                        console.error("Error parsing saved location:", error);
                    }
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [user, onLocationSelect]);

    function logout() {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("selectedLocation"); // Clear location on logout
        window.location.href = "/login";
    }

    const handleSearchChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (searchService) {
            searchService(term);
        }
    };

    const handleLocationSelect = (location) => {
        // Only allow location selection if user is logged in
        if (!user) {
            console.log("User not logged in, cannot select location");
            setShowLocationSearch(false);
            return;
        }

        console.log("Location selected in Navbar:", location);

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

        if (isMobile && isMenuOpen) {
            setIsMenuOpen(false);
        }
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
        setIsDropdownOpen(false);
        setShowLocationSearch(false);
    };

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
        setShowLocationSearch(false);
    };

    const toggleLocationSearch = () => {
        // Only allow location search if user is logged in
        if (!user) {
            console.log("Please login to select location");
            // Optional: Show a toast/notification message
            return;
        }
        setShowLocationSearch(!showLocationSearch);
        setIsDropdownOpen(false);
    };

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target) &&
                !event.target.closest('.navbar-toggler')) {
                setIsMenuOpen(false);
            }

            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }

            if (locationSearchRef.current && !locationSearchRef.current.contains(event.target)) {
                setShowLocationSearch(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Check user roles for navigation items
    const isVendor = user?.role === 'vendor' || user?.isVendor;
    const isAdmin = user?.role === 'admin' || user?.isAdmin;
    const isSuperAdmin = user?.email === 'himanshufa875@gmail.com' &&
        (user?.role === 'superadmin' || user?.isAdmin);

    const handleNavigation = (path) => {
        navigate(path);
        setIsMenuOpen(false);
        setIsDropdownOpen(false);
        setShowLocationSearch(false);
    };

    const getDisplayLocationName = () => {
        if (!user) return "Login";
        if (!currentLocation) return "Location";
        return currentLocation.display_name?.split(',')[0] ||
            currentLocation.city ||
            currentLocation.name ||
            "Location";
    };

    // Styles
    const styles = {
        navbar: {
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            position: 'sticky',
            top: 0,
            zIndex: 1030
        },
        brand: {
            margin: 0,
            color: '#4a54e1',
            fontWeight: 'bold',
            fontSize: isMobile ? '1rem' : '1.5rem',
            whiteSpace: 'nowrap'
        },
        locationButton: (hasLocation, isLoggedIn) => ({
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            padding: isMobile ? "6px 10px" : "8px 20px",
            backgroundColor: hasLocation ? "#4a54e1" : (!isLoggedIn ? "#f0f0f0" : "#f8f9fa"),
            border: hasLocation ? "none" : "1px solid #e0e0e0",
            borderRadius: "8px",
            cursor: isLoggedIn ? "pointer" : "not-allowed",
            transition: "all 0.3s ease",
            color: hasLocation ? "white" : (!isLoggedIn ? "#999" : "#333"),
            fontSize: isMobile ? "12px" : "14px",
            fontWeight: "500",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            opacity: isLoggedIn ? 1 : 0.7,
            minWidth: isMobile ? "auto" : "auto"
        }),
        locationDropdown: {
            position: isMobile ? "fixed" : "absolute",
            top: isMobile ? "50%" : "100%",
            left: isMobile ? "50%" : "auto",
            right: isMobile ? "auto" : "0",
            transform: isMobile ? "translate(-50%, -50%)" : "none",
            marginTop: isMobile ? "0" : "8px",
            width: isMobile ? "90%" : "360px",
            maxWidth: "400px",
            zIndex: 9999,
            backgroundColor: "white",
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            padding: "20px"
        },
        userButton: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            padding: isMobile ? "4px 8px" : "8px 16px",
            backgroundColor: "#f8f9fa",
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.3s ease"
        },
        userInitials: {
            width: isMobile ? "28px" : "32px",
            height: isMobile ? "28px" : "32px",
            borderRadius: "50%",
            backgroundColor: "#4a54e1",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isMobile ? "12px" : "14px",
            fontWeight: "500"
        },
        dropdownMenu: {
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            minWidth: '250px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1050,
            padding: '8px 0'
        },
        mobileDropdownMenu: {
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            width: '280px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1050,
            padding: '8px 0'
        },
        hamburgerButton: {
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4a54e1'
        },
        mobileMenu: {
            position: 'fixed',
            top: '60px',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1040,
            padding: '16px',
            maxHeight: 'calc(100vh - 60px)',
            overflowY: 'auto'
        },
        mobileNavLink: {
            display: 'block',
            padding: '12px 16px',
            width: '100%',
            textAlign: 'left',
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            color: '#333',
            borderBottom: '1px solid #f0f0f0'
        },
        mobileAuthButtons: {
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
        },
        mobileContainer: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            gap: '8px'
        },
        mobileRightSection: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }
    };

    return (
        <nav className="navbar navbar-expand-lg custom-navbar" style={styles.navbar}>
            <div className="container-fluid px-2 px-md-4">
                {/* Mobile Layout - Everything in one line */}
                {isMobile ? (
                    <div style={styles.mobileContainer}>
                        {/* Brand Section */}
                        <a
                            className="navbar-brand"
                            href="/home"
                            onClick={(e) => {
                                e.preventDefault();
                                handleNavigation('/home');
                            }}
                            style={{ padding: 0, margin: 0 }}
                        >
                            <h5 style={styles.brand}>Smart Seva</h5>
                        </a>

                        {/* Right Section - Location and User */}
                        <div style={styles.mobileRightSection}>
                            {/* Location Button - Mobile (Only show if user is logged in) */}
                            {user && (
                                <div ref={locationSearchRef} style={{ position: 'relative' }}>
                                    <button
                                        style={styles.locationButton(!!currentLocation, true)}
                                        onClick={toggleLocationSearch}
                                    >
                                        <i className="fa fa-map-marker" style={{ fontSize: '10px' }}></i>
                                        <span style={{ maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '11px' }}>
                                            {getDisplayLocationName()}
                                        </span>
                                    </button>

                                    {showLocationSearch && (
                                        <div style={styles.locationDropdown}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                                                <h4 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Select Location</h4>
                                                <button
                                                    onClick={() => setShowLocationSearch(false)}
                                                    style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#666" }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                            <LocationSearch onLocationSelect={handleLocationSelect} placeholder="Search for city, area..." />
                                            {currentLocation && (
                                                <button
                                                    onClick={() => handleLocationSelect(null)}
                                                    style={{
                                                        marginTop: "12px",
                                                        padding: "10px",
                                                        backgroundColor: "#ff4444",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: "8px",
                                                        cursor: "pointer",
                                                        fontSize: "14px",
                                                        width: "100%",
                                                        fontWeight: "500"
                                                    }}
                                                >
                                                    Clear Location
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* User Section - Mobile */}
                            {user ? (
                                <div ref={dropdownRef} style={{ position: 'relative' }}>
                                    <button
                                        style={styles.userButton}
                                        onClick={toggleDropdown}
                                    >
                                        <div style={styles.userInitials}>
                                            {user.name?.charAt(0).toUpperCase()}
                                        </div>
                                    </button>

                                    {isDropdownOpen && (
                                        <div style={styles.mobileDropdownMenu}>
                                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0' }}>
                                                <strong style={{ fontSize: '16px' }}>{user.name}</strong>
                                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{user.email}</div>
                                            </div>
                                            <button className="dropdown-item" onClick={() => handleNavigation("/profile")}>
                                                <i className="fa fa-user-o"></i> Profile
                                            </button>
                                            <button className="dropdown-item" onClick={() => handleNavigation("/myorders")}>
                                                <i className="fa fa-gavel"></i> Orders
                                            </button>
                                            <button className="dropdown-item" onClick={() => handleNavigation("/form")}>
                                                <i className="fa fa-handshake-o"></i> Partner
                                            </button>
                                            {isVendor && (
                                                <button className="dropdown-item" onClick={() => handleNavigation("/vendor-dashboard")}>
                                                    <i className="fa fa-dashboard"></i> Vendor Dashboard
                                                </button>
                                            )}
                                            {isAdmin && !isVendor && (
                                                <button className="dropdown-item" onClick={() => handleNavigation("/adminscreen")}>
                                                    <i className="fa fa-shield"></i> Admin Panel
                                                </button>
                                            )}
                                            {isSuperAdmin && (
                                                <button className="dropdown-item" onClick={() => handleNavigation("/superadmin")}>
                                                    <i className="fa fa-star"></i> Super Admin
                                                </button>
                                            )}
                                            <button className="dropdown-item" onClick={() => handleNavigation("/about")}>
                                                <i className="fa fa-info-circle"></i> About
                                            </button>
                                            <button className="dropdown-item" onClick={() => handleNavigation("/helperpanel")}>
                                                <i className="fa fa-life-ring"></i> Helper Panel
                                            </button>
                                            <div className="dropdown-divider"></div>
                                            <button className="dropdown-item text-danger" onClick={logout}>
                                                <i className="fa fa-sign-out"></i> Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Login/Register Buttons for Non-Logged In Users on Mobile */
                                <div style={styles.mobileAuthButtons}>
                                    <button
                                        className="btn btn-outline-primary"
                                        onClick={() => handleNavigation("/register")}
                                        style={{
                                            padding: "6px 12px",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                            whiteSpace: "nowrap"
                                        }}
                                    >
                                        Register
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleNavigation("/login")}
                                        style={{
                                            padding: "6px 12px",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                            whiteSpace: "nowrap"
                                        }}
                                    >
                                        Login
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Desktop Layout */
                    <>
                        {/* Brand Section */}
                        <a
                            className="navbar-brand"
                            href="/home"
                            onClick={(e) => {
                                e.preventDefault();
                                handleNavigation('/home');
                            }}
                            style={{ padding: 0 }}
                        >
                            <h5 style={styles.brand}>Smart Seva</h5>
                        </a>

                        {/* Desktop Navigation Links */}
                        <div className="collapse navbar-collapse" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <ul className="navbar-nav" style={{ flexDirection: 'row', gap: '12px', alignItems: 'center' }}>
                                {/* Location Search - Desktop (Only show if user is logged in) */}
                                {user && (
                                    <li className="nav-item" ref={locationSearchRef} style={{ position: 'relative' }}>
                                        <button
                                            style={styles.locationButton(!!currentLocation, true)}
                                            onClick={toggleLocationSearch}
                                            onMouseEnter={() => !isMobile && setShowLocationSearch(true)}
                                        >
                                            <i className="fa fa-map-marker"></i>
                                            <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {getDisplayLocationName()}
                                            </span>
                                            <i className={`fa fa-chevron-${showLocationSearch ? 'up' : 'down'}`} style={{ fontSize: "10px" }}></i>
                                        </button>

                                        {showLocationSearch && (
                                            <div style={styles.locationDropdown} onMouseLeave={() => !isMobile && setShowLocationSearch(false)}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                                                    <h4 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Select Location</h4>
                                                    <button
                                                        onClick={() => setShowLocationSearch(false)}
                                                        style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#666" }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                                <LocationSearch onLocationSelect={handleLocationSelect} placeholder="Search for city, area..." />
                                                {currentLocation && (
                                                    <button
                                                        onClick={() => handleLocationSelect(null)}
                                                        style={{
                                                            marginTop: "12px",
                                                            padding: "10px",
                                                            backgroundColor: "#ff4444",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "8px",
                                                            cursor: "pointer",
                                                            fontSize: "14px",
                                                            width: "100%",
                                                            fontWeight: "500"
                                                        }}
                                                    >
                                                        Clear Location
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                )}

                                {user ? (
                                    <>
                                        {/* User Dropdown - Desktop */}
                                        <li className="nav-item" ref={dropdownRef} style={{ position: 'relative' }}>
                                            <button
                                                style={styles.userButton}
                                                onClick={toggleDropdown}
                                            >
                                                <i className="fa fa-user"></i>
                                                <span style={{ fontSize: "14px", fontWeight: "500", color: "black" }}>
                                                    {user.name?.split(' ')[0]}
                                                </span>
                                                <div style={styles.userInitials}>
                                                    {user.name?.charAt(0).toUpperCase()}
                                                </div>
                                            </button>

                                            {isDropdownOpen && (
                                                <div style={styles.dropdownMenu}>
                                                    <div style={{ padding: '8px 16px', borderBottom: '1px solid #e0e0e0' }}>
                                                        <strong>{user.name}</strong>
                                                        <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
                                                    </div>
                                                    <button className="dropdown-item" onClick={() => handleNavigation("/profile")}>
                                                        <i className="fa fa-user-o"></i> Profile
                                                    </button>
                                                    <button className="dropdown-item" onClick={() => handleNavigation("/myorders")}>
                                                        <i className="fa fa-gavel"></i> Orders
                                                    </button>
                                                    <button className="dropdown-item" onClick={() => handleNavigation("/form")}>
                                                        <i className="fa fa-handshake-o"></i> Partner
                                                    </button>
                                                    {isVendor && (
                                                        <button className="dropdown-item" onClick={() => handleNavigation("/vendor-dashboard")}>
                                                            <i className="fa fa-dashboard"></i> Vendor Dashboard
                                                        </button>
                                                    )}
                                                    {isAdmin && !isVendor && (
                                                        <button className="dropdown-item" onClick={() => handleNavigation("/adminscreen")}>
                                                            <i className="fa fa-shield"></i> Admin Panel
                                                        </button>
                                                    )}
                                                    {isSuperAdmin && (
                                                        <button className="dropdown-item" onClick={() => handleNavigation("/superadmin")}>
                                                            <i className="fa fa-star"></i> Super Admin
                                                        </button>
                                                    )}
                                                    <button className="dropdown-item" onClick={() => handleNavigation("/about")}>
                                                        <i className="fa fa-info-circle"></i> About
                                                    </button>
                                                    <button className="dropdown-item" onClick={() => handleNavigation("/helperpanel")}>
                                                        <i className="fa fa-life-ring"></i> Helper Panel
                                                    </button>
                                                    <div className="dropdown-divider"></div>
                                                    <button className="dropdown-item" onClick={logout}>
                                                        <i className="fa fa-sign-out"></i> Logout
                                                    </button>
                                                </div>
                                            )}
                                        </li>
                                    </>
                                ) : (
                                    <>
                                        <li className="nav-item">
                                            <button
                                                className="btn btn-outline-primary"
                                                onClick={() => handleNavigation("/register")}
                                                style={{
                                                    padding: "8px 20px",
                                                    borderRadius: "8px",
                                                    background: "transparent !important",
                                                    backgroundColor: "transparent !important",
                                                    border: "1px solid #0d6efd"
                                                }}
                                            >
                                                Register
                                            </button>
                                        </li>
                                        <li className="nav-item">
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => handleNavigation("/login")}
                                                style={{ padding: "8px 20px", borderRadius: "8px" }}
                                            >
                                                Login
                                            </button>
                                        </li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </nav>
    );
}

export default Navbar;