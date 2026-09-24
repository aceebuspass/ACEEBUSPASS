import React from 'react';
import styled from 'styled-components';
import Loader from './Loader';
import { motion } from 'framer-motion';

const PageLoader = () => {
  return (
    <StyledWrapper
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="loader-container">
        <Loader size="4rem" color="#1089d3" />
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="loading-text"
        >
          E-PASS Loading...
        </motion.p>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: white;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;

  .loader-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .loading-text {
    font-size: 0.9rem;
    font-weight: 700;
    color: #1089d3;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
`;

export default PageLoader;
