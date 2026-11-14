import React, { useState } from "react";
import { FaCheckCircle, FaTimes } from "react-icons/fa";

export default function Success({ message, dismissible = true }) {
    const [visible, setVisible] = useState(true);

    if (!visible || !message) return null;

    return (
        <div
            className="alert alert-success d-flex align-items-center justify-content-between shadow-sm"
            role="alert"
            style={{
                borderRadius: "10px",
                borderLeft: "5px solid #10b981",
                background: "#ecfdf5",
                color: "#065f46",
                padding: "12px 16px",
                margin: "12px 0"
            }}
        >
            <div className="d-flex align-items-center gap-2">
                <FaCheckCircle style={{ fontSize: "1.2rem", flexShrink: 0 }} />
                <span style={{ fontWeight: 500, fontSize: "0.95rem" }}>
                    {typeof message === "string" ? message : "Operation completed successfully."}
                </span>
            </div>
            {dismissible && (
                <button
                    type="button"
                    onClick={() => setVisible(false)}
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "#065f46",
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
