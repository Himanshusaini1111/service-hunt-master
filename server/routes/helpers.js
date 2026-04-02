const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const Helper = require("../models/Helper");
const Booking = require("../models/booking");
const User = require("../models/user");

// Middleware to authenticate helper
const authenticateHelper = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'No token provided' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const helper = await Helper.findById(decoded.helperId);
        
        if (!helper) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token' 
            });
        }

        req.helper = helper;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ 
            success: false,
            message: 'Token is not valid' 
        });
    }
};

router.get('/check-code/:code', async (req, res) => {
    try {
        const { code } = req.params;
        
        console.log('Checking code:', code);
        
        if (!code || code.length !== 6) {
            return res.json({
                exists: false,
                message: 'Code must be 6 characters'
            });
        }

        const existingHelper = await Helper.findOne({ 
            code: code.toUpperCase().trim() 
        });
        
        console.log('Code exists:', !!existingHelper);
        
        res.json({
            exists: !!existingHelper,
            code: code
        });
    } catch (error) {
        console.error('Error checking code:', error);
        res.status(500).json({
            exists: false,
            error: 'Server error'
        });
    }
});
// Helper Login Route
router.post('/login', async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Code is required'
            });
        }

        // Populate vendorId to include vendor name
        const helper = await Helper.findOne({ 
            code: code.toUpperCase(), 
            isActive: true 
    }).select('-password').populate('vendorId', 'name');  // This should work now
        
        if (!helper) {
            return res.status(400).json({
                success: false,
                message: 'Invalid code or helper not found'
            });
        }

        const token = jwt.sign(
            { helperId: helper._id, code: helper.code },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            helper: {
                _id: helper._id,
                name: helper.name,
                code: helper.code,
                phone: helper.phone,
                email: helper.email,
                isConnected: helper.isConnected,
                vendor: helper.vendorId ? { name: helper.vendorId.name } : null  // <-- NEW: Include vendor name in response
            },
            token
        });
    } catch (error) {
        console.error('Helper login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});


// Check for new works assigned to helper
router.get('/check-new-works', authenticateHelper, async (req, res) => {
    try {
        const helperId = req.helper._id;
        const { lastId } = req.query;
        
        let filter = { 
            assignedHelpers: { $in: [helperId] },
            status: 'assigned'  // Only show newly assigned works
        };
        
        // Only get works newer than lastId
        if (lastId && lastId !== 'null' && lastId !== 'undefined' && lastId !== '') {
            filter._id = { $gt: lastId };
        }
        
        const works = await Booking.find(filter)
            .populate('serviceid', 'name rentperday')
            .sort({ createdAt: -1 })
            .limit(10);
        
        console.log(`Found ${works.length} new works for helper ${helperId}, lastId: ${lastId}`);
        
        res.json({ success: true, works });
    } catch (error) {
        console.error('Error checking new works:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Get helper's assigned works
router.get('/assigned-works', authenticateHelper, async (req, res) => {
    try {
        console.log('Fetching assigned works for helper:', req.helper._id);
        
        // Find bookings where this helper is assigned
        const bookings = await Booking.find({
            assignedHelpers: { $in: [req.helper._id] }
        }).sort({ createdAt: -1 });

        console.log(`Found ${bookings.length} bookings for helper ${req.helper._id}`);

        // Transform bookings to match the frontend expected format
        const works = bookings.map(booking => {
            // Convert to plain object
            const bookingObj = booking.toObject ? booking.toObject() : booking;
            
            // Format scheduled date
            let scheduledDate = bookingObj.createdAt;
            if (bookingObj.selectedDates && bookingObj.selectedDates.length > 0) {
                scheduledDate = bookingObj.selectedDates[0];
            } else if (bookingObj.fromDate) {
                scheduledDate = bookingObj.fromDate;
            }

            // Format address based on location type
            let address = 'Address not provided';
            if (bookingObj.locationType === 'Simple' && bookingObj.address) {
                address = bookingObj.address;
            } else if (bookingObj.locationType === 'Rental') {
                address = `Pickup: ${bookingObj.pickupAddress || 'N/A'} → Drop: ${bookingObj.dropAddress || 'N/A'}`;
                if (bookingObj.returnTrip) {
                    address += ' (Round Trip)';
                }
            }

            return {
                _id: bookingObj._id,
                bookingId: bookingObj._id,
                customerName: bookingObj.name || 'N/A',
                customerPhone: bookingObj.phone || 'N/A',
                serviceType: bookingObj.service || 'Service',
                category: bookingObj.bookingType || 'General',
                address: address,
                scheduledDate: scheduledDate,
                status: bookingObj.status || 'assigned',
                price: bookingObj.totalAmount || 0,
                duration: bookingObj.daysCount ? `${bookingObj.daysCount} days` : 
                         (bookingObj.slots?.length ? `${bookingObj.slots.length} slots` : 'N/A'),
                specialInstructions: bookingObj.description || '',
                locationType: bookingObj.locationType,
                pickupAddress: bookingObj.pickupAddress,
                dropAddress: bookingObj.dropAddress,
                selectedDates: bookingObj.selectedDates || [],
                slots: bookingObj.slots || [],
                optionalInputs: bookingObj.optionalInputs || [],
                extraInputs: bookingObj.extraInputs || [],
                totalAmount: bookingObj.totalAmount,
                unit: bookingObj.unit,
                customUnit: bookingObj.customUnit,
                quantity: bookingObj.quantity || 1,
                daysCount: bookingObj.daysCount || 1,
                returnTrip: bookingObj.returnTrip || false,
                time: bookingObj.time,
                description: bookingObj.description
            };
        });

        res.json({
            success: true,
            works: works
        });

    } catch (error) {
        console.error('Error fetching assigned works:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching works: ' + error.message,
            works: [] 
        });
    }
});
// Get Helper Status
router.get('/status', authenticateHelper, async (req, res) => {
    try {
        res.json({
            success: true,
            isConnected: req.helper.isConnected,
            lastSeen: req.helper.lastSeen
        });
    } catch (error) {
        console.error('Error checking status:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking status'
        });
    }
});

// Toggle Connection Status
router.post('/toggle-connection', authenticateHelper, async (req, res) => {
    try {
        const { isConnected } = req.body;
        
        await Helper.findByIdAndUpdate(req.helper._id, {
            isConnected: isConnected,
            lastSeen: new Date()
        });

        res.json({
            success: true,
            message: `Status updated to ${isConnected ? 'online' : 'offline'}`,
            isConnected: isConnected
        });
    } catch (error) {
        console.error('Error updating connection status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating status'
        });
    }
});

// Cancel Work
router.post('/cancel-work', authenticateHelper, async (req, res) => {
    try {
        const { workId, reason } = req.body;
        
        if (!workId) {
            return res.status(400).json({
                success: false,
                message: 'Work ID is required'
            });
        }

        const booking = await Booking.findOne({
            _id: workId,
            assignedHelpers: req.helper._id
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Work not found or not assigned to you'
            });
        }

        if (booking.status === 'completed' || booking.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel a ${booking.status} work`
            });
        }

        // Update booking status
        await Booking.findByIdAndUpdate(workId, {
            status: 'cancelled',
            cancellationReason: reason || 'Cancelled by helper',
            cancelledAt: new Date(),
            cancelledBy: 'helper'
        });

        res.json({
            success: true,
            message: 'Work cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling work:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling work'
        });
    }
});

// Get Helper Profile
router.get('/profile', authenticateHelper, async (req, res) => {
    try {
        const helper = await Helper.findById(req.helper._id)
            .select('-password')
            .populate('vendorId', 'name phone email');

        res.json({
            success: true,
            helper
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile'
        });
    }
});

// Update Helper Profile
router.put('/profile', authenticateHelper, async (req, res) => {
    try {
        const { name, phone, address, skills, availability } = req.body;
        
        const updatedHelper = await Helper.findByIdAndUpdate(
            req.helper._id,
            {
                name,
                phone,
                address,
                skills: typeof skills === 'string' ? skills.split(',').map(skill => skill.trim()) : skills,
                availability
            },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            helper: updatedHelper
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating profile'
        });
    }
});



// Update work status
router.put('/update-status', authenticateHelper, async (req, res) => {
    try {
        const { bookingId, status } = req.body;
        
        if (!bookingId || !status) {
            return res.status(400).json({ 
                success: false, 
                message: 'Booking ID and status are required' 
            });
        }

        // Verify the helper is assigned to this booking
        const booking = await Booking.findOne({
            _id: bookingId,
            assignedHelpers: { $in: [req.helper._id] }
        });

        if (!booking) {
            return res.status(403).json({ 
                success: false, 
                message: 'You are not assigned to this booking' 
            });
        }

        // Update the status
        booking.status = status;
        await booking.save();

        res.json({ 
            success: true, 
            message: `Work status updated to ${status}`,
            booking 
        });
    } catch (error) {
        console.error('Error updating work status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating status: ' + error.message 
        });
    }
});


module.exports = router;