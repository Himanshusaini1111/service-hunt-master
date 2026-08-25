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
    
    // ============================================
    // ✅ NEW: Multiple Pricing Units Support
    // ============================================
    pricingUnits: [{
        unit: { 
            type: String, 
            enum: ['per day', 'per hour', 'per service', 'per person', 'per week', 'per month', 'per visit', 'per task', 'per project', 'per room', 'per session', 'per unit', 'per item', 'per event', 'per km', 'Other'],
            required: true 
        },
        price: { 
            type: Number, 
            required: true, 
            min: 0 
        },
        customUnit: { 
            type: String, 
            default: '' 
        },
        isDefault: { 
            type: Boolean, 
            default: false 
        },
        isCountable: { 
            type: Boolean, 
            default: true 
        },
        maxQuantityPerDay: { 
            type: Number, 
            default: null 
        },
        maxUsersPerDay: { 
            type: Number, 
            default: null 
        },
        description: { 
            type: String, 
            default: '' 
        }
    }],
    
    // ============================================
    // ✅ LEGACY FIELDS - Keep for backward compatibility
    // ============================================
    rentperday: {
        type: Number,
        default: 0
    },
    unit: {
        type: String,
        default: "per day"
    },
    customUnit: {
        type: String,
        default: ""
    },
    isCountable: {
        type: Boolean,
        default: true
    },
    maxQuantityPerDay: {
        type: Number,
        default: null,
        description: "Total units available per day across all users (inventory limit)"
    },
    maxUsersPerDay: {
        type: Number,
        default: null,
        description: "Maximum number of different users who can book per day"
    },
    
    // ============================================
    // ✅ EXISTING FIELDS - Keep all your existing fields
    // ============================================
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
    
    locationPricing: [{
        locationName: String,
        locationAddress: String,
        extraPrice: Number,
        optionalInputsExtra: [{
            inputName: String,
            extraPrice: Number
        }]
    }],
    
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
    vendorId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    userid: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }

}, { timestamps: true });

// ============================================
// ✅ PRE-SAVE MIDDLEWARE - Auto-set legacy fields from default unit
// ============================================
serviceSchema.pre('save', function(next) {
    // If pricingUnits exist and has at least one unit
    if (this.pricingUnits && this.pricingUnits.length > 0) {
        // Find the default unit or use the first one
        const defaultUnit = this.pricingUnits.find(u => u.isDefault) || this.pricingUnits[0];
        
        // Auto-populate legacy fields from the default unit
        this.rentperday = defaultUnit.price || 0;
        this.unit = defaultUnit.unit || 'per day';
        this.customUnit = defaultUnit.customUnit || '';
        this.isCountable = defaultUnit.isCountable !== false;
        this.maxQuantityPerDay = defaultUnit.maxQuantityPerDay || null;
        this.maxUsersPerDay = defaultUnit.maxUsersPerDay || null;
    }
    next();
});

// ============================================
// ✅ METHOD - Get active pricing units
// ============================================
serviceSchema.methods.getActivePricingUnits = function() {
    if (this.pricingUnits && this.pricingUnits.length > 0) {
        return this.pricingUnits.filter(u => u.price > 0);
    }
    // Fallback to legacy
    return [{
        unit: this.unit || 'per day',
        price: this.rentperday || 0,
        customUnit: this.customUnit || '',
        isDefault: true,
        isCountable: this.isCountable !== false,
        maxQuantityPerDay: this.maxQuantityPerDay,
        maxUsersPerDay: this.maxUsersPerDay,
        description: ''
    }];
};

// ============================================
// ✅ METHOD - Get default pricing unit
// ============================================
serviceSchema.methods.getDefaultUnit = function() {
    const units = this.getActivePricingUnits();
    return units.find(u => u.isDefault) || units[0] || null;
};

// ============================================
// ✅ METHOD - Get price for specific unit
// ============================================
serviceSchema.methods.getUnitPrice = function(unitType) {
    const units = this.getActivePricingUnits();
    const unit = units.find(u => u.unit === unitType);
    return unit ? unit.price : null;
};

// ============================================
// ✅ METHOD - Check if unit type exists
// ============================================
serviceSchema.methods.hasUnitType = function(unitType) {
    const units = this.getActivePricingUnits();
    return units.some(u => u.unit === unitType);
};

// ============================================
// ✅ VIRTUAL - Available unit types
// ============================================
serviceSchema.virtual('availableUnits').get(function() {
    return this.getActivePricingUnits().map(u => u.unit);
});

// ============================================
// ✅ VIRTUAL - Has multiple pricing options
// ============================================
serviceSchema.virtual('hasMultiplePricing').get(function() {
    return this.getActivePricingUnits().length > 1;
});

const serviceModel = mongoose.model('services', serviceSchema);
module.exports = serviceModel;