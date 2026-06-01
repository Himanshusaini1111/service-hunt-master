import React, { useEffect, useState } from 'react';
import { Modal } from "antd";
import axios from "axios";
import Swal from 'sweetalert2';
import Error from "../components/Error";
import Loader from "../components/Loader";
import moment from "moment";
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import ReviewSystem from "../components/ReviewSystem";
import CommentsSection from '../components/CommentsSection';
import './Bookingscreen.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Navbar from '../components/Navbar';

function Bookingscreen() {
  const { serviceid } = useParams();
  const locationRoute = useLocation();

  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [service, setService] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [daysCount, setDaysCount] = useState(1);
  const [optionalInputCounts, setOptionalInputCounts] = useState({});
  // Split these two selections to avoid index collisions
  const [addedOptionalInputs, setAddedOptionalInputs] = useState({}); // for non-countable optionalInputs
  const [addedExtraInputs, setAddedExtraInputs] = useState({}); // for extraInputs
  const [currentIndex, setCurrentIndex] = useState(0);

  const navigate = useNavigate();

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [returnTrip, setReturnTrip] = useState(false);
  const [bookingType, setBookingType] = useState("Automatic Booking");

  // Date and time
  const [fromDate, setFromDate] = useState(moment().format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(moment().add(1, 'day').format('YYYY-MM-DD'));
  const [selectedDates, setSelectedDates] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);

  // UI states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedServiceArea, setSelectedServiceArea] = useState(null);

  // Time slots
  const timeSlots = [
    "9:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00",
    "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00",
    "15:00 - 16:00", "16:00 - 17:00", "17:00 - 18:00",
    "18:00 - 19:00"
  ];
  // ✅ DIRECT FUNCTIONS - Replace the utility import
  const normalizeLocationPricing = (locationPricing) => {
    if (!locationPricing || !Array.isArray(locationPricing)) return [];
    return locationPricing.map(lp => ({
      locationName: lp.locationName || "",
      locationAddress: lp.locationAddress || "",
      extraPrice: Number(lp.extraPrice) || 0,
      optionalInputsExtra: lp.optionalInputsExtra || []
    }));
  };

  const effectiveBaseRent = (service, selectedArea) => {
    const basePrice = Number(service?.rentperday) || 0;
    if (!selectedArea) return basePrice;
    const extraPrice = Number(selectedArea.extraPrice) || 0;
    return basePrice + extraPrice;
  };

  const effectiveOptionalUnitPrice = (optionalInput, selectedArea) => {
    const basePrice = Number(optionalInput?.price) || 0;
    if (!selectedArea || !selectedArea.optionalInputsExtra) return basePrice;
    const extra = selectedArea.optionalInputsExtra.find(
      e => e.inputName === optionalInput.name
    );
    return basePrice + (extra ? Number(extra.extraPrice) || 0 : 0);
  };

  const areasMatch = (a, b) => {
    if (!a || !b) return false;
    return (a.locationName || a.city) === (b.locationName || b.city);
  };
  // Initialize AOS
  useEffect(() => {
    AOS.init();
    AOS.refresh();
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data } = await axios.post("/api/service/getservicebyid", { serviceid });
        setService(data);

        // Initialize total amount with base price
        setTotalAmount(data.rentperday);

        // Set booking type from service
        setBookingType(data.bookingType || "Automatic Booking");

        // Set default dates
        const today = moment().format('YYYY-MM-DD');
        setFromDate(today);
        setToDate(today);
        setSelectedDates([today]);
        setDaysCount(1);

      } catch (error) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [serviceid]);

  useEffect(() => {
    if (!service) return;

    const areas = normalizeLocationPricing(service.locationPricing);
    console.log("Areas from service:", areas);
    console.log("Navigation state:", locationRoute.state);

    if (areas.length === 0) {
      setSelectedServiceArea(null);
      return;
    }

    if (areas.length === 1) {
      console.log("Only one area, auto-selecting:", areas[0]);
      setSelectedServiceArea(areas[0]);
      return;
    }

    // Try to get location from navigation state
    const fromNav = locationRoute.state?.selectedServiceArea;
    console.log("fromNav:", fromNav);

    if (fromNav) {
      // Handle different possible formats of fromNav
      let locationName = null;

      if (typeof fromNav === 'string') {
        locationName = fromNav;
      } else if (fromNav.locationName) {
        locationName = fromNav.locationName;
      } else if (fromNav.city) {
        locationName = fromNav.city;
      } else if (fromNav.name) {
        locationName = fromNav.name;
      }

      console.log("Looking for location name:", locationName);

      if (locationName) {
        const found = areas.find((a) =>
          a.locationName === locationName ||
          a.locationName.toLowerCase().includes(locationName.toLowerCase()) ||
          locationName.toLowerCase().includes(a.locationName.toLowerCase())
        );

        if (found) {
          console.log("Found matching area:", found);
          setSelectedServiceArea(found);
          return;
        }
      }
    }

    // Try to get from localStorage
    const savedLocation = localStorage.getItem("selectedLocation");
    console.log("Saved location from localStorage:", savedLocation);

    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        let locationName = location.city || location.display_name?.split(',')[0] || location.locationName;

        if (locationName) {
          const found = areas.find((a) =>
            a.locationName === locationName ||
            a.locationName.toLowerCase().includes(locationName.toLowerCase()) ||
            locationName.toLowerCase().includes(a.locationName.toLowerCase())
          );

          if (found) {
            console.log("Found from localStorage:", found);
            setSelectedServiceArea(found);
            return;
          }
        }
      } catch (error) {
        console.error("Error parsing saved location:", error);
      }
    }

    // If still no match, select the first area as default
    console.log("No match found, selecting first area:", areas[0]);
    setSelectedServiceArea(areas[0]);
  }, [service, locationRoute.state]);
  // Calculate days between dates
  useEffect(() => {
    const unit = service?.unit || 'per day';

    if (unit.includes('hour') || unit === 'per person' || unit === 'per item' || unit === 'Other') {
      // For single date services, daysCount is always 1
      setDaysCount(1);
    } else if (fromDate && toDate) {
      // For date range services, calculate days between
      const start = moment(fromDate);
      const end = moment(toDate);
      const diff = end.diff(start, 'days') + 1;
      setDaysCount(diff > 0 ? diff : 1);
    }
  }, [fromDate, toDate, service]);

  // Calculate total amount - FIXED for your schema
  // Find the total amount calculation useEffect and update it:
  // Calculate total amount - FIXED for your schema
  // Calculate total amount - FIXED for your schema
// Calculate total amount - FIXED quantity logic
useEffect(() => {
  if (!service) return;

  let baseTotal = 0;
  const unit = service.unit || 'per day';
  const currentBookingType = bookingType || service.bookingType || 'Automatic Booking';
  const unitRent = effectiveBaseRent(service, selectedServiceArea);

  // For Inquari Booking, show base price as reference but don't calculate total
  if (currentBookingType === 'Inquari Booking') {
    baseTotal = 0;
  } else {
    // Calculate base price based on unit type
    if (unit.includes('day') || unit.includes('week') || unit.includes('month')) {
      // Quantity multiplies the total (rent × days × quantity)
      baseTotal = unitRent * daysCount * quantity;
    } else if (unit.includes('hour')) {
      // Quantity multiplies the total (rent × slots × quantity)
      baseTotal = unitRent * (selectedSlots.length || 1) * quantity;
    } else {
      // Quantity-based units (per person, per item, etc.)
      // Quantity directly multiplies the unit rent
      baseTotal = unitRent * quantity;
    }
  }

  // Calculate countable optional inputs total
  // IMPORTANT: quantity does NOT affect optional input prices
  const countableOptionalsTotal = (service.optionalInputs || []).reduce((acc, input, i) => {
    const inputPrice = effectiveOptionalUnitPrice(input, selectedServiceArea);

    if (input.isCountable) {
      const count = optionalInputCounts[i] || 0;

      // Calculate multiplier for optional inputs (without quantity)
      let multiplier = 1; // Default multiplier (no quantity effect)

      const inputUnit = input.unit || '';
      const mainUnit = service.unit || 'per day';

      // If input uses day-based unit and main service uses days
      if ((inputUnit.includes('day') || inputUnit === 'per-day') &&
          (mainUnit.includes('day') || mainUnit === 'per-day')) {
        multiplier = daysCount; // Only days count, NOT quantity
      }
      // If input uses hour-based unit and main service uses hours/slots
      else if ((inputUnit.includes('hour') || inputUnit === 'per-hour') &&
               (mainUnit.includes('hour') || mainUnit === 'per-hour')) {
        multiplier = (selectedSlots.length || 1); // Only slots count, NOT quantity
      }

      return acc + (count * inputPrice * multiplier);
    }
    return acc;
  }, 0);

  // Calculate non-countable optional inputs total
  // IMPORTANT: quantity does NOT affect optional input prices
  const nonCountableOptionalsTotal = (service.optionalInputs || []).reduce((acc, input, i) => {
    if (!input.isCountable && addedOptionalInputs[i]) {
      const inputPrice = effectiveOptionalUnitPrice(input, selectedServiceArea);

      // Calculate multiplier for non-countable items (without quantity)
      let multiplier = 1;
      const inputUnit = input.unit || '';
      const mainUnit = service.unit || 'per day';

      if ((inputUnit.includes('day') || inputUnit === 'per-day') &&
          (mainUnit.includes('day') || mainUnit === 'per-day')) {
        multiplier = daysCount; // Only days count, NOT quantity
      } else if ((inputUnit.includes('hour') || inputUnit === 'per-hour') &&
                 (mainUnit.includes('hour') || mainUnit === 'per-hour')) {
        multiplier = (selectedSlots.length || 1); // Only slots count, NOT quantity
      }

      return acc + (inputPrice * multiplier);
    }
    return acc;
  }, 0);

  // Calculate extra inputs total
  // IMPORTANT: quantity does NOT affect extra input prices
  const extrasTotal = (service.extraInputs || []).reduce((acc, input, i) => {
    if (addedExtraInputs[i]) {
      const inputPrice = input.price || 0;

      // Calculate multiplier for extra inputs (without quantity)
      let multiplier = 1;
      const inputUnit = input.unit || '';
      const mainUnit = service.unit || 'per day';

      if ((inputUnit.includes('day') || inputUnit === 'per-day') &&
          (mainUnit.includes('day') || mainUnit === 'per-day')) {
        multiplier = daysCount; // Only days count, NOT quantity
      } else if ((inputUnit.includes('hour') || inputUnit === 'per-hour') &&
                 (mainUnit.includes('hour') || mainUnit === 'per-hour')) {
        multiplier = (selectedSlots.length || 1); // Only slots count, NOT quantity
      }

      return acc + (inputPrice * multiplier);
    }
    return acc;
  }, 0);

  // Set final total including all components
  setTotalAmount(baseTotal + countableOptionalsTotal + nonCountableOptionalsTotal + extrasTotal);

}, [quantity, daysCount, selectedSlots, optionalInputCounts, addedOptionalInputs, addedExtraInputs, service, bookingType, selectedServiceArea]);

  const handleChange = (index, increment) => {
    setOptionalInputCounts((prevCounts) => {
      const newCounts = { ...prevCounts };
      const currentCount = newCounts[index] || 0;
      const input = service.optionalInputs[index];
      const maxAllowed = input.maxcount || 5;

      if (increment && currentCount < maxAllowed) {
        newCounts[index] = currentCount + 1;
      } else if (!increment && currentCount > 0) {
        newCounts[index] = currentCount - 1;
      }

      return newCounts;
    });
  };

  // Handle non-countable optional input add/remove
  const handleAddOptionalInput = (index) => {
    setAddedOptionalInputs((prev) => ({ ...prev, [index]: true }));
  };

  const handleRemoveOptionalInput = (index) => {
    setAddedOptionalInputs((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  // Handle extra input add/remove
  const handleAddExtraInput = (index) => {
    setAddedExtraInputs((prev) => ({ ...prev, [index]: true }));
  };

  const handleRemoveExtraInput = (index) => {
    setAddedExtraInputs((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  // Get location type
  const locationType = service?.locations?.[0] || "No";

  // Handle booking submission
  // In Bookingscreen.js - Update the handleBooking function

  // In Bookingscreen.js - Update the handleBooking function

  const handleBooking = async (e) => {
    e.preventDefault();

    const unit = service?.unit || 'per day';

    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || !user._id) {
      Swal.fire('Error', 'You must be logged in to book a service.', 'error');
      return;
    }

    // First step: Show form validation
    if (!showBill) {
      // Validate required fields
      if (!name || !phone || !description) {
        Swal.fire('Error', 'Please fill all required fields', 'error');
        return;
      }

      // Only validate dates for non-inquiry bookings
      if (bookingType !== 'Inquari Booking') {
        if ((unit.includes('day') || unit.includes('week') || unit.includes('month')) && selectedDates.length === 0) {
          Swal.fire('Error', 'Please select at least one date', 'error');
          return;
        }

        // For hourly services, validate time slots
        if (unit.includes('hour') && selectedSlots.length === 0) {
          Swal.fire('Error', 'Please select at least one time slot', 'error');
          return;
        }

        // Location validation
        if (locationType === 'Simple' && !address) {
          Swal.fire('Error', 'Please provide the service address', 'error');
          return;
        }

        if (locationType === 'Rental' && (!pickupAddress || !dropAddress)) {
          Swal.fire('Error', 'Both pickup and drop addresses are required', 'error');
          return;
        }

        const coverageAreas = normalizeLocationPricing(service?.locationPricing);
        if (coverageAreas.length > 0 && !selectedServiceArea) {
          Swal.fire('Error', 'Please select which area you are booking for — prices depend on the service area.', 'error');
          return;
        }
      }

      // Show bill
      setShowBill(true);
      return;
    }

    // Second step: Confirm booking
    try {
      setLoading(true);

      // Prepare dates array - only if needed
      const bookingDates = selectedDates.length > 0
        ? selectedDates
        : (fromDate ? [fromDate] : []);

      // Format slots properly
      const formattedSlots = selectedSlots.map(slot => {
        if (typeof slot === 'object' && slot.date && slot.slot) {
          return {
            date: slot.date,
            slot: slot.slot
          };
        } else if (typeof slot === 'string') {
          return {
            date: selectedDates[0] || fromDate,
            slot: slot
          };
        }
        return slot;
      });

      // Prepare booking details
      const effectiveRentSnapshot = effectiveBaseRent(service, selectedServiceArea);
      const bookingDetails = {
        serviceid,
        totalAmount: bookingType === 'Inquari Booking' ? 0 : totalAmount, // Send 0 for inquiry
        userid: user._id,
        name,
        phone,
        description,
        service: service.name,
        locationType,
        unit: service.unit,
        customUnit: service.customUnit,
        isCountable: service.isCountable,
        rentperday: effectiveRentSnapshot,
        selectedServiceArea: selectedServiceArea
          ? {
            locationName: selectedServiceArea.locationName,
            locationAddress: selectedServiceArea.locationAddress,
            extraPrice: Number(selectedServiceArea.extraPrice) || 0,
          }
          : undefined,
        quantity: quantity,
        fromDate: bookingDates[0] || '',
        toDate: bookingDates[bookingDates.length - 1] || '',
        daysCount,
        selectedDates: bookingDates,
        slots: formattedSlots,
        bookingType: service.bookingType || 'Automatic Booking',

        // Optional inputs (include non-countable selections too)
        optionalInputs: (service.optionalInputs || [])
          .map((input, index) => {
            const isCountable = input.isCountable !== false;
            const count = isCountable ? (optionalInputCounts[index] || 0) : (addedOptionalInputs[index] ? 1 : 0);
            return {
              name: input.name,
              price: effectiveOptionalUnitPrice(input, selectedServiceArea),
              count,
              unit: input.unit,
              customUnit: input.customUnit,
              isCountable
            };
          })
          .filter(input => (input.count || 0) > 0),

        // Extra inputs
        extraInputs: (service.extraInputs || [])
          .filter((_, index) => addedExtraInputs[index])
          .map(input => ({
            name: input.name,
            price: input.price,
            unit: input.unit,
            customUnit: input.customUnit
          })),

        // Location data
        ...(locationType === 'Simple' && { address }),
        ...(locationType === 'Rental' && {
          pickupAddress,
          dropAddress,
          returnTrip
        }),

        createdAt: new Date().toISOString(),
        status: bookingType === 'Inquari Booking' ? 'inquiry' : 'pending'
      };

      console.log('Final booking details being sent:', bookingDetails);

      const response = await axios.post('/api/bookings/bookservice', bookingDetails);

      if (response.status === 201) {
        Swal.fire({
          title: bookingType === 'Inquari Booking' ? 'Inquiry Submitted!' : 'Success!',
          text: bookingType === 'Inquari Booking'
            ? 'Your inquiry has been submitted. Our team will contact you shortly.'
            : 'Your service has been booked!',
          icon: 'success',
        })
      }

    } catch (error) {
      console.error("Booking Error:", error);
      let errorMessage = bookingType === 'Inquari Booking'
        ? 'Failed to submit inquiry.'
        : 'Failed to book the service.';

      if (error.response) {
        if (error.response.status === 400) {
          errorMessage = error.response.data.message || 'Invalid booking data.';
        } else if (error.response.status === 401) {
          errorMessage = 'Please login again.';
          localStorage.removeItem('currentUser');
          navigate('/login');
        } else if (error.response.status === 409) {
          errorMessage = 'This time slot is already booked. Please choose different dates/times.';
        }
      }

      Swal.fire('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
      setShowBookingModal(false);
      setShowBill(false);
    }
  };
  // Update the handleDateSelect function to support multiple dates:
  const handleDateSelect = (date) => {
    const dateStr = moment(date).format('YYYY-MM-DD');

    // Check if date is unavailable
    const unavailableDate = service?.unavailableDates?.find(d =>
      d.date === dateStr
    );

    if (unavailableDate?.fullDay) {
      Swal.fire('Not Available', 'This date is fully booked', 'warning');
      return;
    }

    // Check unit type to determine selection mode
    const unit = service?.unit || 'per day';

    if (unit.includes('hour') || unit === 'per person' || unit === 'per item' || unit === 'Other') {
      // Single date selection for time slots or quantity-based services
      setSelectedDates([dateStr]);
      setFromDate(dateStr);
      setToDate(dateStr);
    } else {
      // Multiple date selection for day-based services
      setSelectedDates(prev => {
        // If date already selected, remove it
        if (prev.includes(dateStr)) {
          const newDates = prev.filter(d => d !== dateStr);

          // Update fromDate and toDate based on remaining dates
          if (newDates.length > 0) {
            const sortedDates = [...newDates].sort();
            setFromDate(sortedDates[0]);
            setToDate(sortedDates[sortedDates.length - 1]);
          } else {
            setFromDate('');
            setToDate('');
          }

          return newDates;
        }

        // Add new date and sort
        const newDates = [...prev, dateStr].sort();

        // Update fromDate and toDate
        setFromDate(newDates[0]);
        setToDate(newDates[newDates.length - 1]);

        return newDates;
      });
    }

    // If it's an hourly service, clear existing slots when date changes
    if (unit.includes('hour')) {
      setSelectedSlots([]);
    }
  };

  // Handle time slot selection
  const handleSlotSelect = (date, slot) => {
    const formattedDate = moment(date).format('YYYY-MM-DD');

    setSelectedSlots(prev => {
      const exists = prev.some(s =>
        s.date === formattedDate && s.slot === slot
      );

      if (exists) {
        return prev.filter(s => !(s.date === formattedDate && s.slot === slot));
      } else {
        return [...prev, { date: formattedDate, slot }];
      }
    });
  };

  // Contact handlers
  const handleContact = () => {
    const phoneNumber = service?.phonenumber;
    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`;
    } else {
      alert("Phone number not available.");
    }
  };

  const handleWhatsApp = () => {
    const message = "Hello, I would like to inquire about the service.";
    const phoneNumber = service?.phonenumber;
    if (phoneNumber) {
      window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      alert("Phone number not available.");
    }
  };

  // Carousel handlers
  const handlePrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? service.imageurls.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === service.imageurls.length - 1 ? 0 : prevIndex + 1
    );
  };

  // Render UI based on unit type
  const renderUnitBasedControls = () => {
    if (!service) return null;

    const unit = service.unit || 'per day';
    const displayUnit = unit === "Other" ? service.customUnit : unit;

    // Day-based units (show date range or multiple dates)
    if (unit.includes('day') || unit.includes('week') || unit.includes('month')) {
      return (
        <div className="booking-controls" style={{
          overflow: "visible",  // or "hidden" depending on your need
          width: "100%"
        }}>
          {/* Your date picker here */}
          <legend className="section-title">Select Dates</legend>
         <div
  className="date-picker-trigger"
  onClick={() => setIsCalendarOpen(true)}
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 15px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    cursor: "pointer",
    background: "white",
    width: "100%",  // Changed from 300px to 100%
    maxWidth: "300px",  // Add max-width instead of fixed width
    minWidth: "200px",  // Minimum width for small screens
    marginBottom: "10px",
    boxSizing: "border-box"  // Ensure padding is included in width
  }}
>
  <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
    <span>📅</span>
    <div style={{ overflow: "hidden" }}>
      <small style={{ fontSize: "0.8em", color: "#666", display: "block" }}>Select Date</small>
      <div style={{ 
        fontSize: "1em", 
        color: "#333", 
        fontWeight: "bold",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "180px"
      }}>
        {selectedDates[0] || "Choose a date"}
      </div>
    </div>
  </div>
  <span style={{ flexShrink: 0 }}>▾</span>
</div>
          {selectedDates.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <p><b>Selected Dates:</b></p>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '5px',
                marginTop: '5px'
              }}>
                {selectedDates.map((date, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '3px 8px',
                      background: '#007bff',
                      color: 'white',
                      borderRadius: '3px',
                      fontSize: '0.9em'
                    }}
                  >
                    {moment(date).format('MMM D')}
                  </span>
                ))}
              </div>
            </div>
          )}


        </div>
      );
    }

    // Time-based units (show time slots)
    else if (unit.includes('hour')) {
      return (
        <div className="booking-controls">
          <legend className="section-title">Select Date & Time</legend>

          {/* Date selection */}
          <div
            className="date-picker-trigger"
            onClick={() => setIsCalendarOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 15px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              cursor: "pointer",
              background: "white",
              width: "300px",
              marginBottom: "10px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span>📅</span>
              <div>
                <small style={{ fontSize: "0.8em", color: "#666" }}>Select Date</small>
                <div style={{ fontSize: "1em", color: "#333", fontWeight: "bold" }}>
                  {selectedDates[0] || "Choose a date"}
                </div>
              </div>
            </div>
            <span>▾</span>
          </div>

          {/* Time slots */}
          {selectedDates.length > 0 && (
            <div className="time-slots-container" style={{ marginTop: "15px" }}>
              <p><b>Available Time Slots:</b></p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: "8px",
                marginTop: "10px"
              }}>
                {timeSlots.map((slot, index) => {
                  const isSelected = selectedSlots.some(s =>
                    s.date === selectedDates[0] && s.slot === slot
                  );
                  const isUnavailable = service?.unavailableDates?.some(d =>
                    d.date === selectedDates[0] && d.slots?.includes(slot)
                  );

                  return (
                    <button
                      key={index}
                      onClick={() => handleSlotSelect(selectedDates[0], slot)}
                      disabled={isUnavailable}
                      style={{
                        padding: "8px 5px",
                        border: `1px solid ${isSelected ? '#007bff' : '#ddd'}`,
                        borderRadius: "5px",
                        background: isSelected ? '#007bff' : 'white',
                        color: isSelected ? 'white' : isUnavailable ? '#999' : '#333',
                        cursor: isUnavailable ? 'not-allowed' : 'pointer',
                        fontSize: "0.9em",
                        textDecoration: isUnavailable ? 'line-through' : 'none'
                      }}
                    >
                      {slot} {isUnavailable && '✗'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Quantity-based units (show quantity selector)
    else {
      return (
        <div className="booking-controls">

          {/* Optional date selection */}
          <div style={{ marginTop: "15px", marginRight: "5px" }}>
            <p><b>Select Date for Service:</b></p>
            <div
              className="date-picker-trigger"
              onClick={() => setIsCalendarOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 15px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                cursor: "pointer",
                background: "white",
                width: "300px",
                marginTop: "5px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span>📅</span>
                <div>
                  <small style={{ fontSize: "0.8em", color: "#666" }}>Select Date</small>
                  <div style={{ fontSize: "1em", color: "#333", fontWeight: "bold" }}>
                    {selectedDates[0] || "Choose a date"}
                  </div>
                </div>
              </div>
              <span>▾</span>
            </div>
          </div>
        </div>
      );
    }
  };

  // Loading and error states
  if (loading) return <Loader />;
  if (error) return <Error />;
  if (!service) return <div>Service not found</div>;

  // Get display unit
  const displayUnit = service.unit === "Other" ? service.customUnit : service.unit;
  const coverageAreas = normalizeLocationPricing(service.locationPricing);
  const effectiveRate = effectiveBaseRent(service, selectedServiceArea);

  return (
    <div>
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <div style={{ marginTop: '10px', padding: '0 20px' }}>
        <div className="col-md-12 text-left">

          {/* Service Header */}
          <div className="mb-3 bs">
            {/* Image Carousel */}
            <div className="image-carousel position-relative" style={{
              height: "auto",
              width: "100%",
              overflow: "hidden",
              borderRadius: "12px",
              position: "relative",
              backgroundColor: "#f5f5f5",
              // Responsive aspect ratio
              aspectRatio: window.innerWidth >= 1024 ? "21/9" : window.innerWidth >= 768 ? "16/9" : "4/3",
              // Alternative using CSS clamp for better responsiveness
              maxHeight: "70vh",
              minHeight: "250px"
            }}>
              <img
                src={service.imageurls[currentIndex]}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  transition: "opacity 0.3s ease"
                }}
                alt={`Service ${currentIndex + 1}`}
                loading="lazy"
              />

              {/* Navigation Buttons - Fully Responsive */}
              <button
                className="carousel-control-prev"
                onClick={handlePrevious}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "20px",
                  transform: "translateY(-50%)",
                  background: "rgba(0, 0, 0, 0.7)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  zIndex: 2,
                  backdropFilter: "blur(4px)",
                  transition: "all 0.3s ease",
                  // Responsive button size
                  width: "clamp(32px, 5vw, 48px)",
                  height: "clamp(32px, 5vw, 48px)",
                  fontSize: "clamp(20px, 4vw, 28px)",
                  // Hover effect for laptop
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.9)";
                  e.currentTarget.style.transform = "translateY(-50%) scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
                  e.currentTarget.style.transform = "translateY(-50%) scale(1)";
                }}
                aria-label="Previous image"
              >
                ‹
              </button>

              <button
                className="carousel-control-next"
                onClick={handleNext}
                style={{
                  position: "absolute",
                  top: "50%",
                  right: "20px",
                  transform: "translateY(-50%)",
                  background: "rgba(0, 0, 0, 0.7)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  zIndex: 2,
                  backdropFilter: "blur(4px)",
                  transition: "all 0.3s ease",
                  // Responsive button size
                  width: "clamp(32px, 5vw, 48px)",
                  height: "clamp(32px, 5vw, 48px)",
                  fontSize: "clamp(20px, 4vw, 28px)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.9)";
                  e.currentTarget.style.transform = "translateY(-50%) scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
                  e.currentTarget.style.transform = "translateY(-50%) scale(1)";
                }}
                aria-label="Next image"
              >
                ›
              </button>

              {/* Image Counter - Responsive */}
              {service.imageurls && service.imageurls.length > 1 && (
                <div style={{
                  position: "absolute",
                  bottom: "clamp(10px, 2vh, 20px)",
                  right: "clamp(10px, 2vw, 20px)",
                  background: "rgba(0, 0, 0, 0.7)",
                  color: "#fff",
                  padding: "clamp(4px, 1.5vw, 8px) clamp(8px, 2vw, 12px)",
                  borderRadius: "20px",
                  fontSize: "clamp(11px, 2.5vw, 14px)",
                  fontWeight: "500",
                  backdropFilter: "blur(4px)",
                  zIndex: 2,
                  fontFamily: "monospace",
                  letterSpacing: "0.5px"
                }}>
                  {currentIndex + 1} / {service.imageurls.length}
                </div>
              )}

              {/* Optional: Dot Indicators for Mobile */}
              {service.imageurls && service.imageurls.length > 1 && (
                <div style={{
                  position: "absolute",
                  bottom: "clamp(10px, 2vh, 20px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: "clamp(6px, 1.5vw, 10px)",
                  zIndex: 2,
                  padding: "6px 12px",
                  borderRadius: "20px",
                  background: "rgba(0, 0, 0, 0.5)",
                  backdropFilter: "blur(4px)"
                }}>
                  {service.imageurls.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        // Add function to jump to specific image
                        // You'll need to implement this
                      }}
                      style={{
                        width: idx === currentIndex ? "clamp(20px, 3vw, 24px)" : "clamp(8px, 2vw, 10px)",
                        height: "clamp(8px, 2vw, 10px)",
                        borderRadius: "50%",
                        background: idx === currentIndex ? "#fff" : "rgba(255, 255, 255, 0.6)",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        padding: 0
                      }}
                      aria-label={`Go to image ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Title and Company - Fully Responsive */}
            <h1 style={{
              textAlign: "left",
              width: "100%",
              marginTop: "clamp(16px, 3vh, 24px)",
              // Responsive font sizes
              fontSize: "clamp(20px, 4vw, 32px)",
              padding: "0 clamp(12px, 3vw, 24px)",
              fontWeight: "bold",
              lineHeight: "1.3",
              // Responsive margins
              marginBottom: "clamp(8px, 1.5vh, 12px)"
            }}>
              <b>{service.name}</b>
            </h1>

            <p style={{
              color: "#666",
              marginBottom: "clamp(16px, 3vh, 24px)",
              fontSize: "clamp(14px, 2.5vw, 16px)",
              padding: "0 clamp(12px, 3vw, 24px)",
              lineHeight: "1.5"
            }}>
              {service.companyname || "N/A"}
            </p>
          </div>
          {/* Booking Section */}
          <div className="col p-3  bs text-left" style={{
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            padding: "20px"
          }}>

            {/* Unit-based Controls */}
            {renderUnitBasedControls()}

            {/* Price Display */}
            {bookingType !== 'Inquari Booking' ? (
              <p style={{ fontSize: "1.1em", margin: "15px 0" }}>
                <b>Price:</b> ₹{effectiveRate} {displayUnit ? `/ ${displayUnit}` : ""}
                {coverageAreas.length === 0 && (
                  <small style={{ display: "block", fontSize: "0.85em", color: "#666" }}>Same rate in all locations</small>
                )}
              </p>
            ) : (
              <p style={{ fontSize: "1.1em", margin: "15px 0", color: "#ff9800" }}>
                <b>Price:</b> <span style={{ fontWeight: 'bold' }}>On Inquiry</span>
                <small style={{ display: 'block', fontSize: '0.8em', color: '#666' }}>
                  (Reference list: ₹{effectiveRate} {displayUnit ? `/ ${displayUnit}` : ""})
                </small>
              </p>
            )}

            {/* Quantity for countable service */}
            {bookingType !== 'Inquari Booking' && service.isCountable && (
              <div className="quantity-control" style={{
                margin: "15px 0",
                padding: "10px",
                background: "#f8f9fa",
                borderRadius: "5px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <label><b>Quantity:</b></label>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      onClick={() => setQuantity(prev => prev > 1 ? prev - 1 : 1)}
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "5px",
                        border: "1px solid #ddd",
                        background: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: "bold",
                        color: "black"
                      }}
                    >
                      -
                    </button>
                    <span style={{ minWidth: "30px", textAlign: "center", fontWeight: "bold" }}>
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(prev => prev + 1)}
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "5px",
                        border: "1px solid #ddd",
                        background: "white",
                        color: "black",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: "bold"
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Total Amount */}
            {bookingType !== 'Inquari Booking' ? (
              <p style={{ fontSize: "1.2em", fontWeight: "bold", margin: "20px 0", color: "#007bff" }}>
                <b>Total Amount:</b> ₹{totalAmount}
              </p>
            ) : (
              <div style={{ fontSize: "1.2em", fontWeight: "bold", margin: "20px 0", color: "#ff9800" }}>
                <b>Total Amount:</b> Will be shared after inquiry
              </div>
            )}


            {/* Action Buttons */}
            <div className="mt-3 d-flex justify-content-between align-items-center">
              <button
                onClick={() => setShowBookingModal(true)}
                style={{
                  width: "200px",
                  padding: "12px 20px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "1em"
                }}
              >
                Book Now
              </button>

              <div className="contact-buttons d-flex align-items-center">
                <button
                  onClick={handleWhatsApp}
                  style={{
                    background: "#25D366",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "45px",
                    height: "45px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    marginRight: "10px"
                  }}
                >
                  <FontAwesomeIcon icon={faWhatsapp} size="lg" />
                </button>

                <button
                  onClick={handleContact}
                  style={{
                    background: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "45px",
                    height: "45px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}
                >
                  <FontAwesomeIcon icon={faPhone} />
                </button>
              </div>
            </div>
          </div>

          <div style={{
            display: "flex",
            flexWrap: "nowrap",  
            gap: "15px",
            marginTop: "15px",
            overflowX: "auto" // Add this
          }}>          {/* Optional Inputs Section */}
            {/* Optional Inputs Section - Only show if there are optional inputs */}
            {service.optionalInputs && service.optionalInputs.length > 0 && (
              <div className="optional-inputs-section" style={{ marginTop: "30px" }}>
                <h4>Optional Services</h4>
                <div style={{
                  display: "flex",
                  flexWrap: "nowrap",   // ❌ remove wrap
                  gap: "15px",
                  marginTop: "15px",
                  overflowX: "auto"     // ✅ enable horizontal scroll
                }}>
                  {service.optionalInputs.map((input, index) => {
                    // Helper function to get display unit for optional input
                    const getOptionalDisplayUnit = (input) => {
                      if (input.customUnit) {
                        return input.customUnit;
                      }

                      const unit = input.unit || 'per item';

                      // Remove 'per-' prefix if present and format nicely
                      if (unit.startsWith('per-')) {
                        return unit.replace('per-', '').replace(/-/g, ' ');
                      }

                      return unit;
                    };

                    const inputName = input.name || `Option ${index + 1}`;
                    const inputPrice = effectiveOptionalUnitPrice(input, selectedServiceArea);
                    const displayUnit = getOptionalDisplayUnit(input);
                    const inputImage = input.image || '';
                    const inputMaxCount = input.maxcount || 5;
                    const inputIsCountable = input.isCountable !== false;

                    return (
                      <div
                        key={index}
                        style={{
                          width: "180px",
                          background: "white",
                          borderRadius: "8px",
                          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                          padding: "15px",
                          textAlign: "center"
                        }}
                      >
                        {inputImage && (
                          <img
                            src={inputImage}
                            alt={inputName}
                            style={{
                              width: "100%",
                              height: "120px",
                              objectFit: "cover",
                              borderRadius: "5px",
                              marginBottom: "10px"
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none'; // Hide if image fails to load
                            }}
                          />
                        )}

                        <h5 style={{ fontSize: "1em", marginBottom: "5px" }}>
                          {inputName}
                        </h5>

                        <p style={{ color: "#007bff", fontWeight: "bold", marginBottom: "10px" }}>
                          ₹{inputPrice}
                          {displayUnit && (
                            <span> / {displayUnit}</span>
                          )}
                        </p>

                        {inputIsCountable ? (
                          <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                            <button
                              onClick={() => handleChange(index, false)}
                              disabled={!optionalInputCounts[index]}
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "5px",
                                border: "1px solid #ddd",
                                background: optionalInputCounts[index] ? "#f8f9fa" : "white",
                                cursor: optionalInputCounts[index] ? "pointer" : "not-allowed",
                                color: "black"
                              }}
                            >
                              -
                            </button>

                            <span style={{
                              minWidth: "30px",
                              textAlign: "center",
                              lineHeight: "30px"
                            }}>
                              {optionalInputCounts[index] || 0}
                            </span>

                            <button
                              onClick={() => handleChange(index, true)}
                              disabled={optionalInputCounts[index] >= inputMaxCount}
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "5px",
                                border: "1px solid #ddd",
                                background: "white",
                                cursor: "pointer",
                                color: "black"
                              }}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              addedOptionalInputs[index]
                                ? handleRemoveOptionalInput(index)
                                : handleAddOptionalInput(index)
                            }
                            style={{
                              width: "100%",
                              padding: "8px",
                              background: addedOptionalInputs[index] ? "#dc3545" : "#28a745",
                              color: "white",
                              border: "none",
                              borderRadius: "5px",
                              cursor: "pointer"
                            }}
                          >
                            {addedOptionalInputs[index] ? "Remove" : "Add"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extra Inputs Section */}
            {service.extraInputs && service.extraInputs.length > 0 && (
              <div className="extra-inputs-section" style={{ marginTop: "30px" }}>
                <div style={{
                  display: "flex",
                  flexWrap: "nowrap",   // ❌ remove wrap
                  gap: "15px",
                  marginTop: "15px",
                  overflowX: "auto"
                }}>
                  {service.extraInputs.map((input, index) => (
                    <div
                      key={index}
                      style={{
                        width: "180px",
                        background: "white",
                        borderRadius: "8px",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                        padding: "15px",
                        textAlign: "center"
                      }}
                    >
                      {input.image && (
                        <img
                          src={input.image}
                          alt={input.name}
                          style={{
                            width: "100%",
                            height: "120px",
                            objectFit: "cover",
                            borderRadius: "5px",
                            marginBottom: "10px"
                          }}
                        />
                      )}

                      <h5 style={{ fontSize: "1em", marginBottom: "5px" }}>
                        {input.name}
                      </h5>

                      <p style={{ color: "#007bff", fontWeight: "bold", marginBottom: "10px" }}>
                        ₹{input.price} {input.unit === 'Other' ? input.customUnit : `/${input.unit}`}
                      </p>

                      <button
                        onClick={() =>
                          addedExtraInputs[index]
                            ? handleRemoveExtraInput(index)
                            : handleAddExtraInput(index)
                        }
                        style={{
                          width: "100%",
                          padding: "8px",
                          background: addedExtraInputs[index] ? "#dc3545" : "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer"
                        }}
                      >
                        {addedExtraInputs[index] ? "Remove" : "Add"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
          {/* Description Section */}
          {/* Description Section - Professional & Responsive */}
<div style={{
  backgroundColor: "white",
  borderRadius: "12px",
  padding: "clamp(16px, 4vw, 28px)",
  marginTop: "20px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  border: "1px solid #f0f0f0"
}}>
  <div style={{
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
    borderBottom: "2px solid #28a745",
    paddingBottom: "12px"
  }}>
    <span style={{ fontSize: "24px" }}>📋</span>
    <h3 style={{ 
      margin: 0, 
      fontSize: "clamp(18px, 4vw, 24px)",
      fontWeight: "600",
      color: "#1a1a1a"
    }}>
      Service Details
    </h3>
  </div>
  
  <div style={{
    lineHeight: "1.7",
    color: "#444",
    fontSize: "clamp(14px, 3vw, 16px)"
  }}>
    {typeof service.description === 'string' ? (
      service.description.split('\n').map((point, idx) => {
        const trimmedPoint = point.trim();
        if (!trimmedPoint) return null;
        
        // Check if point starts with arrow or bullet
        const hasBullet = trimmedPoint.startsWith('→') || 
                         trimmedPoint.startsWith('•') || 
                         trimmedPoint.startsWith('-');
        
        return (
          <div 
            key={idx} 
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              marginBottom: "12px",
              padding: "8px 12px",
              backgroundColor: idx % 2 === 0 ? "#fff" : "#fafafa",
              borderRadius: "8px",
              transition: "all 0.2s ease"
            }}
          >
            <span style={{
              fontSize: "18px",
              color: "#28a745",
              minWidth: "24px",
              marginTop: "2px"
            }}>
              {hasBullet ? "▹" : "•"}
            </span>
            <span style={{
              flex: 1,
              wordBreak: "break-word"
            }}>
              {hasBullet ? trimmedPoint.slice(1).trim() : trimmedPoint}
            </span>
          </div>
        );
      })
    ) : (
      <p>{service.description}</p>
    )}
  </div>
</div>
          {/* Facilities Section */}
  {/* Facilities Section - Professional & Responsive */}
<div style={{
  backgroundColor: "white",
  borderRadius: "12px",
  padding: "clamp(16px, 4vw, 28px)",
  marginTop: "20px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  border: "1px solid #f0f0f0"
}}>
  <div style={{
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
    borderBottom: "2px solid #007bff",
    paddingBottom: "12px"
  }}>
    <span style={{ fontSize: "24px" }}>✨</span>
    <h3 style={{ 
      margin: 0, 
      fontSize: "clamp(18px, 4vw, 24px)",
      fontWeight: "600",
      color: "#1a1a1a"
    }}>
      What We Offer
    </h3>
  </div>
  
  <div style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "12px",
    marginTop: "8px"
  }}>
    {(() => {
      // Convert facility to array if it's a string
      let facilityArray = service.facility;
      
      if (typeof service.facility === 'string') {
        // Split by newline and filter out empty lines
        facilityArray = service.facility
          .split('\n')
          .filter(line => line.trim() !== '')
          .map(line => {
            // Remove leading arrows or bullets if present
            return line.replace(/^[→•\-]\s*/, '').trim();
          });
      }
      
      // If it's already an array, use it directly
      if (Array.isArray(facilityArray)) {
        return facilityArray.map((item, index) => (
          <div 
            key={index} 
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 12px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              transition: "all 0.2s ease",
              cursor: "pointer",
              gap: "12px"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#e9ecef";
              e.currentTarget.style.transform = "translateX(4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#f8f9fa";
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >
            <span style={{
              fontSize: "18px",
              color: "#007bff",
              minWidth: "24px"
            }}>
              ✓
            </span>
            <span style={{
              fontSize: "clamp(13px, 3vw, 15px)",
              color: "#333",
              lineHeight: "1.5",
              flex: 1
            }}>
              {item}
            </span>
          </div>
        ));
      }
      
      // Fallback for single facility
      return (
        <div style={{
          display: "flex",
          alignItems: "center",
          padding: "12px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          gap: "12px"
        }}>
          <span style={{ fontSize: "18px", color: "#007bff" }}>✓</span>
          <span style={{ lineHeight: "1.6", color: "#555" }}>
            {service.facility}
          </span>
        </div>
      );
    })()}
  </div>
</div>
          {/* Reviews Section */}
          <div style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "20px",
            marginTop: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <h3>Reviews</h3>
            <ReviewSystem serviceId={serviceid} />
          </div>

          {/* Comments Section */}
          <div style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "20px",
            marginTop: "20px",
            marginBottom: "40px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <h3>Comments</h3>
            <CommentsSection serviceId={serviceid} />
          </div>

        </div>
      </div>

      {/* Booking Modal */}
     {showBookingModal && (
  <div style={{
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)",
    animation: "fadeIn 0.3s ease"
  }}>
    <div style={{
      background: "white",
      borderRadius: "20px",
      width: "90%",
      maxWidth: "650px",
      maxHeight: "85vh",
      overflowY: "auto",
      boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      animation: "slideUp 0.3s ease"
    }}>
      
      {/* Modal Header */}
      <div style={{
        padding: "24px 28px",
        borderBottom: "1px solid #e8e8e8",
        backgroundColor: "#fafafa",
        borderRadius: "20px 20px 0 0",
        position: "sticky",
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px" }}>📝</span>
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "600", color: "#1a1a1a" }}>
              {showBill ? "Confirm Your Booking" : "Booking Details"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#666" }}>
              {showBill ? "Please review and confirm your booking" : "Please fill in your details to continue"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleBooking}>
        <div style={{ padding: "24px 28px" }}>
          
          {/* Personal Information Section */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
              paddingBottom: "8px",
              borderBottom: "2px solid #007bff"
            }}>
              <span style={{ fontSize: "18px" }}>👤</span>
              <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#333" }}>
                Personal Information
              </h4>
            </div>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "6px", 
                fontSize: "13px", 
                fontWeight: "500", 
                color: "#555" 
              }}>
                Full Name <span style={{ color: "#e74c3c" }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter your full name"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  fontSize: "14px",
                  transition: "all 0.2s ease"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#007bff";
                  e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#ddd";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "6px", 
                fontSize: "13px", 
                fontWeight: "500", 
                color: "#555" 
              }}>
                Phone Number <span style={{ color: "#e74c3c" }}>*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="Enter your phone number"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  fontSize: "14px",
                  transition: "all 0.2s ease"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#007bff";
                  e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#ddd";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "6px", 
                fontSize: "13px", 
                fontWeight: "500", 
                color: "#555" 
              }}>
                Description / Special Requests
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                placeholder="Any special requests or additional information..."
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  fontSize: "14px",
                  resize: "vertical",
                  fontFamily: "inherit",
                  transition: "all 0.2s ease"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#007bff";
                  e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#ddd";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          {/* Location Information Section - Professional Design */}
          {locationType !== 'No' && (
            <div style={{ marginBottom: "28px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
                paddingBottom: "8px",
                borderBottom: "2px solid #28a745"
              }}>
                <span style={{ fontSize: "18px" }}>📍</span>
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#333" }}>
                  Location Details
                </h4>
              </div>

              {locationType === 'Simple' && (
                <div style={{ marginBottom: "15px" }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "6px", 
                    fontSize: "13px", 
                    fontWeight: "500", 
                    color: "#555" 
                  }}>
                    Service Address <span style={{ color: "#e74c3c" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#999",
                      fontSize: "16px"
                    }}>🏠</span>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required={locationType === 'Simple'}
                      placeholder="Enter your service address"
                      style={{
                        width: "100%",
                        padding: "12px 14px 12px 40px",
                        border: "1px solid #ddd",
                        borderRadius: "10px",
                        fontSize: "14px",
                        transition: "all 0.2s ease"
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#28a745";
                        e.target.style.boxShadow = "0 0 0 3px rgba(40,167,69,0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#ddd";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>
                  <p style={{ fontSize: "11px", color: "#999", marginTop: "5px" }}>
                    We'll send service professionals to this address
                  </p>
                </div>
              )}

              {locationType === 'Rental' && (
                <>
                  <div style={{ marginBottom: "15px" }}>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "6px", 
                      fontSize: "13px", 
                      fontWeight: "500", 
                      color: "#555" 
                    }}>
                      Pickup Address <span style={{ color: "#e74c3c" }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <span style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#999",
                        fontSize: "16px"
                      }}>🚗</span>
                      <input
                        type="text"
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        required
                        placeholder="Enter pickup location"
                        style={{
                          width: "100%",
                          padding: "12px 14px 12px 40px",
                          border: "1px solid #ddd",
                          borderRadius: "10px",
                          fontSize: "14px",
                          transition: "all 0.2s ease"
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#28a745";
                          e.target.style.boxShadow = "0 0 0 3px rgba(40,167,69,0.1)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "#ddd";
                          e.target.style.boxShadow = "none";
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "15px" }}>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "6px", 
                      fontSize: "13px", 
                      fontWeight: "500", 
                      color: "#555" 
                    }}>
                      Drop-off Address <span style={{ color: "#e74c3c" }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <span style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#999",
                        fontSize: "16px"
                      }}>🏁</span>
                      <input
                        type="text"
                        value={dropAddress}
                        onChange={(e) => setDropAddress(e.target.value)}
                        required
                        placeholder="Enter drop-off location"
                        style={{
                          width: "100%",
                          padding: "12px 14px 12px 40px",
                          border: "1px solid #ddd",
                          borderRadius: "10px",
                          fontSize: "14px",
                          transition: "all 0.2s ease"
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#28a745";
                          e.target.style.boxShadow = "0 0 0 3px rgba(40,167,69,0.1)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "#ddd";
                          e.target.style.boxShadow = "none";
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ 
                    marginBottom: "15px", 
                    padding: "12px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "10px",
                    border: "1px solid #e8e8e8"
                  }}>
                    <label style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "10px",
                      cursor: "pointer"
                    }}>
                      <input
                        type="checkbox"
                        checked={returnTrip}
                        onChange={(e) => setReturnTrip(e.target.checked)}
                        style={{
                          width: "18px",
                          height: "18px",
                          cursor: "pointer"
                        }}
                      />
                      <span style={{ fontSize: "14px", color: "#333" }}>
                        🔄 Return Trip Required
                      </span>
                    </label>
                    <p style={{ fontSize: "11px", color: "#999", marginTop: "8px", marginLeft: "28px" }}>
                      Additional charges may apply for return trip
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Booking Summary Preview (when not showing bill) */}
          {!showBill && (
            <div style={{
              backgroundColor: "#f8f9fa",
              borderRadius: "12px",
              padding: "16px",
              marginTop: "8px",
              border: "1px solid #e8e8e8"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span style={{ fontSize: "16px" }}>📋</span>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#333" }}>Booking Summary Preview</span>
              </div>
              <div style={{ fontSize: "13px", color: "#666" }}>
                <p style={{ margin: "4px 0" }}><strong>Service:</strong> {service?.name}</p>
                <p style={{ margin: "4px 0" }}><strong>Price:</strong> ₹{effectiveRate} / {displayUnit}</p>
                {quantity > 1 && <p style={{ margin: "4px 0" }}><strong>Quantity:</strong> {quantity}</p>}
                {daysCount > 1 && <p style={{ margin: "4px 0" }}><strong>Duration:</strong> {daysCount} days</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div style={{
          padding: "16px 28px",
          borderTop: "1px solid #e8e8e8",
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
          backgroundColor: "#fafafa",
          borderRadius: "0 0 20px 20px",
          position: "sticky",
          bottom: 0
        }}>
          <button
            type="button"
            onClick={() => {
              setShowBookingModal(false);
              setShowBill(false);
            }}
            style={{
              padding: "10px 24px",
              background: "white",
              color: "#666",
              border: "1px solid #d9d9d9",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#999";
              e.currentTarget.style.color = "#333";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#d9d9d9";
              e.currentTarget.style.color = "#666";
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            style={{
              padding: "10px 28px",
              background: showBill ? "#28a745" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            }}
          >
            {showBill ? "Confirm Booking" : "Generate Bill"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* Bill Summary Modal */}
      {/* Bill Summary Modal */}
      {/* Bill Summary Modal */}
     {showBill && (
  <div style={{
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1001,
    backdropFilter: "blur(4px)",
    animation: "fadeIn 0.3s ease"
  }}>
    <div style={{
      background: "white",
      borderRadius: "16px",
      padding: "0",
      width: "90%",
      maxWidth: "550px",
      maxHeight: "85vh",
      overflowY: "auto",
      boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      animation: "slideUp 0.3s ease"
    }}>
      
      {/* Header */}
      <div style={{
        padding: "24px 28px",
        borderBottom: "1px solid #e8e8e8",
        backgroundColor: "#fafafa",
        borderRadius: "16px 16px 0 0",
        position: "sticky",
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px" }}>📋</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: "#1a1a1a" }}>
              {bookingType === 'Inquari Booking' ? 'Inquiry Summary' : 'Booking Summary'}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#666" }}>
              {bookingType === 'Inquari Booking' 
                ? 'Please review your inquiry details' 
                : 'Please review your booking details before confirming'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 28px" }}>
        
        {/* Service Info Card */}
        <div style={{
          backgroundColor: "#f8f9fa",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "20px",
          border: "1px solid #e8e8e8"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div>
              <span style={{ fontSize: "12px", color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Service
              </span>
              <h4 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: "600", color: "#1a1a1a" }}>
                {service.name}
              </h4>
            </div>
            {service.companyname && (
              <span style={{
                backgroundColor: "#e8f4f8",
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                color: "#007185"
              }}>
                {service.companyname}
              </span>
            )}
          </div>
          
          {selectedServiceArea && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#555", marginTop: "8px" }}>
              <span>📍</span>
              <span>Serving: <strong>{selectedServiceArea.locationName}</strong></span>
            </div>
          )}
        </div>

        {/* Inquiry Notice for Inquari Booking */}
        {bookingType === 'Inquari Booking' && (
          <div style={{
            backgroundColor: "#fff8e1",
            borderLeft: "4px solid #ff9800",
            padding: "16px",
            borderRadius: "8px",
            marginBottom: "20px"
          }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "20px" }}>📌</span>
              <div>
                <strong style={{ color: "#e65100", fontSize: "14px" }}>Inquiry Required</strong>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#666" }}>
                  This is an inquiry-based booking. Our team will contact you within 24 hours to confirm pricing and availability.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Booking Details Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "16px",
          marginBottom: "20px",
          padding: "16px",
          backgroundColor: "#fff",
          border: "1px solid #e8e8e8",
          borderRadius: "12px"
        }}>
          {quantity > 1 && bookingType !== 'Inquari Booking' && (
            <div>
              <span style={{ fontSize: "11px", color: "#999", textTransform: "uppercase" }}>Quantity</span>
              <p style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: "500" }}>× {quantity}</p>
            </div>
          )}
          
          <div>
            <span style={{ fontSize: "11px", color: "#999", textTransform: "uppercase" }}>Unit</span>
            <p style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: "500" }}>{displayUnit}</p>
          </div>
          
          {daysCount > 1 && bookingType !== 'Inquari Booking' && (
            <div>
              <span style={{ fontSize: "11px", color: "#999", textTransform: "uppercase" }}>Duration</span>
              <p style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: "500" }}>{daysCount} days</p>
            </div>
          )}
          
          {selectedDates.length > 0 && (
            <div>
              <span style={{ fontSize: "11px", color: "#999", textTransform: "uppercase" }}>
                {selectedSlots.length > 0 ? 'Date' : 'Dates'}
              </span>
              <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: "500" }}>
                {selectedDates.length === 1 
                  ? new Date(selectedDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : `${selectedDates.length} days selected`
                }
              </p>
            </div>
          )}
          
          {selectedSlots.length > 0 && (
            <div>
              <span style={{ fontSize: "11px", color: "#999", textTransform: "uppercase" }}>Time Slots</span>
              <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: "500" }}>
                {selectedSlots.map(s => s.slot).join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Optional Services Section */}
        {bookingType !== 'Inquari Booking' && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px"
            }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>Optional Services</span>
              <span style={{ fontSize: "12px", color: "#999" }}>Added items</span>
            </div>
            
            <div style={{ 
              backgroundColor: "#fafafa", 
              borderRadius: "12px", 
              padding: "12px",
              border: "1px solid #e8e8e8"
            }}>
              {(() => {
                const hasOptionalServices = (service.optionalInputs || []).some((input, index) => {
                  const count = optionalInputCounts[index] || 0;
                  return count > 0 || (!input.isCountable && addedOptionalInputs[index]);
                });

                if (!hasOptionalServices) {
                  return (
                    <p style={{ color: '#999', fontStyle: 'italic', margin: '8px 0', textAlign: 'center', fontSize: '13px' }}>
                      No optional services selected
                    </p>
                  );
                }

                return (
                  <div>
                    {/* Countable optional inputs */}
                    {(service.optionalInputs || []).map((input, index) => {
                      const count = optionalInputCounts[index] || 0;
                      if (count === 0) return null;
                      
                      const getDisplayUnit = (input) => {
                        if (input.customUnit) return input.customUnit;
                        const unit = input.unit || 'per item';
                        if (unit.startsWith('per-')) return unit.replace('per-', '').replace(/-/g, ' ');
                        return unit;
                      };

                      const displayUnit = getDisplayUnit(input);
                      const optUnitRate = effectiveOptionalUnitPrice(input, selectedServiceArea);
                      
                      let itemTotal = 0;
                      let calculationBreakdown = '';
                      const inputUnit = input.unit || '';

                      if (inputUnit.includes('day') || inputUnit === 'per-day') {
                        itemTotal = count * optUnitRate * daysCount;
                        calculationBreakdown = `${count} × ₹${optUnitRate} × ${daysCount} day${daysCount > 1 ? 's' : ''}`;
                      } else if (inputUnit.includes('hour') || inputUnit === 'per-hour') {
                        const slotCount = selectedSlots.length || 1;
                        itemTotal = count * optUnitRate * slotCount;
                        calculationBreakdown = `${count} × ₹${optUnitRate} × ${slotCount} slot${slotCount > 1 ? 's' : ''}`;
                      } else {
                        itemTotal = count * optUnitRate;
                        calculationBreakdown = `${count} × ₹${optUnitRate}`;
                      }

                      return (
                        <div key={`countable-${index}`} style={{
                          marginBottom: '12px',
                          paddingBottom: '12px',
                          borderBottom: '1px solid #e8e8e8',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: '500', fontSize: '13px', color: '#333' }}>{input.name}</div>
                            <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{calculationBreakdown}</div>
                          </div>
                          <span style={{ fontWeight: '600', color: '#007bff', fontSize: '15px' }}>₹{itemTotal}</span>
                        </div>
                      );
                    })}

                    {/* Non-countable optional inputs */}
                    {(service.optionalInputs || []).map((input, index) => {
                      if (input.isCountable || !addedOptionalInputs[index]) return null;
                      
                      const getDisplayUnit = (input) => {
                        if (input.customUnit) return input.customUnit;
                        const unit = input.unit || 'per item';
                        if (unit.startsWith('per-')) return unit.replace('per-', '').replace(/-/g, ' ');
                        return unit;
                      };

                      const displayUnit = getDisplayUnit(input);
                      const optUnitRate = effectiveOptionalUnitPrice(input, selectedServiceArea);
                      
                      let itemTotal = 0;
                      let calculationBreakdown = '';
                      const inputUnit = input.unit || '';

                      if (inputUnit.includes('day') || inputUnit === 'per-day') {
                        itemTotal = optUnitRate * daysCount;
                        calculationBreakdown = `₹${optUnitRate} × ${daysCount} day${daysCount > 1 ? 's' : ''}`;
                      } else if (inputUnit.includes('hour') || inputUnit === 'per-hour') {
                        const slotCount = selectedSlots.length || 1;
                        itemTotal = optUnitRate * slotCount;
                        calculationBreakdown = `₹${optUnitRate} × ${slotCount} slot${slotCount > 1 ? 's' : ''}`;
                      } else {
                        itemTotal = optUnitRate;
                        calculationBreakdown = `₹${optUnitRate}`;
                      }

                      return (
                        <div key={`noncountable-${index}`} style={{
                          marginBottom: '12px',
                          paddingBottom: '12px',
                          borderBottom: '1px solid #e8e8e8',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: '500', fontSize: '13px', color: '#333' }}>{input.name}</div>
                            <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{calculationBreakdown}</div>
                          </div>
                          <span style={{ fontWeight: '600', color: '#007bff', fontSize: '15px' }}>₹{itemTotal}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        {bookingType !== 'Inquari Booking' && (
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid #e8e8e8",
            marginBottom: "20px"
          }}>
            <div style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #e8e8e8" }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: "#666" }}>Base Price</span>
                <span>₹{effectiveRate}</span>
              </div>
              {service.unit?.includes('day') && daysCount > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', marginLeft: '20px' }}>
                  <span style={{ color: "#999", fontSize: "12px" }}>× {daysCount} days</span>
                  <span style={{ fontSize: "12px" }}>₹{effectiveRate * daysCount}</span>
                </div>
              )}
              {service.isCountable && quantity > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginLeft: '20px' }}>
                  <span style={{ color: "#999", fontSize: "12px" }}>× {quantity} quantity</span>
                  <span style={{ fontSize: "12px" }}>₹{effectiveRate * daysCount * quantity}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a' }}>Total Amount</span>
              <span style={{ fontSize: '24px', fontWeight: '700', color: '#007bff' }}>₹{totalAmount}</span>
            </div>
          </div>
        )}

        {/* Inquiry Message */}
        {bookingType === 'Inquari Booking' && (
          <div style={{
            backgroundColor: "#e8f4f8",
            borderRadius: "12px",
            padding: "16px",
            textAlign: "center",
            marginBottom: "20px"
          }}>
            <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>📞</span>
            <p style={{ margin: 0, fontSize: "14px", color: "#007185" }}>
              Our team will contact you shortly to confirm pricing and availability
            </p>
          </div>
        )}
      </div>

      {/* Footer Buttons */}
      <div style={{
        padding: "16px 28px",
        borderTop: "1px solid #e8e8e8",
        display: "flex",
        justifyContent: "flex-end",
        gap: "12px",
        backgroundColor: "#fafafa",
        borderRadius: "0 0 16px 16px"
      }}>
        <button
          onClick={() => setShowBill(false)}
          style={{
            padding: "10px 24px",
            background: "white",
            color: "#666",
            border: "1px solid #d9d9d9",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#999";
            e.currentTarget.style.color = "#333";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#d9d9d9";
            e.currentTarget.style.color = "#666";
          }}
        >
          Back to Edit
        </button>
        
        <button
          onClick={handleBooking}
          style={{
            padding: "10px 28px",
            background: bookingType === 'Inquari Booking' ? "#ff9800" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
          }}
        >
          {bookingType === 'Inquari Booking' ? "Submit Inquiry" : "Confirm Booking"}
        </button>
      </div>
    </div>
  </div>
)}

{/* Add animations to your CSS file */}
<style>{`
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`}</style>
<Modal
  open={isCalendarOpen}
  onCancel={() => setIsCalendarOpen(false)}
  footer={null}
  width={800}
  title="Select Date(s)"
>
  <Calendar
    onChange={handleDateSelect}
    value={selectedDates.length > 1 ? null : (selectedDates[0] ? new Date(selectedDates[0]) : null)}
    selectRange={false}
    formatMonthYear={(locale, date) => moment(date).format('MMMM YYYY')}
    formatMonth={(locale, date) => moment(date).format('MMMM')}
    formatYear={(locale, date) => moment(date).format('YYYY')}
    nextLabel={<span style={{ fontSize: '20px', color: '#1890ff' }}>›</span>}
    next2Label={null}
    prevLabel={<span style={{ fontSize: '20px', color: '#1890ff' }}>‹</span>}
    prev2Label={null}
    navigationLabel={({ date, label, locale, view }) => (
      <div style={{
        fontSize: '16px',
        fontWeight: '600',
        color: '#1f2d3d',
        padding: '0 10px'
      }}>
        {moment(date).format('MMMM YYYY')}
      </div>
    )}
    tileClassName={({ date }) => {
      const dateStr = moment(date).format('YYYY-MM-DD');
      const unavailableDate = service?.unavailableDates?.find(d =>
        d.date === dateStr
      );

      if (unavailableDate?.fullDay) {
        return 'unavailable-date';
      }
      if (selectedDates.includes(dateStr)) {
        return 'selected-date';
      }
      return '';
    }}
    tileDisabled={({ date }) => {
      const dateStr = moment(date).format('YYYY-MM-DD');
      const unavailableDate = service?.unavailableDates?.find(d =>
        d.date === dateStr && d.fullDay
      );
      return unavailableDate?.fullDay || false;
    }}
  />

  <div style={{ marginTop: '20px', textAlign: 'center' }}>
    <button
      onClick={() => {
        setSelectedDates([]);
        setFromDate('');
        setToDate('');
        setSelectedSlots([]);
      }}
      style={{
        padding: '8px 16px',
        background: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Clear Selection
    </button>
  </div>
</Modal>

<style>{`
  /* Calendar Navigation Styling */
  .react-calendar__navigation {
    background: #f8f9fa;
    border-radius: 8px;
    margin-bottom: 15px;
  }
  
  .react-calendar__navigation button {
    color: #1890ff;
    font-weight: 500;
    font-size: 14px;
  }
  
  .react-calendar__navigation button:enabled:hover,
  .react-calendar__navigation button:enabled:focus {
    background-color: #e6f7ff;
    border-radius: 6px;
  }
  
  /* Month/Year Text Styling */
  .react-calendar__navigation__label {
    font-size: 16px !important;
    font-weight: 600 !important;
    color: #1f2d3d !important;
    text-transform: capitalize;
  }
  
  /* Weekday Headers */
  .react-calendar__month-view__weekdays {
    background: #f0f2f5;
    padding: 8px 0;
    border-radius: 6px;
    margin-bottom: 5px;
  }
  
  .react-calendar__month-view__weekdays abbr {
    text-decoration: none;
    font-weight: 600;
    color: #4a5568;
  }
  
  /* Date Tiles */
  .react-calendar__tile {
    padding: 12px 8px;
    border-radius: 6px;
    transition: all 0.2s ease;
  }
  
  .react-calendar__tile:enabled:hover {
    background-color: #e6f7ff;
    transform: scale(0.98);
  }
  
  /* Selected Date Styling */
  .selected-date {
    background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%) !important;
    color: white !important;
    font-weight: 600;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
  }
  
  .selected-date:hover {
    background: linear-gradient(135deg, #40a9ff 0%, #1890ff 100%) !important;
    transform: scale(0.98);
  }
  
  /* Unavailable Date Styling */
  .unavailable-date {
    background-color: #f5f5f5 !important;
    color: #d9d9d9 !important;
    text-decoration: line-through;
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  .unavailable-date:hover {
    background-color: #f5f5f5 !important;
    transform: none;
  }
  
  /* Today's Date Styling */
  .react-calendar__tile--now {
    background: #fff7e6;
    border: 1px solid #ffc53d;
    font-weight: 600;
  }
  
  .react-calendar__tile--now:enabled:hover,
  .react-calendar__tile--now:enabled:focus {
    background: #fff1b8;
  }
  
  /* Active Date Range */
  .react-calendar__tile--active {
    background: #1890ff;
    color: white;
  }
  
  /* Navigation Arrows */
  .react-calendar__navigation__arrow {
    font-size: 20px;
    font-weight: bold;
  }
`}</style>

    </div>
  );
}

export default Bookingscreen;