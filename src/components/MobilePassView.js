import React from 'react';
import styles from './MobilePassView.module.css';
import { FaCheckCircle, FaIdCard, FaCalendarAlt, FaBusAlt, FaUser, FaGraduationCap } from 'react-icons/fa';

const MobilePassView = ({ passData }) => {
  if (!passData) return null;

  const {
    regNo,
    name,
    branch,
    year,
    validTill,
    passNo,
    busNo
  } = passData;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logo}>E-BUS</div>
      </div>

      <div className={styles.statusBadge}>
        <FaCheckCircle />
        <span>Active Pass</span>
      </div>

      <div className={styles.mainInfo}>
        <div className={styles.studentName}>
          <FaUser className={styles.icon} />
          {name}
        </div>
      </div>

      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>
            <FaIdCard className={styles.icon} />
            Reg. No
          </div>
          <div className={styles.infoValue}>{regNo}</div>
        </div>

        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>
            <FaGraduationCap className={styles.icon} />
            Branch/Year
          </div>
          <div className={styles.infoValue}>{branch} {year}</div>
        </div>

        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>
            <FaBusAlt className={styles.icon} />
            Bus No.
          </div>
          <div className={styles.infoValue}>{busNo}</div>
        </div>

        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>
            <FaCalendarAlt className={styles.icon} />
            Pass No.
          </div>
          <div className={styles.infoValue}>{passNo}</div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.verificationTime}>
          Verified: {new Date().toLocaleString()}
        </div>
        <div className={styles.issuer}>
          Issued by: A.E.R.I Transport
        </div>
      </div>
    </div>
  );
};

export default MobilePassView;