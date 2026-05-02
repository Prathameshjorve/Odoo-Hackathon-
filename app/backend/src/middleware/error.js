export function errorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      message,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const message = `${Object.keys(err.keyValue)[0]} already exists`;
    return res.status(400).json({
      success: false,
      message,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }

  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
}

export function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
}
