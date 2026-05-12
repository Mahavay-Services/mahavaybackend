const { User, RefreshToken } = require('../models');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, getTokenExpiry } = require('../utils/jwt.utils');
const { getClientIP } = require('../utils/helpers');
const { createAuditLog } = require('../services/audit.service');
const { AUDIT_ACTIONS } = require('../config/constants');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000;

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Contact administrator.'
      });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(401).json({
        success: false,
        message: `Account locked. Try again in ${remainingTime} minutes.`
      });
    }

    const isValidPassword = await user.validatePassword(password);

    if (!isValidPassword) {
      const attempts = user.login_attempts + 1;
      const updates = { login_attempts: attempts };

      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        updates.locked_until = new Date(Date.now() + LOCK_TIME);
      }

      await user.update(updates);

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        attemptsRemaining: MAX_LOGIN_ATTEMPTS - attempts
      });
    }

    await user.update({
      login_attempts: 0,
      locked_until: null,
      last_login: new Date()
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      user_id: user.id,
      token: refreshToken,
      expires_at: getTokenExpiry(process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent']?.substring(0, 500)
    });

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.CREATE,
      entityType: 'session',
      entityId: user.id,
      description: 'User logged in'
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const tokenRecord = await RefreshToken.findOne({
      where: { token: refreshToken, is_revoked: false },
      include: [{ association: 'user' }]
    });

    if (!tokenRecord) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      await tokenRecord.update({ is_revoked: true });
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired'
      });
    }

    const user = tokenRecord.user;
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await tokenRecord.update({ is_revoked: true });

    await RefreshToken.create({
      user_id: user.id,
      token: newRefreshToken,
      expires_at: getTokenExpiry(process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent']?.substring(0, 500)
    });

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshToken.update(
        { is_revoked: true },
        { where: { token: refreshToken } }
      );
    }

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.DELETE,
      entityType: 'session',
      entityId: req.user?.id,
      description: 'User logged out'
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{
        association: 'createdBookings',
        attributes: ['id'],
        limit: 0
      }]
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(req.user.id);

    const isValid = await user.validatePassword(currentPassword);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    await user.update({ password_hash: newPassword });

    await RefreshToken.update(
      { is_revoked: true },
      { where: { user_id: user.id } }
    );

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.UPDATE,
      entityType: 'user',
      entityId: user.id,
      description: 'Password changed'
    });

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.'
    });
  } catch (error) {
    next(error);
  }
};
