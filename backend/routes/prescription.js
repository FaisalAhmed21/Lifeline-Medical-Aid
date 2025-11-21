const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getPrescriptionContext,
  issuePrescription
} = require('../controllers/prescriptionController');

router.use(protect);

router.get('/emergency/:emergencyId', getPrescriptionContext);
router.post('/', issuePrescription);

module.exports = router;

