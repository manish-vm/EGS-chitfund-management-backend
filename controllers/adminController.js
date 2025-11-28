// controllers/adminController.js

const User = require('../models/User');
const ChitScheme = require('../models/ChitScheme');
const Contribution = require('../models/contributionModel');
const ChitMember = require('../models/chitMemberModel');

// Helper to get month name from index
const getMonthName = (index) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[index];
};

// 📊 Dashboard statistics with chart data
exports.getAdminDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSchemes = await ChitScheme.countDocuments();
    const activeSchemes = await ChitScheme.countDocuments({ status: 'active' });
    const completedSchemes = await ChitScheme.countDocuments({ status: 'completed' });

    const userMonthlyStats = await User.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      }
    ]);

    const schemeMonthlyStats = await ChitScheme.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyUsers = Array(12).fill(0);
    const monthlySchemes = Array(12).fill(0);

    userMonthlyStats.forEach(stat => {
      monthlyUsers[stat._id - 1] = stat.count;
    });

    schemeMonthlyStats.forEach(stat => {
      monthlySchemes[stat._id - 1] = stat.count;
    });

    const months = [...Array(12).keys()].map(i => getMonthName(i));

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalSchemes,
        activeSchemes,
        completedSchemes,
        chartData: {
          months,
          users: monthlyUsers,
          schemes: monthlySchemes
        }
      }
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 📄 Summary metrics (used for card counts)
exports.getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalChits = await ChitScheme.countDocuments();
    const totalContributions = await Contribution.countDocuments();
    const totalMembers = await ChitMember.countDocuments();

    res.status(200).json({
      success: true,
      totalUsers,
      totalChits,
      totalContributions,
      totalMembers
    });
  } catch (error) {
    console.error("Dashboard Summary Error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 🧑‍🦱 Get most recent 5 users
exports.getRecentUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(5).select('-password');
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('Recent users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 👥 Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Get All Users Error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ❌ Delete user by ID
exports.deleteUserById = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.approveChitForUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isApproved: true },
      { new: true }
    );
    res.status(200).json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Approval failed', error: err.message });
  }
};
exports.makeAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { role: 'admin' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User updated to admin successfully',
      user,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    // Fetch all chits
    const chits = await ChitScheme.find();

    const reportData = await Promise.all(
      chits.map(async (chit) => {
        // Count members in this chit
        const totalMembers = await ChitMember.countDocuments({ chitId: chit._id });

        // Calculate collected amount (sum of all contributions for this chit)
        const collectedAgg = await Contribution.aggregate([
          { $match: { chitId: chit._id } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const collectedAmount = collectedAgg.length > 0 ? collectedAgg[0].total : 0;

        // Calculate disbursed amount (if stored in chit or contributions)
        // Assuming contributions have a field "disbursed" (boolean) or "type"
        const disbursedAgg = await Contribution.aggregate([
          { $match: { chitId: chit._id, status: 'disbursed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const disbursedAmount = disbursedAgg.length > 0 ? disbursedAgg[0].total : 0;

        return {
          chitName: chit.name,
          totalMembers,
          collectedAmount,
          disbursedAmount
        };
      })
    );

    res.json(reportData);
  } catch (error) {
    console.error('Error generating reports:', error);
    res.status(500).json({ message: 'Error generating reports' });
  }
};

/**
 * GET /api/admin/users/:id
 * Admin-only: return full user profile
 */
exports.getUserById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id).lean();
    if (!user) {
      res.status(404);
      return next(new Error('User not found'));
    }
    // optionally remove sensitive fields
    delete user.password;
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};