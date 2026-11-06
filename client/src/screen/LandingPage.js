import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import './LandingPage.css';

// Crisp modern icons
import {
    FaSearch,
    FaMapMarkerAlt,
    FaFilter,
    FaArrowRight,
    FaCheckCircle,
    FaShieldAlt,
    FaBolt
} from 'react-icons/fa';

const LandingPage = () => {
    const images = [
        "https://th.bing.com/th/id/OIP.yn6JD0Y-ZbvHNU3gj3gauwHaHa?w=1210&h=1210&rs=1&pid=ImgDetMain",
        "https://th.bing.com/th/id/OIP.yELYmy4neggRJg7LrnCmagHaFS?w=1280&h=914&rs=1&pid=ImgDetMain",
        "https://thumbs.dreamstime.com/z/great-customer-service-words-white-concept-exciting-experience-customers-45526322.jpg"
    ];

    const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
    const [allServices, setAllServices] = useState([]);
    const [locationBasedServices, setLocationBasedServices] = useState([]);
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
    const [searchResults, setSearchResults] = useState([]); // Store search results before price/availability filters
    const { RangePicker } = DatePicker;

    const navigate = useNavigate();
    const location = useLocation();

    // Check if service is available at a location
    const isServiceInLocation = useCallback((service, location) => {
        if (!location) return true;
        if (!service) return false;

        let queryStr = '';
        if (typeof location === 'string') {
            queryStr = location.toLowerCase();
        } else if (location.display_name) {
            queryStr = location.display_name.toLowerCase();
        } else if (location.city) {
            queryStr = location.city.toLowerCase();
        } else if (location.name) {
            queryStr = location.name.toLowerCase();
        } else {
            queryStr = String(location).toLowerCase();
        }

        queryStr = queryStr.trim();
        if (!queryStr) return true;

        // Collect all location-related text for this service
        const targets = [];
        if (service.address) targets.push(service.address.toLowerCase());
        if (service.location) targets.push(service.location.toLowerCase());
        if (Array.isArray(service.locations)) {
            service.locations.forEach(loc => {
                if (loc) targets.push(String(loc).toLowerCase());
            });
        }
        if (Array.isArray(service.locationPricing)) {
            service.locationPricing.forEach(lp => {
                if (lp.locationName) targets.push(lp.locationName.toLowerCase());
                if (lp.locationAddress) targets.push(lp.locationAddress.toLowerCase());
            });
        }

        // If no location data is set on the service, consider it available everywhere
        if (targets.length === 0) return true;

        // Direct match with entire query string
        if (targets.some(target => target.includes(queryStr) || queryStr.includes(target))) {
            return true;
        }

        // Break query into terms (filter out common filler words and short tokens)
        const filler = new Set(['india', 'road', 'street', 'near', 'the', 'and', 'city', 'state']);
        const queryTerms = queryStr
            .split(/[\s,]+/)
            .map(t => t.trim())
            .filter(t => t.length >= 2 && !filler.has(t));

        if (queryTerms.length === 0) return true;

        return queryTerms.some(term => targets.some(target => target.includes(term)));
    }, []);

    // Smart service name & category matcher
    const isServiceMatchingSearch = useCallback((service, term) => {
        if (!term || !term.trim()) return true;
        if (!service) return false;

        const searchableText = [
            service.name || '',
            service.category || '',
            service.subCategory || '',
            service.companyname || '',
            service.description || '',
            service.facility || ''
        ].join(' ').toLowerCase();

        const normalizedTerm = term.trim().toLowerCase();

        // 1. Direct full phrase match
        if (searchableText.includes(normalizedTerm)) return true;

        // Filter out common stopwords to extract primary keywords
        const stopwords = new Set(['service', 'services', 'expert', 'best', 'near', 'me', 'in', 'and', 'for', 'at', 'the', 'of', 'a', 'an']);
        const allWords = normalizedTerm.split(/\s+/).filter(w => w.length > 1);
        const keywords = allWords.filter(w => !stopwords.has(w));
        const wordsToMatch = keywords.length > 0 ? keywords : allWords;

        if (wordsToMatch.length === 0) return true;

        // All key terms must match (either directly or via common word stems)
        return wordsToMatch.every(word => {
            if (searchableText.includes(word)) return true;
            const stem = word.replace(/(ing|ers?|ed|es|s|ian)$/, '').trim();
            return stem.length >= 3 && searchableText.includes(stem);
        });
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
        if (!location) return services || [];
        const filtered = (services || []).filter(service => isServiceInLocation(service, location));
        console.log(`Filtered ${filtered.length} services from ${(services || []).length} for location:`, location);
        return filtered;
    }, [isServiceInLocation]);

    // Apply secondary filters (availability, price range, sort) to search results
    const applyFiltersToResults = useCallback((results) => {
        let filtered = [...results];

        // Apply availability filter
        if (availability) {
            filtered = filtered.filter(service => isServiceAvailableToday(service));
        }

        // Apply price range filter
        filtered = filtered.filter(
            s => (Number(s.rentperday) || 0) >= priceRange[0] && (Number(s.rentperday) || 0) <= priceRange[1]
        );

        // Apply sorting
        if (sortOrder === "priceAsc") {
            filtered.sort((a, b) => (Number(a.rentperday) || 0) - (Number(b.rentperday) || 0));
        } else if (sortOrder === "priceDesc") {
            filtered.sort((a, b) => (Number(b.rentperday) || 0) - (Number(a.rentperday) || 0));
        }

        return filtered;
    }, [availability, priceRange, sortOrder, isServiceAvailableToday]);

    // Derived filtered services: automatically keeps in sync with searchResults and active filters
    const filteredServices = useMemo(() => {
        return applyFiltersToResults(searchResults);
    }, [searchResults, applyFiltersToResults]);

    // Update location-based services when location or allServices changes
    useEffect(() => {
        if (allServices.length > 0) {
            if (selectedLocation) {
                const filtered = getLocationBasedServices(selectedLocation, allServices);
                setLocationBasedServices(filtered);
                setHasLocation(true);
                console.log(`Location selected: ${selectedLocation.display_name || selectedLocation.city || selectedLocation}, Found ${filtered.length} services`);
            } else {
                setLocationBasedServices(allServices);
                setHasLocation(false);
            }
            setLoading(false);
        }
    }, [allServices, selectedLocation, getLocationBasedServices]);

    // Get suggested services
    const getSuggestedServices = () => {
        if (locationBasedServices.length === 0) return [];
        const startIndex = suggestedServiceIndex;
        const endIndex = Math.min(startIndex + 10, locationBasedServices.length);
        return locationBasedServices.slice(startIndex, endIndex);
    };

    // Get rotating services
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
                        setHasLocation(true);
                        console.log("Loaded saved location:", location);
                    } catch (error) {
                        console.error("Error parsing saved location:", error);
                        setSelectedLocation(null);
                        setHasLocation(false);
                    }
                }
            } catch (error) {
                console.error('Error fetching services:', error);
                setAllServices([]);
            } finally {
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
        console.log("Search triggered, searchTerm:", searchTerm, "locationSearch:", locationSearch);

        const term = searchTerm.trim();
        const loc = locationSearch.trim();

        if (!term && !loc && !selectedLocation) {
            alert("Please enter a service name or location to search");
            return;
        }

        let results = [...allServices];

        // 1. Filter by location (prioritize user input locationSearch if given, otherwise selectedLocation)
        const targetLocation = loc || selectedLocation;
        if (targetLocation) {
            results = results.filter(service => isServiceInLocation(service, targetLocation));
        }

        // 2. Filter strictly by search term (name, category, subcategory, company, description, facility)
        if (term) {
            results = results.filter(service => isServiceMatchingSearch(service, term));
        }

        console.log(`Search results: ${results.length} services found for term: "${term}" in location: "${targetLocation}"`);

        if (loc && !selectedLocation) {
            setSelectedLocation(loc);
            setHasLocation(true);
        }

        // Set search results (filteredServices derives automatically via useMemo)
        setSearchResults(results);
        setShowSearchResults(true);

        // Push state to history for back button handling
        if (!showSearchResults) {
            window.history.pushState({ searchActive: true }, '', window.location.href);
        }
    };

    // Filter by search term only (for navbar search)
    const filterBySearch = (term) => {
        console.log("Navbar search triggered, term:", term);

        if (!term || term.trim() === "") {
            setShowSearchResults(false);
            setSearchResults([]);
            return;
        }

        const pool = selectedLocation ? locationBasedServices : allServices;
        const results = pool.filter(service => isServiceMatchingSearch(service, term));

        console.log(`Navbar search results: ${results.length} services found for term: ${term}`);

        setSearchResults(results);
        setShowSearchResults(true);

        if (!showSearchResults) {
            window.history.pushState({ searchActive: true }, '', window.location.href);
        }
    };

    // Handle clear search
    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        setLocationSearch('');
        setSearchResults([]);
        setShowSearchResults(false);
        // Reset filters
        setAvailability(true);
        setPriceRange([0, 10000]);
        setSortOrder("default");

        if (window.history.state?.searchActive) {
            window.history.back();
        }
    }, []);

    // Reset filters
    const resetFilters = () => {
        setSelectedDates([]);
        setPriceRange([0, 10000]);
        setSortOrder("default");
        setAvailability(true);
    };

    // Apply filters modal
    const applyFiltersModal = () => {
        setIsFilterModalVisible(false);
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
        const handlePopState = () => {
            setShowSearchResults(false);
            setSearchResults([]);
            setSearchTerm('');
            setLocationSearch('');
            setAvailability(true);
            setPriceRange([0, 10000]);
            setSortOrder("default");
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
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
            <div className="lp-root">
                <Navbar
                    onLocationSelect={handleLocationSelect}
                    selectedLocation={selectedLocation}
                    searchService={filterBySearch}
                />
                <div className="lp-loader-screen">
                    <div className="lp-spinner" />
                    <p className="lp-loader-text">Loading verified local services...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="lp-root">
            <Navbar
                onLocationSelect={handleLocationSelect}
                selectedLocation={selectedLocation}
                searchService={filterBySearch}
            />

            {/* Search Results Section with Filters */}
            {showSearchResults && (
                <>
                    {/* Filter Controls Bar */}
                    <div className="lp-filter-bar">
                        <div className="lp-filter-controls">
                            <Switch
                                checked={availability}
                                onChange={() => setAvailability(!availability)}
                                checkedChildren="Available Today"
                                unCheckedChildren="All Services"
                            />
                            <span className="lp-results-count">
                                {filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'} found
                            </span>
                        </div>
                        <Button
                            type="primary"
                            onClick={() => setIsFilterModalVisible(true)}
                            className="lp-filter-btn"
                        >
                            <FaFilter style={{ fontSize: '0.8rem' }} />
                            <span>Filter & Sort</span>
                        </Button>
                    </div>

                    <SearchResults
                        filteredServices={filteredServices}
                        onClearSearch={handleClearSearch}
                        selectedLocation={selectedLocation}
                    />
                </>
            )}

            {/* Standard Landing Page Content (when not showing search results) */}
            {!showSearchResults && (
                <>
                    {/* Modern Hero Section */}
                    <section className="lp-hero">
                        <div className="lp-hero-card">
                            <div className="lp-hero-badge">
                                <FaBolt /> Verified Service Network
                            </div>

                            <h1 className="lp-hero-title">
                                Discover <span className="lp-hero-title-gradient">Exceptional Services</span>
                            </h1>
                            <p className="lp-hero-subtitle">
                                Connect with top-rated local professionals and book services instantly
                            </p>

                            {/* Hero Search Box */}
                            <div className="lp-search-container">
                                <div className="lp-search-input-box">
                                    <FaSearch className="lp-search-icon" />
                                    <input
                                        className="lp-search-input"
                                        type="text"
                                        placeholder="Service name, trade, or category..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSearch();
                                        }}
                                    />
                                </div>

                                <div className="lp-search-location-box">
                                    <LocationSearch
                                        onLocationSelect={(location) => {
                                            const locStr = location?.display_name || (typeof location === 'string' ? location : '');
                                            setLocationSearch(locStr);
                                            if (location) {
                                                setSelectedLocation(location);
                                                setHasLocation(true);
                                            }
                                        }}
                                        onInputChange={(val) => {
                                            setLocationSearch(val);
                                        }}
                                        onEnter={handleSearch}
                                        placeholder="City, area or pin code..."
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="lp-search-btn"
                                    onClick={handleSearch}
                                >
                                    <span>Search</span>
                                    <FaArrowRight style={{ fontSize: '0.85rem' }} />
                                </button>
                            </div>

                            {/* Trust badges */}
                            <div className="lp-hero-features">
                                <div className="lp-hero-feature-item">
                                    <FaCheckCircle className="lp-hero-feature-icon green" />
                                    <span>Verified Providers</span>
                                </div>
                                <div className="lp-hero-feature-item">
                                    <FaShieldAlt className="lp-hero-feature-icon amber" />
                                    <span>Guaranteed Quality</span>
                                </div>
                                <div className="lp-hero-feature-item">
                                    <FaBolt className="lp-hero-feature-icon indigo" />
                                    <span>Instant Availability</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Content Section: Depends on location selection */}
                    {hasLocation ? (
                        <>
                            {locationBasedServices.length === 0 ? (
                                /* No services in this location */
                                <div className="lp-empty-state">
                                    <div className="lp-empty-icon-wrap red">
                                        <FaMapMarkerAlt />
                                    </div>
                                    <h3 className="lp-empty-title">No Services in This Area Yet</h3>
                                    <p className="lp-empty-desc">
                                        We currently don't have registered providers in{" "}
                                        <strong>
                                            {selectedLocation?.display_name?.split(',')[0] || selectedLocation?.city || selectedLocation || 'this location'}
                                        </strong>
                                        . Please select a neighboring area or check back soon.
                                    </p>
                                    <button
                                        type="button"
                                        className="lp-empty-btn primary"
                                        onClick={() => handleLocationSelect(null)}
                                    >
                                        <FaMapMarkerAlt />
                                        <span>Change Location</span>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Suggested Services Carousel */}
                                    {locationBasedServices.length > 0 && (
                                        <div className="lp-section-container">
                                            <div className="lp-service-carousel-card">
                                                <div className="lp-section-header">
                                                    <div>
                                                        <h2 className="lp-section-title">
                                                             Suggested Services
                                                        </h2>
                                                        <p className="lp-section-sub">
                                                            Popular and top-rated offerings in your area
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="lp-horizontal-scroll">
                                                    {getSuggestedServices().map((service) => (
                                                        <div key={service._id} className="lp-service-card-item">
                                                            <Service service={service} isLandingPage={true} bookingArea={selectedLocation} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Categories Section */}
                                    <section className="lp-categories-section">
                                        <div className="lp-section-container" style={{ padding: "0 0 30px" }}>
                                            <div className="lp-section-header" style={{ justifyContent: "center", textAlign: "center" }}>
                                                <div>
                                                    <h2 className="lp-section-title" style={{ justifyContent: "center" }}>
                                                        Browse By Category
                                                    </h2>
                                                    <p className="lp-section-sub">
                                                        Find specialized experts tailored for your home and lifestyle
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="lp-categories-grid">
                                                {Array.from({ length: buttonLabels.length }).map((_, index) => {
                                                    const buttonText = buttonLabels[index] || `Service ${index + 1}`;
                                                    const imageUrl = imageUrls[index] || images[0];

                                                    return (
                                                        <div
                                                            key={index}
                                                            className="lp-category-card"
                                                            onClick={() => handleCategoryClick(buttonText)}
                                                        >
                                                            <div className="lp-category-img-wrap">
                                                                <img
                                                                    src={imageUrl}
                                                                    alt={buttonText}
                                                                    className="lp-category-img"
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="lp-category-btn"
                                                            >
                                                                {buttonText}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </section>

                                    {/* Rotating Services Carousel */}
                                    {locationBasedServices.length > 0 && (
                                        <div className="lp-section-container">
                                            <div className="lp-service-carousel-card">
                                                <div className="lp-section-header">
                                                    <div>
                                                        <h2 className="lp-section-title">
                                                            Featured Providers
                                                        </h2>
                                                        <p className="lp-section-sub">
                                                            Handpicked and actively taking bookings today
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="lp-horizontal-scroll">
                                                    {getRotatingServices().map((service) => (
                                                        <div key={service._id} className="lp-service-card-item">
                                                            <Service service={service} isLandingPage={true} bookingArea={selectedLocation} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Event & Ticket Services */}
                                    <section className="lp-events-section">
                                        <div className="lp-section-container" style={{ padding: "0" }}>
                                            <div className="lp-section-header" style={{ justifyContent: "center", textAlign: "center", marginBottom: "35px" }}>
                                                <div>
                                                    <h2 className="lp-section-title" style={{ justifyContent: "center" }}>
                                                        Event & Ticket Services
                                                    </h2>
                                                    <p className="lp-section-sub">
                                                        Make every occasion unforgettable with hassle-free planning
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="lp-events-grid">
                                                {Array.from({ length: 3 }).map((_, boxIndex) => (
                                                    <div key={boxIndex} className="lp-event-column-card">
                                                        <div className="lp-event-header-ribbon">
                                                            {["Event Planning", "Decor & Photography", "Ticketing Services"][boxIndex]}
                                                        </div>

                                                        <div className="lp-event-subitems-grid">
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
                                                                .map((subText, innerIndex) => (
                                                                    <div key={innerIndex} className="lp-subitem-card">
                                                                        <div className="lp-subitem-thumb">
                                                                            <img
                                                                                src={imageUrls[(boxIndex * 4 + innerIndex) % imageUrls.length]}
                                                                                alt={subText}
                                                                                className="lp-subitem-img"
                                                                            />
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            className="lp-subitem-btn"
                                                                            onClick={() => handleSubCategoryClick(subText)}
                                                                        >
                                                                            {subText}
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </section>

                                    {/* Travel & Transport Section */}
                                    <section className="lp-travel-section">
                                        <div className="lp-section-container" style={{ padding: "0" }}>
                                            <div className="lp-section-header" style={{ justifyContent: "center", textAlign: "center", marginBottom: "35px" }}>
                                                <div>
                                                    <h2 className="lp-section-title" style={{ justifyContent: "center" }}>
                                                        Travel & Transport Services
                                                    </h2>
                                                    <p className="lp-section-sub">
                                                        Reliable rentals, cab services, and travel booking at your fingertips
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="lp-travel-grid">
                                                {[
                                                    "Cab and Taxi Services",
                                                    "Car Rental",
                                                    "Airport Transfers",
                                                    "Flight Ticket Booking",
                                                ].map((travelTitle, index) => (
                                                    <div
                                                        key={index}
                                                        className="lp-travel-card"
                                                        onClick={() => handleCategoryClick(travelTitle)}
                                                    >
                                                        <div className="lp-travel-thumb">
                                                            <img
                                                                src={imageUrls[index % imageUrls.length]}
                                                                alt={travelTitle}
                                                                className="lp-travel-img"
                                                            />
                                                        </div>
                                                        <div className="lp-travel-title-box">
                                                            {travelTitle}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </section>

                                    {/* About Component */}
                                    <About />
                                </>
                            )}
                        </>
                    ) : (
                        /* Prompt to select location when not chosen */
                        <div className="lp-empty-state">
                            <div className="lp-empty-icon-wrap orange">
                                <FaMapMarkerAlt />
                            </div>
                            <h3 className="lp-empty-title">Select Your Location</h3>
                            <p className="lp-empty-desc">
                                Please choose your location to discover verified services and professionals near you.
                            </p>
                            <button
                                type="button"
                                className="lp-empty-btn orange"
                                onClick={() => {
                                    const locationBtn = document.querySelector('.sh-location-pill') || document.querySelector('.location-toggle-btn');
                                    if (locationBtn) {
                                        locationBtn.click();
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    } else {
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                        setTimeout(() => {
                                            alert("Please click on the location button in the top navbar to select your location");
                                        }, 400);
                                    }
                                }}
                            >
                                <FaMapMarkerAlt />
                                <span>Choose Location</span>
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
                        <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Price Range (₹):</label>
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
                        <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Sort By:</label>
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

export default LandingPage;
