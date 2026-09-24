const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const router = express.Router();

/** Public-safe student shape (matches login response) for status polling. */
function toSafeStudent(student) {
  if (!student) return null;
  const { aadharNumber, aadharPhoto, collegeIdPhoto, ...safe } = student;
  safe.validTill = student.validity;
  if (student.branchYear) {
    const parts = student.branchYear.split(/[-\/\s]+/);
    safe.year = parts.length >= 2 ? parts[parts.length - 1] : '';
    safe.branch = parts.length >= 2 ? parts.slice(0, -1).join(' ') : student.branchYear;
  }
  return safe;
}

// Helper to get Razorpay instance
function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys not configured.');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// =============================
// Cancellation Routes
// =============================

router.post("/request-cancellation", async (req, res) => {
  try {
    const { regNo, reason } = req.body || {};
    if (!regNo) return res.status(400).json({ error: "Registration number is required" });

    const collection = req.mongo.collection("student_applications");
    const student = await collection.findOne({ regNo });

    if (!student) return res.status(404).json({ error: "Student not found" });
    if (student.status !== 'approved') return res.status(400).json({ error: "Only approved passes can be cancelled" });
    if (student.cancelled) return res.status(400).json({ error: "Pass is already cancelled" });
    if (student.cancellation_requested) return res.status(400).json({ error: "Cancellation already requested" });

    await collection.updateOne(
      { regNo },
      { 
        $set: { 
          cancellation_requested: 1,
          cancellation_reason: reason || 'No reason provided',
          cancellation_requested_at: new Date().toISOString(),
          hod_approval: 'pending',
          principal_approval: 'pending',
          updatedAt: new Date().toISOString()
        } 
      }
    );

    return res.json({ message: "Cancellation request submitted successfully" });
  } catch (err) {
    console.error("Error in request-cancellation:", err);
    return res.status(500).json({ error: "Failed to process cancellation request" });
  }
});

router.get("/cancellation-status/:regNo", async (req, res) => {
  try {
    const { regNo } = req.params;
    if (!regNo) return res.status(400).json({ error: "Registration number is required" });

    const student = await req.mongo.collection("student_applications").findOne({ regNo });
    if (!student) return res.status(404).json({ error: "Student not found" });

    res.json({
      success: true,
      cancellationRequested: !!student.cancellation_requested,
      cancellationReason: student.cancellation_reason || null,
      isCancelled: !!student.cancelled,
      cancelledAt: student.cancelled_at || null,
      cancelledBy: student.cancelled_by || null
    });
  } catch (err) {
    console.error("Error in cancellation-status:", err);
    res.status(500).json({ error: "Failed to check cancellation status" });
  }
});

// =============================
// System Settings
// =============================

router.get("/system-settings", async (req, res) => {
  try {
    const settings = await req.mongo.collection("system_settings").find({}).toArray();
    const settingsMap = {};
    settings.forEach(s => settingsMap[s.key] = s.value);
    res.json(settingsMap);
  } catch (err) {
    console.error("Error fetching settings:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// =============================
// Student Details & Verification
// =============================

router.get("/details/:regNo", async (req, res) => {
  try {
    const { regNo } = req.params;
    const student = await req.mongo.collection("student_applications").findOne({ regNo });
    if (!student) return res.status(404).json({ error: "Student not found" });
    
    // Map for frontend
    const result = { ...student, validTill: student.validity };
    res.json(result);
  } catch (err) {
    console.error("Error fetching details:", err);
    res.status(500).json({ error: "Failed to fetch details" });
  }
});

router.get("/verify-pass/:regNo", async (req, res) => {
  try {
    const { regNo } = req.params;
    const student = await req.mongo.collection("student_applications").findOne({ regNo });
    if (!student) return res.status(404).json({ error: "Pass not found" });

    // Handle branchYear parsing
    let branch = '', year = '';
    if (student.branchYear) {
      const parts = student.branchYear.split(/[-\/\s]+/);
      if (parts.length >= 2) {
        year = parts[parts.length - 1];
        branch = parts.slice(0, -1).join(' ');
      } else branch = student.branchYear;
    }

    res.json({
      ...student,
      branch,
      year,
      validTill: student.validity,
      cancelled: !!student.cancelled
    });
  } catch (err) {
    console.error("Error verifying pass:", err);
    res.status(500).json({ error: "Failed to verify pass" });
  }
});

router.get("/pass/:regNo", async (req, res) => {
  try {
    const { regNo } = req.params;
    const student = await req.mongo.collection("student_applications").findOne({ regNo, status: 'approved' });
    if (!student) return res.status(404).json({ error: "Student not found or not approved" });

    let qrData = null;
    if (student.qrData) {
      try { qrData = JSON.parse(student.qrData); } catch (e) { console.error("QR Parse Error"); }
    }

    let branch = '', year = '';
    if (student.branchYear) {
      const parts = student.branchYear.split(/[-\/\s]+/);
      if (parts.length >= 2) {
        year = parts[parts.length - 1];
        branch = parts.slice(0, -1).join(' ');
      } else branch = student.branchYear;
    }

    res.json({
      ...student,
      branch,
      year,
      validTill: student.validity,
      qrData
    });
  } catch (err) {
    console.error("Error fetching pass:", err);
    res.status(500).json({ error: "Failed to fetch pass data" });
  }
});

// =============================
// Application & Login
// =============================

// Use /tmp for uploads on Vercel as it's the only writable region
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"));
  }
});

router.post("/apply", upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "aadharPhoto", maxCount: 1 },
  { name: "collegeIdPhoto", maxCount: 1 }
]), async (req, res) => {
  try {
    const data = req.body;
    const files = req.files || {};

    // Validate
    const required = ['name', 'fatherName', 'dob', 'regNo', 'year', 'mobile', 'parentMobile', 'address', 'route', 'department', 'college', 'aadharNumber'];
    const missing = required.filter(f => !data[f]);
    if (missing.length > 0) return res.status(400).json({ error: `Missing: ${missing.join(', ')}` });

    const collection = req.mongo.collection("student_applications");
    const existing = await collection.findOne({ regNo: data.regNo });
    if (existing) return res.status(400).json({ error: "Registration number already exists" });

    if (!files.photo || !files.collegeIdPhoto) return res.status(400).json({ error: "Photo and College ID are required" });

    const photo = `/uploads/${files.photo[0].filename}`;
    const aadharPhoto = files.aadharPhoto ? `/uploads/${files.aadharPhoto[0].filename}` : null;
    const collegeIdPhoto = `/uploads/${files.collegeIdPhoto[0].filename}`;

    const now = new Date();
    const passNo = `BP-${data.regNo}-${now.getTime()}`;
    
    const validityDate = new Date();
    validityDate.setFullYear(validityDate.getFullYear() + 1);
    const validity = validityDate.toISOString().split('T')[0];

    const application = {
      ...data,
      photo,
      aadharPhoto,
      collegeIdPhoto,
      validity,
      passNo,
      status: 'pending',
      branchYear: `${data.department} - ${data.year}`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      cancellation_requested: 0,
      cancelled: 0,
      payment_status: 'unpaid'
    };

    const result = await collection.insertOne(application);
    res.json({ message: "Application submitted successfully", id: result.insertedId });
  } catch (err) {
    console.error("Apply Error:", err);
    res.status(500).json({ error: "Failed to submit application" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { regNo, dob } = req.body;
    if (!regNo || !dob) return res.status(400).json({ error: "RegNo and DOB required" });

    const student = await req.mongo.collection("student_applications").findOne({ regNo, dob });
    if (!student) return res.status(404).json({ error: "Student not found" });

    res.json(toSafeStudent(student));
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

/** Full student snapshot for dashboard refresh (same fields as login, no secrets). */
router.get("/status/:regNo", async (req, res) => {
  try {
    const { regNo } = req.params;
    if (!regNo) return res.status(400).json({ error: "Registration number is required" });
    const student = await req.mongo.collection("student_applications").findOne({ regNo });
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(toSafeStudent(student));
  } catch (err) {
    console.error("status:", err);
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

router.post("/upload-fees-bill", upload.single("feesBill"), async (req, res) => {
  try {
    const { regNo } = req.body;
    if (!regNo || !req.file) return res.status(400).json({ error: "RegNo and file required" });

    const feesBillPhoto = `/uploads/${req.file.filename}`;
    const result = await req.mongo.collection("student_applications").updateOne(
      { regNo },
      { $set: { feesBillPhoto, updatedAt: new Date().toISOString() } }
    );

    if (result.matchedCount === 0) return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Uploaded successfully", filePath: feesBillPhoto });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// =============================
// Payment Routes
// =============================

router.get('/get-fee/:route', async (req, res) => {
  try {
    const { route } = req.params;
    const decodedRoute = decodeURIComponent(route);
    const collection = req.mongo.collection("route_fees");

    // Strategy 1: exact route match (any is_active value)
    let feeRecord = await collection.findOne({ route: decodedRoute });

    // Strategy 2: case-insensitive exact match
    if (!feeRecord) {
      feeRecord = await collection.findOne({
        route: { $regex: new RegExp(`^${decodedRoute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
    }

    // Strategy 3: match by destination part of the route string
    if (!feeRecord && decodedRoute.includes(' - ')) {
      // e.g. student route "AERI - Krishnagiri, New Bus Station"
      // fee route "College - Krishnagiri, New Bus Station Inner"
      // extract everything after " - " and do fuzzy match
      const destinationPart = decodedRoute.split(' - ').slice(1).join(' - ').trim();
      const destWords = destinationPart.split(/[,\s]+/).filter(w => w.length > 3);

      // Find all active fees and pick the one whose destination matches best
      const allFees = await collection.find({}).toArray();
      for (const fee of allFees) {
        const feeDestination = (fee.to || fee.route?.split(' - ').slice(1).join(' - ') || '').toLowerCase();
        const matchCount = destWords.filter(word => feeDestination.includes(word.toLowerCase())).length;
        if (matchCount >= Math.min(2, destWords.length)) {
          feeRecord = fee;
          break;
        }
      }
    }

    // Strategy 4: search within route field
    if (!feeRecord) {
      const keywords = decodedRoute.split(/[\s,]+/).filter(w => w.length > 4);
      if (keywords.length > 0) {
        const allFees = await collection.find({}).toArray();
        for (const fee of allFees) {
          const routeStr = (fee.route || '').toLowerCase();
          const matchCount = keywords.filter(kw => routeStr.includes(kw.toLowerCase())).length;
          if (matchCount >= Math.min(2, keywords.length)) {
            feeRecord = fee;
            break;
          }
        }
      }
    }

    if (!feeRecord) return res.status(404).json({ error: "Fee not configured for this route. Please contact admin." });
    res.json({ ...feeRecord, id: feeRecord._id.toString(), fee_amount: Number(feeRecord.fee_amount) });
  } catch (err) {
    console.error("Fee Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch fee" });
  }
});

router.post('/create-payment-order', async (req, res) => {
  try {
    const { regNo, amount } = req.body;
    const student = await req.mongo.collection("student_applications").findOne({ regNo });
    if (!student) return res.status(404).json({ error: "Student not found" });

    // Determine the fee amount with multiple fallbacks
    let finalAmount = Number(amount); // frontend-provided amount

    if (!finalAmount || finalAmount <= 0) {
      // Fallback 1: student record has fee_amount stored
      if (student.fee_amount) {
        finalAmount = Number(student.fee_amount);
      }
      // Fallback 2: look up route fees with fuzzy matching
      else if (student.route) {
        const routeFees = await req.mongo.collection("route_fees").find({}).toArray();
        const studentRoute = student.route.toLowerCase();
        const destPart = studentRoute.includes(' - ')
          ? studentRoute.split(' - ').slice(1).join(' - ').trim()
          : studentRoute;
        const destWords = destPart.split(/[,\s]+/).filter(w => w.length > 3);

        let bestFee = null;
        for (const fee of routeFees) {
          const feeRoute = (fee.route || '').toLowerCase();
          const feeDest = (fee.to || feeRoute).toLowerCase();

          // Try exact match first
          if (feeRoute === studentRoute) { bestFee = fee; break; }

          // Try destination keyword match
          const matchCount = destWords.filter(w => feeDest.includes(w)).length;
          if (matchCount >= Math.min(2, destWords.length)) {
            bestFee = fee;
            break;
          }
        }
        if (bestFee) finalAmount = Number(bestFee.fee_amount);
        else return res.status(400).json({ error: "Fee not configured for your route. Please contact admin." });
      } else {
        return res.status(400).json({ error: "Amount is required" });
      }
    }

    if (!finalAmount || finalAmount <= 0) {
      return res.status(400).json({ error: "Invalid fee amount. Please contact admin." });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return res.status(500).json({ error: "Razorpay keys not configured on server." });
    }

    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100), // rupees to paise
      currency: "INR",
      receipt: `receipt_${regNo}_${Date.now()}`
    });

    await req.mongo.collection("student_applications").updateOne(
      { regNo },
      { $set: { razorpay_order_id: order.id, fee_amount: finalAmount, updatedAt: new Date().toISOString() } }
    );

    res.json({
      keyId,
      orderId: order.id,
      amount: finalAmount,   // rupees (frontend will multiply by 100 for Razorpay options)
      currency: order.currency,
      receipt: order.receipt
    });
  } catch (err) {
    console.error("Payment Order Error:", err);
    res.status(500).json({ error: err.message || "Failed to create payment order" });
  }
});

router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, regNo } = req.body;
    
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const generated_signature = crypto.createHmac('sha256', keySecret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      await req.mongo.collection("student_applications").updateOne(
        { regNo },
        { 
          $set: { 
            payment_status: 'paid',
            payment_id: razorpay_payment_id,
            payment_date: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } 
        }
      );
      res.json({ success: true, message: "Payment verified" });
    } else {
      res.status(400).json({ success: false, message: "Signature mismatch" });
    }
  } catch (err) {
    console.error("Verification Error:", err);
    res.status(500).json({ error: "Failed to verify" });
  }
});

router.get('/payment-status/:regNo', async (req, res) => {
  try {
    const { regNo } = req.params;
    const student = await req.mongo.collection("student_applications").findOne({ regNo });
    if (!student) return res.status(404).json({ error: "Student not found" });

    res.json({
      payment_status: student.payment_status || 'unpaid',
      payment_id: student.payment_id || null,
      payment_amount: student.fee_amount || null,
      payment_date: student.payment_date || null
    });
  } catch (err) {
    console.error("Payment Status Error:", err);
    res.status(500).json({ error: "Failed to fetch payment status" });
  }
});

module.exports = router;

