// contexts/NotificationContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [newBookingsCount, setNewBookingsCount] = useState(0);
    const [serviceVisibilityChanged, setServiceVisibilityChanged] = useState(false);
    const [pendingBookings, setPendingBookings] = useState([]);
    const [lastChecked, setLastChecked] = useState(new Date());
    const user = JSON.parse(localStorage.getItem("currentUser"));

    // Check for new bookings
    useEffect(() => {
        if (!user || (!user.isAdmin && user.role !== 'admin' && user.role !== 'vendor')) return;

        const checkNewBookings = async () => {
            try {
                const response = await axios.get(`/api/bookings/getallbookings?userid=${user._id}`);
                const bookings = response.data;
                
                // Filter bookings that are pending/confirmed and not assigned
                const pending = bookings.filter(b => 
                    (b.status === 'pending' || b.status === 'confirmed' || b.status === 'booked') && 
                    b.status !== 'assigned' &&
                    b.status !== 'completed'
                );
                
                setPendingBookings(pending);
                
                // Check for new bookings (created after last check)
                const newBookings = bookings.filter(b => 
                    new Date(b.createdAt) > lastChecked && 
                    (b.status === 'pending' || b.status === 'confirmed')
                );
                
                setNewBookingsCount(newBookings.length);
            } catch (error) {
                console.error('Error checking new bookings:', error);
            }
        };

        // Initial check
        checkNewBookings();
        
        // Check every 30 seconds
        const interval = setInterval(checkNewBookings, 30000);
        
        return () => clearInterval(interval);
    }, [user, lastChecked]);

    // Reset notifications when viewed
    const resetNotifications = () => {
        setNewBookingsCount(0);
        setLastChecked(new Date());
    };

    const triggerServiceVisibilityChange = () => {
        setServiceVisibilityChanged(true);
        setTimeout(() => setServiceVisibilityChanged(false), 3000);
    };

    const value = {
        newBookingsCount,
        serviceVisibilityChanged,
        pendingBookings,
        resetNotifications,
        triggerServiceVisibilityChange
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};