const prisma = require('../lib/prisma');
const {
  hashPassword,
  verifyPassword,
  revokeAllUserRefreshTokens,
  createEmailVerificationToken,
} = require('../lib/auth');
const { sendVerificationEmail } = require('../lib/mailer');

// Admin emails list - these users get super admin access
const ADMIN_EMAILS = [
  "aryan@devally.in",
];

/**
 * Get current user profile
 */
async function getProfile(req, res) {
  try {
    // Fetch user with organization information
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isMember: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            location: true,
            businessHours: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            // Expose only non-sensitive Razorpay info
            razorpayConnection: {
              select: {
                id: true,
                merchantKeyId: true,
                createdAt: true,
              },
            },
          },
        },
        adminOrganization: {
          select: {
            id: true,
            name: true,
            location: true,
            businessHours: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            // Expose only non-sensitive Razorpay info
            razorpayConnection: {
              select: {
                id: true,
                merchantKeyId: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    // Flatten organization name for easier access
    const userResponse = {
      ...user,
      organizationName: user.isMember
        ? user.organization?.name
        : user.adminOrganization?.name,
      razorpayConnected: Boolean(
        user.adminOrganization?.razorpayConnection || user.organization?.razorpayConnection
      ),
      isAdmin: ADMIN_EMAILS.includes(user.email.toLowerCase()),
    };

    res.status(200).json({
      success: true,
      data: {
        user: userResponse,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching profile.',
    });
  }
}

/**
 * Get current user profile (alias for getProfile)
 */
async function getMe(req, res) {
  return getProfile(req, res);
}

/**
 * Update user profile
 */
async function updateProfile(req, res) {
  try {
    const { name, email, password, currentPassword } = req.body;
    const userId = req.user.id;

    const updateData = {};

    // Update name
    if (name !== undefined) {
      updateData.name = name;
    }

    // Update email
    if (email && email !== req.user.email) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format.',
        });
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use.',
        });
      }

      updateData.email = email;
      updateData.emailVerified = false; // Require re-verification

      // Generate and send verification email for new email
      const verificationToken = await createEmailVerificationToken(userId, email);
      await sendVerificationEmail(email, verificationToken);
    }

    // Update password
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set a new password.',
        });
      }

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      // Verify current password
      const isPasswordValid = await verifyPassword(currentPassword, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect.',
        });
      }

      // Password strength validation
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long.',
        });
      }

      // Hash new password
      updateData.password = await hashPassword(password);

      // Revoke all refresh tokens (force logout everywhere)
      await revokeAllUserRefreshTokens(userId);
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update.',
      });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    let message = 'Profile updated successfully.';
    if (password) {
      message += ' Please log in again.';
    }
    if (email && email !== req.user.email) {
      message += ' A verification email has been sent to your new email address.';
    }

    res.status(200).json({
      success: true,
      message: message,
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating profile.',
    });
  }
}

/**
 * Delete user account
 */
async function deleteAccount(req, res) {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete account.',
      });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password.',
      });
    }

    // Delete user (cascade will delete related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    // Clear cookie
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully.',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting account.',
    });
  }
}

/**
 * Convert USER to ORGANIZATION
 */
async function convertToOrganization(req, res) {
  try {
    const { business } = req.body;
    const organization = business;
    const userId = req.user.id;

    // Fetch current user
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { adminOrganization: true },
    });

    // Check if user is already an ORGANIZATION
    if (currentUser.role === 'ORGANIZATION') {
      return res.status(400).json({
        success: false,
        message: 'User is already an ORGANIZATION.',
      });
    }

    // Validate organization data
    if (!organization || !organization.name || !organization.location) {
      return res.status(400).json({
        success: false,
        message: 'Organization name and location are required.',
      });
    }

    if (!organization.businessHours || !Array.isArray(organization.businessHours)) {
      return res.status(400).json({
        success: false,
        message: 'Business hours are required and must be an array.',
      });
    }

    // Convert user to ORGANIZATION and create organization in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const newOrganization = await tx.organization.create({
        data: {
          name: organization.name,
          location: organization.location,
          businessHours: organization.businessHours,
          description: organization.description || null,
          adminId: userId,
        },
      });

      // Update user role and link to organization
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          role: 'ORGANIZATION',
          isMember: false,
          organizationId: newOrganization.id,
        },
      });

      return { user: updatedUser, organization: newOrganization };
    });

    res.status(200).json({
      success: true,
      message: 'Successfully converted to ORGANIZATION.',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          isMember: result.user.isMember,
        },
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          location: result.organization.location,
          businessHours: result.organization.businessHours,
          description: result.organization.description,
        },
      },
    });
  } catch (error) {
    console.error('Convert to organization error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during conversion.',
    });
  }
}

module.exports = {
  getProfile,
  getMe,
  updateProfile,
  deleteAccount,
  convertToOrganization,
};
