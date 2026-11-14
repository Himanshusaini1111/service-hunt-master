const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay with environment keys
const getRazorpayInstance = () => {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
        console.warn('⚠️ Razorpay credentials missing in .env (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)');
    }

    return new Razorpay({
        key_id: key_id || 'rzp_test_default',
        key_secret: key_secret || 'rzp_secret_default'
    });
};

// 1. Get Public Key ID for Frontend
router.get('/get-key', (req, res) => {
    res.status(200).json({
        keyId: process.env.RAZORPAY_KEY_ID || ''
    });
});

// 2. Create Razorpay Order
router.post('/create-order', async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt, notes } = req.body;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'A valid payment amount is required.'
            });
        }

        const razorpay = getRazorpayInstance();

        // Amount must be in subunits (paise for INR, e.g. ₹100 = 10000 paise)
        const amountInPaise = Math.round(Number(amount) * 100);

        const options = {
            amount: amountInPaise,
            currency: currency || 'INR',
            receipt: receipt || `rcpt_${Date.now()}`,
            notes: notes || {}
        };

        const order = await razorpay.orders.create(options);

        res.status(200).json({
            success: true,
            order,
            keyId: process.env.RAZORPAY_KEY_ID || ''
        });
    } catch (error) {
        console.error('❌ Razorpay order creation error:', error);
        res.status(500).json({
            success: false,
            message: error.error ? error.error.description : (error.message || 'Error generating Razorpay order')
        });
    }
});

// 3. Verify Payment Signature
router.post('/verify-payment', (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Missing payment signature verification details'
            });
        }

        const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_default';

        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            return res.status(200).json({
                success: true,
                message: 'Payment verified successfully',
                paymentId: razorpay_payment_id
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed: Signature mismatch'
            });
        }
    } catch (error) {
        console.error('❌ Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal error verifying payment'
        });
    }
});

module.exports = router;
