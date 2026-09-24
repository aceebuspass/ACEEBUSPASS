export const validateStudentApplication = (req, res, next) => {
  const { name, dob, regNo, branchYear, mobile, parentMobile, address, route, validity, aadharNumber } = req.body;

  const errors = [];

  if (!name || name.trim().length < 2) errors.push('Name must be at least 2 characters long');
  if (!dob) errors.push('Date of birth is required');
  if (!regNo || !/^[A-Za-z0-9]+$/.test(regNo)) errors.push('Valid registration number is required');
  if (!branchYear) errors.push('Branch and year are required');
  if (!mobile || !/^\d{10}$/.test(mobile)) errors.push('Valid 10-digit mobile number is required');
  if (!parentMobile || !/^\d{10}$/.test(parentMobile)) errors.push('Valid 10-digit parent mobile number is required');
  if (!address || address.trim().length < 5) errors.push('Valid address is required');
  if (!route) errors.push('Route is required');
  if (!validity) errors.push('Validity period is required');
  if (!aadharNumber || !/^\d{12}$/.test(aadharNumber)) errors.push('Valid 12-digit Aadhar number is required');

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors
    });
  }

  next();
};