import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Loader from '../components/Loader';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEye, FaEyeSlash, FaTimes, FaShieldAlt, FaCheckCircle } from 'react-icons/fa';
import { adminLogin, resetPassword } from '../utils/api';
import styles from './AdminLogin.module.css';

function OfficialLogin() {
  const [login, setLogin] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetForm, setResetForm] = useState({ username: '', oldPassword: '', newPassword: '', confirmPassword: '' });
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const adminUser = localStorage.getItem('adminUser');

    if (adminToken && adminUser) {
      try {
        const user = JSON.parse(adminUser);
        if (user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (user.role === 'hod' || user.role === 'principal') {
          navigate('/cancellation/dashboard');
        }
      } catch (e) {
        console.error('Failed to parse user during auto-login check');
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    setLogin({ ...login, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await adminLogin(login.username, login.password);
      if (response.message === 'Login successful') {
        localStorage.setItem('adminToken', response.token || 'true');
        localStorage.setItem('adminUser', JSON.stringify(response.user));

        if (response.user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (response.user.role === 'hod' || response.user.role === 'principal') {
          navigate('/cancellation/dashboard');
        } else {
          setError('Unknown user role. Please contact support.');
        }
      } else {
        setError(response.error || 'Login failed');
      }
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetForm.username || !resetForm.oldPassword || !resetForm.newPassword || !resetForm.confirmPassword) {
      setError('Please fill all fields');
      return;
    }

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await resetPassword(resetForm.username, resetForm.oldPassword, resetForm.newPassword);
      setSuccessMessage('Password reset successful! You can now login.');
      setShowResetModal(false);
      setResetForm({ username: '', oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err?.message || 'Reset failed. Check your old password.');
    } finally {
      setLoading(false);
    }
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setError('');
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.bgGlow}></div>

      <div className={styles.centerContent}>
        <motion.div
          key="login"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <StyledWrapper>
            <div className="container">
              <div className="heading">Official Portal</div>
              <form onSubmit={handleSubmit} className="form">
                {error && <div className={styles.inlineError}>{error}</div>}
                <input
                  required
                  className="input"
                  type="text"
                  name="username"
                  value={login.username}
                  onChange={handleChange}
                  placeholder="Username / Official ID"
                  disabled={loading}
                />
                <div style={{ position: 'relative' }}>
                  <input
                    required
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={login.password}
                    onChange={handleChange}
                    placeholder="Security Password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.passwordToggleBtn}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>

                <span className={styles.forgotPassword}>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setShowResetModal(true);
                    }}
                    className={styles.forgotButton}
                  >
                    Forgot Password or Security Reset?
                  </button>
                </span>

                <button className="login-button" type="submit" disabled={loading}>
                  {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                      <Loader size="1.4rem" color="white" />
                    </div>
                  ) : 'Sign In'}
                </button>
              </form>
              {successMessage && (
                <div className={styles.successBanner}>
                  <FaCheckCircle /> {successMessage}
                </div>
              )}
            </div>
          </StyledWrapper>
        </motion.div>

        <AnimatePresence>
          {showResetModal && (
            <div className={styles.resetOverlay} onClick={closeResetModal}>
              <motion.div
                className={styles.resetModal}
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
              >
                <div className={styles.resetHeader}>
                  <div className={styles.resetHeading}>
                    <div className={styles.resetIcon}><FaShieldAlt /></div>
                    <h3>Official Security Reset</h3>
                  </div>
                  <button onClick={closeResetModal} className={styles.closeResetBtn} aria-label="Close reset modal">
                    <FaTimes />
                  </button>
                </div>

                <div className={styles.resetBody}>
                  <p className={styles.resetInfo}>
                    Verify your identity using your current password and username to update your security credentials.
                    <br /><strong>Forgot your old password?</strong> Please contact the System Administrator.
                  </p>

                  {error && <div className={styles.inlineError}>{error}</div>}

                  <div className={styles.resetGrid}>
                    <div className={`${styles.resetField} ${styles.fieldFull}`}>
                      <label>Username / Official ID</label>
                      <input
                        type="text"
                        value={resetForm.username}
                        onChange={(e) => setResetForm({ ...resetForm, username: e.target.value })}
                        placeholder="Enter your username"
                      />
                    </div>

                    <div className={styles.resetField}>
                      <label>Current Password</label>
                      <input
                        type="password"
                        value={resetForm.oldPassword}
                        onChange={(e) => setResetForm({ ...resetForm, oldPassword: e.target.value })}
                        placeholder="Enter current password"
                      />
                    </div>

                    <div className={styles.resetField}>
                      <label>New Password</label>
                      <input
                        type="password"
                        value={resetForm.newPassword}
                        onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                        placeholder="At least 6 characters"
                      />
                    </div>

                    <div className={`${styles.resetField} ${styles.fieldFull}`}>
                      <label>Confirm New Password</label>
                      <input
                        type="password"
                        value={resetForm.confirmPassword}
                        onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                        placeholder="Repeat new password"
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.resetFooter}>
                  <button onClick={closeResetModal} className={styles.resetCancelBtn} type="button" disabled={loading}>
                    Cancel
                  </button>
                  <button onClick={handleResetPassword} className={styles.resetSubmitBtn} disabled={loading} type="button">
                    {loading ? 'Processing...' : 'Update Password'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default OfficialLogin;

const StyledWrapper = styled.div`
  .container {
    max-width: 380px;
    background: #f8f9fd;
    background: linear-gradient(0deg, rgb(255, 255, 255) 0%, rgb(244, 247, 251) 100%);
    border-radius: 40px;
    padding: 3rem 2.5rem;
    border: 5px solid rgb(255, 255, 255);
    box-shadow: rgba(133, 189, 215, 0.4) 0px 30px 60px -20px;
    margin: 20px auto;
  }

  .heading {
    text-align: center;
    font-weight: 900;
    font-size: clamp(1.6rem, 4.5vw, 1.9rem);
    color: rgb(16, 137, 211);
    margin-bottom: 5px;
  }

  .form {
    margin-top: 20px;
  }

  .form .input {
    width: 100%;
    background: white;
    border: none;
    padding: 15px 20px;
    border-radius: 20px;
    margin-top: 15px;
    box-shadow: #cff0ff 0px 10px 10px -5px;
    border-inline: 2px solid transparent;
    font-family: inherit;
    font-size: 0.96rem;
  }

  .form .input:focus {
    outline: none;
    border-inline: 2px solid #12b1d1;
  }

  .form .login-button {
    display: block;
    width: 100%;
    font-weight: bold;
    background: linear-gradient(45deg, rgb(16, 137, 211) 0%, rgb(18, 177, 209) 100%);
    color: white;
    padding: 15px;
    margin: 25px auto 10px;
    border-radius: 20px;
    box-shadow: rgba(133, 189, 215, 0.8) 0px 20px 10px -15px;
    border: none;
    transition: all 0.2s ease-in-out;
    cursor: pointer;
  }

  .form .login-button:hover {
    transform: scale(1.03);
    box-shadow: rgba(133, 189, 215, 0.8) 0px 23px 10px -20px;
  }

  .form .login-button:active {
    transform: scale(0.95);
  }

  @media (max-width: 640px) {
    .container {
      max-width: 100%;
      border-radius: 28px;
      padding: 2rem 1.25rem;
      border-width: 2px;
    }

    .form .input {
      font-size: 0.93rem;
    }
  }
`;
