const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema({
     userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // Each vendor should be linked to one user
    },
    companyName: { type: String, required: true },
    image: { type: String, required: true }, // Now a URL string
    address: { type: String, required: true },
    // models/Vendor.js
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: String,
    skills: String,
    experience: Number,
    availability: { 
        type: String, 
        enum: ['Available', 'Busy', 'On Leave', 'Unavailable'],
        default: 'Available'
    },
    address: String,
    description: String,
    hourlyRate: Number,
    category: String,
    profileImage: String,
    documents: [{
        type: String,
        url: String
    }],
    reviews: [{
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        customerName: String,
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        createdAt: { type: Date, default: Date.now }
    }],
    completedJobs: { type: Number, default: 0 },
    activeJobs: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended'],
        default: 'active'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedDate: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('Vendor', vendorSchema);
