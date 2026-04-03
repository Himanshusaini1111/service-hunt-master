import React, { useState } from 'react';
import { Menu, Dropdown, Button } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import axios from 'axios';
import Swal from 'sweetalert2';
import LocationSearch from './LocationSearch'; // Adjust path as needed
import { areasMatch } from '../utils/serviceAreaPricing';

export function Addservice({ userId }) { // Accept userId as prop
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
    const [selectedOption, setSelectedOption] = useState("Select Option");
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
        isCountable: true,
        areaExtras: []
    }]);


    const [category, setCategory] = useState("");
    const [subCategory, setSubCategory] = useState("");
    const [bookingType, setBookingType] = useState("Automatic Booking");
    const [descriptionPoints, setDescriptionPoints] = useState("");
    const [facilityPoints, setFacilityPoints] = useState("");
    // Add state variables at the top of the component
    const [showOptionalInputs, setShowOptionalInputs] = useState(false);
    const [showLocationOptions, setShowLocationOptions] = useState(false);
    const [selectedLocationType, setSelectedLocationType] = useState("");
    const [locations, setLocations] = useState([]);

  
    const categoryOptions = {
        "Home Maintenance & Repair Services": [
            "Plumbing Services",
            "Electrical Repairs",
            "Carpentry and Woodwork",
            "Painting and Wallpapering",
            "Appliance Repair",
            "Pest Control",
            "Roof Repair and Waterproofing",
            "Flooring and Tile Repair",
            "HVAC Maintenance",
            "Home Cleaning",
            "Furniture Assembly",
            "Glass and Mirror Repair",
            "Smart Home Setup"
        ],
        "Event & Party Planning Services": [
            "Wedding Planning",
            "Birthday Party Planning",
            "Corporate Event Planning",
            "Catering Service",
            "Decor and Theme Setup",
            "Photography and Videography",
            "Entertainment",
            "Venue Booking",
            "Invitation Design",
            "Sound and Lighting Setup"
        ],
        "Entertainment & Ticket Booking": [
            "Movie Ticket Booking",
            "Concert and Show Tickets",
            "Sports Event Tickets",
            "Amusement Park Tickets",
            "Theater and Play Tickets",
            "Event Passes",
            "Online Streaming Subscriptions",
            "Gaming Zone Access"
        ],
        "Health & Wellness Services": [
            "Gym Memberships",
            "Yoga and Meditation Classes",
            "Diet and Nutrition Counseling",
            "Spa and Massage Services",
            "Physiotherapy",
            "Mental Health Counseling",
            "Home Healthcare",
            "Personal Training",
            "Wellness Retreats"
        ],
        "Transportation & Travel Services": [
            "Cab and Taxi Services",
            "Car Rental",
            "Airport Transfers",
            "Bus and Train Ticket Bookings",
            "Flight Ticket Booking",
            "Tour Packages",
            "Bike Rentals"
        ],
        "Education & Skill Development": [
            "Online Courses",
            "Tutoring Services",
            "Workshops and Webinars",
            "Certification Programs",
            "Test Preparation",
            "Language Classes",
            "Career Counseling"
        ],
        "Property & Space Rental": [
            "Office Space Rental",
            "Event Venue Booking",
            "Vacation Rentals",
            "Warehouse Rental",
            "Shop Rental",
            "Furniture Rental"
        ],
        "Auto & Vehicle Services": [
            "Car Wash and Detailing",
            "Vehicle Repair",
            "Towing Services",
            "Bike Servicing",
            "Tire Replacement",
            "Battery Replacement",
            "Insurance Renewal"
        ],
        "Home Shifting & Moving Services": [
            "Packing and Moving",
            "Transportation Services",
            "Packing Material Supply",
            "Storage Solutions",
            "Pet Relocation",
            "International Relocation"
        ],
        "Religious & Pooja Services": [
            "Pooja Arrangements",
            "Temple Visits",
            "Religious Event Planning",
            "Astrology Services",
            "Religious Item Delivery"
        ],
        "Agriculture & Farming Services": [
            "Farm Equipment Rental",
            "Crop Consulting",
            "Organic Farming Supplies",
            "Irrigation Solutions",
            "Farm Labor Services"
        ],
        "Emergency & On-Demand Services": [
            "Ambulance Services",
            "Locksmith Services",
            "Electrician on Call",
            "Plumber on Call",
            "Medical Assistance",
            "Towing Services"
        ],
        "Security & Surveillance Services": [
            "CCTV Installation",
            "Security Guards",
            "Alarm Systems",
            "Smart Locks",
            "Cybersecurity Services"
        ],
        "Senior Citizen & Special Care Services": [
            "Home Nursing Care",
            "Physiotherapy",
            "Companion Services",
            "Medical Equipment Rental",
            "Meal Delivery"
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
                isCountable: true,
                areaExtras: []
            }]);
        }
    };
    // Update the input change handlers
    const handleInputChange = (index, field, value) => {
        const newInputs = [...inputs];
        newInputs[index][field] = value;

        // Reset customUnit if unit changes from 'Other'
        if (field === 'unit' && value !== 'Other') {
            newInputs[index].customUnit = '';
        }

        // Reset maxcount if isCountable is false
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
    const handleAddLocation = () => {
        if (selectedLocationType) {
            setLocations([...locations, selectedLocationType]);
            setSelectedLocationType("");
            setShowLocationOptions(false);
        }
    };

    // In the addService function of Addservice.js
    // In Addservice.js - Update the component to accept userId


    async function addService() {
        // Process description points into a single string
        const formattedDescription = descriptionPoints
            .split('\n')
            .filter(point => point.trim() !== '')
            .map(point => point.startsWith('→') ? point : `→ ${point}`)
            .join('\n');

        // Process facility points into a single string
        const formattedFacility = facilityPoints
            .split('\n')
            .filter(point => point.trim() !== '')
            .map(point => point.startsWith('→') ? point : `→ ${point}`)
            .join('\n');

        // Validate locations
        if (locations.length === 0) {
            Swal.fire("Error", "Please add at least one location", "error");
            return;
        }

        // Validate required fields (add more checks if needed)
        if (!service || !image1 || !image2 || !image3 || !formattedFacility || !category) {
            Swal.fire("Error", "Please fill in the required fields: Service name, at least 3 images, facility points, and category.", "error");
            return;
        }

        const imageURLs = [image1, image2, image3];

// Filter out empty optional inputs
const validOptionalInputs = inputs.filter(input => 
    input.name && input.name.trim() !== '' && input.price
).map(input => ({
    name: input.name,
    price: input.price,
    image: input.image,
    maxcount: input.maxcount || null,
    unit: input.unit,
    customUnit: input.unit === "Other" ? input.customUnit : "",
    isCountable: input.isCountable !== false
}));

        const payload = {
            service,
            rentperday: rentPerDay,
            unit,
            customUnit: unit === "Other" ? customUnit : "",
            isCountable: isCountable !== false,
            description: formattedDescription,
            phonenumber,
            companyname,
            address,
            facility: formattedFacility,
            imageURLs, // Ensure this is an array
            // In Addservice.js, when creating the payload for optional inputs
    optionalInputs: validOptionalInputs, // Use the filtered array here

            category,
            subCategory,
            bookingType,
            locations,
        };

        try {
            // Include userid in the query string (required by backend)
            const response = await axios.post(`/api/service/addservice?userid=${userId}`, payload, {
                headers: { "Content-Type": "application/json" },
            });
            Swal.fire("Success", "Service added successfully!", "success");
        } catch (error) {
            console.error("Error adding service:", error);
            // Show specific backend message if available
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
                                placeholder={`Enter ${selectedOption} name`}
                                value={service}
                                onChange={(e) => setService(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>Pricing</label>
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="form-control styled-input"
                                    placeholder="Enter price"
                                    value={rentPerDay}
                                    onChange={handleRentChange}
                                />
                                <select
                                    className="form-select styled-select"
                                    value={unit}
                                    onChange={handleUnitChange}
                                    style={{ marginTop: "10px" }}
                                >

                                    <option value="per day">per day</option>
                                    <option value="per person">per person</option>
                                    <option value="per week">per sq feet</option>
                                    <option value="per month">per month</option>
                                    <option value="per-hour">Per hour</option>
                                    <option value="per-visit">Per visit</option>
                                    <option value="per-fixture">Per fixture</option>
                                    <option value="per-task">Per task</option>
                                    <option value="per-project">Per project</option>
                                    <option value="per-square-foot-meter">Per square foot/meter</option>
                                    <option value="per-room">Per room</option>
                                    <option value="per-appliance">Per appliance</option>
                                    <option value="per-session">Per session</option>
                                    <option value="per-property-size-sq-ft">Per property size (sq ft)</option>
                                    <option value="per-square-meter">Per square meter</option>
                                    <option value="per-tile">Per tile</option>
                                    <option value="per-unit">Per unit</option>
                                    <option value="per-item">Per item</option>
                                    <option value="per-panel">Per panel</option>
                                    <option value="per-device">Per device</option>
                                    <option value="per-event">Per event</option>
                                    <option value="per-guest">Per guest</option>
                                    <option value="per-attendee">Per attendee</option>
                                    <option value="per-person">Per person</option>
                                    <option value="per-dish">Per dish</option>
                                    <option value="per-100-invites">Per 100 invites</option>
                                    <option value="per-system">Per system</option>
                                    <option value="per-ticket">Per ticket</option>
                                    <option value="per-day-pass">Per day pass</option>
                                    <option value="per-pass">Per pass</option>
                                    <option value="per-month">Per month</option>
                                    <option value="per-class">Per class</option>
                                    <option value="per-package">Per package</option>
                                    <option value="per-km">Per km</option>
                                    <option value="per-ride">Per ride</option>
                                    <option value="per-day">Per day</option>
                                    <option value="per-trip">Per trip</option>
                                    <option value="per-course">Per course</option>
                                    <option value="per-subject">Per subject</option>
                                    <option value="per-program">Per program</option>
                                    <option value="per-test">Per test</option>
                                    <option value="per-level">Per level</option>
                                    <option value="per-square-foot-month">Per square foot/month</option>
                                    <option value="per-item-month">Per item/month</option>
                                    <option value="per-vehicle">Per vehicle</option>
                                    <option value="per-wash-type">Per wash type</option>
                                    <option value="per-service">Per service</option>
                                    <option value="per-policy">Per policy</option>
                                    <option value="per-box">Per box</option>
                                    <option value="per-load">Per load</option>
                                    <option value="per-pet">Per pet</option>
                                    <option value="per-container">Per container</option>
                                    <option value="per-ritual">Per ritual</option>
                                    <option value="per-pilgrimage-package">Per pilgrimage package</option>
                                    <option value="per-machine">Per machine</option>
                                    <option value="per-acre">Per acre</option>
                                    <option value="per-kg">Per kg</option>
                                    <option value="per-worker">Per worker</option>
                                    <option value="per-guard-day">Per guard/day</option>
                                    <option value="per-camera">Per camera</option>
                                    <option value="per-meal">Per meal</option>
                                    <option value="per-week">Per week</option>
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
                            placeholder={`Phone Number ${selectedOption}`}
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
                            <label>Location</label>
                            <LocationSearch
                                onLocationSelect={(location) => setAddress(location.display_name)} />

                        </div>
                    

                        <textarea
                            className="form-control mt-2"
                            placeholder="Facilities (Enter each facility on a new line)"
                            value={facilityPoints}
                            onChange={(e) => setFacilityPoints(e.target.value)}
                            rows={3}
                        />
                        {/* Image URL inputs */}
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
                            </div></div>
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

                <div className="col-md-12">
                    <div className="card p-3 mb-3">
                        {/* Combined Header Row */}
                        <div className="row">
                            {/* Optional Inputs Section */}
                            <div className="col-12 col-md-4 mb-3">
                                <div className="card h-100">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h5 className="mb-0">Optional Inputs</h5>
                                            <button
                                                className="btn btn-outline-primary btn-sm"
                                                onClick={() => setShowOptionalInputs(!showOptionalInputs)}
                                            >
                                                {showOptionalInputs ? (
                                                    <>
                                                        <i className="fas fa-eye-slash me-2"></i>
                                                        Hide
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fas fa-plus me-2"></i>
                                                        Add
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        {showOptionalInputs && (
                                            <div className="alert alert-info small mb-0">
                                                Add optional additional services or features
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>


                            {/* Location Section */}
                            <div className="col-12 col-md-4 mb-3">
                                <div className="card h-100">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h5 className="mb-0">Location</h5>
                                            <button
                                                className="btn btn-outline-primary btn-sm"
                                                onClick={() => setShowLocationOptions(!showLocationOptions)}
                                            >
                                                {showLocationOptions ? (
                                                    <>
                                                        <i className="fas fa-eye-slash me-2"></i>
                                                        Hide
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fas fa-map-marker-alt me-2"></i>
                                                        Add
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        {showLocationOptions && (
                                            <div className="alert alert-info small mb-0">
                                                Configure location-based options
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>


                        {showOptionalInputs && (
                            <div className="mt-4">

                                {inputs.map((input, index) => (
                                    <div key={index} className="border rounded-4 mb-3 bg-white">

                                        {/* Header */}
                                        <div
                                            className="d-flex justify-content-between align-items-center p-3"
                                            style={{ cursor: "pointer" }}
                                            data-bs-toggle="collapse"
                                            data-bs-target={`#optional-${index}`}
                                        >
                                            <div>
                                                <h6 className="mb-0 fw-semibold">
                                                    {input.name || `Optional Service ${index + 1}`}
                                                </h6>
                                                <small className="text-muted">
                                                    {input.price
                                                        ? `₹${input.price} ${input.unit || ""}`
                                                        : "No pricing set"}
                                                </small>
                                            </div>

                                            <span className="badge bg-light text-dark">
                                                Optional
                                            </span>
                                        </div>

                                        {/* Body */}
                                        <div id={`optional-${index}`} className="collapse show">
                                            <div className="p-4 border-top">

                                                {/* Row 1 */}
                                                <div className="row g-3">
                                                    <div className="col-md-4">
                                                        <label className="form-label">Service Name</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={input.name}
                                                            placeholder="Optional input name"
                                                            onChange={(e) =>
                                                                handleInputChange(index, "name", e.target.value)
                                                            }
                                                        />
                                                    </div>

                                                    <div className="col-md-3">
                                                        <label className="form-label">Price</label>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            value={input.price}
                                                            placeholder="Price"
                                                            onChange={(e) =>
                                                                handleInputChange(index, "price", e.target.value)
                                                            }
                                                        />
                                                    </div>

                                                    <div className="col-md-3">
                                                        <label className="form-label">Unit</label>
                                                        <select
                                                            className="form-select"
                                                            value={input.unit}
                                                            onChange={(e) =>
                                                                handleInputChange(index, "unit", e.target.value)
                                                            }
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
                                                                onChange={(e) =>
                                                                    handleInputChange(index, "customUnit", e.target.value)
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Image */}
                                                <div className="mt-3">
                                                    <label className="form-label">Image URL</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={input.image}
                                                        placeholder="https://..."
                                                        onChange={(e) =>
                                                            handleInputChange(index, "image", e.target.value)
                                                        }
                                                    />
                                                </div>

                                                {/* Divider */}
                                                <hr className="my-4" />

                                                {/* Quantity */}
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <h6 className="fw-semibold mb-0">Quantity Control</h6>
                                                        <small className="text-muted">
                                                            Allow customers to choose quantity
                                                        </small>
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
                                                            onChange={(e) =>
                                                                handleInputChange(index, "maxcount", e.target.value)
                                                            }
                                                            min="1"
                                                            max="100"
                                                        />
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Add Button */}
                                <button
                                    className="btn btn-outline-primary fw-semibold mt-2"
                                    onClick={handleAddInput}
                                >
                                    + Add Optional Service
                                </button>

                            </div>
                        )}


                        {/* Extra Inputs Section */}

                        {showLocationOptions && (
                            <div className="card border-0 shadow-sm mt-3 bg-light">
                                <div className="card-body">

                                    {/* Title */}
                                    <div className="mb-3">
                                        <h6 className="fw-bold mb-1 text-primary">
                                            Service Location Settings
                                        </h6>
                                        <small className="text-secondary">
                                            Define how location applies to this service
                                        </small>
                                    </div>

                                    {/* Location Type Selector */}
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

                                    {/* Selected Mode Info */}
                                    {selectedLocationType && (
                                        <div className="alert alert-primary py-2 px-3 small mb-3">
                                            <strong>Selected Mode:</strong>{" "}
                                            {selectedLocationType === "Simple" && "Single Location"}
                                            {selectedLocationType === "No" && "No Location Required"}
                                            {selectedLocationType === "Rental" && "Rental Location"}
                                        </div>
                                    )}

                                    {/* Add Location Button */}
                                    {selectedLocationType && (
                                        <button
                                            className="btn btn-success w-100 fw-semibold mb-3 shadow-sm"
                                            onClick={handleAddLocation}
                                        >
                                            {locations.length > 0 ? "Add Another Location" : "Add Location"}
                                        </button>
                                    )}

                                    {/* Configured Locations */}
                                    {locations.length > 0 && (
                                        <div>
                                            <h6 className="fw-semibold text-dark mb-2">
                                                Configured Locations
                                            </h6>

                                            <div className="list-group list-group-flush">
                                                {locations.map((location, index) => (
                                                    <div
                                                        key={index}
                                                        className="list-group-item d-flex justify-content-between align-items-center bg-white rounded mb-2 shadow-sm"
                                                    >
                                                        <span className="fw-medium text-dark">
                                                            {location}
                                                        </span>

                                                        <button
                                                            className="btn btn-outline-danger btn-sm rounded-pill"
                                                            onClick={() => setLocations([])}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        )}

                    </div>
                </div>


                <div className="col-md-12 text-center">
                    <button className="btn btn-primary" onClick={addService}>
                        ADD Service
                    </button>
                </div>
            </div>

        </div>

    )
}