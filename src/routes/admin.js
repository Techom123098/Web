const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const router = express.Router();
const prisma = new PrismaClient();

// ── Konfigurasi Cloudinary ─────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer pakai Cloudinary storage (upload langsung ke cloud)
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'computer-store/products', // nama folder di Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

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
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Employee Management
router.get('/employees', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(employees);
  } catch (error) {
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
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

router.delete('/employees/:id', async (req, res) => {
  try {
    await prisma.employee.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Employee deleted' });
  } catch (error) {
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
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Product Management - Upload Image ke Cloudinary
router.post('/products/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // URL gambar sudah otomatis dari Cloudinary
    const imageUrl = req.file.path;
    res.json({ imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
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
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { name, description, advantages, specs, laptopCategory, price, imageUrl, type } = req.body;

    // Jika ada gambar baru, hapus gambar lama dari Cloudinary
    if (imageUrl) {
      const existing = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });
      if (existing?.imageUrl && existing.imageUrl !== imageUrl) {
        const urlParts = existing.imageUrl.split('/');
        const filename = urlParts[urlParts.length - 1].split('.')[0];
        const publicId = `computer-store/products/${filename}`;
        try { await cloudinary.uploader.destroy(publicId); } catch (e) { /* abaikan jika gagal */ }
      }
    }

    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: { name, description, advantages, specs, laptopCategory, price: price ? parseFloat(price) : null, imageUrl, type }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});


router.delete('/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });

    // Hapus gambar dari Cloudinary jika ada
    if (product?.imageUrl) {
      // Ambil public_id dari URL Cloudinary (format: .../computer-store/products/namafile)
      const urlParts = product.imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1].split('.')[0]; // tanpa ekstensi
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
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
