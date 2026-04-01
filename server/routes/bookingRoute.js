const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const moment = require("moment");
const Booking = require("../models/booking");
const Service = require("../models/service");
const User = require("../models/user");  // Import User model for role checks
const Helper = require("../models/Helper");  // Import Helper model if needed
const admin = require('../firebase-admin'); // Path to your firebase-admin.js


// Function to send push notification to users
// Function to send push notification to users
async function sendPushNotification(userIds, bookingData) {
    try {
        // Get all FCM tokens for these users
        const users = await User.find({ _id: { $in: userIds } });
        const tokens = users.flatMap(user => user.fcmTokens || []);
        
        if (tokens.length === 0) {
            console.log('⚠️ No FCM tokens found for users:', userIds);
            return;
        }
        
        // Remove duplicates
        const uniqueTokens = [...new Set(tokens)];
        
        console.log(`📤 Sending push to ${uniqueTokens.length} devices`);
        
        // Prepare notification payload - CORRECT FORMAT
        const payload = {
            notification: {
                title: '📢 New Booking!',
                body: `${bookingData.service} - ₹${bookingData.totalAmount || 0}`
                // sound goes in webpush.notification, not here
            },
            webpush: {
                notification: {
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    vibrate: [200, 100, 200],
                    sound: 'default',  // ✅ Sound is correct here
                    requireInteraction: true
                },
                fcmOptions: {
                    link: '/admin'
                }
            },
            data: {
                bookingId: bookingData._id.toString(),
                type: 'new_booking',
                click_action: 'OPEN_ADMIN_PANEL'
            }
        };
        
        // Send to all tokens
        const promises = uniqueTokens.map(token => 
            admin.messaging().send({
                token: token,
                ...payload
            }).catch(err => {
                console.log('❌ Failed to send to token:', err.message);
                // If token is invalid, remove it
                if (err.code === 'messaging/registration-token-not-registered') {
                    User.updateMany(
                        { fcmTokens: token },
                        { $pull: { fcmTokens: token } }
                    ).exec();
                }
            })
        );
        
        await Promise.all(promises);
        console.log(`✅ Push notifications sent successfully`);
        
    } catch (error) {
        console.error('❌ Error sending push notifications:', error);
    }
}


router.post("/bookservice", async (req, res) => {
    try {
        const {
            serviceid,
            totalAmount,
            userid,
            name,
            phone,
            description,
            service,
            unit,
            customUnit,
            isCountable,
            quantity,
            fromDate,
            toDate,
            daysCount,
            selectedDates,
            slots,
            time,
            locationType,
            address,
            pickupAddress,
            dropAddress,
            returnTrip,
            bookingType,
            optionalInputs,
            extraInputs,
            rentperday
        } = req.body;

        // Validate required fields - make totalAmount optional for inquiry bookings
        if (!serviceid || !userid || !name || !phone || !description || !service) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // For non-inquiry bookings, totalAmount is required
        if (bookingType !== 'Inquari Booking' && !totalAmount && totalAmount !== 0) {
            return res.status(400).json({ message: "Total amount is required for regular bookings" });
        }

        // Get service and check if it exists
        const serviceData = await Service.findById(serviceid);
        if (!serviceData) {
            return res.status(404).json({ message: "Service not found" });
        }

        // CRITICAL: Get the vendorId from the service
        const vendorId = serviceData.vendorId || serviceData.userid || null;
        
        if (!vendorId) {
            console.warn(`Service ${serviceid} has no vendorId assigned`);
        }

        // Check availability (skip for inquiry bookings?)
        if (fromDate && bookingType !== 'Inquari Booking') {
            const dateStr = moment(fromDate).format('YYYY-MM-DD');
            const unavailableDate = serviceData.unavailableDates.find(d => 
                moment(d.date).format('YYYY-MM-DD') === dateStr
            );

            if (unavailableDate?.fullDay) {
                return res.status(400).json({ message: "Selected date is fully booked" });
            }

            if (time && unavailableDate?.slots?.includes(time)) {
                return res.status(400).json({ message: "Selected time slot is not available" });
            }
        }

        // Create booking data with all fields
        const bookingData = {
            serviceid,
            totalAmount: bookingType === 'Inquari Booking' ? 0 : totalAmount, // Set to 0 for inquiry bookings
            userid,
            vendorId: vendorId,
            name,
            phone,
            description,
            service,
            unit: unit || serviceData.unit,
            customUnit: customUnit || serviceData.customUnit,
            isCountable: isCountable !== undefined ? isCountable : serviceData.isCountable,
            quantity: quantity || 1,
            daysCount: daysCount || 1,
            rentperday: rentperday || serviceData.rentperday,
            fromDate: fromDate ? new Date(fromDate) : null,
            toDate: toDate ? new Date(toDate) : null,
            selectedDates: selectedDates || [],
            slots: slots || [],
            time: time || 'N/A',  
            locationType: locationType || 'Simple',
            bookingType: bookingType || 'Automatic Booking',
            optionalInputs: optionalInputs || [],
            extraInputs: extraInputs || [],
            status: bookingType === 'Inquari Booking' ? "inquiry" : "booked" // Set different initial status
        };

        // Add location data
        if (locationType === 'Simple' && address) {
            bookingData.address = address;
        } else if (locationType === 'Rental') {
            bookingData.pickupAddress = pickupAddress;
            bookingData.dropAddress = dropAddress;
            bookingData.returnTrip = returnTrip || false;
        }

        // Save booking
// Save booking
const newBooking = new Booking(bookingData);
await newBooking.save();

console.log(`✅ Booking created: ${newBooking._id} for vendor: ${vendorId} (Type: ${bookingType})`);

// ============================================
// ✅ ADD PUSH NOTIFICATION CODE HERE
// ============================================

// Find users to notify (admins + vendor)
const adminUsers = await User.find({ 
    $or: [
        { role: 'admin' },
        { isAdmin: true },
        { role: 'superadmin' },
        { email: 'himanshufa875@gmail.com' }
    ]
});

// Get the vendor (service owner)
const vendorUser = await User.findById(vendorId);

// Combine users to notify
const usersToNotify = [...adminUsers];
if (vendorUser && !usersToNotify.some(u => u._id.equals(vendorUser._id))) {
    usersToNotify.push(vendorUser);
}

// Send push notifications
if (usersToNotify.length > 0) {
    await sendPushNotification(
        usersToNotify.map(u => u._id),
        newBooking
    );
}

// ============================================
// END OF PUSH NOTIFICATION CODE
// ============================================

// Skip availability update for inquiry bookings
if (fromDate && bookingType !== 'Inquari Booking') {
    
            const dateStr = moment(fromDate).format('YYYY-MM-DD');
            let unavailableDates = serviceData.unavailableDates || [];
            
            const existingDateIndex = unavailableDates.findIndex(d => 
                moment(d.date).format('YYYY-MM-DD') === dateStr
            );

            if (existingDateIndex >= 0) {
                if (time) {
                    if (!unavailableDates[existingDateIndex].slots.includes(time)) {
                        unavailableDates[existingDateIndex].slots.push(time);
                    }
                } else {
                    unavailableDates[existingDateIndex].fullDay = true;
                }
            } else {
                unavailableDates.push({
                    date: new Date(dateStr),
                    slots: time ? [time] : [],
                    fullDay: !time
                });
            }

            await Service.findByIdAndUpdate(serviceid, {
                unavailableDates: unavailableDates
            });
        }

        res.status(201).json({
            message: bookingType === 'Inquari Booking' ? "Inquiry submitted successfully" : "Service booked successfully",
            booking: newBooking
        });

    } catch (error) {
        console.error("Booking error:", error);
        res.status(500).json({
            message: "Failed to process booking",
            error: error.message
        });
    }
});
// Cancel booking
router.post("/cancelbooking", async (req, res) => {
    try {
        const { bookingid, serviceid } = req.body;

        const booking = await Booking.findById(bookingid);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // Update service availability
        if (booking.fromDate) {
            const service = await Service.findById(serviceid);
            if (service) {
                const dateStr = moment(booking.fromDate).format('YYYY-MM-DD');
                let unavailableDates = service.unavailableDates || [];
                
                const dateIndex = unavailableDates.findIndex(d => 
                    moment(d.date).format('YYYY-MM-DD') === dateStr
                );

                if (dateIndex >= 0) {
                    if (booking.time) {
                        // Remove time slot
                        unavailableDates[dateIndex].slots = unavailableDates[dateIndex].slots.filter(
                            slot => slot !== booking.time
                        );
                        
                        if (unavailableDates[dateIndex].slots.length === 0) {
                            unavailableDates.splice(dateIndex, 1);
                        }
                    } else {
                        // Remove full day
                        unavailableDates.splice(dateIndex, 1);
                    }

                    await Service.findByIdAndUpdate(serviceid, {
                        unavailableDates: unavailableDates
                    });
                }
            }
        }

        await Booking.findByIdAndDelete(bookingid);
        res.json({ message: "Booking cancelled successfully" });

    } catch (error) {
        res.status(500).json({
            message: "Failed to cancel booking",
            error: error.message
        });
    }
});
// bookingRoute.js - Corrected version
// Update the getallbookings endpoint to properly populate assignedHelpers
router.get("/getallbookings", async (req, res) => {
    try {
        const { userid } = req.query;
        if (!userid) return res.status(400).json({ message: "User ID required" });

        const user = await User.findById(userid);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Check roles
        const isSuperAdmin = user?.email === 'himanshufa875@gmail.com' && (user?.role === 'superadmin' || user?.isAdmin);
        const isAdmin = user?.role === 'admin' || user?.isAdmin;
        const isVendor = user?.role === 'vendor' || user?.isVendor;

        let filter = {};

        if (isSuperAdmin) {
            // Super admins see all bookings
            filter = {};
        } else if (isAdmin || isVendor) {
            // Regular admins/vendors see only bookings for services they own
            const vendorServices = await Service.find({ vendorId: userid }).select('_id');
            const serviceIds = vendorServices.map(service => service._id);
            
            filter = { 
                $or: [
                    { serviceid: { $in: serviceIds } },
                    { vendorId: userid }
                ]
            };
        } else {
            return res.status(403).json({ message: "Access denied" });
        }

        const bookings = await Booking.find(filter)
            .populate('userid', 'name email phone')
            .populate('serviceid', 'name rentperday category')
            .populate({
                path: 'assignedHelpers',
                select: 'name phone email skills experience photo description'
            })
            .sort({ createdAt: -1 });
            
        console.log(`Found ${bookings.length} bookings for user ${userid}`);
        res.json(bookings);
        
    } catch (error) {
        console.error("Get bookings error:", error);
        res.status(500).json({ message: error.message });
    }
});

// Update booking status - Only allow if vendor owns the booking
// Update booking status - More robust version
router.post("/updatestatus", async (req, res) => {
    try {
        const { bookingId, status, userId } = req.body;
        const queryUserId = req.query.userid;
        
        // Get userId from either body or query
        const effectiveUserId = userId || queryUserId;
        
        if (!bookingId || !status) {
            return res.status(400).json({ 
                message: "Booking ID and status are required" 
            });
        }

        if (!effectiveUserId) {
            return res.status(400).json({ 
                message: "User ID is required" 
            });
        }

        console.log('Updating booking:', { bookingId, status, effectiveUserId }); // Debug log

        // Find the booking
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ 
                message: "Booking not found" 
            });
        }

        // Find the user
        const user = await User.findById(effectiveUserId);
        if (!user) {
            return res.status(404).json({ 
                message: "User not found" 
            });
        }

        // Check permissions
        const isSuperAdmin = user?.email === 'himanshufa875@gmail.com' && 
                            (user?.role === 'superadmin' || user?.isAdmin);
        const isAdmin = user?.role === 'admin' || user?.isAdmin;

        // Allow if super admin OR if user owns the booking's service (is the vendor)
        if (!isSuperAdmin && !isAdmin) {
            // For vendors, check if they own the service
            const service = await Service.findById(booking.serviceid);
            if (!service || service.userid.toString() !== effectiveUserId) {
                return res.status(403).json({ 
                    message: "Access denied: You can only manage your own bookings" 
                });
            }
        }

        // Update the booking status
         booking.status = status;
        await booking.save();
        
        console.log('Booking updated successfully:', booking);
        
        res.json({ 
            message: `Booking status updated to ${status}`, 
            booking 
        });
    } catch (error) {
        console.error("Update status error:", error);
        res.status(500).json({ 
            message: "Failed to update booking status", 
            error: error.message 
        });
    }
});
// Assign helpers to booking - UPDATED (minor fix for consistency)
// In bookingRoute.js - Fix the /assign-helpers endpoint
// In bookingRoute.js - Updated /assign-helpers endpoint with better debugging
// bookingRoute.js - Fixed /assign-helpers endpoint
// bookingRoute.js - Fixed /assign-helpers endpoint for string IDs
// In bookingRoute.js - Update the /assign-helpers endpoint
router.post("/assign-helpers", async (req, res) => {
    try {
        const { bookingId, helperIds } = req.body;
        console.log('Assigning helpers:', { bookingId, helperIds });

        if (!bookingId || !helperIds || helperIds.length === 0) {
            return res.status(400).json({ message: "Booking ID and helper IDs are required" });
        }

        // Fetch the booking
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // Get the service to find the vendor ID
        const service = await Service.findById(booking.serviceid);
        if (!service) {
            return res.status(404).json({ message: "Service not found for this booking" });
        }

        // Get the vendor ID from the service
        const serviceVendorId = service.vendorId || service.userid;

        if (!serviceVendorId) {
            return res.status(400).json({ 
                message: "Could not determine vendor for this service" 
            });
        }

        // Fetch helpers and check if they belong to the vendor
        const helpers = await Helper.find({ _id: { $in: helperIds } });
        
        // Check if helpers belong to the vendor
        const invalidHelpers = helpers.filter(h => {
            const helperVendorId = h.vendorId ? h.vendorId.toString() : null;
            const serviceVendorIdStr = serviceVendorId.toString();
            return !helperVendorId || helperVendorId !== serviceVendorIdStr;
        });
        
        if (invalidHelpers.length > 0) {
            return res.status(403).json({ 
                message: "Some helpers do not belong to the service's vendor",
                invalidHelpers: invalidHelpers.map(h => h.name)
            });
        }

        // Update the booking with assigned helpers and status
        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId, 
            { 
                assignedHelpers: helperIds, 
                status: 'assigned' 
            },
            { new: true }
        ).populate({
            path: 'assignedHelpers',
            select: 'name phone email skills experience photo description'
        });
        
        console.log('Helpers assigned successfully to booking:', bookingId);
        
        res.json({ 
            message: "Helpers assigned successfully", 
            booking: updatedBooking,
            helpers: helpers // Return the helper details for immediate display
        });
    } catch (error) {
        console.error("Error assigning helpers:", error);
        res.status(500).json({ message: "Failed to assign helpers: " + error.message });
    }
});

// Get user bookings
// Get user bookings - FIXED to populate assignedHelpers
// bookingRoute.js - Update the getuserbookings endpoint
router.post("/getuserbookings", async (req, res) => {
    try {
        const { userid } = req.body;
        
        if (!userid) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const bookings = await Booking.find({ userid: userid })
            .populate({
                path: 'assignedHelpers',
                select: 'name phone email skills experience photo description'
            })
            .populate({
                path: 'serviceid',
                select: 'name rentperday unit customUnit category imageurls'
            })
            .sort({ createdAt: -1 });
            
        // Transform bookings to ensure all fields are present
        const transformedBookings = bookings.map(booking => {
            const bookingObj = booking.toObject();
            
            // Ensure service name is available
            if (bookingObj.serviceid && !bookingObj.service) {
                bookingObj.service = bookingObj.serviceid.name;
            }
            
            // Ensure dates are properly formatted
            if (bookingObj.selectedDates && bookingObj.selectedDates.length > 0) {
                bookingObj.fromdate = bookingObj.selectedDates[0];
                bookingObj.todate = bookingObj.selectedDates[bookingObj.selectedDates.length - 1];
            }
            
            // Ensure time slots are properly formatted
            if (bookingObj.slots && bookingObj.slots.length > 0) {
                bookingObj.time = bookingObj.slots.map(slot => 
                    typeof slot === 'object' ? slot.slot : slot
                ).join(', ');
            }
            
            return bookingObj;
        });
        
        console.log(`Found ${transformedBookings.length} bookings for user ${userid}`);
        res.json(transformedBookings);
    } catch (error) {
        console.error("Error fetching user bookings:", error);
        res.status(500).json({ message: error.message });
    }
});
// Get helper's work
// Get helper's work with complete booking details
router.get('/helper-work', async (req, res) => {
    try {
        const helperId = req.query.helperId;
        if (!helperId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Helper ID required' 
            });
        }

        console.log('Fetching work for helper:', helperId);

        // Find all bookings where this helper is assigned
        const bookings = await Booking.find({
            assignedHelpers: { $in: [helperId] }
        })
        .sort({ createdAt: -1 });

        console.log(`Found ${bookings.length} bookings for helper ${helperId}`);

        // Transform bookings to include all necessary fields
        const enhancedBookings = bookings.map(booking => {
            // Convert to plain object
            const bookingObj = booking.toObject ? booking.toObject() : booking;
            
            // Format dates
            const scheduledDate = bookingObj.selectedDates && bookingObj.selectedDates.length > 0 
                ? bookingObj.selectedDates[0] 
                : bookingObj.fromDate || bookingObj.createdAt;

            return {
                _id: bookingObj._id,
                bookingId: bookingObj._id,
                customerName: bookingObj.name || 'N/A',
                customerPhone: bookingObj.phone || 'N/A',
                serviceType: bookingObj.service || 'Service',
                category: bookingObj.bookingType || 'General',
                address: bookingObj.locationType === 'Simple' 
                    ? bookingObj.address 
                    : `${bookingObj.pickupAddress || ''} → ${bookingObj.dropAddress || ''}`,
                scheduledDate: scheduledDate,
                status: bookingObj.status || 'assigned',
                price: bookingObj.totalAmount || 0,
                duration: bookingObj.daysCount ? `${bookingObj.daysCount} days` : 'N/A',
                specialInstructions: bookingObj.description || '',
                locationType: bookingObj.locationType,
                pickupAddress: bookingObj.pickupAddress,
                dropAddress: bookingObj.dropAddress,
                selectedDates: bookingObj.selectedDates,
                slots: bookingObj.slots,
                optionalInputs: bookingObj.optionalInputs,
                extraInputs: bookingObj.extraInputs,
                totalAmount: bookingObj.totalAmount,
                unit: bookingObj.unit,
                customUnit: bookingObj.customUnit,
                quantity: bookingObj.quantity,
                daysCount: bookingObj.daysCount
            };
        });

        res.status(200).json({
            success: true,
            count: enhancedBookings.length,
            works: enhancedBookings
        });
    } catch (error) {
        console.error("Error in helper-work endpoint:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            works: [] 
        });
    }
});

// Update booking status (helper)
router.put('/update-status', async (req, res) => {
    try {
        const { bookingId, status } = req.body;
        const booking = await Booking.findByIdAndUpdate(
            bookingId,
            { status },
            { new: true }
        );
        res.json({ success: true, booking });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add to bookingRoute.js for backward compatibility
router.get("/dashboard", async (req, res) => {
    try {
        const { userid } = req.query;
        
        if (!userid) {
            return res.status(400).json({ message: "User ID required" });
        }

        const user = await User.findById(userid);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isSuperAdmin = user?.email === 'himanshufa875@gmail.com' && 
                            (user?.role === 'superadmin' || user?.isAdmin);
        const isAdmin = user?.role === 'admin' || user?.isAdmin;
        const isVendor = user?.role === 'vendor' || user?.isVendor;

        let bookingFilter = {};
        let serviceFilter = {};

        if (isSuperAdmin) {
            // Super admin sees everything
            bookingFilter = {};
            serviceFilter = {};
        } else if (isAdmin || isVendor) {
            // Regular admin/vendor sees only their own data
            bookingFilter = { vendorId: userid };
            serviceFilter = { vendorId: userid };
        } else {
            return res.status(403).json({ message: "Access denied" });
        }

        // Get counts based on filters
        const totalBookings = await Booking.countDocuments(bookingFilter);
        const totalServices = await Service.countDocuments(serviceFilter);
        
        // For regular admins, these should be 0 or based on their scope
        const totalUsers = isSuperAdmin ? await User.countDocuments({}) : 0;
        const totalVendors = isSuperAdmin ? 
            await User.countDocuments({ $or: [{ role: 'admin' }, { role: 'vendor' }, { isAdmin: true }] }) : 0;
        
        // Calculate revenue from their own bookings
        const revenueResult = await Booking.aggregate([
            { $match: bookingFilter },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);
        const revenue = revenueResult[0]?.total || 0;

        // Get recent bookings (filtered)
        const recentBookings = await Booking.find(bookingFilter)
            .sort({ createdAt: -1 })
            .limit(5)
            .select('_id service totalAmount status createdAt');

        const stats = {
            totalBookings,
            totalServices,
            totalUsers,
            totalVendors,
            revenue,
            recentBookings
        };

        res.json({ stats });

    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ 
            message: "Failed to load dashboard data", 
            error: error.message 
        });
    }
});

// Check for new bookings since last check (for polling)
router.get("/check-new", async (req, res) => {
    try {
        const { userid, lastId } = req.query;
        
        if (!userid) {
            return res.status(400).json({ message: "User ID required" });
        }

        const user = await User.findById(userid);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isSuperAdmin = user?.email === 'himanshufa875@gmail.com' && 
                            (user?.role === 'superadmin' || user?.isAdmin);
        const isAdmin = user?.role === 'admin' || user?.isAdmin;
        const isVendor = user?.role === 'vendor' || user?.isVendor;

        let filter = {};

        // Build filter based on user role
        if (isSuperAdmin) {
            filter = {};
        } else if (isAdmin || isVendor) {
            const vendorServices = await Service.find({ vendorId: userid }).select('_id');
            const serviceIds = vendorServices.map(service => service._id);
            filter = {
                $or: [
                    { serviceid: { $in: serviceIds } },
                    { vendorId: userid }
                ]
            };
        } else {
            return res.status(403).json({ message: "Access denied" });
        }

        // Add lastId filter if provided
        if (lastId && lastId !== '') {
            filter._id = { $gt: lastId };
        }

        const newBookings = await Booking.find(filter)
            .sort({ createdAt: -1 })
            .limit(10);

        res.json(newBookings);

    } catch (error) {
        console.error("Check new bookings error:", error);
        res.status(500).json({ 
            message: "Failed to check new bookings", 
            error: error.message 
        });
    }
});


module.exports = router;