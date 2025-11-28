const express = require('express');
const router = express.Router();
const contributionController = require('../controllers/contributionController');
const { protect } = require('../middleware/authMiddleware');

// Route: POST /api/contributions
router.get('/', protect, contributionController.getContributionsByUser);

// Get all contributions by user
router.get('/user/:userId', contributionController.getContributionsByUser);

// Get all contributions for a chit
router.get('/chit/:chitId', contributionController.getContributionsByChit);

// Get unpaid months for a user in a chit
router.get('/status/:chitId/:userId', contributionController.getContributionStatus);

module.exports = router;
