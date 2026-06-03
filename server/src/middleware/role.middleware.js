export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized access' });
    }
    
    // For general application routes or group member specific role checking
    if (!roles.includes(req.user.role || 'MEMBER')) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges' });
    }
    
    next();
  };
};
