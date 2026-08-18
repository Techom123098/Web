const express = require('express');
const prisma = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

// ── Konfigurasi Cloudinary ─────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Multer: simpan di memory (serverless & cloud friendly) ─────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format gambar tidak didukung. Gunakan JPG, PNG, atau WEBP.'));
  }
});

// Helper: upload buffer ke Cloudinary
function uploadBufferToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'computer-store/products',
        transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const totalProducts = await prisma.product.count();
    const totalEmployees = await prisma.employee.count();
    const laptops = await prisma.product.count({ where: { type: 'Laptop' } });
    const pcs = await prisma.product.count({ where: { type: 'PC' } });
    const ssdRam = await prisma.product.count({ where: { type: 'SSD & RAM' } });
    const cctv = await prisma.product.count({ where: { type: 'CCTV' } });
    res.json({ totalProducts, totalEmployees, laptops, pcs, ssdRam, cctv });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Employee Management
router.get('/employees', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

router.post('/employees', async (req, res) => {
  try {
    const { name, position, contact } = req.body;
    const employee = await prisma.employee.create({
      data: { name, position, contact }
    });
    res.json(employee);
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

router.delete('/employees/:id', async (req, res) => {
  try {
    await prisma.employee.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Employee deleted' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

router.put('/employees/:id', async (req, res) => {
  try {
    const { name, position, contact } = req.body;
    const employee = await prisma.employee.update({
      where: { id: parseInt(req.params.id) },
      data: { name, position, contact }
    });
    res.json(employee);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// ── Product Management ─────────────────────────────────────────────────────

// Upload gambar ke Cloudinary via stream buffer
router.post('/products/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const result = await uploadBufferToCloudinary(req.file.buffer);
    res.json({ imageUrl: result.secure_url, source: 'cloudinary' });
  } catch (error) {
    console.error('Upload error:', error.message || error);
    res.status(500).json({ error: 'Failed to upload image', details: error.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const { name, description, advantages, specs, laptopCategory, price, imageUrl, type } = req.body;
    const product = await prisma.product.create({
      data: { name, description, advantages, specs, laptopCategory, price: price ? parseFloat(price) : null, imageUrl, type }
    });
    res.json(product);
  } catch (error) {
    console.error('Create product error:', error.message || error);
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { name, description, advantages, specs, laptopCategory, price, imageUrl, type } = req.body;

    if (imageUrl) {
      const existing = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });
      if (existing?.imageUrl && existing.imageUrl !== imageUrl && existing.imageUrl.includes('cloudinary.com')) {
        const urlParts = existing.imageUrl.split('/');
        const filename = urlParts[urlParts.length - 1].split('.')[0];
        const publicId = `computer-store/products/${filename}`;
        try { await cloudinary.uploader.destroy(publicId); } catch (e) { /* ignore */ }
      }
    }

    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: { name, description, advantages, specs, laptopCategory, price: price ? parseFloat(price) : null, imageUrl, type }
    });
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });

    if (product?.imageUrl && product.imageUrl.includes('cloudinary.com')) {
      const urlParts = product.imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1].split('.')[0];
      const publicId = `computer-store/products/${filename}`;
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudErr) {
        console.warn('Cloudinary delete warning:', cloudErr.message);
      }
    }

    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
