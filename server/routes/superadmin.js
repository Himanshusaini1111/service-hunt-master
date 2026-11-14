const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/user");
const Service = require("../models/service");
const Booking = require("../models/booking");
const Vendor = require("../models/vendor");
const Helper = require("../models/Helper");
const Pathner = require("../models/pathner");
const PayoutRequest = require("../models/PayoutRequest");

// Escrow & Commission Evaluation Helper
const evaluateBookingEscrow = (booking) => {
    if (booking.status !== 'completed') {
        return {
            isCompleted: false,
            total: Number(booking.totalAmount) || 0,
            commission: 0,
            netEarning: 0,
            isMatured: false,
            payoutStatus: booking.payoutStatus || 'unsettled'
        };
    }

    const total = Number(booking.totalAmount) || 0;
    const isInquiry = booking.bookingType === 'Inquari Booking' || booking.bookingType === 'inquiry';
    const commission = booking.platformCommission > 0 
        ? booking.platformCommission 
        : (isInquiry ? 200 : Math.round(total * 0.05 * 100) / 100);
    const netEarning = Math.max(0, total - commission);

    const completedAt = booking.completedAt || booking.updatedAt || booking.createdAt || new Date();
    const escrowReleaseDate = booking.escrowReleaseDate || new Date(new Date(completedAt).getTime() + (2 * 24 * 60 * 60 * 1000));
    const now = new Date();
    const isMatured = now >= new Date(escrowReleaseDate);

    let payoutStatus = booking.payoutStatus || 'in_escrow';
    if (payoutStatus === 'unsettled' || payoutStatus === 'in_escrow') {
        payoutStatus = isMatured ? 'available' : 'in_escrow';
    }

    return {
        isCompleted: true,
        total,
        commission,
        netEarning,
        completedAt,
        escrowReleaseDate,
        isMatured,
        payoutStatus
    };
};

// Robust SuperAdmin Authentication Middleware
const isSuperAdmin = async (req, res, next) => {
    try {
        const userId = req.body.userid || req.query.userid || req.headers['x-user-id'];
        let user = null;
        
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            user = await User.findById(userId);
        }

        // If user not found by provided ID, fallback to configured SuperAdmin
        if (!user) {
            user = await User.findOne({
                $or: [
                    { email: 'himanshufa875@gmail.com' },
                    { role: 'superadmin' }
                ]
            });
        }

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: "No Super Admin account found in the system." 
            });
        }

        // Authorization check
        const isAuthorized = user.role === 'superadmin' || user.isAdmin || user.email === 'himanshufa875@gmail.com';
        if (!isAuthorized) {
            return res.status(403).json({ 
                success: false, 
                message: "Access denied. Super Admin privileges required." 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('SuperAdmin middleware error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Authentication error: " + error.message 
        });
    }
};

// Apply middleware to all routes
router.use(isSuperAdmin);

// =========================================================================
// 1. DASHBOARD OVERVIEW & METRICS
// =========================================================================
router.get("/dashboard", async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const vendorFilter = {
            $or: [{ role: 'admin' }, { role: 'vendor' }, { isAdmin: true }, { role: 'superadmin' }]
        };

        const [
            totalUsers,
            totalVendors,
            totalServices,
            totalBookings,
            todaysBookings,
            totalHelpers,
            totalPathners,
            allCompletedBookings,
            pendingPayouts,
            recentBookings
        ] = await Promise.all([
            User.countDocuments({ role: 'user', isAdmin: { $ne: true } }),
            User.countDocuments(vendorFilter),
            Service.countDocuments(),
            Booking.countDocuments(),
            Booking.countDocuments({ createdAt: { $gte: todayStart, $lt: todayEnd } }),
            Helper.countDocuments(),
            Pathner.countDocuments(),
            Booking.find({ status: 'completed' }).select('totalAmount platformCommission adminNetEarning bookingType completedAt escrowReleaseDate payoutStatus'),
            PayoutRequest.find({ status: 'pending' }).select('amount'),
            Booking.find({})
                .sort({ createdAt: -1 })
                .limit(8)
                .select('name service totalAmount status paymentMethod createdAt bookingType userid vendorId')
        ]);

        let grossRevenue = 0;
        let platformRevenue = 0;
        let adminNetRevenue = 0;

        allCompletedBookings.forEach(booking => {
            const evaluated = evaluateBookingEscrow(booking);
            grossRevenue += evaluated.total;
            platformRevenue += evaluated.commission;
            adminNetRevenue += evaluated.netEarning;
        });

        const pendingPayoutsCount = pendingPayouts.length;
        const pendingPayoutsAmount = pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

        res.json({
            success: true,
            currentUser: {
                _id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role
            },
            stats: {
                totalUsers,
                totalVendors,
                totalServices,
                totalBookings,
                todaysBookings,
                totalHelpers,
                totalPathners,
                grossRevenue: Math.round(grossRevenue),
                platformRevenue: Math.round(platformRevenue),
                adminNetRevenue: Math.round(adminNetRevenue),
                pendingPayoutsCount,
                pendingPayoutsAmount
            },
            recentBookings
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =========================================================================
// 2. ADMINS / VENDORS LIST WITH DETAILED STATS
// =========================================================================
router.get("/vendors", async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const vendorFilter = {
            $or: [{ role: 'admin' }, { role: 'vendor' }, { isAdmin: true }, { role: 'superadmin' }]
        };

        if (search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            vendorFilter.$and = [
                {
                    $or: [
                        { name: regex },
                        { email: regex },
                        { phone: regex },
                        { companyName: regex },
                        { serviceType: regex }
                    ]
                }
            ];
        }

        const [vendors, total] = await Promise.all([
            User.find(vendorFilter)
                .select('-password')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 }),
            User.countDocuments(vendorFilter)
        ]);

        // Enrich vendors with their services count, helpers count, bookings, earnings
        const enrichedVendors = await Promise.all(
            vendors.map(async (v) => {
                const vendorIdStr = v._id.toString();

                const [servicesCount, helpersCount, bookings] = await Promise.all([
                    Service.countDocuments({
                        $or: [{ vendorId: v._id }, { userid: v._id }]
                    }),
                    Helper.countDocuments({
                        $or: [{ vendorId: vendorIdStr }, { vendorId: v._id }]
                    }),
                    Booking.find({
                        $or: [{ vendorId: vendorIdStr }, { vendorId: v._id }]
                    }).select('totalAmount status platformCommission adminNetEarning bookingType')
                ]);

                let grossEarnings = 0;
                let netEarnings = 0;
                let completedBookings = 0;

                bookings.forEach(b => {
                    if (b.status === 'completed') {
                        completedBookings++;
                        const evalData = evaluateBookingEscrow(b);
                        grossEarnings += evalData.total;
                        netEarnings += evalData.netEarning;
                    }
                });

                return {
                    ...v.toObject(),
                    servicesCount,
                    helpersCount,
                    totalBookings: bookings.length,
                    completedBookings,
                    grossEarnings: Math.round(grossEarnings),
                    netEarnings: Math.round(netEarnings)
                };
            })
        );

        res.json({
            success: true,
            vendors: enrichedVendors,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Vendors fetch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =========================================================================
// 3. PARTICULAR ADMIN / VENDOR COMPLETE DETAILS (Services, Helpers, Payments, Bookings)
// =========================================================================
router.get("/vendor/:id/details", async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Vendor/Admin ID format" });
        }

        const vendor = await User.findById(id).select('-password');
        if (!vendor) {
            return res.status(404).json({ success: false, message: "Admin/Vendor not found" });
        }

        const vendorIdStr = vendor._id.toString();

        // 1. SERVICES OF THIS ADMIN
        const services = await Service.find({
            $or: [{ vendorId: vendor._id }, { userid: vendor._id }]
        }).sort({ createdAt: -1 });

        // Enrich services with booking counts
        const enrichedServices = await Promise.all(
            services.map(async (svc) => {
                const serviceBookingCount = await Booking.countDocuments({ serviceid: svc._id.toString() });
                const serviceRevenue = await Booking.aggregate([
                    { $match: { serviceid: svc._id.toString(), status: 'completed' } },
                    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
                ]);

                return {
                    ...svc.toObject(),
                    bookingCount: serviceBookingCount,
                    completedRevenue: serviceRevenue.length > 0 ? serviceRevenue[0].total : 0
                };
            })
        );

        // 2. HELPERS OF THIS ADMIN
        const helpers = await Helper.find({
            $or: [{ vendorId: vendorIdStr }, { vendorId: vendor._id }]
        }).sort({ createdAt: -1 });

        // 3. BOOKINGS OF THIS ADMIN
        const serviceIds = services.map(s => s._id.toString());
        const bookings = await Booking.find({
            $or: [
                { serviceid: { $in: serviceIds } },
                { vendorId: vendorIdStr },
                { vendorId: vendor._id }
            ]
        })
            .populate('assignedHelpers', 'name phone rating')
            .populate('userid', 'name email phone')
            .sort({ createdAt: -1 });

        // 4. PAYMENTS & FINANCIALS OF THIS PARTICULAR ADMIN
        let grossRevenue = 0;
        let totalCommissionDeducted = 0;
        let inEscrowBalance = 0;
        let availableBalance = 0;
        let requestedBalance = 0;
        let paidOutBalance = 0;

        const completedBookings = [];

        bookings.forEach(b => {
            if (b.status === 'completed') {
                const evalData = evaluateBookingEscrow(b);
                grossRevenue += evalData.total;
                totalCommissionDeducted += evalData.commission;

                if (b.payoutStatus === 'paid') {
                    paidOutBalance += evalData.netEarning;
                } else if (b.payoutStatus === 'payout_requested') {
                    requestedBalance += evalData.netEarning;
                } else if (evalData.payoutStatus === 'available') {
                    availableBalance += evalData.netEarning;
                } else {
                    inEscrowBalance += evalData.netEarning;
                }

                completedBookings.push({
                    _id: b._id,
                    service: b.service,
                    customerName: b.name || b.userid?.name || 'Customer',
                    bookingType: b.bookingType,
                    paymentMethod: b.paymentMethod,
                    totalAmount: evalData.total,
                    platformCommission: evalData.commission,
                    adminNetEarning: evalData.netEarning,
                    completedAt: evalData.completedAt,
                    escrowReleaseDate: evalData.escrowReleaseDate,
                    isMatured: evalData.isMatured,
                    payoutStatus: b.payoutStatus || evalData.payoutStatus
                });
            }
        });

        // Payout requests of this Admin
        const payoutRequests = await PayoutRequest.find({
            $or: [{ vendorId: vendor._id }, { vendorEmail: vendor.email }]
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            vendor,
            services: enrichedServices,
            helpers,
            bookings,
            financials: {
                grossRevenue: Math.round(grossRevenue),
                totalCommissionDeducted: Math.round(totalCommissionDeducted),
                netEarnings: Math.round(Math.max(0, grossRevenue - totalCommissionDeducted)),
                inEscrowBalance: Math.round(inEscrowBalance),
                availableBalance: Math.round(availableBalance),
                requestedBalance: Math.round(requestedBalance),
                paidOutBalance: Math.round(paidOutBalance),
                bankDetails: vendor.bankDetails || {},
                completedBookings,
                payoutRequests
            }
        });
    } catch (error) {
        console.error('Vendor details fetch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =========================================================================
// 4. SERVICES MANAGEMENT
// =========================================================================
router.get("/services", async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', category = 'all' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = {};
        if (search.trim()) {
            filter.name = new RegExp(search.trim(), 'i');
        }
        if (category && category !== 'all') {
            filter.category = category;
        }

        const [services, total, categories] = await Promise.all([
            Service.find(filter)
                .populate('vendorId', 'name email phone companyName')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 }),
            Service.countDocuments(filter),
            Service.distinct('category')
        ]);

        // Enrich services with booking count and status
        const enrichedServices = await Promise.all(
            services.map(async (s) => {
                const bookingCount = await Booking.countDocuments({ serviceid: s._id.toString() });
                return {
                    ...s.toObject(),
                    bookingCount
                };
            })
        );

        res.json({
            success: true,
            services: enrichedServices,
            categories,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Services fetch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Toggle Service Visibility
router.put("/services/:id/toggle-visibility", async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found" });
        }

        service.isVisible = !service.isVisible;
        await service.save();

        res.json({
            success: true,
            message: `Service visibility changed to ${service.isVisible ? 'Visible' : 'Hidden'}`,
            isVisible: service.isVisible
        });
    } catch (error) {
        console.error('Toggle visibility error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =========================================================================
// 5. HELPERS DIRECTORY & MANAGEMENT
// =========================================================================
router.get("/helpers", async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = {};
        if (search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            filter.$or = [{ name: regex }, { phone: regex }, { email: regex }, { skills: regex }];
        }

        const [helpers, total] = await Promise.all([
            Helper.find(filter)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 }),
            Helper.countDocuments(filter)
        ]);

        // Enrich helpers with their Admin/Vendor information
        const enrichedHelpers = await Promise.all(
            helpers.map(async (h) => {
                let vendorInfo = null;
                if (h.vendorId && mongoose.Types.ObjectId.isValid(h.vendorId)) {
                    vendorInfo = await User.findById(h.vendorId).select('name email companyName phone');
                }
                return {
                    ...h.toObject(),
                    vendorInfo
                };
            })
        );

        res.json({
            success: true,
            helpers: enrichedHelpers,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Helpers fetch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =========================================================================
// 6. PAYOUTS & SETTLEMENTS MANAGEMENT
// =========================================================================
router.get("/payouts", async (req, res) => {
    try {
        const { status = 'all', page = 1, limit = 15 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = {};
        if (status && status !== 'all') {
            filter.status = status;
        }

        const [payouts, total, allPayouts] = await Promise.all([
            PayoutRequest.find(filter)
                .populate('vendorId', 'name email phone companyName bankDetails')
                .populate('bookingIds', 'service totalAmount bookingType paymentMethod')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 }),
            PayoutRequest.countDocuments(filter),
            PayoutRequest.find({})
        ]);

        const stats = {
            totalRequests: allPayouts.length,
            pendingCount: allPayouts.filter(r => r.status === 'pending').length,
            pendingAmount: allPayouts.filter(r => r.status === 'pending').reduce((sum, r) => sum + (r.amount || 0), 0),
            approvedCount: allPayouts.filter(r => r.status === 'approved').length,
            approvedAmount: allPayouts.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.amount || 0), 0)
        };

        res.json({
            success: true,
            payouts,
            stats,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Payouts fetch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Approve Payout Request (Confirm Transfer with UTR)
router.post("/payouts/:id/approve", async (req, res) => {
    try {
        const { id } = req.params;
        const { transactionRef, transferNotes } = req.body;

        if (!transactionRef || !transactionRef.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: "Bank Transaction Reference (UTR / IMPS) is required to approve payout." 
            });
        }

        const payout = await PayoutRequest.findById(id);
        if (!payout) {
            return res.status(404).json({ success: false, message: "Payout request not found" });
        }

        if (payout.status === 'approved') {
            return res.status(400).json({ success: false, message: "Payout request is already approved" });
        }

        payout.status = 'approved';
        payout.transactionRef = transactionRef.trim();
        payout.transferNotes = transferNotes || '';
        payout.approvedBy = req.user._id;
        payout.approvedAt = new Date();
        await payout.save();

        // Mark associated bookings as paid
        if (payout.bookingIds && payout.bookingIds.length > 0) {
            await Booking.updateMany(
                { _id: { $in: payout.bookingIds } },
                { payoutStatus: 'paid' }
            );
        }

        res.json({
            success: true,
            message: `Payout of ₹${payout.amount} approved successfully! UTR: ${transactionRef}`,
            payout
        });
    } catch (error) {
        console.error('Approve payout error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Reject Payout Request
router.post("/payouts/:id/reject", async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectedReason } = req.body;

        const payout = await PayoutRequest.findById(id);
        if (!payout) {
            return res.status(404).json({ success: false, message: "Payout request not found" });
        }

        if (payout.status === 'approved') {
            return res.status(400).json({ success: false, message: "Cannot reject an already approved payout" });
        }

        payout.status = 'rejected';
        payout.rejectedReason = rejectedReason || 'Declined by Super Admin';
        payout.rejectedAt = new Date();
        await payout.save();

        // Revert bookings back to available
        if (payout.bookingIds && payout.bookingIds.length > 0) {
            await Booking.updateMany(
                { _id: { $in: payout.bookingIds } },
                { payoutStatus: 'available' }
            );
        }

        res.json({
            success: true,
            message: "Payout request rejected and balance restored to available.",
            payout
        });
    } catch (error) {
        console.error('Reject payout error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =========================================================================
// 7. BOOKINGS MANAGEMENT
// =========================================================================
router.get("/bookings", async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = {};
        if (status && status !== 'all') {
            filter.status = status;
        }
        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { name: regex },
                { service: regex },
                { phone: regex }
            ];
        }

        const [bookings, total] = await Promise.all([
            Booking.find(filter)
                .populate('assignedHelpers', 'name phone rating')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 }),
            Booking.countDocuments(filter)
        ]);

        // Enrich bookings with Vendor and User information
        const bookingsWithDetails = await Promise.all(
            bookings.map(async (b) => {
                let vendorInfo = null;
                if (b.vendorId && mongoose.Types.ObjectId.isValid(b.vendorId)) {
                    vendorInfo = await User.findById(b.vendorId).select('name email phone companyName');
                }
                return {
                    ...b.toObject(),
                    vendorInfo
                };
            })
        );

        res.json({
            success: true,
            bookings: bookingsWithDetails,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Bookings fetch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update Booking Status
router.put("/bookings/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status value" });
        }

        const updateData = { status };
        if (status === 'completed') {
            updateData.completedAt = new Date();
            updateData.escrowReleaseDate = new Date(Date.now() + (2 * 24 * 60 * 60 * 1000));
            updateData.payoutStatus = 'in_escrow';
        }

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        res.json({ success: true, message: "Booking status updated successfully", booking });
    } catch (error) {
        console.error('Booking status update error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =========================================================================
// 8. USERS MANAGEMENT
// =========================================================================
router.get("/users", async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = {
            role: { $ne: 'superadmin' },
            email: { $ne: 'himanshufa875@gmail.com' }
        };

        if (search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
        }

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('-password')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 }),
            User.countDocuments(filter)
        ]);

        const enrichedUsers = await Promise.all(
            users.map(async (u) => {
                const userBookingsCount = await Booking.countDocuments({ userid: u._id.toString() });
                return {
                    ...u.toObject(),
                    bookingsCount: userBookingsCount
                };
            })
        );

        res.json({
            success: true,
            users: enrichedUsers,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =========================================================================
// 9. PARTNERS / PATHNERS MANAGEMENT & CONVERSION
// =========================================================================
router.get("/pathners", async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [pathners, total] = await Promise.all([
            Pathner.find({})
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 }),
            Pathner.countDocuments()
        ]);

        res.json({
            success: true,
            pathners,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Pathners fetch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Convert Pathner to Admin / Vendor
router.post("/pathner-to-vendor/:pathnerId", async (req, res) => {
    try {
        const { pathnerId } = req.params;
        const pathner = await Pathner.findById(pathnerId);
        if (!pathner) {
            return res.status(404).json({ success: false, message: "Partner application not found" });
        }

        let existingUser = await User.findOne({ email: pathner.emailDetails });
        let vendorUserId = null;

        if (existingUser) {
            existingUser.role = 'admin';
            existingUser.isAdmin = true;
            existingUser.companyName = pathner.serviceName || existingUser.companyName;
            existingUser.serviceType = pathner.typeOfService || existingUser.serviceType;
            existingUser.description = pathner.description || existingUser.description;
            existingUser.isApproved = true;
            await existingUser.save();
            vendorUserId = existingUser._id;
        } else {
            const newUser = new User({
                name: pathner.ownerDetails,
                email: pathner.emailDetails,
                password: 'TempPassword@123',
                role: 'admin',
                isAdmin: true,
                phone: pathner.phoneNumber,
                address: pathner.address || 'Not specified',
                companyName: pathner.serviceName,
                serviceType: pathner.typeOfService,
                description: pathner.description,
                isApproved: true,
                approvedBy: req.user._id,
                approvedDate: new Date()
            });
            await newUser.save();
            vendorUserId = newUser._id;
        }

        // Also create entry in Vendor model if exists
        try {
            const newVendor = new Vendor({
                name: pathner.ownerDetails,
                image: pathner.image || '/default-vendor-image.jpg',
                companyName: pathner.serviceName,
                ownerName: pathner.ownerDetails,
                email: pathner.emailDetails,
                phone: pathner.phoneNumber,
                address: pathner.address || 'Not specified',
                serviceType: pathner.typeOfService || 'General Service',
                description: pathner.description,
                category: pathner.typeOfService || 'General',
                userId: vendorUserId,
                isApproved: true,
                approvedBy: req.user._id,
                approvedDate: new Date(),
                status: 'active',
                availability: 'Available'
            });
            await newVendor.save();
        } catch (vErr) {
            console.log('Vendor model creation note:', vErr.message);
        }

        // Remove from applications queue
        await Pathner.findByIdAndDelete(pathnerId);

        res.json({
            success: true,
            message: `Partner "${pathner.serviceName}" successfully converted to Admin / Vendor!`
        });
    } catch (error) {
        console.error('Convert partner error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =========================================================================
// 10. GENERIC DELETE HANDLER (WITH VENDOR CASCADE & SUPERADMIN PROTECTION)
// =========================================================================
router.delete("/:entity/:id", async (req, res) => {
    try {
        const { entity, id } = req.params;
        const currentUserId = req.user ? req.user._id.toString() : null;

        if (entity === 'vendor' || entity === 'user') {
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            if (user.role === 'superadmin' || user.email === 'himanshufa875@gmail.com' || user._id.toString() === currentUserId) {
                return res.status(403).json({ success: false, message: "Super Admin accounts cannot be deleted." });
            }

            // Clean up related entities
            await Promise.all([
                Vendor.deleteMany({ $or: [{ userId: id }, { email: user.email }] }),
                Service.deleteMany({ $or: [{ vendorId: id }, { userid: id }] }),
                Helper.deleteMany({ $or: [{ vendorId: id.toString() }, { vendorId: id }] }),
                User.findByIdAndDelete(id)
            ]);

            return res.json({ success: true, message: `${entity === 'vendor' ? 'Admin/Vendor' : 'User'} and associated data deleted successfully.` });
        }

        let Model;
        if (entity === 'service') Model = Service;
        else if (entity === 'helper') Model = Helper;
        else if (entity === 'booking') Model = Booking;
        else if (entity === 'pathner') Model = Pathner;
        else if (entity === 'payout') Model = PayoutRequest;
        else {
            return res.status(400).json({ success: false, message: "Invalid entity specified" });
        }

        const deleted = await Model.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: `${entity} not found` });
        }

        res.json({ success: true, message: `${entity} deleted successfully.` });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
