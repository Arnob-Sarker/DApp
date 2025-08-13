const express = require('express');
const { sendMeetingEmail } = require('../controllers/meetingController');
const router = express.Router();

router.post('/meeting', sendMeetingEmail);

module.exports = router;
