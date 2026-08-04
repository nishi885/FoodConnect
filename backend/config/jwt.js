const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'foodconnect_token';
const TOKEN_TTL = process.env.JWT_EXPIRES_IN || '8h';

function secret() {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production.');
  }
  return process.env.JWT_SECRET || 'foodconnect-local-jwt-development-secret';
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/'
  };
}

function issueAuthCookie(res, user) {
  const token = jwt.sign({ sub: String(user._id), role: user.role }, secret(), { expiresIn: TOKEN_TTL });
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
}

function readToken(token) {
  return jwt.verify(token, secret());
}

module.exports = { COOKIE_NAME, issueAuthCookie, clearAuthCookie, readToken };
