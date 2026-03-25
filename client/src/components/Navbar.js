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

    // Load saved location from localStorage on component mount
    useEffect(() => {
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
    }, [onLocationSelect]);

    // Listen for location selection from other components
    useEffect(() => {
        const handleStorageChange = () => {
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
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [onLocationSelect]);

    function logout() {
        localStorage.removeItem("currentUser");
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
        console.log("Location selected in Navbar:", location);
        
        if (location) {
            // Save location to localStorage
            localStorage.setItem("selectedLocation", JSON.stringify(location));
            setCurrentLocation(location);
            if (onLocationSelect) {
                onLocationSelect(location);
            }
        } else {
            // Clear location from localStorage
            localStorage.removeItem("selectedLocation");
            setCurrentLocation(null);
            if (onLocationSelect) {
                onLocationSelect(null);
            }
        }
        setShowLocationSearch(false);
        
        // Close mobile menu if open
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
        setShowLocationSearch(!showLocationSearch);
        setIsDropdownOpen(false);
    };

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close mobile menu when clicking outside
            if (menuRef.current && !menuRef.current.contains(event.target) && 
                !event.target.closest('.navbar-toggler')) {
                setIsMenuOpen(false);
            }
            
            // Close dropdown when clicking outside
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            
            // Close location search when clicking outside
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
    
    // Super Admin only for specific email
    const isSuperAdmin = user?.email === 'himanshufa875@gmail.com' && 
                         (user?.role === 'superadmin' || user?.isAdmin);

    const handleNavigation = (path) => {
        navigate(path);
        setIsMenuOpen(false);
        setIsDropdownOpen(false);
        setShowLocationSearch(false);
    };

    // Get display location name
    const getDisplayLocationName = () => {
        if (!currentLocation) return "Select Location";
        return currentLocation.display_name?.split(',')[0] || 
               currentLocation.city || 
               currentLocation.name || 
               "Location";
    };

    return (
        <nav className="navbar navbar-expand-lg custom-navbar" style={{ backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div className="container-fluid">
                {/* Brand Section */}
                <div className="navbar-brand-section">
                    <a className="navbar-brand" href="/home" onClick={(e) => {
                        e.preventDefault();
                        handleNavigation('/home');
                    }}>
                        <h5 className="app-title" style={{ margin: 0, color: '#4a54e1', fontWeight: 'bold' }}>Smart Seva</h5>
                    </a>
                    <button
                        className="navbar-toggler custom-toggler"
                        type="button"
                        onClick={toggleMenu}
                        aria-controls="navbarNav"
                        aria-expanded={isMenuOpen}
                        aria-label="Toggle navigation"
                        style={{ border: 'none', background: 'transparent', fontSize: '24px' }}
                    >
                        <i className="fa fa-bars"></i>
                    </button>
                </div>

                {/* Navigation Links */}
                <div 
                    ref={menuRef}
                    className={`navbar-collapse ${isMenuOpen ? 'show' : ''}`} 
                    id="navbarNav"
                    style={{
                        ...(isMobile && isMenuOpen ? {
                            position: 'fixed',
                            top: '60px',
                            left: 0,
                            right: 0,
                            background: 'white',
                            padding: '20px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            zIndex: 1000,
                            maxHeight: 'calc(100vh - 60px)',
                            overflowY: 'auto'
                        } : {})
                    }}
                >
                    <ul className="navbar-nav" style={{ width: '100%' }}>
                        {user ? (
                            <>
                                {/* Location Search Button - Always visible */}
                                <li className="nav-item location-search-btn-container" ref={locationSearchRef} style={{ width: '100%', marginBottom: isMobile ? '10px' : 0 }}>
                                    <div className="location-search-wrapper" style={{ width: "100%" }}>
                                        <button
                                            className="location-toggle-btn"
                                            onClick={toggleLocationSearch}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "8px",
                                                width: "100%",
                                                padding: isMobile ? "12px 16px" : "8px 16px",
                                                backgroundColor: currentLocation ? "#4a54e1" : "#f0f0f0",
                                                border: "none",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                transition: "all 0.3s ease",
                                                color: currentLocation ? "white" : "#333",
                                                fontSize: isMobile ? "14px" : "14px",
                                                fontWeight: "500"
                                            }}
                                        >
                                            <i className="fa fa-map-marker" style={{ fontSize: isMobile ? "14px" : "14px" }}></i>
                                            <span>
                                                {getDisplayLocationName()}
                                            </span>
                                            <i className={`fa fa-chevron-${showLocationSearch ? 'up' : 'down'}`} style={{ fontSize: "10px" }}></i>
                                        </button>
                                        
                                        {/* Location Search Modal/Dropdown - Responsive */}
                                        {showLocationSearch && (
                                            <div 
                                                className="location-search-dropdown"
                                                style={{
                                                    position: isMobile ? "fixed" : "absolute",
                                                    top: isMobile ? "50%" : "100%",
                                                    left: isMobile ? "50%" : "auto",
                                                    right: isMobile ? "auto" : "0",
                                                    transform: isMobile ? "translate(-50%, -50%)" : "none",
                                                    marginTop: isMobile ? "0" : "8px",
                                                    width: isMobile ? "90%" : "320px",
                                                    maxWidth: "400px",
                                                    zIndex: 9999,
                                                    textAlign: "right",
                                                    backgroundColor: "white",
                                                    borderRadius: "16px",
                                                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                                                    padding: "20px"
                                                }}
                                            >
                                                <div style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    marginBottom: "15px"
                                                }}>
                                                    <h4 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>
                                                        Select Location
                                                    </h4>
                                                    <button
                                                        onClick={() => setShowLocationSearch(false)}
                                                        style={{
                                                            background: "none",
                                                            border: "none",
                                                            fontSize: "24px",
                                                            cursor: "pointer",
                                                            color: "#666"
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                                <LocationSearch 
                                                    onLocationSelect={handleLocationSelect}
                                                    placeholder="Search for city, area."
                                                />
                                                {currentLocation && (
                                                    <button
                                                        onClick={() => {
                                                            handleLocationSelect(null);
                                                        }}
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
                                </li>

                                {/* User Menu */}
                                <li className="nav-item dropdown user-menu" ref={dropdownRef} style={{ width: '100%' }}>
                                    <div className="user-dropdown" style={{ width: '100%' }}>
                                        <button
                                            className="user-toggle"
                                            type="button"
                                            onClick={toggleDropdown}
                                            aria-expanded={isDropdownOpen}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "8px",
                                                width: "100%",
                                                padding: isMobile ? "12px 16px" : "8px 12px",
                                                backgroundColor: "#f0f0f0",
                                                border: "none",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                marginTop: isMobile ? "0" : "0"
                                            }}
                                        >
                                            <i className="fa fa-user"></i>
                                            <span className="user-name" style={{ fontSize: "14px" }}>
                                                {user.name?.split(' ')[0]}
                                            </span>
                                            <span className="user-initials" style={{ 
                                                textAlign: "center",
                                                width: "30px",
                                                height: "30px",
                                                borderRadius: "50%",
                                                backgroundColor: "#4a54e1",
                                                color: "white",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "12px"
                                            }}> 
                                                {user.name?.charAt(0).toUpperCase()}
                                            </span>
                                        </button>
                                        <div className={`dropdown-menu ${isDropdownOpen ? 'show' : ''}`} style={{
                                            ...(isMobile && isDropdownOpen ? {
                                                position: 'static',
                                                width: '100%',
                                                marginTop: '10px',
                                                boxShadow: 'none',
                                                border: '1px solid #e0e0e0'
                                            } : {})
                                        }}>
                                            <button className="dropdown-item" onClick={() => handleNavigation("/profile")}>
                                                <i className="fa fa-user-o"></i> Profile
                                            </button>
                                            <button className="dropdown-item" onClick={() => handleNavigation("/myorders")}>
                                                <i className="fa fa-gavel"></i> Orders
                                            </button>
                                            <button className="dropdown-item" onClick={() => handleNavigation("/form")}>
                                                <i className="fa fa-handshake-o"></i> Partner
                                            </button>
                                            
                                            {/* Vendor Dashboard */}
                                            {isVendor && (
                                                <button className="dropdown-item" onClick={() => handleNavigation("/vendor-dashboard")}>
                                                    <i className="fa fa-dashboard"></i> Vendor Dashboard
                                                </button>
                                            )}
                                            
                                            {/* Admin Panel */}
                                            {isAdmin && !isVendor && (
                                                <button className="dropdown-item" onClick={() => handleNavigation("/adminscreen")}>
                                                    <i className="fa fa-shield"></i> Admin Panel
                                                </button>
                                            )}
                                            
                                            {/* Super Admin - Only for specific email */}
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
                                    </div>
                                </li>
                            </>
                        ) : (
                            /* Guest User Links */
                            <>
                                <li className="nav-item" style={{ width: '100%', marginBottom: '10px' }}>
                                    <button 
                                        className="nav-link btn-register"
                                        onClick={() => handleNavigation("/register")}
                                        style={{color:"black", width: "100%", textAlign: "center", padding: "10px"}}
                                    >
                                        Register
                                    </button>
                                </li>
                                <li className="nav-item" style={{ width: '100%' }}>
                                    <button 
                                        className="nav-link btn-login"
                                        onClick={() => handleNavigation("/login")}
                                        style={{width: "100%", textAlign: "center", padding: "10px"}}
                                    >
                                        Login
                                    </button>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;