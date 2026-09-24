import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaSpinner, FaIdCard, FaUser, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { getStudentDetails } from '../utils/api';
import styles from './VerifyPass.module.css'; // Reuse existing verification styles for consistency

function VerifyStudent() {
  const { regNo } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStudent() {
      try {
        const data = await getStudentDetails(regNo);
        setStudent(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [regNo]);

  if (loading) return (
    <div className={styles.verifyPage}>
      <div className={styles.loaderBox}>
        <FaSpinner className={styles.spin} />
        <h2>Verifying Identity...</h2>
      </div>
    </div>
  );

  return (
    <div className={styles.verifyPage}>
      <div className={styles.container}>
        {error ? (
          <div className={styles.errorCard}>
            <FaExclamationTriangle className={styles.errorIcon} />
            <h2>Verification Failed</h2>
            <p>{error}</p>
          </div>
        ) : (
          <motion.div
            className={styles.resultContainer}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={`${styles.statusBanner} ${styles.validBg}`}>
              <div className={styles.statusContent}>
                <div className={styles.statusIcon}><FaCheckCircle /></div>
                <div className={styles.statusText}>
                  <h3>IDENTITY VERIFIED</h3>
                  <p>Registered student in A.E.R.I Transportation System</p>
                </div>
              </div>
            </div>

            <div className={styles.verifyStudentCard}>
              <div className={styles.verifyStudentHead}>
                <img
                  src={student.photo ? `/api/student/uploads/${student.photo}` : '/default-user.png'}
                  alt="Applicant"
                  className={styles.verifyStudentPhoto}
                />
                <div className={styles.infoList}>
                  <div className={styles.infoRow}><FaUser /> <span>Name</span> <strong>{student.name}</strong></div>
                  <div className={styles.infoRow}><FaIdCard /> <span>Reg No</span> <strong>{student.regNo}</strong></div>
                  <div className={styles.infoRow}><strong>Route:</strong> <span>{student.route}</span></div>
                  <div className={styles.infoRow}><strong>Status:</strong> <span style={{ color: '#10b981', fontWeight: 700 }}>VERIFIED</span></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default VerifyStudent;
