import React, { useState, useEffect, useCallback } from 'react';
import { APP_TOAST_EVENT } from '../utils/appAlert';
import { stopSoundAlert } from '../utils/soundAlert';
import {
    FaCheckCircle,
    FaExclamationCircle,
    FaExclamationTriangle,
    FaInfoCircle,
    FaBell,
    FaTimes,
    FaVolumeMute
} from 'react-icons/fa';
import './ToastNotification.css';

const ToastItem = ({ toast, onDismiss }) => {
    const [progress, setProgress] = useState(100);
    const [isHovered, setIsHovered] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            if (toast.onDismiss) toast.onDismiss();
            onDismiss(toast.id);
        }, 280);
    }, [toast, onDismiss]);

    useEffect(() => {
        if (!toast.duration || toast.duration <= 0) return;

        const intervalMs = 50;
        const totalSteps = toast.duration / intervalMs;
        const decrement = 100 / totalSteps;

        const timer = setInterval(() => {
            if (!isHovered) {
                setProgress((prev) => {
                    if (prev <= decrement) {
                        clearInterval(timer);
                        handleClose();
                        return 0;
                    }
                    return prev - decrement;
                });
            }
        }, intervalMs);

        return () => clearInterval(timer);
    }, [toast.duration, isHovered, handleClose]);

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return <FaCheckCircle />;
            case 'error':
                return <FaExclamationCircle />;
            case 'warning':
                return <FaExclamationTriangle />;
            case 'info':
                return <FaInfoCircle />;
            case 'booking':
            default:
                return <FaBell />;
        }
    };

    return (
        <div
            className={`sh-toast-item ${toast.type} ${isClosing ? 'closing' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            role="alert"
        >
            <div className="sh-toast-icon-wrapper">
                {getIcon()}
            </div>

            <div className="sh-toast-content">
                <div className="sh-toast-title">{toast.title}</div>
                <div className="sh-toast-message">{toast.message}</div>
                {toast.service && (
                    <div className="sh-toast-service-tag">
                        Service: {toast.service}
                    </div>
                )}

                {(toast.isBooking || toast.action) && (
                    <div className="sh-toast-actions">
                        {toast.onView && (
                            <button
                                type="button"
                                className="sh-toast-btn sh-toast-btn-primary"
                                onClick={() => {
                                    stopSoundAlert();
                                    toast.onView();
                                    handleClose();
                                }}
                            >
                                View Details
                            </button>
                        )}
                        {toast.isBooking && (
                            <button
                                type="button"
                                className="sh-toast-btn sh-toast-btn-secondary"
                                onClick={() => {
                                    stopSoundAlert();
                                    handleClose();
                                }}
                            >
                                <FaVolumeMute style={{ marginRight: 4 }} />
                                Silence
                            </button>
                        )}
                        {toast.action && (
                            <button
                                type="button"
                                className="sh-toast-btn sh-toast-btn-primary"
                                onClick={() => {
                                    toast.action.onClick();
                                    handleClose();
                                }}
                            >
                                {toast.action.label}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <button
                type="button"
                className="sh-toast-close"
                onClick={handleClose}
                aria-label="Close notification"
            >
                <FaTimes />
            </button>

            {toast.duration > 0 && (
                <div
                    className="sh-toast-progress-bar"
                    style={{ width: `${progress}%` }}
                />
            )}
        </div>
    );
};

export default function ToastNotificationContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const handleNewToast = (event) => {
            const toastData = event.detail;
            if (!toastData || !toastData.id) return;

            setToasts((prev) => {
                // If it's a booking alert and another booking alert is already open, replace or update it
                if (toastData.isBooking) {
                    const filtered = prev.filter((t) => !t.isBooking);
                    return [toastData, ...filtered];
                }
                // Cap to max 5 visible toasts
                return [toastData, ...prev.slice(0, 4)];
            });
        };

        window.addEventListener(APP_TOAST_EVENT, handleNewToast);
        return () => window.removeEventListener(APP_TOAST_EVENT, handleNewToast);
    }, []);

    const dismissToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    if (toasts.length === 0) return null;

    return (
        <div className="sh-toast-container">
            {toasts.map((toast) => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onDismiss={dismissToast}
                />
            ))}
        </div>
    );
}
