import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import About from '../components/About';
import Service from '../components/Service';
import LocationSearch from '../components/LocationSearch';
import SearchResults from '../components/SearchResults';
import { Switch, Button, Modal, DatePicker, InputNumber, Select } from 'antd';
import moment from 'moment';
import 'antd/dist/reset.css';

const App = () => {
    const images = [
        "https://th.bing.com/th/id/OIP.yn6JD0Y-ZbvHNU3gj3gauwHaHa?w=1210&h=1210&rs=1&pid=ImgDetMain",
        "https://th.bing.com/th/id/OIP.yELYmy4neggRJg7LrnCmagHaFS?w=1280&h=914&rs=1&pid=ImgDetMain",
        "https://thumbs.dreamstime.com/z/great-customer-service-words-white-concept-exciting-experience-customers-45526322.jpg"
    ];

    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
    const [allServices, setAllServices] = useState([]);
    const [locationBasedServices, setLocationBasedServices] = useState([]);
    const [filteredServices, setFilteredServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestedServiceIndex, setSuggestedServiceIndex] = useState(0);
    const [locationSearch, setLocationSearch] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [hasLocation, setHasLocation] = useState(false);
    
    // Filter states
    const [availability, setAvailability] = useState(true);
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [selectedDates, setSelectedDates] = useState([]);
    const [priceRange, setPriceRange] = useState([0, 10000]);
    const [sortOrder, setSortOrder] = useState("default");
    const [searchResults, setSearchResults] = useState([]); // Store original search results
    const { RangePicker } = DatePicker;

    const navigate = useNavigate();
    const location = useLocation();
    const isNavigatingFromSearch = useRef(false);

    // ✅ CORRECT - Check if service is available at a location using locationPricing
    const isServiceInLocation = useCallback((service, location) => {
        if (!location) return true;

        if (!service.locationPricing || service.locationPricing.length === 0) {
            return false;
        }

        let userLocationLower = '';
        if (typeof location === 'string') {
            userLocationLower = location.toLowerCase();
        } else if (location.display_name) {
            userLocationLower = location.display_name.toLowerCase();
        } else if (location.city) {
            userLocationLower = location.city.toLowerCase();
        } else if (location.name) {
            userLocationLower = location.name.toLowerCase();
        } else {
            userLocationLower = String(location).toLowerCase();
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

    // Check if service is available today
    const isServiceAvailableToday = useCallback((service) => {
        const today = moment().format("YYYY-MM-DD");
        if (!service.unavailableDates || service.unavailableDates.length === 0) return true;
        
        const todayUnavailable = service.unavailableDates.find(d => d.date === today);
        if (!todayUnavailable) return true;
        if (todayUnavailable.fullDay) return false;
        return true;
    }, []);

    // Get location-based services
    const getLocationBasedServices = useCallback((location, services) => {
        if (!location) return [];
        const filtered = services.filter(service => isServiceInLocation(service, location));
        console.log(`Filtered ${filtered.length} services from ${services.length} for location:`, location);
        return filtered;
    }, [isServiceInLocation]);

    // Apply filters to search results
    const applyFiltersToResults = useCallback((results) => {
        let filtered = [...results];
        
        // Apply availability filter
        if (availability) {
            filtered = filtered.filter(service => isServiceAvailableToday(service));
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
        
        return filtered;
    }, [availability, priceRange, sortOrder, isServiceAvailableToday]);

    // Update filtered services when filters change (only in search results mode)
    useEffect(() => {
        if (showSearchResults && searchResults.length > 0) {
            const filtered = applyFiltersToResults(searchResults);
            setFilteredServices(filtered);
        }
    }, [availability, priceRange, sortOrder, showSearchResults, searchResults, applyFiltersToResults]);

    // Update location-based services when location or allServices changes
    useEffect(() => {
        if (allServices.length > 0) {
            if (selectedLocation) {
                const filtered = getLocationBasedServices(selectedLocation, allServices);
                setLocationBasedServices(filtered);
                if (!showSearchResults) {
                    setFilteredServices(filtered);
                }
                setHasLocation(true);
                console.log(`Location selected: ${selectedLocation.display_name || selectedLocation.city}, Found ${filtered.length} services`);
            } else {
                setLocationBasedServices([]);
                setFilteredServices([]);
                setHasLocation(false);
            }
            setLoading(false);
        }
    }, [allServices, selectedLocation, getLocationBasedServices, showSearchResults]);

    // Get suggested services (first 10)
    const getSuggestedServices = () => {
        if (locationBasedServices.length === 0) return [];
        const startIndex = suggestedServiceIndex;
        const endIndex = Math.min(startIndex + 10, locationBasedServices.length);
        return locationBasedServices.slice(startIndex, endIndex);
    };

    // Get rotating services (4 services that rotate)
    const getRotatingServices = () => {
        if (locationBasedServices.length === 0) return [];
        const startIndex = currentServiceIndex;
        const endIndex = Math.min(startIndex + 4, locationBasedServices.length);
        return locationBasedServices.slice(startIndex, endIndex);
    };

    // Update rotating services interval
    useEffect(() => {
        if (locationBasedServices.length === 0) return;

        const interval = setInterval(() => {
            setCurrentServiceIndex(prev => (prev + 4) % locationBasedServices.length);
        }, 10000);
        return () => clearInterval(interval);
    }, [locationBasedServices.length]);

    // Update suggested services interval
    useEffect(() => {
        if (locationBasedServices.length === 0) return;

        const interval = setInterval(() => {
            setSuggestedServiceIndex(prev => (prev + 4) % locationBasedServices.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [locationBasedServices.length]);

    // Fetch all services from backend and load saved location
    useEffect(() => {
        const fetchServicesAndLoadLocation = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/service/getallservices');
                const validatedData = data.map(service => ({
                    ...service,
                    location: service.location || 'Location not specified'
                }));
                setAllServices(validatedData);
                console.log(`Loaded ${validatedData.length} services`);

                const savedLocation = localStorage.getItem("selectedLocation");
                if (savedLocation) {
                    try {
                        const location = JSON.parse(savedLocation);
                        setSelectedLocation(location);
                        console.log("Loaded saved location:", location);
                    } catch (error) {
                        console.error("Error parsing saved location:", error);
                        setSelectedLocation(null);
                    }
                }
            } catch (error) {
                console.error('Error fetching services:', error);
                setAllServices([]);
                setLoading(false);
            }
        };

        fetchServicesAndLoadLocation();
    }, []);

    // Handle location selection from navbar
    const handleLocationSelect = useCallback((location) => {
        console.log("Location selected in App:", location);
        setSelectedLocation(location);

        if (location) {
            localStorage.setItem("selectedLocation", JSON.stringify(location));
            setHasLocation(true);
            setShowSearchResults(false);
            setSearchTerm('');
            setLocationSearch('');
            setSearchResults([]);
            // Reset filters
            setAvailability(true);
            setPriceRange([0, 10000]);
            setSortOrder("default");
        } else {
            localStorage.removeItem("selectedLocation");
            setHasLocation(false);
            setShowSearchResults(false);
            setSearchTerm('');
            setLocationSearch('');
            setSearchResults([]);
        }
    }, []);

    // Handle search from hero section
    const handleSearch = () => {
        console.log("Search triggered, hasLocation:", hasLocation);
        
        if (!hasLocation) {
            alert("Please select a location first");
            return;
        }
        
        if (!searchTerm.trim() && !locationSearch.trim()) {
            alert("Please enter service name or location to search");
            return;
        }
        
        let results = [...locationBasedServices];
        
        if (searchTerm.trim()) {
            const searchTermLower = searchTerm.trim().toLowerCase();
            results = results.filter(service =>
                (service.name && service.name.toLowerCase().includes(searchTermLower)) ||
                (service.category && service.category.toLowerCase().includes(searchTermLower)) ||
                (service.subCategory && service.subCategory.toLowerCase().includes(searchTermLower)) ||
                (service.description && service.description.toLowerCase().includes(searchTermLower))
            );
        }
        
        if (locationSearch.trim()) {
            results = results.filter(service => isServiceInLocation(service, locationSearch.trim()));
        }
        
        console.log(`Search results: ${results.length} services found`);
        
        // Store original search results
        setSearchResults(results);
        
        // Apply filters to results
        const filtered = applyFiltersToResults(results);
        setFilteredServices(filtered);
        setShowSearchResults(true);
        
        // Push state to history for back button handling
        if (!showSearchResults) {
            window.history.pushState({ searchActive: true }, '', window.location.href);
        }
    };

    // Filter by search term only (for navbar search)
    const filterBySearch = (term) => {
        console.log("Navbar search triggered, hasLocation:", hasLocation);
        
        if (!hasLocation) {
            alert("Please select a location first");
            return;
        }
        
        if (!term || term.trim() === "") {
            setFilteredServices(locationBasedServices);
            setShowSearchResults(false);
            setSearchResults([]);
            return;
        }
        
        const searchTermLower = term.toLowerCase();
        const results = locationBasedServices.filter(service =>
            (service.name && service.name.toLowerCase().includes(searchTermLower)) ||
            (service.category && service.category.toLowerCase().includes(searchTermLower)) ||
            (service.subCategory && service.subCategory.toLowerCase().includes(searchTermLower)) ||
            (service.description && service.description.toLowerCase().includes(searchTermLower))
        );
        
        console.log(`Search results: ${results.length} services found for term: ${term}`);
        
        // Store original search results
        setSearchResults(results);
        
        // Apply filters to results
        const filtered = applyFiltersToResults(results);
        setFilteredServices(filtered);
        setShowSearchResults(true);
        
        // Push state to history for back button handling
        if (!showSearchResults) {
            window.history.pushState({ searchActive: true }, '', window.location.href);
        }
    };

    // Handle clear search
    const handleClearSearch = () => {
        setSearchTerm('');
        setLocationSearch('');
        setSearchResults([]);
        setFilteredServices(locationBasedServices);
        setShowSearchResults(false);
        // Reset filters
        setAvailability(true);
        setPriceRange([0, 10000]);
        setSortOrder("default");
        
        if (window.history.state?.searchActive) {
            window.history.back();
        }
    };

    // Reset filters
    const resetFilters = () => {
        setSelectedDates([]);
        setPriceRange([0, 10000]);
        setSortOrder("default");
        setAvailability(true);
        
        // Re-apply filters to search results
        if (searchResults.length > 0) {
            const filtered = applyFiltersToResults(searchResults);
            setFilteredServices(filtered);
        }
    };

    // Apply filters modal
    const applyFiltersModal = () => {
        setIsFilterModalVisible(false);
        if (searchResults.length > 0) {
            const filtered = applyFiltersToResults(searchResults);
            setFilteredServices(filtered);
        }
    };

    const handleCategoryClick = (category) => {
        if (!hasLocation) {
            alert("Please select a location first");
            return;
        }

        navigate('/home', {
            state: {
                category: category,
                location: selectedLocation
            }
        });
    };

    const handleSubCategoryClick = (subCategory) => {
        if (!hasLocation) {
            alert("Please select a location first");
            return;
        }

        navigate('/home', {
            state: {
                subCategory: subCategory,
                location: selectedLocation
            }
        });
    };

    // Handle browser back/forward buttons
    useEffect(() => {
        const handlePopState = (event) => {
            if (showSearchResults) {
                setShowSearchResults(false);
                setSearchResults([]);
                setFilteredServices(locationBasedServices);
                setSearchTerm('');
                setLocationSearch('');
                setAvailability(true);
                setPriceRange([0, 10000]);
                setSortOrder("default");
            }
        };

        window.addEventListener('popstate', handlePopState);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [showSearchResults, locationBasedServices]);

    // Handle route changes
    useEffect(() => {
        const unlisten = () => {
            if (showSearchResults) {
                setShowSearchResults(false);
                setSearchResults([]);
                setFilteredServices(locationBasedServices);
            }
        };
        return unlisten;
    }, [location.pathname]);

    // Image slider for banners
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const buttonLabels = [
        "Home Maintenance & Repair Services",
        "Event & Party Planning Services",
        "Entertainment & Ticket Booking",
        "Health & Wellness Services",
        "Transportation & Travel Services",
        "Auto & Vehicle Services",
        "Home Shifting & Moving Services",
        "Religious & Pooja Services",
        "Agriculture & Farming Services",
        "Emergency & On-Demand Services",
        "Security & Surveillance Services",
        "Senior Citizen & Special Care Services"
    ];

    const imageUrls = [
        "https://i.pinimg.com/originals/59/71/b4/5971b4ac248f4d423b88f3ea8ea19d5b.png",
        "https://cdn.dribbble.com/users/1021976/screenshots/2423268/1st-shot.gif",
        "https://thumbs.dreamstime.com/z/people-queue-to-cinema-ticket-office-flat-cartoon-diverse-multiracial-adults-child-characters-booth-friendly-smiling-box-177416024.jpg",
        "https://tse1.mm.bing.net/th/id/OIP.QO-qqyIWNAjntPfA7l7CtgHaHa?rs=1&pid=ImgDetMain&o=7&rm=3",
        "https://th.bing.com/th/id/OIP.kZwgivQHtgnpXz3XmweVYgHaIc?rs=1&pid=ImgDetMain",
        "https://th.bing.com/th/id/OIP.P1C0CLQrC6Pij70FphLVuAHaEa?rs=1&pid=ImgDetMain",
        "https://cdn5.vectorstock.com/i/1000x1000/89/09/moving-house-services-concept-vector-29928909.jpg",
        "https://www.shutterstock.com/image-vector/creative-design-panditji-doing-hawan-600nw-2226501631.jpg",
        "https://static.vecteezy.com/system/resources/previews/023/252/667/original/agricultural-workers-farmers-do-agricultural-work-planting-and-gathering-crops-woman-milks-a-cow-and-picking-berries-cartoon-characters-doing-farming-job-illustration-vector.jpg",
        "https://static.vecteezy.com/system/resources/previews/013/977/964/original/medical-vehicle-ambulance-car-or-emergency-service-for-pick-up-patient-the-injured-in-an-accident-in-flat-cartoon-hand-drawn-templates-illustration-vector.jpg",
        "https://i.fbcd.co/products/resized/resized-750-500/2023-01-s-3-surve-mainpreview-c3dc6b720269d9acd20259cd0f343effd507c18ca77927941667cd54de895c54.jpg",
        "https://thumbs.dreamstime.com/b/elderly-person-assistance-vector-illustration-support-care-senior-people-social-work-volunteering-concept-flat-cartoon-322085453.jpg"
    ];

    // Show loading spinner
    if (loading && allServices.length === 0) {
        return (
            <div>
                <Navbar
                    onLocationSelect={handleLocationSelect}
                    selectedLocation={selectedLocation}
                    searchService={filterBySearch}
                />
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
        <div style={{ padding: '0px', fontFamily: 'Arial, sans-serif', backgroundColor: '#F9FAFB' }}>
            <Navbar
                onLocationSelect={handleLocationSelect}
                selectedLocation={selectedLocation}
                searchService={filterBySearch}
            />
            <br />

            {/* Search Results Section with Filters */}
            {showSearchResults && (
                <>
                    {/* Filter Controls - Only shown in search results */}
                    <div style={{
                        marginTop: "15px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0 15px",
                        maxWidth: "1200px",
                        marginLeft: "auto",
                        marginRight: "auto",
                        backgroundColor: "#FFFFFF",
                        padding: "15px 20px",
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        marginBottom: "15px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                            <Switch
                                checked={availability}
                                onChange={() => setAvailability(!availability)}
                                checkedChildren="Available Today"
                                unCheckedChildren="All Services"
                            />
                            <span style={{ color: "#666", fontSize: "14px" }}>
                                {filteredServices.length} results found
                            </span>
                        </div>
                        <Button
                            type="primary"
                            onClick={() => setIsFilterModalVisible(true)}
                            style={{ backgroundColor: "#4a54e1", borderRadius: "8px" }}
                        >
                            <i className="bi bi-funnel-fill"></i> Filter
                        </Button>
                    </div>

                    <SearchResults
                        filteredServices={filteredServices}
                        onClearSearch={handleClearSearch}
                        selectedLocation={selectedLocation}
                    />
                </>
            )}

            {/* Rest of the Content - Only shown when not in search results */}
            {!showSearchResults && (
                <>
                    {/* Hero Section */}
                    <div style={{
                        position: "relative",
                        height: "500px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        overflow: "hidden",
                        background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 50%, #fd79a8 100%)"
                    }}>
                        <div style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            backgroundImage: "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%)",
                            zIndex: 1
                        }}></div>

                        <div style={{
                            position: "relative",
                            zIndex: 2,
                            width: "95%",
                            maxWidth: "800px",
                            padding: "30px 15px",
                            background: "rgba(255, 255, 255, 0.95)",
                            borderRadius: "20px",
                            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
                            backdropFilter: "blur(10px)",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            textAlign: "center",
                            margin: "auto"
                        }}>
                            <div style={{ marginBottom: "35px" }}>
                                <h1 style={{
                                    marginBottom: "12px",
                                    color: "#2D3748",
                                    fontSize: "32px",
                                    fontWeight: "700",
                                    background: "linear-gradient(135deg, #2D3748 0%, #4A5568 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text"
                                }}>
                                    Discover Exceptional Services
                                </h1>
                                <p style={{
                                    color: "#718096",
                                    fontSize: "16px",
                                    fontWeight: "400",
                                    lineHeight: "1.5"
                                }}>
                                    Find the perfect service provider for your needs
                                </p>
                            </div>

                            <div style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "15px",
                                alignItems: "stretch",
                                justifyContent: "center",
                                width: "100%",
                                marginTop: "10px"
                            }}>
                                <div style={{
                                    flex: "1 1 100%",
                                    maxWidth: "350px",
                                    position: "relative"
                                }}>
                                    <input
                                        style={{
                                            width: "100%",
                                            height: "56px",
                                            padding: "0 50px 0 20px",
                                            border: "2px solid #E2E8F0",
                                            borderRadius: "12px",
                                            fontSize: "16px",
                                            fontWeight: "400",
                                            outline: "none",
                                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                            backgroundColor: "#FFFFFF",
                                            boxSizing: "border-box",
                                            color: "#2D3748"
                                        }}
                                        type="text"
                                        placeholder="Service name or category..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onFocus={(e) => {
                                            if (!hasLocation) {
                                                alert("Please select a location first");
                                            }
                                            e.target.style.borderColor = "#4299E1";
                                            e.target.style.boxShadow = "0 0 0 3px rgba(66, 153, 225, 0.1)";
                                            e.target.style.backgroundColor = "#F7FAFC";
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = "#E2E8F0";
                                            e.target.style.boxShadow = "none";
                                            e.target.style.backgroundColor = "#FFFFFF";
                                        }}
                                    />
                                    <div style={{
                                        position: "absolute",
                                        right: "20px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        color: "#A0AEC0",
                                        fontSize: "18px"
                                    }}>
                                        🔍
                                    </div>
                                </div>

                                <div style={{
                                    flex: "1 1 250px",
                                    minWidth: "250px",
                                    position: "relative"
                                }}>
                                    <LocationSearch
                                        onLocationSelect={(location) => {
                                            if (!hasLocation) {
                                                alert("Please select a location first");
                                                return;
                                            }
                                            setLocationSearch(location.display_name || location);
                                        }}
                                        placeholder="City, state or zip code..."
                                    />
                                </div>

                                <button
                                    onClick={handleSearch}
                                    style={{
                                        height: "56px",
                                        flex: "0 1 160px",
                                        minWidth: "160px",
                                        backgroundColor: "#4299E1",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "12px",
                                        fontSize: "16px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                        boxShadow: "0 4px 14px rgba(66, 153, 225, 0.4)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = "#3182CE";
                                        e.target.style.transform = "translateY(-2px)";
                                        e.target.style.boxShadow = "0 8px 20px rgba(66, 153, 225, 0.5)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = "#4299E1";
                                        e.target.style.transform = "translateY(0)";
                                        e.target.style.boxShadow = "0 4px 14px rgba(66, 153, 225, 0.4)";
                                    }}
                                >
                                    <span>Search</span>
                                    <span style={{ fontSize: "18px" }}>&rarr;</span>
                                </button>
                            </div>

                            <div style={{
                                marginTop: "25px",
                                display: "flex",
                                justifyContent: "center",
                                gap: "20px",
                                flexWrap: "wrap"
                            }}>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    fontSize: "13px",
                                    color: "#718096",
                                    fontWeight: "500"
                                }}>
                                    <div style={{
                                        width: "6px",
                                        height: "6px",
                                        backgroundColor: "#48BB78",
                                        borderRadius: "50%"
                                    }}></div>
                                    Search by name, category, or location
                                </div>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    fontSize: "13px",
                                    color: "#718096",
                                    fontWeight: "500"
                                }}>
                                    <div style={{
                                        width: "6px",
                                        height: "6px",
                                        backgroundColor: "#ED8936",
                                        borderRadius: "50%"
                                    }}></div>
                                    Verified service providers
                                </div>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    fontSize: "13px",
                                    color: "#718096",
                                    fontWeight: "500"
                                }}>
                                    <div style={{
                                        width: "6px",
                                        height: "6px",
                                        backgroundColor: "#9F7AEA",
                                        borderRadius: "50%"
                                    }}></div>
                                    Instant results
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Show content only when location is selected */}
                    {hasLocation ? (
                        <>
                            {locationBasedServices.length === 0 ? (
                                <div style={{
                                    marginTop: '40px',
                                    padding: '60px 20px',
                                    textAlign: 'center',
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: '10px',
                                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                                }}>
                                    <i className="fa fa-map-marker" style={{ fontSize: "48px", color: "#ff4444", marginBottom: "20px" }}></i>
                                    <h3 style={{ color: "#333", marginBottom: "10px" }}>No Services Available in This Location</h3>
                                    <p style={{ color: "#666", marginBottom: "20px" }}>
                                        We're sorry, but there are currently no service providers available in {selectedLocation?.display_name?.split(',')[0] || selectedLocation?.city || 'your selected location'}.
                                        Please try a different location or check back later.
                                    </p>
                                    <button
                                        onClick={() => handleLocationSelect(null)}
                                        style={{
                                            padding: "10px 20px",
                                            backgroundColor: "#4a54e1",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "8px",
                                            cursor: "pointer",
                                            fontSize: "16px"
                                        }}
                                    >
                                        Select Different Location
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Suggested Services Section */}
                                    {locationBasedServices.length > 0 && (
                                        <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#FFFFFF', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
                                            <h2 style={{ fontSize: "26px", fontWeight: "700", color: "#333", marginBottom: "25px", letterSpacing: "0.5px" }}>
                                                Suggested Services
                                            </h2>
                                            <div style={{
                                                display: 'flex',
                                                gap: '20px',
                                                whiteSpace: "nowrap",
                                                scrollbarWidth: "none",
                                                msOverflowStyle: "none",
                                                overflowX: 'auto',
                                                padding: '10px',
                                                WebkitOverflowScrolling: 'touch'
                                            }}>
                                                {getSuggestedServices().map((service) => (
                                                    <div key={service._id} style={{ minWidth: "250px", flexShrink: 0 }}>
                                                        <Service service={service} isLandingPage={true} bookingArea={selectedLocation} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Categories Section */}
                                    <div
                                        style={{
                                            backgroundColor: "#f5f7fa",
                                            padding: "40px 20px",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: "10px",
                                        }}
                                    >
                                        <h2
                                            style={{
                                                fontSize: "26px",
                                                fontWeight: "700",
                                                color: "#333",
                                                marginBottom: "25px",
                                                letterSpacing: "0.5px",
                                            }}
                                        >
                                            Categories of Services
                                        </h2>

                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                                gap: "30px",
                                                width: "100%",
                                                maxWidth: "1200px",
                                            }}
                                        >
                                            {Array.from({ length: buttonLabels.length }).map((_, index) => {
                                                const buttonText = buttonLabels[index] || `Button ${index + 1}`;
                                                const imageUrl = imageUrls[index] || "https://via.placeholder.com/150";

                                                return (
                                                    <div
                                                        key={index}
                                                        style={{
                                                            backgroundColor: "#fff",
                                                            padding: "30px 20px",
                                                            borderRadius: "15px",
                                                            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                                                            textAlign: "center",
                                                            transition: "transform 0.3s, box-shadow 0.3s",
                                                            cursor: "pointer",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = "translateY(-5px)";
                                                            e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = "translateY(0)";
                                                            e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.1)";
                                                        }}
                                                        onClick={() => handleCategoryClick(buttonText)}
                                                    >
                                                        <div style={{ marginBottom: "15px" }}>
                                                            <img
                                                                src={imageUrl}
                                                                alt={buttonText}
                                                                style={{ width: "60px", height: "200px", objectFit: "cover" }}
                                                            />
                                                        </div>
                                                        <button
                                                            style={{
                                                                padding: "10px 20px",
                                                                borderRadius: "8px",
                                                                border: "none",
                                                                background: "linear-gradient(135deg, #e1d9d9ff 0%, #fafafa 100%)",
                                                                color: "#201f1fff",
                                                                fontWeight: "600",
                                                                cursor: "pointer",
                                                                transition: "background-color 0.3s",
                                                            }}
                                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e55b00")}
                                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FF6600")}
                                                        >
                                                            {buttonText}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Rotating Services Section */}
                                    {locationBasedServices.length > 0 && (
                                        <div style={{
                                            display: 'flex',
                                            overflowX: 'auto',
                                            gap: '20px',
                                            padding: '20px',
                                            whiteSpace: 'nowrap',
                                            backgroundColor: '#FFFFFF',
                                            borderRadius: '10px',
                                            scrollbarWidth: "none",
                                            msOverflowStyle: "none",
                                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                            WebkitOverflowScrolling: 'touch'
                                        }}>
                                            {getRotatingServices().map((service) => (
                                                <div key={service._id} style={{ minWidth: "250px", flexShrink: 0 }}>
                                                    <Service service={service} isLandingPage={true} bookingArea={selectedLocation} />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Event & Ticket Services Section */}
                                    <div
                                        style={{
                                            backgroundColor: "#f5f7fa",
                                            padding: "60px 0",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: "60px",
                                        }}
                                    >
                                        <div style={{ width: "100%", textAlign: "center" }}>
                                            <h2
                                                style={{
                                                    fontSize: "26px",
                                                    fontWeight: "700",
                                                    color: "#333",
                                                    marginBottom: "25px",
                                                    letterSpacing: "0.5px",
                                                }}
                                            >
                                                Event & Ticket Services
                                            </h2>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "center",
                                                    flexWrap: "wrap",
                                                    gap: "40px",
                                                }}
                                            >
                                                {Array.from({ length: 3 }).map((_, boxIndex) => (
                                                    <div
                                                        key={boxIndex}
                                                        style={{
                                                            width: "340px",
                                                            borderRadius: "16px",
                                                            backgroundColor: "#fff",
                                                            boxShadow: "0 6px 16px rgba(0,0,0,0.1)",
                                                            overflow: "hidden",
                                                            transition: "transform 0.3s ease, box-shadow 0.3s ease",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = "translateY(-8px)";
                                                            e.currentTarget.style.boxShadow =
                                                                "0 10px 25px rgba(0,0,0,0.15)";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = "translateY(0)";
                                                            e.currentTarget.style.boxShadow =
                                                                "0 6px 16px rgba(0,0,0,0.1)";
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                background: "linear-gradient(135deg, #a0a4f0ff, #b7a6e5ff)",
                                                                color: "#fff",
                                                                textAlign: "center",
                                                                fontWeight: "600",
                                                                fontSize: "17px",
                                                                padding: "14px 0",
                                                            }}
                                                        >
                                                            {["Event Planning", "Decor & Photography", "Ticketing Services"][boxIndex]}
                                                        </div>

                                                        <div
                                                            style={{
                                                                display: "grid",
                                                                gridTemplateColumns: "1fr 1fr",
                                                                gap: "15px",
                                                                padding: "20px",
                                                                backgroundColor: "#fafafa",
                                                            }}
                                                        >
                                                            {[
                                                                "Wedding Planning",
                                                                "Birthday Planning",
                                                                "Corporate Events",
                                                                "Catering Service",
                                                                "Decor & Theme Setup",
                                                                "Photography & Videography",
                                                                "Entertainment",
                                                                "Venue Booking",
                                                                "Movie Tickets",
                                                                "Concert Tickets",
                                                                "Sports Tickets",
                                                                "Amusement Park Passes",
                                                            ]
                                                                .slice(boxIndex * 4, boxIndex * 4 + 4)
                                                                .map((buttonText, innerIndex) => (
                                                                    <div
                                                                        key={innerIndex}
                                                                        style={{
                                                                            borderRadius: "10px",
                                                                            overflow: "hidden",
                                                                            backgroundColor: "#fff",
                                                                            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
                                                                            transition:
                                                                                "transform 0.25s ease, box-shadow 0.25s ease",
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.transform = "scale(1.04)";
                                                                            e.currentTarget.style.boxShadow =
                                                                                "0 6px 12px rgba(0,0,0,0.15)";
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.transform = "scale(1)";
                                                                            e.currentTarget.style.boxShadow =
                                                                                "0 2px 6px rgba(0,0,0,0.08)";
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                height: "90px",
                                                                                width: "100%",
                                                                                overflow: "hidden",
                                                                            }}
                                                                        >
                                                                            <img
                                                                                src={imageUrls[(boxIndex * 4 + innerIndex) % imageUrls.length]}
                                                                                alt={buttonText}
                                                                                style={{
                                                                                    width: "100%",
                                                                                    height: "100%",
                                                                                    objectFit: "cover",
                                                                                    transition: "transform 0.4s ease",
                                                                                }}
                                                                                onMouseEnter={(e) =>
                                                                                    (e.currentTarget.style.transform = "scale(1.1)")
                                                                                }
                                                                                onMouseLeave={(e) =>
                                                                                    (e.currentTarget.style.transform = "scale(1)")
                                                                                }
                                                                            />
                                                                        </div>
                                                                        <button
                                                                            style={{
                                                                                color: "#6b7280",
                                                                                background: "linear-gradient(135deg, #e1d9d9ff 0%, #fafafa 100%)",
                                                                                border: "1px solid #f5f5f5",
                                                                                color: "black",
                                                                                border: "none",
                                                                                cursor: "pointer",
                                                                                padding: "10px 5px",
                                                                                fontSize: "13px",
                                                                                fontWeight: "600",
                                                                                width: "100%",
                                                                                borderRadius: "0 0 10px 10px",
                                                                                transition: "background-color 0.3s ease",
                                                                            }}
                                                                            onClick={() => handleSubCategoryClick(buttonText)}
                                                                        >
                                                                            {buttonText}
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Travel & Transport Services Section */}
                                        <div style={{ width: "100%", textAlign: "center" }}>
                                            <h2
                                                style={{
                                                    fontSize: "26px",
                                                    fontWeight: "700",
                                                    color: "#333",
                                                    marginBottom: "25px",
                                                    letterSpacing: "0.5px",
                                                }}
                                            >
                                                Travel & Transport Services
                                            </h2>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    justifyContent: "center",
                                                    gap: "25px",
                                                    padding: "0 20px",
                                                }}
                                            >
                                                {[
                                                    "Cab and Taxi Services",
                                                    "Car Rental",
                                                    "Airport Transfers",
                                                    "Flight Ticket Booking",
                                                ].map((buttonText, index) => (
                                                    <div
                                                        key={index}
                                                        style={{
                                                            width: "260px",
                                                            borderRadius: "14px",
                                                            overflow: "hidden",
                                                            backgroundColor: "rgba(255, 255, 255, 1)",
                                                            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                                                            transition: "transform 0.3s ease, box-shadow 0.3s ease",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => handleCategoryClick(buttonText)}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = "translateY(-5px)";
                                                            e.currentTarget.style.boxShadow =
                                                                "0 6px 12px rgba(0, 0, 0, 0.2)";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = "translateY(0)";
                                                            e.currentTarget.style.boxShadow =
                                                                "0 4px 8px rgba(0, 0, 0, 0.1)";
                                                        }}
                                                    >
                                                        <div style={{ height: "130px", overflow: "hidden" }}>
                                                            <img
                                                                src={imageUrls[index % imageUrls.length]}
                                                                alt={buttonText}
                                                                style={{
                                                                    width: "100%",
                                                                    height: "100%",
                                                                    objectFit: "cover",
                                                                    transition: "transform 0.4s ease",
                                                                }}
                                                                onMouseEnter={(e) =>
                                                                    (e.currentTarget.style.transform = "scale(1.1)")
                                                                }
                                                                onMouseLeave={(e) =>
                                                                    (e.currentTarget.style.transform = "scale(1)")
                                                                }
                                                            />
                                                        </div>
                                                        <div
                                                            style={{
                                                                padding: "15px 22px",
                                                                textAlign: "center",
                                                                fontWeight: "600",
                                                                fontSize: "14px",
                                                                color: "#6b7280",
                                                                background: "linear-gradient(135deg, #e1d9d9ff 0%, #fafafa 100%)",
                                                                border: "1px solid #f5f5f5",
                                                                cursor: "pointer",
                                                                transition: "all 0.3s ease",
                                                                borderRadius: "8px",
                                                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                                                            }}

                                                        >
                                                            {buttonText}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* About Section */}
                                    <About />
                                </>
                            )}
                        </>
                    ) : (
                        /* Prompt to select location */
                        <div style={{
                            marginTop: '40px',
                            padding: '60px 20px',
                            textAlign: 'center',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '10px',
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                        }}>
                            <i className="fa fa-map-marker" style={{ fontSize: "48px", color: "#ff9800", marginBottom: "20px" }}></i>
                            <h3 style={{ color: "#333", marginBottom: "10px" }}>Select Your Location</h3>
                            <p style={{ color: "#666", marginBottom: "20px", maxWidth: "500px", margin: "0 auto" }}>
                                Please select your location from the navbar to discover services available in your area.
                                This helps us show you the most relevant service providers near you.
                            </p>
                            <button
                                onClick={() => {
                                    const locationBtn = document.querySelector('.location-toggle-btn');
                                    if (locationBtn) {
                                        locationBtn.click();
                                    } else {
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                        setTimeout(() => {
                                            alert("Please click on the location button in the top navbar to select your location");
                                        }, 500);
                                    }
                                }}
                                style={{
                                    padding: "12px 24px",
                                    backgroundColor: "#ff9800",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontSize: "16px",
                                    fontWeight: "500",
                                    marginTop: "20px"
                                }}
                            >
                                Select Location
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Filter Modal */}
            <Modal
                title="Filter Services"
                open={isFilterModalVisible}
                onOk={applyFiltersModal}
                onCancel={() => setIsFilterModalVisible(false)}
                footer={[
                    <Button key="reset" onClick={resetFilters}>Reset</Button>,
                    <Button key="apply" type="primary" onClick={applyFiltersModal}>Apply</Button>,
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
};

export default App;