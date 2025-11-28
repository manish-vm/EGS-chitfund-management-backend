const express = require('express');
const router = express.Router();
const { joinChit } = require('../controllers/chitMemberController');

router.post('/join', joinChit);

module.exports = router;
