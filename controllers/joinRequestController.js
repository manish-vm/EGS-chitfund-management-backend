// backend/controllers/joinRequestController.js
const JoinRequest = require('../models/JoinRequest');
const ChitScheme = require('../models/ChitScheme');
const ChitMember = require('../models/chitMemberModel'); // existing model
const User = require('../models/User');
const Notification = require('../models/Notification'); 

exports.createJoinRequest = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const chitId = req.params.chitId || req.body.chitId;
    if (!chitId) {
      res.status(400);
      return next(new Error('chitId is required'));
    }

    // Ensure user is not already a member
    const chit = await ChitScheme.findById(chitId);
    if (!chit) {
      res.status(404);
      return next(new Error('Chit not found'));
    }

    // Check existing membership via ChitMember or joinedUsers
    const alreadyMember = (chit.currentMembers && chit.currentMembers.some(m => m.toString() === userId.toString()))
      || (chit.joinedUsers && chit.joinedUsers.some(u => {
        if (!u) return false;
        if (typeof u === 'object' && u.user) return u.user.toString() === userId.toString() && u.isApproved;
        return u.toString() === userId.toString();
      }));

    if (alreadyMember) {
      res.status(400);
      return next(new Error('User already a member of this chit'));
    }

    // Check if there is already a pending request
    const existing = await JoinRequest.findOne({ userId, chitId, status: 'pending' });
    if (existing) {
      return res.status(200).json({ message: 'Join request already pending', request: existing });
    }

    const jr = await JoinRequest.create({ userId, chitId });
    return res.status(201).json({ success: true, request: jr });
  } catch (err) {
    next(err);
  }
};

exports.getUserJoinRequests = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const requests = await JoinRequest.find({ userId })
      .populate('chitId', 'name durationInMonths totalMembers')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    next(err);
  }
};

exports.getPendingJoinRequests = async (req, res, next) => {
  try {
    // admin only route
    const requests = await JoinRequest.find({ status: 'pending' })
      .populate('userId', 'name email phone')
      .populate('chitId', 'name totalMembers durationInMonths currentMembers joinedUsers')
      .sort({ createdAt: 1 });
    res.json(requests);
  } catch (err) {
    next(err);
  }
};

exports.approveJoinRequest = async (req, res, next) => {
  try {
    const reqId = req.params.id;
    const jr = await JoinRequest.findById(reqId);
    if (!jr) {
      res.status(404);
      return next(new Error('Join request not found'));
    }
    if (jr.status !== 'pending') {
      return res.status(400).json({ message: `Request already ${jr.status}` });
    }

    const chit = await ChitScheme.findById(jr.chitId);
    if (!chit) {
      res.status(404);
      return next(new Error('Chit not found'));
    }

    // Check capacity if totalMembers exists
    if (typeof chit.totalMembers === 'number' && typeof chit.currentMembers === 'object') {
      const currentCount = chit.currentMembers.length;
      if (currentCount >= chit.totalMembers) {
        // Option: automatically reject if full
        jr.status = 'rejected';
        jr.updatedAt = new Date();
        await jr.save();

        return res.status(400).json({ message: 'Chit is full; join request has been rejected' });
      }
    }

    const userId = jr.userId;

    // 1) Add to chit.joinedUsers with isApproved = true (handle both shapes)
    if (Array.isArray(chit.joinedUsers)) {
      // If joinedUsers contains objects {user, isApproved}, push/update this user
      const existingEntryIndex = chit.joinedUsers.findIndex(u => {
        if (!u) return false;
        if (typeof u === 'object' && u.user) return u.user.toString() === userId.toString();
        return u.toString() === userId.toString();
      });

      if (existingEntryIndex !== -1) {
        // update isApproved
        const existing = chit.joinedUsers[existingEntryIndex];
        if (typeof existing === 'object' && existing.user) {
          existing.isApproved = true;
        } else {
          // convert raw id to object
          chit.joinedUsers[existingEntryIndex] = { user: userId, isApproved: true };
        }
      } else {
        chit.joinedUsers.push({ user: userId, isApproved: true });
      }
    } else {
      // If joinedUsers is missing or is just array of ids
      chit.joinedUsers = chit.joinedUsers || [];
      if (!chit.joinedUsers.some(u => (u.toString ? u.toString() === userId.toString() : false))) {
        chit.joinedUsers.push(userId);
      }
    }

    // 2) Add to currentMembers (if present)
    if (Array.isArray(chit.currentMembers)) {
      if (!chit.currentMembers.some(m => m.toString() === userId.toString())) {
        chit.currentMembers.push(userId);
      }
    } else {
      // if not present, you can create it
      chit.currentMembers = chit.currentMembers || [];
      if (!chit.currentMembers.some(m => m.toString() === userId.toString())) {
        chit.currentMembers.push(userId);
      }
    }

    await chit.save();

    // 3) Create ChitMember record (for join collection)
    // Ensure duplicate ChitMember not created
    const existingMember = await ChitMember.findOne({ chitId: chit._id, userId });
    if (!existingMember) {
      await ChitMember.create({ chitId: chit._id, userId });
    }

    // 4) mark request approved
    jr.status = 'approved';
    jr.updatedAt = new Date();
    await jr.save();

    await Notification.create({
        userId: jr.userId,
        title: 'Join request approved',
        message: `Your join request for '${chit.name}' has been approved.`,
        link: `/joined-schemes/`, // adjust to your frontend route (e.g., /my-schemes or /chits/:id)
        read: false
      });

    // Optionally return updated chit and request
    const populated = await JoinRequest.findById(jr._id).populate('userId', 'name email').populate('chitId', 'name');

    res.json({ success: true, request: populated, chit });
  } catch (err) {
    next(err);
  }
};

exports.rejectJoinRequest = async (req, res, next) => {
  try {
    const reqId = req.params.id;
    const jr = await JoinRequest.findById(reqId);
    if (!jr) {
      res.status(404);
      return next(new Error('Join request not found'));
    }
    if (jr.status !== 'pending') {
      return res.status(400).json({ message: `Request already ${jr.status}` });
    }

    jr.status = 'rejected';
    jr.updatedAt = new Date();
    await jr.save();

      await Notification.create({
        userId: jr.userId,
        title: 'Join request approved',
        message: `Your join request for '${chit.name}' has been approved.`,
        link: `/join-chit/123`, // adjust to your frontend route (e.g., /my-schemes or /chits/:id)
        read: false
      });

    const populated = await JoinRequest.findById(jr._id).populate('userId', 'name email').populate('chitId', 'name');

    res.json({ success: true, request: populated });
  } catch (err) {
    next(err);
  }
};
