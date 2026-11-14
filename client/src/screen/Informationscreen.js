import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { appAlert } from '../utils/appAlert';

const InformationScreen = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const service = location.state?.service ?? {}; // Fallback to empty object if service is undefined
    const fromdate = location.state?.fromdate ?? '';
    const todate = location.state?.todate ?? '';
    const totalDays = location.state?.totalDays ?? 0;
    const includePaymentStep = location.state?.includePaymentStep ?? true; // Default to true
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        date: '',
        time: '',
        description: '',
        paymentMethod: '',
        optionalInputs: '', // Add this field
    });
    const [loading, setLoading] = useState(false); // Add loading state

    const handleNext = () => {
        if (includePaymentStep && step === 5) {
            handleBooking();
            return; // Stop after booking
        }
        if (!includePaymentStep && step === 4) {
            appAlert.success('Inquiry submitted successfully!');
            return; // Stop for inquiry flow
        }
        setStep((prev) => prev + 1);
    };

    const handlePrev = () => {
        setStep((prev) => prev - 1);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleBooking = async () => {
        const bookingDetails = {
            user: JSON.parse(localStorage.getItem('currentUser')) || {}, // Current logged-in user
            service,
            fromdate,
            todate,
            totalDays,
            totalAmount: service.rentperday * totalDays, // Calculate total amount
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
            time: formData.time,
            description: formData.description,
            optionalInputs: formData.optionalInputs, // Include this line
        };

        try {
            setLoading(true); // Corrected: setLoading instead of setloading
            console.log(bookingDetails);
            const result = await axios.post('/api/bookings/bookservice', bookingDetails);
            setLoading(false); // Corrected: setLoading instead of setloading
            Swal.fire('Congrats', 'Your Room has been booked successfully', 'success').then(() => {
                window.location.href = '/profile';
            });
        } catch (error) {
            console.log(error.response?.data); // Print full error details
            Swal.fire('Oops', 'Something went wrong, please try later', 'error');
        }
    };

    return (
        <div className="InformationScreen">
            <h2>InformationScreen</h2>
            {loading && <p>Loading...</p>} {/* Display loading message */}
            {step === 1 && (
                <div className="step">
                    <h3>Step 1: Enter Name and Phone Number</h3>
                    <input
                        type="text"
                        name="name"
                        placeholder="Enter your name"
                        value={formData.name}
                        onChange={handleChange}
                    />
                    <input
                        type="text"
                        name="phone"
                        placeholder="Enter your phone number"
                        value={formData.phone}
                        onChange={handleChange}
                    />
                    <button onClick={handleNext}>Next</button>
                </div>
            )}
            {step === 2 && (
                <div className="step">
                    <h3>Step 2: Enter Address</h3>
                    <textarea
                        name="address"
                        placeholder="Enter your address"
                        value={formData.address}
                        onChange={handleChange}
                    />
                    <button onClick={handlePrev}>Back</button>
                    <button onClick={handleNext}>Next</button>
                </div>
            )}
            {step === 3 && (
                <div className="step">
                    <h3>Step 3: Select Dates and Time</h3>
                    <label>
                        From Date:
                        <input
                            type="date"
                            name="fromdate"
                            value={formData.fromdate}
                            onChange={handleChange}
                        />
                    </label>
                    <label>
                        To Date:
                        <input
                            type="date"
                            name="todate"
                            value={formData.todate}
                            onChange={handleChange}
                        />
                    </label>
                    <label>
                        Time:
                        <input
                            type="time"
                            name="time"
                            value={formData.time}
                            onChange={handleChange}
                        />
                    </label>
                    <button onClick={handlePrev}>Back</button>
                    <button onClick={handleNext}>Next</button>
                </div>
            )}

            {step === 4 && (
                <div className="step">
                    <h3>Step 4: Add a Description</h3>
                    <textarea
                        name="description"
                        placeholder="Enter additional details"
                        value={formData.description}
                        onChange={handleChange}
                    />
                    <button onClick={handlePrev}>Back</button>
                    {!includePaymentStep ? (
                        <button onClick={() => appAlert.success('Inquiry submitted successfully!')}>Send Inquiry</button>
                    ) : (
                        <button onClick={handleNext}>Proceed to Payment</button>
                    )}
                </div>
            )}
            {step === 5 && includePaymentStep && (
                <div className="step">
                    <h3>Step 5: Confirm Booking</h3>
                    <h1>Payment will be accepted direct to vendor</h1>
                    <button onClick={handlePrev}>Back</button>
                    <button onClick={handleBooking}>Book Now</button>
                </div>
            )}
        </div>
    );
};

export default InformationScreen;
