const express = require('express');
const prisma = require('../db');

const router = express.Router();

// Get all products (with optional search and type filters)
router.get('/products', async (req, res) => {
  try {
    const { search, type, laptopCategory } = req.query;
    let filter = {};

    if (search) {
      filter.name = { contains: String(search) };
    }
    if (type) {
      filter.type = String(type);
    }
    if (laptopCategory) {
      filter.laptopCategory = String(laptopCategory);
    }

    const products = await prisma.product.findMany({
      where: filter
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get a single product
router.get('/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

module.exports = router;
