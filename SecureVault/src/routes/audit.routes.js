const express = require("express");
const router = express.Router();
const auditController = require("../controllers/audit.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.get("/verify",         authMiddleware, auditController.verify);
router.post("/repair",        authMiddleware, auditController.repairLedger);
router.get("/",               authMiddleware, auditController.getAll);
router.delete("/",            authMiddleware, auditController.clearAll);

module.exports = router;
