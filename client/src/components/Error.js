import React, { useState } from "react";
import { FaExclamationCircle, FaTimes } from "react-icons/fa";

export default function Error({ message, dismissible = true }) {
    const [visible, setVisible] = useState(true);

    if (!visible || !message) return null;

    return (
        <div
            className="alert alert-danger d-flex align-items-center justify-content-between shadow-sm"
            role="alert"
            style={{
                borderRadius: "10px",
                borderLeft: "5px solid #ef4444",
                background: "#fef2f2",
                color: "#991b1b",
                padding: "12px 16px",
                margin: "12px 0"
            }}
        >
            <div className="d-flex align-items-center gap-2">
                <FaExclamationCircle style={{ fontSize: "1.2rem", flexShrink: 0 }} />
                <span style={{ fontWeight: 500, fontSize: "0.95rem" }}>
                    {typeof message === "string" ? message : "Something went wrong. Please try again."}
                </span>
            </div>
            {dismissible && (
                <button
                    type="button"
                    onClick={() => setVisible(false)}
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "#991b1b",
                        cursor: "pointer",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        lineHeight: 1
                    }}
                    aria-label="Close"
                >
                    <FaTimes />
                </button>
            )}
        </div>
    );
}
