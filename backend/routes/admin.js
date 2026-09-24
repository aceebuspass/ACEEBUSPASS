const express = require('express');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');


const router = express.Router();

/** Accepts token returned by hardcoded admin login, DB admin login, or legacy alias. */
function isAdminServiceToken(token) {
  return token === 'admin-token' || token === 'admin-hardcoded-token' || token === 'staff-db-token';
}

/** Shared pass/QR payload for approval and offline/waived marking. */
async function buildPassIssueFields(req, app) {
  const collection = req.mongo.collection('student_applications');
  let passNumber = app.passNumber;
  let busNumber = app.busNumber;
  if (!passNumber) {
    const currentYear = new Date().getFullYear();
    const count = await collection.countDocuments({ passNumber: { $ne: null } });
    passNumber = `PASS-${currentYear}-${String(count + 1).padStart(4, '0')}`;
    const busRecord = await req.mongo.collection('bus_routes').findOne({ route: app.route, is_active: 1 });
    busNumber = app.busNumber || (busRecord ? busRecord.bus_number : 'PENDING');
  }
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const qrData = JSON.stringify({
    name: app.name,
    regNo: app.regNo,
    route: app.route,
    validity: app.validity,
    passNumber,
    busNumber,
    approvedAt: new Date().toISOString(),
    passUrl: `${baseUrl}/verify-pass/${app.regNo}`
  });
  return { passNumber, busNumber, qrData };
}

// Admin/Staff login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

    // 1. Check hardcoded Admin
    const ADMIN_USERNAME = 'admin';
    const ADMIN_PASSWORD = 'Admin@demo';

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return res.json({
        message: 'Login successful',
        token: 'admin-token',
        user: { id: 0, username: ADMIN_USERNAME, role: 'admin', name: 'System Administrator' }
      });
    }

    // 2. Check Database
    const user = await req.mongo.collection("admin_users").findOne({ username });

    if (user) {
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

      if (isMatch) {
        res.json({
          message: 'Login successful',
          token: 'staff-db-token',
          user: {
            id: user._id.toString(),
            username: user.username,
            role: user.role,
            department: user.department,
            name: user.name
          }
        });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all student applications
router.get('/applications', async (req, res) => {
  try {
    const { role, department } = req.query;
    let query = {};
    // For HOD: don't filter server-side (department abbreviations don't match full names stored by students).
    // The frontend applies the department filter after fetching.
    // We only filter here if it's an exact match on the stored department field.
    if (role === 'hod' && department) {
      // Match on the 'department' field (exact or contains), case-insensitive
      query.department = { $regex: new RegExp(department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
    }

    const apps = await req.mongo.collection("student_applications").find(query).sort({ _id: -1 }).allowDiskUse(true).toArray();

    const appsWithUrls = apps.map(app => ({
      ...app,
      id: app._id.toString()
    }));

    res.json(appsWithUrls);
  } catch (err) {
    console.error('Error fetching applications:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Approve application
router.post('/approve', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID is required' });

    const collection = req.mongo.collection("student_applications");
    const app = await collection.findOne({ _id: new ObjectId(id) });
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const currentYear = new Date().getFullYear();
    const count = await collection.countDocuments({ passNumber: { $ne: null } });
    const passNumber = `PASS-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const busRecord = await req.mongo.collection("bus_routes").findOne({ route: app.route, is_active: 1 });
    const busNumber = app.busNumber || (busRecord ? busRecord.bus_number : 'PENDING');

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const qrData = JSON.stringify({
      name: app.name,
      regNo: app.regNo,
      route: app.route,
      validity: app.validity,
      passNumber,
      busNumber,
      approvedAt: new Date().toISOString(),
      passUrl: `${baseUrl}/verify-pass/${app.regNo}`
    });

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { 
          status: 'approved',
          payment_status: 'verified',
          qrData, 
          passNumber, 
          busNumber, 
          updatedAt: new Date().toISOString() 
        } 
      }
    );

    res.json({ message: 'Approved successfully', passNumber, busNumber });
  } catch (err) {
    console.error('Approval Error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// Reject application
router.post('/reject', async (req, res) => {
  try {
    const { id, reason } = req.body;
    await req.mongo.collection("student_applications").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'rejected', rejection_reason: reason, updatedAt: new Date().toISOString() } }
    );
    res.json({ message: 'Rejected successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Delete application
router.delete('/applications/:id', async (req, res) => {
  try {
    await req.mongo.collection("student_applications").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Update application
router.put('/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    delete updateData._id;
    updateData.updatedAt = new Date().toISOString();

    await req.mongo.collection("student_applications").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    res.json({ message: 'Updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Export to Excel
router.get('/export-excel', async (req, res) => {
  try {
    const apps = await req.mongo.collection("student_applications").find({}).sort({ _id: -1 }).allowDiskUse(true).toArray();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');

    worksheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Reg No', key: 'regNo', width: 20 },
      { header: 'Route', key: 'route', width: 25 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    apps.forEach(app => worksheet.addRow(app));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// =============================
// Cancellation Handling
// =============================

router.get('/cancellation-requests', async (req, res) => {
  try {
    const requests = await req.mongo.collection("student_applications")
      .find({ cancellation_requested: 1, cancelled: { $ne: 1 } })
      .sort({ cancellation_requested_at: -1 })
      .allowDiskUse(true)
      .toArray();
    res.json(requests.map(r => ({ ...r, id: r._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/process-cancellation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminUsername } = req.body;

    if (action === 'approve') {
      await req.mongo.collection("student_applications").updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            cancelled: 1, 
            cancelled_at: new Date().toISOString(), 
            cancelled_by: adminUsername, 
            status: 'cancelled',
            cancellation_requested: 0
          } 
        }
      );
    } else {
      await req.mongo.collection("student_applications").updateOne(
        { _id: new ObjectId(id) },
        { $set: { cancellation_requested: 0 } }
      );
    }
    res.json({ message: 'Processed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

/** Multi-stage cancellation approvals (HOD → Admin → Principal), used by AdminDashboard. */
['hod-approve', 'hod-decline', 'principal-approve', 'principal-decline', 'admin-approve', 'admin-decline'].forEach((action) => {
  router.post(`/${action}-cancellation`, async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'ID is required' });
      const isApprove = action.includes('approve');
      const stage = action.split('-')[0];
      const update = {
        [`${stage}_approval`]: isApprove ? 'approved' : 'declined',
        updatedAt: new Date().toISOString()
      };
      if (action === 'admin-approve' && isApprove) {
        update.admin_approval = 'approved';
      }
      if (action === 'principal-approve' && isApprove) {
        update.status = 'cancelled';
        update.cancelled = 1;
        update.cancellation_requested = 0;
        update.cancelled_at = new Date().toISOString();
      }
      if (!isApprove) {
        update.cancellation_requested = 0;
      }
      await req.mongo.collection('student_applications').updateOne(
        { _id: new ObjectId(id) },
        { $set: update }
      );
      res.json({ message: 'Done' });
    } catch (err) {
      console.error(`${action}-cancellation:`, err);
      res.status(500).json({ error: 'Failed' });
    }
  });
});

// =============================
// Route Fees Management
// =============================

router.get('/route-fees', async (req, res) => {
  try {
    const fees = await req.mongo.collection("route_fees").find({}).sort({ route: 1 }).toArray();
    res.json(fees.map(f => ({ ...f, id: f._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/route-fees', async (req, res) => {
  try {
    const data = req.body;
    // Always build route from from/to for consistency
    data.route = `${data.from} - ${data.to}`;
    // Normalise is_active to integer for consistent querying
    data.is_active = (data.is_active === true || data.is_active === 1 || data.is_active === '1') ? 1 : 0;
    data.fee_amount = Number(data.fee_amount);
    data.updated_at = new Date().toISOString();
    data.created_at = data.created_at || new Date().toISOString();

    const result = await req.mongo.collection("route_fees").updateOne(
      { route: data.route },
      { $set: data },
      { upsert: true }
    );
    res.json({ message: 'Saved', id: result.upsertedId ? result.upsertedId.toString() : null });
  } catch (err) {
    console.error('Route fee save error:', err);
    res.status(500).json({ error: 'Failed to save route fee' });
  }
});

router.put('/route-fees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    delete data._id;
    delete data.id;
    // Rebuild route from from/to in case they changed
    if (data.from && data.to) data.route = `${data.from} - ${data.to}`;
    // Normalise is_active
    if (data.is_active !== undefined) {
      data.is_active = (data.is_active === true || data.is_active === 1 || data.is_active === '1') ? 1 : 0;
    }
    if (data.fee_amount !== undefined) data.fee_amount = Number(data.fee_amount);
    data.updated_at = new Date().toISOString();
    await req.mongo.collection("route_fees").updateOne({ _id: new ObjectId(id) }, { $set: data });
    res.json({ message: 'Updated' });
  } catch (err) {
    console.error('Route fee update error:', err);
    res.status(500).json({ error: 'Failed to update route fee' });
  }
});

router.delete('/route-fees/:id', async (req, res) => {
  try {
    await req.mongo.collection("route_fees").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================
// Bus Routes Management
// =============================

router.get('/bus-routes', async (req, res) => {
  try {
    const routes = await req.mongo.collection("bus_routes").find({}).sort({ bus_number: 1 }).toArray();
    res.json(routes.map(r => ({ ...r, id: r._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Get seat counts per bus number (for showing available seats)
router.get('/bus-seat-counts', async (req, res) => {
  try {
    // Count students per bus_number where status is approved/pending
    const pipeline = [
      { 
        $match: { 
          busNumber: { $exists: true, $ne: null, $nin: ['', 'PENDING'] }, 
          status: { $in: ['approved', 'pending'] } 
        } 
      },
      { $group: { _id: '$busNumber', count: { $sum: 1 } } }
    ];
    const counts = await req.mongo.collection("student_applications").aggregate(pipeline).toArray();
    const result = {};
    counts.forEach(c => { result[c._id] = c.count; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch seat counts' });
  }
});

router.post('/bus-routes', async (req, res) => {
  try {
    const data = req.body;
    data.updated_at = new Date().toISOString();
    await req.mongo.collection("bus_routes").insertOne(data);
    res.json({ message: 'Saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.put('/bus-routes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    delete data._id;
    delete data.id;
    data.updated_at = new Date().toISOString();
    await req.mongo.collection("bus_routes").updateOne({ _id: new ObjectId(id) }, { $set: data });
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.delete('/bus-routes/:id', async (req, res) => {
  try {
    await req.mongo.collection("bus_routes").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================
// Payment Details
// =============================

router.get('/payment-details', async (req, res) => {
  try {
    const payments = await req.mongo.collection("student_applications")
      .find({ payment_status: { $in: ['paid', 'verified', 'offline', 'waived'] } })
      .sort({ payment_date: -1 })
      .allowDiskUse(true)
      .toArray();
    res.json(payments.map(p => ({ ...p, id: p._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/export-payments-excel', async (req, res) => {
  try {
    const payments = await req.mongo.collection("student_applications")
      .find({ payment_status: { $in: ['paid', 'verified', 'offline', 'waived'] } })
      .sort({ payment_date: -1 })
      .allowDiskUse(true)
      .toArray();
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payments');
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Reg No', key: 'regNo', width: 20 },
      { header: 'Amount', key: 'fee_amount', width: 15 },
      { header: 'Status', key: 'payment_status', width: 15 }
    ];
    payments.forEach(p => worksheet.addRow(p));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=payments.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

router.post('/approve-payment-pass', async (req, res) => {
  try {
    const { id } = req.body;
    const collection = req.mongo.collection("student_applications");
    const app = await collection.findOne({ _id: new ObjectId(id) });
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const { passNumber, busNumber, qrData } = await buildPassIssueFields(req, app);

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { 
          status: 'approved',
          payment_status: 'verified',
          qrData,
          passNumber, 
          busNumber, 
          updatedAt: new Date().toISOString() 
        } 
      }
    );
    res.json({ message: 'Payment verified and pass issued' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/reject-payment-pass', async (req, res) => {
  try {
    const { id, reason } = req.body;
    await req.mongo.collection("student_applications").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'rejected', rejection_reason: reason, updatedAt: new Date().toISOString() } }
    );
    res.json({ message: 'Rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

/** Admin: mark payment offline / waived / unpaid (matches dashboard controls). */
router.post('/mark-payment', async (req, res) => {
  try {
    const { id, payment_type, note } = req.body;
    if (!['offline', 'waived', 'unpaid'].includes(payment_type)) {
      return res.status(400).json({ error: 'Invalid payment_type' });
    }
    const collection = req.mongo.collection('student_applications');
    const appRecord = await collection.findOne({ _id: new ObjectId(id) });
    if (!appRecord) return res.status(404).json({ error: 'Application not found' });

    const baseUpdate = {
      payment_note: note || '',
      payment_marked_at: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (payment_type === 'offline' || payment_type === 'waived') {
      const { passNumber, busNumber, qrData } = await buildPassIssueFields(req, appRecord);
      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: {
          ...baseUpdate,
          payment_status: payment_type,
          passNumber,
          busNumber,
          qrData,
          pass_approved: true,
          status: 'approved'
        }}
      );
    } else {
      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: {
          ...baseUpdate,
          payment_status: 'unpaid',
          status: 'pending',
          passNumber: null,
          qrData: null,
          pass_approved: false
        }}
      );
    }
    res.json({ message: 'Payment status updated' });
  } catch (err) {
    console.error('mark-payment:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================
// Colleges (admin CRUD; public list is /api/public/colleges)
// =============================

router.get('/colleges', async (req, res) => {
  try {
    const colleges = await req.mongo.collection('colleges').find({}).sort({ name: 1 }).toArray();
    res.json(colleges.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      departments: c.departments || []
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch colleges' });
  }
});

router.post('/colleges', async (req, res) => {
  try {
    const { name, departments } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'College name is required' });
    const existing = await req.mongo.collection('colleges').findOne({
      name: { $regex: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (existing) return res.status(400).json({ error: 'College already exists' });
    const result = await req.mongo.collection('colleges').insertOne({
      name: name.trim(),
      departments: (departments || []).map((d) => String(d).trim()).filter(Boolean),
      createdAt: new Date().toISOString()
    });
    res.json({ message: 'College added', id: result.insertedId.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/colleges/:id', async (req, res) => {
  try {
    const { name, departments } = req.body;
    const update = { updatedAt: new Date().toISOString() };
    if (name) update.name = name.trim();
    if (departments !== undefined) {
      update.departments = departments.map((d) => String(d).trim()).filter(Boolean);
    }
    await req.mongo.collection('colleges').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: update }
    );
    res.json({ message: 'College updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.delete('/colleges/:id', async (req, res) => {
  try {
    await req.mongo.collection('colleges').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'College deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================
// System Settings
// =============================

router.get('/settings', async (req, res) => {
  try {
    const settings = await req.mongo.collection("system_settings").find({}).toArray();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/update-setting', async (req, res) => {
  try {
    const { key, value } = req.body;
    await req.mongo.collection("system_settings").updateOne(
      { key: key },
      { $set: { value: value, updated_at: new Date().toISOString() } },
      { upsert: true }
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// =============================
// Password Management
// =============================

// Reset password route for Admin/HOD/Principal
router.post('/reset-password', async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;
    
    if (!username || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Username, old password, and new password are required' });
    }

    // 1. Find user (can be admin, hod, or principal)
    const user = await req.mongo.collection("admin_users").findOne({ username });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Verify old password
    let isMatch = false;
    const isHashed = user.password && user.password.startsWith('$2');
    
    if (isHashed) {
      isMatch = await bcrypt.compare(oldPassword, user.password);
    } else {
      isMatch = (oldPassword === user.password);
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid old password' });
    }

    // 3. Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 4. Update password in database
    await req.mongo.collection("admin_users").updateOne(
      { username: username },
      { 
        $set: { 
          password: hashedPassword,
          password_updated_at: new Date().toISOString()
        } 
      }
    );

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Admin: Force Reset Staff Password
router.post('/force-reset-password', async (req, res) => {
  try {
    const { targetUsername, newPassword, adminToken } = req.body;
    
    // Simple verification (in a real app, use proper JWT/Sessions)
    if (!isAdminServiceToken(adminToken)) {
      return res.status(403).json({ error: 'Unauthorized. Only Admin can perform this.' });
    }

    if (!targetUsername || !newPassword) {
      return res.status(400).json({ error: 'Username and new password are required' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const result = await req.mongo.collection("admin_users").updateOne(
      { username: targetUsername },
      { 
        $set: { 
          password: hashedPassword,
          password_updated_at: new Date().toISOString()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Staff user not found' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Force reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Admin: List all staff users
router.get('/staff-users', async (req, res) => {
  try {
    const users = await req.mongo.collection("admin_users").find({}, { projection: { password: 0 } }).toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 7. Admin: Add new staff member
router.post('/add-staff', async (req, res) => {
  try {
    const { username, password, role, department, adminToken } = req.body;
    
    if (!isAdminServiceToken(adminToken)) {
      return res.status(403).json({ error: 'Unauthorized. Only Admin can perform this.' });
    }

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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
  } catch (err) {
    res.status(500).json({ error: 'Failed to add staff member' });
  }
});

module.exports = router;