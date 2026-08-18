const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const accessRequestController = require("../controllers/accessRequest.controller");

router.use(authMiddleware);

// Request access to a file
router.post("/", accessRequestController.create);

// My outgoing requests
router.get("/my", accessRequestController.myRequests);

// Incoming requests to me (file owner)
router.get("/incoming", accessRequestController.incomingRequests);

// Approve request
router.patch("/:id/approve", accessRequestController.approve);

// Reject request
router.patch("/:id/reject", accessRequestController.reject);

module.exports = router;
