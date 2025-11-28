const express = require('express');
const router = express.Router();
const {
  getAllChitSchemes,
  joinChitScheme,createChitScheme,updateScheme, deleteScheme, getJoinedSchemes,getAllChits,
  getChitById,
  releaseChit 
} = require('../controllers/chitController');

const { protect} = require('../middleware/authMiddleware');

router.get('/', getAllChitSchemes);

router.post('/join/:id', protect, joinChitScheme);

router.get('/all', getAllChits);

router.post('/createscheme', createChitScheme);
router.get('/joined', protect, getJoinedSchemes); 
router.put('/:id', updateScheme);
router.delete('/:id', deleteScheme);

router.get('/:id', protect, getChitById);
router.patch('/:id/release', protect, releaseChit);

module.exports = router;
