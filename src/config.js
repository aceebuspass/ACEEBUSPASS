// src/config.js

// ------------------------------------------------------------
// Environment detection
// ------------------------------------------------------------
const isBrowser = typeof window !== 'undefined';

const hostname = isBrowser
  ? window.location.hostname
  : '';

const isLocal =
  hostname === 'localhost' ||
  hostname === '127.0.0.1';

// ------------------------------------------------------------
// Backend URL
// ------------------------------------------------------------
// Local:
// React frontend -> localhost:3003
// Express backend -> localhost:3001
//
// Production:
// Frontend -> Vercel
// Backend  -> Render
// ------------------------------------------------------------
const RENDER_BACKEND_URL = 'https://aceebuspass.onrender.com';

const BACKEND_BASE = isLocal
  ? 'http://localhost:3001'
  : RENDER_BACKEND_URL;

// ------------------------------------------------------------
// API Base URL
// ------------------------------------------------------------
// Local:
//   http://localhost:3001/api
//
// Production:
//   /api
//
// Vercel's vercel.json should rewrite /api/*
// to the Render backend.
// ------------------------------------------------------------
export const API_BASE_URL = isLocal
  ? `${BACKEND_BASE}/api`
  : '/api';

// ------------------------------------------------------------
// Fallback API URLs
// ------------------------------------------------------------
// Only use fallbacks during local development.
// Production should use Vercel's /api rewrite.
// ------------------------------------------------------------
export const FALLBACK_API_URLS = isLocal
  ? [
      'http://localhost:3001/api',
      'http://127.0.0.1:3001/api'
    ]
  : [];

// ------------------------------------------------------------
// Image URL helper
// ------------------------------------------------------------
// Local:
//   /uploads/file.jpg
//   -> http://localhost:3001/uploads/file.jpg
//
// Production:
//   /uploads/file.jpg
//   -> https://aceebuspass.onrender.com/uploads/file.jpg
// ------------------------------------------------------------
export const getImageUrl = (path) => {
  if (!path) {
    return '';
  }

  // Blob URLs
  if (path.startsWith('blob:')) {
    return path;
  }

  // Data URLs
  if (path.startsWith('data:')) {
    return path;
  }

  // Already an absolute URL
  if (
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }

  // Normalize relative path
  const cleanPath = path.startsWith('/')
    ? path
    : `/${path}`;

  return `${BACKEND_BASE}${cleanPath}`;
};