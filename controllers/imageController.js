const Image = require("../models/ImageModel");

// Upload multiple base64 images
const uploadImages = async (req, res) => {
  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ error: "Images array required" });
    }

    const saved = await Image.insertMany(images);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Fetch all images
const getImages = async (req, res) => {
  try {
    const images = await Image.find();
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete image
const deleteImage = async (req, res) => {
  try {
    await Image.findByIdAndDelete(req.params.id);
    res.json({ message: "Image deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update image
const updateImage = async (req, res) => {
  try {
    const { name, data } = req.body;

    if (!name || !data) {
      return res.status(400).json({ error: "Name & data required" });
    }

    const updated = await Image.findByIdAndUpdate(
      req.params.id,
      { name, data },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { uploadImages, getImages, deleteImage, updateImage };
