import React, { useState } from "react";
import axios from "axios";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { appAlert } from "../utils/appAlert";

function BidInputs({ selectedRequirement, onClose }) {
    const [bidDescription, setBidDescription] = useState("");
    const [bidPrice, setBidPrice] = useState("");
    const [showBidModal, setShowBidModal] = useState(true);
    const [showNestedModal, setShowNestedModal] = useState(false);
    const [error, setError] = useState("");

    const handleBidClose = () => {
        setShowBidModal(false);
        onClose();
    };

    const handleNestedModalClose = () => {
        setShowNestedModal(false);
        setError("");
    };

    const handleNestedModalOpen = () => {
        setShowNestedModal(true);
    };
    async function submitbid(e) {
        e.preventDefault();

        // Get the current user ID from localStorage
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        if (!currentUser || !currentUser._id) {
            setError("User not logged in.");
            return;
        }

        // Prepare the payload
        const bidsumbit = {
            bidDescription,
            bidPrice: parseFloat(bidPrice), // Ensure bidPrice is a number
            userId: currentUser._id,
            requirementId: selectedRequirement._id, // Include the requirement ID
        };

        try {
            // Submit the bid
            // Frontend (BidInputs.js)
            const response = await axios.post("/api/bids/bidsubmit", bidsumbit); // Changed from bidsumbit to bidsubmit
            if (response.status === 201) {
                appAlert.success("Requirement bid submitted successfully!");
                setBidDescription("");
                setBidPrice("");
                handleNestedModalClose();
            }
        } catch (error) {
            console.error(error);
            setError(error.response?.data?.error || "Failed to submit bid requirement.");
        }
    }
    return (
        <>
            <Modal show={showBidModal} onHide={handleBidClose} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Requirement Details</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ display: "flex", gap: "20px", height: "700px" }}>
                    <div style={{ flex: 2 }}>
                        <strong>Photos:</strong>
                        <div
                            style={{
                                display: "flex",
                                overflowX: "auto",
                                gap: "10px",
                                paddingTop: "10px",
                            }}
                        >
                            {selectedRequirement.photos.map((photo, index) => (
                                <img
                                    key={index}
                                    src={photo}
                                    alt={`Photo ${index + 1}`}
                                    style={{
                                        width: "700px",
                                        height: "350px",
                                        objectFit: "cover",
                                        borderRadius: "5px",
                                        border: "1px solid #ddd",
                                        cursor: "pointer",
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="col-md-12 text-left" style={{ flex: 1 }}>
                        <div style={{ marginBottom: "10px" }}>
                            <strong>Name:</strong> {selectedRequirement.name}
                        </div>
                        <div style={{ marginBottom: "10px" }}>
                            <strong>Service:</strong> {selectedRequirement.serviceType}
                        </div>
                        <div style={{ marginBottom: "10px" }}>
                            <strong>Description:</strong> {selectedRequirement.description}
                        </div>
                        <div style={{ marginBottom: "10px" }}>
                            <strong>Budget:</strong> ₹{selectedRequirement.budget}
                        </div>
                        <div style={{ marginBottom: "10px" }}>
                            <strong>Address:</strong> {selectedRequirement.address}
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleBidClose}>
                        Close
                    </Button>
                    <Button variant="success" onClick={handleNestedModalOpen}>
                        Bid
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showNestedModal} onHide={handleNestedModalClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Submit Bid</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <div className="alert alert-danger">{error}</div>}
                    <div style={{ marginBottom: "10px" }}>
                        <form onSubmit={submitbid}>
                            <div className="form-group">
                                <label htmlFor="bidPrice">Price:</label>
                                <input
                                    type="number"
                                    value={bidPrice}
                                    onChange={(e) => setBidPrice(e.target.value)}
                                    style={{ width: "100%", padding: "5px" }}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: "10px" }}>
                                <label htmlFor="bidDescription">Description:</label>
                                <input
                                    type="text"
                                    value={bidDescription}
                                    onChange={(e) => setBidDescription(e.target.value)}
                                    style={{ width: "100%", padding: "5px", height: "100px" }}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-success">
                                Submit
                            </button>
                        </form>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleNestedModalClose}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default BidInputs;