const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

const router = express.Router();
const prisma = new PrismaClient();

// ── Konfigurasi Cloudinary ─────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Multer: simpan sementara ke disk, lalu coba upload ke Cloudinary ───────
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: localStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format gambar tidak didukung. Gunakan JPG, PNG, atau WEBP.'));
  }
});

// Helper: upload ke Cloudinary dengan timeout
async function tryCloudinaryUpload(filePath) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Cloudinary timeout (10 detik)'));
    }, 10000);

    cloudinary.uploader.upload(filePath, {
      folder: 'computer-store/products',
      transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
    })
    .then(result => { clearTimeout(timeout); resolve(result); })
    .catch(err => { clearTimeout(timeout); reject(err); });
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

// ── Product Management ─────────────────────────────────────────────────────

// Upload gambar: coba Cloudinary dulu, fallback ke lokal
router.post('/products/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const localPath = req.file.path;
    const localUrl = `/uploads/${req.file.filename}`;
    let imageUrl = `http://localhost:${process.env.PORT || 3000}${localUrl}`;
    let source = 'local';

    // Coba upload ke Cloudinary (dengan timeout 10 detik)
    try {
      const result = await tryCloudinaryUpload(localPath);
      imageUrl = result.secure_url;
      source = 'cloudinary';
      // Hapus file lokal karena sudah di Cloudinary
      fs.unlink(localPath, () => {});
      console.log('✅ Upload ke Cloudinary berhasil:', imageUrl);
    } catch (cloudErr) {
      // Cloudinary gagal — pakai file lokal
      console.warn('⚠️ Cloudinary gagal, pakai upload lokal:', cloudErr.message);
      console.log('📁 Gambar disimpan lokal:', imageUrl);
    }

    res.json({ imageUrl, source });
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

    // Jika ada gambar baru, coba hapus gambar lama dari Cloudinary
    if (imageUrl) {
      const existing = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });
      if (existing?.imageUrl && existing.imageUrl !== imageUrl) {
        // Hapus dari Cloudinary jika URL-nya Cloudinary
        if (existing.imageUrl.includes('cloudinary.com')) {
          const urlParts = existing.imageUrl.split('/');
          const filename = urlParts[urlParts.length - 1].split('.')[0];
          const publicId = `computer-store/products/${filename}`;
          try { await cloudinary.uploader.destroy(publicId); } catch (e) { /* abaikan */ }
        }
        // Hapus file lokal jika URL-nya lokal
        if (existing.imageUrl.includes('/uploads/')) {
          const localFilename = existing.imageUrl.split('/uploads/')[1];
          if (localFilename) {
            const localPath = path.join(uploadsDir, localFilename);
            fs.unlink(localPath, () => {});
          }
        }
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

    if (product?.imageUrl) {
      // Hapus dari Cloudinary jika URL-nya Cloudinary
      if (product.imageUrl.includes('cloudinary.com')) {
        const urlParts = product.imageUrl.split('/');
        const filename = urlParts[urlParts.length - 1].split('.')[0];
        const publicId = `computer-store/products/${filename}`;
        try { await cloudinary.uploader.destroy(publicId); } catch (e) { /* abaikan */ }
      }
      // Hapus file lokal jika URL-nya lokal
      if (product.imageUrl.includes('/uploads/')) {
        const localFilename = product.imageUrl.split('/uploads/')[1];
        if (localFilename) {
          const localPath = path.join(uploadsDir, localFilename);
          fs.unlink(localPath, () => {});
        }
      }
    }

    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;

