// backend/routes/generatedChitRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('../controllers/generatedChitController');

// Optional: add auth middleware if required (e.g., requireAuth/isAdmin)
// const { requireAuth, isAdmin } = require('../middleware/auth');

router.get('/chit/:id/generated', /* requireAuth, isAdmin, */ controller.listGeneratedForChit);
router.post('/chit/:id/generated', /* requireAuth, isAdmin, */ controller.createGeneratedChit);

// Update a generated row
router.put('/chit/:id/generated/:rowId', /* requireAuth, isAdmin, */ controller.updateGeneratedChit);

// Delete a generated row
router.delete('/chit/:id/generated/:rowId', /* requireAuth, isAdmin, */ controller.deleteGeneratedChit);

module.exports = router;
