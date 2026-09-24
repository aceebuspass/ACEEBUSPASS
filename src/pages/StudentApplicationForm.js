import React, { useEffect, useRef } from 'react';
import StudentForm from '../components/StudentForm';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import styles from './StudentApplicationForm.module.css';
import { FaShieldAlt, FaClock } from 'react-icons/fa';

function StudentApplicationForm() {
  const pageRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-gsap="apply-header"] > *',
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: 0.68,
          stagger: 0.08,
          ease: 'power3.out'
        }
      );

      gsap.fromTo(
        '[data-gsap="apply-form"]',
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 0.82, delay: 0.24, ease: 'power3.out' }
      );
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className={styles.pageContainer} ref={pageRef}>
      <div className={styles.bgGlow}></div>

      <div className={styles.formSection}>
        <motion.div
          className={styles.formHeader}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          data-gsap="apply-header"
        >
          <div className={styles.badge}>
            <FaShieldAlt /> Secure Application
          </div>
          <h1 className={styles.formTitle}>
            Bus Pass <span className={styles.titleGradient}>Application Form</span>
          </h1>
          <p className={styles.formDescription}>
            Complete your digital pass application in under 5 minutes.
            All documents are processed securely and encrypted.
          </p>

          <div className={styles.metaInfo}>
            <div className={styles.metaItem}>
              <FaClock /> 5 min read
            </div>
            <div className={styles.metaItem}>
              <FaShieldAlt /> 256-bit SSL
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          data-gsap="apply-form"
        >
          <StudentForm />
        </motion.div>
      </div>
    </div>
  );
}

export default StudentApplicationForm;
