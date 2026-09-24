import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBell, FaInfoCircle, FaExclamationTriangle, FaTimes, FaBullhorn } from 'react-icons/fa';
import { getNotifications } from '../utils/api';
import styles from './NotificationAlert.module.css';

const NotificationAlert = ({ role }) => {
    const [notifications, setNotifications] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications();
            // Filter based on role if needed, currently show all 'all' or specific role
            const filtered = data.filter(n => n.target_role === 'all' || n.target_role === role);
            setNotifications(filtered);
        } catch (err) {
            console.error('Failed to fetch notifications');
        }
    };

    if (!isVisible || notifications.length === 0) return null;

    const current = notifications[currentIndex];

    const getIcon = (type) => {
        switch (type) {
            case 'alert': return <FaExclamationTriangle />;
            case 'important': return <FaBullhorn />;
            default: return <FaInfoCircle />;
        }
    };

    const nextNotification = () => {
        setCurrentIndex((prev) => (prev + 1) % notifications.length);
    };

    return (
        <AnimatePresence>
            <motion.div
                className={`${styles.notificationBar} ${styles[current.type]}`}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
            >
                <div className={styles.content}>
                    <span className={styles.icon}>{getIcon(current.type)}</span>
                    <div className={styles.textGroup}>
                        <span className={styles.title}>{current.title}</span>
                        <span className={styles.divider}>|</span>
                        <span className={styles.message}>{current.message}</span>
                    </div>
                </div>

                <div className={styles.actions}>
                    {notifications.length > 1 && (
                        <button onClick={nextNotification} className={styles.nextBtn}>
                            Next ({currentIndex + 1}/{notifications.length})
                        </button>
                    )}
                    <button onClick={() => setIsVisible(false)} className={styles.closeBtn}>
                        <FaTimes />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default NotificationAlert;
