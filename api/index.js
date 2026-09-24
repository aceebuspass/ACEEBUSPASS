// Vercel Bridge v3.0 - Self-contained CJS
'use strict';

// Load env vars
try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch(e) {}

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── MongoDB singleton ──────────────────────────────────────────────────────────
let _db = null;
async function getDB() {
  if (_db) return _db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    connectTimeoutMS: 5000, serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  _db = client.db('ebuspass');
  return _db;
}

// DB middleware
app.use(async (req, res, next) => {
  try {
    req.mongo = await getDB();
    // Use student_applications as the primary collection for both local and prod
    req.applications = req.mongo.collection('student_applications');
    next();
  } catch (err) {
    console.error('DB connect error:', err.message);
    res.status(503).json({ error: 'Database unavailable', details: err.message });
  }
});

// Multer - use /tmp for serverless
const storage = multer.memoryStorage(); // Use memory for serverless to convert to B64
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Helper to handle image uploads to Base64 (persistent on Vercel)
async function handleFileUpload(file) {
  if (!file) return null;
  const b64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${b64}`;
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', db: req.mongo ? 'Connected' : 'N/A', env: process.env.NODE_ENV });
});

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    // Hardcoded admin
    if (username === 'admin' && password === 'Admin@demo') {
      return res.json({ message: 'Login successful', token: 'admin-token',
        user: { id: 0, username: 'admin', role: 'admin', name: 'System Administrator' } });
    }
    const user = await req.mongo.collection('admin_users').findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // Check if password matches (handling both hashed and plain text for transition)
    let isMatch = false;
    const isHashed = user.password && user.password.startsWith('$2');
    
    if (isHashed) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = (password === user.password);
      // If it's a plain text match, we should hash it now for future safety
      if (isMatch) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await req.mongo.collection("admin_users").updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );
      }
    }

    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ message: 'Login successful', token: `${user.role}-token`,
      user: { id: user._id, username: user.username, role: user.role, department: user.department, name: user.name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reset password route for Admin/HOD/Principal
app.post('/api/admin/reset-password', async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;
    if (!username || !oldPassword || !newPassword) return res.status(400).json({ error: 'Missing required fields' });

    const user = await req.mongo.collection("admin_users").findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let isMatch = false;
    const isHashed = user.password && user.password.startsWith('$2');
    if (isHashed) {
      isMatch = await bcrypt.compare(oldPassword, user.password);
    } else {
      isMatch = (oldPassword === user.password);
    }

    if (!isMatch) return res.status(401).json({ error: 'Invalid old password' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await req.mongo.collection("admin_users").updateOne(
      { username },
      { $set: { password: hashedPassword, updatedAt: new Date().toISOString() } }
    );

    res.json({ message: 'Password reset successful' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Force Reset Staff Password
app.post('/api/admin/force-reset-password', async (req, res) => {
  try {
    const { targetUsername, newPassword, adminToken } = req.body;
    if (adminToken !== 'admin-token') return res.status(403).json({ error: 'Unauthorized' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const result = await req.mongo.collection("admin_users").updateOne(
      { username: targetUsername },
      { $set: { password: hashedPassword, updatedAt: new Date().toISOString() } }
    );

    if (result.matchedCount === 0) return res.status(404).json({ error: 'Staff user not found' });
    res.json({ message: 'Password updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: List staff users
app.get('/api/admin/staff-users', async (req, res) => {
  try {
    const users = await req.mongo.collection("admin_users").find({}, { projection: { password: 0 } }).toArray();
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Add new staff member
app.post('/api/admin/add-staff', async (req, res) => {
  try {
    const { username, password, role, department, adminToken } = req.body;
    if (adminToken !== 'admin-token') return res.status(403).json({ error: 'Unauthorized' });

    const existing = await req.mongo.collection("admin_users").findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await req.mongo.collection("admin_users").insertOne({
      username,
      password: hashedPassword,
      role,
      department: role === 'hod' ? department : null,
      name: `${role.toUpperCase()} ${department || ''}`,
      createdAt: new Date().toISOString()
    });

    res.json({ message: 'Staff member added successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/applications', async (req, res) => {
  try {
    const { role, department, status } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;
    if (role === 'hod' && department) {
      query.$or = [{ department: department }, { branchYear: new RegExp(`^${department}`, 'i') }];
    }
    const apps = await req.applications.aggregate([
      { $match: query },
      { $sort: { _id: -1 } }
    ], { allowDiskUse: true }).toArray();
    res.json(apps.map(a => ({ ...a, id: a._id.toString(), regNo: a.regNo || a.reg_no })));
  } catch (err) {
    console.error('admin applications fetch failed', err);
    res.status(500).json({ error: err.message || 'Failed to fetch applications' });
  }
});

const generatePassData = async (req, appRecord, countOffset = 1) => {
  const currentYear = new Date().getFullYear();
  const count = await req.applications.countDocuments({ passNumber: { $ne: null } });
  const passNumber = appRecord.passNumber || `PASS-${currentYear}-${String(count + countOffset).padStart(4, '0')}`;
  
  const qrData = JSON.stringify({
    name: appRecord.name,
    regNo: appRecord.regNo || appRecord.reg_no,
    route: appRecord.route,
    passNumber,
    approvedAt: new Date().toISOString()
  });

  return { passNumber, qrData };
};

app.post('/api/admin/approve', async (req, res) => {
  try {
    const { id } = req.body;
    const appRecord = await req.applications.findOne({ _id: new ObjectId(id) });
    if (!appRecord) return res.status(404).json({ error: 'Application not found' });

    const update = { 
      status: 'approved', 
      updatedAt: new Date().toISOString() 
    };

    // If payment is already offline or waived, generate pass immediately
    if (appRecord.payment_status === 'offline' || appRecord.payment_status === 'waived' || appRecord.payment_status === 'verified') {
      const { passNumber, qrData } = await generatePassData(req, appRecord);
      update.passNumber = passNumber;
      update.qrData = qrData;
      update.pass_approved = true;
    }

    await req.applications.updateOne({ _id: new ObjectId(id) }, { $set: update });
    res.json({ message: 'Approved successfully', passNumber: update.passNumber });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/reject', async (req, res) => {
  try {
    const { id, reason } = req.body;
    await req.applications.updateOne(
      { _id: new ObjectId(id) }, 
      { $set: { status: 'rejected', rejection_reason: reason, updatedAt: new Date().toISOString() } }
    );
    res.json({ message: 'Rejected successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/applications/:id', async (req, res) => {
  try {
    await req.applications.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/applications/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    delete updates._id;
    delete updates.id;
    await req.applications.updateOne({ _id: new ObjectId(req.params.id) }, { $set: updates });
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/payment-details', async (req, res) => {
  try {
    const apps = await req.applications.find({ 
      payment_status: { $in: ['paid', 'verified', 'processing', 'offline', 'waived'] } 
    }).sort({ updatedAt: -1, payment_date: -1 }).allowDiskUse(true).toArray();
    res.json(apps.map(a => ({ ...a, id: a._id.toString(), regNo: a.regNo || a.reg_no })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/approve-payment-pass', async (req, res) => {
  try {
    const { id } = req.body;
    const appRecord = await req.applications.findOne({ _id: new ObjectId(id) });
    if (!appRecord) return res.status(404).json({ error: 'Application not found' });

    const { passNumber, qrData } = await generatePassData(req, appRecord);

    await req.applications.updateOne(
      { _id: new ObjectId(id) }, 
      { $set: { 
          pass_approved: true, 
          status: 'approved', 
          payment_status: 'verified',
          passNumber,
          qrData,
          updatedAt: new Date().toISOString() 
        } 
      }
    );
    res.json({ message: 'Pass approved and issued' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/reject-payment-pass', async (req, res) => {
  try {
    const { id, reason } = req.body;
    await req.applications.updateOne(
      { _id: new ObjectId(id) }, { $set: { pass_approved: false, status: 'rejected', rejection_reason: reason, updatedAt: new Date().toISOString() } });
    res.json({ message: 'Pass rejected' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin: Mark payment as offline / waived / unpaid ──────────────────────────
app.post('/api/admin/mark-payment', async (req, res) => {
  try {
    const { id, payment_type, note } = req.body;
    // payment_type: 'offline' | 'waived' | 'unpaid'
    if (!['offline', 'waived', 'unpaid'].includes(payment_type)) {
      return res.status(400).json({ error: 'Invalid payment_type. Must be offline, waived, or unpaid.' });
    }

    const appRecord = await req.applications.findOne({ _id: new ObjectId(id) });
    if (!appRecord) return res.status(404).json({ error: 'Application not found' });

    const update = {
      payment_status: payment_type,
      payment_note: note || '',
      payment_marked_at: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (payment_type === 'offline' || payment_type === 'waived') {
      const { passNumber, qrData } = await generatePassData(req, appRecord);
      update.passNumber = passNumber;
      update.qrData = qrData;
      update.pass_approved = true;
      update.status = 'approved';
    } else if (payment_type === 'unpaid') {
      update.status = 'pending';
      update.passNumber = null;
      update.qrData = null;
      update.pass_approved = false;
    }

    await req.applications.updateOne({ _id: new ObjectId(id) }, { $set: update });
    res.json({ message: `Administrative record updated: Payment marked as ${payment_type} and application authorized.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Route fees
app.get('/api/admin/route-fees', async (req, res) => {
  try {
    const fees = await req.mongo.collection('route_fees').find({}).toArray();
    res.json(fees.map(f => ({ ...f, id: f._id.toString() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/route-fees', async (req, res) => {
  try {
    const data = { ...req.body, created_at: new Date().toISOString() };
    data.fee_amount = Number(data.fee_amount);
    // Ensure route uniquely identifies the fee record if not provided
    if (!data.route && data.to) data.route = data.to;
    const result = await req.mongo.collection('route_fees').insertOne(data);
    res.json({ id: result.insertedId, message: 'Route fee added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/route-fees/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates._id;
    delete updates.id;
    if (updates.fee_amount) updates.fee_amount = Number(updates.fee_amount);
    await req.mongo.collection('route_fees').updateOne({ _id: new ObjectId(req.params.id) }, { $set: updates });
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/route-fees/:id', async (req, res) => {
  try {
    await req.mongo.collection('route_fees').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Bus routes
app.get('/api/admin/bus-routes', async (req, res) => {
  try {
    const routes = await req.mongo.collection('bus_routes').find({}).toArray();
    res.json(routes.map(r => ({ ...r, id: r._id.toString() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/bus-routes', async (req, res) => {
  try {
    const result = await req.mongo.collection('bus_routes').insertOne({ ...req.body, created_at: new Date().toISOString() });
    res.json({ id: result.insertedId, message: 'Bus route added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/bus-routes/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates._id;
    delete updates.id;
    await req.mongo.collection('bus_routes').updateOne({ _id: new ObjectId(req.params.id) }, { $set: updates });
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/bus-routes/:id', async (req, res) => {
  try {
    await req.mongo.collection('bus_routes').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/bus-seat-counts', async (req, res) => {
  try {
    // Use MongoDB aggregation to count applications per bus number.
    // Handles both 'busNumber' and 'bus_number' fields, trims whitespace,
    // and covers ALL bus numbers found in applications (not just bus_routes).
    const pipeline = [
      { $match: { status: { $nin: ['rejected', 'cancelled'] } } },
      {
        $addFields: {
          _busKey: {
            $cond: {
              if: { $and: [{ $ifNull: ['$busNumber', false] }, { $ne: ['$busNumber', ''] }, { $ne: ['$busNumber', null] }] },
              then: { $trim: { input: { $toString: '$busNumber' } } },
              else: {
                $cond: {
                  if: { $and: [{ $ifNull: ['$bus_number', false] }, { $ne: ['$bus_number', ''] }, { $ne: ['$bus_number', null] }] },
                  then: { $trim: { input: { $toString: '$bus_number' } } },
                  else: null
                }
              }
            }
          }
        }
      },
      { $match: { _busKey: { $ne: null } } },
      { $group: { _id: '$_busKey', count: { $sum: 1 } } }
    ];
    const aggregated = await req.applications.aggregate(pipeline).toArray();
    const counts = {};
    for (const item of aggregated) {
      if (item._id) counts[item._id] = item.count;
    }
    res.json(counts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Colleges & Departments Management ─────────────────────────────────────────

// Public: get all colleges with departments (for student form)
app.get('/api/public/colleges', async (req, res) => {
  try {
    const colleges = await req.mongo.collection('colleges').find({}).sort({ name: 1 }).toArray();
    res.json(colleges.map(c => ({ id: c._id.toString(), name: c.name, departments: c.departments || [] })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: get all colleges
app.get('/api/admin/colleges', async (req, res) => {
  try {
    const colleges = await req.mongo.collection('colleges').find({}).sort({ name: 1 }).toArray();
    res.json(colleges.map(c => ({ id: c._id.toString(), name: c.name, departments: c.departments || [] })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: add a college
app.post('/api/admin/colleges', async (req, res) => {
  try {
    const { name, departments } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'College name is required' });
    const existing = await req.mongo.collection('colleges').findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) return res.status(400).json({ error: 'College already exists' });
    const result = await req.mongo.collection('colleges').insertOne({
      name: name.trim(),
      departments: (departments || []).map(d => d.trim()).filter(Boolean),
      createdAt: new Date().toISOString()
    });
    res.json({ message: 'College added', id: result.insertedId.toString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: update college (rename or replace departments list)
app.put('/api/admin/colleges/:id', async (req, res) => {
  try {
    const { name, departments } = req.body;
    const update = { updatedAt: new Date().toISOString() };
    if (name) update.name = name.trim();
    if (departments !== undefined) update.departments = departments.map(d => d.trim()).filter(Boolean);
    await req.mongo.collection('colleges').updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
    res.json({ message: 'College updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: delete a college
app.delete('/api/admin/colleges/:id', async (req, res) => {
  try {
    await req.mongo.collection('colleges').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'College deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


app.get('/api/admin/settings', async (req, res) => {
  try {
    const settings = await req.mongo.collection('system_settings').find({}).toArray();
    res.json(settings.map(s => ({ key: s.key, value: s.value })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/system-settings', async (req, res) => {
  try {
    const settings = await req.mongo.collection('system_settings').find({}).toArray();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/update-setting', async (req, res) => {
  try {
    const { key, value } = req.body;
    await req.mongo.collection('system_settings').updateOne(
      { key }, { $set: { value, updated_at: new Date().toISOString() } }, { upsert: true });
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Export Excel
app.get('/api/admin/export-excel', async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const apps = await req.applications.find({}).toArray();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Applications');
    ws.columns = [
      { header: 'Reg No', key: 'regNo', width: 15 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'College', key: 'college', width: 30 },
      { header: 'Branch/Year', key: 'branchYear', width: 15 },
      { header: 'Route', key: 'route', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Payment Status', key: 'payment_status', width: 20 },
      { header: 'Transaction ID', key: 'payment_id', width: 20 },
      { header: 'Fee Amount', key: 'fee_amount', width: 15 },
      { header: 'Authorized Date', key: 'createdAt', width: 20 }
    ];
    apps.forEach(a => ws.addRow({ 
      ...a, 
      regNo: a.regNo || a.reg_no, 
      payment_id: a.payment_id || 'N/A',
      fee_amount: a.fee_amount || 0,
      createdAt: a.createdAt || a.created_at || 'N/A' 
    }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=applications.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Cancellation requests
app.get('/api/admin/cancellation-requests', async (req, res) => {
  try {
    const { role, department } = req.query;
    let query = {
      $or: [
        { cancellation_requested: true },
        { cancellation_requested: 1 },
        { cancellation_requested: "1" }
      ]
    };
    if (role === 'hod' && department) {
      query.$and = [
        { $or: [{ department: department }, { branchYear: new RegExp(`^${department}`, 'i') }] }
      ];
    }
    const reqs = await req.applications.find(query).toArray();
    res.json(reqs.map(r => ({ ...r, id: r._id.toString() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/process-cancellation/:id', async (req, res) => {
  try {
    const { action } = req.body;
    const status = action === 'approve' ? 'cancelled' : 'approved';
    await req.applications.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status, cancellation_requested: false, cancelled: action === 'approve' ? 1 : 0, updatedAt: new Date().toISOString() } });
    res.json({ message: 'Done' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

['hod-approve','hod-decline','principal-approve','principal-decline','admin-approve','admin-decline'].forEach(action => {
  app.post(`/api/admin/${action}-cancellation`, async (req, res) => {
    try {
      const { id } = req.body;
      const isApprove = action.includes('approve');
      const stage = action.split('-')[0];
      const update = { [`${stage}_approval`]: isApprove ? 'approved' : 'declined', updatedAt: new Date().toISOString() };
      if (action === 'admin-approve' && isApprove) {
        // Admin approval is intermediate now, doesn't immediately cancel
        update.admin_approval = 'approved';
      }
      if (action === 'principal-approve' && isApprove) {
        // Principal is the final step
        update.status = 'cancelled';
        update.cancelled = 1;
        update.cancellation_requested = false;
      }
      await req.applications.updateOne({ _id: new ObjectId(id) }, { $set: update });
      res.json({ message: 'Done' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
});

// ── STUDENT ROUTES ────────────────────────────────────────────────────────────
app.post('/api/student/apply', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'aadharPhoto', maxCount: 1 },
  { name: 'collegeIdPhoto', maxCount: 1 }
]), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.files) {
      if (req.files.photo) data.photo = await handleFileUpload(req.files.photo[0]);
      if (req.files.aadharPhoto) data.aadharPhoto = await handleFileUpload(req.files.aadharPhoto[0]);
      if (req.files.collegeIdPhoto) data.collegeIdPhoto = await handleFileUpload(req.files.collegeIdPhoto[0]);
    }
    
    const regNum = data.regNo || data.reg_no;
    if (!regNum) return res.status(400).json({ error: 'Registration number is required' });
    data.regNo = regNum;
    data.reg_no = regNum;
    
    const existing = await req.applications.findOne({
      $or: [{ regNo: regNum }, { reg_no: regNum }]
    });
    if (existing) return res.status(400).json({ error: 'Application already exists' });
    
    data.status = 'pending';
    data.payment_status = 'unpaid';
    data.createdAt = new Date().toISOString();
    const result = await req.applications.insertOne(data);
    res.json({ message: 'Application submitted', id: result.insertedId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/login', async (req, res) => {
  try {
    const { regNo, dob } = req.body;
    const student = await req.applications.findOne({
      $or: [{ regNo, dob }, { reg_no: regNo, dob }]
    });
    if (!student) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ message: 'Login successful', student });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/status/:regNo', async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const student = await req.applications.findOne({
      $or: [{ regNo }, { reg_no: regNo }]
    });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/details/:regNo', async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const student = await req.applications.findOne({
      $or: [{ regNo }, { reg_no: regNo }]
    });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/verify-pass/:regNo', async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const student = await req.applications.findOne({
      $or: [{ regNo }, { reg_no: regNo }]
    });
    if (!student) return res.status(404).json({ error: 'Pass not found' });

    let branch = student.department || '', year = student.year || '';
    if (student.branchYear && (!branch || !year)) {
      const parts = student.branchYear.split(/[-\/\s]+/);
      if (parts.length >= 2) {
        year = parts[parts.length - 1];
        branch = parts.slice(0, -1).join(' ');
      }
    }

    res.json({
      ...student,
      branch,
      year,
      validTill: student.validity || student.validTill,
      cancelled: !!student.cancelled
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/pass/:regNo', async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const student = await req.applications.findOne({
      $or: [{ regNo, status: 'approved' }, { reg_no: regNo, status: 'approved' }]
    });
    if (!student) return res.status(404).json({ error: 'No approved pass found' });
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/payment-status/:regNo', async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const student = await req.applications.findOne({
      $or: [{ regNo }, { reg_no: regNo }]
    });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json({
      payment_status: student.payment_status || 'unpaid',
      payment_id: student.payment_id || null,
      payment_amount: student.fee_amount || student.amount || null,
      payment_date: student.payment_date || student.payment_marked_at || null,
      payment_note: student.payment_note || null,
      pass_approved: student.pass_approved || false,
      passNumber: student.passNumber || null
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


app.post('/api/student/pay', async (req, res) => {
  try {
    const { regNo, paymentId, amount } = req.body;
    await req.applications.updateOne(
      { $or: [{ regNo }, { reg_no: regNo }] },
      { $set: { payment_status: 'paid', payment_id: paymentId, fee_amount: amount, payment_date: new Date().toISOString() } });
    res.json({ message: 'Payment recorded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/create-payment-order', async (req, res) => {
  try {
    const Razorpay = require('razorpay');
    const rz = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const { amount, regNo } = req.body;
    const order = await rz.orders.create({ amount: Math.round(amount * 100), currency: 'INR', receipt: regNo });
    res.json({
      orderId: order.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: amount,
      currency: 'INR'
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/verify-payment', async (req, res) => {
  try {
    const crypto = require('crypto');
    const { regNo, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
    if (expectedSig !== razorpay_signature) return res.status(400).json({ error: 'Invalid signature' });
    await req.applications.updateOne(
      { $or: [{ regNo }, { reg_no: regNo }] },
      { $set: { payment_status: 'paid', payment_id: razorpay_payment_id, razorpay_order_id, fee_amount: amount, payment_date: new Date().toISOString() } });
    res.json({ message: 'Payment verified' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/request-cancellation', async (req, res) => {
  try {
    // Check if cancellations are enabled
    const setting = await req.mongo.collection('system_settings').findOne({ key: 'cancellations_enabled' });
    const enabled = setting && (setting.value === '1' || setting.value === 1 || setting.value === true);
    if (!enabled) {
      return res.status(403).json({ error: 'Cancellation period is currently closed. Please contact admin.' });
    }

    const { regNo, reason } = req.body;
    if (!regNo || !reason) return res.status(400).json({ error: 'Registration number and reason are required' });

    await req.applications.updateOne(
      { $or: [{ regNo }, { reg_no: regNo }] },
      { $set: { cancellation_requested: 1, cancellation_reason: reason, updatedAt: new Date().toISOString() } });
    res.json({ message: 'Cancellation requested' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


app.get('/api/student/get-fee/:route', async (req, res) => {
  try {
    const rawRoute = decodeURIComponent(req.params.route).toLowerCase();
    const allFees = await req.mongo.collection('route_fees').find({}).toArray();
    
    // Normalize logic: keep only significant alphanumeric words
    const clean = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
    const sClean = clean(rawRoute);
    
    // Ignore common geographical noise
    const noise = ["india", "tamil", "nadu", "krishnagiri", "district", "college", "university", "transport", "street", "road", "near", "landmark", "opp", "opposite"];

    let bestFee = null;
    let maxMatches = 0;

    for (const fee of allFees) {
      // Define keywords for this specific fee record
      const feeKeywords = [...new Set([
        ...clean(fee.route || "").split(" "),
        ...clean(fee.to || "").split(" "),
        ...clean(fee.from || "").split(" ")
      ])].filter(w => w.length > 2 && !noise.includes(w));
      
      if (feeKeywords.length === 0) continue;

      // Count how many of the fee's defining keywords are found in the student's route string
      const matches = feeKeywords.filter(kw => sClean.includes(kw)).length;
      
      if (matches >= 1) {
        if (matches > maxMatches) {
          maxMatches = matches;
          bestFee = fee;
        } else if (matches === maxMatches) {
          // Tie-breaker: pick the highest fee amount if routes are identical/overlapping
          if (!bestFee || (Number(fee.fee_amount) > Number(bestFee.fee_amount))) {
            bestFee = fee;
          }
        }
      }
    }

    if (bestFee) {
      console.log(`[Fee Match] SUCCESS for "${rawRoute}". Normalized: "${sClean}". Matched: ${bestFee.to}. Amount: ${bestFee.fee_amount}`);
      res.json(bestFee);
    } else {
      console.log(`[Fee Match] FAIL for "${rawRoute}". No match in ${allFees.length} records.`);
      res.json({ fee_amount: 0 });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/upload-fees-bill', upload.single('feesBill'), async (req, res) => {
  try {
    const { regNo } = req.body;
    const student = await req.applications.findOne({ $or: [{ regNo }, { reg_no: regNo }] });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const fileData = await handleFileUpload(req.file);
    
    // Try to get fee amount if not already set
    let feeAmount = student.fee_amount || student.amount;
    if (!feeAmount && student.route) {
      const clean = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
      const sClean = clean(student.route);
      const allFees = await req.mongo.collection('route_fees').find({}).toArray();
      let bestFee = null;
      let maxMatches = 0;
      
      for (const fee of allFees) {
        const fWords = [...new Set([
          ...clean(fee.route || "").split(" "),
          ...clean(fee.to || "").split(" ")
        ])].filter(w => w.length > 2 && w !== "college" && w !== "india");
        
        if (fWords.length === 0) continue;
        const matches = fWords.filter(kw => sClean.includes(kw)).length;
        if (matches >= 1 && matches > maxMatches) {
          maxMatches = matches;
          bestFee = fee;
        }
      }
      if (bestFee) feeAmount = bestFee.fee_amount;
    }

    const updateData = { 
      feesBillPhoto: fileData, 
      updatedAt: new Date().toISOString() 
    };

    // If not already verified or wavered/offline, set as 'paid' for admin review
    const currentStatus = student.payment_status;
    if (!['verified', 'offline', 'waived', 'paid'].includes(currentStatus)) {
      updateData.payment_status = 'paid';
      updateData.payment_id = 'MANUAL-DOC';
      updateData.payment_date = new Date().toISOString();
      updateData.fee_amount = feeAmount || 0;
    }

    await req.applications.updateOne(
      { $or: [{ regNo }, { reg_no: regNo }] }, 
      { $set: updateData }
    );
    res.json({ message: 'Bill uploaded successfully', path: fileData });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Health endpoint aliased for student settings check
app.get('/api/student/settings-check', async (req, res) => {
  res.json({ status: 'active', timestamp: new Date().toISOString() });
});

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
app.get('/api/notifications', async (req, res) => {
  try {
    const notes = await req.mongo.collection('notifications').find({ is_active: 1 }).sort({ created_at: -1 }).allowDiskUse(true).toArray();
    res.json(notes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const { title, message, type, target_role } = req.body;
    const result = await req.mongo.collection('notifications').insertOne({
      title, message, type: type || 'announcement', target_role: target_role || 'all',
      is_active: 1, created_at: new Date().toISOString()
    });
    res.json({ id: result.insertedId, message: 'Created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    let filter;
    try { filter = { _id: new ObjectId(req.params.id) }; }
    catch(e) { filter = { id: req.params.id }; }
    await req.mongo.collection('notifications').updateOne(filter, { $set: { is_active: 0 } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Export ────────────────────────────────────────────────────────────────────
module.exports = app;
