import jwt from 'jsonwebtoken';
import Guest from '../models/guest.js';

export const guestAuthMiddleware = async (req, res, next) => {
  const token = req.cookies.guestToken;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No guest token found"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    
    // Check if guest exists in database
    const guest = await Guest.findById(decoded.id);
    
    if (!guest || !guest.isActive) {
      res.clearCookie('guestToken');
      return res.status(401).json({
        success: false,
        message: "Guest account not found or inactive"
      });
    }

    // Attach guest ID to the request for future use
    req.guestId = decoded.id;
    next();
  } catch (error) {
    console.error("Guest JWT verification failed:", error.message);
    res.clearCookie('guestToken');
    return res.status(401).json({
      success: false,
      message: "Invalid or expired guest token"
    });
  }
};