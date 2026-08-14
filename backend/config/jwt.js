const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'foodconnect-dev-jwt-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const signToken = (user) => jwt.sign(
  {
    id: user._id?.toString?.() || user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName
  },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRES_IN }
);

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const setAuthCookie = (res, token) => {
  res.cookie('foodconnect_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie('foodconnect_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
};

module.exports = {
  signToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie
};
