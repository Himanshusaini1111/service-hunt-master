const mongoose = require("mongoose");

// booking model - Keep IDs as strings
const bookingSchema = new mongoose.Schema({
    serviceid: { type: String, required: true },  // Keep as String
    totalAmount: { type: Number, required: false },
    userid: { type: String, required: true },      // Keep as String
    vendorId: { type: String, required: true },    // Keep as String
    photo: { type: String },
    time: {
        type: String,
        required: false,
        default: 'N/A'
    },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    description: { type: String, required: true },
    service: { type: String, required: true },
    bookingType: { type: String, required: true },
    
    // ADD THESE MISSING FIELDS
    rentperday: { type: Number },  // Base price
    unit: { type: String, default: "per day" },
    customUnit: { type: String },
    isCountable: { type: Boolean, default: true },
    quantity: { type: Number, default: 1 },
    daysCount: { type: Number, default: 1 },
    
    optionalInputs: [{
        name: String,
        price: Number,
        image: String,
        count: Number,
        unit: String,
        customUnit: String,
        isCountable: Boolean
    }],
    extraInputs: [{
        name: String,
        price: Number,
        image: String,
        unit: String,
        customUnit: String
    }],
    status: { type: String, default: "booked" },
    locationType: {
        type: String,
        required: true,
        enum: ['Simple', 'Rental', 'No']
    },
    selectedDates: [String],
    slots: [{
        date: String,
        slot: String
    }],
    address: { type: String },
    pickupAddress: { type: String },
    dropAddress: { type: String },
    returnTrip: { type: Boolean },
    selectedServiceArea: {
        city: String,
        state: String,
        district: String,
        pincode: String,
        extraPrice: { type: Number, default: 0 }
    },
    assignedHelpers: [{
        type: mongoose.Schema.Types.ObjectId,  // Keep this as ObjectId since it references Helper collection
        ref: 'Helper'
    }]
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);