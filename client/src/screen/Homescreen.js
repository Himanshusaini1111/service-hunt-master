// Homescreen.js - Fixed version

import React, { useState, useEffect } from "react";
import axios from "axios";
import Loader from "../components/Loader";
import Service from "../components/Service";
import VendorAdded from "../components/VendorAdded";
import Navbar from "../components/Navbar";
import { useNavigate, useLocation } from "react-router-dom";
import { Switch, Button, DatePicker, InputNumber, Modal, Select } from "antd";
import AOS from "aos";
import "aos/dist/aos.css";
import moment from "moment";

AOS.init();

function Homescreen() {
    const [services, setServices] = useState([]);
    const [allServices, setAllServices] = useState([]);
    const [visibleServices, setVisibleServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchKey, setSearchKey] = useState("");
    const [location, setLocation] = useState("");
    const [category, setCategory] = useState("all");
    const [subCategory, setSubCategory] = useState("");
    const [availability, setAvailability] = useState(true);
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [selectedDates, setSelectedDates] = useState([]);
    const [priceRange, setPriceRange] = useState([0, 10000]);
    const [sortOrder, setSortOrder] = useState("default");
    const [vendors, setVendors] = useState([]);
    const [viewMode, setViewMode] = useState("all");
    const [selectedLocationObject, setSelectedLocationObject] = useState(null);
    const [isLocationLoaded, setIsLocationLoaded] = useState(false);

    const navigate = useNavigate();
    const locationState = useLocation();
    const { RangePicker } = DatePicker;

    // Improved location matching function
    const isServiceInLocation = (service, locationValue) => {
        if (!locationValue) return true;
        
        // Get location string from various possible formats
        let locationLower = '';
        if (typeof locationValue === 'string') {
            locationLower = locationValue.toLowerCase();
        } else if (locationValue.display_name) {
            locationLower = locationValue.display_name.toLowerCase();
        } else if (locationValue.city) {
            locationLower = locationValue.city.toLowerCase();
        } else {
            locationLower = String(locationValue).toLowerCase();
        }
        
        // Extract city name from display_name (first part before comma)
        const cityName = locationLower.split(',')[0].trim();
        
        // Check primary location field
        if (service.location) {
            const serviceLocation = service.location.toLowerCase();
            if (serviceLocation.includes(cityName) || 
                cityName.includes(serviceLocation) ||
                serviceLocation.includes(locationLower)) {
                return true;
            }
        }
        
        // Check address
        if (service.address && service.address.toLowerCase().includes(cityName)) {
            return true;
        }
        
        // Check serviceAreas array
        if (service.serviceAreas && Array.isArray(service.serviceAreas)) {
            return service.serviceAreas.some(area => {
                if (!area) return false;
                const areaCity = (area.city || '').toLowerCase();
                const areaState = (area.state || '').toLowerCase();
                const areaDistrict = (area.district || '').toLowerCase();
                const areaPincode = (area.pincode || '').toString();
                
                return areaCity.includes(cityName) ||
                       cityName.includes(areaCity) ||
                       areaState.includes(cityName) ||
                       areaDistrict.includes(cityName) ||
                       areaPincode === locationValue;
            });
        }
        
        // Check serviceLocation object
        if (service.serviceLocation) {
            const locCity = (service.serviceLocation.city || '').toLowerCase();
            const locState = (service.serviceLocation.state || '').toLowerCase();
            const locDistrict = (service.serviceLocation.district || '').toLowerCase();
            
            return locCity.includes(cityName) ||
                   cityName.includes(locCity) ||
                   locState.includes(cityName) ||
                   locDistrict.includes(cityName);
        }
        
        return false;
    };

    // SubCategories mapping
    const subCategories = {
        "Home Maintenance & Repair Services": [
            "Plumbing Services",
            "Electrical Repairs",
            "Carpentry and Woodwork",
            "Painting and Wallpapering",
            "Appliance Repair",
            "Pest Control",
            "Roof Repair",
            "Flooring Repair",
            "HVAC Maintenance",
            "Home Cleaning",
        ],
        "Event & Party Planning Services": [
            "Wedding Planning",
            "Birthday Party Planning",
            "Corporate Event Planning",
            "Catering Service",
            "Decoration",
            "Photography",
            "Entertainment",
            "Venue Booking",
        ],
        "Entertainment & Ticket Booking": [
            "Movie Ticket Booking",
            "Sports Event Tickets",
            "Amusement Park Tickets",
            "Gaming Zone Access",
        ]
    };

    // Load location from localStorage FIRST, before any filtering
    useEffect(() => {
        const loadLocation = () => {
            console.log("Loading location in Homescreen...");
            
            // First priority: Check if location was passed through navigation state
            if (locationState.state?.location) {
                const passedLocation = locationState.state.location;
                console.log("Location from navigation state:", passedLocation);
                setSelectedLocationObject(passedLocation);
                
                // Extract location string for filtering
                let locationValue = '';
                if (typeof passedLocation === 'string') {
                    locationValue = passedLocation;
                } else if (passedLocation.display_name) {
                    locationValue = passedLocation.display_name;
                } else if (passedLocation.city) {
                    locationValue = passedLocation.city;
                } else {
                    locationValue = String(passedLocation);
                }
                setLocation(locationValue);
                setIsLocationLoaded(true);
                return;
            }
            
            // Second priority: Load from localStorage
            const savedLocation = localStorage.getItem("selectedLocation");
            if (savedLocation) {
                try {
                    const location = JSON.parse(savedLocation);
                    console.log("Location from localStorage:", location);
                    setSelectedLocationObject(location);
                    
                    // Extract location string for filtering
                    let locationValue = '';
                    if (typeof location === 'string') {
                        locationValue = location;
                    } else if (location.display_name) {
                        locationValue = location.display_name;
                    } else if (location.city) {
                        locationValue = location.city;
                    } else {
                        locationValue = String(location);
                    }
                    setLocation(locationValue);
                    setIsLocationLoaded(true);
                    return;
                } catch (error) {
                    console.error("Error parsing saved location:", error);
                }
            }
            
            // No location found
            console.log("No location found in localStorage or navigation state");
            setLocation("");
            setSelectedLocationObject(null);
            setIsLocationLoaded(true);
        };
        
        loadLocation();
    }, [locationState.state]);

    // Handle category and subcategory from navigation state AFTER location is loaded
    useEffect(() => {
        if (locationState.state && isLocationLoaded) {
            console.log("Processing navigation state:", locationState.state);
            
            if (locationState.state.subCategory) {
                setSubCategory(locationState.state.subCategory);
                setCategory("all");
                console.log("Set subcategory:", locationState.state.subCategory);
            } else if (locationState.state.category) {
                setCategory(locationState.state.category);
                console.log("Set category:", locationState.state.category);
            }
        }
    }, [locationState.state, isLocationLoaded]);

    // Fetch all services
    useEffect(() => {
        const fetchServices = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get("/api/service/getallservices");
                console.log(`Fetched ${data.length} services from API`);
                setAllServices(data);
                const visibleOnly = data.filter(service => service.isVisible !== false);
                setVisibleServices(visibleOnly);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching services:", error);
                setLoading(false);
            }
        };
        fetchServices();
    }, []);

    // Check if service is available today
    const isServiceAvailableToday = (service) => {
        const today = moment().format("YYYY-MM-DD");
        
        if (!service.unavailableDates || service.unavailableDates.length === 0) {
            return true;
        }
        
        const todayUnavailable = service.unavailableDates.find(d => d.date === today);
        
        if (!todayUnavailable) return true;
        if (todayUnavailable.fullDay) return false;
        
        return true;
    };

    // Check if service is available for selected dates
    const isServiceAvailableForDates = (service, dates) => {
        if (!dates || dates.length === 0) return true;
        
        const startDate = moment(dates[0]);
        const endDate = dates[1] ? moment(dates[1]) : moment(dates[0]);
        
        let currentDate = startDate.clone();
        
        while (currentDate.isSameOrBefore(endDate)) {
            const dateString = currentDate.format("YYYY-MM-DD");
            
            const unavailableDate = service.unavailableDates?.find(d => d.date === dateString);
            
            if (unavailableDate) {
                if (unavailableDate.fullDay) return false;
            }
            
            currentDate.add(1, 'day');
        }
        
        return true;
    };

    // Filtering logic - includes location filter
    useEffect(() => {
        // Wait for location to be loaded before filtering
        if (!isLocationLoaded) return;
        
        if (allServices.length === 0) return;
        
        console.log("Filtering services with location:", location);
        console.log("Location loaded:", isLocationLoaded);
        
        let filtered = [];
        
        // Apply availability filter
        if (availability) {
            filtered = [...visibleServices];
            filtered = filtered.filter(service => isServiceAvailableToday(service));
        } else {
            filtered = [...allServices];
        }
        
        // Apply location filter - CRITICAL FIX
        if (location && location !== "" && location !== "All Locations") {
            const originalCount = filtered.length;
            filtered = filtered.filter(service => isServiceInLocation(service, location));
            console.log(`Location filter: ${originalCount} -> ${filtered.length} services after filtering for "${location}"`);
            
            // Show alert if no services found for location
            if (filtered.length === 0 && originalCount > 0) {
                console.log("No services found for this location");
            }
        } else {
            console.log("No location filter applied");
        }
        
        // Apply category filter
        if (category !== "all") {
            filtered = filtered.filter(s => s.category === category);
            console.log(`Category filter (${category}): ${filtered.length} services`);
        }
        
        // Apply subcategory filter
        if (subCategory) {
            filtered = filtered.filter(s => s.subCategory === subCategory);
            console.log(`Subcategory filter (${subCategory}): ${filtered.length} services`);
        }
        
        // Apply search filter
        if (searchKey) {
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(searchKey.toLowerCase())
            );
        }
        
        // Apply date range filter
        if (selectedDates.length > 0) {
            filtered = filtered.filter(service => 
                isServiceAvailableForDates(service, selectedDates)
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
        
        console.log(`Final filtered services: ${filtered.length}`);
        setServices(filtered);
    }, [category, subCategory, location, searchKey, availability, selectedDates, priceRange, sortOrder, allServices, visibleServices, isLocationLoaded]);

    // Search
    const filterBySearch = (value) => {
        setSearchKey(value);
    };

    // Location search
    const filterByLocation = (e) => {
        setLocation(e.target.value);
    };

    const handleServiceClick = (id) => navigate(`/booking/${id}`);

    // Apply Filters from modal
    const applyFilters = () => {
        setIsFilterModalVisible(false);
    };

    const resetFilters = () => {
        setSelectedDates([]);
        setPriceRange([0, 10000]);
        setSortOrder("default");
        setSearchKey("");
        setSubCategory("");
        setCategory("all");
        
        // Don't reset location when resetting filters - location should persist
        // Only reset location if specifically cleared
    };

    // Clear location filter
    const clearLocationFilter = () => {
        setLocation("");
        setSelectedLocationObject(null);
        // Remove from localStorage as well
        localStorage.removeItem("selectedLocation");
        // Show message
        alert("Location filter cleared. Showing all services.");
    };

    // Get display location name for header
    const getDisplayLocationName = () => {
        if (!location) return "All Locations";
        // If we have the full location object, use its display name
        if (selectedLocationObject) {
            return selectedLocationObject.display_name?.split(',')[0] || 
                   selectedLocationObject.city || 
                   location;
        }
        return location;
    };

    // Show loading while location is being loaded
    if (!isLocationLoaded || (loading && allServices.length === 0)) {
        return (
            <div>
                <Navbar />
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '5px solid #f3f3f3',
                        borderTop: '5px solid #4a54e1',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ marginTop: '20px', color: '#666' }}>Loading services...</p>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-0">
            {/* NAVBAR */}
            <Navbar />

            {/* Location Info Bar - Show selected location */}
           
            {/* Category Header - Show selected category */}
            {category !== "all" && (
                <div style={{
                    backgroundColor: "#f5f5f5",
                    padding: "12px 16px",
                    marginTop: "8px",
                    textAlign: "center",
                    borderBottom: "2px solid #4a54e1"
                }}>
                    <h3 style={{ margin: 0, fontSize: "20px", color: "#333" }}>
                        {category}
                        {subCategory && ` - ${subCategory}`}
                    </h3>
                </div>
            )}

            {/* SUBCATEGORY SCROLL SECTION - Only show when a category is selected */}
            {category !== "all" && subCategories[category] && (
                <div
                    style={{
                        marginTop: "15px",
                        overflowX: "auto",
                        whiteSpace: "nowrap",
                    }}
                    className="hide-scrollbar"
                >
                    <div
                        style={{
                            display: "flex",
                            gap: "10px",
                            padding: "10px",
                            overflowX: "auto",
                            scrollbarWidth: "none",
                            msOverflowStyle: "none",
                        }}
                        className="hide-scrollbar"
                    >
                        <button
                            onClick={() => setSubCategory("")}
                            style={{
                                flexShrink: 0,
                                padding: "6px 12px",
                                borderRadius: "8px",
                                border: "1px solid #ddd",
                                backgroundColor: subCategory === "" ? "#4a54e1" : "#f8f8f8",
                                color: subCategory === "" ? "white" : "#333",
                                cursor: "pointer",
                                fontSize: "14px",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                                transition: "0.2s",
                            }}
                        >
                            All
                        </button>
                        {subCategories[category]?.map((sub, index) => (
                            <button
                                key={index}
                                onClick={() => setSubCategory(sub)}
                                style={{
                                    flexShrink: 0,
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid #ddd",
                                    backgroundColor: subCategory === sub ? "#4a54e1" : "#f8f8f8",
                                    color: subCategory === sub ? "white" : "#333",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                                    transition: "0.2s",
                                }}
                            >
                                {sub}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* TOGGLE + FILTER BUTTON */}
            <div
                style={{
                    marginTop: "15px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0 15px",
                }}
            >
                <Switch
                    checked={availability}
                    onChange={() => setAvailability(!availability)}
                    checkedChildren="Available"
                    unCheckedChildren="All"
                />

                <Button
                    type="primary"
                    onClick={() => setIsFilterModalVisible(true)}
                    style={{
                        backgroundColor: "#4a54e1",
                        borderRadius: "8px",
                        padding: "6px 15px",
                    }}
                >
                    <i className="bi bi-funnel-fill"></i> Filter
                </Button>
            </div>

            {/* SERVICE CARDS */}
            <div className="row justify-content-center mt-3">
                {loading ? (
                    <Loader />
                ) : viewMode === "all" ? (
                    services.length === 0 ? (
                        <div className="col-12 text-center py-5">
                            <i className="bi bi-search display-4 text-muted"></i>
                            <p className="mt-3">No services found matching your criteria</p>
                            <p className="text-muted" style={{ fontSize: "14px" }}>
                                {location ? 
                                    `No services available in ${getDisplayLocationName()}${category !== "all" ? ` for ${category}` : ''}` : 
                                    "Try selecting a location or clearing filters"}
                            </p>
                            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                                <Button 
                                    type="primary" 
                                    onClick={resetFilters}
                                    style={{ backgroundColor: "#4a54e1", borderColor: "#4a54e1" }}
                                >
                                    Reset Filters
                                </Button>
                                {location && (
                                    <Button 
                                        onClick={clearLocationFilter}
                                        style={{ marginLeft: "10px" }}
                                    >
                                        Clear Location
                                    </Button>
                                )}
                                {category !== "all" && (
                                    <Button 
                                        onClick={() => {
                                            setCategory("all");
                                            setSubCategory("");
                                        }}
                                    >
                                        View All Categories
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        services.map((s) => (
                            <div
                                className="col-md-8"
                                data-aos="zoom-in"
                                key={s._id}
                            >
                                <Service service={s} onClick={() => handleServiceClick(s._id)} />
                            </div>
                        ))
                    )
                ) : (
                    vendors.map((v) => (
                        <div className="col-md-8" data-aos="zoom-in" key={v._id}>
                            <VendorAdded vendorAdded={v} />
                        </div>
                    ))
                )}
            </div>

            {/* FILTER MODAL */}
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
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                        <label>Select Date:</label>
                        <RangePicker
                            value={selectedDates}
                            onChange={(d) => setSelectedDates(d)}
                            style={{ width: "100%" }}
                        />
                    </div>

                    <div>
                        <label>Price Range:</label>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <InputNumber
                                min={0}
                                value={priceRange[0]}
                                onChange={(v) => setPriceRange([v, priceRange[1]])}
                                placeholder="Min"
                                style={{ width: "50%" }}
                            />
                            <InputNumber
                                min={priceRange[0]}
                                value={priceRange[1]}
                                onChange={(v) => setPriceRange([priceRange[0], v])}
                                placeholder="Max"
                                style={{ width: "50%" }}
                            />
                        </div>
                    </div>

                    <div>
                        <label>Sort By:</label>
                        <Select
                            value={sortOrder}
                            onChange={(v) => setSortOrder(v)}
                            style={{ width: "100%" }}
                        >
                            <Select.Option value="default">Default</Select.Option>
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