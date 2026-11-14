import Swal from 'sweetalert2';
import { playSyntheticChime, playSoundAlert, stopSoundAlert } from './soundAlert';

// Custom event name for toast broadcasts
export const APP_TOAST_EVENT = 'SERVICE_HUNT_APP_TOAST';

class AlertService {
    constructor() {
        this.listeners = new Set();
    }

    /**
     * Internal emitter for toast notifications
     */
    emit(toast) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(APP_TOAST_EVENT, { detail: toast }));
        }
    }

    /**
     * Display a success toast
     * @param {string} message - Notification text
     * @param {Object} options - Custom options (duration, playSound, title)
     */
    success(message, options = {}) {
        const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        if (options.playSound !== false) {
            playSyntheticChime('chime');
        }
        this.emit({
            id,
            type: 'success',
            title: options.title || 'Success',
            message: message || 'Action completed successfully',
            duration: options.duration || 4000,
            action: options.action
        });
        return id;
    }

    /**
     * Display an error toast
     * @param {string} message - Notification text
     * @param {Object} options - Custom options (duration, playSound, title)
     */
    error(message, options = {}) {
        const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        if (options.playSound !== false) {
            playSyntheticChime('urgent');
        }
        this.emit({
            id,
            type: 'error',
            title: options.title || 'Error',
            message: message || 'Something went wrong. Please try again.',
            duration: options.duration || 5000,
            action: options.action
        });
        return id;
    }

    /**
     * Display a warning toast
     * @param {string} message - Notification text
     * @param {Object} options - Custom options (duration, playSound, title)
     */
    warning(message, options = {}) {
        const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        this.emit({
            id,
            type: 'warning',
            title: options.title || 'Attention',
            message: message || 'Please review your input.',
            duration: options.duration || 4500,
            action: options.action
        });
        return id;
    }

    /**
     * Display an info toast
     * @param {string} message - Notification text
     * @param {Object} options - Custom options (duration, playSound, title)
     */
    info(message, options = {}) {
        const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        this.emit({
            id,
            type: 'info',
            title: options.title || 'Note',
            message: message || '',
            duration: options.duration || 4000,
            action: options.action
        });
        return id;
    }

    /**
     * High-priority booking or job assignment alert toast
     */
    bookingAlert({
        title = 'New Booking Alert!',
        message = 'A new booking has arrived',
        service = '',
        count = 1,
        isNoHelperAlert = false,
        onView = null,
        onDismiss = null,
        sound = true
    } = {}) {
        const id = 'toast_booking_' + Date.now();
        if (sound) {
            playSoundAlert({ loop: true, maxDurationMs: 30000 });
        }
        this.emit({
            id,
            type: isNoHelperAlert ? 'error' : 'booking',
            title: isNoHelperAlert ? '⚠️ Unclaimed Booking Alert' : title,
            message: isNoHelperAlert
                ? `No helper accepted service for ${count} booking(s). Immediate action needed.`
                : message,
            service,
            count,
            duration: 0, // Persistent until dismissed or viewed
            isBooking: true,
            isNoHelperAlert,
            onView,
            onDismiss: () => {
                stopSoundAlert();
                if (typeof onDismiss === 'function') onDismiss();
            }
        });
        return id;
    }

    /**
     * Modern interactive confirmation dialog
     * @returns {Promise<boolean>}
     */
    async confirm({
        title = 'Are you sure?',
        text = "You won't be able to revert this!",
        icon = 'warning',
        confirmButtonText = 'Yes, Proceed',
        cancelButtonText = 'Cancel',
        isDestructive = false
    } = {}) {
        const result = await Swal.fire({
            title,
            text,
            icon,
            showCancelButton: true,
            confirmButtonColor: isDestructive ? '#ef4444' : '#2563eb',
            cancelButtonColor: '#6b7280',
            confirmButtonText,
            cancelButtonText,
            customClass: {
                popup: 'sh-swal-popup',
                title: 'sh-swal-title',
                confirmButton: 'sh-swal-confirm-btn',
                cancelButton: 'sh-swal-cancel-btn'
            },
            buttonsStyling: true,
            reverseButtons: true
        });
        return Boolean(result.isConfirmed);
    }

    /**
     * Modern info/alert modal dialog
     */
    async modal({
        title = 'Notice',
        text = '',
        icon = 'info',
        confirmButtonText = 'OK'
    } = {}) {
        return await Swal.fire({
            title,
            text,
            icon,
            confirmButtonColor: '#2563eb',
            confirmButtonText,
            customClass: {
                popup: 'sh-swal-popup',
                title: 'sh-swal-title',
                confirmButton: 'sh-swal-confirm-btn'
            }
        });
    }
}

export const appAlert = new AlertService();
export default appAlert;
