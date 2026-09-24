import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaArrowRight,
  FaBus,
  FaCheckCircle,
  FaClock,
  FaMobile,
  FaQrcode,
  FaShieldAlt,
  FaUserGraduate
} from 'react-icons/fa';
import { gsap } from 'gsap';
import styles from './Home.module.css';

function Home() {
  const navigate = useNavigate();
  const homeRef = useRef(null);

  const features = [
    {
      icon: FaQrcode,
      title: 'Instant QR Validation',
      description: 'Scan-ready passes with fast verification flow for students and staff at every checkpoint.'
    },
    {
      icon: FaShieldAlt,
      title: 'Verified Access Control',
      description: 'Built for approvals, department workflows, and fraud-resistant student travel identity.'
    },
    {
      icon: FaMobile,
      title: 'Mobile-First Experience',
      description: 'Apply, pay, download, and manage the full bus pass journey from a polished mobile interface.'
    },
    {
      icon: FaClock,
      title: 'Faster Turnaround',
      description: 'Clear status tracking and role-based dashboards keep applications moving without confusion.'
    }
  ];

  const heroStats = [
    { value: '10K+', label: 'Passes Managed' },
    { value: '24/7', label: 'Verification Ready' },
    { value: '4 Roles', label: 'Admin Workflow' }
  ];

  const journeyPoints = [
    'Students apply once with streamlined digital onboarding.',
    'Officials verify faster with a clearer multi-step approval chain.',
    'Generated passes stay secure, searchable, and ready for campus transit.'
  ];

  const portalCards = [
    {
      icon: FaUserGraduate,
      title: 'Student Portal',
      description: 'Track application status, pay fees, and carry your digital pass with confidence.',
      button: 'Open Student Login',
      action: () => navigate('/student')
    },
    {
      icon: FaShieldAlt,
      title: 'Official Portal',
      description: 'Manage approvals, validation, and operational visibility across the full workflow.',
      button: 'Open Official Login',
      action: () => navigate('/admin')
    }
  ];

  const handleApply = () => {
    navigate('/apply');
  };

  useEffect(() => {
    document.body.classList.add('home-page');

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-gsap="hero-copy"] > *',
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.78,
          ease: 'power3.out',
          stagger: 0.1
        }
      );

      gsap.fromTo(
        '[data-gsap="hero-visual"]',
        { opacity: 0, x: 28, y: 24 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          delay: 0.2
        }
      );

      gsap.to('[data-gsap="ambient-left"]', {
        y: -24,
        x: 12,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      gsap.to('[data-gsap="ambient-right"]', {
        y: 20,
        x: -10,
        duration: 5.3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      gsap.fromTo(
        '[data-gsap="feature-card"]',
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.08,
          scrollTrigger: undefined
        }
      );
    }, homeRef);

    let frameId = null;

    const updateParallax = () => {
      if (!homeRef.current) return;
      const scrollY = window.scrollY || 0;
      homeRef.current.style.setProperty('--hero-shift', `${Math.min(scrollY * 0.16, 120)}px`);
      homeRef.current.style.setProperty('--ambient-shift', `${Math.min(scrollY * 0.08, 60)}px`);
      frameId = null;
    };

    const handleScroll = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateParallax);
    };

    updateParallax();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.body.classList.remove('home-page');
      window.removeEventListener('scroll', handleScroll);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      ctx.revert();
    };
  }, []);

  return (
    <div className={styles.homeRoot} ref={homeRef}>
      <div className={styles.ambientLeft} data-gsap="ambient-left" />
      <div className={styles.ambientRight} data-gsap="ambient-right" />

      <section className={styles.heroSection}>
        <div className={styles.heroGrid}>
          <motion.div
            className={styles.heroCopy}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            data-gsap="hero-copy"
          >
            <div className={styles.heroEyebrow}>
              <span className={styles.eyebrowDot} />
              AERI Smart Transit Platform
            </div>

            <h1 className={styles.heroTitle}>
              Premium Digital
              <span className={styles.heroAccent}> Bus Pass Experience</span>
            </h1>

            <p className={styles.heroDescription}>
              A cleaner, faster, and more trustworthy way to manage student travel.
              From application to approval to verification, every step is designed to feel modern.
            </p>

            <div className={styles.heroActions}>
              <motion.button
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={styles.primaryButton}
                onClick={handleApply}
              >
                Start Application
                <FaArrowRight />
              </motion.button>

              <motion.button
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={styles.secondaryButton}
                onClick={() => document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Explore Experience
              </motion.button>
            </div>

            <div className={styles.heroStats}>
              {heroStats.map((stat) => (
                <div key={stat.label} className={styles.statCard}>
                  <span className={styles.statValue}>{stat.value}</span>
                  <span className={styles.statLabel}>{stat.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className={styles.heroVisual} data-gsap="hero-visual">
            <div className={styles.visualFrame}>
              <div className={styles.visualImage}>
                <div className={styles.imageBadge}>Campus Transit View</div>
              </div>

              <div className={styles.visualPanel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.panelKicker}>Workflow Snapshot</p>
                    <h3 className={styles.panelTitle}>Designed for speed, clarity, and trust</h3>
                  </div>
                  <div className={styles.panelBusIcon}>
                    <FaBus />
                  </div>
                </div>

                <div className={styles.panelList}>
                  {journeyPoints.map((point) => (
                    <div key={point} className={styles.panelListItem}>
                      <FaCheckCircle />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="experience" className={styles.featuresSection}>
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>Curated Experience</p>
          <h2 className={styles.sectionTitle}>A fresh landing page built for a premium first impression</h2>
          <p className={styles.sectionDescription}>
            The interface now leads with stronger structure, cleaner motion, and a more intentional visual language.
          </p>
        </div>

        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              className={styles.featureCard}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.2 }}
              data-gsap="feature-card"
            >
              <div className={styles.featureIcon}>
                <feature.icon />
              </div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureText}>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className={styles.accessSection}>
        <div className={styles.accessStory}>
          <p className={styles.sectionEyebrow}>Portal Access</p>
          <h2 className={styles.accessTitle}>Everything important is clearer, calmer, and easier to reach</h2>
          <p className={styles.accessText}>
            The new landing page separates platform value, workflow clarity, and portal entry points so users know exactly where to go next.
          </p>
        </div>

        <div className={styles.portalGrid}>
          {portalCards.map((portal) => (
            <motion.div
              key={portal.title}
              className={styles.portalCard}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <div className={styles.portalIcon}>
                <portal.icon />
              </div>
              <h3 className={styles.portalTitle}>{portal.title}</h3>
              <p className={styles.portalText}>{portal.description}</p>
              <button className={styles.portalButton} onClick={portal.action}>
                {portal.button}
                <FaArrowRight />
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <p className={styles.sectionEyebrow}>Ready to launch</p>
          <h2 className={styles.ctaTitle}>Give students a landing page that feels modern before they even log in</h2>
          <p className={styles.ctaText}>
            Clean visuals, better hierarchy, and a more premium travel identity now define the home experience.
          </p>
          <motion.button
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={styles.ctaButton}
            onClick={handleApply}
          >
            Apply for E-Pass
            <FaArrowRight />
          </motion.button>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>&copy; 2026 E-Pass. Smart mobility for campus travel.</p>
        <p className={styles.footerSubtext}>Designed for a cleaner first impression and smoother student journey.</p>
      </footer>
    </div>
  );
}

export default Home;
