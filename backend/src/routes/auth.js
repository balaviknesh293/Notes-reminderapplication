const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const excelManager = require('../excel/excelManager');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');
const authMiddleware = require('../auth/authMiddleware');

// 1. Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, securityQuestion, securityAnswer } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const trimmedUsername = username.trim();
    const existing = excelManager.users.find(
      (u) => u.username.toLowerCase() === trimmedUsername.toLowerCase()
    );

    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already exists. Please choose another.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const securityAnswerHash = securityAnswer ? await bcrypt.hash(securityAnswer.trim().toLowerCase(), 10) : '';

    const newUser = {
      userId: crypto.randomUUID(),
      username: trimmedUsername,
      email: email ? String(email).trim() : '',
      emailRemindersEnabled: true,
      passwordHash,
      securityQuestion: securityQuestion || 'What is your favorite color?',
      securityAnswerHash,
      createdDate: new Date().toISOString()
    };

    excelManager.users.push(newUser);

    // Create default categories for user
    const defaultCategories = [
      { categoryName: 'Work', color: '#3b82f6' },
      { categoryName: 'Personal', color: '#10b981' },
      { categoryName: 'Ideas', color: '#f59e0b' },
      { categoryName: 'Study', color: '#8b5cf6' }
    ];

    defaultCategories.forEach((cat) => {
      excelManager.categories.push({
        categoryId: crypto.randomUUID(),
        userId: newUser.userId,
        categoryName: cat.categoryName,
        color: cat.color
      });
    });

    await excelManager.saveToExcel();
    await excelManager.createBackup('register');

    const token = jwt.sign({ userId: newUser.userId, username: newUser.username }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        userId: newUser.userId,
        username: newUser.username,
        email: newUser.email || '',
        emailRemindersEnabled: newUser.emailRemindersEnabled !== false,
        createdDate: newUser.createdDate
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// 2. Login
router.post('/login', async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const user = excelManager.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const expiresIn = rememberMe ? '90d' : JWT_EXPIRES_IN;
    const token = jwt.sign({ userId: user.userId, username: user.username }, JWT_SECRET, {
      expiresIn
    });

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email || '',
        emailRemindersEnabled: user.emailRemindersEnabled !== false,
        securityQuestion: user.securityQuestion,
        createdDate: user.createdDate
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// 3. Forgot Password - Get Security Question
router.post('/forgot-password/question', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: 'Username is required.' });
  }

  const user = excelManager.users.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  return res.json({
    success: true,
    securityQuestion: user.securityQuestion || 'What is your security question?'
  });
});

// 4. Forgot Password - Verify Answer & Reset
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { username, securityAnswer, newPassword, confirmPassword } = req.body;

    if (!username || !securityAnswer || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const user = excelManager.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!user.securityAnswerHash) {
      return res.status(400).json({ success: false, message: 'No security answer set for this account.' });
    }

    const answerMatch = await bcrypt.compare(securityAnswer.trim().toLowerCase(), user.securityAnswerHash);
    if (!answerMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect security answer.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await excelManager.saveToExcel();

    return res.json({ success: true, message: 'Password has been reset successfully. Please log in.' });
  } catch (err) {
    console.error('Password reset error:', err);
    return res.status(500).json({ success: false, message: 'Server error during password reset.' });
  }
});

// 5. Change Password (Authenticated)
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match.' });
    }

    const user = excelManager.users.find((u) => u.userId === req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await excelManager.saveToExcel();

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, message: 'Server error changing password.' });
  }
});

// 6. Update Profile (Change Username, Email, Reminders, Security Question)
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { newUsername, email, emailRemindersEnabled, securityQuestion, securityAnswer } = req.body;
    const user = excelManager.users.find((u) => u.userId === req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (newUsername && newUsername.trim() !== user.username) {
      const trimmed = newUsername.trim();
      const conflict = excelManager.users.find(
        (u) => u.userId !== user.userId && u.username.toLowerCase() === trimmed.toLowerCase()
      );
      if (conflict) {
        return res.status(400).json({ success: false, message: 'That username is already taken.' });
      }
      user.username = trimmed;
    }

    if (email !== undefined) {
      user.email = String(email).trim();
    }

    if (emailRemindersEnabled !== undefined) {
      user.emailRemindersEnabled = Boolean(emailRemindersEnabled);
    }

    if (securityQuestion) user.securityQuestion = securityQuestion;
    if (securityAnswer) {
      user.securityAnswerHash = await bcrypt.hash(securityAnswer.trim().toLowerCase(), 10);
    }

    await excelManager.saveToExcel();

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email || '',
        emailRemindersEnabled: user.emailRemindersEnabled !== false,
        securityQuestion: user.securityQuestion
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
});

// 7. Get Current User Info
router.get('/me', authMiddleware, (req, res) => {
  const user = excelManager.users.find((u) => u.userId === req.user.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }
  return res.json({
    success: true,
    user: {
      userId: user.userId,
      username: user.username,
      email: user.email || '',
      emailRemindersEnabled: user.emailRemindersEnabled !== false,
      securityQuestion: user.securityQuestion,
      createdDate: user.createdDate
    }
  });
});

module.exports = router;
