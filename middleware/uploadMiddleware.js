const multer = require('multer');

const storage = multer.memoryStorage(); // store in memory for base64 encoding
const upload = multer({ storage });

module.exports = upload;
