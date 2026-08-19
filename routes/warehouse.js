// routes/warehouse.js
'use strict';
const express              = require('express');
const router               = express.Router();
const authMiddleware       = require('../middleware/authMiddleware');
const warehouseController  = require('../controllers/warehouseController');

// ── Dashboard ─────────────────────────────────────────────────────
router.get('/',
    authMiddleware, warehouseController.dashboard);

// ── Products ──────────────────────────────────────────────────────
router.get('/products',
    authMiddleware, warehouseController.listProducts);

router.get('/products/new',
    authMiddleware, warehouseController.createProductForm);

router.post('/products/new',
    authMiddleware, warehouseController.createProduct);

router.get('/products/:product_id/edit',
    authMiddleware, warehouseController.editProductForm);

router.post('/products/:product_id/edit',
    authMiddleware, warehouseController.updateProduct);

// ── Suppliers ─────────────────────────────────────────────────────
router.get('/suppliers',
    authMiddleware, warehouseController.listSuppliers);

router.get('/suppliers/new',
    authMiddleware, warehouseController.createSupplierForm);

router.post('/suppliers/new',
    authMiddleware, warehouseController.createSupplier);

router.get('/suppliers/:supplier_id/edit',
    authMiddleware, warehouseController.editSupplierForm);

router.post('/suppliers/:supplier_id/edit',
    authMiddleware, warehouseController.updateSupplier);

// ── Product–supplier link (JSON) ──────────────────────────────────
router.post('/products/:product_id/suppliers',
    authMiddleware, warehouseController.addProductSupplier);

// ── Categories JSON (for dynamic dropdowns) ───────────────────────
router.get('/categories/json',
    authMiddleware, warehouseController.categoriesJson);

// ── Stock, Locations, Deliveries, Reports ───────────────────────────
// All served by dedicated route files mounted in index.js:
//   /warehouse/stock      → routes/stock.js
//   /warehouse/locations  → routes/locations.js
//   /warehouse/deliveries → routes/deliveries.js
//   /warehouse/reports    → routes/reports.js
// (No placeholder routes here — those intercept before the real routes)

module.exports = router;




