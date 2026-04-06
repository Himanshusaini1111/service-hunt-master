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
        baseTotal = unitRent * daysCount * quantity;
      } else if (unit.includes('hour')) {
        baseTotal = unitRent * (selectedSlots.length || 1) * quantity;
      } else {
        // Quantity-based units (per person, per item, etc.)
        baseTotal = unitRent * quantity;
      }
    }

    // Calculate countable optional inputs total
    const countableOptionalsTotal = (service.optionalInputs || []).reduce((acc, input, i) => {
      const inputPrice = effectiveOptionalUnitPrice(input, selectedServiceArea);

      if (input.isCountable) {
        const count = optionalInputCounts[i] || 0;

        // Calculate multiplier based on input's unit and main service unit
        let multiplier = quantity; // Default multiplier

        const inputUnit = input.unit || '';
        const mainUnit = service.unit || 'per day';

        // If input uses day-based unit and main service uses days
        if ((inputUnit.includes('day') || inputUnit === 'per-day') &&
          (mainUnit.includes('day') || mainUnit === 'per-day')) {
          multiplier = daysCount * quantity;
        }
        // If input uses hour-based unit and main service uses hours/slots
        else if ((inputUnit.includes('hour') || inputUnit === 'per-hour') &&
          (mainUnit.includes('hour') || mainUnit === 'per-hour')) {
          multiplier = (selectedSlots.length || 1) * quantity;
        }

        return acc + (count * inputPrice * multiplier);
      }
      return acc;
    }, 0);

    // Calculate non-countable optional inputs total - FIXED: using addedOptionalInputs
    const nonCountableOptionalsTotal = (service.optionalInputs || []).reduce((acc, input, i) => {
      if (!input.isCountable && addedOptionalInputs[i]) {
        const inputPrice = effectiveOptionalUnitPrice(input, selectedServiceArea);

        // Calculate multiplier for non-countable items too if they have day/hour dependencies
        let multiplier = 1;
        const inputUnit = input.unit || '';
        const mainUnit = service.unit || 'per day';

        if ((inputUnit.includes('day') || inputUnit === 'per-day') &&
          (mainUnit.includes('day') || mainUnit === 'per-day')) {
          multiplier = daysCount * quantity;
        } else if ((inputUnit.includes('hour') || inputUnit === 'per-hour') &&
          (mainUnit.includes('hour') || mainUnit === 'per-hour')) {
          multiplier = (selectedSlots.length || 1) * quantity;
        }

        return acc + (inputPrice * multiplier);
      }
      return acc;
    }, 0);

    // Calculate extra inputs total
    const extrasTotal = (service.extraInputs || []).reduce((acc, input, i) => {
      if (addedExtraInputs[i]) {
        const inputPrice = input.price || 0;

        // Calculate multiplier for extra inputs
        let multiplier = 1;
        const inputUnit = input.unit || '';
        const mainUnit = service.unit || 'per day';

        if ((inputUnit.includes('day') || inputUnit === 'per-day') &&
          (mainUnit.includes('day') || mainUnit === 'per-day')) {
          multiplier = daysCount * quantity;
        } else if ((inputUnit.includes('hour') || inputUnit === 'per-hour') &&
          (mainUnit.includes('hour') || mainUnit === 'per-hour')) {
          multiplier = (selectedSlots.length || 1) * quantity;
        }

        return acc + (inputPrice * multiplier);
      }
      return acc;
    }, 0);

    // Set final total including all components
    setTotalAmount(baseTotal + countableOptionalsTotal + nonCountableOptionalsTotal + extrasTotal);

  }, [quantity, daysCount, selectedSlots, optionalInputCounts, addedOptionalInputs, addedExtraInputs, service, bookingType, selectedServiceArea]);
  // Handle optional input quantity change


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
        <div className="booking-controls">
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
              width: "300px",
              marginBottom: "10px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span>📅</span>
              <div>
                <small style={{ fontSize: "0.8em", color: "#666" }}>Select Dates</small>
                <div style={{ fontSize: "1em", color: "#333", fontWeight: "bold" }}>
                  {selectedDates.length === 0
                    ? "No dates selected"
                    : selectedDates.length === 1
                      ? selectedDates[0]
                      : `${selectedDates.length} dates selected`
                  }
                </div>
              </div>
            </div>
            <span>▾</span>
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
            flexWrap: "nowrap",   // ❌ remove wrap
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
          <div style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "20px",
            marginTop: "30px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <h3>Description</h3>
            <p style={{ lineHeight: "1.6", color: "#555", marginTop: "10px" }}>
              {service.description}
            </p>
          </div>

          {/* Facilities Section */}
          <div style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "20px",
            marginTop: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <h3>Facilities</h3>
            <div style={{ marginTop: "10px" }}>
              {Array.isArray(service.facility) ? (
                service.facility.map((item, index) => (
                  <div key={index} style={{
                    padding: "8px 0",
                    borderBottom: "1px solid #eee"
                  }}>
                    • {item}
                  </div>
                ))
              ) : (
                <p style={{ lineHeight: "1.6", color: "#555" }}>
                  {service.facility}
                </p>
              )}
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
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            borderRadius: "8px",
            padding: "30px",
            width: "90%",
            maxWidth: "600px",
            maxHeight: "80vh",
            overflowY: "auto"
          }}>
            <h2 style={{ marginBottom: "20px" }}>Booking Details</h2>

            <form onSubmit={handleBooking}>
              {/* Personal Information */}
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ marginBottom: "10px" }}>Personal Information</h4>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px" }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "5px"
                    }}
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px" }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "5px"
                    }}
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px" }}>
                    Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows="3"
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "5px",
                      resize: "vertical"
                    }}
                  />
                </div>
              </div>

              {/* Location Information */}
              <div style={{ marginBottom: "20px" }}>

                {locationType === 'Simple' && (
                  <div style={{ marginBottom: "15px" }}>
                    <h4 style={{ marginBottom: "10px" }}>Location Details</h4>

                    <label style={{ display: "block", marginBottom: "5px" }}>
                      Service Address *
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required={locationType === 'Simple'}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #ddd",
                        borderRadius: "5px"
                      }}
                    />
                  </div>
                )}

                {locationType === 'Rental' && (
                  <>
                    <div style={{ marginBottom: "15px" }}>
                      <h4 style={{ marginBottom: "10px" }}>Location Details</h4>

                      <label style={{ display: "block", marginBottom: "5px" }}>
                        Pickup Address *
                      </label>
                      <input
                        type="text"
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        required
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ddd",
                          borderRadius: "5px"
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: "15px" }}>
                      <label style={{ display: "block", marginBottom: "5px" }}>
                        Drop-off Address *
                      </label>
                      <input
                        type="text"
                        value={dropAddress}
                        onChange={(e) => setDropAddress(e.target.value)}
                        required
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ddd",
                          borderRadius: "5px"
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: "15px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          type="checkbox"
                          checked={returnTrip}
                          onChange={(e) => setReturnTrip(e.target.checked)}
                        />
                        Return Trip Required
                      </label>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "20px"
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(false);
                    setShowBill(false);
                  }}
                  style={{
                    padding: "10px 20px",
                    background: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    padding: "10px 20px",
                    background: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer"
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
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1001
        }}>
          <div style={{
            background: "white",
            borderRadius: "8px",
            padding: "30px",
            width: "90%",
            maxWidth: "500px"
          }}>
            <h3 style={{ marginBottom: "20px" }}>Booking Summary</h3>

            <div style={{ marginBottom: "20px" }}>
              <p><strong>Service:</strong> {service.name}</p>

              {/* Show booking type indicator for Inquari Booking */}
              {bookingType === 'Inquari Booking' && (
                <div style={{
                  backgroundColor: "#fff3cd",
                  color: "#856404",
                  padding: "10px",
                  borderRadius: "5px",
                  marginBottom: "15px",
                  border: "1px solid #ffeeba"
                }}>
                  <strong>📋 Inquiry Required</strong>
                  <p style={{ marginTop: "5px", fontSize: "0.9em" }}>
                    This is an inquiry-based booking. The final price will be discussed and confirmed after your inquiry.
                  </p>
                </div>
              )}

              {quantity > 1 && bookingType !== 'Inquari Booking' && (
                <p><strong>Quantity:</strong> {quantity}</p>
              )}
              <p><strong>Unit:</strong> {displayUnit}</p>
             {selectedServiceArea && (
  <p><strong>Area:</strong> {selectedServiceArea.locationName}</p>
)}
              {daysCount > 1 && bookingType !== 'Inquari Booking' && (
                <p><strong>Days:</strong> {daysCount}</p>
              )}

              {/* Show optional inputs if any - only show for non-inquiry bookings */}
              {/* In the bill summary modal, update the optional services display */}
              {/* Show optional inputs if any - only show for non-inquiry bookings */}
              {bookingType !== 'Inquari Booking' && (
                <div style={{ marginTop: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
                  <strong style={{ display: 'block', marginBottom: '8px' }}>Optional Services:</strong>

                  {/* Countable optional inputs */}
                  {(service.optionalInputs || []).map((input, index) => {
                    const count = optionalInputCounts[index] || 0;
                    if (count > 0) {
                      // Get display unit for this optional input
                      const getDisplayUnit = (input) => {
                        if (input.customUnit) return input.customUnit;
                        const unit = input.unit || 'per item';
                        if (unit.startsWith('per-')) {
                          return unit.replace('per-', '').replace(/-/g, ' ');
                        }
                        return unit;
                      };

                      const displayUnit = getDisplayUnit(input);
                      const optUnitRate = effectiveOptionalUnitPrice(input, selectedServiceArea);

                      // Calculate based on optional input's own unit logic
                      let itemTotal = 0;
                      let calculationBreakdown = '';

                      const inputUnit = input.unit || '';

                      // If the optional input is day-based, multiply by daysCount
                      if (inputUnit.includes('day') || inputUnit === 'per-day') {
                        itemTotal = count * optUnitRate * daysCount;
                        calculationBreakdown = `${count} × ₹${optUnitRate} × ${daysCount} days`;
                      }
                      // If the optional input is hour-based, multiply by selected slots
                      else if (inputUnit.includes('hour') || inputUnit === 'per-hour') {
                        const slotCount = selectedSlots.length || 1;
                        itemTotal = count * optUnitRate * slotCount;
                        calculationBreakdown = `${count} × ₹${optUnitRate} × ${slotCount} slots`;
                      }
                      // For other units, just multiply by count
                      else {
                        itemTotal = count * optUnitRate;
                        calculationBreakdown = `${count} × ₹${optUnitRate}`;
                      }

                      return (
                        <div key={`countable-${index}`} style={{
                          marginTop: '5px',
                          fontSize: '0.9em',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>
                            <strong>{input.name || `Option ${index + 1}`}:</strong> {calculationBreakdown}
                            {displayUnit && ` /${displayUnit}`}
                          </span>
                          <span style={{ fontWeight: 'bold', color: '#007bff' }}>₹{itemTotal}</span>
                        </div>
                      );
                    }
                    return null;
                  })}

                  {/* Non-countable optional inputs */}
                  {(service.optionalInputs || []).map((input, index) => {
                    if (!input.isCountable && addedOptionalInputs[index]) {
                      // Get display unit for this optional input
                      const getDisplayUnit = (input) => {
                        if (input.customUnit) return input.customUnit;
                        const unit = input.unit || 'per item';
                        if (unit.startsWith('per-')) {
                          return unit.replace('per-', '').replace(/-/g, ' ');
                        }
                        return unit;
                      };

                      const displayUnit = getDisplayUnit(input);
                      const optUnitRate = effectiveOptionalUnitPrice(input, selectedServiceArea);

                      // Calculate based on optional input's own unit logic
                      let itemTotal = 0;
                      let calculationBreakdown = '';

                      const inputUnit = input.unit || '';

                      // If the optional input is day-based, multiply by daysCount
                      if (inputUnit.includes('day') || inputUnit === 'per-day') {
                        itemTotal = optUnitRate * daysCount;
                        calculationBreakdown = `₹${optUnitRate} × ${daysCount} days`;
                      }
                      // If the optional input is hour-based, multiply by selected slots
                      else if (inputUnit.includes('hour') || inputUnit === 'per-hour') {
                        const slotCount = selectedSlots.length || 1;
                        itemTotal = optUnitRate * slotCount;
                        calculationBreakdown = `₹${optUnitRate} × ${slotCount} slots`;
                      }
                      // For other units, just use the price once
                      else {
                        itemTotal = optUnitRate;
                        calculationBreakdown = `₹${optUnitRate}`;
                      }

                      return (
                        <div key={`noncountable-${index}`} style={{
                          marginTop: '5px',
                          fontSize: '0.9em',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>
                            <strong>{input.name || `Option ${index + 1}`}:</strong> {calculationBreakdown}
                            {displayUnit && ` /${displayUnit}`}
                          </span>
                          <span style={{ fontWeight: 'bold', color: '#007bff' }}>₹{itemTotal}</span>
                        </div>
                      );
                    }
                    return null;
                  })}

                  {/* If no optional services selected */}
                  {(!(service.optionalInputs || []).some((input, index) =>
                    optionalInputCounts[index] > 0 ||
                    (!input.isCountable && addedOptionalInputs[index])
                  )) && (
                      <p style={{ color: '#999', fontStyle: 'italic', margin: '5px 0' }}>
                        No optional services selected
                      </p>
                    )}
                </div>
              )}


              {/* Show dates */}
              {selectedDates.length > 0 && (
                <p><strong>Dates:</strong> {selectedDates.join(', ')}</p>
              )}

              {/* Show time slots if applicable */}
              {selectedSlots.length > 0 && (
                <p><strong>Time Slots:</strong> {selectedSlots.map(s => s.slot).join(', ')}</p>
              )}

              {/* Base Price Breakdown - Only show for non-inquiry bookings */}
              {bookingType !== 'Inquari Booking' && (
                <div style={{
                  marginTop: '15px',
                  padding: '10px',
                  borderTop: '1px solid #ddd',
                  borderBottom: '1px solid #ddd'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>Base Price:</strong></span>
                    <span>
                      ₹{effectiveRate}
                      {service.unit?.includes('day') && daysCount > 1 && ` × ${daysCount}`}
                      {service.isCountable && quantity > 1 && ` × ${quantity}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Total Amount - Different display for inquiry vs regular */}
              {bookingType !== 'Inquari Booking' ? (
                <p style={{
                  fontSize: "1.3em",
                  fontWeight: "bold",
                  color: "#007bff",
                  marginTop: "15px",
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>Total Amount:</span>
                  <span>₹{totalAmount}</span>
                </p>
              ) : (
                <div style={{
                  fontSize: "1.2em",
                  fontWeight: "bold",
                  color: "#ff9800",
                  marginTop: "20px",
                  padding: "15px",
                  backgroundColor: "#fff3e0",
                  borderRadius: "5px",
                  textAlign: "center"
                }}>
                  <p style={{ margin: 0 }}>
                    <span style={{ display: 'block', fontSize: '0.9em', fontWeight: 'normal', marginBottom: '5px' }}>
                      Price will be confirmed after inquiry
                    </span>
                    <span style={{ fontSize: '1.1em' }}>
                      📞 Our team will contact you shortly
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px"
            }}>
              <button
                onClick={() => setShowBill(false)}
                style={{
                  padding: "10px 20px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer"
                }}
              >
                Back
              </button>

              <button
                onClick={handleBooking}
                style={{
                  padding: "10px 20px",
                  background: bookingType === 'Inquari Booking' ? "#ff9800" : "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer"
                }}
              >
                {bookingType === 'Inquari Booking' ? "Submit Inquiry" : "Confirm Booking"}
              </button>
            </div>
          </div>
        </div>
      )}


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
          selectRange={false} // Important: set to false for multiple individual selections
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

        {/* Add a clear selection button */}
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


    </div>
  );
}

export default Bookingscreen;