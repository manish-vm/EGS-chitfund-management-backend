// backend/routes/paymentRoutes.js (non-crashing fallback)
const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/paymentController') || {};
const authMiddleware = require('../middleware/authMiddleware') || {};
const requireAdmin = require('../middleware/adminMiddleware');

// fallback helper
const missingHandler = (name) => (req, res) => {
  console.error(`Missing handler called: ${name}`);
  res.status(500).json({ message: `Server misconfiguration: handler ${name} missing` });
};

const protect = (typeof authMiddleware.protect === 'function') ? authMiddleware.protect : (req,res,next) => { console.warn('protect middleware missing'); return res.status(500).json({message:'protect middleware missing'}); };

router.post('/:chitId', protect, paymentController.createPayment || missingHandler('createPayment'));
router.get('/user', protect, paymentController.getUserPayments || missingHandler('getUserPayments'));
router.get('/:id', protect, paymentController.getPaymentById || missingHandler('getPaymentById'));
router.patch('/:id/request-verification', protect, paymentController.requestVerification || missingHandler('requestVerification'));

router.get('/admin/verification-requests', protect, requireAdmin, paymentController.getVerificationRequests);
router.patch('/admin/:id/approve', protect, requireAdmin, paymentController.adminApprovePayment);
router.patch('/admin/:id/reject', protect, requireAdmin, paymentController.adminRejectPayment);

module.exports = router;
