import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import BusPassTemplate from '../components/BusPassTemplate';
import {
  FaArrowLeft, FaPrint, FaShareAlt, FaDownload,
  FaSpinner, FaInfoCircle, FaShieldAlt
} from 'react-icons/fa';
import { downloadBusPass } from '../utils/downloadPass';
import { getStudentPass } from '../utils/api';
import styles from './BusPassDisplay.module.css';

function BusPassDisplay() {
  const { regNo } = useParams();
  const location = useLocation();
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchStudentData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getStudentPass(regNo);

      setStudentData({
        ...data,
        validTill: data.validity || data.validTill || 'N/A',
        department: data.department || 'N/A',
        year: data.year || 'N/A',
        college: data.college || 'A.E.R.I',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [regNo]);

  useEffect(() => {
    if (location.state?.studentData) {
      setStudentData(location.state.studentData);
      setLoading(false);
    } else if (regNo) {
      fetchStudentData();
    } else {
      setError('System Access Denied: Missing Registry');
      setLoading(false);
    }
  }, [regNo, location.state, fetchStudentData]);

  const handlePrint = () => window.print();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'E-Bus Pass Identity',
          text: `Digital identification for ${studentData.name}`,
          url: window.location.href
        });
      } catch (err) { }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Secure link copied to clipboard');
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await downloadBusPass('bus-pass-template', `bus-pass-${studentData.regNo}`);
    } catch (error) {
      setError('Download restricted: Internal system error');
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.displayPage}>
        <div className={styles.loadingBox}>
          <FaSpinner className={styles.spin} />
          <h2>Decrypting Asset...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.displayPage}>
        <div className={styles.errorBox}>
          <FaInfoCircle className={styles.errIcon} />
          <h2>Access Error</h2>
          <p>{error}</p>
          <button onClick={() => window.history.back()} className={styles.backBtn}>
            <FaArrowLeft /> Return to Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.displayPage}>
      <div className={styles.bgGlow}></div>

      <div className={styles.container}>
        <motion.header
          className={styles.header}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.navGroup}>
            <button onClick={() => window.history.back()} className={styles.iconBtn} title="Back">
              <FaArrowLeft />
            </button>
            <div className={styles.headerText}>
              <h1>Digital Identity</h1>
              <p>Registry Ref: {studentData.regNo}</p>
            </div>
          </div>
          <div className={styles.actionGroup}>
            <button onClick={handleDownload} disabled={isDownloading} className={styles.primaryAction}>
              {isDownloading ? <FaSpinner className={styles.spin} /> : <FaDownload />}
              <span>Download</span>
            </button>
            <button onClick={handlePrint} className={styles.secondaryAction} title="Print">
              <FaPrint />
            </button>
            <button onClick={handleShare} className={styles.secondaryAction} title="Share">
              <FaShareAlt />
            </button>
          </div>
        </motion.header>

        <div className={styles.mainLayout}>
          <motion.div
            className={styles.passWrapper}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className={styles.viewerLabel}>
              <FaShieldAlt /> SECURE SYSTEM VIEW
            </div>
            <div className={styles.cardFrame}>
              <BusPassTemplate studentData={studentData} />
            </div>
          </motion.div>

          <motion.div
            className={styles.metaPanel}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className={styles.metaCard}>
              <div className={styles.metaHeader}>
                <FaInfoCircle /> <span>System Information</span>
              </div>
              <div className={styles.infoList}>
                <div className={styles.infoItem}>
                  <label>ISSUED ON</label>
                  <span>{new Date(studentData.approvedAt || Date.now()).toLocaleDateString()}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>COMMUTE ROUTE</label>
                  <span>{studentData.route}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>EXPIRY DATE</label>
                  <span className={styles.expiryText}>{studentData.validTill}</span>
                </div>
              </div>
            </div>

            <div className={styles.securityBox}>
              <FaShieldAlt className={styles.secIcon} />
              <div>
                <h5>Identity Protected</h5>
                <p>This pass is protected by 256-bit encryption. Multi-factor verification required for changes.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default BusPassDisplay;
