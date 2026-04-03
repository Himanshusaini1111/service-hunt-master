const mongoose = require("mongoose");

const serviceSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    isCountable: {
        type: Boolean,
        default: true
    },
    rentperday: {
        type: Number,
        required: true
    },
    phonenumber: {
        type: Number,
        required: true
    },
    companyname: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    facility: {
        type: String
    },
    locations: [String],
    locations: [{
        type: String,
        required: true,
        default: ['Simple']
    }],

    // Add location-specific details
    serviceLocation: {
        city: String,
        state: String,
        country: { type: String, default: 'India' },
        coordinates: {
            lat: Number,
            lng: Number
        },
        address: String
    },

  
    currentbookings: [],
    imageurls: [],  // This is your original field name
    optionalInputs: [{
        name: String,
        price: Number,
        image: String,
        unit: String,
        customUnit: String,
        isCountable: {
            type: Boolean,
            default: true
        },
        maxcount: {
            type: Number,
            default: 1
        }
    }],
    category: {
        type: String,
        required: true
    },
    subCategory: {
        type: String
    },
    isVisible: {
        type: Boolean,
        default: true
    },
    bookingType: {
        type: String,
        enum: ['Automatic Booking', 'Manual Booking', 'Inquari Booking', 'timeSlot'],
        required: true
    },
    assignedHelpers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Helper'
    }],
    useOwn: {
        type: Boolean,
        default: false
    },
    unit: {
        type: String,
        default: "per day"
    },
    customUnit: {
        type: String,
        default: ""
    },
    unavailableDates: [{
        date: String,
        slots: [String],
        fullDay: {
            type: Boolean,
            default: false
        }
    }],
    extraInputs: [{
        name: String,
        price: Number,
        image: String,
        unit: String,
        customUnit: String,
        isCountable: {
            type: Boolean,
            default: false
        }
    }],
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Links to the owner
    userid: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

}, { timestamps: true });

const serviceModel = mongoose.model('services', serviceSchema);
module.exports = serviceModel;