import React, { useState, useEffect } from "react";
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

    // ✅ CORRECT - Check if service is available at location using locationPricing
    const isServiceInLocation = (service, userLocation) => {
        if (!userLocation) return true;
        
        // If service has no location pricing configured, it's not available anywhere
        if (!service.locationPricing || service.locationPricing.length === 0) {
            return false;
        }
        
        // Get user's location string
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
        
        // Extract city name (first part before comma)
        const userCity = userLocationLower.split(',')[0].trim();
        
        // Check if service's locationPricing includes this location
        const isAvailable = service.locationPricing.some(locationPrice => {
            const locationName = (locationPrice.locationName || "").toLowerCase();
            const locationAddress = (locationPrice.locationAddress || "").toLowerCase();
            
            return locationName.includes(userCity) || 
                   userCity.includes(locationName) ||
                   locationAddress.includes(userCity) ||
                   userCity.includes(locationAddress);
        });
        
        return isAvailable;
    };

    // Load location from localStorage or navigation state
    useEffect(() => {
        const loadLocation = () => {
            console.log("Loading location in Homescreen...");
            
            // Check navigation state first
            if (locationState.state?.location) {
                const passedLocation = locationState.state.location;
                console.log("Location from navigation state:", passedLocation);
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
            
            // Check localStorage
            const savedLocation = localStorage.getItem("selectedLocation");
            if (savedLocation) {
                try {
                    const location = JSON.parse(savedLocation);
                    console.log("Location from localStorage:", location);
                    setSelectedLocationObject(location);
                    
                    let locationValue = '';
                    if (typeof location === 'string') {
                        locationValue = location;
                    } else if (location.display_name) {
                        locationValue = location.display_name;
                    } else if (location.city) {
                        locationValue = location.city;
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
                console.log(`Fetched ${data.length} services from API`);
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
    const isServiceAvailableToday = (service) => {
        const today = moment().format("YYYY-MM-DD");
        if (!service.unavailableDates || service.unavailableDates.length === 0) return true;
        
        const todayUnavailable = service.unavailableDates.find(d => d.date === today);
        if (!todayUnavailable) return true;
        if (todayUnavailable.fullDay) return false;
        return true;
    };

    // Filter services based on all criteria
    useEffect(() => {
        if (allServices.length === 0) return;
        
        console.log("Filtering services...");
        console.log("Current location filter:", location);
        console.log("Total services:", allServices.length);
        
        let filtered = [...allServices];
        
        // Show only visible services
        filtered = filtered.filter(service => service.isVisible !== false);
        
        // Apply location filter using locationPricing
        if (location && location !== "") {
            const beforeCount = filtered.length;
            filtered = filtered.filter(service => isServiceInLocation(service, location));
            console.log(`Location filter: ${beforeCount} -> ${filtered.length} services for "${location}"`);
            
            if (filtered.length > 0) {
                console.log("Services found:", filtered.map(s => ({ 
                    name: s.name, 
                    availableLocations: s.locationPricing?.map(lp => lp.locationName) 
                })));
            }
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
        
        console.log(`Final filtered services: ${filtered.length}`);
        setServices(filtered);
    }, [allServices, location, category, subCategory, searchKey, availability, priceRange, sortOrder]);

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

    if (loading) {
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
                    <Loader />
                </div>
            </div>
        );
    }

    return (
        <div className="mt-0">
            <Navbar />
            
            {/* Category Header */}
            {category !== "all" && (
                <div style={{
                    backgroundColor: "#f5f5f5",
                    padding: "12px 16px",
                    textAlign: "center",
                    borderBottom: "2px solid #4a54e1"
                }}>
                    <h3 style={{ margin: 0, fontSize: "20px", color: "#333" }}>
                        {category}
                        {subCategory && ` - ${subCategory}`}
                    </h3>
                </div>
            )}

            {/* Filter Controls */}
            <div style={{
                marginTop: "15px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0 15px",
            }}>
                <Switch
                    checked={availability}
                    onChange={() => setAvailability(!availability)}
                    checkedChildren="Available Today"
                    unCheckedChildren="All Services"
                />
                <Button
                    type="primary"
                    onClick={() => setIsFilterModalVisible(true)}
                    style={{ backgroundColor: "#4a54e1", borderRadius: "8px" }}
                >
                    <i className="bi bi-funnel-fill"></i> Filter
                </Button>
            </div>

            {/* Service Cards */}
            <div className="row justify-content-center mt-3">
                {services.length === 0 ? (
                    <div className="col-12 text-center py-5">
                        <i className="bi bi-search display-4 text-muted"></i>
                        <p className="mt-3">No services found matching your criteria</p>
                        <p className="text-muted" style={{ fontSize: "14px" }}>
                            {location ? 
                                `No services available in ${location.split(',')[0]}` : 
                                "Try selecting a location or clearing filters"}
                        </p>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                            <Button type="primary" onClick={resetFilters}>
                                Reset Filters
                            </Button>
                            {location && (
                                <Button onClick={clearLocationFilter}>
                                    Clear Location
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    services.map((s) => (
                        <div className="col-md-8" data-aos="zoom-in" key={s._id}>
                            <Service
                                service={s}
                                onClick={() => handleServiceClick(s._id)}
                                bookingArea={selectedLocationObject}
                            />
                        </div>
                    ))
                )}
            </div>

            {/* Filter Modal */}
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
                        <label>Select Date Range:</label>
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