const mongoose = require("mongoose");

const locationPriceSchema = mongoose.Schema({
    locationName: {
        type: String,
        required: true
    },
    locationAddress: {
        type: String,
        required: true
    },
    extraPrice: {
        type: Number,
        default: 0
    },
    // Optional: specific pricing for optional inputs at this location
    optionalInputsExtra: [{
        inputName: String,
        extraPrice: Number
    }]
});

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
    
    // New: Location-based pricing
    locationPricing: [locationPriceSchema],
    
    currentbookings: [],
    imageurls: [],
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
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userid: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

}, { timestamps: true });

const serviceModel = mongoose.model('services', serviceSchema);
module.exports = serviceModel;