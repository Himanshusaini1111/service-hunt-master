import React, { useState, useEffect } from 'react'; // Add useEffect here
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

    // Image states - support both URL and File upload
    const [image1, setImage1] = useState("");
    const [image2, setImage2] = useState("");
    const [image3, setImage3] = useState("");

    // File states for upload
    const [imageFile1, setImageFile1] = useState(null);
    const [imageFile2, setImageFile2] = useState(null);
    const [imageFile3, setImageFile3] = useState(null);

    // Preview states
    const [imagePreview1, setImagePreview1] = useState("");
    const [imagePreview2, setImagePreview2] = useState("");
    const [imagePreview3, setImagePreview3] = useState("");

    const [uploading, setUploading] = useState(false);

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

    const [optionalInputImages, setOptionalInputImages] = useState({});
    const [optionalInputPreviews, setOptionalInputPreviews] = useState({});
    const [category, setCategory] = useState("");
    const [subCategory, setSubCategory] = useState("");
    const [bookingType, setBookingType] = useState("Automatic Booking");
    const [descriptionPoints, setDescriptionPoints] = useState("");
    const [facilityPoints, setFacilityPoints] = useState("");
    const [showOptionalInputs, setShowOptionalInputs] = useState(false);

    // Location type states
    const [showLocationOptions, setShowLocationOptions] = useState(false);
    const [selectedLocationType, setSelectedLocationType] = useState("");
    const [locations, setLocations] = useState([]);

    // Location pricing states
    const [showLocationPricing, setShowLocationPricing] = useState(false);
    const [locationsList, setLocationsList] = useState([]);
    const [currentLocation, setCurrentLocation] = useState({
        locationName: '',
        locationAddress: '',
        extraPrice: 0,
        optionalInputsExtra: []
    });

    const categoryOptions = {
        // ... your category options (keep as is) ...
        "Home Maintenance & Repair Services": [
            "Plumbing Services", "Electrical Repairs", "Carpentry and Woodwork",
            "Painting and Wallpapering", "Appliance Repair", "Pest Control",
            "Roof Repair and Waterproofing", "Flooring and Tile Repair",
            "HVAC Maintenance", "Home Cleaning", "Furniture Assembly",
            "Glass and Mirror Repair", "Smart Home Setup"
        ],
                "Event & Party Planning Services":[
                    "Wedding Planner"
                ]

        // ... rest of your categories ...
    };

    // Add this function with your other handlers
    const handleOptionalImageUpload = async (index, file) => {
        if (!file) return;

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire("Error", "Image size should be less than 5MB", "error");
            return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            Swal.fire("Error", "Please select an image file", "error");
            return;
        }

        // Create preview
        const previewUrl = URL.createObjectURL(file);

        // Store file for later upload
        setOptionalInputImages(prev => ({
            ...prev,
            [index]: file
        }));

        setOptionalInputPreviews(prev => ({
            ...prev,
            [index]: previewUrl
        }));

        // Clear the URL input if exists
        const newInputs = [...inputs];
        newInputs[index].image = '';
        setInputs(newInputs);
    };
    // Handle file selection
    const handleImageFileSelect = (imageNumber, file) => {
        if (!file) return;

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire("Error", "Image size should be less than 5MB", "error");
            return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            Swal.fire("Error", "Please select an image file", "error");
            return;
        }

        // Create preview
        const previewUrl = URL.createObjectURL(file);

        switch (imageNumber) {
            case 1:
                setImageFile1(file);
                setImagePreview1(previewUrl);
                setImage1(""); // Clear URL input if file is selected
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

    // Handle URL input change
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

    // Remove image
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



 
// Replace your existing uploadImage function with this:
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
        // Use uploadImage (not uploadToBackend)
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

    const handleAddLocation = () => {
        if (selectedLocationType) {
            setLocations([...locations, selectedLocationType]);
            setSelectedLocationType("");
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

    // Check if at least one image source is provided for each image
    if (!service || (!image1 && !imageFile1) || (!image2 && !imageFile2) || (!image3 && !imageFile3) || !formattedFacility || !category) {
        Swal.fire("Error", "Please fill in the required fields: Service name, at least 3 images (upload or URL), facility points, and category.", "error");
        return;
    }

    setUploading(true);

    try {
        // Upload main service images
        const imageUrl1 = await getImageUrl(1);
        const imageUrl2 = await getImageUrl(2);
        const imageUrl3 = await getImageUrl(3);
        
        // Define imageURLs here - AFTER getting the URLs
        const imageURLs = [imageUrl1, imageUrl2, imageUrl3];

        // Upload optional input images
        const updatedInputs = [...inputs];
        for (let i = 0; i < updatedInputs.length; i++) {
            const input = updatedInputs[i];
            const imageFile = optionalInputImages[i];

            if (imageFile) {
                // Upload the image file
                const uploadedUrl = await uploadImage(imageFile);
                input.image = uploadedUrl;
            }
            // If there's a URL, keep it as is
        }

        const validOptionalInputs = updatedInputs.filter(input =>
            input.name && input.name.trim() !== '' && input.price
        ).map(input => ({
            name: input.name,
            price: parseFloat(input.price) || 0,
            image: input.image, // Now contains uploaded URL
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
            imageURLs, // Now this is defined
            optionalInputs: validOptionalInputs,
            category,
            subCategory,
            bookingType,
            locations: locations,
            locationPricing: locationsList
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
    // Cleanup function to revoke object URLs
    return () => {
        // Clean up main image previews
        if (imagePreview1) URL.revokeObjectURL(imagePreview1);
        if (imagePreview2) URL.revokeObjectURL(imagePreview2);
        if (imagePreview3) URL.revokeObjectURL(imagePreview3);
        
        // Clean up optional input previews
        Object.values(optionalInputPreviews).forEach(preview => {
            if (preview) URL.revokeObjectURL(preview);
        });
    };
}, [imagePreview1, imagePreview2, imagePreview3, optionalInputPreviews]);

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

                  {/* Description Section with Better UX */}
<div className="form-group">
  <label style={{ fontWeight: "600", marginBottom: "8px", display: "block" }}>
    📝 Description
    <small style={{ fontSize: "12px", color: "#6c757d", marginLeft: "8px" }}>
      (One point per line)
    </small>
  </label>
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

{/* Facilities Section with Better UX */}
<div className="form-group">
  <label style={{ fontWeight: "600", marginBottom: "8px", display: "block" }}>
    ✨ Facilities & Amenities
    <small style={{ fontSize: "12px", color: "#6c757d", marginLeft: "8px" }}>
      (One per line)
    </small>
  </label>
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

                                            {/* Image Upload Section - Updated */}
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
                                                                // Clear file if URL is entered
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

                                                {/* Image Preview */}
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
                                                                // Remove image
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