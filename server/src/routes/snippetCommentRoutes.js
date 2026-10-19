import express from "express";
import snippetCommentRepository from "../repositories/snippetCommentRepository.js";
import { authenticateToken, getTokenFromRequest, getUserFromToken, DISABLE_ACCOUNTS } from "../middleware/auth.js";
import Logger from "../logger.js";

const router = express.Router();
const MAX_COMMENT_LENGTH = 5000;

async function optionalAuth(req, _res, next) {
  const token = getTokenFromRequest(req);
  if (token) {
    try {
      req.user = await getUserFromToken(token);
    } catch (error) {
      Logger.error("Error resolving optional comment viewer:", error);
    }
  }
  next();
}

function requireAccount(req, res, next) {
  if (DISABLE_ACCOUNTS || !req.user?.username || req.user.id === 0 || req.user.username.startsWith("anon-")) {
    return res.status(401).json({ error: "A registered account is required to comment" });
  }
  next();
}

function validateContent(req, res, next) {
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (!content || content.length > MAX_COMMENT_LENGTH) {
    return res.status(400).json({ error: `Comment must be between 1 and ${MAX_COMMENT_LENGTH} characters` });
  }
  req.commentContent = content;
  next();
}

router.get("/:snippetId/comments", optionalAuth, async (req, res) => {
  try {
    const comments = await snippetCommentRepository.list(req.params.snippetId, req.user);
    if (!comments) return res.status(404).json({ error: "Snippet not found" });
    res.json({ data: comments, total: comments.length });
  } catch (error) {
    Logger.error("Error listing snippet comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/:snippetId/comments", authenticateToken, requireAccount, validateContent, async (req, res) => {
  try {
    const comment = await snippetCommentRepository.create(req.params.snippetId, req.user, req.commentContent);
    if (!comment) return res.status(404).json({ error: "Snippet not found" });
    res.status(201).json(comment);
  } catch (error) {
    Logger.error("Error creating snippet comment:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

router.put("/:snippetId/comments/:commentId", authenticateToken, requireAccount, validateContent, async (req, res) => {
  try {
    const comment = await snippetCommentRepository.update(req.params.snippetId, req.params.commentId, req.user, req.commentContent);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    res.json(comment);
  } catch (error) {
    Logger.error("Error updating snippet comment:", error);
    res.status(500).json({ error: "Failed to update comment" });
  }
});

router.delete("/:snippetId/comments/:commentId", authenticateToken, requireAccount, async (req, res) => {
  try {
    const comment = await snippetCommentRepository.getById(req.params.commentId, req.user);
    if (!comment || String(comment.snippet_id) !== String(req.params.snippetId)) {
      return res.status(404).json({ error: "Comment not found" });
    }
    const deleted = await snippetCommentRepository.delete(req.params.snippetId, req.params.commentId, req.user);
    if (!deleted) return res.status(404).json({ error: "Comment not found" });
    res.json({ id: req.params.commentId });
  } catch (error) {
    Logger.error("Error deleting snippet comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

export default router;
