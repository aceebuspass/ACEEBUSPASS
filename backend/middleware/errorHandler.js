export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Database errors
  if (err.code === 'SQLITE_ERROR' || err.code === 'SQLITE_BUSY') {
    return res.status(500).json({
      error: 'Database error occurred',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.message
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};