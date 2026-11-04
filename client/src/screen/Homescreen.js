import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import Loader from "../components/Loader";
import Service from "../components/Service";
import Navbar from "../components/Navbar";
import { useNavigate, useLocation } from "react-router-dom";
import { Switch, Button, DatePicker, InputNumber, Modal, Select } from "antd";
import Swal from 'sweetalert2';
import AOS from "aos";
import "aos/dist/aos.css";
import moment from "moment";
import "./Homescreen.css";

// Crisp vector icons
import {
    FaFilter,
    FaMapMarkerAlt,
    FaSearch,
    FaTimes,
    FaUndo,
    FaLayerGroup
} from "react-icons/fa";

AOS.init();

function Homescreen() {
    const [services, setServices] = useState([]);
    const [allServices, setAllServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchKey, setSearchKey] = useState("");
    const [location, setLocation] = useState("");
    const [selectedLocationObject, setSelectedLocationObject] = useState(null);
    const [category, setCategory] = useState("all");
    const [subCategory, setSubCategory] = useState("");
    const [availability, setAvailability] = useState(true);
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [selectedDates, setSelectedDates] = useState([]);
    const [priceRange, setPriceRange] = useState([0, 10000]);
    const [sortOrder, setSortOrder] = useState("default");

    const navigate = useNavigate();
    const locationState = useLocation();
    const { RangePicker } = DatePicker;

    // Check if service is available at location using locationPricing
    const isServiceInLocation = useCallback((service, userLocation) => {
        if (!userLocation) return true;

        if (!service.locationPricing || service.locationPricing.length === 0) {
            return false;
        }

        let userLocationLower = '';
        if (typeof userLocation === 'string') {
            userLocationLower = userLocation.toLowerCase();
        } else if (userLocation.display_name) {
            userLocationLower = userLocation.display_name.toLowerCase();
        } else if (userLocation.city) {
            userLocationLower = userLocation.city.toLowerCase();
        } else {
            userLocationLower = String(userLocation).toLowerCase();
        }

        const userCity = userLocationLower.split(',')[0].trim();

        const isAvailable = service.locationPricing.some(locationPrice => {
            const locationName = (locationPrice.locationName || "").toLowerCase();
            const locationAddress = (locationPrice.locationAddress || "").toLowerCase();

            return locationName.includes(userCity) ||
                userCity.includes(locationName) ||
                locationAddress.includes(userCity) ||
                userCity.includes(locationAddress);
        });

        return isAvailable;
    }, []);

    // Load location from localStorage or navigation state
    useEffect(() => {
        const loadLocation = () => {
            if (locationState.state?.location) {
                const passedLocation = locationState.state.location;
                setSelectedLocationObject(passedLocation);

                let locationValue = '';
                if (typeof passedLocation === 'string') {
                    locationValue = passedLocation;
                } else if (passedLocation.display_name) {
                    locationValue = passedLocation.display_name;
                } else if (passedLocation.city) {
                    locationValue = passedLocation.city;
                }
                setLocation(locationValue);
                return;
            }

            const savedLocation = localStorage.getItem("selectedLocation");
            if (savedLocation) {
                try {
                    const parsedLocation = JSON.parse(savedLocation);
                    setSelectedLocationObject(parsedLocation);

                    let locationValue = '';
                    if (typeof parsedLocation === 'string') {
                        locationValue = parsedLocation;
                    } else if (parsedLocation.display_name) {
                        locationValue = parsedLocation.display_name;
                    } else if (parsedLocation.city) {
                        locationValue = parsedLocation.city;
                    }
                    setLocation(locationValue);
                } catch (error) {
                    console.error("Error parsing saved location:", error);
                }
            }
        };

        loadLocation();
    }, [locationState.state]);

    // Handle category/subcategory from navigation
    useEffect(() => {
        if (locationState.state) {
            if (locationState.state.subCategory) {
                setSubCategory(locationState.state.subCategory);
                setCategory("all");
            } else if (locationState.state.category) {
                setCategory(locationState.state.category);
            }
        }
    }, [locationState.state]);

    // Fetch all services
    useEffect(() => {
        const fetchServices = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get("/api/service/getallservices");
                setAllServices(data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching services:", error);
                setLoading(false);
            }
        };
        fetchServices();
    }, []);

    // Check if service is available today
    const isServiceAvailableToday = useCallback((service) => {
        const today = moment().format("YYYY-MM-DD");
        if (!service.unavailableDates || service.unavailableDates.length === 0) return true;

        const todayUnavailable = service.unavailableDates.find(d => d.date === today);
        if (!todayUnavailable) return true;
        if (todayUnavailable.fullDay) return false;
        return true;
    }, []);

    // Filter services based on all criteria
    useEffect(() => {
        if (allServices.length === 0) return;

        let filtered = [...allServices];

        // Show only visible services
        filtered = filtered.filter(service => service.isVisible !== false);

        // Apply location filter using locationPricing
        if (location && location !== "") {
            filtered = filtered.filter(service => isServiceInLocation(service, location));
        }

        // Apply availability filter
        if (availability) {
            filtered = filtered.filter(service => isServiceAvailableToday(service));
        }

        // Apply category filter
        if (category !== "all") {
            filtered = filtered.filter(s => s.category === category);
        }

        // Apply subcategory filter
        if (subCategory) {
            filtered = filtered.filter(s => s.subCategory === subCategory);
        }

        // Apply search filter
        if (searchKey) {
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(searchKey.toLowerCase())
            );
        }

        // Apply price range filter
        filtered = filtered.filter(
            s => s.rentperday >= priceRange[0] && s.rentperday <= priceRange[1]
        );

        // Apply sorting
        if (sortOrder === "priceAsc") {
            filtered.sort((a, b) => a.rentperday - b.rentperday);
        } else if (sortOrder === "priceDesc") {
            filtered.sort((a, b) => b.rentperday - a.rentperday);
        }

        setServices(filtered);
    }, [allServices, location, category, subCategory, searchKey, availability, priceRange, sortOrder, isServiceInLocation, isServiceAvailableToday]);

    // Dynamic list of categories for the top pill strip
    const availableCategories = useMemo(() => {
        const set = new Set();
        allServices.forEach(s => {
            if (s.isVisible !== false && s.category) set.add(s.category);
        });
        return ["all", ...Array.from(set)];
    }, [allServices]);

    const handleServiceClick = (id) => navigate(`/booking/${id}`);

    const applyFilters = () => setIsFilterModalVisible(false);

    const resetFilters = () => {
        setSelectedDates([]);
        setPriceRange([0, 10000]);
        setSortOrder("default");
        setSearchKey("");
        setSubCategory("");
        setCategory("all");
    };

    const clearLocationFilter = () => {
        setLocation("");
        setSelectedLocationObject(null);
        localStorage.removeItem("selectedLocation");
        Swal.fire("Info", "Location filter cleared. Showing all services.", "info");
    };

    const handleLocationSelect = (loc) => {
        setSelectedLocationObject(loc);
        if (loc) {
            const locVal = typeof loc === 'string' ? loc : (loc.display_name || loc.city || '');
            setLocation(locVal);
        } else {
            setLocation("");
        }
    };

    if (loading) {
        return (
            <div className="hs-page">
                <Navbar
                    onLocationSelect={handleLocationSelect}
                    selectedLocation={selectedLocationObject}
                    searchService={(key) => setSearchKey(key)}
                />
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '80vh',
                    flexDirection: 'column'
                }}>
                    <Loader />
                </div>
            </div>
        );
    }

    const currentCityName = location ? location.split(',')[0].trim() : null;

    return (
        <div className="hs-page">
            <Navbar
                onLocationSelect={handleLocationSelect}
                selectedLocation={selectedLocationObject}
                searchService={(key) => setSearchKey(key)}
            />

            {/* Hero Header Strip */}
            <div className="hs-header-strip">
                <div className="hs-header-inner">
                    <div className="hs-header-text">
                        <h1>
                            {category !== "all" ? category : (currentCityName ? `Services in ${currentCityName}` : "Explore Local Services")}
                            {subCategory && ` — ${subCategory}`}
                        </h1>
                        <p>
                            Connect with verified local professionals and book with instant confirmation
                        </p>
                    </div>

                    {currentCityName && (
                        <div className="hs-header-location-pill">
                            <FaMapMarkerAlt style={{ color: "#a5b4fc" }} />
                            <span>{currentCityName}</span>
                            <button
                                type="button"
                                className="clear-btn"
                                onClick={clearLocationFilter}
                                title="Clear location filter"
                                aria-label="Clear location filter"
                            >
                                <FaTimes />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Horizontal Category Nav Strip */}
            <div className="hs-cat-nav-wrapper">
                <div className="hs-cat-nav-container">
                    <button
                        type="button"
                        className={`hs-cat-pill ${category === "all" && !subCategory ? "active" : ""}`}
                        onClick={() => {
                            setCategory("all");
                            setSubCategory("");
                        }}
                    >
                        <FaLayerGroup style={{ fontSize: "0.75rem" }} />
                        <span>All Categories</span>
                    </button>

                    {availableCategories.filter(c => c !== "all").map((catName) => (
                        <button
                            key={catName}
                            type="button"
                            className={`hs-cat-pill ${category === catName ? "active" : ""}`}
                            onClick={() => {
                                setCategory(catName);
                                setSubCategory("");
                            }}
                        >
                            <span>{catName}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Marketplace Two-Column Layout */}
            <div className="hs-main-layout">
                {/* Desktop Filter Sidebar */}
                <aside className="hs-sidebar">
                    <div className="hs-sidebar-title">
                        <span>Filters</span>
                        <button
                            type="button"
                            className="hs-sidebar-reset-link"
                            onClick={resetFilters}
                        >
                            Reset all
                        </button>
                    </div>

                    {/* Search inside results */}
                    <div className="hs-filter-group">
                        <label className="hs-filter-label">Search</label>
                        <div className="hs-search-box">
                            <FaSearch className="hs-search-icon" />
                            <input
                                type="text"
                                className="hs-search-input"
                                placeholder="Service name..."
                                value={searchKey}
                                onChange={(e) => setSearchKey(e.target.value)}
                            />
                            {searchKey && (
                                <button
                                    type="button"
                                    className="hs-search-clear"
                                    onClick={() => setSearchKey("")}
                                    aria-label="Clear search"
                                >
                                    <FaTimes />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Availability toggle */}
                    <div className="hs-filter-group">
                        <div className="hs-sidebar-switch-row">
                            <span className="hs-sidebar-switch-label">Available Today</span>
                            <Switch
                                checked={availability}
                                onChange={(checked) => setAvailability(checked)}
                                size="small"
                            />
                        </div>
                    </div>

                    {/* Price Range */}
                    <div className="hs-filter-group">
                        <label className="hs-filter-label">Price Range (₹)</label>
                        <div className="hs-price-inputs-row">
                            <InputNumber
                                min={0}
                                value={priceRange[0]}
                                onChange={(v) => setPriceRange([v || 0, priceRange[1]])}
                                placeholder="Min"
                                style={{ width: "50%", borderRadius: "10px" }}
                            />
                            <InputNumber
                                min={priceRange[0]}
                                value={priceRange[1]}
                                onChange={(v) => setPriceRange([priceRange[0], v || 10000])}
                                placeholder="Max"
                                style={{ width: "50%", borderRadius: "10px" }}
                            />
                        </div>
                    </div>

                    {/* Sort Order */}
                    <div className="hs-filter-group" style={{ marginBottom: 0 }}>
                        <label className="hs-filter-label">Sort By</label>
                        <Select
                            value={sortOrder}
                            onChange={(v) => setSortOrder(v)}
                            style={{ width: "100%" }}
                        >
                            <Select.Option value="default">Recommended</Select.Option>
                            <Select.Option value="priceAsc">Price: Low to High</Select.Option>
                            <Select.Option value="priceDesc">Price: High to Low</Select.Option>
                        </Select>
                    </div>
                </aside>

                {/* Right Content Area */}
                <main className="hs-content-area">
                    {/* Toolbar / Result stats */}
                    <div className="hs-content-header">
                        <div className="hs-results-heading">
                            <h2>
                                {category !== "all" ? category : "All Services"}
                            </h2>
                            <span className="hs-results-tag-count">
                                {services.length} {services.length === 1 ? 'service' : 'services'}
                            </span>
                        </div>

                        {/* Mobile Filter Trigger Button */}
                        <button
                            type="button"
                            className="hs-mobile-filter-trigger"
                            onClick={() => setIsFilterModalVisible(true)}
                        >
                            <FaFilter style={{ fontSize: "0.8rem", color: "#4f46e5" }} />
                            <span>Filters & Sort</span>
                        </button>
                    </div>

                    {/* Active filter badges */}
                    {(category !== "all" || subCategory || searchKey || location || priceRange[0] > 0 || priceRange[1] < 10000) && (
                        <div className="hs-active-filter-chips">
                            {category !== "all" && (
                                <span className="hs-chip">
                                    Category: {category}
                                    <FaTimes className="hs-chip-clear" onClick={() => setCategory("all")} />
                                </span>
                            )}
                            {subCategory && (
                                <span className="hs-chip">
                                    Subcategory: {subCategory}
                                    <FaTimes className="hs-chip-clear" onClick={() => setSubCategory("")} />
                                </span>
                            )}
                            {searchKey && (
                                <span className="hs-chip">
                                    Search: "{searchKey}"
                                    <FaTimes className="hs-chip-clear" onClick={() => setSearchKey("")} />
                                </span>
                            )}
                            {location && (
                                <span className="hs-chip">
                                    Location: {location.split(',')[0]}
                                    <FaTimes className="hs-chip-clear" onClick={clearLocationFilter} />
                                </span>
                            )}
                            {(priceRange[0] > 0 || priceRange[1] < 10000) && (
                                <span className="hs-chip">
                                    ₹{priceRange[0]} - ₹{priceRange[1]}
                                    <FaTimes className="hs-chip-clear" onClick={() => setPriceRange([0, 10000])} />
                                </span>
                            )}
                        </div>
                    )}

                    {/* Service Cards Stream */}
                    {services.length === 0 ? (
                        <div className="hs-empty-box">
                            <div className="hs-empty-icon-wrap">
                                <FaSearch />
                            </div>
                            <h3>No Matching Services</h3>
                            <p>
                                {location ?
                                    `We couldn't find any services matching your criteria in ${location.split(',')[0]}. Try adjusting your filters or search terms.` :
                                    "No services match your active filters. Try clearing your search keyword or resetting filters."}
                            </p>
                            <div className="hs-empty-btn-group">
                                <button
                                    type="button"
                                    className="hs-reset-btn"
                                    onClick={resetFilters}
                                >
                                    <FaUndo style={{ fontSize: "0.75rem", marginRight: "6px" }} />
                                    <span>Reset All Filters</span>
                                </button>
                                {location && (
                                    <button
                                        type="button"
                                        className="hs-clear-loc-btn"
                                        onClick={clearLocationFilter}
                                    >
                                        <span>Clear Location</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="hs-services-stream">
                            {services.map((s) => (
                                <div data-aos="fade-up" key={s._id}>
                                    <Service
                                        service={s}
                                        onClick={() => handleServiceClick(s._id)}
                                        bookingArea={selectedLocationObject}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Mobile Filter Modal */}
            <Modal
                title="Filter Services"
                open={isFilterModalVisible}
                onOk={applyFilters}
                onCancel={() => setIsFilterModalVisible(false)}
                footer={[
                    <Button key="reset" onClick={resetFilters}>Reset</Button>,
                    <Button key="apply" type="primary" onClick={applyFilters}>Apply</Button>,
                ]}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                    <div>
                        <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Select Date Range:</label>
                        <RangePicker
                            value={selectedDates}
                            onChange={(d) => setSelectedDates(d)}
                            style={{ width: "100%" }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Availability:</label>
                        <Switch
                            checked={availability}
                            onChange={(checked) => setAvailability(checked)}
                            checkedChildren="Available Today"
                            unCheckedChildren="All Services"
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Price Range (₹):</label>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <InputNumber
                                min={0}
                                value={priceRange[0]}
                                onChange={(v) => setPriceRange([v || 0, priceRange[1]])}
                                placeholder="Min"
                                style={{ width: "50%" }}
                            />
                            <InputNumber
                                min={priceRange[0]}
                                value={priceRange[1]}
                                onChange={(v) => setPriceRange([priceRange[0], v || 10000])}
                                placeholder="Max"
                                style={{ width: "50%" }}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Sort By:</label>
                        <Select
                            value={sortOrder}
                            onChange={(v) => setSortOrder(v)}
                            style={{ width: "100%" }}
                        >
                            <Select.Option value="default">Recommended</Select.Option>
                            <Select.Option value="priceAsc">Price: Low to High</Select.Option>
                            <Select.Option value="priceDesc">Price: High to Low</Select.Option>
                        </Select>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default Homescreen;
