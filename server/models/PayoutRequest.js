const mongoose = require("mongoose");

const payoutRequestSchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    vendorName: { type: String, default: '' },
    vendorEmail: { type: String, default: '' },
    vendorPhone: { type: String, default: '' },
    companyName: { type: String, default: '' },
    amount: {
        type: Number,
        required: true,
        min: 1
    },
    bookingIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    }],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    bankDetails: {
        accountHolderName: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        ifscCode: { type: String, default: '' },
        bankName: { type: String, default: '' },
        upiId: { type: String, default: '' }
    },
    payoutMethod: {
        type: String,
        enum: ['BANK_TRANSFER', 'UPI'],
        default: 'BANK_TRANSFER'
    },
    // SuperAdmin approval info:
    transactionRef: { type: String, default: '' }, // Bank UTR / IMPS Reference number
    transferNotes: { type: String, default: '' },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    approvedAt: { type: Date },
    rejectedReason: { type: String, default: '' },
    rejectedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model("PayoutRequest", payoutRequestSchema);
