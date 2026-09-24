import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, } from 'framer-motion';
import NotificationAlert from '../components/NotificationAlert';
import {

    FaHome,
    FaSignOutAlt,
    FaSpinner,
    FaCheckCircle,
    FaInfoCircle,
    FaUser,
    FaExchangeAlt,
    FaClipboardList,
    FaBars,
    FaTimes,
    FaShieldAlt
} from 'react-icons/fa';
import {

    hodApproveCancellation,
    hodDeclineCancellation,
    principalApproveCancellation,
    principalDeclineCancellation,
    getApplications,
    resetPassword
} from '../utils/api';
import { getImageUrl } from '../config';
import styles from './CancellationDashboard.module.css';

/**
 * CancellationDashboard - Dedicated portal for HOD and Principal 
 * specifically for processing student bus pass cancellations.
 */
function CancellationDashboard() {
    const [requests, setRequests] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [adminUser, setAdminUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const navigate = useNavigate();

    const fetchRequests = React.useCallback(async () => {
        if (!adminUser) return;
        setLoading(true);
        try {
            // Fetch only applications with cancellation requested
            // For HOD, we further filter by department in the backend if role is 'hod'
            const data = await getApplications({
                role: adminUser.role,
                department: adminUser.department || ''
            });

            // Filter only those where cancellation_requested is true/1
            const cancellationRequests = data.filter(app => !!app.cancellation_requested && !app.cancelled);
            setRequests(cancellationRequests);
        } catch (err) {
            setError('Could not pull cancellation requests');
        } finally {
            setLoading(false);
        }
    }, [adminUser]);

    useEffect(() => {
        const adminToken = localStorage.getItem('adminToken');
        const userJson = localStorage.getItem('adminUser');

        if (!adminToken || !userJson) {
            navigate('/admin');
            return;
        }

        try {
            const user = JSON.parse(userJson);
            // This dashboard is only for HOD and Principal
            if (user.role !== 'hod' && user.role !== 'principal') {
                navigate('/admin/dashboard');
                return;
            }
            setAdminUser(user);
        } catch (e) {
            navigate('/admin');
        }
    }, [navigate]);

    useEffect(() => {
        if (adminUser) {
            fetchRequests();
        }
    }, [adminUser, fetchRequests]);

    useEffect(() => {
        if (window.innerWidth > 768) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = sidebarOpen ? 'hidden' : '';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [sidebarOpen]);

    const handleHodApprove = async (id) => {
        try {
            await hodApproveCancellation(id);
            setSuccessMessage('HOD approval recorded. Forwarded to Admin.');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchRequests();
        } catch (err) {
            setError(err.message || 'HOD approval failed');
        }
    };

    const handleHodDecline = async (id) => {
        if (!window.confirm('Are you sure you want to decline this cancellation request?')) return;
        try {
            await hodDeclineCancellation(id);
            setSuccessMessage('Cancellation request declined by HOD.');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchRequests();
        } catch (err) {
            setError(err.message || 'HOD decline failed');
        }
    };

    const handlePrincipalApprove = async (id) => {
        try {
            await principalApproveCancellation(id);
            setSuccessMessage('Principal approved. Pass cancelled successfully.');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchRequests();
        } catch (err) {
            setError(err.message || 'Principal approval failed');
        }
    };

    const handlePrincipalDecline = async (id) => {
        if (!window.confirm('Are you sure you want to decline this cancellation request?')) return;
        try {
            await principalDeclineCancellation(id);
            setSuccessMessage('Cancellation request declined by Principal.');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchRequests();
        } catch (err) {
            setError(err.message || 'Principal decline failed');
        }
    };

    const handleResetPassword = async () => {
        if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            setError('Please fill all password fields');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setError('New passwords do not match');
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        try {
            await resetPassword(adminUser.username, passwordForm.oldPassword, passwordForm.newPassword);
            setSuccessMessage('Password updated successfully');
            setShowPasswordModal(false);
            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to update password');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/admin');
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    return (
        <div className={styles.dashboardContainer}>
            {/* Mobile hamburger toggle */}
            <button
                className={styles.menuToggle}
                onClick={() => setSidebarOpen(prev => !prev)}
                aria-label="Toggle navigation"
            >
                {sidebarOpen ? <FaTimes /> : <FaBars />}
            </button>

            {/* Dark overlay behind sidebar on mobile */}
            <div
                className={`${styles.sidebarOverlay} ${sidebarOpen ? styles.active : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logoBox}>CP</div>
                    <span className={styles.logoLabel}>CANCELLATION PORTAL</span>
                </div>
                <div className={styles.navMenu}>
                    <button 
                        className={`${styles.navItem} ${styles.navActive}`}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <FaClipboardList /> Requests
                    </button>
                    <button 
                        className={styles.navItem}
                        onClick={() => { setShowPasswordModal(true); setSidebarOpen(false); }}
                    >
                        <FaShieldAlt /> Security settings
                    </button>
                </div>

                <div className={styles.sidebarFooter}>
                    <button onClick={handleLogout} className={styles.logoutBtn}>
                        <FaSignOutAlt /> <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            <main className={styles.mainArea}>
                <NotificationAlert role={adminUser?.role} />
                <header className={styles.topHeader}>
                    <div className={styles.headerInfo}>
                        <h1 className={styles.pageTitle}>Cancellation Approval</h1>
                        <p className={styles.pageSubtitle}>
                            {adminUser ? `${adminUser.name} (${adminUser.role.toUpperCase()}${adminUser.department ? ' - ' + adminUser.department : ''})` : 'Verification Portal'}
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <button onClick={() => navigate('/')} className={styles.navLink}>
                            <FaHome /> <span>Home</span>
                        </button>
                        <button onClick={handleLogout} className={styles.mobileSignOutBtn}>
                            <FaSignOutAlt /> <span>Sign Out</span>
                        </button>
                    </div>
                </header>

                <section className={styles.contentWrap}>
                    {error && (
                        <div className={styles.errorStick}>
                            <FaInfoCircle /> {error}
                            <button onClick={() => setError('')} className={styles.closeStick}>&times;</button>
                        </div>
                    )}
                    {successMessage && (
                        <div className={styles.successBanner}>
                            <FaCheckCircle /> {successMessage}
                        </div>
                    )}

                    <motion.div variants={containerVariants} initial="hidden" animate="visible">
                        <div className={styles.tableCard}>
                            <div className={styles.tableWrapper}>
                                <table className={`${styles.modernTable} ${styles.mobileStackTable}`}>
                                    <thead>
                                        <tr>
                                            <th>Student Details</th>
                                            <th>Reason for Cancellation</th>
                                            <th>Approval Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="4" className={styles.centerTd}><FaSpinner className={styles.spin} /> Loading...</td></tr>
                                        ) : requests.length === 0 ? (
                                            <tr><td colSpan="4" className={styles.centerTd}>No pending cancellation requests.</td></tr>
                                        ) : requests.map(app => (
                                            <tr key={app.id}>
                                                <td data-label="Student">
                                                    <div className={styles.studentProf}>
                                                        {app.photo ? (
                                                            <img
                                                                src={getImageUrl(app.photo)}
                                                                alt={app.name}
                                                                className={styles.miniAvatar}
                                                                onError={(e) => { e.target.src = '/placeholder-profile.png'; }}
                                                            />
                                                        ) : <div className={styles.avatarVoid}><FaUser /></div>}
                                                        <div className={styles.profInfo}>
                                                            <span className={styles.profName}>{app.name}</span>
                                                            <span className={styles.idVal}>{app.regNo}</span>
                                                            <span className={styles.courseVal}>{app.department} / {app.year}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td data-label="Reason">
                                                    <div className={styles.reasonBox}>
                                                        {app.cancellation_reason || 'No reason provided'}
                                                    </div>
                                                </td>
                                                <td data-label="Approval Status">
                                                    <div className={styles.cancellationStatus}>
                                                        <span>{app.hod_approval === 'approved' ? '✅ HOD' : '⌛ HOD'}</span>
                                                        <FaExchangeAlt className={styles.statusIcon} />
                                                        <span>{app.admin_approval === 'approved' ? '✅ ADMIN' : '⌛ ADMIN'}</span>
                                                        <FaExchangeAlt className={styles.statusIcon} />
                                                        <span>{app.principal_approval === 'approved' ? '✅ PRIN' : '⌛ PRIN'}</span>
                                                    </div>
                                                </td>
                                                <td data-label="Actions">
                                                    <div className={styles.actionRow}>
                                                        {adminUser?.role === 'hod' && app.hod_approval !== 'approved' && app.hod_approval !== 'declined' && (
                                                            <div className={styles.btnGroup}>
                                                                <button
                                                                    onClick={() => handleHodApprove(app.id)}
                                                                    className={styles.checkBtn}
                                                                >
                                                                    <FaCheckCircle /> Sign & Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => handleHodDecline(app.id)}
                                                                    className={styles.declineBtn}
                                                                >
                                                                    &times; Decline
                                                                </button>
                                                            </div>
                                                        )}

                                                        {adminUser?.role === 'principal' && app.hod_approval === 'approved' && app.admin_approval === 'approved' && app.principal_approval !== 'approved' && app.principal_approval !== 'declined' && (
                                                            <div className={styles.btnGroup}>
                                                                <button
                                                                    onClick={() => handlePrincipalApprove(app.id)}
                                                                    className={styles.checkBtn}
                                                                >
                                                                    <FaCheckCircle /> Principal Final Signature
                                                                </button>
                                                                <button
                                                                    onClick={() => handlePrincipalDecline(app.id)}
                                                                    className={styles.declineBtn}
                                                                >
                                                                    &times; Decline
                                                                </button>
                                                            </div>
                                                        )}

                                                        {adminUser?.role === 'hod' && app.hod_approval === 'approved' && (
                                                            <div className={styles.processedBadge}>
                                                                <FaCheckCircle /> Signed &amp; Forwarded
                                                            </div>
                                                        )}

                                                        {adminUser?.role === 'hod' && app.hod_approval === 'declined' && (
                                                            <div className={styles.awaitingBadge} style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}>
                                                                Declined by You
                                                            </div>
                                                        )}

                                                        {adminUser?.role === 'principal' && app.principal_approval === 'approved' && (
                                                            <div className={styles.processedBadge}>
                                                                <FaCheckCircle /> Final Approval Done
                                                            </div>
                                                        )}

                                                        {adminUser?.role === 'principal' && (!app.admin_approval || app.admin_approval !== 'approved') && app.principal_approval !== 'approved' && (
                                                            <div className={styles.awaitingBadge}>
                                                                Awaiting Admin Approval
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                </section>
            </main>

            {/* Password Reset Modal */}
            {showPasswordModal && (
                <div className={styles.modalOverlay} onClick={() => setShowPasswordModal(false)}>
                    <motion.div 
                        className={styles.modalPanel} 
                        onClick={e => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                        <div className={styles.modalHeader}>
                            <h3>Change Password</h3>
                            <button onClick={() => setShowPasswordModal(false)} className={styles.closeModalBtn}><FaTimes /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.inputGroup}>
                                <label>Current Password</label>
                                <input 
                                    type="password" 
                                    className={styles.formInput}
                                    value={passwordForm.oldPassword} 
                                    onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} 
                                    placeholder="Enter current password" 
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>New Password</label>
                                <input 
                                    type="password" 
                                    className={styles.formInput}
                                    value={passwordForm.newPassword} 
                                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
                                    placeholder="At least 6 characters" 
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Confirm New Password</label>
                                <input 
                                    type="password" 
                                    className={styles.formInput}
                                    value={passwordForm.confirmPassword} 
                                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} 
                                    placeholder="Repeat new password" 
                                />
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={handleResetPassword} className={styles.saveBtn}>Update Password</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

export default CancellationDashboard;
