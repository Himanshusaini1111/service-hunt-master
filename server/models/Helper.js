const mongoose = require("mongoose");
// helper model - Keep IDs as strings
const helperSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        validate: {
            validator: function (v) {
                return /\d{10}/.test(v);
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
    },
    address: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: true
    },
    idProof: {
        type: String,
        required: true
    },
    experience: {
        type: String,
        required: true
    },
    skills: {
        type: String,
        required: true
    },
    availability: {
        type: String,
        enum: ["Full-time", "Part-time"],
        required: true
    },
    policeVerification: {
        type: Boolean,
        required: true
    },
    pastWorkPhotos: [{
        type: String
    }],
    isApproved: {
        type: Boolean,
        default: true,
    },
    vendorId: {
        type: String,  // Keep as String, not ObjectId
        required: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: v => /^\d{5}$/.test(v),
            message: "Code must be 5 digits"
        }
    },
    isConnected: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    socketId: String,
    isActive: {
        type: Boolean,
        default: true
    },
    fcmTokens: {
        type: [String],
        default: []
    },
}, { timestamps: true });

module.exports = mongoose.models.Helper || mongoose.model("Helper", helperSchema);