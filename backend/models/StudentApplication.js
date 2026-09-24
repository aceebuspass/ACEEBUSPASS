const mongoose = require('mongoose');

const StudentApplicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dob: { type: String, required: true },
  regNo: { type: String, required: true },
  branchYear: { type: String, required: true },
  mobile: { type: String, required: true },
  parentMobile: { type: String, required: true },
  address: { type: String, required: true },
  route: { type: String, required: true },
  validity: { type: String, required: true },
  photo: { type: String }, // store file path or base64 string
  aadharNumber: { type: String, required: true },
  aadharPhoto: { type: String }, // store file path or base64 string
  collegeIdPhoto: { type: String }, // store file path or base64 string
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  qrData: { type: String }, // store QR data if approved
}, { timestamps: true });

// This file is obsolete. Student applications are now handled in SQLite.
module.exports = null; // Prevents any mongoose model export