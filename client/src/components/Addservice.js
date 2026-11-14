// Addservice.js - Updated with multiple units

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import LocationSearch from './LocationSearch';
import { FaStore, FaInfoCircle, FaRupeeSign, FaImage, FaListUl, FaMapMarkerAlt, FaPlusCircle, FaCheckCircle, FaTrash, FaPlus, FaLink, FaChevronDown, FaRobot, FaMagic, FaDice } from 'react-icons/fa';
import { getRandomDemoService } from './demoServiceAgent';
import './Addservice.css';

const isInquiryType = (type) => Boolean(type && String(type).trim().toLowerCase().includes('inqu'));

export function Addservice({ userId, editingService = null, onCancelEdit, onServiceUpdated }) {
    const lastDemoIndexRef = useRef(-1);
    const [service, setService] = useState("");
    const [phonenumber, setPhonenumber] = useState("");
    const [companyname, setCompanyName] = useState("");
    const [address, setAddress] = useState("");
    
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
            isCountable: false,
            maxQuantityPerDay: '',
            maxUsersPerDay: '',
            description: '',
            isMerged: false,
            mergedUnit: 'per day'
        }
    ]);
    const [showUnitControls, setShowUnitControls] = useState(false);
    const [showSimpleMerge, setShowSimpleMerge] = useState(false);
    const [openUnitMerge, setOpenUnitMerge] = useState({});
    const [openOptionalMerge, setOpenOptionalMerge] = useState({});
    
    // Optional inputs
    const [inputs, setInputs] = useState([{
        name: '',
        price: '',
        image: '',
        maxcount: '',
        unit: 'per day',
        customUnit: '',
        isCountable: true,
        isMerged: false,
        mergedUnit: 'per day'
    }]);
    
    const [optionalInputImages, setOptionalInputImages] = useState({});
    const [optionalInputPreviews, setOptionalInputPreviews] = useState({});
    const [category, setCategory] = useState("");
    const [subCategory, setSubCategory] = useState("");
    const [bookingType, setBookingType] = useState("Automatic Booking");
    const [allowedPaymentMethods, setAllowedPaymentMethods] = useState([
        'CASH_AFTER_SERVICE',
        'FULL_ONLINE',
        'PARTIAL_30_70'
    ]);
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

    // Form reset function
    const resetForm = () => {
        if (imagePreview1) URL.revokeObjectURL(imagePreview1);
        if (imagePreview2) URL.revokeObjectURL(imagePreview2);
        if (imagePreview3) URL.revokeObjectURL(imagePreview3);
        Object.values(optionalInputPreviews).forEach(preview => {
            if (preview) URL.revokeObjectURL(preview);
        });

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
        setBookingType("Automatic Booking");
        setAllowedPaymentMethods(['CASH_AFTER_SERVICE', 'FULL_ONLINE', 'PARTIAL_30_70']);
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
            isCountable: true,
            isMerged: false,
            mergedUnit: 'per day'
        }]);
        setOptionalInputImages({});
        setOptionalInputPreviews({});
        setPricingUnits([{
            unit: 'per day', 
            price: '', 
            customUnit: '', 
            isDefault: true,
            isCountable: false,
            maxQuantityPerDay: '',
            maxUsersPerDay: '',
            description: '',
            isMerged: false,
            mergedUnit: 'per day'
        }]);
        setShowUnitControls(false);
        setShowOptionalInputs(false);
        setShowLocationOptions(false);
        setShowLocationPricing(false);
        setLocationAdded(false);
    };

    // Cancel edit handler
    const handleCancelEdit = () => {
        resetForm();
        if (onCancelEdit) {
            onCancelEdit();
        }
    };

    // Effect: populate all fields when editingService changes
    useEffect(() => {
        if (editingService && editingService._id) {
            if (imagePreview1) URL.revokeObjectURL(imagePreview1);
            if (imagePreview2) URL.revokeObjectURL(imagePreview2);
            if (imagePreview3) URL.revokeObjectURL(imagePreview3);
            Object.values(optionalInputPreviews).forEach(preview => {
                if (preview) URL.revokeObjectURL(preview);
            });

            setService(editingService.name || editingService.service || "");
            setCompanyName(editingService.companyname || "");
            setPhonenumber(editingService.phonenumber ? String(editingService.phonenumber) : "");
            setAddress(editingService.address || "");
            const rawType = String(editingService.bookingType || "Automatic Booking").toLowerCase();
            const normalizedBookingType = rawType.includes('inqu') 
                ? "Inquari Booking" 
                : (rawType.includes('man') ? "Manual Booking" : "Automatic Booking");
            setBookingType(normalizedBookingType);
            setCategory(editingService.category || "");
            setSubCategory(editingService.subCategory || "");

            // Allowed Payment Methods - Payment methods are NOT allowed in inquiry services
            if (isInquiryType(normalizedBookingType)) {
                setAllowedPaymentMethods([]);
            } else if (editingService.allowedPaymentMethods && Array.isArray(editingService.allowedPaymentMethods) && editingService.allowedPaymentMethods.length > 0) {
                setAllowedPaymentMethods(editingService.allowedPaymentMethods);
            } else {
                setAllowedPaymentMethods(['CASH_AFTER_SERVICE', 'FULL_ONLINE', 'PARTIAL_30_70']);
            }

            // Images
            const imgs = editingService.imageurls || editingService.imageURLs || [];
            setImage1(imgs[0] || "");
            setImage2(imgs[1] || "");
            setImage3(imgs[2] || "");
            setImageFile1(null);
            setImageFile2(null);
            setImageFile3(null);
            setImagePreview1("");
            setImagePreview2("");
            setImagePreview3("");

            // Description and Facility points
            const cleanBulletPoints = (str) => {
                if (!str) return "";
                return str
                    .split('\n')
                    .map(line => line.replace(/^[→•\-*]\s*/, '').trim())
                    .filter(Boolean)
                    .join('\n');
            };
            setDescriptionPoints(cleanBulletPoints(editingService.description));
            setFacilityPoints(cleanBulletPoints(editingService.facility));

            // Pricing Units
            if (editingService.pricingUnits && Array.isArray(editingService.pricingUnits) && editingService.pricingUnits.length > 0) {
                setPricingUnits(editingService.pricingUnits.map(u => ({
                    unit: u.unit || 'per day',
                    price: u.price !== undefined && u.price !== null ? String(u.price) : '',
                    customUnit: u.customUnit || '',
                    isDefault: !!u.isDefault,
                    isCountable: !!u.isCountable,
                    maxQuantityPerDay: u.maxQuantityPerDay ? String(u.maxQuantityPerDay) : '',
                    maxUsersPerDay: u.maxUsersPerDay ? String(u.maxUsersPerDay) : '',
                    description: u.description || '',
                    isMerged: !!u.isMerged,
                    mergedUnit: u.mergedUnit || 'per day'
                })));
                setShowUnitControls(editingService.pricingUnits.length > 1);
                if (editingService.pricingUnits.some(u => u.isMerged)) {
                    setShowSimpleMerge(true);
                }
            } else {
                const isMerged = !!editingService.isMerged;
                setPricingUnits([{
                    unit: editingService.unit || 'per day',
                    price: editingService.rentperday !== undefined && editingService.rentperday !== null ? String(editingService.rentperday) : '',
                    customUnit: editingService.customUnit || '',
                    isDefault: true,
                    isCountable: !!editingService.isCountable,
                    maxQuantityPerDay: editingService.maxQuantityPerDay ? String(editingService.maxQuantityPerDay) : '',
                    maxUsersPerDay: editingService.maxUsersPerDay ? String(editingService.maxUsersPerDay) : '',
                    description: editingService.description || '',
                    isMerged: isMerged,
                    mergedUnit: editingService.mergedUnit || 'per day'
                }]);
                setShowUnitControls(false);
                if (isMerged) {
                    setShowSimpleMerge(true);
                }
            }

            // Optional Inputs - ALWAYS SHOW in edit mode so all features can be used
            setShowOptionalInputs(true);
            if (editingService.optionalInputs && Array.isArray(editingService.optionalInputs) && editingService.optionalInputs.length > 0) {
                setInputs(editingService.optionalInputs.map(opt => ({
                    name: opt.name || '',
                    price: opt.price !== undefined && opt.price !== null ? String(opt.price) : '',
                    image: opt.image || '',
                    maxcount: opt.maxcount ? String(opt.maxcount) : '',
                    unit: opt.unit || 'per day',
                    customUnit: opt.customUnit || '',
                    isCountable: opt.isCountable !== false,
                    isMerged: !!opt.isMerged,
                    mergedUnit: opt.mergedUnit || 'per day'
                })));
            } else {
                setInputs([{
                    name: '',
                    price: '',
                    image: '',
                    maxcount: '',
                    unit: 'per day',
                    customUnit: '',
                    isCountable: true,
                    isMerged: false,
                    mergedUnit: 'per day'
                }]);
            }
            setOptionalInputImages({});
            setOptionalInputPreviews({});

            // Locations - ALWAYS SHOW in edit mode so scope & surcharges are immediately accessible
            const locType = editingService.locationType || (editingService.locations && editingService.locations[0]) || 'Simple';
            setSelectedLocationType(locType);
            setLocations([locType]);
            setLocationAdded(true);
            setShowLocationOptions(true);
            setShowLocationPricing(true);

            if (editingService.locationPricing && Array.isArray(editingService.locationPricing) && editingService.locationPricing.length > 0) {
                setLocationsList(editingService.locationPricing.map(loc => ({
                    locationName: loc.locationName || '',
                    locationAddress: loc.locationAddress || '',
                    extraPrice: loc.extraPrice || 0,
                    optionalInputsExtra: loc.optionalInputsExtra || []
                })));
            } else {
                setLocationsList([]);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingService]);

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
                    isCountable: false,
                    maxQuantityPerDay: '',
                    maxUsersPerDay: '',
                    description: '',
                    isMerged: false,
                    mergedUnit: 'per day'
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
        
        if (field === 'isCountable' && value === false) {
            newUnits[index].maxQuantityPerDay = '';
        }
        
        // If setting this as default, unset others
        if (field === 'isDefault' && value === true) {
            newUnits.forEach((unit, i) => {
                if (i !== index) unit.isDefault = false;
            });
        }
        
        setPricingUnits(newUnits);
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
                isCountable: true,
                isMerged: false,
                mergedUnit: 'per day'
            }]);
        }
    };

    const handleRemoveInput = (index) => {
        const newInputs = inputs.filter((_, i) => i !== index);
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

    const handleSelectLocationType = (type) => {
        setSelectedLocationType(type);
        setLocations([type]);
        setLocationAdded(true);
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
        // Agent: Auto-fill dynamic demo data with unique content each time
    const handleFillDemoData = () => {
        if (imagePreview1) URL.revokeObjectURL(imagePreview1);
        if (imagePreview2) URL.revokeObjectURL(imagePreview2);
        if (imagePreview3) URL.revokeObjectURL(imagePreview3);
        Object.values(optionalInputPreviews).forEach(preview => {
            if (preview) URL.revokeObjectURL(preview);
        });

        const demo = getRandomDemoService(lastDemoIndexRef.current);
        lastDemoIndexRef.current = demo.index;

        setService(demo.service);
        setCompanyName(demo.companyname);
        setPhonenumber(demo.phonenumber);
        setBookingType(demo.bookingType);
        setCategory(demo.category);
        setSubCategory(demo.subCategory);

        setImage1(demo.image1);
        setImage2(demo.image2);
        setImage3(demo.image3);
        setImageFile1(null);
        setImageFile2(null);
        setImageFile3(null);
        setImagePreview1("");
        setImagePreview2("");
        setImagePreview3("");

        setDescriptionPoints(demo.descriptionPoints);
        setFacilityPoints(demo.facilityPoints);

        setPricingUnits(demo.pricingUnits);
        setShowUnitControls(demo.pricingUnits.length > 1);

        setInputs(demo.inputs);
        setShowOptionalInputs(demo.inputs.length > 0);
        setOptionalInputImages({});
        setOptionalInputPreviews({});

        setAddress(demo.address);
        setSelectedLocationType(demo.locationType);
        setLocations([demo.locationType]);
        setLocationAdded(true);
        setShowLocationOptions(true);

        if (demo.locationsList && demo.locationsList.length > 0) {
            setLocationsList(demo.locationsList);
            setShowLocationPricing(true);
        } else {
            setLocationsList([]);
            setShowLocationPricing(false);
        }

        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "🤖 Agent Filled Demo Data!",
            html: `<div style="font-size:13px;text-align:left;margin-top:4px;"><b>${demo.service}</b><br/><span style="color:#64748b;">${demo.category} &bull; ${demo.subCategory}</span><br/><span style="color:#16a34a;font-weight:600;">₹${demo.pricingUnits[0]?.price} ${demo.pricingUnits[0]?.unit}</span></div>`,
            timer: 3500,
            showConfirmButton: false,
            timerProgressBar: true
        });
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
        
        const activeUserId = userId || JSON.parse(localStorage.getItem("currentUser") || "{}")?._id;
        if (!activeUserId || activeUserId === "undefined") {
            Swal.fire("Error", "User session expired or User ID missing. Please log in again.", "error");
            return;
        }

        if (!companyname || !companyname.trim()) {
            Swal.fire("Error", "Please enter your Company / Business Name.", "error");
            return;
        }

        if (!phonenumber || !phonenumber.toString().trim()) {
            Swal.fire("Error", "Please enter a valid Contact Phone Number.", "error");
            return;
        }

        if (!address) {
            Swal.fire("Error", "Please select a service location", "error");
            return;
        }
        
        if (!service || (!image1 && !imageFile1) || (!image2 && !imageFile2) || (!image3 && !imageFile3) || !formattedFacility || !category) {
            Swal.fire("Error", "Please fill in the required fields: Service name, at least 3 images, facility points, and category.", "error");
            return;
        }

        if (!isInquiryType(bookingType) && (!allowedPaymentMethods || allowedPaymentMethods.length === 0)) {
            Swal.fire("Error", "Please select at least one allowed payment method for this service.", "error");
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
                maxcount: input.maxcount && !isNaN(input.maxcount) && Number(input.maxcount) > 0 ? parseInt(input.maxcount, 10) : null,
                unit: input.unit,
                customUnit: input.unit === "Other" ? input.customUnit : "",
                isCountable: input.isCountable !== false,
                isMerged: !!input.isMerged,
                mergedUnit: input.mergedUnit || 'per day',
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
                    isCountable: u.isCountable === true,
                    maxQuantityPerDay: u.isCountable === true && u.maxQuantityPerDay ? parseInt(u.maxQuantityPerDay) : null,
                    maxUsersPerDay: u.maxUsersPerDay ? parseInt(u.maxUsersPerDay) : null,
                    description: u.description || '',
                    isMerged: !!u.isMerged,
                    mergedUnit: u.mergedUnit || 'per day'
                })),
                // Legacy fields for backward compatibility
                rentperday: parseFloat(defaultUnit.price) || 0,
                unit: defaultUnit.unit,
                customUnit: defaultUnit.unit === "Other" ? defaultUnit.customUnit : "",
                isCountable: defaultUnit.isCountable === true,
                isMerged: !!defaultUnit.isMerged,
                mergedUnit: defaultUnit.mergedUnit || 'per day',
                maxQuantityPerDay: defaultUnit.isCountable === true && defaultUnit.maxQuantityPerDay ? parseInt(defaultUnit.maxQuantityPerDay) : null,
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
                allowedPaymentMethods: isInquiryType(bookingType)
                    ? []
                    : ((allowedPaymentMethods && allowedPaymentMethods.length > 0) ? allowedPaymentMethods : ['CASH_AFTER_SERVICE']),
                locations: [selectedLocationType || (locations && locations.length > 0 ? locations[0] : 'Simple')],
                locationType: selectedLocationType || (locations && locations.length > 0 ? locations[0] : 'Simple'),
                locationPricing: locationsList,
            };
            
            if (editingService && editingService._id) {
                const response = await axios.put(`/api/service/editservice/${editingService._id}?userid=${activeUserId}`, payload, {
                    headers: { "Content-Type": "application/json" },
                });

                Swal.fire({
                    icon: "success",
                    title: "Service Updated!",
                    text: `"${service}" was updated successfully.`,
                    timer: 2000,
                    showConfirmButton: false
                });

                resetForm();
                if (onServiceUpdated) {
                    onServiceUpdated(response.data.service);
                }
            } else {
                await axios.post(`/api/service/addservice?userid=${activeUserId}`, payload, {
                    headers: { "Content-Type": "application/json" },
                });

                Swal.fire("Success", "Service added successfully!", "success");
                resetForm();
            }
        } catch (error) {
            console.error(`Error ${editingService ? 'updating' : 'adding'} service:`, error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Unknown error";
            Swal.fire("Error", `Failed to ${editingService ? 'update' : 'add'} service: ${errorMessage}`, "error");
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

    const isEditing = Boolean(editingService && editingService._id);

    return (
        <div className="service-form-container">
            {/* Edit Mode Alert Banner */}
            {isEditing && (
                <div className="as-edit-mode-banner">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 26 }}>✏️</span>
                        <div>
                            <div style={{ fontWeight: 700, color: '#92400e', fontSize: 15 }}>
                                Editing Service: <span style={{ color: '#b45309' }}>{editingService.name || editingService.service}</span>
                            </div>
                            <div style={{ fontSize: 12.5, color: '#78350f' }}>
                                Modify the fields below and click "Update Service Listing" to save changes.
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-outline-danger btn-sm fw-bold"
                        onClick={handleCancelEdit}
                        style={{ borderRadius: 8, padding: '6px 14px' }}
                    >
                        ✕ Cancel Edit & Add New Service
                    </button>
                </div>
            )}

            {/* Top Hero Banner */}
            <div className="as-hero-header">
                <div className="as-hero-title-group">
                    <h2>{isEditing ? "Edit Service Offering" : "Create Service Offering"}</h2>
                    <p>
                        {isEditing
                            ? `Updating "${editingService.name || editingService.service}". Modify pricing, images, and details.`
                            : "Configure pricing, media portfolio, coverage areas and booking rules for your new service."}
                    </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {!isEditing && (
                        <button
                            type="button"
                            className="as-demo-agent-btn"
                            onClick={handleFillDemoData}
                            title="Click to auto-populate all form fields with fresh random demo data"
                        >
                            <span className="as-agent-pulse-dot" />
                            <FaRobot style={{ fontSize: 16 }} />
                            <span>Fill Demo Data (Agent)</span>
                            <FaMagic style={{ fontSize: 13, opacity: 0.9 }} />
                        </button>
                    )}
                    <div className={isEditing ? "as-edit-mode-badge" : "as-hero-badge"}>
                        {isEditing ? (
                            <>✏️ Edit Mode Active</>
                        ) : (
                            <><FaStore style={{ marginRight: 6 }} /> Vendor Partner Studio</>
                        )}
                    </div>
                </div>
            </div>

            <div className="as-form-layout">
                {/* 1. Basic Information */}
                <div className="as-card-section">
                    <div className="as-section-header">
                        <h3 className="as-section-title">
                            <span className="as-icon-box"><FaInfoCircle /></span>
                            Basic Details & Classification
                        </h3>
                        <span className="as-section-hint">Define service title, vendor branding, and category</span>
                    </div>

                    <div className="as-grid-2">
                        <div className="as-field">
                            <label className="as-label">
                                Service Name <span className="as-required">*</span>
                            </label>
                            <input
                                type="text"
                                className="as-input"
                                placeholder="e.g. Master Plumbing & Leak Detection"
                                value={service}
                                onChange={(e) => setService(e.target.value)}
                            />
                        </div>

                        <div className="as-field">
                            <label className="as-label">
                                Company / Agency Name
                            </label>
                            <input
                                type="text"
                                className="as-input"
                                placeholder="e.g. Apex Home Services LLP"
                                value={companyname}
                                onChange={(e) => setCompanyName(e.target.value)}
                            />
                        </div>

                        <div className="as-field">
                            <label className="as-label">
                                Contact Phone Number <span className="as-required">*</span>
                            </label>
                            <input
                                type="text"
                                className="as-input"
                                placeholder="e.g. +91 9876543210"
                                value={phonenumber}
                                onChange={(e) => setPhonenumber(e.target.value)}
                            />
                        </div>

                        <div className="as-field">
                            <label className="as-label">
                                Booking Protocol <span className="as-required">*</span>
                            </label>
                            <select
                                className="as-select"
                                value={bookingType}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setBookingType(val);
                                    if (isInquiryType(val)) {
                                        setAllowedPaymentMethods([]);
                                    } else if (!allowedPaymentMethods || allowedPaymentMethods.length === 0) {
                                        setAllowedPaymentMethods(['CASH_AFTER_SERVICE', 'FULL_ONLINE', 'PARTIAL_30_70']);
                                    }
                                }}
                            >
                                <option value="Automatic Booking">Automatic Booking (Instant Confirmation)</option>
                                <option value="Manual Booking">Manual Booking (Vendor Acceptance Required)</option>
                                <option value="Inquari Booking">Inquiry Booking (Price on Consultation)</option>
                            </select>
                        </div>

                        {!isInquiryType(bookingType) && (
                            <div className="as-field as-full" style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '6px', marginBottom: '14px' }}>
                                <label className="as-label" style={{ fontWeight: 600, color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    💳 Allowed Payment Methods <span className="as-required">*</span>
                                </label>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0' }}>
                                    Choose which payment options customers can select when booking this service:
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px',
                                        padding: '12px',
                                        borderRadius: '6px',
                                        border: allowedPaymentMethods.includes('CASH_AFTER_SERVICE') ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                        background: allowedPaymentMethods.includes('CASH_AFTER_SERVICE') ? '#eff6ff' : '#ffffff',
                                        cursor: 'pointer'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={allowedPaymentMethods.includes('CASH_AFTER_SERVICE')}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setAllowedPaymentMethods([...allowedPaymentMethods, 'CASH_AFTER_SERVICE']);
                                                } else {
                                                    setAllowedPaymentMethods(allowedPaymentMethods.filter(m => m !== 'CASH_AFTER_SERVICE'));
                                                }
                                            }}
                                            style={{ marginTop: '3px' }}
                                        />
                                        <div>
                                            <strong style={{ display: 'block', fontSize: '13px', color: '#1e293b' }}>Cash on Service</strong>
                                            <span style={{ fontSize: '11px', color: '#64748b' }}>Full payment in cash after service completion.</span>
                                        </div>
                                    </label>

                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px',
                                        padding: '12px',
                                        borderRadius: '6px',
                                        border: allowedPaymentMethods.includes('FULL_ONLINE') ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                        background: allowedPaymentMethods.includes('FULL_ONLINE') ? '#eff6ff' : '#ffffff',
                                        cursor: 'pointer'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={allowedPaymentMethods.includes('FULL_ONLINE')}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setAllowedPaymentMethods([...allowedPaymentMethods, 'FULL_ONLINE']);
                                                } else {
                                                    setAllowedPaymentMethods(allowedPaymentMethods.filter(m => m !== 'FULL_ONLINE'));
                                                }
                                            }}
                                            style={{ marginTop: '3px' }}
                                        />
                                        <div>
                                            <strong style={{ display: 'block', fontSize: '13px', color: '#1e293b' }}>100% Online Payment</strong>
                                            <span style={{ fontSize: '11px', color: '#64748b' }}>Full payment upfront online via Razorpay (UPI/Cards).</span>
                                        </div>
                                    </label>

                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px',
                                        padding: '12px',
                                        borderRadius: '6px',
                                        border: allowedPaymentMethods.includes('PARTIAL_30_70') ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                        background: allowedPaymentMethods.includes('PARTIAL_30_70') ? '#eff6ff' : '#ffffff',
                                        cursor: 'pointer'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={allowedPaymentMethods.includes('PARTIAL_30_70')}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setAllowedPaymentMethods([...allowedPaymentMethods, 'PARTIAL_30_70']);
                                                } else {
                                                    setAllowedPaymentMethods(allowedPaymentMethods.filter(m => m !== 'PARTIAL_30_70'));
                                                }
                                            }}
                                            style={{ marginTop: '3px' }}
                                        />
                                        <div>
                                            <strong style={{ display: 'block', fontSize: '13px', color: '#1e293b' }}>30% Advance + 70% Cash</strong>
                                            <span style={{ fontSize: '11px', color: '#64748b' }}>30% paid online upfront, remaining 70% in cash.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="as-field">
                            <label className="as-label">
                                Service Category <span className="as-required">*</span>
                            </label>
                            <select
                                className="as-select"
                                value={category}
                                onChange={handleCategoryChange}
                            >
                                <option value="">-- Choose Category --</option>
                                {Object.keys(categoryOptions).map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="as-field">
                            <label className="as-label">
                                Specialized Subcategory
                            </label>
                            <select
                                className="as-select"
                                value={subCategory}
                                onChange={handleSubCategoryChange}
                                disabled={!category}
                            >
                                <option value="">-- Choose Subcategory --</option>
                                {category && categoryOptions[category]?.map((item) => (
                                    <option key={item} value={item}>{item}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2. Pricing & Unit Structure */}
                <div className="as-card-section">
                    <div className="as-section-header">
                        <h3 className="as-section-title">
                            <span className="as-icon-box"><FaRupeeSign /></span>
                            Pricing & Billing Model
                        </h3>
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            style={{ borderRadius: 8, fontWeight: 600 }}
                            onClick={() => setShowUnitControls(!showUnitControls)}
                        >
                            {showUnitControls ? "Simple View" : "Multiple Pricing Units (+)"}
                        </button>
                    </div>

                    {!showUnitControls ? (
                        <div className="as-pricing-panel">
                            <div className="as-grid-2">
                                <div className="as-field" style={{ marginBottom: 0 }}>
                                    <label className="as-label">
                                        Base Rate (₹ INR) <span className="as-required">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        className="as-input"
                                        placeholder="e.g. 499"
                                        value={pricingUnits[0]?.price || ''}
                                        onChange={(e) => {
                                            const newUnits = [...pricingUnits];
                                            newUnits[0].price = e.target.value;
                                            setPricingUnits(newUnits);
                                        }}
                                    />
                                </div>
                                <div className="as-field" style={{ marginBottom: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <label className="as-label" style={{ marginBottom: 0 }}>
                                            Billing Unit <span className="as-required">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            className={`as-classic-merge-btn ${pricingUnits[0]?.isMerged ? 'active' : ''} ${showSimpleMerge ? 'open' : ''}`}
                                            onClick={() => setShowSimpleMerge(!showSimpleMerge)}
                                            title="Click to configure unit merge"
                                        >
                                            <FaLink style={{ fontSize: 11, marginRight: 5 }} />
                                            <span>
                                                {pricingUnits[0]?.isMerged 
                                                    ? `Merged: + ${pricingUnits[0]?.mergedUnit || 'per day'}` 
                                                    : '+ Merge Option'}
                                            </span>
                                            <FaChevronDown className="as-merge-chevron" style={{
                                                fontSize: 10,
                                                marginLeft: 6,
                                                transform: showSimpleMerge ? 'rotate(180deg)' : 'none',
                                                transition: 'transform 0.2s ease'
                                            }} />
                                        </button>
                                    </div>
                                    <select
                                        className="as-select"
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
                                <div className="as-field" style={{ marginTop: 14, marginBottom: 0 }}>
                                    <label className="as-label">Custom Billing Unit Description</label>
                                    <input
                                        type="text"
                                        className="as-input"
                                        placeholder="e.g. per session, per sq ft"
                                        value={pricingUnits[0]?.customUnit || ''}
                                        onChange={(e) => {
                                            const newUnits = [...pricingUnits];
                                            newUnits[0].customUnit = e.target.value;
                                            setPricingUnits(newUnits);
                                        }}
                                    />
                                </div>
                            )}

                            {/* Merge Unit Section for Simple View (Shown when upper side Merge Option is clicked) */}
                            {showSimpleMerge && (
                                <div className="as-classic-merge-box">
                                    <div className="as-classic-merge-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className="as-classic-merge-badge">
                                                <FaLink style={{ fontSize: 11 }} /> Unit Merge Section
                                            </span>
                                            <span style={{ fontSize: 12, color: '#64748b' }}>
                                                Combine {pricingUnits[0]?.unit || 'per room'} with duration
                                            </span>
                                        </div>
                                        <label className="as-classic-toggle-label">
                                            <input
                                                type="checkbox"
                                                checked={pricingUnits[0]?.isMerged || false}
                                                onChange={(e) => {
                                                    const newUnits = [...pricingUnits];
                                                    newUnits[0].isMerged = e.target.checked;
                                                    if (!newUnits[0].mergedUnit) newUnits[0].mergedUnit = 'per day';
                                                    setPricingUnits(newUnits);
                                                }}
                                                style={{ width: 16, height: 16, accentColor: '#16a34a', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: 12.5, fontWeight: 700, color: pricingUnits[0]?.isMerged ? '#166534' : '#64748b' }}>
                                                {pricingUnits[0]?.isMerged ? '✓ Merge Enabled' : 'Enable Merge'}
                                            </span>
                                        </label>
                                    </div>

                                    {pricingUnits[0]?.isMerged ? (
                                        <div className="as-classic-merge-body">
                                            <div className="as-grid-2">
                                                <div className="as-field" style={{ marginBottom: 0 }}>
                                                    <label className="as-label" style={{ color: '#166534', fontWeight: 600 }}>
                                                        Secondary Duration Unit
                                                    </label>
                                                    <select
                                                        className="as-select"
                                                        value={pricingUnits[0]?.mergedUnit || 'per day'}
                                                        onChange={(e) => {
                                                            const newUnits = [...pricingUnits];
                                                            newUnits[0].mergedUnit = e.target.value;
                                                            setPricingUnits(newUnits);
                                                        }}
                                                        style={{ borderColor: '#86efac' }}
                                                    >
                                                        <option value="per day">per day (Multi-day / Check-in to Check-out)</option>
                                                        <option value="per hour">per hour (Time Slots)</option>
                                                        <option value="per week">per week</option>
                                                        <option value="per month">per month</option>
                                                    </select>
                                                </div>
                                                <div className="as-classic-merge-preview">
                                                    <div style={{ fontWeight: 600, color: '#14532d', marginBottom: 4 }}>
                                                        📐 Formula: Rate × Qty ({pricingUnits[0]?.unit || 'unit'}) × Duration ({pricingUnits[0]?.mergedUnit || 'per day'})
                                                    </div>
                                                    <div style={{ fontSize: 11.5, color: '#166534' }}>
                                                        👁️ On service cards and booking screen, only <b>"{pricingUnits[0]?.unit || 'unit'}"</b> will be shown.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 8 }}>
                                            Check "Enable Merge" above to calculate total price by both quantity ({pricingUnits[0]?.unit || 'e.g. rooms'}) and duration (e.g. days/hours).
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Quantity & Inventory Limits for Simple View */}
                            <div className="as-qty-config-box">
                                <div className="as-field" style={{ marginBottom: 0 }}>
                                    <label className="as-label" style={{ marginBottom: 6 }}>
                                        Quantity Setting
                                    </label>
                                    <div className="as-qty-toggle-group">
                                        <label className={`as-qty-toggle-btn ${pricingUnits[0]?.isCountable === false ? 'active' : ''}`}>
                                            <input
                                                type="radio"
                                                name="simple_qty_mode"
                                                checked={pricingUnits[0]?.isCountable === false}
                                                onChange={() => {
                                                    const newUnits = [...pricingUnits];
                                                    newUnits[0].isCountable = false;
                                                    newUnits[0].maxQuantityPerDay = '';
                                                    setPricingUnits(newUnits);
                                                }}
                                            />
                                            <span className="as-qty-radio-circle"></span>
                                            <span className="as-qty-btn-text">No Quantity</span>
                                            <span className="as-qty-default-pill">Default</span>
                                        </label>
                                        <label className={`as-qty-toggle-btn ${pricingUnits[0]?.isCountable === true ? 'active' : ''}`}>
                                            <input
                                                type="radio"
                                                name="simple_qty_mode"
                                                checked={pricingUnits[0]?.isCountable === true}
                                                onChange={() => {
                                                    const newUnits = [...pricingUnits];
                                                    newUnits[0].isCountable = true;
                                                    setPricingUnits(newUnits);
                                                }}
                                            />
                                            <span className="as-qty-radio-circle"></span>
                                            <span className="as-qty-btn-text">Add Quantity</span>
                                        </label>
                                    </div>

                                    {pricingUnits[0]?.isCountable === false ? (
                                        <div className="as-qty-info-banner">
                                            <span>🔒 <b>No Quantity:</b> Quantity option will not be seen on booking screen.</span>
                                        </div>
                                    ) : (
                                        <div className="as-qty-input-reveal">
                                            <label className="as-label" style={{ fontSize: 12, marginTop: 8, marginBottom: 4 }}>
                                                Max Quantity Per Day (Optional)
                                            </label>
                                            <input
                                                type="number"
                                                className="as-input"
                                                placeholder="Unlimited (e.g. 5, 10)"
                                                value={pricingUnits[0]?.maxQuantityPerDay || ''}
                                                onChange={(e) => {
                                                    const newUnits = [...pricingUnits];
                                                    newUnits[0].maxQuantityPerDay = e.target.value;
                                                    setPricingUnits(newUnits);
                                                }}
                                                min="1"
                                            />
                                            <div className="as-qty-hint-text">
                                                ✓ Customers can select quantity on booking screen {pricingUnits[0]?.maxQuantityPerDay ? `(up to max ${pricingUnits[0]?.maxQuantityPerDay})` : '(unlimited)'}.
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="as-field" style={{ marginBottom: 0 }}>
                                    <label className="as-label">Max Users Per Day (Optional)</label>
                                    <input
                                        type="number"
                                        className="as-input"
                                        placeholder="Unlimited"
                                        value={pricingUnits[0]?.maxUsersPerDay || ''}
                                        onChange={(e) => {
                                            const newUnits = [...pricingUnits];
                                            newUnits[0].maxUsersPerDay = e.target.value;
                                            setPricingUnits(newUnits);
                                        }}
                                        min="1"
                                    />
                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                        Maximum unique customers who can book on the same day.
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="as-pricing-panel">
                            {pricingUnits.map((unit, index) => (
                                <div key={index} className={`as-unit-card ${unit.isDefault ? 'default-active' : ''}`}>
                                    <div className="as-unit-card-header">
                                        <span className={`pricing-unit-badge ${unit.isDefault ? 'default' : 'standard'}`}>
                                            {unit.isDefault ? '⭐ Primary Default Unit' : `Unit Option #${index + 1}`}
                                        </span>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <button
                                                type="button"
                                                className={`as-classic-merge-btn ${unit.isMerged ? 'active' : ''} ${openUnitMerge[index] ? 'open' : ''}`}
                                                onClick={() => setOpenUnitMerge(prev => ({ ...prev, [index]: !prev[index] }))}
                                                title="Click to configure unit merge"
                                            >
                                                <FaLink style={{ fontSize: 11, marginRight: 5 }} />
                                                <span>
                                                    {unit.isMerged 
                                                        ? `Merged: + ${unit.mergedUnit || 'per day'}` 
                                                        : '+ Merge Option'}
                                                </span>
                                                <FaChevronDown className="as-merge-chevron" style={{
                                                    fontSize: 10,
                                                    marginLeft: 6,
                                                    transform: openUnitMerge[index] ? 'rotate(180deg)' : 'none',
                                                    transition: 'transform 0.2s ease'
                                                }} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-outline-success btn-sm"
                                                style={{ borderRadius: 6, fontSize: 12 }}
                                                onClick={() => handlePricingUnitChange(index, 'isDefault', true)}
                                                disabled={unit.isDefault}
                                            >
                                                Make Default
                                            </button>
                                            {pricingUnits.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm"
                                                    style={{ borderRadius: 6, fontSize: 12 }}
                                                    onClick={() => handleRemovePricingUnit(index)}
                                                >
                                                    <FaTrash style={{ marginRight: 4 }} /> Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="as-grid-2">
                                        <div className="as-field">
                                            <label className="as-label">Rate (₹ INR)</label>
                                            <input
                                                type="number"
                                                className="as-input"
                                                placeholder="Price amount"
                                                value={unit.price}
                                                onChange={(e) => handlePricingUnitChange(index, 'price', e.target.value)}
                                            />
                                        </div>
                                        <div className="as-field">
                                            <label className="as-label">Unit Type</label>
                                            <select
                                                className="as-select"
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
                                        <div className="as-field">
                                            <label className="as-label">Custom Unit Name</label>
                                            <input
                                                type="text"
                                                className="as-input"
                                                placeholder="e.g. per visit"
                                                value={unit.customUnit || ''}
                                                onChange={(e) => handlePricingUnitChange(index, 'customUnit', e.target.value)}
                                            />
                                        </div>
                                    )}

                                    <div className="as-qty-config-box">
                                        <div className="as-field" style={{ marginBottom: 0 }}>
                                            <label className="as-label" style={{ marginBottom: 6 }}>
                                                Quantity Setting
                                            </label>
                                            <div className="as-qty-toggle-group">
                                                <label className={`as-qty-toggle-btn ${unit.isCountable === false ? 'active' : ''}`}>
                                                    <input
                                                        type="radio"
                                                        name={`qty_mode_${index}`}
                                                        checked={unit.isCountable === false}
                                                        onChange={() => {
                                                            handlePricingUnitChange(index, 'isCountable', false);
                                                            handlePricingUnitChange(index, 'maxQuantityPerDay', '');
                                                        }}
                                                    />
                                                    <span className="as-qty-radio-circle"></span>
                                                    <span className="as-qty-btn-text">No Quantity</span>
                                                    <span className="as-qty-default-pill">Default</span>
                                                </label>
                                                <label className={`as-qty-toggle-btn ${unit.isCountable === true ? 'active' : ''}`}>
                                                    <input
                                                        type="radio"
                                                        name={`qty_mode_${index}`}
                                                        checked={unit.isCountable === true}
                                                        onChange={() => {
                                                            handlePricingUnitChange(index, 'isCountable', true);
                                                        }}
                                                    />
                                                    <span className="as-qty-radio-circle"></span>
                                                    <span className="as-qty-btn-text">Add Quantity</span>
                                                </label>
                                            </div>

                                            {unit.isCountable === false ? (
                                                <div className="as-qty-info-banner">
                                                    <span>🔒 <b>No Quantity:</b> Quantity option will not be seen on booking screen.</span>
                                                </div>
                                            ) : (
                                                <div className="as-qty-input-reveal">
                                                    <label className="as-label" style={{ fontSize: 12, marginTop: 8, marginBottom: 4 }}>
                                                        Max Quantity Per Day (Optional)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        className="as-input"
                                                        placeholder="Unlimited (e.g. 5, 10)"
                                                        value={unit.maxQuantityPerDay || ''}
                                                        onChange={(e) => handlePricingUnitChange(index, 'maxQuantityPerDay', e.target.value)}
                                                        min="1"
                                                    />
                                                    <div className="as-qty-hint-text">
                                                        ✓ Customers can select quantity on booking screen {unit.maxQuantityPerDay ? `(up to max ${unit.maxQuantityPerDay})` : '(unlimited)'}.
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="as-field" style={{ marginBottom: 0 }}>
                                            <label className="as-label">Max Users Per Day (Optional)</label>
                                            <input
                                                type="number"
                                                className="as-input"
                                                placeholder="Unlimited"
                                                value={unit.maxUsersPerDay || ''}
                                                onChange={(e) => handlePricingUnitChange(index, 'maxUsersPerDay', e.target.value)}
                                                min="1"
                                            />
                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                                Maximum unique customers who can book on the same day.
                                            </div>
                                        </div>
                                    </div>

                                    {/* Merge Unit Section for this Pricing Unit (Shown when upper side Merge Option is clicked) */}
                                    {openUnitMerge[index] && (
                                        <div className="as-classic-merge-box">
                                            <div className="as-classic-merge-header">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span className="as-classic-merge-badge">
                                                        <FaLink style={{ fontSize: 11 }} /> Unit Merge Section
                                                    </span>
                                                    <span style={{ fontSize: 12, color: '#64748b' }}>
                                                        Combine {unit.unit} with duration
                                                    </span>
                                                </div>
                                                <label className="as-classic-toggle-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={unit.isMerged || false}
                                                        onChange={(e) => handlePricingUnitChange(index, 'isMerged', e.target.checked)}
                                                        style={{ width: 16, height: 16, accentColor: '#16a34a', cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontSize: 12.5, fontWeight: 700, color: unit.isMerged ? '#166534' : '#64748b' }}>
                                                        {unit.isMerged ? '✓ Merge Enabled' : 'Enable Merge'}
                                                    </span>
                                                </label>
                                            </div>

                                            {unit.isMerged ? (
                                                <div className="as-classic-merge-body">
                                                    <div className="as-grid-2">
                                                        <div className="as-field" style={{ marginBottom: 0 }}>
                                                            <label className="as-label" style={{ color: '#166534', fontWeight: 600 }}>
                                                                Secondary Duration Unit
                                                            </label>
                                                            <select
                                                                className="as-select"
                                                                value={unit.mergedUnit || 'per day'}
                                                                onChange={(e) => handlePricingUnitChange(index, 'mergedUnit', e.target.value)}
                                                                style={{ borderColor: '#86efac' }}
                                                            >
                                                                <option value="per day">per day (Multi-day / Check-in to Check-out)</option>
                                                                <option value="per hour">per hour (Time Slots)</option>
                                                                <option value="per week">per week</option>
                                                                <option value="per month">per month</option>
                                                            </select>
                                                        </div>
                                                        <div className="as-classic-merge-preview">
                                                            <div style={{ fontWeight: 600, color: '#14532d', marginBottom: 4 }}>
                                                                📐 Formula: Rate × Qty ({unit.unit}) × Duration ({unit.mergedUnit || 'per day'})
                                                            </div>
                                                            <div style={{ fontSize: 11.5, color: '#166534' }}>
                                                                👁️ On service cards and booking screen, only <b>"{unit.unit}"</b> will be shown.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 8 }}>
                                                    Check "Enable Merge" above to calculate total price by both quantity ({unit.unit}) and duration (e.g. days/hours).
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {pricingUnits.length < 10 && (
                                <button
                                    type="button"
                                    className="btn btn-outline-primary w-100"
                                    style={{ borderRadius: 10, padding: '10px 0', fontWeight: 600 }}
                                    onClick={handleAddPricingUnit}
                                >
                                    <FaPlus style={{ marginRight: 6 }} /> Add Another Pricing Tier
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. Portfolio & Media */}
                <div className="as-card-section">
                    <div className="as-section-header">
                        <h3 className="as-section-title">
                            <span className="as-icon-box"><FaImage /></span>
                            Portfolio & Visual Showcase (At least 3 images required)
                        </h3>
                        <span className="as-section-hint">High-resolution service work photos</span>
                    </div>

                    <div className="as-images-grid">
                        {/* Image 1 */}
                        <div className={`as-image-slot ${imagePreview1 || image1 ? 'has-preview' : ''}`}>
                            <label className="as-label">Primary Image #1 <span className="as-required">*</span></label>
                            {(imagePreview1 || image1) ? (
                                <div className="as-preview-box">
                                    <img src={imagePreview1 || image1} alt="Preview 1" />
                                    <button
                                        type="button"
                                        className="as-remove-img-btn"
                                        onClick={() => removeImage(1)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="file"
                                        className="as-input"
                                        accept="image/*"
                                        onChange={(e) => handleImageFileSelect(1, e.target.files[0])}
                                    />
                                    <input
                                        type="text"
                                        className="as-input"
                                        placeholder="Or paste image URL"
                                        value={image1}
                                        onChange={(e) => handleImageUrlChange(1, e.target.value)}
                                    />
                                </>
                            )}
                        </div>

                        {/* Image 2 */}
                        <div className={`as-image-slot ${imagePreview2 || image2 ? 'has-preview' : ''}`}>
                            <label className="as-label">Showcase Image #2 <span className="as-required">*</span></label>
                            {(imagePreview2 || image2) ? (
                                <div className="as-preview-box">
                                    <img src={imagePreview2 || image2} alt="Preview 2" />
                                    <button
                                        type="button"
                                        className="as-remove-img-btn"
                                        onClick={() => removeImage(2)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="file"
                                        className="as-input"
                                        accept="image/*"
                                        onChange={(e) => handleImageFileSelect(2, e.target.files[0])}
                                    />
                                    <input
                                        type="text"
                                        className="as-input"
                                        placeholder="Or paste image URL"
                                        value={image2}
                                        onChange={(e) => handleImageUrlChange(2, e.target.value)}
                                    />
                                </>
                            )}
                        </div>

                        {/* Image 3 */}
                        <div className={`as-image-slot ${imagePreview3 || image3 ? 'has-preview' : ''}`}>
                            <label className="as-label">Showcase Image #3 <span className="as-required">*</span></label>
                            {(imagePreview3 || image3) ? (
                                <div className="as-preview-box">
                                    <img src={imagePreview3 || image3} alt="Preview 3" />
                                    <button
                                        type="button"
                                        className="as-remove-img-btn"
                                        onClick={() => removeImage(3)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="file"
                                        className="as-input"
                                        accept="image/*"
                                        onChange={(e) => handleImageFileSelect(3, e.target.files[0])}
                                    />
                                    <input
                                        type="text"
                                        className="as-input"
                                        placeholder="Or paste image URL"
                                        value={image3}
                                        onChange={(e) => handleImageUrlChange(3, e.target.value)}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Description & Facilities */}
                <div className="as-card-section">
                    <div className="as-section-header">
                        <h3 className="as-section-title">
                            <span className="as-icon-box"><FaListUl /></span>
                            Description & Service Highlights
                        </h3>
                        <span className="as-section-hint">Provide structured bullet points for customers</span>
                    </div>

                    <div className="as-grid-2">
                        <div className="as-field" style={{ marginBottom: 0 }}>
                            <label className="as-label">
                                Detailed Scope (One point per line)
                            </label>
                            <textarea
                                className="as-textarea"
                                placeholder="• Complete diagnosis and inspection&#10;• Original OEM replacement parts&#10;• Post-service performance check"
                                value={descriptionPoints}
                                onChange={(e) => setDescriptionPoints(e.target.value)}
                                rows={5}
                            />
                            <div className="as-field-tips">
                                <span>💡 Tip: Start lines with • for clean list rendering</span>
                                <span className="as-tag-pill">
                                    {descriptionPoints.split('\n').filter(l => l.trim()).length} points added
                                </span>
                            </div>
                        </div>

                        <div className="as-field" style={{ marginBottom: 0 }}>
                            <label className="as-label">
                                Facilities & Amenities Included (One per line) <span className="as-required">*</span>
                            </label>
                            <textarea
                                className="as-textarea"
                                placeholder="• Certified Technicians&#10;• 30-Day Service Guarantee&#10;• Emergency On-Site Response&#10;• Digital Invoicing"
                                value={facilityPoints}
                                onChange={(e) => setFacilityPoints(e.target.value)}
                                rows={5}
                            />
                            <div className="as-field-tips">
                                <span>💡 Tip: List equipment, warranties, or amenities</span>
                                <span className="as-tag-pill">
                                    {facilityPoints.split('\n').filter(l => l.trim()).length} facilities added
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Location Coverage & Pricing */}
                <div className="as-card-section">
                    <div className="as-section-header">
                        <h3 className="as-section-title">
                            <span className="as-icon-box"><FaMapMarkerAlt /></span>
                            Location Fulfillment & Delivery Scope
                        </h3>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                style={{ borderRadius: 8, fontWeight: 600 }}
                                onClick={() => setShowLocationOptions(!showLocationOptions)}
                            >
                                {showLocationOptions ? "Hide Scope" : "Configure Scope"}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                style={{ borderRadius: 8, fontWeight: 600 }}
                                onClick={() => setShowLocationPricing(!showLocationPricing)}
                            >
                                {showLocationPricing ? "Hide Surcharges" : "Location Surcharges"}
                            </button>
                        </div>
                    </div>

                    {/* Main Base Address */}
                    <div className="as-field" style={{ marginBottom: 20 }}>
                        <label className="as-label">
                            Main Headquarters / Operating Location <span className="as-required">*</span>
                        </label>
                        <LocationSearch
                            onLocationSelect={handleLocationSelect}
                            placeholder="Type to search your primary operating hub or city..."
                        />
                        {address && (
                            <div style={{
                                marginTop: 8,
                                padding: '8px 12px',
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                borderRadius: 10,
                                fontSize: 13,
                                color: '#059669',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}>
                                <FaCheckCircle /> Operating Base: <strong>{address.split(',')[0]}</strong>
                            </div>
                        )}
                    </div>

                    {/* Location Type Picker */}
                    {showLocationOptions && (
                        <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                            <label className="as-label" style={{ marginBottom: 12 }}>
                                Select Customer Address Requirement Type:
                            </label>

                            <div className="as-location-cards-row">
                                <div
                                    className={`as-loc-type-card ${selectedLocationType === "Simple" ? "selected" : ""}`}
                                    onClick={() => handleSelectLocationType("Simple")}
                                >
                                    <div className="as-loc-type-title">Single On-Site Address</div>
                                    <p className="as-loc-type-desc">Customer provides one delivery / doorstep service address.</p>
                                    <span className="as-tag-pill" style={{ width: 'fit-content', marginTop: 'auto' }}>Standard Services</span>
                                </div>

                                <div
                                    className={`as-loc-type-card ${selectedLocationType === "No" ? "selected" : ""}`}
                                    onClick={() => handleSelectLocationType("No")}
                                >
                                    <div className="as-loc-type-title">No Location Required</div>
                                    <p className="as-loc-type-desc">For virtual, digital, walk-in or pass-based events.</p>
                                    <span className="as-tag-pill" style={{ width: 'fit-content', marginTop: 'auto' }}>Digital / Tickets</span>
                                </div>

                                <div
                                    className={`as-loc-type-card ${selectedLocationType === "Rental" ? "selected" : ""}`}
                                    onClick={() => handleSelectLocationType("Rental")}
                                >
                                    <div className="as-loc-type-title">Multi-Point / Transit Route</div>
                                    <p className="as-loc-type-desc">Customer specifies pickup, drop-off and return destinations.</p>
                                    <span className="as-tag-pill" style={{ width: 'fit-content', marginTop: 'auto' }}>Logistics / Travel</span>
                                </div>
                            </div>

                            {selectedLocationType && !locationAdded && (
                                <button
                                    type="button"
                                    className="btn btn-success btn-sm"
                                    style={{ borderRadius: 8, fontWeight: 600, padding: '8px 18px' }}
                                    onClick={handleAddLocation}
                                >
                                    <FaCheckCircle style={{ marginRight: 6 }} /> Confirm Location Configuration
                                </button>
                            )}

                            {locationAdded && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#ecfdf5', borderRadius: 10, border: '1px solid #a7f3d0' }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>
                                        ✓ Configured Mode: {selectedLocationType === 'Simple' ? 'Single Address' : selectedLocationType === 'No' ? 'No Location' : 'Multi-Stop'}
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm"
                                        style={{ borderRadius: 6, fontSize: 11 }}
                                        onClick={handleRemoveLocation}
                                    >
                                        Change
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Location Specific Pricing */}
                    {showLocationPricing && (
                        <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                            <label className="as-label" style={{ marginBottom: 12 }}>
                                City / Regional Extra Surcharges:
                            </label>
                            <div className="as-grid-2">
                                <div className="as-field">
                                    <label className="as-label">Region or City Name</label>
                                    <LocationSearch
                                        onLocationSelect={handleLocationNameSelect}
                                        placeholder="Search city/region to add surcharge..."
                                    />
                                </div>
                                <div className="as-field">
                                    <label className="as-label">Extra Surcharge Amount (₹)</label>
                                    <input
                                        type="number"
                                        className="as-input"
                                        placeholder="e.g. 150"
                                        value={currentLocation.extraPrice}
                                        onChange={handleExtraPriceChange}
                                    />
                                </div>
                            </div>

                            {inputs.filter(inp => inp.name).length > 0 && (
                                <div style={{ marginTop: 14, marginBottom: 14 }}>
                                    <label className="as-label">Optional Add-ons Regional Extra Surcharges</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {inputs.filter(inp => inp.name).map((inp, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 140 }}>{inp.name}:</span>
                                                <input
                                                    type="number"
                                                    className="as-input"
                                                    style={{ maxWidth: 180 }}
                                                    placeholder="+ Extra Fee (₹)"
                                                    value={currentLocation.optionalInputsExtra.find(item => item.inputName === inp.name)?.extraPrice || 0}
                                                    onChange={(e) => handleOptionalInputExtraChange(inp.name, parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ borderRadius: 8, fontWeight: 600, marginTop: 10 }}
                                onClick={addLocationToService}
                            >
                                <FaPlus style={{ marginRight: 6 }} /> Add Region Surcharge
                            </button>

                            {locationsList.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                    <label className="as-label">Configured Region Adjustments ({locationsList.length})</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {locationsList.map((loc, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                                <div>
                                                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{loc.locationName}</span>
                                                    <span style={{ marginLeft: 8, fontSize: 12, color: '#2563eb', fontWeight: 600 }}>+₹{loc.extraPrice} surcharge</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm"
                                                    style={{ borderRadius: 6, fontSize: 11 }}
                                                    onClick={() => removeLocation(idx)}
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 6. Optional Add-ons & Extra Services */}
                <div className="as-card-section">
                    <div className="as-section-header">
                        <h3 className="as-section-title">
                            <span className="as-icon-box"><FaPlusCircle /></span>
                            Optional Add-ons & Extra Services
                        </h3>
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            style={{ borderRadius: 8, fontWeight: 600 }}
                            onClick={() => setShowOptionalInputs(!showOptionalInputs)}
                        >
                            {showOptionalInputs ? "Hide Add-ons" : "Configure Add-ons (+)"}
                        </button>
                    </div>

                    {showOptionalInputs && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {inputs.map((input, index) => (
                                <div key={index} style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                        <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                                            Add-on Item #{index + 1}
                                        </span>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <button
                                                type="button"
                                                className={`as-classic-merge-btn ${input.isMerged ? 'active' : ''} ${openOptionalMerge[index] ? 'open' : ''}`}
                                                onClick={() => setOpenOptionalMerge(prev => ({ ...prev, [index]: !prev[index] }))}
                                                title="Click to configure unit merge"
                                            >
                                                <FaLink style={{ fontSize: 11, marginRight: 5 }} />
                                                <span>
                                                    {input.isMerged 
                                                        ? `Merged: + ${input.mergedUnit || 'per day'}` 
                                                        : '+ Merge Option'}
                                                </span>
                                                <FaChevronDown className="as-merge-chevron" style={{
                                                    fontSize: 10,
                                                    marginLeft: 6,
                                                    transform: openOptionalMerge[index] ? 'rotate(180deg)' : 'none',
                                                    transition: 'transform 0.2s ease'
                                                }} />
                                            </button>
                                            {inputs.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm"
                                                    style={{ borderRadius: 6, fontSize: 11 }}
                                                    onClick={() => handleRemoveInput(index)}
                                                >
                                                    <FaTrash style={{ marginRight: 4 }} /> Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="as-grid-3">
                                        <div className="as-field">
                                            <label className="as-label">Add-on Title</label>
                                            <input
                                                type="text"
                                                className="as-input"
                                                placeholder="e.g. Deep Pipe Cleaning"
                                                value={input.name}
                                                onChange={(e) => handleInputChange(index, "name", e.target.value)}
                                            />
                                        </div>
                                        <div className="as-field">
                                            <label className="as-label">Extra Fee (₹ INR)</label>
                                            <input
                                                type="number"
                                                className="as-input"
                                                placeholder="Amount"
                                                value={input.price}
                                                onChange={(e) => handleInputChange(index, "price", e.target.value)}
                                            />
                                        </div>
                                        <div className="as-field">
                                            <label className="as-label">Unit Type</label>
                                            <select
                                                className="as-select"
                                                value={input.unit}
                                                onChange={(e) => handleInputChange(index, "unit", e.target.value)}
                                            >
                                                {unitOptions.map(u => (
                                                    <option key={u} value={u}>{u}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    {input.unit === 'Other' && (
                                        <div className="as-field" style={{ marginTop: 10 }}>
                                            <label className="as-label">Custom Unit Name</label>
                                            <input
                                                type="text"
                                                className="as-input"
                                                placeholder="e.g. per piece"
                                                value={input.customUnit || ''}
                                                onChange={(e) => handleInputChange(index, "customUnit", e.target.value)}
                                            />
                                        </div>
                                    )}

                                    <div className="as-grid-2" style={{ marginTop: 12 }}>
                                        <div className="as-field" style={{ marginBottom: 0 }}>
                                            <label className="as-label">Max Quantity (Optional)</label>
                                            <input
                                                type="number"
                                                className="as-input"
                                                placeholder="Unlimited (e.g. 5)"
                                                min="1"
                                                value={input.maxcount || ''}
                                                onChange={(e) => handleInputChange(index, "maxcount", e.target.value)}
                                            />
                                        </div>
                                        <div className="as-field" style={{ marginBottom: 0 }}>
                                            <label className="as-label">Optional Add-on Image</label>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                <input
                                                    type="file"
                                                    className="as-input"
                                                    accept="image/*"
                                                    onChange={(e) => handleOptionalImageUpload(index, e.target.files[0])}
                                                    disabled={!!input.image && !optionalInputImages[index]}
                                                />
                                                {(optionalInputPreviews[index] || input.image) && (
                                                    <img
                                                        src={optionalInputPreviews[index] || input.image}
                                                        alt="Addon preview"
                                                        style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Merge Unit Section for this Optional Add-on (Shown when upper side Merge Option is clicked) */}
                                    {openOptionalMerge[index] && (
                                        <div className="as-classic-merge-box">
                                            <div className="as-classic-merge-header">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span className="as-classic-merge-badge">
                                                        <FaLink style={{ fontSize: 11 }} /> Unit Merge Section
                                                    </span>
                                                    <span style={{ fontSize: 12, color: '#64748b' }}>
                                                        Combine {input.unit || 'per item'} with duration
                                                    </span>
                                                </div>
                                                <label className="as-classic-toggle-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={input.isMerged || false}
                                                        onChange={(e) => handleInputChange(index, 'isMerged', e.target.checked)}
                                                        style={{ width: 16, height: 16, accentColor: '#16a34a', cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontSize: 12.5, fontWeight: 700, color: input.isMerged ? '#166534' : '#64748b' }}>
                                                        {input.isMerged ? '✓ Merge Enabled' : 'Enable Merge'}
                                                    </span>
                                                </label>
                                            </div>

                                            {input.isMerged ? (
                                                <div className="as-classic-merge-body">
                                                    <div className="as-grid-2">
                                                        <div className="as-field" style={{ marginBottom: 0 }}>
                                                            <label className="as-label" style={{ color: '#166534', fontWeight: 600 }}>
                                                                Secondary Duration Unit
                                                            </label>
                                                            <select
                                                                className="as-select"
                                                                value={input.mergedUnit || 'per day'}
                                                                onChange={(e) => handleInputChange(index, 'mergedUnit', e.target.value)}
                                                                style={{ borderColor: '#86efac' }}
                                                            >
                                                                <option value="per day">per day (Multi-day / Duration)</option>
                                                                <option value="per hour">per hour (Time Slots)</option>
                                                                <option value="per week">per week</option>
                                                                <option value="per month">per month</option>
                                                            </select>
                                                        </div>
                                                        <div className="as-classic-merge-preview">
                                                            <div style={{ fontWeight: 600, color: '#14532d', marginBottom: 4 }}>
                                                                📐 Formula: Extra Fee × Qty ({input.unit || 'item'}) × Duration ({input.mergedUnit || 'per day'})
                                                            </div>
                                                            <div style={{ fontSize: 11.5, color: '#166534' }}>
                                                                👁️ On service cards and booking screen, only <b>"{input.unit || 'item'}"</b> will be shown.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 8 }}>
                                                    Check "Enable Merge" above to calculate extra fee by both count ({input.unit || 'items'}) and duration (e.g. days/hours).
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            <button
                                type="button"
                                className="btn btn-outline-primary"
                                style={{ borderRadius: 10, padding: '10px 0', fontWeight: 600 }}
                                onClick={handleAddInput}
                            >
                                <FaPlus style={{ marginRight: 6 }} /> Add Another Optional Add-on
                            </button>
                        </div>
                    )}
                </div>

                {/* 7. Bottom Submission Bar */}
                <div className="as-action-bar">
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                            {isEditing ? "Ready to Save Changes?" : "Ready to Launch Service?"}
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>
                            {isEditing
                                ? "Ensure service details and at least 3 photos are in place before saving."
                                : "Make sure service title, category, 3 photos, and base price are provided."}
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        {!isEditing && (
                            <button
                                type="button"
                                className="as-demo-agent-btn-secondary"
                                onClick={handleFillDemoData}
                                title="Generate another set of dynamic demo data"
                            >
                                <FaDice style={{ marginRight: 6 }} /> Fill Different Demo Data
                            </button>
                        )}
                        {isEditing && (
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={handleCancelEdit}
                                style={{ borderRadius: 10, padding: '10px 18px', fontWeight: 600 }}
                            >
                                Cancel Edit
                            </button>
                        )}
                        <button
                            type="button"
                            className="as-publish-btn"
                            onClick={addService}
                            disabled={uploading}
                            style={isEditing ? { background: '#d97706', borderColor: '#b45309' } : {}}
                        >
                            {uploading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" role="status" style={{ marginRight: 8 }} />
                                    {isEditing ? "Saving Changes..." : "Processing & Uploading..."}
                                </>
                            ) : (
                                <>
                                    {isEditing ? "💾 Update Service Listing →" : "Publish Service Listing →"}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Addservice;
