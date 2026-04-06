const express = require("express");
const Service = require("../models/service");
const Vendor = require("../models/vendor");
const User = require("../models/user");  // <-- ADD THIS LINE: Import the User model
const Booking = require("../models/booking");

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
    }));
}


// In services.js
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


// Add service - With both location types and location pricing
router.post("/addservice", async (req, res) => {
    try {
        const { userid } = req.query; 
        const {
            service,
            rentperday,
            unit,
            customUnit,
            isCountable,
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
            locations,        // Location Type array
            locationPricing,  // Location Pricing array
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

        const newService = new Service({
            name: service,
            rentperday: parseFloat(rentperday) || 0,
            unit: unit || 'per day',
            customUnit: unit === 'Other' ? (customUnit || '') : '',
            isCountable: isCountable !== false,
            description: description || '',
            phonenumber: phonenumber || '',
            companyname: companyname || '',
            address: address,
            facility: facility || '',
            locations: locations || ['Simple'],  // Location Type
            locationPricing: locationPricing || [],  // Location Pricing
            imageurls: imageURLs,
            optionalInputs: normalizeOptionalInputs(optionalInputs),
            extraInputs: extraInputs || [],
            category: category || '',
            subCategory: subCategory || '',
            bookingType: bookingType,
            vendorId: userid,
            userid: userid,
            isVisible: true
        });

        await newService.save();
        
        console.log(`✅ Service created: ${newService._id}`);
        console.log(`📍 Location Types: ${locations?.join(', ') || 'Simple'}`);
        console.log(`💰 Location Pricing: ${locationPricing?.length || 0} areas configured`);
        
        res.status(201).json({ 
            message: "Service added successfully", 
            serviceId: newService._id 
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
        res.json(updatedService);
    } catch (error) {
        res.status(500).json({ message: 'Error updating service' });
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