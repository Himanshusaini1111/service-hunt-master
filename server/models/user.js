const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String, 
        required: true,
        unique: true // Add unique constraint for better data integrity
    },
    password: {
        type: String, 
        required: true
    },
    phone: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        default: ''
    },
    isAdmin: {
        type: Boolean, 
        default: false
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'superadmin', 'vendor'], // Add 'vendor' role
        default: 'user'
    },
    
    // Vendor-specific fields
    skills: {
        type: String,
        default: ''
    },
    experience: {
        type: Number,
        default: 0
    },
    availability: {
        type: String,
        enum: ['Available', 'Busy', 'On Leave', 'Unavailable'],
        default: 'Available'
    },
    hourlyRate: {
        type: Number,
        default: 0
    },
    category: {
        type: String,
        default: 'General'
    },
    companyName: {
        type: String,
        default: ''
    },
    serviceType: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    profileImage: {
        type: String,
        default: ''
    },
    
    // For vendor approval
    isApproved: {
        type: Boolean,
        default: false
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    fcmTokens: {
    type: [String],
    default: []
},
deviceInfo: {
    type: String,
    default: ''
},
    approvedDate: {
        type: Date
    },
    // Banking / UPI profile for payouts
    bankDetails: {
        accountHolderName: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        ifscCode: { type: String, default: '' },
        bankName: { type: String, default: '' },
        upiId: { type: String, default: '' }
    }
}, {
    timestamps: true,
});

const userModel = mongoose.models.user || mongoose.model('user', userSchema);
if (!mongoose.models.User) {
    mongoose.model('User', userSchema);
}
module.exports = userModel;