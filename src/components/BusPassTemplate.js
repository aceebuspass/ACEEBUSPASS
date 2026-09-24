import React from 'react';
import styles from './BusPassTemplate.module.css';
import { QRCodeCanvas } from 'qrcode.react';
import { FaBus, FaShieldAlt } from 'react-icons/fa';
import { getImageUrl } from '../config';

// Always use the live site origin so the QR works when scanned from downloaded/printed passes
const SITE_BASE_URL = window.location.origin;

function BusPassTemplate({ studentData }) {
  if (!studentData) return null;

  const {
    photo,
    name,
    dob,
    department,
    year,
    college,
    regNo,
    passNo,
    busNo,
    userType,
  } = studentData;

  // QR points to the real-time verify-pass page so scanning a downloaded/printed
  // pass ALWAYS checks live DB status — cancelled passes show "ACCESS DENIED".
  const qrValue = `${SITE_BASE_URL}/verify-pass/${regNo}`;

  return (
    <div className={styles.passContainer}>
      <div
        id="bus-pass-template"
        className={`${styles.card} ${studentData.cancelled ? styles.cancelledCard : ''}`}
      >
        {/* Holographic Overlay Effect */}
        <div className={styles.hologram}></div>

        <div className={styles.header}>
          <div className={styles.logoGroup}>
            <div className={styles.logoIcon}><FaBus /></div>
            <div>
              <h1 className={styles.logoText}>E-BUS PASS</h1>
              <p className={styles.collegeName}>{college || 'A.E.R.I'}</p>
            </div>
          </div>
          <div className={styles.authBadge}>
            <FaShieldAlt /> VERIFIED
          </div>
        </div>

        <div className={styles.cardBody}>
          <div className={styles.profileSection}>
            <div className={styles.photoFrame}>
              <img
                src={getImageUrl(photo) || '/placeholder-profile.png'}
                alt={name}
                className={styles.photo}
                onError={(e) => { e.target.src = '/placeholder-profile.png'; }}
              />
            </div>
            <div className={styles.regBadge}>
              <span className={styles.regLabel}>ID NUMBER</span>
              <span className={styles.regValue}>{regNo || '---'}</span>
            </div>
          </div>

          <div className={styles.infoSection}>
            <div className={styles.userTypeHeader}>
              {userType?.toUpperCase() || 'STUDENT'} TRANSPORT PASS
            </div>

            <div className={styles.detailsGrid}>
              <div className={styles.detail}>
                <span className={styles.label}>FULL NAME</span>
                <span className={styles.value}>{name || 'N/A'}</span>
              </div>
              <div className={styles.detail}>
                <span className={styles.label}>DEPT / YEAR</span>
                <span className={styles.value}>{department || '-'} {year ? `/ ${year}` : ''}</span>
              </div>
              <div className={styles.detail}>
                <span className={styles.label}>DATE OF BIRTH</span>
                <span className={styles.value}>{dob || 'N/A'}</span>
              </div>
            </div>

            <div className={styles.travelBar}>
              <div className={styles.travelItem}>
                <span className={styles.travelLabel}>BUS NO</span>
                <span className={styles.travelValue}>{busNo || studentData.busNumber || '--'}</span>
              </div>
              <div className={styles.travelItem}>
                <span className={styles.travelLabel}>PASS NO</span>
                <span className={styles.travelValue}>{studentData.passNumber || passNo || 'PENDING'}</span>
              </div>
            </div>
          </div>

          <div className={styles.qrSection}>
            <div className={styles.qrWrapper}>
              <QRCodeCanvas
                value={qrValue}
                size={110}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "/favicon.ico",
                  x: undefined,
                  y: undefined,
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
            </div>
          </div>
        </div>

        {studentData.cancelled && (
          <div className={styles.cancelledOverlay}>
            <div className={styles.cancelledStamp}>CANCELLED</div>
          </div>
        )}

        <div className={styles.footer}>
          <span>ISSUED BY A.E.R.I TRANSPORT OFFICE</span>
          <span className={styles.securityCode}>SECURE-PASS-{regNo?.slice(-4) || 'XXXX'}</span>
        </div>
      </div>
    </div>
  );
}

export default BusPassTemplate;
