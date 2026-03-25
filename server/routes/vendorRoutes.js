const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const Vendor = require("../models/vendor");
const Service = require("../models/service");
const Helper = require("../models/Helper");
const User = require("../models/user");
const Booking = require("../models/booking");
const Pathner = require("../models/pathner");

const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

const generateUniqueCode = async () => {
    let code;
    do {
        code = Math.floor(10000 + Math.random() * 90000).toString();
    } while (await Helper.findOne({ code }));
    return code;
};
// Get vendor profile by user ID
// In your vendor.js routes file
// In vendor.js routes - Update the profile endpoint
router.get("/profile/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log('Fetching vendor profile for userId:', userId);
        
        // First try to find in Vendor collection with proper userId linking
        let vendor = await Vendor.findOne({ userId: userId });
        
        if (vendor) {
            console.log('Found vendor in Vendor collection:', vendor._id);
            
            // Fetch pathner details if available
            const pathner = await Pathner.findOne({ 
                $or: [
                    { emailDetails: vendor.email },
                    { userId: userId }
                ]
            });
            
            const vendorData = {
                ...vendor.toObject(),
                _id: vendor._id, // Keep the vendor ID
                userId: vendor.userId, // Keep reference to user
                isFromVendorCollection: true,
                pathnerDetails: pathner || null
            };
            
            return res.json(vendorData);
        }
        
        // If not found in Vendor collection, check if user exists and is admin/vendor
        const user = await User.findById(userId);
        
        if (user && (user.role === 'admin' || user.role === 'vendor')) {
            console.log('User found with role:', user.role);
            
            // Check for pathner application with matching email
            const pathner = await Pathner.findOne({ 
                emailDetails: user.email 
            });
            
            // Create basic vendor object from user data
            const vendorData = {
                _id: user._id, // Important: Use user._id as the identifier
                userId: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                role: user.role,
                isVendor: true,
                isFromVendorCollection: false,
                pathnerDetails: pathner || null,
                skills: user.skills || '',
                experience: user.experience || 0,
                availability: user.availability || 'Available',
                hourlyRate: user.hourlyRate || 0,
                category: user.category || 'General',
                companyName: pathner?.serviceName || user.companyName || 'Individual Vendor',
                serviceType: pathner?.typeOfService || user.serviceType || 'General',
                description: pathner?.description || user.description || ''
            };
            
            return res.json(vendorData);
        }
        
        console.log('No vendor profile found for userId:', userId);
        return res.status(404).json({ message: "Vendor profile not found" });
        
    } catch (error) {
        console.error("Error fetching vendor profile:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// Update vendor profile
// In vendor.js routes
// In vendor.js routes - Replace the update endpoint with this
router.put("/update/:id", async (req, res) => {
    try {
        const vendorId = req.params.id;
        const updateData = req.body;
        
        console.log('Updating vendor profile:', { vendorId, updateData });
        
        // First, try to find in Vendor collection
        let vendor = await Vendor.findById(vendorId);
        
        if (vendor) {
            // Found in Vendor collection - update both Vendor and User
            console.log('Updating vendor from Vendor collection');
            
            const updatedVendor = await Vendor.findByIdAndUpdate(
                vendorId,
                { $set: updateData },
                { new: true }
            );
            
            // Also update the associated user
            if (vendor.userId) {
                const userUpdateData = {
                    name: updateData.name,
                    phone: updateData.phone,
                    address: updateData.address
                };
                
                // Only include fields that exist in User model
                Object.keys(userUpdateData).forEach(key => 
                    userUpdateData[key] === undefined && delete userUpdateData[key]
                );
                
                if (Object.keys(userUpdateData).length > 0) {
                    await User.findByIdAndUpdate(vendor.userId, userUpdateData);
                }
            }
            
            return res.json(updatedVendor);
        }
        
        // If not found in Vendor collection, check if it's a User-based vendor
        const user = await User.findById(vendorId);
        
        if (user && (user.role === 'admin' || user.role === 'vendor')) {
            console.log('Updating user-based vendor profile');
            
            // Update the user document
            const userUpdateData = {
                name: updateData.name,
                phone: updateData.phone,
                address: updateData.address,
                skills: updateData.skills,
                experience: updateData.experience,
                availability: updateData.availability,
                hourlyRate: updateData.hourlyRate,
                category: updateData.category,
                companyName: updateData.companyName,
                serviceType: updateData.serviceType,
                description: updateData.description
            };
            
            // Remove undefined fields
            Object.keys(userUpdateData).forEach(key => 
                userUpdateData[key] === undefined && delete userUpdateData[key]
            );
            
            const updatedUser = await User.findByIdAndUpdate(
                vendorId,
                { $set: userUpdateData },
                { new: true }
            );
            
            // Also update pathner details if they exist
            if (updateData.companyName || updateData.serviceType) {
                await Pathner.findOneAndUpdate(
                    { emailDetails: user.email },
                    {
                        $set: {
                            serviceName: updateData.companyName || user.companyName,
                            typeOfService: updateData.serviceType || user.serviceType,
                            description: updateData.description || user.description
                        }
                    },
                    { new: true, upsert: false }
                );
            }
            
            // Return the updated data in vendor format
            const pathner = await Pathner.findOne({ emailDetails: user.email });
            
            const updatedVendorData = {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                address: updatedUser.address,
                role: updatedUser.role,
                isVendor: true,
                isFromVendorCollection: false,
                pathnerDetails: pathner || null,
                skills: updatedUser.skills || '',
                experience: updatedUser.experience || 0,
                availability: updatedUser.availability || 'Available',
                hourlyRate: updatedUser.hourlyRate || 0,
                category: updatedUser.category || 'General',
                companyName: pathner?.serviceName || updatedUser.companyName || 'Individual Vendor',
                serviceType: pathner?.typeOfService || updatedUser.serviceType || 'General',
                description: pathner?.description || updatedUser.description || ''
            };
            
            return res.json(updatedVendorData);
        }
        
        return res.status(404).json({ message: "Vendor not found" });
        
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ message: "Server error: " + error.message });
    }
});
// Get all vendors (for super admin)
router.get('/all', async (req, res) => {
    try {
        const vendors = await Vendor.find()
            .sort({ createdAt: -1 })
            .lean();
        
        // Add default values for missing fields
        const enhancedVendors = vendors.map(vendor => ({
            ...vendor,
            availability: vendor.availability || 'Available',
            skills: vendor.skills || '',
            experience: vendor.experience || 0,
            hourlyRate: vendor.hourlyRate || 0,
            category: vendor.category || 'General',
            address: vendor.address || '',
            description: vendor.description || '',
            completedJobs: vendor.completedJobs || 0,
            activeJobs: vendor.activeJobs || 0,
            totalEarnings: vendor.totalEarnings || 0,
            documents: vendor.documents || [],
            reviews: vendor.reviews || []
        }));
        
        res.json(enhancedVendors);
    } catch (error) {
        console.error('Error in /all route:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
  
router.post('/add',
    upload.fields([
        { name: "idProof", maxCount: 1 },
        { name: "pastWorkPhotos", maxCount: 5 }
    ]),
    async (req, res) => {
        try {
            console.log("Request body:", req.body);
            console.log("Request files:", req.files);

            const { vendorId } = req.body;
            if (!vendorId) return res.status(400).json({ success: false, message: "Vendor ID required" });

            const user = await User.findById(vendorId);
            if (!user || (user.role !== 'vendor' && user.role !== 'admin' && !(user.email === 'himanshufa875@gmail.com' && user.role === 'superadmin'))) {
                return res.status(403).json({ success: false, message: "Unauthorized to add helper" });
            }

            const existingHelper = await Helper.findOne({ email: req.body.email });
            if (existingHelper) {
                return res.status(400).json({
                    success: false,
                    message: 'Helper with this email already exists'
                });
            }

            const policeVerification = req.body.policeVerification === 'true';
            const code = await generateUniqueCode();

            const files = {
                idProof: req.files["idProof"]?.[0]?.filename || null,
                pastWorkPhotos: req.files["pastWorkPhotos"]?.map(f => f.filename) || []
            };

            const newHelper = new Helper({
                name: req.body.name,
                phone: req.body.phone,
                email: req.body.email,
                address: req.body.address,
                age: req.body.age,
                experience: req.body.experience,
                skills: req.body.skills,
                availability: req.body.availability,
                policeVerification: policeVerification,
                idProof: files.idProof,
                pastWorkPhotos: files.pastWorkPhotos,
                code: code,
                vendorId: vendorId
            });

            await newHelper.save();
            
            res.status(201).json({
                success: true,
                message: "Helper added successfully!",
                helper: newHelper
            });
        } catch (error) {
            console.error("Add helper error:", error);
            
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'Helper with this email already exists'
                });
            }
            
            res.status(500).json({
                success: false,
                message: error.message || "Failed to add helper"
            });
        }
    });

// Delete helper
router.delete("/vendor-helper/delete/:id", async (req, res) => {
    try {
        await Helper.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Helper deleted successfully!" });
    } catch (error) {
        console.error("Error deleting helper:", error);
        res.status(500).json({ message: "Failed to delete helper." });
    }
});

// Get all helpers
router.get("/helpers", async (req, res) => {
    try {
        const { userid } = req.query;
        if (!userid) return res.status(400).json({ message: "User ID required" });

        const user = await User.findById(userid);
        const isSuperAdmin = user?.email === 'himanshufa875@gmail.com' && (user?.role === 'superadmin' || user?.isAdmin);

        const filter = isSuperAdmin ? {} : { vendorId: userid };
        const helpers = await Helper.find(filter).lean();
        
        if (helpers.length === 0) {
            return res.status(404).json({ message: "No helpers found for this vendor" });
        }
        res.status(200).json(helpers);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;