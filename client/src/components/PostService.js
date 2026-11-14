import React, { useState } from "react";
import axios from "axios";
import { appAlert } from "../utils/appAlert";

function PostService() {
    const [serviceType, setServiceType] = useState("");
    const [description, setDescription] = useState("");
    const [budget, setBudget] = useState("");
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [photos, setPhotos] = useState(["", "", "", ""]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedSubCategory, setSelectedSubCategory] = useState("");

    const categories = {
        "Home Maintenance & Repair Services": [
            "Plumbing Services",
            "Electrical Repairs",
            "Carpentry and Woodwork",
            "Painting and Wallpapering",
            "Appliance Repair",
            "Pest Control",
            "Roof Repair and Waterproofing",
            "Flooring and Tile Repair",
            "HVAC Maintenance",
            "Home Cleaning",
            "Furniture Assembly",
            "Glass and Mirror Repair",
            "Smart Home Setup"
        ],
        "Event & Party Planning Services": [
            "Wedding Planning",
            "Birthday Party Planning",
            "Corporate Event Planning",
            "Catering Service",
            "Decor and Theme Setup",
            "Photography and Videography",
            "Entertainment",
            "Venue Booking",
            "Invitation Design",
            "Sound and Lighting Setup"
        ],
        "Entertainment & Ticket Booking": [
            "Movie Ticket Booking",
            "Concert and Show Tickets",
            "Sports Event Tickets",
            "Amusement Park Tickets",
            "Theater and Play Tickets",
            "Event Passes",
            "Online Streaming Subscriptions",
            "Gaming Zone Access"
        ],
        "Health & Wellness Services": [
            "Gym Memberships",
            "Yoga and Meditation Classes",
            "Diet and Nutrition Counseling",
            "Spa and Massage Services",
            "Physiotherapy",
            "Mental Health Counseling",
            "Home Healthcare",
            "Personal Training",
            "Wellness Retreats"
        ],
        "Transportation & Travel Services": [
            "Cab and Taxi Services",
            "Car Rental",
            "Airport Transfers",
            "Bus and Train Ticket Bookings",
            "Flight Ticket Booking",
            "Tour Packages",
            "Bike Rentals"
        ],
        "Education & Skill Development": [
            "Online Courses",
            "Tutoring Services",
            "Workshops and Webinars",
            "Certification Programs",
            "Test Preparation",
            "Language Classes",
            "Career Counseling"
        ],
        "Property & Space Rental": [
            "Office Space Rental",
            "Event Venue Booking",
            "Vacation Rentals",
            "Warehouse Rental",
            "Shop Rental",
            "Furniture Rental"
        ],
        "Auto & Vehicle Services": [
            "Car Wash and Detailing",
            "Vehicle Repair",
            "Towing Services",
            "Bike Servicing",
            "Tire Replacement",
            "Battery Replacement",
            "Insurance Renewal"
        ],
        "Home Shifting & Moving Services": [
            "Packing and Moving",
            "Transportation Services",
            "Packing Material Supply",
            "Storage Solutions",
            "Pet Relocation",
            "International Relocation"
        ],
        "Religious & Pooja Services": [
            "Pooja Arrangements",
            "Temple Visits",
            "Religious Event Planning",
            "Astrology Services",
            "Religious Item Delivery"
        ],
        "Agriculture & Farming Services": [
            "Farm Equipment Rental",
            "Crop Consulting",
            "Organic Farming Supplies",
            "Irrigation Solutions",
            "Farm Labor Services"
        ],
        "Emergency & On-Demand Services": [
            "Ambulance Services",
            "Locksmith Services",
            "Electrician on Call",
            "Plumber on Call",
            "Medical Assistance",
            "Towing Services"
        ],
        "Security & Surveillance Services": [
            "CCTV Installation",
            "Security Guards",
            "Alarm Systems",
            "Smart Locks",
            "Cybersecurity Services"
        ],
        "Senior Citizen & Special Care Services": [
            "Home Nursing Care",
            "Physiotherapy",
            "Companion Services",
            "Medical Equipment Rental",
            "Meal Delivery"
        ]
    };

    async function submitRequirement(e) {
        e.preventDefault();
        const requirement = {
            serviceType: selectedSubCategory,
            description,
            budget,
            name,
            address,
            photos,
            userId: JSON.parse(localStorage.getItem("currentUser"))._id,
            category: selectedCategory,
            subCategory: selectedSubCategory
        };

        try {
            await axios.post("/api/requirements", requirement);
            appAlert.success("Requirement posted successfully!");
            setServiceType("");
            setDescription("");
            setBudget("");
            setName("");
            setAddress("");
            setPhotos(["", "", "", ""]);
            setSelectedCategory("");
            setSelectedSubCategory("");
        } catch (error) {
            console.error(error);
            appAlert.error("Failed to post requirement. Please check required fields.");
        }
    }

    const handlePhotoChange = (index, value) => {
        const updatedPhotos = [...photos];
        updatedPhotos[index] = value;
        setPhotos(updatedPhotos);
    };

    return (
        <div className="mt-5">
            <h2>Post Your Requirement</h2>
            <form onSubmit={submitRequirement}>
                <div className="form-group">
                    <label>Name</label>
                    <input
                        type="text"
                        className="form-control"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your Name"
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Category</label>
                    <select
                        className="form-control"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        required
                    >
                        <option value="">Select Category</option>
                        {Object.keys(categories).map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>Subcategory</label>
                    <select
                        className="form-control"
                        value={selectedSubCategory}
                        onChange={(e) => setSelectedSubCategory(e.target.value)}
                        required
                    >
                        <option value="">Select Subcategory</option>
                        {selectedCategory &&
                            categories[selectedCategory].map((subCategory) => (
                                <option key={subCategory} value={subCategory}>
                                    {subCategory}
                                </option>
                            ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>Description</label>
                    <textarea
                        className="form-control"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Provide details about the service"
                        rows="4"
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Budget</label>
                    <input
                        type="number"
                        className="form-control"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        placeholder="Enter your budget"
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Address</label>
                    <input
                        type="text"
                        className="form-control"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter address"
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Photos (URLs)</label>
                    {photos.map((photo, index) => (
                        <input
                            key={index}
                            type="text"
                            className="form-control my-2"
                            value={photo}
                            onChange={(e) => handlePhotoChange(index, e.target.value)}
                            placeholder={`Photo ${index + 1} URL`}
                            required
                        />
                    ))}
                </div>
                <button type="submit" className="btn btn-success">
                    Submit
                </button>
            </form>
        </div>
    );
}

export default PostService;