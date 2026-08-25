const express = require("express");
const Service = require("../models/service");
const Vendor = require("../models/vendor");
const User = require("../models/user");
const Booking = require("../models/booking");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/services/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'service-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

const router = express.Router();

function normalizeOptionalInputs(inputs) {
    if (!inputs || !Array.isArray(inputs)) return [];
    return inputs.map((input) => ({
        name: input.name,
        price: parseFloat(input.price) || 0,
        image: input.image || '',
        maxcount: input.maxcount != null ? parseInt(input.maxcount, 10) : 1,
        unit: input.unit || 'per day',
        customUnit: input.customUnit || '',
        isCountable: input.isCountable !== false,
        bookingType: input.bookingType || 'Automatic Booking' // Inherit from main service
    }));
}

// Get services for admin/vendor dashboard
router.get("/getvisible", async (req, res) => {
    try {
        const { userid } = req.query;
        if (!userid) return res.status(400).json({ message: "User ID required" });

        const user = await User.findById(userid);
        const isSuperAdmin = user?.email === 'himanshufa875@gmail.com' && (user?.role === 'superadmin' || user?.isAdmin);

        // Strict filtering: Only show services owned by this user (unless Super Admin)
        const filter = isSuperAdmin ? {} : { vendorId: userid };
        const services = await Service.find(filter);
        
        res.send(services);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Upload image endpoint
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const imageUrl = `${baseUrl}/uploads/services/${req.file.filename}`;
        
        res.json({ 
            success: true,
            imageUrl: imageUrl 
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get all services (public)
router.get("/getallservices", async (req, res) => {
    try {
        const services = await Service.find({ isVisible: true });
        res.send(services);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get service by ID
router.post("/getservicebyid", async (req, res) => {
    try {
        const { serviceid } = req.body;
        const service = await Service.findById(serviceid);
        if (!service) {
            return res.status(404).json({ message: "Service not found" });
        }
        res.send(service);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// routes/serviceRoute.js - Updated addservice endpoint

// routes/serviceRoute.js - Updated addservice endpoint

router.post("/addservice", async (req, res) => {
    try {
        const { userid } = req.query;
        const {
            service,
            pricingUnits, // NEW: Array of pricing units
            rentperday, // Legacy - fallback
            unit, // Legacy - fallback
            customUnit, // Legacy - fallback
            isCountable,
            maxQuantityPerDay,
            maxUsersPerDay,
            description,
            phonenumber,
            companyname,
            address,
            facility,
            imageURLs,
            optionalInputs,
            extraInputs,
            category,
            subCategory,
            bookingType,
            locations,
            locationPricing
        } = req.body;

        // Validate required fields
        if (!service || !imageURLs || imageURLs.length < 3 || !facility || !bookingType) {
            return res.status(400).json({
                message: "Service name, at least 3 images, facility, and booking type are required"
            });
        }

        if (!address) {
            return res.status(400).json({
                message: "Service location address is required"
            });
        }

        if (!userid) {
            return res.status(400).json({
                message: "User ID is required to create a service"
            });
        }

        // Process pricing units
        let processedPricingUnits = [];
        let defaultUnit = null;

        if (pricingUnits && Array.isArray(pricingUnits) && pricingUnits.length > 0) {
            processedPricingUnits = pricingUnits.map(u => ({
                unit: u.unit || 'per day',
                price: parseFloat(u.price) || 0,
                customUnit: u.unit === 'Other' ? (u.customUnit || '') : '',
                isDefault: u.isDefault || false,
                isCountable: u.isCountable !== false,
                maxQuantityPerDay: u.maxQuantityPerDay ? parseInt(u.maxQuantityPerDay) : null,
                maxUsersPerDay: u.maxUsersPerDay ? parseInt(u.maxUsersPerDay) : null,
                description: u.description || ''
            }));

            // Find default unit
            defaultUnit = processedPricingUnits.find(u => u.isDefault) || processedPricingUnits[0];
        }

        // If no pricing units provided, use legacy fields
        if (!processedPricingUnits.length) {
            const defaultUnitData = {
                unit: unit || 'per day',
                price: parseFloat(rentperday) || 0,
                customUnit: unit === 'Other' ? (customUnit || '') : '',
                isDefault: true,
                isCountable: isCountable !== false,
                maxQuantityPerDay: maxQuantityPerDay ? parseInt(maxQuantityPerDay) : null,
                maxUsersPerDay: maxUsersPerDay ? parseInt(maxUsersPerDay) : null,
                description: ''
            };
            processedPricingUnits = [defaultUnitData];
            defaultUnit = defaultUnitData;
        }

        const processedLocationPricing = (locationPricing || []).map(location => ({
            locationName: location.locationName,
            locationAddress: location.locationAddress,
            extraPrice: parseFloat(location.extraPrice) || 0,
            optionalInputsExtra: (location.optionalInputsExtra || []).map(opt => ({
                inputName: opt.inputName,
                extraPrice: parseFloat(opt.extraPrice) || 0
            }))
        }));

        const processedLocations = (locations && locations.length > 0) ? locations : ['Simple'];

        const newService = new Service({
            name: service,
            // New: Multiple pricing units
            pricingUnits: processedPricingUnits,
            // Legacy fields (for backward compatibility)
            rentperday: defaultUnit.price,
            unit: defaultUnit.unit,
            customUnit: defaultUnit.customUnit || '',
            isCountable: defaultUnit.isCountable !== false,
            maxQuantityPerDay: defaultUnit.maxQuantityPerDay || null,
            maxUsersPerDay: defaultUnit.maxUsersPerDay || null,
            description: description || '',
            phonenumber: phonenumber || '',
            companyname: companyname || '',
            address: address,
            facility: facility || '',
            locations: processedLocations,
            locationPricing: processedLocationPricing,
            imageurls: imageURLs,
            optionalInputs: normalizeOptionalInputs(optionalInputs),
            extraInputs: extraInputs || [],
            category: category || '',
            subCategory: subCategory || '',
            bookingType: bookingType,
            vendorId: userid,
            userid: userid,
            isVisible: true,
            unavailableDates: []
        });

        await newService.save();

        console.log(`✅ Service created: ${newService._id}`);
        console.log(`💰 Pricing Units: ${processedPricingUnits.length} options configured`);
        console.log(`⭐ Default Unit: ${defaultUnit.unit} @ ₹${defaultUnit.price}`);
        console.log(`📍 Location Types: ${processedLocations.join(', ')}`);

        res.status(201).json({
            message: "Service added successfully",
            serviceId: newService._id,
            service: newService
        });
    } catch (error) {
        console.error("Add service error:", error);
        res.status(400).json({ error: error.message });
    }
});
// Delete service
router.delete("/deleteservice/:id", async (req, res) => {
    try {
        const service = await Service.findByIdAndDelete(req.params.id);
        if (!service) {
            return res.status(404).json({ message: "Service not found" });
        }
        res.json({ message: "Service deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting service" });
    }
});

// Toggle visibility
router.put('/togglevisibility/:id', async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        service.isVisible = req.body.isVisible !== undefined ? req.body.isVisible : !service.isVisible;
        await service.save();

        res.json(service);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update availability
router.put("/updateavailability/:id", async (req, res) => {
    try {
        const { unavailableDates } = req.body;
        const service = await Service.findByIdAndUpdate(
            req.params.id,
            { unavailableDates },
            { new: true }
        );
        
        if (!service) {
            return res.status(404).json({ message: "Service not found" });
        }
        
        res.json(service);
    } catch (error) {
        res.status(500).json({ message: "Failed to update availability" });
    }
});

// Update service
router.put("/update/:id", async (req, res) => {
    try {
        const updatedService = await Service.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        
        if (!updatedService) {
            return res.status(404).json({ message: "Service not found" });
        }
        
        res.json(updatedService);
    } catch (error) {
        res.status(500).json({ message: 'Error updating service' });
    }
});

// Get service with location pricing details
router.get("/servicewithpricing/:id", async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) {
            return res.status(404).json({ message: "Service not found" });
        }
        
        // Return complete service details including location pricing
        res.json({
            ...service.toObject(),
            locationPricing: service.locationPricing || [],
            locations: service.locations || ['Simple']
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get price for specific location
router.post("/getlocationprice", async (req, res) => {
    try {
        const { serviceId, locationName, locationAddress } = req.body;
        
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ message: "Service not found" });
        }
        
        // Find location-specific pricing
        const locationPricing = service.locationPricing || [];
        const matchedLocation = locationPricing.find(loc => 
            loc.locationName === locationName || 
            loc.locationAddress === locationAddress
        );
        
        let finalPrice = service.rentperday;
        let extraCharge = 0;
        
        if (matchedLocation) {
            extraCharge = matchedLocation.extraPrice || 0;
            finalPrice = service.rentperday + extraCharge;
        }
        
        res.json({
            basePrice: service.rentperday,
            extraCharge: extraCharge,
            totalPrice: finalPrice,
            unit: service.unit,
            customUnit: service.customUnit,
            locationSpecific: !!matchedLocation,
            locationPricing: matchedLocation || null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all location pricing for a service
router.get("/locationpricing/:serviceId", async (req, res) => {
    try {
        const service = await Service.findById(req.params.serviceId);
        if (!service) {
            return res.status(404).json({ message: "Service not found" });
        }
        
        res.json({
            serviceName: service.name,
            basePrice: service.rentperday,
            unit: service.unit,
            locations: service.locationPricing || [],
            locationTypes: service.locations || ['Simple']
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Vendor endpoints
router.post("/vendor", async (req, res) => {
    try {
        const { companyName, image, address } = req.body;

        if (!companyName || !image || !address) {
            return res.status(400).json({ message: "All vendor fields are required" });
        }

        const newVendor = new Vendor({ companyName, image, address });
        await newVendor.save();
        res.status(200).send("Vendor added successfully");
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put("/vendor/:id", async (req, res) => {
    try {
        const { companyName, image, address } = req.body;
        const updatedVendor = await Vendor.findByIdAndUpdate(
            req.params.id,
            { companyName, image, address },
            { new: true }
        );

        if (!updatedVendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        res.status(200).json({
            message: "Vendor updated successfully",
            vendor: updatedVendor
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/vendorservice", async (req, res) => {
    try {
        const vendors = await Vendor.find({});
        res.send(vendors);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;