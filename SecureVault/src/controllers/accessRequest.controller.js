const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../Error/AppError");
const auditService = require("../services/audit.service");

class AccessRequestController {
  create = asyncHandler(async (req, res) => {
    const { fileId, note } = req.body;
    const file = await prisma.file.findUnique({ where: { id: String(fileId) } });
    if (!file) throw new AppError("File not found", 404);

    const existing = await prisma.accessRequest.findFirst({
      where: {
        fileId: String(fileId),
        requesterId: String(req.user.id),
        status: "PENDING"
      }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: "Access request already pending." });
    }

    const request = await prisma.accessRequest.create({
      data: {
        fileId: String(fileId),
        requesterId: String(req.user.id),
        ownerId: String(file.ownerId),
        note: note || ""
      }
    });

    await auditService.logAction({
      user: req.user.id,
      action: "ACCESS_REQUEST_SENT",
      resourceId: fileId,
      details: { note }
    });

    res.status(201).json({ success: true, message: "Access requested. File owner will be notified.", data: { ...request, _id: request.id } });
  });

  myRequests = asyncHandler(async (req, res) => {
    const requests = await prisma.accessRequest.findMany({
      where: { requesterId: String(req.user.id) },
      include: {
        file: { select: { id: true, originalName: true } },
        owner: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    const mapped = requests.map(r => ({
      ...r,
      _id: r.id,
      file: r.file ? { ...r.file, _id: r.file.id } : null,
      owner: r.owner ? { ...r.owner, _id: r.owner.id } : null
    }));
    res.json({ success: true, data: mapped });
  });

  incomingRequests = asyncHandler(async (req, res) => {
    const requests = await prisma.accessRequest.findMany({
      where: { ownerId: String(req.user.id), status: "PENDING" },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        file: { select: { id: true, originalName: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    const mapped = requests.map(r => ({
      ...r,
      _id: r.id,
      requester: r.requester ? { ...r.requester, _id: r.requester.id } : null,
      file: r.file ? { ...r.file, _id: r.file.id } : null
    }));
    res.json({ success: true, data: mapped });
  });

  approve = asyncHandler(async (req, res) => {
    const request = await prisma.accessRequest.findUnique({
      where: { id: String(req.params.id) },
      include: { file: true, requester: true }
    });

    if (!request) throw new AppError("Request not found", 404);
    if (request.ownerId !== String(req.user.id)) throw new AppError("Unauthorized", 403);

    await prisma.accessRequest.update({
      where: { id: String(req.params.id) },
      data: { status: "APPROVED" }
    });

    // Auto-create internal share
    await prisma.internalShare.create({
      data: {
        ownerId: String(req.user.id),
        recipientId: String(request.requesterId),
        fileId: String(request.fileId),
        permission: "DOWNLOADER",
        status: "ACCEPTED",
        message: "Auto-approved via Access Request"
      }
    });

    await auditService.logAction({
      user: req.user.id,
      action: "ACCESS_REQUEST_APPROVED",
      resourceId: request.fileId,
      details: { requestId: request.id }
    });

    res.json({ success: true, message: "Access request approved and share granted." });
  });

  reject = asyncHandler(async (req, res) => {
    const request = await prisma.accessRequest.findUnique({
      where: { id: String(req.params.id) }
    });
    if (!request) throw new AppError("Request not found", 404);
    if (request.ownerId !== String(req.user.id)) throw new AppError("Unauthorized", 403);

    await prisma.accessRequest.update({
      where: { id: String(req.params.id) },
      data: { status: "REJECTED" }
    });

    await auditService.logAction({
      user: req.user.id,
      action: "ACCESS_REQUEST_REJECTED",
      resourceId: request.fileId,
      details: { requestId: request.id }
    });

    res.json({ success: true, message: "Access request rejected." });
  });
}

module.exports = new AccessRequestController();
