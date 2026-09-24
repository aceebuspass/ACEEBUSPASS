const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const Admin = require('./models/Admin');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/buspass';

// This file is obsolete. Admins are now handled in SQLite or hardcoded in routes.