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

// Helper to extract only the first unit for display
const getFirstUnit = (unit, customUnit) => {
  let u = unit === "Other" ? (customUnit || "Other") : (unit || "per day");
  if (typeof u === 'string') {
    const parts = u.split(/\s*(?:and|\/|\+|&)\s*/i);
    return parts[0].trim();
  }
  return u;
};

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
  const [addedOptionalInputs, setAddedOptionalInputs] = useState({});
  const [addedExtraInputs, setAddedExtraInputs] = useState({});
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
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(0);
  const [availableUnits, setAvailableUnits] = useState([]);

  // Time slots
  const timeSlots = [
    "9:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00",
    "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00",
    "15:00 - 16:00", "16:00 - 17:00", "17:00 - 18:00",
    "18:00 - 19:00"
  ];

  // Utility functions
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
    const currentUnit = availableUnits[selectedUnitIndex] || availableUnits[0];
    const basePrice = Number(currentUnit?.price) || Number(service?.rentperday) || 0;
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

  const getLocationType = () => {
    if (service?.locations && Array.isArray(service.locations) && service.locations.length > 0) {
      const locationValue = service.locations[0];
      if (locationValue === "No" || locationValue === "no" || locationValue === "None") {
        return "No";
      }
      if (locationValue === "Rental" || locationValue === "rental" || locationValue === "Multiple") {
        return "Rental";
      }
      if (locationValue === "Simple" || locationValue === "simple" || locationValue === "Single") {
        return "Simple";
      }
      return locationValue;
    }
    if (service?.locationPricing && service.locationPricing.length > 0) {
      return "Rental";
    }
    return "Simple";
  };

  // Initialize AOS
  useEffect(() => {
    AOS.init();
    AOS.refresh();
  }, []);

  // Fetch service data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data } = await axios.post("/api/service/getservicebyid", { serviceid });
        setService(data);

        // Set available units from pricingUnits
        if (data.pricingUnits && data.pricingUnits.length > 0) {
          setAvailableUnits(data.pricingUnits);
          const defaultIndex = data.pricingUnits.findIndex(u => u.isDefault);
          setSelectedUnitIndex(defaultIndex >= 0 ? defaultIndex : 0);
        } else {
          setAvailableUnits([{
            unit: data.unit || 'per day',
            price: data.rentperday || 0,
            customUnit: data.customUnit || '',
            isDefault: true,
            isCountable: data.isCountable !== false,
            isMerged: !!data.isMerged,
            mergedUnit: data.mergedUnit || 'per day',
            maxQuantityPerDay: data.maxQuantityPerDay,
            maxUsersPerDay: data.maxUsersPerDay
          }]);
          setSelectedUnitIndex(0);
        }

        setBookingType(data.bookingType || "Automatic Booking");

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

  // Handle location selection
  useEffect(() => {
    if (!service) return;

    const areas = normalizeLocationPricing(service.locationPricing);
    console.log("Areas from service:", areas);

    if (areas.length === 0) {
      setSelectedServiceArea(null);
      return;
    }

    if (areas.length === 1) {
      setSelectedServiceArea(areas[0]);
      return;
    }

    const fromNav = locationRoute.state?.selectedServiceArea;
    if (fromNav) {
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

      if (locationName) {
        const found = areas.find((a) =>
          a.locationName === locationName ||
          a.locationName.toLowerCase().includes(locationName.toLowerCase()) ||
          locationName.toLowerCase().includes(a.locationName.toLowerCase())
        );
        if (found) {
          setSelectedServiceArea(found);
          return;
        }
      }
    }

    const savedLocation = localStorage.getItem("selectedLocation");
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
            setSelectedServiceArea(found);
            return;
          }
        }
      } catch (error) {
        console.error("Error parsing saved location:", error);
      }
    }

    setSelectedServiceArea(areas[0]);
  }, [service, locationRoute.state]);

  // Calculate days between dates
  useEffect(() => {
    const currentUnit = availableUnits[selectedUnitIndex] || availableUnits[0];
    const unitType = currentUnit?.unit || service?.unit || 'per day';
    const isMerged = currentUnit?.isMerged || service?.isMerged || false;
    const mergedUnit = currentUnit?.mergedUnit || service?.mergedUnit || 'per day';
    const effectiveTimeType = isMerged ? mergedUnit : unitType;

    if (effectiveTimeType.includes('hour') || (!isMerged && (unitType === 'per person' || unitType === 'per item' || unitType === 'Other'))) {
      setDaysCount(1);
    } else if (selectedDates.length > 1) {
      setDaysCount(selectedDates.length);
    } else if (fromDate && toDate) {
      const start = moment(fromDate);
      const end = moment(toDate);
      const diff = end.diff(start, 'days') + 1;
      setDaysCount(diff > 0 ? diff : 1);
    } else {
      setDaysCount(1);
    }
  }, [fromDate, toDate, selectedDates, service, availableUnits, selectedUnitIndex]);

  // Calculate total amount
  useEffect(() => {
    if (!service || !availableUnits.length) {
      setTotalAmount(0);
      return;
    }

    const currentUnit = availableUnits[selectedUnitIndex] || availableUnits[0];
    const unitRent = currentUnit.price || 0;
    const unitType = currentUnit.unit || 'per day';
    const mainUnit = unitType;
    const isCountable = currentUnit.isCountable !== false;
    const currentBookingType = bookingType || service.bookingType || 'Automatic Booking';

    const isMerged = currentUnit.isMerged || service.isMerged || false;
    const mergedUnit = currentUnit.mergedUnit || service.mergedUnit || 'per day';

    let baseTotal = 0;

    // For Inquari Booking, total is 0
    if (currentBookingType === 'Inquari Booking') {
      baseTotal = 0;
    } else if (isMerged) {
      // Merged pricing calculation: Rate × Quantity × Duration
      const qtyMultiplier = isCountable ? (quantity || 1) : 1;
      if (mergedUnit.includes('hour')) {
        const slotMultiplier = selectedSlots.length || 1;
        baseTotal = unitRent * qtyMultiplier * slotMultiplier;
      } else {
        const dayMultiplier = daysCount || 1;
        baseTotal = unitRent * qtyMultiplier * dayMultiplier;
      }
    } else {
      // Calculate base price based on unit type
      if (unitType.includes('day') || unitType.includes('week') || unitType.includes('month')) {
        baseTotal = unitRent * daysCount * (isCountable ? quantity : 1);
      } else if (unitType.includes('hour')) {
        baseTotal = unitRent * (selectedSlots.length || 1) * (isCountable ? quantity : 1);
      } else {
        baseTotal = unitRent * (isCountable ? quantity : 1);
      }
    }

    // Calculate countable optional inputs total
    const countableOptionalsTotal = (service.optionalInputs || []).reduce((acc, input, i) => {
      const inputPrice = effectiveOptionalUnitPrice(input, selectedServiceArea);
      if (input.isCountable) {
        const count = optionalInputCounts[i] || 0;
        let multiplier = 1;
        const inputUnit = input.unit || '';
        const mainUnit = unitType;
        const isOptMerged = input.isMerged || false;
        const optMergedUnit = input.mergedUnit || 'per day';

        if (isOptMerged) {
          if (optMergedUnit.includes('hour')) {
            multiplier = (selectedSlots.length || 1);
          } else {
            multiplier = daysCount;
          }
        } else if ((inputUnit.includes('day') || inputUnit === 'per-day') &&
            (mainUnit.includes('day') || mainUnit === 'per-day')) {
          multiplier = daysCount;
        } else if ((inputUnit.includes('hour') || inputUnit === 'per-hour') &&
                   (mainUnit.includes('hour') || mainUnit === 'per-hour')) {
          multiplier = (selectedSlots.length || 1);
        }
        return acc + (count * inputPrice * multiplier);
      }
      return acc;
    }, 0);

    // Calculate non-countable optional inputs total
    const nonCountableOptionalsTotal = (service.optionalInputs || []).reduce((acc, input, i) => {
      if (!input.isCountable && addedOptionalInputs[i]) {
        const inputPrice = effectiveOptionalUnitPrice(input, selectedServiceArea);
        let multiplier = 1;
        const inputUnit = input.unit || '';
        const isOptMerged = input.isMerged || false;
        const optMergedUnit = input.mergedUnit || 'per day';

        if (isOptMerged) {
          if (optMergedUnit.includes('hour')) {
            multiplier = (selectedSlots.length || 1);
          } else {
            multiplier = daysCount;
          }
        } else if ((inputUnit.includes('day') || inputUnit === 'per-day') &&
            (mainUnit.includes('day') || mainUnit === 'per-day')) {
          multiplier = daysCount;
        } else if ((inputUnit.includes('hour') || inputUnit === 'per-hour') &&
                   (mainUnit.includes('hour') || mainUnit === 'per-hour')) {
          multiplier = (selectedSlots.length || 1);
        }
        return acc + (inputPrice * multiplier);
      }
      return acc;
    }, 0);

    // Calculate extra inputs total
    const extrasTotal = (service.extraInputs || []).reduce((acc, input, i) => {
      if (addedExtraInputs[i]) {
        const inputPrice = input.price || 0;
        let multiplier = 1;
        const inputUnit = input.unit || '';
        const mainUnit = unitType;

        if ((inputUnit.includes('day') || inputUnit === 'per-day') &&
            (mainUnit.includes('day') || mainUnit === 'per-day')) {
          multiplier = daysCount;
        } else if ((inputUnit.includes('hour') || inputUnit === 'per-hour') &&
                   (mainUnit.includes('hour') || mainUnit === 'per-hour')) {
          multiplier = (selectedSlots.length || 1);
        }
        return acc + (inputPrice * multiplier);
      }
      return acc;
    }, 0);

    setTotalAmount(baseTotal + countableOptionalsTotal + nonCountableOptionalsTotal + extrasTotal);

  }, [quantity, daysCount, selectedSlots, optionalInputCounts, addedOptionalInputs, addedExtraInputs, service, bookingType, selectedServiceArea, availableUnits, selectedUnitIndex]);

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

const handleBooking = async (e) => {
  e.preventDefault();

  const user = JSON.parse(localStorage.getItem('currentUser'));
  if (!user || !user._id) {
    Swal.fire('Error', 'You must be logged in to book a service.', 'error');
    return;
  }

  if (!showBill) {
    if (!name || !phone || !description) {
      Swal.fire('Error', 'Please fill all required fields', 'error');
      return;
    }

    if (bookingType !== 'Inquari Booking') {
      const locationType = getLocationType();
      const currentUnit = availableUnits[selectedUnitIndex] || availableUnits[0];
      const unitType = currentUnit?.unit || service?.unit || 'per day';
      const isMerged = currentUnit?.isMerged || service?.isMerged || false;
      const mergedUnit = currentUnit?.mergedUnit || service?.mergedUnit || 'per day';
      const effectiveTimeType = isMerged ? mergedUnit : unitType;

      if ((effectiveTimeType.includes('day') || effectiveTimeType.includes('week') || effectiveTimeType.includes('month')) && selectedDates.length === 0) {
        Swal.fire('Error', 'Please select at least one date', 'error');
        return;
      }
      if (effectiveTimeType.includes('hour') && selectedSlots.length === 0) {
        Swal.fire('Error', 'Please select at least one time slot', 'error');
        return;
      }
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

    setShowBill(true);
    return;
  }

  try {
    setLoading(true);

    const bookingDates = selectedDates.length > 0 ? selectedDates : (fromDate ? [fromDate] : []);
    const formattedSlots = selectedSlots.map(slot => {
      if (typeof slot === 'object' && slot.date && slot.slot) {
        return { date: slot.date, slot: slot.slot };
      } else if (typeof slot === 'string') {
        return { date: selectedDates[0] || fromDate, slot: slot };
      }
      return slot;
    });

    const currentUnit = availableUnits[selectedUnitIndex] || availableUnits[0];
    const effectiveRentSnapshot = effectiveBaseRent(service, selectedServiceArea);

    const bookingDetails = {
      serviceid,
      totalAmount: bookingType === 'Inquari Booking' ? 0 : totalAmount,
      userid: user._id,
      name,
      phone,
      description,
      service: service.name,
      locationType: getLocationType(),
      unit: getFirstUnit(currentUnit.unit, currentUnit.customUnit) || getFirstUnit(service.unit, service.customUnit),
      customUnit: currentUnit.customUnit || service.customUnit || '',
      isCountable: currentUnit.isCountable !== false,
      isMerged: currentUnit.isMerged || service.isMerged || false,
      mergedUnit: currentUnit.mergedUnit || service.mergedUnit || 'per day',
      rentperday: effectiveRentSnapshot,
      selectedUnitIndex: selectedUnitIndex,
      selectedUnit: currentUnit,
      selectedServiceArea: selectedServiceArea ? {
        locationName: selectedServiceArea.locationName,
        locationAddress: selectedServiceArea.locationAddress,
        extraPrice: Number(selectedServiceArea.extraPrice) || 0,
      } : undefined,
      quantity: quantity,
      fromDate: bookingDates[0] || '',
      toDate: bookingDates[bookingDates.length - 1] || '',
      daysCount,
      selectedDates: bookingDates,
      slots: formattedSlots,
      bookingType: service.bookingType || 'Automatic Booking',
      optionalInputs: (service.optionalInputs || [])
        .map((input, index) => {
          const isCountable = input.isCountable !== false;
          const count = isCountable ? (optionalInputCounts[index] || 0) : (addedOptionalInputs[index] ? 1 : 0);
          return {
            name: input.name,
            price: effectiveOptionalUnitPrice(input, selectedServiceArea),
            count,
            unit: getFirstUnit(input.unit, input.customUnit),
            customUnit: input.customUnit,
            isMerged: !!input.isMerged,
            mergedUnit: input.mergedUnit || 'per day',
            isCountable
          };
        })
        .filter(input => (input.count || 0) > 0),
      extraInputs: (service.extraInputs || [])
        .filter((_, index) => addedExtraInputs[index])
        .map(input => ({
          name: input.name,
          price: input.price,
          unit: input.unit,
          customUnit: input.customUnit
        })),
      ...(getLocationType() === 'Simple' && { address }),
      ...(getLocationType() === 'Rental' && {
        pickupAddress,
        dropAddress,
        returnTrip
      }),
      createdAt: new Date().toISOString(),
      status: bookingType === 'Inquari Booking' ? 'inquiry' : 'pending'
    };

    const response = await axios.post('/api/bookings/bookservice', bookingDetails);

    if (response.status === 201) {
      Swal.fire({
        title: bookingType === 'Inquari Booking' ? 'Inquiry Submitted!' : 'Success!',
        text: bookingType === 'Inquari Booking'
          ? 'Your inquiry has been submitted. Our team will contact you shortly.'
          : 'Your service has been booked!',
        icon: 'success',
      }).then(() => {
        // ✅ FIX: Navigate back to the booking screen with the service ID
        navigate(`/book/${serviceid}`);
      });
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
  const handleDateSelect = (date) => {
    const dateStr = moment(date).format('YYYY-MM-DD');

    const unavailableDate = service?.unavailableDates?.find(d => d.date === dateStr);
    if (unavailableDate?.fullDay) {
      Swal.fire('Not Available', 'This date is fully booked', 'warning');
      return;
    }

    const currentUnit = availableUnits[selectedUnitIndex] || availableUnits[0];
    const unit = currentUnit?.unit || service?.unit || 'per day';
    const isMerged = currentUnit?.isMerged || service?.isMerged || false;
    const mergedUnit = currentUnit?.mergedUnit || service?.mergedUnit || 'per day';
    const effectiveTimeType = isMerged ? mergedUnit : unit;

    if (effectiveTimeType.includes('hour') || (!isMerged && (unit === 'per person' || unit === 'per item' || unit === 'Other'))) {
      setSelectedDates([dateStr]);
      setFromDate(dateStr);
      setToDate(dateStr);
    } else {
      setSelectedDates(prev => {
        if (prev.includes(dateStr)) {
          const newDates = prev.filter(d => d !== dateStr);
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
        const newDates = [...prev, dateStr].sort();
        setFromDate(newDates[0]);
        setToDate(newDates[newDates.length - 1]);
        return newDates;
      });
    }

    if (unit.includes('hour')) {
      setSelectedSlots([]);
    }
  };

  const handleSlotSelect = (date, slot) => {
    const formattedDate = moment(date).format('YYYY-MM-DD');
    setSelectedSlots(prev => {
      const exists = prev.some(s => s.date === formattedDate && s.slot === slot);
      if (exists) {
        return prev.filter(s => !(s.date === formattedDate && s.slot === slot));
      } else {
        return [...prev, { date: formattedDate, slot }];
      }
    });
  };

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

  const renderUnitBasedControls = () => {
    if (!service) return null;

    const currentUnit = availableUnits[selectedUnitIndex] || availableUnits[0];
    const unit = currentUnit?.unit || service.unit || 'per day';
    const isMerged = currentUnit?.isMerged || service?.isMerged || false;
    const mergedUnit = currentUnit?.mergedUnit || service?.mergedUnit || 'per day';
    const effectiveTimeType = isMerged ? mergedUnit : unit;

    if (effectiveTimeType.includes('day') || effectiveTimeType.includes('week') || effectiveTimeType.includes('month')) {
      return (
        <div className="booking-controls" style={{ overflow: "visible", width: "100%" }}>
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
              width: "100%",
              maxWidth: "300px",
              minWidth: "200px",
              marginBottom: "10px",
              boxSizing: "border-box"
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
    } else if (unit.includes('hour')) {
      return (
        <div className="booking-controls">
          <legend className="section-title">Select Date & Time</legend>
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
    } else {
      return (
        <div className="booking-controls">
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
    width: "100%", // Takes full width of parent
    maxWidth: "250px", // But no more than 250px
    minWidth: "150px", // And no less than 150px
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

  if (loading) return <Loader />;
  if (error) return <Error />;
  if (!service) return <div>Service not found</div>;

  const currentUnit = availableUnits[selectedUnitIndex] || availableUnits[0];
  const isMerged = currentUnit?.isMerged || service?.isMerged || false;
  const mergedUnit = currentUnit?.mergedUnit || service?.mergedUnit || 'per day';
  const displayUnit = getFirstUnit(currentUnit?.unit, currentUnit?.customUnit) || getFirstUnit(service.unit, service.customUnit) || 'per day';
  const effectiveRate = effectiveBaseRent(service, selectedServiceArea);

  return (
    <div className="bookingscreen-page">
      <Navbar />

      <div className="bookingscreen-container">
        {/* Breadcrumb Navigation */}
        <div className="bs-breadcrumb">
          <span style={{ cursor: "pointer" }} onClick={() => navigate("/home")}>Home</span>
          <span className="bs-breadcrumb-separator">/</span>
          <span>Services</span>
          <span className="bs-breadcrumb-separator">/</span>
          <span className="bs-breadcrumb-current">{service.name}</span>
        </div>

        <div className="bs-layout-grid">
          {/* Main Column */}
          <div className="bs-main-column">
            {/* Carousel Card */}
            <div className="bs-carousel-card">
              <div className="bs-carousel-wrapper">
                <img
                  src={service.imageurls[currentIndex]}
                  className="bs-carousel-image"
                  alt={`Service ${currentIndex + 1}`}
                  loading="lazy"
                />

                {service.imageurls && service.imageurls.length > 1 && (
                  <>
                    <button className="bs-carousel-btn bs-carousel-prev" onClick={handlePrevious} aria-label="Previous image">‹</button>
                    <button className="bs-carousel-btn bs-carousel-next" onClick={handleNext} aria-label="Next image">›</button>
                    <div className="bs-carousel-counter">{currentIndex + 1} / {service.imageurls.length}</div>
                    <div className="bs-carousel-dots">
                      {service.imageurls.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentIndex(idx)}
                          className={`bs-carousel-dot ${idx === currentIndex ? "active" : ""}`}
                          aria-label={`Go to image ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Service Header Info */}
            <div className="bs-card bs-header-card">
              <div className="bs-header-info">
                <div className="bs-tags-row">
                  <span className="bs-pill bs-pill-category">{service.category || "Service"}</span>
                  <span className="bs-pill bs-pill-verified">✓ Verified Specialist</span>
                  {selectedServiceArea && (
                    <span className="bs-pill bs-pill-location">📍 {selectedServiceArea.locationName}</span>
                  )}
                </div>
                <h1 className="bs-service-title">{service.name}</h1>
                <p className="bs-company-subtitle">
                  Provided by <b>{service.companyname || "Independent Specialist"}</b>
                </p>
              </div>
            </div>

            {/* Description Section */}
            <div className="bs-card bs-about-card">
              <div className="bs-section-title-wrap">
                <span className="bs-section-icon">📋</span>
                <h3 className="bs-section-heading">About This Service</h3>
              </div>
              <div className="bs-description-content">
                {typeof service.description === 'string' ? (
                  service.description.split('\n').map((point, idx) => {
                    const trimmedPoint = point.trim();
                    if (!trimmedPoint) return null;
                    const hasBullet = trimmedPoint.startsWith('→') || trimmedPoint.startsWith('•') || trimmedPoint.startsWith('-');
                    return (
                      <div key={idx} className="bs-desc-point">
                        <span className="bs-desc-bullet">{hasBullet ? "▹" : "•"}</span>
                        <span>{hasBullet ? trimmedPoint.slice(1).trim() : trimmedPoint}</span>
                      </div>
                    );
                  })
                ) : (
                  <p>{service.description}</p>
                )}
              </div>
            </div>

            {/* Facilities Section */}
            <div className="bs-card">
              <div className="bs-section-title-wrap">
                <span className="bs-section-icon">✨</span>
                <h3 className="bs-section-heading">What We Offer</h3>
              </div>
              <div className="bs-facilities-grid">
                {(() => {
                  let facilityArray = service.facility;
                  if (typeof service.facility === 'string') {
                    facilityArray = service.facility
                      .split('\n')
                      .filter(line => line.trim() !== '')
                      .map(line => line.replace(/^[→•-]\s*/, '').trim());
                  }
                  if (Array.isArray(facilityArray)) {
                    return facilityArray.map((item, index) => (
                      <div key={index} className="bs-facility-item">
                        <span className="bs-facility-check">✓</span>
                        <span>{item}</span>
                      </div>
                    ));
                  }
                  return (
                    <div className="bs-facility-item">
                      <span className="bs-facility-check">✓</span>
                      <span>{service.facility}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Optional Inputs Section */}
            {service.optionalInputs && service.optionalInputs.length > 0 && (
              <div className="bs-card">
                <div className="bs-section-title-wrap">
                  <span className="bs-section-icon">➕</span>
                  <h3 className="bs-section-heading">Optional Add-on Services</h3>
                </div>
                <div className="bs-addons-grid">
                  {service.optionalInputs.map((input, index) => {
                    const getOptionalDisplayUnit = (input) => {
                      if (input.customUnit) return input.customUnit;
                      const unit = input.unit || 'per item';
                      if (unit.startsWith('per-')) return unit.replace('per-', '').replace(/-/g, ' ');
                      return unit;
                    };
                    const inputName = input.name || `Option ${index + 1}`;
                    const inputPrice = effectiveOptionalUnitPrice(input, selectedServiceArea);
                    const optUnit = getOptionalDisplayUnit(input);
                    const inputImage = input.image || '';
                    const inputMaxCount = input.maxcount || 5;
                    const inputIsCountable = input.isCountable !== false;

                    return (
                      <div key={index} className="bs-addon-card">
                        {inputImage && (
                          <img
                            src={inputImage}
                            alt={inputName}
                            className="bs-addon-img"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <h5 className="bs-addon-name">{inputName}</h5>
                        <p className="bs-addon-price">
                          ₹{inputPrice} {optUnit && <span className="bs-addon-unit">/ {optUnit}</span>}
                        </p>
                        {inputIsCountable ? (
                          <div className="bs-addon-stepper">
                            <button
                              className="bs-addon-step-btn"
                              onClick={() => handleChange(index, false)}
                              disabled={!optionalInputCounts[index]}
                            >
                              -
                            </button>
                            <span className="bs-addon-count">{optionalInputCounts[index] || 0}</span>
                            <button
                              className="bs-addon-step-btn"
                              onClick={() => handleChange(index, true)}
                              disabled={optionalInputCounts[index] >= inputMaxCount}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            className={`bs-addon-toggle-btn ${addedOptionalInputs[index] ? 'btn-remove' : 'btn-add'}`}
                            onClick={() =>
                              addedOptionalInputs[index]
                                ? handleRemoveOptionalInput(index)
                                : handleAddOptionalInput(index)
                            }
                          >
                            {addedOptionalInputs[index] ? "Remove" : "+ Add"}
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
              <div className="bs-card">
                <div className="bs-section-title-wrap">
                  <span className="bs-section-icon">⚙️</span>
                  <h3 className="bs-section-heading">Additional Options</h3>
                </div>
                <div className="bs-addons-grid">
                  {service.extraInputs.map((input, index) => (
                    <div key={index} className="bs-addon-card">
                      {input.image && <img src={input.image} alt={input.name} className="bs-addon-img" />}
                      <h5 className="bs-addon-name">{input.name}</h5>
                      <p className="bs-addon-price">
                        ₹{input.price} <span className="bs-addon-unit">{input.unit === 'Other' ? input.customUnit : `/${input.unit}`}</span>
                      </p>
                      <button
                        className={`bs-addon-toggle-btn ${addedExtraInputs[index] ? 'btn-remove' : 'btn-add'}`}
                        onClick={() =>
                          addedExtraInputs[index]
                            ? handleRemoveExtraInput(index)
                            : handleAddExtraInput(index)
                        }
                      >
                        {addedExtraInputs[index] ? "Remove" : "+ Add"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="bs-card">
              <div className="bs-section-title-wrap">
                <span className="bs-section-icon">⭐</span>
                <h3 className="bs-section-heading">Customer Reviews</h3>
              </div>
              <ReviewSystem serviceId={serviceid} />
            </div>

            {/* Comments Section */}
            <div className="bs-card">
              <div className="bs-section-title-wrap">
                <span className="bs-section-icon">💬</span>
                <h3 className="bs-section-heading">Discussion & Questions</h3>
              </div>
              <CommentsSection serviceId={serviceid} />
            </div>
          </div>

          {/* Right Sticky Sidebar Column: Booking & Checkout Card */}
          <div className="bs-sidebar-column">
            <div className="bs-checkout-card">
              <div className="bs-checkout-header">
                <span className="bs-checkout-badge">Instant Booking</span>
                <span className="bs-avail-indicator">
                  <span className="bs-avail-dot"></span>
                  Available
                </span>
              </div>

              {/* Unit Controls (Date picker / slots) */}
              <div>
                {renderUnitBasedControls()}
              </div>

              {/* Pricing Plan Selector */}
              {availableUnits.length > 1 && (
                <div className="bs-plan-select-wrap">
                  <label className="bs-plan-label">
                    <span>🏷️</span> Pricing Plan
                  </label>
                  <select
                    className="bs-select"
                    value={selectedUnitIndex}
                    onChange={(e) => setSelectedUnitIndex(parseInt(e.target.value))}
                  >
                    {availableUnits.map((unit, index) => (
                      <option key={index} value={index}>
                        {getFirstUnit(unit.unit, unit.customUnit)} — ₹{unit.price} {unit.isDefault ? "✦" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Price Box */}
              {bookingType !== 'Inquari Booking' ? (
                <div className="bs-price-box">
                  <span className="bs-price-label">Base Rate</span>
                  <div>
                    <span className="bs-price-val">₹{effectiveRate}</span>
                    {displayUnit && <span className="bs-price-unit">/ {displayUnit}</span>}
                  </div>
                </div>
              ) : (
                <div className="bs-price-box">
                  <span className="bs-price-label">Pricing Model</span>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#64748b" }}>On Inquiry</span>
                </div>
              )}

              {/* Quantity Control */}
              {bookingType !== 'Inquari Booking' && currentUnit?.isCountable !== false && (
                <div className="bs-qty-wrap">
                  <span className="bs-qty-label">Quantity</span>
                  <div className="bs-qty-control">
                    <button className="bs-qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>-</button>
                    <span className="bs-qty-val">{quantity}</span>
                    <button className="bs-qty-btn" onClick={() => setQuantity(quantity + 1)}>+</button>
                  </div>
                </div>
              )}

              {/* Total Amount */}
              {bookingType !== 'Inquari Booking' ? (
                <div className="bs-total-box">
                  <span className="bs-total-label">Total Amount</span>
                  <span className="bs-total-val">₹{totalAmount}</span>
                </div>
              ) : (
                <div className="bs-total-box" style={{ background: "#475569" }}>
                  <span className="bs-total-label">Inquiry Request</span>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff" }}>Free Quote</span>
                </div>
              )}

              {/* Primary Action Buttons */}
              <div className="bs-cta-group">
                <button className="bs-btn-book" onClick={() => setShowBookingModal(true)}>
                  {bookingType === 'Inquari Booking' ? "Send Inquiry" : "Book Service Now"}
                </button>
                <button className="bs-btn-icon-action btn-whatsapp" onClick={handleWhatsApp} title="Chat on WhatsApp">
                  <FontAwesomeIcon icon={faWhatsapp} />
                </button>
                <button className="bs-btn-icon-action btn-phone" onClick={handleContact} title="Call Provider">
                  <FontAwesomeIcon icon={faPhone} />
                </button>
              </div>

              {/* Trust Badges */}
              <div className="bs-trust-strip">
                <div className="bs-trust-item"><span className="bs-trust-icon">✓</span> Secure Booking</div>
                <div className="bs-trust-item"><span className="bs-trust-icon">✓</span> Best Price Guarantee</div>
                <div className="bs-trust-item"><span className="bs-trust-icon">✓</span> Instant Confirmation</div>
                <div className="bs-trust-item"><span className="bs-trust-icon">✓</span> 24/7 Support</div>
              </div>
            </div>
          </div>
        </div>
      </div>

     
{/* ================= BOOKING MODAL ================= */}
{showBookingModal && (
  <div
    className="bm-overlay"
    onClick={() => {
      setShowBookingModal(false);
      setShowBill(false);
    }}
  >
    <div
      className="bm-dialog"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ================= MODAL HEADER ================= */}
      <div className="bm-header">
        <div className="bm-header-left">
          <div className="bm-header-icon">📝</div>

          <div>
            <h2 className="bm-header-title">
              {showBill ? "Confirm Your Booking" : "Booking Details"}
            </h2>

            <p className="bm-header-subtitle">
              {showBill
                ? "Please review and confirm your booking"
                : "Please fill in your details to continue"}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="bm-close-btn"
          onClick={() => {
            setShowBookingModal(false);
            setShowBill(false);
          }}
          aria-label="Close modal"
        >
          ✕
        </button>
      </div>

      {/* ================= BOOKING FORM ================= */}
      <form onSubmit={handleBooking}>

        {/* ================= MODAL BODY ================= */}
        <div className="bm-body">

          {/* ---------- CONTACT INFORMATION ---------- */}
          <section className="bm-section">

            <div className="bm-section-title">
              <span className="section-icon">👤</span>
              <span>Contact Information</span>
            </div>

            {/* Full Name */}
            <div className="bm-field-group">
              <label className="bm-field-label">
                Full Name <span className="req">*</span>
              </label>

              <div className="bm-input-wrapper">
  <span className="bm-input-icon">👤</span>
  <input
    type="textform"
    className="bm-input"
    value={name}
    onChange={(e) => setName(e.target.value)}
    required
    placeholder="Enter your full name"
  />
</div></div>

            {/* Phone Number */}
            <div className="bm-field-group">
              <label className="bm-field-label">
                Phone Number <span className="req">*</span>
              </label>

              <div className="bm-input-wrapper">
                <span className="bm-input-icon">📞</span>

                <input
                  type="tel"
                  className="bm-input"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\s/g, ""))
                  }
                  required
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            {/* Description */}
            <div className="bm-field-group">
              <label className="bm-field-label">
                Description / Special Requests
                <span className="req">*</span>
              </label>

              <textarea
                className="bm-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
                placeholder="Any special requests or additional information..."
              />
            </div>

          </section>

          {/* ---------- LOCATION DETAILS ---------- */}
          {getLocationType() !== "No" && (
            <section className="bm-section">

              <div className="bm-section-title">
                <span className="section-icon">📍</span>
                <span>Location Details</span>
              </div>

              {/* Simple Location */}
              {getLocationType() === "Simple" && (
                <div className="bm-field-group">
                  <label className="bm-field-label">
                    Service Address <span className="req">*</span>
                  </label>

                  <div className="bm-input-wrapper">
                    <span className="bm-input-icon">🏠</span>

                    <input
                      type="text form"
                      className="bm-input"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      placeholder="Enter your service address"
                    />
                  </div>

                  <p className="bm-field-hint">
                    We will dispatch service professionals to this address.
                  </p>
                </div>
              )}

              {/* Rental Location */}
              {getLocationType() === "Rental" && (
                <>
                  {/* Pickup Address */}
                  <div className="bm-field-group">
                    <label className="bm-field-label">
                      Pickup Address <span className="req">*</span>
                    </label>

                    <div className="bm-input-wrapper">
                      <span className="bm-input-icon">🚗</span>

                      <input
                        type="text"
                        className="bm-input"
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        required
                        placeholder="Enter pickup location"
                      />
                    </div>
                  </div>

                  {/* Drop-off Address */}
                  <div className="bm-field-group">
                    <label className="bm-field-label">
                      Drop-off Address <span className="req">*</span>
                    </label>

                    <div className="bm-input-wrapper">
                      <span className="bm-input-icon">🏁</span>

                      <input
                        type="text"
                        className="bm-input"
                        value={dropAddress}
                        onChange={(e) => setDropAddress(e.target.value)}
                        required
                        placeholder="Enter drop-off location"
                      />
                    </div>
                  </div>

                  {/* Return Trip */}
                  <label className="bm-checkbox-card">
                    <input
                      type="checkbox"
                      className="bm-checkbox"
                      checked={returnTrip}
                      onChange={(e) => setReturnTrip(e.target.checked)}
                    />

                    <div>
                      <div className="bm-checkbox-title">
                        🔄 Return Trip Required
                      </div>

                      <p className="bm-checkbox-desc">
                        Additional charges may apply for return trip.
                      </p>
                    </div>
                  </label>
                </>
              )}

            </section>
          )}

          {/* ---------- BOOKING SUMMARY ---------- */}
          {!showBill && (
            <section className="bm-preview-box">

              <div className="bm-preview-header">
                <span>📋</span>
                <span>Booking Summary Preview</span>
              </div>

              <div className="bm-preview-grid">

                <div className="bm-preview-item">
                  <span className="lbl">Service:</span>
                  <span className="val">{service?.name}</span>
                </div>

                <div className="bm-preview-item">
                  <span className="lbl">Price:</span>
                  <span className="val">
                    ₹{effectiveRate} / {displayUnit}
                  </span>
                </div>

                {quantity > 1 && (
                  <div className="bm-preview-item">
                    <span className="lbl">Quantity:</span>
                    <span className="val">× {quantity}</span>
                  </div>
                )}

                {daysCount > 1 && (
                  <div className="bm-preview-item">
                    <span className="lbl">Duration:</span>
                    <span className="val">{daysCount} days</span>
                  </div>
                )}

              </div>
            </section>
          )}

        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="bm-footer">

          <button
            type="button"
            className="bm-btn-cancel"
            onClick={() => {
              setShowBookingModal(false);
              setShowBill(false);
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="bm-btn-submit"
          >
            {showBill ? "Confirm Booking" : "Generate Bill →"}
          </button>

        </div>

      </form>
    </div>
  </div>
)}


      {/* Bill Summary Modal */}
      {showBill && (
        <div className="bill-overlay" onClick={() => setShowBill(false)}>
          <div className="bill-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bill-header">
              <div className="bill-header-left">
                <div className="bill-header-icon">📋</div>
                <div>
                  <h3 className="bill-header-title">
                    {bookingType === 'Inquari Booking' ? 'Inquiry Summary' : 'Booking Summary'}
                  </h3>
                  <p className="bill-header-subtitle">
                    {bookingType === 'Inquari Booking' 
                      ? 'Please review your inquiry details' 
                      : 'Please review your booking details before confirming'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="bill-close-btn"
                onClick={() => setShowBill(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="bill-body">
              {/* Service Overview Card */}
              <div className="bill-service-card">
                <div className="bill-service-top">
                  <div>
                    <div className="bill-service-label">Service</div>
                    <h4 className="bill-service-name">{service.name}</h4>
                  </div>
                  {service.companyname && (
                    <span className="bill-company-chip">
                      🏢 {service.companyname}
                    </span>
                  )}
                </div>

                {selectedServiceArea && (
                  <div className="bill-location-tag">
                    <span>📍</span>
                    <span>Serving: <strong>{selectedServiceArea.locationName}</strong></span>
                  </div>
                )}
              </div>

              {/* Inquiry Alert Callout */}
              {bookingType === 'Inquari Booking' && (
                <div className="bill-inquiry-alert">
                  <span className="bill-inquiry-icon">📌</span>
                  <div>
                    <h5 className="bill-inquiry-title">Inquiry Required</h5>
                    <p className="bill-inquiry-desc">
                      This is an inquiry-based booking. Our team will contact you within 24 hours to confirm pricing and availability.
                    </p>
                  </div>
                </div>
              )}

              {/* Specifications Grid */}
              <div className="bill-specs-grid">
                {quantity > 1 && bookingType !== 'Inquari Booking' && (
                  <div className="bill-spec-card">
                    <div className="bill-spec-label">Quantity</div>
                    <div className="bill-spec-val">× {quantity}</div>
                  </div>
                )}

                <div className="bill-spec-card">
                  <div className="bill-spec-label">Unit</div>
                  <div className="bill-spec-val">{displayUnit}</div>
                </div>

                {daysCount > 1 && bookingType !== 'Inquari Booking' && (
                  <div className="bill-spec-card">
                    <div className="bill-spec-label">Duration</div>
                    <div className="bill-spec-val">{daysCount} days</div>
                  </div>
                )}

                {selectedDates.length > 0 && (
                  <div className="bill-spec-card">
                    <div className="bill-spec-label">
                      {selectedSlots.length > 0 ? 'Date' : 'Dates'}
                    </div>
                    <div className="bill-spec-val">
                      {selectedDates.length === 1 
                        ? new Date(selectedDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : `${selectedDates.length} days selected`
                      }
                    </div>
                  </div>
                )}

                {selectedSlots.length > 0 && (
                  <div className="bill-spec-card">
                    <div className="bill-spec-label">Time Slots</div>
                    <div className="bill-spec-val">
                      {selectedSlots.map(s => s.slot).join(', ')}
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Services Breakdown */}
              {bookingType !== 'Inquari Booking' && (
                <div className="bill-section">
                  <div className="bill-section-title">
                    <span>Optional Services</span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Added items</span>
                  </div>

                  <div className="bill-addon-box">
                    {(() => {
                      const hasOptionalServices = (service.optionalInputs || []).some((input, index) => {
                        const count = optionalInputCounts[index] || 0;
                        return count > 0 || (!input.isCountable && addedOptionalInputs[index]);
                      });

                      if (!hasOptionalServices) {
                        return (
                          <p className="bill-addon-empty">
                            No optional services selected
                          </p>
                        );
                      }

                      return (
                        <div>
                          {(service.optionalInputs || []).map((input, index) => {
                            const count = optionalInputCounts[index] || 0;
                            if (count === 0 && (input.isCountable || !addedOptionalInputs[index])) return null;

                            const optUnitRate = effectiveOptionalUnitPrice(input, selectedServiceArea);

                            let itemTotal = 0;
                            let calculationBreakdown = '';
                            const inputUnit = input.unit || '';

                            const isOptMerged = input.isMerged || false;
                            const optMergedUnit = input.mergedUnit || 'per day';

                            if (input.isCountable && count > 0) {
                              if (isOptMerged) {
                                if (optMergedUnit.includes('hour')) {
                                  const slotCount = selectedSlots.length || 1;
                                  itemTotal = count * optUnitRate * slotCount;
                                  calculationBreakdown = `${count} × ₹${optUnitRate} × ${slotCount} slot${slotCount > 1 ? 's' : ''}`;
                                } else {
                                  itemTotal = count * optUnitRate * daysCount;
                                  calculationBreakdown = `${count} × ₹${optUnitRate} × ${daysCount} day${daysCount > 1 ? 's' : ''}`;
                                }
                              } else if (inputUnit.includes('day') || inputUnit === 'per-day') {
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
                            } else if (!input.isCountable && addedOptionalInputs[index]) {
                              if (isOptMerged) {
                                if (optMergedUnit.includes('hour')) {
                                  const slotCount = selectedSlots.length || 1;
                                  itemTotal = optUnitRate * slotCount;
                                  calculationBreakdown = `₹${optUnitRate} × ${slotCount} slot${slotCount > 1 ? 's' : ''}`;
                                } else {
                                  itemTotal = optUnitRate * daysCount;
                                  calculationBreakdown = `₹${optUnitRate} × ${daysCount} day${daysCount > 1 ? 's' : ''}`;
                                }
                              } else if (inputUnit.includes('day') || inputUnit === 'per-day') {
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
                            } else {
                              return null;
                            }

                            return (
                              <div key={`optional-${index}`} className="bill-addon-item">
                                <div>
                                  <div className="bill-addon-name">{input.name}</div>
                                  <div className="bill-addon-calc">{calculationBreakdown}</div>
                                </div>
                                <span className="bill-addon-price">₹{itemTotal}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Pricing Breakdown Card */}
              {bookingType !== 'Inquari Booking' && (
                <div className="bill-pricing-card">
                  <div className="bill-pricing-line">
                    <span>Base Price</span>
                    <span style={{ fontWeight: 600 }}>₹{effectiveRate} / {displayUnit}</span>
                  </div>

                  {currentUnit?.isCountable !== false && quantity > 1 && (
                    <div className="bill-pricing-line sub">
                      <span>× {quantity} ({displayUnit.replace(/^per\s+/i, '') || 'quantity'})</span>
                      <span>₹{effectiveRate * quantity}</span>
                    </div>
                  )}

                  {(isMerged || (currentUnit?.unit || service.unit || '').includes('day') || (currentUnit?.unit || service.unit || '').includes('week') || (currentUnit?.unit || service.unit || '').includes('month')) && daysCount > 1 && (
                    <div className="bill-pricing-line sub">
                      <span>× {daysCount} days</span>
                      <span>₹{effectiveRate * (isMerged && currentUnit?.isCountable !== false ? quantity : 1) * daysCount}</span>
                    </div>
                  )}

                  <div className="bill-pricing-divider"></div>

                  <div className="bill-grand-total">
                    <span className="bill-total-label">Total Amount</span>
                    <span className="bill-total-val">₹{totalAmount}</span>
                  </div>
                </div>
              )}

              {/* Inquiry Note Card */}
              {bookingType === 'Inquari Booking' && (
                <div className="bill-inquiry-note-card">
                  <div className="bill-inquiry-note-icon">📞</div>
                  <p className="bill-inquiry-note-text">
                    Our team will contact you shortly to confirm pricing and availability
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bill-footer">
              <button
                type="button"
                className="bill-btn-back"
                onClick={() => setShowBill(false)}
              >
                Back to Edit
              </button>

              <button
                type="button"
                className={`bill-btn-confirm ${bookingType === 'Inquari Booking' ? 'inquiry' : ''}`}
                onClick={handleBooking}
              >
                {bookingType === 'Inquari Booking' ? "Submit Inquiry" : "Confirm Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
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
            const unavailableDate = service?.unavailableDates?.find(d => d.date === dateStr);
            if (unavailableDate?.fullDay) return 'unavailable-date';
            if (selectedDates.includes(dateStr)) return 'selected-date';
            return '';
          }}
          tileDisabled={({ date }) => {
            const dateStr = moment(date).format('YYYY-MM-DD');
            const unavailableDate = service?.unavailableDates?.find(d => d.date === dateStr && d.fullDay);
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
        .react-calendar__navigation__label {
          font-size: 16px !important;
          font-weight: 600 !important;
          color: #1f2d3d !important;
          text-transform: capitalize;
        }
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
        .react-calendar__tile {
          padding: 12px 8px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .react-calendar__tile:enabled:hover {
          background-color: #e6f7ff;
          transform: scale(0.98);
        }
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
        .react-calendar__tile--now {
          background: #fff7e6;
          border: 1px solid #ffc53d;
          font-weight: 600;
        }
        .react-calendar__tile--now:enabled:hover,
        .react-calendar__tile--now:enabled:focus {
          background: #fff1b8;
        }
        .react-calendar__tile--active {
          background: #1890ff;
          color: white;
        }
        .react-calendar__navigation__arrow {
          font-size: 20px;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

export default Bookingscreen;