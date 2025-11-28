// backend/controllers/generatedChitController.js
const GeneratedChit = require('../models/GeneratedChit');
const mongoose = require('mongoose');

// helper to create monthKey from date
const monthKeyFromDate = (d = new Date()) => {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

// normalize chitId for queries: return an ObjectId instance when valid, otherwise return the original value
const normalizeChitIdForQuery = (chitId) => {
  if (!chitId) return null;
  if (mongoose.isValidObjectId(chitId)) {
    try {
      return new mongoose.Types.ObjectId(chitId);
    } catch (e) {
      console.warn('normalizeChitIdForQuery: new ObjectId failed, falling back to raw id', e);
      return chitId;
    }
  }
  return chitId;
};

exports.listGeneratedForChit = async (req, res) => {
  try {
    const chitIdRaw = req.params.id;
    const monthKey = req.query.month || null; // optional filter

    if (!chitIdRaw) {
      return res.json({ success: true, rows: [] });
    }

    const chitId = normalizeChitIdForQuery(chitIdRaw);

    const query = { chitId };
    if (monthKey) query.monthKey = monthKey;

    const rows = await GeneratedChit.find(query).sort({ date: -1, chitNo: -1 }).lean();
    return res.json({ success: true, rows });
  } catch (err) {
    console.error('listGeneratedForChit error', err);
    const message = err?.message || 'Server error';
    const payload = { success: false, message, error: err?.message };
    if (process.env.NODE_ENV !== 'production') payload.stack = err?.stack;
    return res.status(500).json(payload);
  }
};

exports.createGeneratedChit = async (req, res) => {
  try {
    const chitIdRaw = req.params.id;
    const {
      chitName,
      walletAmount,
      bidAmount,
      distributed,
      date // optional
    } = req.body;

    if (!chitIdRaw) return res.status(400).json({ success: false, message: 'chit id required' });
    if (typeof walletAmount === 'undefined' || typeof bidAmount === 'undefined' || typeof distributed === 'undefined') {
      return res.status(400).json({ success: false, message: 'walletAmount, bidAmount and distributed are required' });
    }

    const monthKey = monthKeyFromDate(date ? new Date(date) : new Date());
    const chitId = normalizeChitIdForQuery(chitIdRaw);

    const countQuery = { chitId, monthKey };
    const count = await GeneratedChit.countDocuments(countQuery);
    const chitNo = count + 1;

    const row = new GeneratedChit({
      chitId,
      chitName: chitName || '',
      monthKey,
      chitNo,
      date: date ? new Date(date) : new Date(),
      walletAmount,
      bidAmount,
      distributed,
      createdBy: req.user ? req.user._id : undefined
    });

    await row.save();
    return res.status(201).json({ success: true, row });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Conflict generating chit number, try again' });
    }
    const message = err?.message || 'Server error';
    const payload = { success: false, message, error: err?.message };
    if (process.env.NODE_ENV !== 'production') payload.stack = err?.stack;
    return res.status(500).json(payload);
  }
};

/**
 * Update a generated chit row
 * PUT /api/generateChit/chit/:id/generated/:rowId
 *
 * Accepts any of: chitName, walletAmount, bidAmount, distributed, date
 * Will respond with { success: true, row } on success.
 */
exports.updateGeneratedChit = async (req, res) => {
  try {
    const chitIdRaw = req.params.id;
    const rowId = req.params.rowId;
    if (!chitIdRaw || !rowId) return res.status(400).json({ success: false, message: 'chit id and row id required' });

    const chitId = normalizeChitIdForQuery(chitIdRaw);

    // Build patch object only from allowed fields
    const allowed = ['chitName', 'walletAmount', 'bidAmount', 'distributed', 'date', 'monthKey'];
    const patch = {};
    for (const key of allowed) {
      if (typeof req.body[key] !== 'undefined') {
        patch[key] = req.body[key];
      }
    }

    // If date changed, also update monthKey accordingly unless monthKey explicitly provided
    if (patch.date && !patch.monthKey) {
      patch.monthKey = monthKeyFromDate(new Date(patch.date));
    }

    // Ensure we only update a row that belongs to the chit
    const query = { _id: rowId, chitId };
    const updated = await GeneratedChit.findOneAndUpdate(query, { $set: patch }, { new: true }).lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Generated chit row not found' });
    }

    return res.json({ success: true, row: updated });
  } catch (err) {
    console.error('updateGeneratedChit error', err);
    const message = err?.message || 'Server error';
    const payload = { success: false, message, error: err?.message };
    if (process.env.NODE_ENV !== 'production') payload.stack = err?.stack;
    return res.status(500).json(payload);
  }
};

/**
 * Delete a generated chit row
 * DELETE /api/generateChit/chit/:id/generated/:rowId
 */
exports.deleteGeneratedChit = async (req, res) => {
  try {
    const chitIdRaw = req.params.id;
    const rowId = req.params.rowId;
    if (!chitIdRaw || !rowId) return res.status(400).json({ success: false, message: 'chit id and row id required' });

    const chitId = normalizeChitIdForQuery(chitIdRaw);
    const query = { _id: rowId, chitId };
    const removed = await GeneratedChit.findOneAndDelete(query).lean();

    if (!removed) {
      return res.status(404).json({ success: false, message: 'Generated chit row not found' });
    }

    return res.json({ success: true, message: 'Deleted', row: removed });
  } catch (err) {
    console.error('deleteGeneratedChit error', err);
    const message = err?.message || 'Server error';
    const payload = { success: false, message, error: err?.message };
    if (process.env.NODE_ENV !== 'production') payload.stack = err?.stack;
    return res.status(500).json(payload);
  }
};
