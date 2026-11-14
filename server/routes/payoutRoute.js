const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Booking = require("../models/booking");
const PayoutRequest = require("../models/PayoutRequest");
const User = require("../models/user");
const Service = require("../models/service");

// Helper function to calculate commission & check escrow status (Instant Release for Testing)
const evaluateBookingEscrow = (booking) => {
    if (booking.status !== 'completed') {
        return {
            isCompleted: false,
            platformCommission: 0,
            adminNetEarning: 0,
            isMatured: false,
            status: booking.status
        };
    }

    const total = Number(booking.totalAmount) || 0;
    const isInquiry = booking.bookingType === 'Inquari Booking' || booking.bookingType === 'inquiry';
    const commission = booking.platformCommission > 0 
        ? booking.platformCommission 
        : (isInquiry ? 200 : Math.round(total * 0.05 * 100) / 100);
    const netEarning = Math.max(0, total - commission);

    const completedAt = booking.completedAt || booking.updatedAt || booking.createdAt || new Date();
    // Test mode: Immediately mature without waiting 2 days so testing works instantly
    const escrowReleaseDate = booking.escrowReleaseDate || completedAt;
    const isMatured = true;

    let payoutStatus = booking.payoutStatus || 'available';
    if (payoutStatus === 'unsettled' || payoutStatus === 'in_escrow') {
        payoutStatus = 'available';
    }

    return {
        isCompleted: true,
        total,
        commission,
        netEarning,
        completedAt,
        escrowReleaseDate,
        isMatured: true,
        payoutStatus
    };
};

// 1. Get Admin / Vendor Earnings, Balances & Payout History
router.get("/admin-earnings", async (req, res) => {
    try {
        const { userid } = req.query;
        if (!userid) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        const user = await User.findById(userid);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isSuperAdmin = user.email === 'himanshufa875@gmail.com' && (user.role === 'superadmin' || user.isAdmin);

        // Find services owned by this user
        let filter = {};
        if (isSuperAdmin && req.query.vendorId) {
            // SuperAdmin viewing specific vendor
            const vendorServices = await Service.find({ vendorId: req.query.vendorId }).select('_id');
            const serviceIds = vendorServices.map(s => s._id.toString());
            filter = {
                $or: [
                    { serviceid: { $in: serviceIds } },
                    { vendorId: req.query.vendorId }
                ]
            };
        } else if (!isSuperAdmin) {
            const vendorServices = await Service.find({ vendorId: userid }).select('_id');
            const serviceIds = vendorServices.map(s => s._id.toString());
            filter = {
                $or: [
                    { serviceid: { $in: serviceIds } },
                    { vendorId: userid }
                ]
            };
        }

        const allBookings = await Booking.find(filter).sort({ createdAt: -1 });

        // Calculate balances
        let grossRevenue = 0;
        let totalCommissionDeducted = 0;
        let inEscrowBalance = 0;
        let availableBalance = 0;
        let paidOutBalance = 0;
        let requestedBalance = 0;

        const paymentStats = {
            totalBookingsCount: allBookings.length,
            totalGrossAmount: 0,
            totalPlatformCharges: 0,
            totalNetEarnings: 0,
            newBookingsCount: 0,
            
            cashCount: 0,
            cashTotalAmount: 0,
            
            onlineCount: 0,
            onlineTotalAmount: 0,
            onlineCollected: 0,
            
            partialCount: 0,
            partialTotalAmount: 0,
            partialAdvanceCollected: 0,
            partialCashRemaining: 0,
            
            inquiryCount: 0
        };

        const allProcessedBookings = [];
        const completedBookings = [];
        const bookingsToUpdate = [];

        for (const booking of allBookings) {
            const total = Number(booking.totalAmount) || 0;
            const advance = Number(booking.advancePaidAmount) || 0;
            const remaining = Number(booking.remainingCashAmount) || 0;
            const method = booking.paymentMethod || 'CASH_AFTER_SERVICE';
            const isInquiry = booking.bookingType === 'Inquari Booking' || booking.bookingType === 'inquiry' || method === 'N/A';
            const isNew = ['booked', 'pending', 'confirmed', 'assigned', 'in-progress'].includes(booking.status);

            if (isNew) paymentStats.newBookingsCount++;
            paymentStats.totalGrossAmount += total;

            if (isInquiry) {
                paymentStats.inquiryCount++;
            } else if (method === 'FULL_ONLINE') {
                paymentStats.onlineCount++;
                paymentStats.onlineTotalAmount += total;
                paymentStats.onlineCollected += (booking.paymentStatus === 'paid' ? (advance || total) : advance);
            } else if (method === 'PARTIAL_30_70') {
                paymentStats.partialCount++;
                paymentStats.partialTotalAmount += total;
                paymentStats.partialAdvanceCollected += advance;
                paymentStats.partialCashRemaining += remaining;
            } else {
                paymentStats.cashCount++;
                paymentStats.cashTotalAmount += total;
            }

            const evalData = evaluateBookingEscrow(booking);
            paymentStats.totalPlatformCharges += evalData.commission;
            paymentStats.totalNetEarnings += evalData.netEarning;

            const bookingItem = {
                _id: booking._id,
                service: booking.service,
                customerName: booking.name,
                customerPhone: booking.phone,
                bookingType: booking.bookingType,
                status: booking.status,
                paymentMethod: method,
                paymentStatus: booking.paymentStatus || (isInquiry ? 'not_applicable' : 'unpaid'),
                totalAmount: total,
                advancePaidAmount: advance,
                remainingCashAmount: remaining,
                razorpayPaymentId: booking.razorpayPaymentId,
                razorpayOrderId: booking.razorpayOrderId,
                platformCommission: evalData.commission,
                adminNetEarning: evalData.netEarning,
                createdAt: booking.createdAt,
                completedAt: booking.completedAt || booking.updatedAt,
                payoutStatus: booking.payoutStatus || evalData.payoutStatus,
                payoutRequestId: booking.payoutRequestId
            };

            allProcessedBookings.push(bookingItem);

            if (booking.status === 'completed') {
                grossRevenue += evalData.total;
                totalCommissionDeducted += evalData.commission;

                // Sync booking fields if missing or changed to available
                if (!booking.platformCommission || booking.payoutStatus !== evalData.payoutStatus) {
                    booking.platformCommission = evalData.commission;
                    booking.adminNetEarning = evalData.netEarning;
                    booking.completedAt = evalData.completedAt;
                    booking.escrowReleaseDate = evalData.escrowReleaseDate;
                    if (booking.payoutStatus !== 'paid' && booking.payoutStatus !== 'payout_requested') {
                        booking.payoutStatus = evalData.payoutStatus;
                    }
                    bookingsToUpdate.push(booking.save());
                }

                if (booking.payoutStatus === 'paid') {
                    paidOutBalance += evalData.netEarning;
                } else if (booking.payoutStatus === 'payout_requested') {
                    requestedBalance += evalData.netEarning;
                } else if (evalData.payoutStatus === 'available') {
                    availableBalance += evalData.netEarning;
                } else {
                    inEscrowBalance += evalData.netEarning;
                }

                completedBookings.push({
                    ...bookingItem,
                    completedAt: evalData.completedAt,
                    escrowReleaseDate: evalData.escrowReleaseDate,
                    isMatured: evalData.isMatured
                });
            }
        }

        if (bookingsToUpdate.length > 0) {
            await Promise.all(bookingsToUpdate);
        }

        // Fetch Payout Requests
        const targetUserId = (isSuperAdmin && req.query.vendorId) ? req.query.vendorId : userid;
        const payoutRequests = await PayoutRequest.find({ vendorId: targetUserId })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            balances: {
                grossRevenue,
                totalCommissionDeducted,
                netEarnings: Math.max(0, grossRevenue - totalCommissionDeducted),
                inEscrowBalance,
                availableBalance,
                requestedBalance,
                paidOutBalance
            },
            paymentStats,
            allBookings: allProcessedBookings,
            bankDetails: user.bankDetails || {},
            payoutRequests,
            completedBookings
        });
    } catch (error) {
        console.error("Error fetching admin earnings:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Submit a Payout Request (Admin requesting withdrawal)
router.post("/request", async (req, res) => {
    try {
        const { userId, amount, payoutMethod, bankDetails } = req.body;
        if (!userId || !amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Valid User ID and positive amount are required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Check available bookings
        const vendorServices = await Service.find({ vendorId: userId }).select('_id');
        const serviceIds = vendorServices.map(s => s._id.toString());
        const availableBookings = await Booking.find({
            $or: [
                { serviceid: { $in: serviceIds } },
                { vendorId: userId }
            ],
            status: 'completed',
            payoutStatus: 'available'
        }).sort({ completedAt: 1 });

        // Calculate current total available balance
        const totalAvailable = availableBookings.reduce((sum, b) => {
            const evalData = evaluateBookingEscrow(b);
            return sum + evalData.netEarning;
        }, 0);

        if (amount > totalAvailable) {
            return res.status(400).json({ 
                success: false, 
                message: `Requested amount (₹${amount}) exceeds available withdrawable balance (₹${totalAvailable.toFixed(2)})` 
            });
        }

        // Allocate bookings up to the requested amount
        let allocatedAmount = 0;
        const selectedBookingIds = [];
        for (const b of availableBookings) {
            const evalData = evaluateBookingEscrow(b);
            selectedBookingIds.push(b._id);
            allocatedAmount += evalData.netEarning;
            if (allocatedAmount >= amount) break;
        }

        // Save bank details to user if provided
        const finalBankDetails = bankDetails || user.bankDetails || {};
        if (bankDetails) {
            user.bankDetails = { ...user.bankDetails, ...bankDetails };
            await user.save();
        }

        // Create the Payout Request
        const newRequest = new PayoutRequest({
            vendorId: userId,
            vendorName: user.name,
            vendorEmail: user.email,
            vendorPhone: user.phone || '',
            companyName: user.companyName || user.name,
            amount: Number(amount),
            bookingIds: selectedBookingIds,
            status: 'pending',
            payoutMethod: payoutMethod || 'BANK_TRANSFER',
            bankDetails: finalBankDetails
        });

        await newRequest.save();

        // Mark allocated bookings as payout_requested
        await Booking.updateMany(
            { _id: { $in: selectedBookingIds } },
            { 
                payoutStatus: 'payout_requested',
                payoutRequestId: newRequest._id
            }
        );

        res.status(201).json({
            success: true,
            message: "Payout request submitted successfully! SuperAdmin will review and transfer the funds.",
            payoutRequest: newRequest
        });
    } catch (error) {
        console.error("Error creating payout request:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Save or update Admin Bank / UPI Details
router.post("/update-bank-details", async (req, res) => {
    try {
        const { userId, bankDetails } = req.body;
        if (!userId || !bankDetails) {
            return res.status(400).json({ success: false, message: "User ID and bank details are required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.bankDetails = {
            accountHolderName: bankDetails.accountHolderName || '',
            accountNumber: bankDetails.accountNumber || '',
            ifscCode: bankDetails.ifscCode ? bankDetails.ifscCode.toUpperCase().trim() : '',
            bankName: bankDetails.bankName || '',
            upiId: bankDetails.upiId ? bankDetails.upiId.trim() : ''
        };

        await user.save();

        res.json({
            success: true,
            message: "Bank details saved successfully",
            bankDetails: user.bankDetails
        });
    } catch (error) {
        console.error("Error updating bank details:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Get All Payout Requests (SuperAdmin View)
router.get("/all-requests", async (req, res) => {
    try {
        const { userid, status } = req.query;
        if (!userid) {
            return res.status(400).json({ success: false, message: "User ID required" });
        }

        const user = await User.findById(userid);
        const isSuperAdmin = user?.email === 'himanshufa875@gmail.com' && (user?.role === 'superadmin' || user?.isAdmin);
        if (!isSuperAdmin) {
            return res.status(403).json({ success: false, message: "Access denied: SuperAdmin only" });
        }

        let filter = {};
        if (status && status !== 'all') {
            filter.status = status;
        }

        const requests = await PayoutRequest.find(filter)
            .populate('vendorId', 'name email phone companyName bankDetails')
            .populate('bookingIds', 'service totalAmount bookingType paymentMethod')
            .sort({ createdAt: -1 });

        // Calculate summary stats
        const all = await PayoutRequest.find();
        const stats = {
            totalRequests: all.length,
            pendingCount: all.filter(r => r.status === 'pending').length,
            pendingAmount: all.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0),
            approvedCount: all.filter(r => r.status === 'approved').length,
            approvedAmount: all.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0)
        };

        res.json({
            success: true,
            stats,
            requests
        });
    } catch (error) {
        console.error("Error fetching all payout requests:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. Approve & Confirm Payment Transfer (SuperAdmin)
router.post("/approve", async (req, res) => {
    try {
        const { requestId, transactionRef, transferNotes, superAdminId } = req.body;
        if (!requestId || !transactionRef) {
            return res.status(400).json({ success: false, message: "Request ID and Bank Transaction Ref / UTR are required" });
        }

        const superAdmin = await User.findById(superAdminId);
        const isSuperAdmin = superAdmin?.email === 'himanshufa875@gmail.com' && (superAdmin?.role === 'superadmin' || superAdmin?.isAdmin);
        if (!isSuperAdmin) {
            return res.status(403).json({ success: false, message: "Access denied: SuperAdmin only" });
        }

        const payoutRequest = await PayoutRequest.findById(requestId);
        if (!payoutRequest) {
            return res.status(404).json({ success: false, message: "Payout request not found" });
        }

        if (payoutRequest.status === 'approved') {
            return res.status(400).json({ success: false, message: "This payout request is already approved and paid" });
        }

        payoutRequest.status = 'approved';
        payoutRequest.transactionRef = transactionRef.trim();
        payoutRequest.transferNotes = transferNotes || '';
        payoutRequest.approvedBy = superAdminId;
        payoutRequest.approvedAt = new Date();
        await payoutRequest.save();

        // Mark all associated bookings as 'paid'
        if (payoutRequest.bookingIds && payoutRequest.bookingIds.length > 0) {
            await Booking.updateMany(
                { _id: { $in: payoutRequest.bookingIds } },
                { payoutStatus: 'paid' }
            );
        }

        res.json({
            success: true,
            message: `Payout of ₹${payoutRequest.amount} marked as transferred with UTR: ${transactionRef}`,
            payoutRequest
        });
    } catch (error) {
        console.error("Error approving payout:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 6. Reject Payout Request (SuperAdmin)
router.post("/reject", async (req, res) => {
    try {
        const { requestId, rejectedReason, superAdminId } = req.body;
        if (!requestId) {
            return res.status(400).json({ success: false, message: "Request ID is required" });
        }

        const superAdmin = await User.findById(superAdminId);
        const isSuperAdmin = superAdmin?.email === 'himanshufa875@gmail.com' && (superAdmin?.role === 'superadmin' || superAdmin?.isAdmin);
        if (!isSuperAdmin) {
            return res.status(403).json({ success: false, message: "Access denied: SuperAdmin only" });
        }

        const payoutRequest = await PayoutRequest.findById(requestId);
        if (!payoutRequest) {
            return res.status(404).json({ success: false, message: "Payout request not found" });
        }

        payoutRequest.status = 'rejected';
        payoutRequest.rejectedReason = rejectedReason || 'Bank account details invalid or unverified';
        payoutRequest.rejectedAt = new Date();
        await payoutRequest.save();

        // Revert associated bookings back to 'available' so vendor can re-request
        if (payoutRequest.bookingIds && payoutRequest.bookingIds.length > 0) {
            await Booking.updateMany(
                { _id: { $in: payoutRequest.bookingIds } },
                { 
                    payoutStatus: 'available',
                    payoutRequestId: null
                }
            );
        }

        res.json({
            success: true,
            message: "Payout request rejected. Funds returned to available balance.",
            payoutRequest
        });
    } catch (error) {
        console.error("Error rejecting payout:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 6. Test Endpoint: Instant Release All Escrow to Available
router.post("/instant-release-all", async (req, res) => {
    try {
        const result = await Booking.updateMany(
            { 
                status: 'completed',
                payoutStatus: { $nin: ['paid', 'payout_requested'] }
            },
            {
                $set: {
                    payoutStatus: 'available',
                    escrowReleaseDate: new Date()
                }
            }
        );

        res.json({
            success: true,
            message: `Instant release successful! ${result.modifiedCount || 0} bookings converted to available balance.`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error("Error in instant-release-all:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
