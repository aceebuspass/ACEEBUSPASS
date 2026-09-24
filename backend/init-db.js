import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  let db;

  try {
    console.log('🔧 Initializing SQLite database...');

    db = await open({
      filename: path.join(__dirname, 'buspass.sqlite'),
      driver: sqlite3.Database
    });

    console.log('📊 Creating tables...');

    await db.exec(`
      CREATE TABLE IF NOT EXISTS student_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        dob TEXT NOT NULL,
        regNo TEXT UNIQUE NOT NULL,
        branchYear TEXT,
        mobile TEXT NOT NULL,
        parentMobile TEXT NOT NULL,
        address TEXT NOT NULL,
        route TEXT NOT NULL,
        validity TEXT NOT NULL,
        photo TEXT,
        aadharNumber TEXT,
        aadharPhoto TEXT,
        collegeIdPhoto TEXT,
        status TEXT DEFAULT 'pending',
        qrData TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index for better performance
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_reg_no ON student_applications(regNo);
      CREATE INDEX IF NOT EXISTS idx_status ON student_applications(status);
      CREATE INDEX IF NOT EXISTS idx_created_at ON student_applications(createdAt);
    `);

    // Add new column for fees bill photo, ignore error if it already exists
    const columnsToAdd = [
      { name: 'feesBillPhoto', type: 'TEXT' },
      { name: 'fatherName', type: 'TEXT' },
      { name: 'cancellation_requested', type: 'BOOLEAN DEFAULT 0' },
      { name: 'cancellation_requested_at', type: 'DATETIME' },
      { name: 'cancelled', type: 'BOOLEAN DEFAULT 0' },
      { name: 'cancellation_reason', type: 'TEXT' },
      { name: 'cancelled_at', type: 'DATETIME' },
      { name: 'cancelled_by', type: 'TEXT' },
      { name: 'college', type: 'TEXT' }, // NEW
      { name: 'busNo', type: 'TEXT' },   // NEW
      { name: 'userType', type: 'TEXT' },// NEW (student/staff)
      { name: 'passNo', type: 'TEXT' }, // CHANGED FROM TEXT UNIQUE to TEXT
      { name: 'payment_status', type: 'TEXT' },
      { name: 'payment_id', type: 'TEXT' },
      { name: 'payment_amount', type: 'REAL' },
      { name: 'payment_date', type: 'DATETIME' },
      { name: 'razorpay_order_id', type: 'TEXT' },
      { name: 'rejection_reason', type: 'TEXT' }
    ];

    for (const column of columnsToAdd) {
      try {
        await db.exec(`ALTER TABLE student_applications ADD COLUMN ${column.name} ${column.type}`);
        console.log(`➕ Added ${column.name} column to student_applications table.`);
      } catch (err) {
        if (!err.message.includes('duplicate column name')) {
          console.error(`❌ Error adding column ${column.name}:`, err);
          throw err;
        }
        // Column already exists, which is fine
      }
    }

    console.log('✅ Database initialized successfully!');
    console.log(`📁 Database file: ${path.join(__dirname, 'buspass.sqlite')}`);

    // Check if there are any existing applications
    const count = await db.get('SELECT COUNT(*) as count FROM student_applications');
    console.log(`📋 Total applications: ${count.count}`);

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    if (db) {
      await db.close();
      console.log('🔒 Database connection closed.');
    }
  }
})();
