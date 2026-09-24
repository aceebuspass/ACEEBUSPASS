import React, { useState, useEffect } from 'react';
import { FaHome, FaUserGraduate, FaUserShield, FaBars, FaTimes, FaBus, FaChevronDown } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Navbar.module.css';

function Navbar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleNavLinkClick = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const navItems = [
    { path: '/', label: 'Home', icon: FaHome }
  ];

  const portalItems = [
    { path: '/student', label: 'Student', icon: FaUserGraduate },
    { path: '/admin', label: 'Official Login', icon: FaUserShield }
  ];

  if (location.pathname === '/admin/dashboard' || location.pathname === '/cancellation/dashboard') {
    return null;
  }

  return (
    <>
      <nav className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ''}`}>
        <div className={styles.container}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              to="/"
              className={styles.logoWrapper}
              onClick={() => {
                closeMobileMenu();
                handleNavLinkClick();
              }}
            >
              <div className={styles.logoIcon}>
                <FaBus />
              </div>
              <span className={styles.logoText}>E-PASS</span>
            </Link>
          </motion.div>
  
          {/* Desktop Navigation */}
          <div className={styles.desktopNav}>
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link
                    to={item.path}
                    className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}
                    onClick={handleNavLinkClick}
                  >
                    <Icon className={styles.navIcon} />
                    <span className={styles.navLabel}>{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className={styles.activeIndicator}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
  
            {/* Users Dropdown */}
            <div
              className={styles.dropdownContainer}
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <button className={`${styles.navLink} ${isDropdownOpen || portalItems.some(item => location.pathname === item.path) ? styles.dropdownActive : ''}`}>
                <FaUserGraduate className={styles.navIcon} />
                <span className={styles.navLabel}>Users</span>
                <FaChevronDown className={`${styles.chevron} ${isDropdownOpen ? styles.rotate : ''}`} />
                {portalItems.some(item => location.pathname === item.path) && (
                  <motion.div
                    layoutId="activeTab"
                    className={styles.activeIndicator}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
  
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    className={styles.dropdownMenu}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    {portalItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`${styles.dropdownItem} ${location.pathname === item.path ? styles.dropdownItemActive : ''}`}
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleNavLinkClick();
                        }}
                      >
                        <item.icon className={styles.dropdownIcon} />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
  
          {/* Mobile Menu Button */}
          <button
            className={styles.mobileMenuButton}
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation - Now outside the nav element to avoid stacking context issues */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className={styles.mobileMenuRoot}>
            <motion.div
              className={styles.mobileOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
            />
            <motion.div
              className={styles.mobileNav}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className={styles.mobileNavHeader}>
                <span className={styles.mobileNavTitle}>E-PASS</span>
                <button className={styles.closeMenuBtn} onClick={closeMobileMenu}>
                  <FaTimes />
                </button>
              </div>
              
              <div className={styles.mobileNavContent}>
                <div className={styles.mobileSectionTitle}>Quick Access</div>
                
                {/* Home Button */}
                <Link
                  to="/"
                  className={`${styles.mobileNavLink} ${styles.mobilePortalBtn} ${location.pathname === '/' ? styles.mobileActiveLink : ''}`}
                  onClick={() => {
                    closeMobileMenu();
                    handleNavLinkClick();
                  }}
                >
                  <div className={styles.portalIconWrapper}>
                    <FaHome />
                  </div>
                  <div className={styles.portalText}>
                    <span className={styles.portalLabel}>Home Page</span>
                    <span className={styles.portalDesc}>Return to Landing</span>
                  </div>
                </Link>

                {/* Student Login Button */}
                <Link
                  to="/student"
                  className={`${styles.mobileNavLink} ${styles.mobilePortalBtn} ${location.pathname === '/student' ? styles.mobileActiveLink : ''}`}
                  onClick={() => {
                    closeMobileMenu();
                    handleNavLinkClick();
                  }}
                >
                  <div className={styles.portalIconWrapper}>
                    <FaUserGraduate />
                  </div>
                  <div className={styles.portalText}>
                    <span className={styles.portalLabel}>Student Login</span>
                    <span className={styles.portalDesc}>Pass Management</span>
                  </div>
                </Link>

                {/* Official Login Button */}
                <Link
                  to="/admin"
                  className={`${styles.mobileNavLink} ${styles.mobilePortalBtn} ${location.pathname === '/admin' ? styles.mobileActiveLink : ''}`}
                  onClick={() => {
                    closeMobileMenu();
                    handleNavLinkClick();
                  }}
                >
                  <div className={styles.portalIconWrapper}>
                    <FaUserShield />
                  </div>
                  <div className={styles.portalText}>
                    <span className={styles.portalLabel}>Official Login</span>
                    <span className={styles.portalDesc}>Admin & Staff</span>
                  </div>
                </Link>
              </div>

              <div className={styles.mobileNavFooter}>
                <p>&copy; 2026 E-Bus Pass System</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;
