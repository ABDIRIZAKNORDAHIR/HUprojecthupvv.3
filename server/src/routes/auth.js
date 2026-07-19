import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken, signOtpGateToken, verifyOtpGateToken, authMiddleware, attachUserDetails } from '../middleware/auth.js';
import { validateUniversityId } from '../utils/universityId.js';
import { issueOtp, verifyOtp } from '../services/otp.js';

const router = Router();

/** Step 1 — student/teacher: University ID + email → send OTP */
router.post('/register/request-otp', async (req, res) => {
  try {
    const { universityId, email, role } = req.body;
    if (!universityId || !email) {
      return res.status(400).json({ error: 'University ID and email are required' });
    }
    const accountRole = role === 'teacher' ? 'teacher' : 'student';
    if (role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be created via registration' });
    }
    const idCheck = validateUniversityId(universityId);
    if (!idCheck.ok) return res.status(400).json({ error: idCheck.error });

    const normalizedEmail = String(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }

    const existing = await query(
      `SELECT UniversityId, Email FROM Users
       WHERE UniversityId = @universityId OR LOWER(Email) = @email`,
      { universityId: idCheck.id, email: normalizedEmail }
    );
    if (existing.recordset.length) {
      const emailTaken = existing.recordset.some(
        (r) => String(r.Email || '').toLowerCase() === normalizedEmail
      );
      const idTaken = existing.recordset.some(
        (r) => String(r.UniversityId || '') === idCheck.id
      );
      if (emailTaken && idTaken) {
        return res.status(409).json({ error: 'This University ID and email are already registered. Sign in instead.' });
      }
      if (emailTaken) {
        return res.status(409).json({
          error: 'This email is already registered. Use a different email, or sign in if this is your account.',
        });
      }
      if (idTaken) {
        return res.status(409).json({
          error: 'This University ID is already registered. Use a different HU ID.',
        });
      }
      return res.status(409).json({ error: 'University ID or email already registered' });
    }

    console.log(`[OTP] Sending registration code to ${normalizedEmail} (${accountRole})`);
    const issued = await issueOtp({
      email: normalizedEmail,
      purpose: 'register',
      payload: { universityId: idCheck.id, role: accountRole },
    });
    console.log(`[OTP] Registration code emailed to ${issued.email}`);
    res.json({
      message: `Verification code sent to ${issued.email}`,
      email: issued.email,
      expiresInMinutes: issued.expiresInMinutes,
      emailed: true,
    });
  } catch (err) {
    const status = err.code === 'smtp_not_configured' || err.code === 'smtp_send_failed' ? 503 : 500;
    res.status(status).json({ error: err.message });
  }
});

/** Step 2 — verify registration OTP → registrationToken */
router.post('/register/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const result = await verifyOtp({ email, purpose: 'register', code });
    if (!result.ok) return res.status(400).json({ error: result.error });

    const universityId = result.payload?.universityId;
    const role = result.payload?.role === 'teacher' ? 'teacher' : 'student';
    if (!universityId) {
      return res.status(400).json({ error: 'Invalid OTP session. Request a new code.' });
    }

    const registrationToken = signOtpGateToken({
      purpose: 'register',
      email: result.email,
      universityId,
      role,
    });

    res.json({
      registrationToken,
      email: result.email,
      universityId,
      role,
      message: 'Email verified',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Register student or teacher — requires registrationToken from OTP verify */
router.post('/register', async (req, res) => {
  try {
    const {
      universityId, email, password, firstName, lastName, department, role,
      className, studyMode, registrationToken,
    } = req.body;

    if (!registrationToken) {
      return res.status(400).json({ error: 'Verify your email with the OTP code first' });
    }

    let gate;
    try {
      gate = verifyOtpGateToken(registrationToken, 'register');
    } catch {
      return res.status(401).json({ error: 'Email verification expired. Request a new code.' });
    }

    if (!universityId || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'University ID, email, password, first and last name are required' });
    }

    const accountRole = role === 'teacher' ? 'teacher' : 'student';
    if (role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be created via registration. Contact the system administrator.' });
    }

    const idCheck = validateUniversityId(universityId);
    if (!idCheck.ok) {
      return res.status(400).json({ error: idCheck.error });
    }
    const huId = idCheck.id;
    const normalizedEmail = email.toLowerCase().trim();

    if (gate.universityId !== huId || gate.email !== normalizedEmail || gate.role !== accountRole) {
      return res.status(400).json({ error: 'Email verification does not match this registration. Start again.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    let normalizedClass = null;
    let normalizedMode = null;
    if (accountRole === 'student') {
      normalizedClass = String(className || '').trim().replace(/\s+/g, ' ').toUpperCase();
      if (!normalizedClass) {
        return res.status(400).json({ error: 'Students must enter their class (e.g. BIT 9)' });
      }
      const mode = String(studyMode || '').trim().toLowerCase().replace('-', '_');
      if (mode === 'full_time' || mode === 'fulltime') normalizedMode = 'full_time';
      else if (mode === 'part_time' || mode === 'parttime') normalizedMode = 'part_time';
      else {
        return res.status(400).json({ error: 'Students must choose full-time or part-time' });
      }
    }

    const existing = await query(
      'SELECT UserId FROM Users WHERE UniversityId = @universityId OR Email = @email',
      { universityId: huId, email: normalizedEmail }
    );
    if (existing.recordset.length) {
      return res.status(409).json({ error: 'University ID or email already registered' });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO Users (UniversityId, Email, PasswordHash, PlainPassword, FirstName, LastName, Role, Department, ClassName, StudyMode, IsActive, AccountStatus)
       OUTPUT INSERTED.UserId, INSERTED.UniversityId, INSERTED.Email, INSERTED.FirstName, INSERTED.LastName, INSERTED.Role, INSERTED.Department, INSERTED.ClassName, INSERTED.StudyMode, INSERTED.AccountStatus
       VALUES (@universityId, @email, @hash, @plain, @firstName, @lastName, @role, @department, @className, @studyMode, 0, 'pending')`,
      {
        universityId: huId,
        email: normalizedEmail,
        hash,
        plain: password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: accountRole,
        department: department || null,
        className: normalizedClass,
        studyMode: normalizedMode,
      }
    );

    const user = result.recordset[0];

    const admins = await query(`SELECT UserId FROM Users WHERE Role = 'admin' AND IsActive = 1 AND AccountStatus = 'approved'`);
    for (const admin of admins.recordset) {
      await query(
        `INSERT INTO Notifications (UserId, Title, Message, Type)
         VALUES (@userId, @title, @message, 'account_pending')`,
        {
          userId: admin.UserId,
          title: 'New Account Registration',
          message: `${firstName.trim()} ${lastName.trim()} (${huId}) registered as ${accountRole}${normalizedClass ? ` · class ${normalizedClass}` : ''}. Approve or reject this account.`,
        }
      );
    }

    res.status(201).json({
      pendingApproval: true,
      user,
      message: `Your ${accountRole} account was submitted. An administrator must approve it before you can sign in.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Admin login step 1 — email → OTP */
router.post('/admin/request-otp', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const admins = await query(
      `SELECT UserId, Email FROM Users WHERE Role = 'admin' AND LOWER(Email) = @email AND IsActive = 1`,
      { email }
    );
    if (!admins.recordset.length) {
      return res.status(404).json({ error: 'No admin account with that email' });
    }

    const issued = await issueOtp({
      email,
      purpose: 'admin_login',
      payload: { userId: admins.recordset[0].UserId },
    });

    res.json({
      message: 'Verification code sent to your email',
      email: issued.email,
      expiresInMinutes: issued.expiresInMinutes,
      emailed: true,
    });
  } catch (err) {
    const status = err.code === 'smtp_not_configured' || err.code === 'smtp_send_failed' ? 503 : 500;
    res.status(status).json({ error: err.message });
  }
});

/** Admin login step 2 — verify OTP → adminLoginToken */
router.post('/admin/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const result = await verifyOtp({ email, purpose: 'admin_login', code });
    if (!result.ok) return res.status(400).json({ error: result.error });

    const adminLoginToken = signOtpGateToken({
      purpose: 'admin_login',
      email: result.email,
      userId: result.payload?.userId,
    });

    res.json({
      adminLoginToken,
      email: result.email,
      message: 'Email verified',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { universityId, email, password, portalRole, adminLoginToken } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let result;

    if (portalRole === 'admin') {
      if (!adminLoginToken) {
        return res.status(400).json({ error: 'Verify your email with the OTP code first' });
      }
      let gate;
      try {
        gate = verifyOtpGateToken(adminLoginToken, 'admin_login');
      } catch {
        return res.status(401).json({ error: 'Email verification expired. Request a new code.' });
      }
      if (gate.email !== normalizedEmail) {
        return res.status(400).json({ error: 'Email verification does not match. Start again.' });
      }

      result = await query(
        `SELECT UserId, UniversityId, Email, PasswordHash, FirstName, LastName, Role, Department, ProfileImageUrl,
                ClassName, StudyMode, IsActive, AccountStatus
         FROM Users WHERE LOWER(Email) = @email AND Role = 'admin'`,
        { email: normalizedEmail }
      );
      if (!result.recordset.length) {
        return res.status(401).json({ error: 'Invalid admin email or password' });
      }
    } else {
      if (!universityId || !String(universityId).trim()) {
        return res.status(400).json({ error: 'University ID is required for student and teacher login' });
      }
      const idCheck = validateUniversityId(universityId);
      if (!idCheck.ok) {
        return res.status(400).json({ error: idCheck.error });
      }
      result = await query(
        `SELECT UserId, UniversityId, Email, PasswordHash, FirstName, LastName, Role, Department, ProfileImageUrl,
                ClassName, StudyMode, IsActive, AccountStatus
         FROM Users WHERE UniversityId = @universityId AND LOWER(Email) = @email`,
        { universityId: idCheck.id, email: normalizedEmail }
      );
    }

    if (!result.recordset.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];
    const valid = await bcrypt.compare(password, user.PasswordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.AccountStatus === 'pending') {
      return res.status(403).json({
        error: 'Your account is waiting for administrator approval. You cannot sign in until an admin accepts your registration.',
        code: 'pending_approval',
      });
    }

    if (!user.IsActive || user.AccountStatus !== 'approved') {
      return res.status(403).json({ error: 'This account is not active. Contact the administrator.' });
    }

    delete user.PasswordHash;
    delete user.AccountStatus;
    await query(
      'UPDATE Users SET LastLoginAt = SYSUTCDATETIME(), LastSeenAt = SYSUTCDATETIME() WHERE UserId = @userId',
      { userId: user.UserId }
    );
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authMiddleware, attachUserDetails, (req, res) => {
  res.json({ user: req.userDetails });
});

router.put('/profile', authMiddleware, attachUserDetails, async (req, res) => {
  try {
    const { firstName, lastName, department, profileImageUrl, phone, bio, contactInfo, className, studyMode } = req.body;
    if (profileImageUrl !== undefined && profileImageUrl !== null && profileImageUrl !== '') {
      if (typeof profileImageUrl !== 'string' || !profileImageUrl.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Profile image must be a valid image file' });
      }
      if (profileImageUrl.length > 600000) {
        return res.status(400).json({ error: 'Profile image is too large (max ~400KB)' });
      }
    }

    let nextClass = req.userDetails.ClassName ?? null;
    let nextMode = req.userDetails.StudyMode ?? null;
    if (req.userDetails.Role === 'student') {
      if (className !== undefined) {
        nextClass = String(className || '').trim().replace(/\s+/g, ' ').toUpperCase() || null;
        if (!nextClass) return res.status(400).json({ error: 'Class is required (e.g. BIT 9)' });
      }
      if (studyMode !== undefined) {
        const mode = String(studyMode || '').trim().toLowerCase().replace('-', '_');
        if (mode === 'full_time' || mode === 'fulltime') nextMode = 'full_time';
        else if (mode === 'part_time' || mode === 'parttime') nextMode = 'part_time';
        else return res.status(400).json({ error: 'Study mode must be full-time or part-time' });
      }
    }

    await query(
      `UPDATE Users SET
         FirstName = @firstName,
         LastName = @lastName,
         Department = @department,
         ProfileImageUrl = @profileImageUrl,
         Phone = @phone,
         Bio = @bio,
         ContactInfo = @contactInfo,
         ClassName = @className,
         StudyMode = @studyMode,
         UpdatedAt = SYSUTCDATETIME()
       WHERE UserId = @userId`,
      {
        firstName: (firstName || req.userDetails.FirstName).trim(),
        lastName: (lastName || req.userDetails.LastName).trim(),
        department: department ?? req.userDetails.Department,
        profileImageUrl: profileImageUrl === '' ? null : (profileImageUrl ?? req.userDetails.ProfileImageUrl ?? null),
        phone: phone ?? req.userDetails.Phone ?? null,
        bio: bio ?? req.userDetails.Bio ?? null,
        contactInfo: contactInfo ?? req.userDetails.ContactInfo ?? null,
        className: nextClass,
        studyMode: nextMode,
        userId: req.user.userId,
      }
    );
    const updated = await query(
      'SELECT UserId, UniversityId, Email, FirstName, LastName, Role, Department, ProfileImageUrl, Phone, Bio, ContactInfo, ClassName, StudyMode FROM Users WHERE UserId = @userId',
      { userId: req.user.userId }
    );
    res.json({ user: updated.recordset[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Forgot password step 1 — email → OTP (student / teacher / admin) */
router.post('/password-reset/request-otp', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const portalRole = String(req.body.role || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!['student', 'teacher', 'admin'].includes(portalRole)) {
      return res.status(400).json({ error: 'Role is required (student, teacher, or admin)' });
    }

    const users = await query(
      `SELECT UserId, Email, Role, AccountStatus, IsActive
       FROM Users WHERE LOWER(Email) = @email AND Role = @role`,
      { email, role: portalRole }
    );
    if (!users.recordset.length) {
      return res.status(404).json({ error: 'No account found with that email for this portal' });
    }
    const user = users.recordset[0];
    if (!user.IsActive) {
      return res.status(403).json({ error: 'This account is inactive. Contact administration.' });
    }
    if (user.AccountStatus && user.AccountStatus !== 'approved') {
      return res.status(403).json({
        error: 'Account is pending approval. You cannot reset the password yet.',
        code: 'pending_approval',
      });
    }

    const issued = await issueOtp({
      email,
      purpose: 'password_reset',
      payload: { userId: user.UserId, role: portalRole },
    });

    res.json({
      message: 'Verification code sent to your email',
      email: issued.email,
      expiresInMinutes: issued.expiresInMinutes,
      emailed: true,
    });
  } catch (err) {
    const status = err.code === 'smtp_not_configured' || err.code === 'smtp_send_failed' ? 503 : 500;
    res.status(status).json({ error: err.message });
  }
});

/** Forgot password step 2 — verify OTP → resetToken */
router.post('/password-reset/verify-otp', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const { code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const result = await verifyOtp({ email, purpose: 'password_reset', code });
    if (!result.ok) return res.status(400).json({ error: result.error });

    const resetToken = signOtpGateToken({
      purpose: 'password_reset',
      email: result.email,
      userId: result.payload?.userId,
      role: result.payload?.role,
    });

    res.json({
      resetToken,
      email: result.email,
      message: 'Email verified — set a new password',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Forgot password step 3 — resetToken + new password */
router.post('/password-reset/confirm', async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;
    if (!resetToken) return res.status(400).json({ error: 'Verification expired. Request a new code.' });
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    if (confirmPassword != null && confirmPassword !== newPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    let gate;
    try {
      gate = verifyOtpGateToken(resetToken, 'password_reset');
    } catch {
      return res.status(401).json({ error: 'Verification expired. Request a new code.' });
    }

    const userId = gate.userId;
    const email = gate.email;
    if (!userId || !email) {
      return res.status(401).json({ error: 'Invalid reset token. Start again.' });
    }

    const users = await query(
      `SELECT UserId, Email, Role, IsActive FROM Users WHERE UserId = @userId AND LOWER(Email) = @email`,
      { userId, email }
    );
    if (!users.recordset.length) {
      return res.status(404).json({ error: 'Account not found' });
    }
    if (gate.role && users.recordset[0].Role !== gate.role) {
      return res.status(400).json({ error: 'Role mismatch. Start password reset again.' });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 12);
    await query(
      `UPDATE Users SET PasswordHash = @passwordHash, PlainPassword = @plain, UpdatedAt = SYSUTCDATETIME()
       WHERE UserId = @userId`,
      { passwordHash, plain: String(newPassword), userId }
    );

    res.json({
      message: 'Password updated. You can sign in with your new password.',
      email,
      role: users.recordset[0].Role,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Update password (students/teachers) or email (admin only). Admin cannot change password or HU ID. */
router.put('/credentials', authMiddleware, attachUserDetails, async (req, res) => {
  try {
    const { currentPassword, newPassword, email } = req.body;
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required to save account changes' });
    }

    const row = await query(
      'SELECT UserId, PasswordHash, Role, UniversityId, Email FROM Users WHERE UserId = @userId',
      { userId: req.user.userId }
    );
    if (!row.recordset.length) return res.status(404).json({ error: 'User not found' });

    const account = row.recordset[0];
    const valid = await bcrypt.compare(currentPassword, account.PasswordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const isAdmin = account.Role === 'admin';
    const updates = [];
    const params = { userId: req.user.userId };

    if (isAdmin) {
      if (newPassword) {
        return res.status(403).json({ error: 'Administrator passwords are fixed by the system and cannot be changed here.' });
      }
      if (req.body.universityId) {
        return res.status(403).json({ error: 'Administrators sign in with email only — University ID is not used.' });
      }
      if (email) {
        const normalized = email.toLowerCase().trim();
        const dup = await query(
          'SELECT UserId FROM Users WHERE Email = @email AND UserId <> @userId',
          { email: normalized, userId: req.user.userId }
        );
        if (dup.recordset.length) {
          return res.status(409).json({ error: 'That email is already in use' });
        }
        params.email = normalized;
        updates.push('Email = @email');
      }
      if (!updates.length) {
        return res.status(400).json({ error: 'Provide an updated email address' });
      }
    } else {
      if (email || req.body.universityId) {
        return res.status(403).json({ error: 'Only your password can be changed. Contact admin for ID or email updates.' });
      }
      if (!newPassword) {
        return res.status(400).json({ error: 'Provide a new password' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }
      params.passwordHash = await bcrypt.hash(newPassword, 12);
      params.plain = newPassword;
      updates.push('PasswordHash = @passwordHash', 'PlainPassword = @plain');
    }

    updates.push('UpdatedAt = SYSUTCDATETIME()');
    await query(`UPDATE Users SET ${updates.join(', ')} WHERE UserId = @userId`, params);

    const updated = await query(
      `SELECT UserId, UniversityId, Email, FirstName, LastName, Role, Department, ProfileImageUrl
       FROM Users WHERE UserId = @userId`,
      { userId: req.user.userId }
    );
    const user = updated.recordset[0];
    const token = signToken(user);
    res.json({ user, token, message: 'Account updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/heartbeat', authMiddleware, async (req, res) => {
  try {
    const { query } = await import('../db.js');
    await query('UPDATE Users SET LastSeenAt = SYSUTCDATETIME() WHERE UserId = @userId', { userId: req.user.userId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
