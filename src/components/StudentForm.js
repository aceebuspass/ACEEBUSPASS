import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUser, FaCalendarAlt, FaIdCard, FaGraduationCap, FaPhone,
  FaUserFriends, FaHome, FaBus, FaImage, FaIdBadge,
  FaUserGraduate, FaCheckCircle, FaExclamationTriangle,
  FaFileAlt, FaMapMarkerAlt, FaShieldAlt, FaSpinner, FaUniversity
} from 'react-icons/fa';
import styles from './StudentForm.module.css';
import { applyStudent, getRouteFees, getColleges } from '../utils/api';
import LocationAutocomplete from './LocationAutocomplete';

const INITIAL_FORM_STATE = {
  name: '',
  fatherName: '',
  dob: '',
  regNo: '',
  year: '',
  mobile: '',
  parentMobile: '',
  address: '',
  from: 'College',
  to: '',
  route: '',
  photo: null,
  aadharPhoto: null,
  collegeIdPhoto: null,
  college: '',
  userType: 'student',
  department: '',
  aadharNumber: '',
  busNumber: '',
  fee_amount: 0,
};

function StudentForm() {
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [routeOptions, setRouteOptions] = useState([]);
  const [toOptions, setToOptions] = useState([]);
  const [collegeList, setCollegeList] = useState([]);
  const [availableDepts, setAvailableDepts] = useState([]);
  const [collegesLoading, setCollegesLoading] = useState(true);

  useEffect(() => {
    getRouteFees().then(data => {
      setRouteOptions(data || []);
      const destinations = [...new Set(data.map(item => item.to))].filter(Boolean);
      setToOptions(destinations);
    }).catch(err => console.error('Error fetching routes:', err));

    getColleges().then(data => {
      setCollegeList(data || []);
    }).catch(() => {
      setCollegeList([
        { id: '1', name: 'Adhiyamaan college of engineering', departments: ['CSE','EEE','ECE','MECH','CIVIL'] },
        { id: '2', name: 'Adhiyamaan polytechnic college', departments: ['MECH','EEE','CIVIL'] },
        { id: '3', name: 'M.G.R college', departments: ['CSE','EEE'] },
        { id: '4', name: 'St.Peters medical college and hospital', departments: ['MBBS','Nursing','Pharmacy'] },
      ]);
    }).finally(() => setCollegesLoading(false));
  }, []);

  const handleCollegeChange = (e) => {
    const selectedName = e.target.value;
    const selectedCollege = collegeList.find(c => c.name === selectedName);
    setAvailableDepts(selectedCollege ? selectedCollege.departments : []);
    setForm(prev => ({ ...prev, college: selectedName, department: '' }));
    setError('');
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setForm(prev => ({ ...prev, [name]: files[0] || null }));
    } else if (name === 'mobile' || name === 'parentMobile') {
      const val = value.replace(/\D/g, '').slice(0, 10);
      setForm(prev => ({ ...prev, [name]: val }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
    setError('');
  };

  const handleRemoveFile = (field) => {
    setForm(prev => ({ ...prev, [field]: null }));
  };

  const validateForm = () => {
    const requiredFields = [
      { key: 'name', label: 'Full Name' },
      { key: 'fatherName', label: "Father's Name" },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'regNo', label: 'Registration Number' },
      { key: 'college', label: 'College Name' },
      { key: 'year', label: 'Year' },
      { key: 'department', label: 'Department' },
      { key: 'mobile', label: 'Mobile Number' },
      { key: 'parentMobile', label: "Parent's Mobile" },
      { key: 'address', label: 'Address' },
      { key: 'from', label: 'From (Origin)' },
      { key: 'to', label: 'To (Destination)' },
      { key: 'aadharNumber', label: 'Aadhar Number' },
      { key: 'busNumber', label: 'Bus Number' },
    ];

    const missing = requiredFields.filter(f => !form[f.key]).map(f => f.label);
    if (missing.length > 0) {
      return `Please fill in the following required fields: ${missing.join(', ')}`;
    }
    if (!form.photo || !form.collegeIdPhoto) {
      return 'Please upload both Profile Photo and ID/Fee Bill';
    }
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(form.mobile) || !mobileRegex.test(form.parentMobile)) {
      return 'Please enter valid 10-digit mobile numbers';
    }
    if (form.aadharNumber.length !== 12) {
      return 'Aadhar Number must be exactly 12 digits';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const matchingFee = routeOptions.find(opt => opt.to === form.to);
      const submitData = {
        ...form,
        route: matchingFee ? matchingFee.route : `${form.from} - ${form.to}`,
        fee_amount: matchingFee ? Number(matchingFee.fee_amount) : 0
      };

      const res = await applyStudent(submitData);

      if (res.message === 'Application submitted' || res.message === 'Application submitted successfully' || res.id) {
        setMessage('Application submitted successfully!');
        setForm(INITIAL_FORM_STATE);
        setAvailableDepts([]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setError(res.error || 'Submission failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className={styles.formWrapper}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>

        {/* Section 1: Personal Info */}
        <motion.div className={styles.card} variants={cardVariants} initial="hidden" animate="visible" transition={{ duration: 0.5 }}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}><FaUser /></div>
            <h3 className={styles.cardTitle}>Personal Information</h3>
          </div>
          <div className={styles.grid}>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Full Name</label>
              <div className={styles.inputWrapper}>
                <FaUser className={styles.inputIcon} />
                <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" required className={styles.input} />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Father's Name</label>
              <div className={styles.inputWrapper}>
                <FaUserFriends className={styles.inputIcon} />
                <input type="text" name="fatherName" value={form.fatherName} onChange={handleChange} placeholder="Father's Name" required className={styles.input} />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Date of Birth</label>
              <div className={styles.inputWrapper}>
                <FaCalendarAlt className={styles.inputIcon} />
                <input type="date" name="dob" value={form.dob} onChange={handleChange} required className={styles.input} />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Registration Number</label>
              <div className={styles.inputWrapper}>
                <FaIdCard className={styles.inputIcon} />
                <input type="text" name="regNo" value={form.regNo} onChange={handleChange} placeholder="CS123456" required className={styles.input} />
              </div>
            </div>

            {/* ── College Name — shown BEFORE Department ── */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>College Name</label>
              <div className={styles.inputWrapper}>
                <FaUniversity className={styles.inputIcon} />
                <select name="college" value={form.college} onChange={handleCollegeChange} required className={styles.select}>
                  <option value="">{collegesLoading ? 'Loading colleges...' : '-- Select College --'}</option>
                  {collegeList.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Department — filtered by selected college ── */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Department
                {!form.college && <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginLeft: '6px' }}>(select college first)</span>}
              </label>
              <div className={styles.inputWrapper}>
                <FaGraduationCap className={styles.inputIcon} />
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  required
                  disabled={!form.college || availableDepts.length === 0}
                  className={styles.select}
                  style={!form.college ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                >
                  <option value="">
                    {!form.college
                      ? 'Select college first'
                      : availableDepts.length === 0
                        ? 'No departments configured'
                        : '-- Select Department --'}
                  </option>
                  {availableDepts.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Year</label>
              <div className={styles.inputWrapper}>
                <FaGraduationCap className={styles.inputIcon} />
                <select name="year" value={form.year} onChange={handleChange} required className={styles.select}>
                  <option value="">Select Year</option>
                  <option value="I">I Year</option>
                  <option value="II">II Year</option>
                  <option value="III">III Year</option>
                  <option value="IV">IV Year</option>
                  <option value="V">V Year</option>
                </select>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Application Type</label>
              <div className={styles.inputWrapper}>
                <FaUserGraduate className={styles.inputIcon} />
                <select name="userType" value={form.userType} onChange={handleChange} className={styles.select}>
                  <option value="student">Student</option>
                  <option value="teaching_staff">Teaching Staff</option>
                  <option value="non_teaching_staff">Non-Teaching Staff</option>
                </select>
              </div>
            </div>

          </div>
        </motion.div>

        {/* Section 2: Contact Info */}
        <motion.div className={styles.card} variants={cardVariants} initial="hidden" animate="visible" transition={{ duration: 0.5, delay: 0.1 }}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}><FaPhone /></div>
            <h3 className={styles.cardTitle}>Contact Details</h3>
          </div>
          <div className={styles.grid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Mobile Number</label>
              <div className={styles.inputWrapper}>
                <FaPhone className={styles.inputIcon} />
                <input type="tel" name="mobile" value={form.mobile} onChange={handleChange} placeholder="9876543210" required className={styles.input} />
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Parent's Mobile</label>
              <div className={styles.inputWrapper}>
                <FaUserFriends className={styles.inputIcon} />
                <input type="tel" name="parentMobile" value={form.parentMobile} onChange={handleChange} placeholder="8765432109" required className={styles.input} />
              </div>
            </div>
            <div className={styles.fullWidth}>
              <label className={styles.label}>Residential Address</label>
              <LocationAutocomplete
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Search or enter your full residential address"
                icon={FaHome}
                className={styles.inputWrapper}
                inputClassName={styles.input}
                iconClassName={styles.inputIcon}
              />
            </div>
          </div>
        </motion.div>

        {/* Section 3: Journey Details */}
        <motion.div className={styles.card} variants={cardVariants} initial="hidden" animate="visible" transition={{ duration: 0.5, delay: 0.2 }}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}><FaBus /></div>
            <h3 className={styles.cardTitle}>Journey Details</h3>
          </div>
          <div className={styles.grid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>From (Origin)</label>
              <div className={styles.inputWrapper}>
                <FaMapMarkerAlt className={styles.inputIcon} />
                <input type="text" name="from" value={form.from} readOnly className={styles.readOnlyInput} />
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>To (Destination)</label>
              <LocationAutocomplete
                name="to"
                value={form.to}
                onChange={(e) => {
                  const val = e.target.value;
                  const matchingFee = routeOptions.find(opt => opt.to === val);
                  if (matchingFee) {
                    setForm(prev => ({ ...prev, to: val, route: matchingFee.route, fee_amount: matchingFee.fee_amount }));
                  } else {
                    setForm(prev => ({ ...prev, to: val }));
                  }
                }}
                placeholder="Search your destination..."
                className={styles.inputWrapper}
                localSuggestions={toOptions}
                inputClassName={styles.input}
                iconClassName={styles.inputIcon}
                icon={FaMapMarkerAlt}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Bus Number</label>
              <div className={styles.inputWrapper}>
                <FaBus className={styles.inputIcon} />
                <input type="text" name="busNumber" value={form.busNumber} onChange={handleChange} placeholder="e.g. 15 or TN24-1234" required className={styles.input} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 4: Documents */}
        <motion.div className={styles.card} variants={cardVariants} initial="hidden" animate="visible" transition={{ duration: 0.5, delay: 0.3 }}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}><FaFileAlt /></div>
            <h3 className={styles.cardTitle}>Required Documents</h3>
          </div>
          <div className={styles.grid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Aadhar Number</label>
              <div className={styles.inputWrapper}>
                <FaIdBadge className={styles.inputIcon} />
                <input type="text" name="aadharNumber" value={form.aadharNumber} onChange={handleChange} placeholder="12-digit number" maxLength={12} required className={styles.input} />
              </div>
            </div>
            <div className={styles.fullWidth}>
              <div className={styles.fileUploadGrid}>
                {[
                  { label: 'Profile Photo', name: 'photo', icon: FaUser, required: true },
                  { label: 'Aadhar Copy (Optional)', name: 'aadharPhoto', icon: FaIdBadge, required: false },
                  { label: 'ID / Fee Bill', name: 'collegeIdPhoto', icon: FaImage, required: true }
                ].map((doc) => (
                  <div key={doc.name} className={`${styles.fileBox} ${!doc.required ? styles.optional : ''}`}>
                    <label className={styles.fileLabel}>
                      <doc.icon />
                      <span>{doc.label}</span>
                      <input type="file" name={doc.name} accept="image/*" onChange={handleChange} className={styles.hiddenInput} />
                    </label>
                    {form[doc.name] && (
                      <div className={styles.fileBadge}>
                        <span className={styles.fileIndicator} title={form[doc.name].name}>
                          {form[doc.name].name.length > 15 ? form[doc.name].name.substring(0, 15) + '...' : form[doc.name].name}
                        </span>
                        <button type="button" onClick={() => handleRemoveFile(doc.name)} className={styles.removeFile}>&times;</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={styles.errorBanner}>
              <FaExclamationTriangle /> {error}
            </motion.div>
          )}
          {message && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={styles.successBanner}>
              <FaCheckCircle /> {message}
            </motion.div>
          )}
        </AnimatePresence>

        <div className={styles.submitSection}>
          <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
            {isSubmitting ? (
              <><FaSpinner className={styles.spin} /> Processing Application...</>
            ) : (
              <><FaShieldAlt /> Submit Secure Application</>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}

export default StudentForm;
