import React from 'react';
import { motion } from 'framer-motion';
import { FaHome, FaArrowLeft } from 'react-icons/fa';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      fontFamily: "'Outfit', sans-serif"
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          textAlign: 'center',
          maxWidth: '480px',
          padding: '2rem'
        }}
      >
        <h1 style={{
          fontSize: '8rem',
          fontWeight: 900,
          margin: 0,
          background: 'linear-gradient(135deg, #7c3aed 0%, #0ea5e9 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1
        }}>404</h1>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: 800,
          color: '#0f172a',
          margin: '1rem 0'
        }}>Page Not Found</h2>
        <p style={{
          color: '#64748b',
          fontSize: '1.125rem',
          lineHeight: 1.6,
          marginBottom: '2.5rem'
        }}>
          The route you're looking for has been moved or doesn't exist in our intelligent transport system.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 2rem',
            background: '#0f172a',
            color: 'white',
            borderRadius: '14px',
            textDecoration: 'none',
            fontWeight: 700,
            boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.1)'
          }}>
            <FaHome /> Back Home
          </Link>
          <button
            onClick={() => window.history.back()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 2rem',
              background: 'white',
              color: '#475569',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <FaArrowLeft /> Go Back
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default NotFound;