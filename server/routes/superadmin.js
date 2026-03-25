const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Service = require("../models/service");
const Booking = require("../models/booking");
const Vendor = require("../models/vendor");
const Helper = require("../models/Helper");
const Pathner = require("../models/pathner");

const isSuperAdmin = async (req, res, next) => {
    try {
        const userId = req.body.userid || req.query.userid;
        
        console.log('🔐 Checking super admin access for user:', userId);
        
        if (!userId) {
            return res.status(401).json({ 
                success: false,
                message: "User ID is required" 
            });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            console.log('❌ User not found');
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }
        
        console.log('👤 User found:', {
            name: user.name,
            email: user.email,
            role: user.role,
            isAdmin: user.isAdmin
        });
        
        // Check if user has superadmin role OR isAdmin is true
        if (user.role !== 'superadmin' && !user.isAdmin) {
            console.log('❌ Access denied - User is not super admin');
            return res.status(403).json({ 
                success: false,
                message: "Access denied. Super Admin only." 
            });
        }
        
        console.log('✅ SuperAdmin access granted');
        next();
    } catch (error) {
        console.error('SuperAdmin middleware error:', error);
        res.status(500).json({ 
            success: false,
            message: "Authentication error" 
        });
    }
};
// Apply middleware to all routes
router.use(isSuperAdmin);

// Dashboard Statistics - FIXED VERSION
router.get("/dashboard", async (req, res) => {
    try {
        console.log('Fetching dashboard data...');
        
        const [
            totalUsers,
            totalServices,
            totalBookings,
            totalVendors, // This will now count users with 'admin' role
            totalHelpers,
            totalPathners,
            todaysBookings
        ] = await Promise.all([
            // Count only regular users (not vendors/admins)
            User.countDocuments({ role: 'user' }),
            Service.countDocuments(),
            Booking.countDocuments(),
            // Count vendors (users with 'admin' role)
            User.countDocuments({ role: 'admin' }),
            Helper.countDocuments(),
            Pathner.countDocuments(),
            // Today's bookings
            Booking.countDocuments({
                createdAt: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    $lt: new Date(new Date().setHours(23, 59, 59, 999))
                }
            })
        ]);

        // Calculate revenue from completed bookings
        const revenueResult = await Booking.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        // Get pending pathners count
        const pendingPathners = await Pathner.countDocuments({
            status: 'pending' // Adjust based on your Pathner model
        });

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalServices,
                totalBookings,
                totalVendors,
                totalHelpers,
                totalPathners,
                todaysBookings,
                totalRevenue,
                pendingPathners
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// User Management - FIXED
router.get("/users", async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const users = await User.find({})
            .select('-password')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await User.countDocuments();

        res.json({
            success: true,
            users: users,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// Service Management - FIXED
router.get("/services", async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const services = await Service.find({})
            .populate('vendorId', 'companyName email')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Service.countDocuments();

        res.json({
            success: true,
            services: services,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Services fetch error:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// Booking Management - FIXED
// Booking Management - ENHANCED VERSION
// Booking Management - FIXED VERSION (No vendorId in populate)
router.get("/bookings", async (req, res) => {
    try {
        const { page = 1, limit = 10, status, service, date } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Build filter object
        const filter = {};
        
        if (status && status !== 'all') {
            filter.status = status;
        }
        
        if (service && service !== 'all') {
            filter.serviceid = service;
        }
        
        if (date) {
            filter.createdAt = {
                $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
                $lt: new Date(new Date(date).setHours(23, 59, 59, 999))
            };
        }

        // Get bookings without vendorId populate
        const bookings = await Booking.find(filter)
            .populate('userid', 'name email phone')
            .populate('serviceid', 'name rentperday category')
            .populate('assignedHelpers', 'name phone rating')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Booking.countDocuments(filter);

        // Get vendor information for each booking through the service
        const bookingsWithVendors = await Promise.all(
            bookings.map(async (booking) => {
                let vendorInfo = null;
                
                // If service exists and has vendorId, get vendor details
                if (booking.serviceid && booking.serviceid.vendorId) {
                    vendorInfo = await Vendor.findById(booking.serviceid.vendorId)
                        .select('companyName email phone');
                }
                
                return {
                    ...booking.toObject(),
                    vendorInfo: vendorInfo // Add vendor info separately
                };
            })
        );

        // Get filter options
        const services = await Service.find({}).select('name _id');

        res.json({
            success: true,
            bookings: bookingsWithVendors,
            filterOptions: {
                services: services
            },
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Bookings fetch error:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});
// Vendor Management - FIXED
// Vendor Management - Fetch users with 'admin' role (vendors)
router.get("/vendors", async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Fetch users with 'admin' role (vendors)
        const vendors = await User.find({ role: 'admin' })
            .select('-password')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await User.countDocuments({ role: 'admin' });

        res.json({
            success: true,
            vendors: vendors,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Vendors fetch error:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});


// Helper Management - FIXED
router.get("/helpers", async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const helpers = await Helper.find({})
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Helper.countDocuments();

        res.json({
            success: true,
            helpers: helpers,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Helpers fetch error:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// Pathner Management - FIXED
router.get("/pathners", async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const pathners = await Pathner.find({})
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Pathner.countDocuments();

        res.json({
            success: true,
            pathners: pathners,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Pathners fetch error:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});
// Convert Pathner to Vendor - UPDATED VERSION
// Convert Pathner to Vendor - UPDATED (using 'admin' role for vendors)
// In your superadmin.js routes file - Update the pathner-to-vendor conversion
router.post("/pathner-to-vendor/:pathnerId", async (req, res) => {
    try {
        const { pathnerId } = req.params;
        const userId = req.query.userid;
        
        console.log('🔄 Converting pathner to vendor:', { pathnerId, userId });
        
        if (!pathnerId) {
            return res.status(400).json({ 
                success: false,
                message: "Pathner ID is required" 
            });
        }

        // Find the pathner
        const pathner = await Pathner.findById(pathnerId);
        if (!pathner) {
            return res.status(404).json({ 
                success: false,
                message: "Pathner not found" 
            });
        }

        console.log('📝 Found pathner:', {
            serviceName: pathner.serviceName,
            owner: pathner.ownerDetails,
            email: pathner.emailDetails,
            phone: pathner.phoneNumber
        });

        // Check if vendor already exists with this email
        const existingVendor = await Vendor.findOne({ email: pathner.emailDetails });
        if (existingVendor) {
            return res.status(400).json({ 
                success: false,
                message: "Vendor already exists with this email" 
            });
        }

        // Check if user exists with this email
        let existingUser = await User.findOne({ email: pathner.emailDetails });
        let userIdForVendor = null;

        if (existingUser) {
            // Update existing user to admin role (vendor)
            existingUser.role = 'admin';
            existingUser.isAdmin = true;
            // Store pathner details in user document
            existingUser.companyName = pathner.serviceName;
            existingUser.serviceType = pathner.typeOfService;
            existingUser.description = pathner.description;
            await existingUser.save();
            userIdForVendor = existingUser._id;
            console.log('✅ Updated existing user to admin:', existingUser._id);
        } else {
            // Create new user with admin role (vendor)
            const newUser = new User({
                name: pathner.ownerDetails,
                email: pathner.emailDetails,
                password: 'Temp@123',
                role: 'admin',
                isAdmin: true,
                phone: pathner.phoneNumber,
                address: pathner.address || 'Not provided',
                companyName: pathner.serviceName,
                serviceType: pathner.typeOfService,
                description: pathner.description
            });
            await newUser.save();
            userIdForVendor = newUser._id;
            console.log('✅ Created new user with admin role:', newUser._id);
        }

        // Create new vendor with proper userId linking
        const newVendor = new Vendor({
            name: pathner.ownerDetails,
            image: pathner.image || '/default-vendor-image.jpg',
            companyName: pathner.serviceName,
            ownerName: pathner.ownerDetails,
            email: pathner.emailDetails,
            phone: pathner.phoneNumber,
            address: pathner.address || 'Not provided',
            serviceType: pathner.typeOfService || 'General Service',
            description: pathner.description || `Vendor converted from pathner application`,
            category: pathner.typeOfService || 'General',
            
            // IMPORTANT: Link to the specific user
            userId: userIdForVendor,
            
            // Approval fields
            isApproved: true,
            approvedBy: userId,
            approvedDate: new Date(),
            
            // Status
            status: 'active',
            availability: 'Available'
        });

        await newVendor.save();
        console.log('✅ Vendor created successfully:', {
            vendorId: newVendor._id,
            userId: newVendor.userId,
            companyName: newVendor.companyName
        });
        
        // Delete the pathner after successful conversion
        await Pathner.findByIdAndDelete(pathnerId);
        console.log('✅ Pathner deleted after conversion');

        res.json({ 
            success: true,
            message: "Pathner successfully converted to Vendor", 
            vendor: {
                id: newVendor._id,
                companyName: newVendor.companyName,
                email: newVendor.email,
                phone: newVendor.phone,
                userId: newVendor.userId
            }
        });

    } catch (error) {
        console.error('❌ Pathner conversion error:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: `Validation failed: ${errors.join(', ')}`
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: error.message || "Server error during conversion" 
        });
    }
});

// Update Booking Status - FIXED
router.put("/bookings/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid status" 
            });
        }

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('userid serviceid');

        if (!booking) {
            return res.status(404).json({ 
                success: false,
                message: "Booking not found" 
            });
        }

        res.json({ 
            success: true,
            message: "Booking status updated", 
            booking 
        });
    } catch (error) {
        console.error('Booking status update error:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});
// In your delete route - add this check
router.delete("/:entity/:id", async (req, res) => {
    try {
        const { entity, id } = req.params;
        let Model;
        
        switch (entity) {
            case 'user':
                Model = User;
                break;
            case 'service':
                Model = Service;
                break;
            case 'booking':
                Model = Booking;
                break;
            case 'vendor':
                Model = Vendor;
                break;
            case 'helper':
                Model = Helper;
                break;
            case 'pathner':
                Model = Pathner;
                break;
            default:
                return res.status(400).json({ 
                    success: false,
                    message: "Invalid entity" 
                });
        }

        // Prevent superadmin from deleting themselves
        if (entity === 'user') {
            const user = await User.findById(id);
            if (user && (user.role === 'superadmin' || user.isAdmin)) {
                return res.status(403).json({
                    success: false,
                    message: "Cannot delete admin/super admin user"
                });
            }
        }

        const result = await Model.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({ 
                success: false,
                message: `${entity} not found` 
            });
        }

        res.json({ 
            success: true,
            message: `${entity} deleted successfully` 
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

module.exports = router;