import express from "express";
import notificationRepository from "../repositories/notificationRepository.js";
import Logger from "../logger.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    res.json(await notificationRepository.list(req.user.id));
  } catch (error) {
    Logger.error("Error listing notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.patch("/read-all", async (req, res) => {
  try {
    const updated = await notificationRepository.markRead(req.user.id);
    res.json({ updated });
  } catch (error) {
    Logger.error("Error marking notifications as read:", error);
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

router.patch("/:notificationId/read", async (req, res) => {
  try {
    const updated = await notificationRepository.markRead(req.user.id, req.params.notificationId);
    if (!updated) return res.status(404).json({ error: "Notification not found" });
    res.json({ id: req.params.notificationId, read: true });
  } catch (error) {
    Logger.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

export default router;
