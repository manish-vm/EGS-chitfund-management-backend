const User = require('../models/User');
const jwt = require('jsonwebtoken');
const generateToken = require('../utils/generateToken');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');



exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, address, location } = req.body;

    const imageBuffer = req.file?.buffer;
    const imageBase64 = imageBuffer ? imageBuffer.toString('base64') : null;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      address,
      location,
      image: imageBase64,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Match password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Return token
    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Optional: Return a flag or message for admin
    const isAdmin = user.role === 'admin';

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      image: user.image,
      phone: user.phone,
      address: user.address,
      location: user.location,
      role: user.role,
      isAdmin,
    });
  } catch (err) {
    console.error('getCurrentUser error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
