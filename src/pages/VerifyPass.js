import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaCheckCircle, FaTimesCircle, FaSpinner,
    FaExclamationTriangle, FaShieldAlt, FaCalendarAlt,
    FaBus, FaUser, FaIdCard, FaClock, FaBan
} from 'react-icons/fa';
import BusPassTemplate from '../components/BusPassTemplate';
import { verifyPassData } from '../utils/api';
import styles from './VerifyPass.module.css';

function VerifyPass() {
    const { regNo } = useParams();
    const [passData, setPassData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPassData = async () => {
            try {
                setLoading(true);
                setError('');
                const data = await verifyPassData(regNo);
                setPassData(data);
            } catch (err) {
                setError(err.message || 'System verification error');
            } finally {
                setLoading(false);
            }
        };
        if (regNo) fetchPassData();
    }, [regNo]);

    if (loading) {
        return (
            <div className={styles.verifyPage}>
                <div className={styles.loaderBox}>
                    <FaSpinner className={styles.spin} />
                    <h2>Verifying Pass...</h2>
                    <p>Checking live database status</p>
                </div>
            </div>
        );
    }

    // ── Full-screen CANCELLED screen ─────────────────────────────────────
    if (!error && passData && (passData.cancelled || passData.status === 'cancelled')) {
        return (
            <motion.div
                className={styles.cancelledScreen}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                <motion.div
                    className={styles.cancelledCard}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                    <motion.div
                        className={styles.banIcon}
                        animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        <FaBan />
                    </motion.div>

                    <h1 className={styles.cancelledTitle}>PASS CANCELLED</h1>
                    <p className={styles.cancelledSubtitle}>INVALID QR CODE — DO NOT ALLOW BOARDING</p>

                    <div className={styles.cancelledDivider} />

                    <div className={styles.cancelledInfo}>
                        <div className={styles.cancelledRow}>
                            <span>Student</span>
                            <strong>{passData.name}</strong>
                        </div>
                        <div className={styles.cancelledRow}>
                            <span>Reg No</span>
                            <strong>{passData.regNo}</strong>
                        </div>
                        <div className={styles.cancelledRow}>
                            <span>Route</span>
                            <strong>{passData.route || 'N/A'}</strong>
                        </div>
                        {passData.cancellation_reason && (
                            <div className={styles.cancelledRow}>
                                <span>Reason</span>
                                <strong>{passData.cancellation_reason}</strong>
                            </div>
                        )}
                        {passData.cancelled_at && (
                            <div className={styles.cancelledRow}>
                                <span>Cancelled On</span>
                                <strong>{new Date(passData.cancelled_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                            </div>
                        )}
                    </div>

                    <div className={styles.cancelledFooter}>
                        <p>⚡ LIVE DATABASE CHECK — {new Date().toLocaleString('en-IN')}</p>
                        <p>This QR was scanned in real-time. The pass status cannot be faked.</p>
                    </div>
                </motion.div>
            </motion.div>
        );
    }

    return (
        <div className={styles.verifyPage}>
            <div className={styles.bgGlow}></div>

            <div className={styles.container}>
                <AnimatePresence mode="wait">
                    {error ? (
                        <motion.div
                            key="error"
                            className={styles.errorCard}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <div className={styles.errorIcon}><FaExclamationTriangle /></div>
                            <h1>Verification Error</h1>
                            <p>{error}</p>
                            <div className={styles.metaBox}>
                                <span>REG NO: {regNo}</span>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="pass"
                            className={styles.resultContainer}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {/* Status Banner */}
                            <div className={`${styles.statusBanner} ${passData.status === 'approved' ? styles.validBg : styles.pendingBg}`}>
                                <div className={styles.statusContent}>
                                    <div className={styles.statusIcon}>
                                        {passData.status === 'approved' ? <FaCheckCircle /> : <FaClock />}
                                    </div>
                                    <div className={styles.statusText}>
                                        <h3>{passData.status === 'approved' ? 'VALID IDENTITY' : 'PENDING REVIEW'}</h3>
                                        <p>{passData.status === 'approved' ? 'Identity verified for transport use' : 'Awaiting administrative clearance'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.mainGrid}>
                                {/* Visual Card */}
                                <div className={styles.passView}>
                                    <div className={styles.sectionHeader}>
                                        <FaShieldAlt /> Digital License View
                                    </div>
                                    <BusPassTemplate studentData={passData} />
                                </div>

                                {/* Raw Details */}
                                <div className={styles.detailsView}>
                                    <div className={styles.sectionHeader}>
                                        <FaIdCard /> Metadata Breakdown
                                    </div>
                                    <div className={styles.infoCard}>
                                        <div className={styles.infoRow}><FaUser /> <span>Name</span> <strong>{passData.name}</strong></div>
                                        <div className={styles.infoRow}><FaIdCard /> <span>Reg No</span> <strong>{passData.regNo}</strong></div>
                                        <div className={styles.infoRow}><FaBus /> <span>Route</span> <strong>{passData.route}</strong></div>
                                        <div className={styles.infoRow}><FaCalendarAlt /> <span>Validity</span> <strong>{passData.validTill}</strong></div>
                                    </div>

                                    <div className={styles.footerNote}>
                                        <p>⚠️ REAL-TIME VERIFICATION</p>
                                        <p>Timestamp: {new Date().toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default VerifyPass;
