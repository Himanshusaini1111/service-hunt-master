// Addservice.js - Updated with multiple units

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import LocationSearch from './LocationSearch';

export function Addservice({ userId }) {
    const [service, setService] = useState("");
    const [description, setDescription] = useState("");
    const [phonenumber, setPhonenumber] = useState("");
    const [companyname, setCompanyName] = useState("");
    const [address, setAddress] = useState("");
    const [facility, setFacility] = useState("");
    
    // Image states
    const [image1, setImage1] = useState("");
    const [image2, setImage2] = useState("");
    const [image3, setImage3] = useState("");
    const [imageFile1, setImageFile1] = useState(null);
    const [imageFile2, setImageFile2] = useState(null);
    const [imageFile3, setImageFile3] = useState(null);
    const [imagePreview1, setImagePreview1] = useState("");
    const [imagePreview2, setImagePreview2] = useState("");
    const [imagePreview3, setImagePreview3] = useState("");
    const [uploading, setUploading] = useState(false);
    
    // NEW: Multiple pricing units
    const [pricingUnits, setPricingUnits] = useState([
        { 
            unit: 'per day', 
            price: '', 
            customUnit: '', 
            isDefault: true,
            isCountable: true,
            maxQuantityPerDay: '',
            maxUsersPerDay: '',
            description: ''
        }
    ]);
    const [showUnitControls, setShowUnitControls] = useState(false);
    
    // Optional inputs
    const [inputs, setInputs] = useState([{
        name: '',
        price: '',
        image: '',
        maxcount: '',
        unit: 'per day',
        customUnit: '',
        isCountable: true
    }]);
    
    const [optionalInputImages, setOptionalInputImages] = useState({});
    const [optionalInputPreviews, setOptionalInputPreviews] = useState({});
    const [category, setCategory] = useState("");
    const [subCategory, setSubCategory] = useState("");
    const [bookingType, setBookingType] = useState("Automatic Booking");
    const [descriptionPoints, setDescriptionPoints] = useState("");
    const [facilityPoints, setFacilityPoints] = useState("");
    const [showOptionalInputs, setShowOptionalInputs] = useState(false);
    
    // Location states
    const [showLocationOptions, setShowLocationOptions] = useState(false);
    const [selectedLocationType, setSelectedLocationType] = useState("");
    const [locations, setLocations] = useState([]);
    const [showLocationPricing, setShowLocationPricing] = useState(false);
    const [locationsList, setLocationsList] = useState([]);
    const [currentLocation, setCurrentLocation] = useState({
        locationName: '',
        locationAddress: '',
        extraPrice: 0,
        optionalInputsExtra: []
    });
    const [locationAdded, setLocationAdded] = useState(false);

    const categoryOptions = {
        "Home Maintenance & Repair Services": [
            "Plumbing Services", "Electrical Repairs", "Carpentry and Woodwork",
            "Painting and Wallpapering", "Appliance Repair", "Pest Control",
            "Roof Repair and Waterproofing", "Flooring and Tile Repair",
            "HVAC Maintenance", "Home Cleaning", "Furniture Assembly",
            "Glass and Mirror Repair", "Smart Home Setup"
        ],
        "Event & Party Planning Services": [
            "Wedding Planner"
        ]
    };

    // Unit options
    const unitOptions = [
        'per day', 'per hour', 'per service', 'per person', 'per week', 
        'per month', 'per visit', 'per task', 'per project', 'per room', 
        'per session', 'per unit', 'per item', 'per event', 'per km', 'Other'
    ];

    // Handle adding a new pricing unit
    const handleAddPricingUnit = () => {
        if (pricingUnits.length < 10) {
            setPricingUnits([
                ...pricingUnits,
                { 
                    unit: 'per day', 
                    price: '', 
                    customUnit: '', 
                    isDefault: false,
                    isCountable: true,
                    maxQuantityPerDay: '',
                    maxUsersPerDay: '',
                    description: ''
                }
            ]);
        }
    };

    // Handle removing a pricing unit
    const handleRemovePricingUnit = (index) => {
        if (pricingUnits.length > 1) {
            const newUnits = pricingUnits.filter((_, i) => i !== index);
            // If we removed the default unit, make the first one default
            if (pricingUnits[index].isDefault && newUnits.length > 0) {
                newUnits[0].isDefault = true;
            }
            setPricingUnits(newUnits);
        }
    };

    // Handle pricing unit change
    const handlePricingUnitChange = (index, field, value) => {
        const newUnits = [...pricingUnits];
        
        if (field === 'unit' && value !== 'Other') {
            newUnits[index].customUnit = '';
        }
        
        newUnits[index][field] = value;
        
        // If setting this as default, unset others
        if (field === 'isDefault' && value === true) {
            newUnits.forEach((unit, i) => {
                if (i !== index) unit.isDefault = false;
            });
        }
        
        setPricingUnits(newUnits);
    };

    // Get available booking types for a unit
    const getAvailableBookingTypes = (unitType) => {
        const fullBookingUnits = ['per day', 'per person', 'per week', 'per month', 'per visit', 'per task', 'per project', 'per room', 'per session', 'per unit', 'per item', 'per event', 'per service'];
        const inquireOnlyUnits = ['per hour', 'per km', 'Other'];
        
        if (fullBookingUnits.includes(unitType)) {
            return ['Automatic Booking', 'Manual Booking', 'Inquari Booking'];
        } else if (inquireOnlyUnits.includes(unitType)) {
            return ['Inquari Booking'];
        }
        return ['Automatic Booking', 'Manual Booking', 'Inquari Booking'];
    };

    // Image handling functions
    const handleImageFileSelect = (imageNumber, file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire("Error", "Image size should be less than 5MB", "error");
            return;
        }
        if (!file.type.startsWith('image/')) {
            Swal.fire("Error", "Please select an image file", "error");
            return;
        }
        const previewUrl = URL.createObjectURL(file);
        switch (imageNumber) {
            case 1:
                setImageFile1(file);
                setImagePreview1(previewUrl);
                setImage1("");
                break;
            case 2:
                setImageFile2(file);
                setImagePreview2(previewUrl);
                setImage2("");
                break;
            case 3:
                setImageFile3(file);
                setImagePreview3(previewUrl);
                setImage3("");
                break;
            default:
                break;
        }
    };

    const handleImageUrlChange = (imageNumber, url) => {
        switch (imageNumber) {
            case 1:
                setImage1(url);
                setImageFile1(null);
                if (imagePreview1) {
                    URL.revokeObjectURL(imagePreview1);
                    setImagePreview1("");
                }
                break;
            case 2:
                setImage2(url);
                setImageFile2(null);
                if (imagePreview2) {
                    URL.revokeObjectURL(imagePreview2);
                    setImagePreview2("");
                }
                break;
            case 3:
                setImage3(url);
                setImageFile3(null);
                if (imagePreview3) {
                    URL.revokeObjectURL(imagePreview3);
                    setImagePreview3("");
                }
                break;
            default:
                break;
        }
    };

    const removeImage = (imageNumber) => {
        switch (imageNumber) {
            case 1:
                setImage1("");
                setImageFile1(null);
                if (imagePreview1) {
                    URL.revokeObjectURL(imagePreview1);
                    setImagePreview1("");
                }
                break;
            case 2:
                setImage2("");
                setImageFile2(null);
                if (imagePreview2) {
                    URL.revokeObjectURL(imagePreview2);
                    setImagePreview2("");
                }
                break;
            case 3:
                setImage3("");
                setImageFile3(null);
                if (imagePreview3) {
                    URL.revokeObjectURL(imagePreview3);
                    setImagePreview3("");
                }
                break;
            default:
                break;
        }
    };

    const uploadImage = async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        try {
            const response = await axios.post('/api/service/upload', formData);
            return response.data.imageUrl;
        } catch (error) {
            console.error('Upload error:', error);
            throw new Error('Failed to upload image');
        }
    };

    const getImageUrl = async (imageNumber) => {
        let file = null;
        let url = "";
        switch (imageNumber) {
            case 1:
                file = imageFile1;
                url = image1;
                break;
            case 2:
                file = imageFile2;
                url = image2;
                break;
            case 3:
                file = imageFile3;
                url = image3;
                break;
            default:
                return null;
        }
        if (file) {
            return await uploadImage(file);
        } else if (url) {
            return url;
        }
        return null;
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

    const handleOptionalImageUpload = async (index, file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire("Error", "Image size should be less than 5MB", "error");
            return;
        }
        if (!file.type.startsWith('image/')) {
            Swal.fire("Error", "Please select an image file", "error");
            return;
        }
        const previewUrl = URL.createObjectURL(file);
        setOptionalInputImages(prev => ({ ...prev, [index]: file }));
        setOptionalInputPreviews(prev => ({ ...prev, [index]: previewUrl }));
        const newInputs = [...inputs];
        newInputs[index].image = '';
        setInputs(newInputs);
    };

    const handleInputChange = (index, field, value) => {
        const newInputs = [...inputs];
        if (field === 'unit' && value !== 'Other') {
            newInputs[index].customUnit = '';
        }
        newInputs[index][field] = value;
        if (field === 'isCountable' && value === false) {
            newInputs[index].maxcount = '';
        }
        setInputs(newInputs);
    };

    const handleLocationSelect = (location) => {
        setAddress(location.display_name);
    };

    const handleAddLocation = () => {
        if (selectedLocationType) {
            setLocations([selectedLocationType]);
            setLocationAdded(true);
            Swal.fire({
                icon: 'success',
                title: 'Location Type Added',
                text: `${getLocationTypeName(selectedLocationType)} has been selected for this service.`,
                timer: 2000,
                showConfirmButton: false
            });
        }
    };

    const handleRemoveLocation = () => {
        setSelectedLocationType('');
        setLocationAdded(false);
        Swal.fire({
            icon: 'info',
            title: 'Location Type Removed',
            text: 'Location type has been removed.',
            timer: 2000,
            showConfirmButton: false
        });
    };

    const getLocationTypeName = (type) => {
        switch (type) {
            case 'Simple': return 'Single Location';
            case 'No': return 'No Location Required';
            case 'Rental': return 'Multiple Locations';
            default: return '';
        }
    };

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

    // Main submit function - UPDATED for multiple units
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
        
        if (!service || (!image1 && !imageFile1) || (!image2 && !imageFile2) || (!image3 && !imageFile3) || !formattedFacility || !category) {
            Swal.fire("Error", "Please fill in the required fields: Service name, at least 3 images, facility points, and category.", "error");
            return;
        }

        // Validate pricing units
        const validUnits = pricingUnits.filter(u => u.price && parseFloat(u.price) > 0);
        if (validUnits.length === 0) {
            Swal.fire("Error", "Please add at least one pricing unit with a valid price.", "error");
            return;
        }

        // Check if there's a default unit
        const hasDefault = validUnits.some(u => u.isDefault);
        if (validUnits.length > 1 && !hasDefault) {
            // If no default, set first as default
            validUnits[0].isDefault = true;
        }

        setUploading(true);
        
        try {
            const imageUrl1 = await getImageUrl(1);
            const imageUrl2 = await getImageUrl(2);
            const imageUrl3 = await getImageUrl(3);
            const imageURLs = [imageUrl1, imageUrl2, imageUrl3];
            
            const updatedInputs = [...inputs];
            for (let i = 0; i < updatedInputs.length; i++) {
                const input = updatedInputs[i];
                const imageFile = optionalInputImages[i];
                if (imageFile) {
                    const uploadedUrl = await uploadImage(imageFile);
                    input.image = uploadedUrl;
                }
            }
            
            const validOptionalInputs = updatedInputs.filter(input =>
                input.name && input.name.trim() !== '' && input.price
            ).map(input => ({
                name: input.name,
                price: parseFloat(input.price) || 0,
                image: input.image,
                maxcount: input.maxcount || null,
                unit: input.unit,
                customUnit: input.unit === "Other" ? input.customUnit : "",
                isCountable: input.isCountable !== false,
                bookingType: bookingType
            }));
            
            // Find the default pricing unit
            const defaultUnit = validUnits.find(u => u.isDefault) || validUnits[0];
            
            const payload = {
                service,
                // Send all pricing units
                pricingUnits: validUnits.map(u => ({
                    unit: u.unit,
                    price: parseFloat(u.price),
                    customUnit: u.unit === "Other" ? u.customUnit : "",
                    isDefault: u.isDefault || false,
                    isCountable: u.isCountable !== false,
                    maxQuantityPerDay: u.maxQuantityPerDay ? parseInt(u.maxQuantityPerDay) : null,
                    maxUsersPerDay: u.maxUsersPerDay ? parseInt(u.maxUsersPerDay) : null,
                    description: u.description || ''
                })),
                // Legacy fields for backward compatibility
                rentperday: parseFloat(defaultUnit.price) || 0,
                unit: defaultUnit.unit,
                customUnit: defaultUnit.unit === "Other" ? defaultUnit.customUnit : "",
                isCountable: defaultUnit.isCountable !== false,
                maxQuantityPerDay: defaultUnit.maxQuantityPerDay ? parseInt(defaultUnit.maxQuantityPerDay) : null,
                maxUsersPerDay: defaultUnit.maxUsersPerDay ? parseInt(defaultUnit.maxUsersPerDay) : null,
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
                locations: locations,
                locationPricing: locationsList,
            };
            
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
            setImageFile1(null);
            setImageFile2(null);
            setImageFile3(null);
            setImagePreview1("");
            setImagePreview2("");
            setImagePreview3("");
            setFacilityPoints("");
            setDescriptionPoints("");
            setPhonenumber("");
            setCompanyName("");
            setCategory("");
            setSubCategory("");
            setLocations([]);
            setSelectedLocationType("");
            setLocationsList([]);
            setPricingUnits([
                { 
                    unit: 'per day', 
                    price: '', 
                    customUnit: '', 
                    isDefault: true,
                    isCountable: true,
                    maxQuantityPerDay: '',
                    maxUsersPerDay: '',
                    description: ''
                }
            ]);
            setInputs([{
                name: '',
                price: '',
                image: '',
                maxcount: '',
                unit: 'per day',
                customUnit: '',
                isCountable: true
            }]);
            setOptionalInputImages({});
            setOptionalInputPreviews({});
            
        } catch (error) {
            console.error("Error adding service:", error);
            const errorMessage = error.response?.data?.message || error.message || "Unknown error";
            Swal.fire("Error", `Failed to add service: ${errorMessage}`, "error");
        } finally {
            setUploading(false);
        }
    }

    useEffect(() => {
        return () => {
            if (imagePreview1) URL.revokeObjectURL(imagePreview1);
            if (imagePreview2) URL.revokeObjectURL(imagePreview2);
            if (imagePreview3) URL.revokeObjectURL(imagePreview3);
            Object.values(optionalInputPreviews).forEach(preview => {
                if (preview) URL.revokeObjectURL(preview);
            });
        };
    }, [imagePreview1, imagePreview2, imagePreview3, optionalInputPreviews]);

    return (
        <div className="container mt-5 service-form-container">
            <div className="row g-4">
                {/* Basic Information Column */}
                <div className="col-lg-6" style={{ padding: "0px" }}>
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
                        
                        {/* NEW: Multiple Pricing Units Section */}
                        <div className="form-group">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <label className="fw-bold">Pricing Options</label>
                                <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => setShowUnitControls(!showUnitControls)}
                                >
                                    {showUnitControls ? "Hide Options" : "Add Multiple Units"}
                                </button>
                            </div>

                            {!showUnitControls ? (
                                // Simple view - show default unit only
                                <div className="border rounded p-3 bg-light">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <label className="form-label small">Price</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                placeholder="Enter price"
                                                value={pricingUnits[0]?.price || ''}
                                                onChange={(e) => {
                                                    const newUnits = [...pricingUnits];
                                                    newUnits[0].price = e.target.value;
                                                    setPricingUnits(newUnits);
                                                }}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small">Unit</label>
                                            <select
                                                className="form-control"
                                                value={pricingUnits[0]?.unit || 'per day'}
                                                onChange={(e) => {
                                                    const newUnits = [...pricingUnits];
                                                    newUnits[0].unit = e.target.value;
                                                    if (e.target.value !== 'Other') {
                                                        newUnits[0].customUnit = '';
                                                    }
                                                    setPricingUnits(newUnits);
                                                }}
                                            >
                                                {unitOptions.map(unit => (
                                                    <option key={unit} value={unit}>{unit}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    {pricingUnits[0]?.unit === 'Other' && (
                                        <div className="mt-2">
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Custom unit (e.g., 'per service')"
                                                value={pricingUnits[0]?.customUnit || ''}
                                                onChange={(e) => {
                                                    const newUnits = [...pricingUnits];
                                                    newUnits[0].customUnit = e.target.value;
                                                    setPricingUnits(newUnits);
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Advanced view - show all pricing units
                                <div>
                                    {pricingUnits.map((unit, index) => (
                                        <div key={index} className="border rounded p-3 mb-3" style={{ backgroundColor: unit.isDefault ? '#f0f8ff' : 'white' }}>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <span className="badge bg-primary">
                                                    {unit.isDefault ? '⭐ Default' : `Option ${index + 1}`}
                                                </span>
                                                <div>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-success btn-sm me-2"
                                                        onClick={() => handlePricingUnitChange(index, 'isDefault', true)}
                                                        disabled={unit.isDefault}
                                                    >
                                                        Set as Default
                                                    </button>
                                                    {pricingUnits.length > 1 && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => handleRemovePricingUnit(index)}
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="row">
                                                <div className="col-md-6">
                                                    <label className="form-label small">Price</label>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        placeholder="Enter price"
                                                        value={unit.price}
                                                        onChange={(e) => handlePricingUnitChange(index, 'price', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label small">Unit</label>
                                                    <select
                                                        className="form-control"
                                                        value={unit.unit}
                                                        onChange={(e) => handlePricingUnitChange(index, 'unit', e.target.value)}
                                                    >
                                                        {unitOptions.map(u => (
                                                            <option key={u} value={u}>{u}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            {unit.unit === 'Other' && (
                                                <div className="mt-2">
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="Custom unit (e.g., 'per service')"
                                                        value={unit.customUnit || ''}
                                                        onChange={(e) => handlePricingUnitChange(index, 'customUnit', e.target.value)}
                                                    />
                                                </div>
                                            )}
                                            
                                            <div className="row mt-2">
                                                <div className="col-md-6">
                                                    <label className="form-label small">Max Quantity Per Day (optional)</label>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        placeholder="Unlimited"
                                                        value={unit.maxQuantityPerDay || ''}
                                                        onChange={(e) => handlePricingUnitChange(index, 'maxQuantityPerDay', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label small">Max Users Per Day (optional)</label>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        placeholder="Unlimited"
                                                        value={unit.maxUsersPerDay || ''}
                                                        onChange={(e) => handlePricingUnitChange(index, 'maxUsersPerDay', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            
                                          
                                        </div>
                                    ))}
                                    
                                    {pricingUnits.length < 10 && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary w-100"
                                            onClick={handleAddPricingUnit}
                                        >
                                            + Add Another Pricing Option
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className="form-group">
                            <label>Add Phone Number</label>
                            <input
                                type="text"
                                className="form-control mt-2"
                                placeholder="Phone Number"
                                value={phonenumber}
                                onChange={(e) => setPhonenumber(e.target.value)}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Add Company Name</label>
                            <input
                                type="text"
                                className="form-control mt-2"
                                placeholder="Company Name"
                                value={companyname}
                                onChange={(e) => setCompanyName(e.target.value)}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Description (One point per line)</label>
                            <textarea
                                className="form-control"
                                placeholder="• Professional plumbing service&#10;• 24/7 emergency support&#10;• Free inspection"
                                value={descriptionPoints}
                                onChange={(e) => setDescriptionPoints(e.target.value)}
                                rows={5}
                                style={{
                                    borderRadius: "8px",
                                    border: "1px solid #ddd",
                                    padding: "12px",
                                    fontSize: "14px",
                                    lineHeight: "1.6",
                                    resize: "vertical"
                                }}
                            />
                            <div style={{
                                fontSize: "12px",
                                color: "#6c757d",
                                marginTop: "5px",
                                display: "flex",
                                alignItems: "center",
                                gap: "15px",
                                flexWrap: "wrap"
                            }}>
                                <span>💡 Tip: Start each line with • or → for better formatting</span>
                                <span>📊 {descriptionPoints.split('\n').filter(l => l.trim()).length} points added</span>
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Facilities & Amenities (One per line)</label>
                            <textarea
                                className="form-control"
                                placeholder="• Free WiFi&#10;• Air Conditioning&#10;• Parking Available&#10;• Professional Equipment"
                                value={facilityPoints}
                                onChange={(e) => setFacilityPoints(e.target.value)}
                                rows={5}
                                style={{
                                    borderRadius: "8px",
                                    border: "1px solid #ddd",
                                    padding: "12px",
                                    fontSize: "14px",
                                    lineHeight: "1.6",
                                    resize: "vertical"
                                }}
                            />
                            <div style={{
                                fontSize: "12px",
                                color: "#6c757d",
                                marginTop: "5px",
                                display: "flex",
                                alignItems: "center",
                                gap: "15px",
                                flexWrap: "wrap"
                            }}>
                                <span>💡 Tip: List all facilities one per line</span>
                                <span>🏷️ {facilityPoints.split('\n').filter(l => l.trim()).length} facilities added</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Additional Information Column */}
                <div className="col-lg-6" style={{ padding: "0px" }}>
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
                        
                        <div className="form-group">
                            <label>Images (Upload or provide URLs) *</label>
                            <div className="image-input-group">
                                {/* Image 1 */}
                                <div className="mb-3 border rounded p-3">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <label className="form-label small">Image URL 1</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="https://example.com/image.jpg"
                                                value={image1}
                                                onChange={(e) => handleImageUrlChange(1, e.target.value)}
                                                disabled={!!imageFile1}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small">Or Upload Image 1</label>
                                            <input
                                                type="file"
                                                className="form-control"
                                                accept="image/*"
                                                onChange={(e) => handleImageFileSelect(1, e.target.files[0])}
                                                disabled={!!image1}
                                            />
                                        </div>
                                    </div>
                                    {(imagePreview1 || image1) && (
                                        <div className="mt-2 d-flex align-items-center gap-2">
                                            <img
                                                src={imagePreview1 || image1}
                                                alt="Preview 1"
                                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-danger"
                                                onClick={() => removeImage(1)}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Image 2 */}
                                <div className="mb-3 border rounded p-3">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <label className="form-label small">Image URL 2</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="https://example.com/image.jpg"
                                                value={image2}
                                                onChange={(e) => handleImageUrlChange(2, e.target.value)}
                                                disabled={!!imageFile2}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small">Or Upload Image 2</label>
                                            <input
                                                type="file"
                                                className="form-control"
                                                accept="image/*"
                                                onChange={(e) => handleImageFileSelect(2, e.target.files[0])}
                                                disabled={!!image2}
                                            />
                                        </div>
                                    </div>
                                    {(imagePreview2 || image2) && (
                                        <div className="mt-2 d-flex align-items-center gap-2">
                                            <img
                                                src={imagePreview2 || image2}
                                                alt="Preview 2"
                                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-danger"
                                                onClick={() => removeImage(2)}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Image 3 */}
                                <div className="mb-3 border rounded p-3">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <label className="form-label small">Image URL 3</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="https://example.com/image.jpg"
                                                value={image3}
                                                onChange={(e) => handleImageUrlChange(3, e.target.value)}
                                                disabled={!!imageFile3}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small">Or Upload Image 3</label>
                                            <input
                                                type="file"
                                                className="form-control"
                                                accept="image/*"
                                                onChange={(e) => handleImageFileSelect(3, e.target.files[0])}
                                                disabled={!!image3}
                                            />
                                        </div>
                                    </div>
                                    {(imagePreview3 || image3) && (
                                        <div className="mt-2 d-flex align-items-center gap-2">
                                            <img
                                                src={imagePreview3 || image3}
                                                alt="Preview 3"
                                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-danger"
                                                onClick={() => removeImage(3)}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Select Category </label>
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
                        </div>
                        
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
                        
                        <div className="form-group">
                            <label>Booking Type *</label>
                            <select
                                className="form-control mt-2"
                                value={bookingType}
                                onChange={(e) => setBookingType(e.target.value)}
                            >
                                <option value="Automatic Booking">Automatic Booking</option>
                                <option value="Manual Booking">Manual Booking</option>
                                <option value="Inquari Booking">Inquari Booking</option>
                            </select>
                            <small className="text-muted d-block mt-1">
                                💡 This will apply to all pricing units
                            </small>
                        </div>
                    </div>
                </div>
                
                {/* Location Features Section */}
                <div className="col-md-12" style={{ padding: "0px" }}>
                    <div className="card p-3 mb-3">
                        <div className="row">
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
                                            <div className="location-type-section">
                                                <div className="alert alert-info small mb-3">
                                                    <i className="fas fa-info-circle me-2"></i>
                                                    <strong>How does your service handle customer locations?</strong>
                                                    <div className="mt-1 small text-muted">
                                                        Choose ONE location type that best fits your service
                                                    </div>
                                                </div>
                                                <div className="row g-3 mb-4">
                                                    <div className="col-md-4">
                                                        <div
                                                            className={`location-card ${selectedLocationType === "Simple" ? "selected" : ""}`}
                                                            onClick={() => setSelectedLocationType("Simple")}
                                                        >
                                                            <div className="location-card-header">
                                                                <h5 className="location-title">Single Location</h5>
                                                            </div>
                                                            <div className="location-badge bg-primary">Standard</div>
                                                            <div className="location-description">
                                                                <p>Vendor needs the customer's <strong>pickup/service address</strong> only.</p>
                                                                <small className="text-muted">✓ Best for: Home services, repairs, deliveries</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-4">
                                                        <div
                                                            className={`location-card ${selectedLocationType === "No" ? "selected" : ""}`}
                                                            onClick={() => setSelectedLocationType("No")}
                                                        >
                                                            <div className="location-card-header">
                                                                <h5 className="location-title">No Location Required</h5>
                                                            </div>
                                                            <div className="location-badge bg-secondary">Virtual/Remote</div>
                                                            <div className="location-description">
                                                                <p>Vendor <strong>does NOT need any location</strong> from the customer.</p>
                                                                <small className="text-muted">✓ Best for: Ticket Services</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-4">
                                                        <div
                                                            className={`location-card ${selectedLocationType === "Rental" ? "selected" : ""}`}
                                                            onClick={() => setSelectedLocationType("Rental")}
                                                        >
                                                            <div className="location-card-header">
                                                                <h5 className="location-title">Multiple Locations</h5>
                                                            </div>
                                                            <div className="location-badge bg-success">Multi-Stop</div>
                                                            <div className="location-description">
                                                                <p>Vendor needs <strong>multiple locations</strong></p>
                                                                <small className="text-muted">✓ Best for: Transportation, tours</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {selectedLocationType && (
                                                    <div className="alert alert-primary py-3 px-4 small mb-3">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <i className="fas fa-check-circle fa-lg"></i>
                                                            <div>
                                                                <strong>Selected Mode:</strong>
                                                                {selectedLocationType === "Simple" && " Single Location - Customer will provide one address"}
                                                                {selectedLocationType === "No" && " No Location Required - No address will be collected"}
                                                                {selectedLocationType === "Rental" && " Multiple Locations - Customer can add pick-up, drop, and via points"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedLocationType && !locationAdded && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-success w-100 fw-semibold mb-4 shadow-sm"
                                                        onClick={handleAddLocation}
                                                    >
                                                        <i className="fas fa-plus-circle me-2"></i>
                                                        Add This Location Type
                                                    </button>
                                                )}
                                                {locationAdded && selectedLocationType && (
                                                    <div className="configured-locations">
                                                        <h6 className="fw-semibold text-dark mb-3">
                                                            <i className="fas fa-check-circle me-2 text-success"></i>
                                                            Selected Location Type
                                                        </h6>
                                                        <div className="row">
                                                            <div className="col-md-12">
                                                                <div className="configured-card selected-card">
                                                                    <div className="d-flex justify-content-between align-items-center">
                                                                        <div className="d-flex align-items-center gap-3">
                                                                            <div>
                                                                                <div className="fw-semibold fs-5">
                                                                                    {selectedLocationType === "Simple" && "Single Location"}
                                                                                    {selectedLocationType === "No" && "No Location Required"}
                                                                                    {selectedLocationType === "Rental" && "Multiple Locations"}
                                                                                </div>
                                                                                <small className="text-muted">
                                                                                    {selectedLocationType === "Simple" && "Customer will provide one address"}
                                                                                    {selectedLocationType === "No" && "No address will be collected"}
                                                                                    {selectedLocationType === "Rental" && "Customer can add multiple addresses"}
                                                                                </small>
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-outline-danger btn-sm rounded-pill"
                                                                            onClick={handleRemoveLocation}
                                                                        >
                                                                            <i className="fas fa-trash-alt me-1"></i>
                                                                            Remove
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
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
                                                            <span className="input-group-text">per unit</span>
                                                        </div>
                                                        <small className="text-muted">
                                                            This extra applies to all pricing units
                                                        </small>
                                                    </div>
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
                <div className="col-md-12" style={{ padding: "0px" }}>
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
                                <div className="alert alert-info mb-3">
                                    <i className="fas fa-info-circle me-2"></i>
                                    <strong>Note:</strong> Optional services will use the same booking type as the main service:
                                    <span className="badge bg-primary ms-2">{bookingType}</span>
                                </div>
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
                                                        {unitOptions.map(unitOption => (
                                                            <option key={unitOption} value={unitOption}>
                                                                {unitOption === 'Other' ? 'Other (Custom)' : unitOption}
                                                            </option>
                                                        ))}
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
                                                <label className="form-label">Service Image (Upload or URL)</label>
                                                <div className="row">
                                                    <div className="col-md-6">
                                                        <input
                                                            type="text"
                                                            className="form-control mb-2"
                                                            value={input.image}
                                                            placeholder="Image URL (https://...)"
                                                            onChange={(e) => {
                                                                handleInputChange(index, "image", e.target.value);
                                                                if (e.target.value) {
                                                                    setOptionalInputImages(prev => {
                                                                        const newState = { ...prev };
                                                                        delete newState[index];
                                                                        return newState;
                                                                    });
                                                                    setOptionalInputPreviews(prev => {
                                                                        const newState = { ...prev };
                                                                        delete newState[index];
                                                                        return newState;
                                                                    });
                                                                }
                                                            }}
                                                            disabled={!!optionalInputImages[index]}
                                                        />
                                                    </div>
                                                    <div className="col-md-6">
                                                        <input
                                                            type="file"
                                                            className="form-control"
                                                            accept="image/*"
                                                            onChange={(e) => handleOptionalImageUpload(index, e.target.files[0])}
                                                            disabled={!!input.image && !optionalInputImages[index]}
                                                        />
                                                        <small className="text-muted">Or upload an image (max 5MB)</small>
                                                    </div>
                                                </div>
                                                {(optionalInputPreviews[index] || (input.image && !optionalInputImages[index])) && (
                                                    <div className="mt-2 d-flex align-items-center gap-2">
                                                        <img
                                                            src={optionalInputPreviews[index] || input.image}
                                                            alt="Preview"
                                                            style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => {
                                                                const newInputs = [...inputs];
                                                                newInputs[index].image = '';
                                                                setInputs(newInputs);
                                                                setOptionalInputImages(prev => {
                                                                    const newState = { ...prev };
                                                                    delete newState[index];
                                                                    return newState;
                                                                });
                                                                setOptionalInputPreviews(prev => {
                                                                    const newState = { ...prev };
                                                                    delete newState[index];
                                                                    return newState;
                                                                });
                                                                if (optionalInputPreviews[index]) {
                                                                    URL.revokeObjectURL(optionalInputPreviews[index]);
                                                                }
                                                            }}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                )}
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
                                                    <label className="form-label">Maximum Quantity per Booking</label>
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
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={addService}
                        disabled={uploading}
                    >
                        {uploading ? "Uploading Images..." : "ADD SERVICE"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Addservice;