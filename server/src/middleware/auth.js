import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function signToken(user) {
  return jwt.sign(
    { userId: user.UserId, role: user.Role, universityId: user.UniversityId },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/** Short-lived proof that email OTP was verified (register / admin login). */
export function signOtpGateToken(payload, expiresIn = '15m') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyOtpGateToken(token, expectedPurpose) {
  const data = jwt.verify(token, JWT_SECRET);
  if (data.purpose !== expectedPurpose) {
    const err = new Error('Invalid verification token');
    err.status = 401;
    throw err;
  }
  return data;
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export async function attachUserDetails(req, res, next) {
  try {
    const { query } = await import('../db.js');
    const result = await query(
      'SELECT UserId, UniversityId, Email, FirstName, LastName, Role, Department, ProfileImageUrl, Phone, Bio, ContactInfo, ClassName, StudyMode FROM Users WHERE UserId = @userId AND IsActive = 1 AND AccountStatus = \'approved\'',
      { userId: req.user.userId }
    );
    if (!result.recordset.length) return res.status(401).json({ error: 'User not found' });
    req.userDetails = result.recordset[0];
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
