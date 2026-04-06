import React, { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import LocationSearch from './LocationSearch';

export function Addservice({ userId }) {
    const [service, setService] = useState("");
    const [rentPerDay, setRentPerDay] = useState("");
    const [description, setDescription] = useState("");
    const [phonenumber, setPhonenumber] = useState("");
    const [companyname, setCompanyName] = useState("");
    const [address, setAddress] = useState("");
    const [facility, setFacility] = useState("");
    const [image1, setImage1] = useState("");
    const [image2, setImage2] = useState("");
    const [image3, setImage3] = useState("");
    const [unit, setUnit] = useState("per day");
    const [customUnit, setCustomUnit] = useState("");
    const [isCountable, setIsCountable] = useState(true);
    const [inputs, setInputs] = useState([{
        name: '',
        price: '',
        image: '',
        maxcount: '',
        unit: 'per day',
        customUnit: '',
        isCountable: true
    }]);

    const [category, setCategory] = useState("");
    const [subCategory, setSubCategory] = useState("");
    const [bookingType, setBookingType] = useState("Automatic Booking");
    const [descriptionPoints, setDescriptionPoints] = useState("");
    const [facilityPoints, setFacilityPoints] = useState("");
    const [showOptionalInputs, setShowOptionalInputs] = useState(false);
    
    // Location type states (Original functionality)
    const [showLocationOptions, setShowLocationOptions] = useState(false);
    const [selectedLocationType, setSelectedLocationType] = useState("");
    const [locations, setLocations] = useState([]);
    
    // Location pricing states (New functionality)
    const [showLocationPricing, setShowLocationPricing] = useState(false);
    const [locationsList, setLocationsList] = useState([]);
    const [currentLocation, setCurrentLocation] = useState({
        locationName: '',
        locationAddress: '',
        extraPrice: 0,
        optionalInputsExtra: []
    });

    const categoryOptions = {
        "Home Maintenance & Repair Services": [
            "Plumbing Services", "Electrical Repairs", "Carpentry and Woodwork",
            "Painting and Wallpapering", "Appliance Repair", "Pest Control",
            "Roof Repair and Waterproofing", "Flooring and Tile Repair",
            "HVAC Maintenance", "Home Cleaning", "Furniture Assembly",
            "Glass and Mirror Repair", "Smart Home Setup"
        ],
        "Event & Party Planning Services": [
            "Wedding Planning", "Birthday Party Planning", "Corporate Event Planning",
            "Catering Service", "Decor and Theme Setup", "Photography and Videography",
            "Entertainment", "Venue Booking", "Invitation Design", "Sound and Lighting Setup"
        ],
        "Entertainment & Ticket Booking": [
            "Movie Ticket Booking", "Concert and Show Tickets", "Sports Event Tickets",
            "Amusement Park Tickets", "Theater and Play Tickets", "Event Passes",
            "Online Streaming Subscriptions", "Gaming Zone Access"
        ],
        "Health & Wellness Services": [
            "Gym Memberships", "Yoga and Meditation Classes", "Diet and Nutrition Counseling",
            "Spa and Massage Services", "Physiotherapy", "Mental Health Counseling",
            "Home Healthcare", "Personal Training", "Wellness Retreats"
        ],
        "Transportation & Travel Services": [
            "Cab and Taxi Services", "Car Rental", "Airport Transfers",
            "Bus and Train Ticket Bookings", "Flight Ticket Booking",
            "Tour Packages", "Bike Rentals"
        ],
        "Education & Skill Development": [
            "Online Courses", "Tutoring Services", "Workshops and Webinars",
            "Certification Programs", "Test Preparation", "Language Classes",
            "Career Counseling"
        ],
        "Property & Space Rental": [
            "Office Space Rental", "Event Venue Booking", "Vacation Rentals",
            "Warehouse Rental", "Shop Rental", "Furniture Rental"
        ],
        "Auto & Vehicle Services": [
            "Car Wash and Detailing", "Vehicle Repair", "Towing Services",
            "Bike Servicing", "Tire Replacement", "Battery Replacement",
            "Insurance Renewal"
        ],
        "Home Shifting & Moving Services": [
            "Packing and Moving", "Transportation Services", "Packing Material Supply",
            "Storage Solutions", "Pet Relocation", "International Relocation"
        ],
        "Religious & Pooja Services": [
            "Pooja Arrangements", "Temple Visits", "Religious Event Planning",
            "Astrology Services", "Religious Item Delivery"
        ],
        "Agriculture & Farming Services": [
            "Farm Equipment Rental", "Crop Consulting", "Organic Farming Supplies",
            "Irrigation Solutions", "Farm Labor Services"
        ],
        "Emergency & On-Demand Services": [
            "Ambulance Services", "Locksmith Services", "Electrician on Call",
            "Plumber on Call", "Medical Assistance", "Towing Services"
        ],
        "Security & Surveillance Services": [
            "CCTV Installation", "Security Guards", "Alarm Systems",
            "Smart Locks", "Cybersecurity Services"
        ],
        "Senior Citizen & Special Care Services": [
            "Home Nursing Care", "Physiotherapy", "Companion Services",
            "Medical Equipment Rental", "Meal Delivery"
        ]
    };

    const handleCategoryChange = (e) => {
        setCategory(e.target.value);
        setSubCategory("");
    };

    const handleSubCategoryChange = (e) => {
        setSubCategory(e.target.value);
    };

    const handleAddInput = () => {
        if (inputs.length < 10) {
            setInputs([...inputs, {
                name: '',
                price: '',
                image: '',
                maxcount: '',
                unit: 'per day',
                customUnit: '',
                isCountable: true
            }]);
        }
    };

    const handleInputChange = (index, field, value) => {
        const newInputs = [...inputs];
        newInputs[index][field] = value;

        if (field === 'unit' && value !== 'Other') {
            newInputs[index].customUnit = '';
        }

        if (field === 'isCountable' && value === false) {
            newInputs[index].maxcount = '';
        }

        setInputs(newInputs);
    };

    const handleRentChange = (e) => {
        setRentPerDay(e.target.value);
    };

    const handleUnitChange = (e) => {
        setUnit(e.target.value);
        if (e.target.value !== "Other") {
            setCustomUnit("");
        }
    };

    const handleCustomUnitChange = (e) => {
        setCustomUnit(e.target.value);
    };

    const handleLocationSelect = (location) => {
        console.log("Location selected for service:", location);
        setAddress(location.display_name);
    };

    // Location Type functions (Original)
    const handleAddLocation = () => {
        if (selectedLocationType) {
            setLocations([...locations, selectedLocationType]);
            setSelectedLocationType("");
        }
    };

    // Location Pricing functions (New)
    const handleLocationNameSelect = (location) => {
        setCurrentLocation({
            ...currentLocation,
            locationName: location.display_name.split(',')[0],
            locationAddress: location.display_name
        });
    };

    const handleExtraPriceChange = (e) => {
        setCurrentLocation({
            ...currentLocation,
            extraPrice: parseFloat(e.target.value) || 0
        });
    };

    const handleOptionalInputExtraChange = (inputName, extraPrice) => {
        const existingIndex = currentLocation.optionalInputsExtra.findIndex(
            item => item.inputName === inputName
        );
        
        let updatedExtras = [...currentLocation.optionalInputsExtra];
        
        if (existingIndex >= 0) {
            if (extraPrice === 0) {
                updatedExtras = updatedExtras.filter(item => item.inputName !== inputName);
            } else {
                updatedExtras[existingIndex].extraPrice = extraPrice;
            }
        } else if (extraPrice > 0) {
            updatedExtras.push({ inputName, extraPrice });
        }
        
        setCurrentLocation({
            ...currentLocation,
            optionalInputsExtra: updatedExtras
        });
    };

    const addLocationToService = () => {
        if (!currentLocation.locationName || !currentLocation.locationAddress) {
            Swal.fire("Error", "Please select a location first", "error");
            return;
        }
        
        setLocationsList([...locationsList, { ...currentLocation }]);
        setCurrentLocation({
            locationName: '',
            locationAddress: '',
            extraPrice: 0,
            optionalInputsExtra: []
        });
    };

    const removeLocation = (index) => {
        setLocationsList(locationsList.filter((_, i) => i !== index));
    };

    async function addService() {
        const formattedDescription = descriptionPoints
            .split('\n')
            .filter(point => point.trim() !== '')
            .map(point => point.startsWith('→') ? point : `→ ${point}`)
            .join('\n');

        const formattedFacility = facilityPoints
            .split('\n')
            .filter(point => point.trim() !== '')
            .map(point => point.startsWith('→') ? point : `→ ${point}`)
            .join('\n');

        if (!address) {
            Swal.fire("Error", "Please select a service location", "error");
            return;
        }

        if (!service || !image1 || !image2 || !image3 || !formattedFacility || !category) {
            Swal.fire("Error", "Please fill in the required fields: Service name, at least 3 images, facility points, and category.", "error");
            return;
        }

        const imageURLs = [image1, image2, image3];

        const validOptionalInputs = inputs.filter(input => 
            input.name && input.name.trim() !== '' && input.price
        ).map(input => ({
            name: input.name,
            price: parseFloat(input.price) || 0,
            image: input.image,
            maxcount: input.maxcount || null,
            unit: input.unit,
            customUnit: input.unit === "Other" ? input.customUnit : "",
            isCountable: input.isCountable !== false
        }));

        const payload = {
            service,
            rentperday: parseFloat(rentPerDay) || 0,
            unit,
            customUnit: unit === "Other" ? customUnit : "",
            isCountable: isCountable !== false,
            description: formattedDescription,
            phonenumber,
            companyname,
            address,
            facility: formattedFacility,
            imageURLs,
            optionalInputs: validOptionalInputs,
            category,
            subCategory,
            bookingType,
            locations: locations, // Location Type array (Simple, No, Rental)
            locationPricing: locationsList // Location Pricing array with extra amounts
        };

        try {
            await axios.post(`/api/service/addservice?userid=${userId}`, payload, {
                headers: { "Content-Type": "application/json" },
            });
            Swal.fire("Success", "Service added successfully!", "success");
            
            // Reset form
            setService("");
            setAddress("");
            setImage1("");
            setImage2("");
            setImage3("");
            setFacilityPoints("");
            setDescriptionPoints("");
            setRentPerDay("");
            setPhonenumber("");
            setCompanyName("");
            setCategory("");
            setSubCategory("");
            setLocations([]);
            setSelectedLocationType("");
            setLocationsList([]);
            setInputs([{
                name: '',
                price: '',
                image: '',
                maxcount: '',
                unit: 'per day',
                customUnit: '',
                isCountable: true
            }]);
            
        } catch (error) {
            console.error("Error adding service:", error);
            const errorMessage = error.response?.data?.message || error.message || "Unknown error";
            Swal.fire("Error", `Failed to add service: ${errorMessage}`, "error");
        }
    }

    return (
        <div className="container mt-5 service-form-container">
            <div className="row g-4">
                {/* Basic Information Column */}
                <div className="col-lg-6">
                    <div className="form-section-card">
                        <h4 className="section-title">Basic Information</h4>
                        <div className="form-group">
                            <label>Service Name</label>
                            <input
                                type="text"
                                className="form-control styled-input"
                                placeholder="Enter service name"
                                value={service}
                                onChange={(e) => setService(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>Base Price</label>
                            <div className="input-group">
                                <input
                                    type="number"
                                    className="form-control styled-input"
                                    placeholder="Enter base price"
                                    value={rentPerDay}
                                    onChange={handleRentChange}
                                />
                                <select
                                    className="form-select styled-select"
                                    value={unit}
                                    onChange={handleUnitChange}
                                >
                                    <option value="per day">per day</option>
                                    <option value="per person">per person</option>
                                    <option value="per week">per week</option>
                                    <option value="per month">per month</option>
                                    <option value="per-hour">Per hour</option>
                                    <option value="per-visit">Per visit</option>
                                    <option value="per-task">Per task</option>
                                    <option value="per-project">Per project</option>
                                    <option value="per-room">Per room</option>
                                    <option value="per-session">Per session</option>
                                    <option value="per-unit">Per unit</option>
                                    <option value="per-item">Per item</option>
                                    <option value="per-event">Per event</option>
                                    <option value="per-person">Per person</option>
                                    <option value="per-km">Per km</option>
                                    <option value="per-ride">Per ride</option>
                                    <option value="per-course">Per course</option>
                                    <option value="per-service">Per service</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            {unit === "Other" && (
                                <input
                                    type="text"
                                    className="form-control mt-2 styled-input"
                                    placeholder="Custom Unit"
                                    value={customUnit}
                                    onChange={handleCustomUnitChange}
                                />
                            )}
                            <div className="d-flex align-items-center justify-content-between p-3 mt-3 border rounded bg-white shadow-sm">
                                <div>
                                    <h6 className="mb-1 fw-semibold">Quantity Selection</h6>
                                    <small className="text-muted">
                                        Allow users to select quantity for this service
                                    </small>
                                </div>
                                <div className="form-check form-switch">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="isCountableSwitch"
                                        checked={isCountable}
                                        onChange={(e) => setIsCountable(e.target.checked)}
                                        style={{
                                            width: "3rem",
                                            height: "1.5rem",
                                            cursor: "pointer",
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <textarea
                            className="form-control mt-2"
                            placeholder="Description (Enter each point on a new line)"
                            value={descriptionPoints}
                            onChange={(e) => setDescriptionPoints(e.target.value)}
                            rows={3}
                        />
                        
                        <input
                            type="text"
                            className="form-control mt-2"
                            placeholder="Phone Number"
                            value={phonenumber}
                            onChange={(e) => setPhonenumber(e.target.value)}
                        />
                        
                        <input
                            type="text"
                            className="form-control mt-2"
                            placeholder="Company Name"
                            value={companyname}
                            onChange={(e) => setCompanyName(e.target.value)}
                        />
                    </div>
                </div>

                {/* Additional Information Column */}
                <div className="col-lg-6">
                    <div className="form-section-card">
                        <h4 className="section-title">Additional Details</h4>
                        
                        <div className="form-group">
                            <label>Main Service Location *</label>
                            <LocationSearch
                                onLocationSelect={handleLocationSelect}
                                placeholder="Enter your main service location..."
                            />
                            {address && (
                                <div className="alert alert-success mt-2 small">
                                    ✓ Main service location: <strong>{address.split(',')[0]}</strong>
                                </div>
                            )}
                        </div>

                        <textarea
                            className="form-control mt-2"
                            placeholder="Facilities (Enter each facility on a new line)"
                            value={facilityPoints}
                            onChange={(e) => setFacilityPoints(e.target.value)}
                            rows={3}
                        />
                        
                        <div className="form-group">
                            <label>Image URLs</label>
                            <div className="image-input-group">
                                <input
                                    type="text"
                                    className="form-control styled-input"
                                    placeholder="Image URL 1"
                                    value={image1}
                                    onChange={(e) => setImage1(e.target.value)}
                                />
                                <input
                                    type="text"
                                    className="form-control mt-2"
                                    placeholder="Image URL 2"
                                    value={image2}
                                    onChange={(e) => setImage2(e.target.value)}
                                />
                                <input
                                    type="text"
                                    className="form-control mt-2"
                                    placeholder="Image URL 3"
                                    value={image3}
                                    onChange={(e) => setImage3(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <select
                            className="form-control mt-2"
                            value={category}
                            onChange={handleCategoryChange}
                        >
                            <option value="">Select Category</option>
                            {Object.keys(categoryOptions).map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        {category && (
                            <select
                                className="form-control mt-2"
                                value={subCategory}
                                onChange={handleSubCategoryChange}
                            >
                                <option value="">Select Subcategory</option>
                                {categoryOptions[category]?.map((item) => (
                                    <option key={item} value={item}>{item}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    
                    <div>
                        <select
                            className="form-control mt-2"
                            value={bookingType}
                            onChange={(e) => setBookingType(e.target.value)}
                        >
                            <option value="Automatic Booking">Automatic Booking</option>
                            <option value="Manual Booking">Manual Booking</option>
                            <option value="Inquari Booking">Inquari Booking</option>
                        </select>
                    </div>
                </div>

                {/* Combined Location Features Section */}
                <div className="col-md-12">
                    <div className="card p-3 mb-3">
                        <div className="row">
                            {/* Location Type Section - Original Functionality */}
                            <div className="col-12 col-md-6 mb-3">
                                <div className="card h-100 border-0 shadow-sm">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h5 className="mb-0">Location Type</h5>
                                            <button
                                                className="btn btn-outline-primary btn-sm"
                                                onClick={() => setShowLocationOptions(!showLocationOptions)}
                                            >
                                                {showLocationOptions ? "Hide" : "Configure"}
                                            </button>
                                        </div>
                                        {showLocationOptions && (
                                            <div>
                                                <div className="alert alert-info small mb-3">
                                                    Define how this service handles locations (Simple, No Location, or Rental)
                                                </div>
                                                
                                                <div className="d-flex gap-2 flex-wrap mb-3">
                                                    {["Simple", "No", "Rental"].map((type) => {
                                                        const label =
                                                            type === "Simple"
                                                                ? "Single Location"
                                                                : type === "No"
                                                                    ? "No Location Required"
                                                                    : "Rental Location";

                                                        return (
                                                            <button
                                                                key={type}
                                                                type="button"
                                                                className={`btn rounded-pill px-4 fw-semibold ${selectedLocationType === type
                                                                    ? "btn-primary shadow-sm"
                                                                    : "btn-outline-primary"
                                                                    }`}
                                                                onClick={() => setSelectedLocationType(type)}
                                                            >
                                                                {label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {selectedLocationType && (
                                                    <div className="alert alert-primary py-2 px-3 small mb-3">
                                                        <strong>Selected Mode:</strong>{" "}
                                                        {selectedLocationType === "Simple" && "Single Location"}
                                                        {selectedLocationType === "No" && "No Location Required"}
                                                        {selectedLocationType === "Rental" && "Rental Location"}
                                                    </div>
                                                )}

                                                {selectedLocationType && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-success w-100 fw-semibold mb-3 shadow-sm"
                                                        onClick={handleAddLocation}
                                                    >
                                                        {locations.length > 0 ? "Add Another Location Type" : "Add Location Type"}
                                                    </button>
                                                )}

                                                {locations.length > 0 && (
                                                    <div>
                                                        <h6 className="fw-semibold text-dark mb-2">
                                                            Configured Location Types
                                                        </h6>
                                                        <div className="list-group list-group-flush">
                                                            {locations.map((location, index) => (
                                                                <div
                                                                    key={index}
                                                                    className="list-group-item d-flex justify-content-between align-items-center bg-white rounded mb-2 shadow-sm"
                                                                >
                                                                    <span className="fw-medium text-dark">
                                                                        {location === "Simple" ? "Single Location" : 
                                                                         location === "No" ? "No Location Required" : 
                                                                         "Rental Location"}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-outline-danger btn-sm rounded-pill"
                                                                        onClick={() => setLocations(locations.filter((_, i) => i !== index))}
                                                                    >
                                                        Remove
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Location Pricing Section - New Functionality */}
                            <div className="col-12 col-md-6 mb-3">
                                <div className="card h-100 border-0 shadow-sm">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h5 className="mb-0">Location-Based Pricing</h5>
                                            <button
                                                className="btn btn-outline-primary btn-sm"
                                                onClick={() => setShowLocationPricing(!showLocationPricing)}
                                            >
                                                {showLocationPricing ? "Hide" : "Add Locations"}
                                            </button>
                                        </div>
                                        
                                        {showLocationPricing && (
                                            <div>
                                                <div className="alert alert-info small mb-3">
                                                    Add locations where this service is offered with specific pricing
                                                </div>
                                                
                                                {/* Add New Location */}
                                                <div className="border rounded-4 p-3 mb-4 bg-light">
                                                    <h6 className="fw-bold mb-3">Add Service Location</h6>
                                                    
                                                    <div className="mb-3">
                                                        <label className="form-label">Select Location</label>
                                                        <LocationSearch
                                                            onLocationSelect={handleLocationNameSelect}
                                                            placeholder="Search for a city or area..."
                                                        />
                                                    </div>
                                                    
                                                    <div className="mb-3">
                                                        <label className="form-label">Extra Price Adjustment</label>
                                                        <div className="input-group">
                                                            <span className="input-group-text">₹</span>
                                                            <input
                                                                type="number"
                                                                className="form-control"
                                                                placeholder="Extra amount (e.g., 200)"
                                                                value={currentLocation.extraPrice}
                                                                onChange={handleExtraPriceChange}
                                                            />
                                                            <span className="input-group-text">per {unit === "Other" ? customUnit || "unit" : unit.replace("per ", "")}</span>
                                                        </div>
                                                        <small className="text-muted">
                                                            Final price = Base Price (₹{rentPerDay || 0}) + Extra Price
                                                        </small>
                                                    </div>
                                                    
                                                    {/* Optional Inputs Extra Pricing */}
                                                    {inputs.filter(inp => inp.name).length > 0 && (
                                                        <div className="mb-3">
                                                            <label className="form-label">Optional Services Extra Pricing</label>
                                                            {inputs.filter(inp => inp.name).map((input, idx) => (
                                                                <div key={idx} className="input-group mb-2">
                                                                    <span className="input-group-text">{input.name}</span>
                                                                    <span className="input-group-text">Base: ₹{input.price}</span>
                                                                    <span className="input-group-text">+</span>
                                                                    <input
                                                                        type="number"
                                                                        className="form-control"
                                                                        placeholder="Extra amount"
                                                                        value={currentLocation.optionalInputsExtra.find(
                                                                            item => item.inputName === input.name
                                                                        )?.extraPrice || 0}
                                                                        onChange={(e) => handleOptionalInputExtraChange(
                                                                            input.name,
                                                                            parseFloat(e.target.value) || 0
                                                                        )}
                                                                    />
                                                                    <span className="input-group-text">per {input.unit === "Other" ? input.customUnit || "unit" : input.unit.replace("per ", "")}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    <button
                                                        className="btn btn-success w-100"
                                                        onClick={addLocationToService}
                                                    >
                                                        + Add This Location
                                                    </button>
                                                </div>
                                                
                                                {/* Locations List */}
                                                {locationsList.length > 0 && (
                                                    <div>
                                                        <h6 className="fw-bold mb-3">Service Locations ({locationsList.length})</h6>
                                                        <div className="list-group">
                                                            {locationsList.map((location, index) => (
                                                                <div key={index} className="list-group-item">
                                                                    <div className="d-flex justify-content-between align-items-start">
                                                                        <div className="flex-grow-1">
                                                                            <div className="fw-bold">{location.locationName}</div>
                                                                            <div className="small text-muted">{location.locationAddress}</div>
                                                                            <div className="mt-2">
                                                                                <span className="badge bg-primary me-2">
                                                                                    Extra: ₹{location.extraPrice}
                                                                                </span>
                                                                                <span className="badge bg-success">
                                                                                    Total: ₹{(parseFloat(rentPerDay) || 0) + location.extraPrice}
                                                                                </span>
                                                                            </div>
                                                                            {location.optionalInputsExtra.length > 0 && (
                                                                                <div className="mt-2">
                                                                                    <small className="text-muted">Optional extras:</small>
                                                                                    {location.optionalInputsExtra.map((opt, optIdx) => (
                                                                                        <span key={optIdx} className="badge bg-info ms-1">
                                                                                            {opt.inputName}: +₹{opt.extraPrice}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <button
                                                                            className="btn btn-danger btn-sm"
                                                                            onClick={() => removeLocation(index)}
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Optional Inputs Section */}
                <div className="col-md-12">
                    <div className="card p-3 mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="mb-0">Optional Inputs</h5>
                            <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => setShowOptionalInputs(!showOptionalInputs)}
                            >
                                {showOptionalInputs ? "Hide" : "Add"}
                            </button>
                        </div>
                        
                        {showOptionalInputs && (
                            <div className="mt-4">
                                {inputs.map((input, index) => (
                                    <div key={index} className="border rounded-4 mb-3 bg-white">
                                        <div className="p-4">
                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <label className="form-label">Service Name</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={input.name}
                                                        placeholder="Optional input name"
                                                        onChange={(e) => handleInputChange(index, "name", e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label">Base Price</label>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        value={input.price}
                                                        placeholder="Price"
                                                        onChange={(e) => handleInputChange(index, "price", e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label">Unit</label>
                                                    <select
                                                        className="form-select"
                                                        value={input.unit}
                                                        onChange={(e) => handleInputChange(index, "unit", e.target.value)}
                                                    >
                                                        <option value="per day">Per Day</option>
                                                        <option value="per person">Per Person</option>
                                                        <option value="per hour">Per Hour</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                                {input.unit === "Other" && (
                                                    <div className="col-md-2">
                                                        <label className="form-label">Custom Unit</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={input.customUnit}
                                                            placeholder="per item"
                                                            onChange={(e) => handleInputChange(index, "customUnit", e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-3">
                                                <label className="form-label">Image URL</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={input.image}
                                                    placeholder="https://..."
                                                    onChange={(e) => handleInputChange(index, "image", e.target.value)}
                                                />
                                            </div>
                                            <hr className="my-4" />
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <h6 className="fw-semibold mb-0">Quantity Control</h6>
                                                    <small className="text-muted">Allow customers to choose quantity</small>
                                                </div>
                                                <div className="form-check form-switch">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        checked={input.isCountable !== false}
                                                        onChange={(e) => {
                                                            handleInputChange(index, "isCountable", e.target.checked);
                                                            if (!e.target.checked) {
                                                                handleInputChange(index, "maxcount", "");
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            {input.isCountable !== false && (
                                                <div className="col-md-4 mt-3">
                                                    <label className="form-label">Maximum Quantity</label>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        value={input.maxcount || ""}
                                                        placeholder="e.g. 10"
                                                        onChange={(e) => handleInputChange(index, "maxcount", e.target.value)}
                                                        min="1"
                                                        max="100"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    className="btn btn-outline-primary fw-semibold mt-2"
                                    onClick={handleAddInput}
                                >
                                    + Add Optional Service
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="col-md-12 text-center">
                    <button className="btn btn-primary btn-lg" onClick={addService}>
                        ADD SERVICE
                    </button>
                </div>
            </div>
        </div>
    );
}