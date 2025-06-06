// Simple admin auth middleware for demo purposes
// In production, use proper authentication like JWT

const isAdmin = (req, res, next) => {
    const adminToken = req.headers['x-admin-token'];
    
    if (adminToken === process.env.ADMIN_TOKEN) {
      return next();
    }
    
    res.status(403).json({
      success: false,
      message: 'Unauthorized access. Admin token required.',
    });
  };
  
  module.exports = { isAdmin };