const express = require("express");
const router = express.Router();
const {
  uploadImages,
  getImages,
  deleteImage,
  updateImage,
} = require("../controllers/imageController");

router.post("/upload", uploadImages);
router.get("/", getImages);
router.delete("/:id", deleteImage);
router.put("/:id", updateImage);

module.exports = router;
