import express from 'express';
import adminRepository from '../repositories/adminRepository.js';
import badWordsChecker from '../utils/badWords.js';
import Logger from '../logger.js';
import userService from '../services/userService.js';
import { DISABLE_INTERNAL_ACCOUNTS } from '../middleware/auth.js';
import { isAdmin } from '../middleware/adminAuth.js';
import categoryRepository from '../repositories/categoryRepository.js';

const router = express.Router();

// Global comment moderation
router.get('/comments', async (req, res) => {
  try {
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const search = String(req.query.search || '').trim().slice(0, 200);
    res.json(await adminRepository.getAllComments({ offset, limit, search }));
  } catch (error) {
    Logger.error('Error getting comments:', error);
    res.status(500).json({ message: 'Failed to retrieve comments' });
  }
});

router.put('/comments/:id', async (req, res) => {
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  if (!content || content.length > 5000) {
    return res.status(400).json({ message: 'Comment must be between 1 and 5000 characters' });
  }
  try {
    const comment = await adminRepository.updateComment(req.params.id, content);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    res.json(comment);
  } catch (error) {
    Logger.error('Error updating comment:', error);
    res.status(500).json({ message: 'Failed to update comment' });
  }
});

router.delete('/comments/:id', async (req, res) => {
  try {
    if (!(await adminRepository.deleteComment(req.params.id))) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    res.json({ id: req.params.id });
  } catch (error) {
    Logger.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
});

// Global category management
router.get('/categories', async (_req, res) => {
  try {
    res.json({ categories: await categoryRepository.getAll() });
  } catch (error) {
    Logger.error('Error getting categories:', error);
    res.status(500).json({ message: 'Failed to retrieve categories' });
  }
});

router.post('/categories', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const color = String(req.body?.color || '');
  if (!name || name.length > 50) return res.status(400).json({ message: 'Category name must be between 1 and 50 characters' });
  if (color && !['blue', 'emerald', 'purple', 'amber', 'rose', 'cyan', 'indigo', 'teal'].includes(color)) {
    return res.status(400).json({ message: 'Invalid category color' });
  }
  try {
    const category = await categoryRepository.create({ name, color });
    if (!category) return res.status(409).json({ message: 'Category already exists' });
    res.status(201).json(category);
  } catch (error) {
    Logger.error('Error creating category:', error);
    res.status(500).json({ message: 'Failed to create category' });
  }
});

router.patch('/categories/:id', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const color = String(req.body?.color || '');
  if (!name || name.length > 50) return res.status(400).json({ message: 'Category name must be between 1 and 50 characters' });
  if (color && !['blue', 'emerald', 'purple', 'amber', 'rose', 'cyan', 'indigo', 'teal'].includes(color)) {
    return res.status(400).json({ message: 'Invalid category color' });
  }
  try {
    const category = await categoryRepository.update(req.params.id, { name, color });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE' || error?.code === '23505') {
      return res.status(409).json({ message: 'Category already exists' });
    }
    Logger.error('Error updating category:', error);
    res.status(500).json({ message: 'Failed to update category' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    if (!(await categoryRepository.delete(req.params.id))) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    Logger.error('Error deleting category:', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
});

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await adminRepository.getStats();
    res.json(stats);
  } catch (error) {
    Logger.error('Error getting admin stats:', error);
    res.status(500).json({ message: 'Failed to retrieve statistics' });
  }
});

// User management
router.post('/users', async (req, res) => {
  if (DISABLE_INTERNAL_ACCOUNTS) {
    return res.status(403).json({ message: 'Internal accounts are disabled' });
  }

  try {
    const { username, password } = req.body;
    const user = await userService.createUser(username, password);
    res.status(201).json({
      ...user,
      is_admin: isAdmin(user.username),
    });
  } catch (error) {
    const validationErrors = new Set([
      'Username must be between 3 and 30 characters',
      'Password is required',
      'Username can only contain letters, numbers, underscores, and hyphens',
      'Username already exists',
    ]);
    const status = error.message === 'Username already exists'
      ? 409
      : validationErrors.has(error.message) ? 400 : 500;
    if (status === 500) {
      Logger.error('Admin user creation failed:', error);
    } else {
      Logger.debug('Admin user creation rejected:', error.message);
    }
    res.status(status).json({
      message: status === 500 ? 'Failed to create user' : error.message,
    });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { offset = 0, limit = 50, search = '', authType = '', isActive = '' } = req.query;
    const result = await adminRepository.getAllUsers({
      offset: parseInt(offset),
      limit: parseInt(limit),
      search,
      authType,
      isActive
    });
    res.json(result);
  } catch (error) {
    Logger.error('Error getting users:', error);
    res.status(500).json({ message: 'Failed to retrieve users' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await adminRepository.getUserDetails(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    Logger.error('Error getting user details:', error);
    res.status(500).json({ message: 'Failed to retrieve user details' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    if (userId === 0) {
      return res.status(400).json({ message: 'Cannot delete anonymous user' });
    }

    const deleted = await adminRepository.deleteUser(userId);
    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    Logger.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

router.patch('/users/:id/toggle-active', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot modify your own active status' });
    }

    if (userId === 0) {
      return res.status(400).json({ message: 'Cannot modify anonymous user' });
    }

    const user = await adminRepository.toggleUserActive(userId);
    res.json(user);
  } catch (error) {
    Logger.error('Error toggling user active status:', error);
    res.status(500).json({ message: 'Failed to update user status' });
  }
});

// Snippet management
router.get('/snippets', async (req, res) => {
  try {
    const { offset = 0, limit = 50, search = '', userId = '', isPublic = '', language = '', category = '' } = req.query;
    const result = await adminRepository.getAllSnippets({
      offset: parseInt(offset),
      limit: parseInt(limit),
      search,
      userId,
      isPublic,
      language,
      category
    });
    res.json(result);
  } catch (error) {
    Logger.error('Error getting snippets:', error);
    res.status(500).json({ message: 'Failed to retrieve snippets' });
  }
});

router.delete('/snippets/:id', async (req, res) => {
  try {
    const deleted = await adminRepository.deleteSnippetPermanently(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Snippet not found' });
    }
    res.json({ message: 'Snippet deleted successfully' });
  } catch (error) {
    Logger.error('Error deleting snippet:', error);
    res.status(500).json({ message: 'Failed to delete snippet' });
  }
});

router.patch('/snippets/:id/owner', async (req, res) => {
  try {
    const { newUserId } = req.body;

    if (!newUserId) {
      return res.status(400).json({ message: 'newUserId is required' });
    }

    await adminRepository.changeSnippetOwner(req.params.id, newUserId);
    res.json({ message: 'Snippet owner changed successfully' });
  } catch (error) {
    Logger.error('Error changing snippet owner:', error);
    res.status(500).json({ message: 'Failed to change snippet owner' });
  }
});

router.patch('/snippets/:id/toggle-public', async (req, res) => {
  try {
    await adminRepository.toggleSnippetPublic(req.params.id);
    res.json({ message: 'Snippet visibility toggled successfully' });
  } catch (error) {
    Logger.error('Error toggling snippet public status:', error);
    res.status(500).json({ message: 'Failed to toggle snippet visibility' });
  }
});

router.get('/snippets/scan/offensive', async (req, res) => {
  try {
    const result = await adminRepository.scanSnippetsForOffensiveContent(badWordsChecker);
    res.json(result);
  } catch (error) {
    Logger.error('Error scanning snippets for offensive content:', error);
    res.status(500).json({ message: 'Failed to scan snippets for offensive content' });
  }
});

router.get('/snippets/:id', async (req, res) => {
  try {
    const snippet = await adminRepository.getSnippetDetails(req.params.id);
    if (!snippet) {
      return res.status(404).json({ message: 'Snippet not found' });
    }
    res.json(snippet);
  } catch (error) {
    Logger.error('Error getting snippet details:', error);
    res.status(500).json({ message: 'Failed to retrieve snippet details' });
  }
});

// API Key management
router.get('/api-keys', async (req, res) => {
  try {
    const { offset = 0, limit = 50, userId = '' } = req.query;
    const result = await adminRepository.getAllApiKeys({
      offset: parseInt(offset),
      limit: parseInt(limit),
      userId
    });
    res.json(result);
  } catch (error) {
    Logger.error('Error getting API keys:', error);
    res.status(500).json({ message: 'Failed to retrieve API keys' });
  }
});

router.delete('/api-keys/:id', async (req, res) => {
  try {
    const deleted = await adminRepository.deleteApiKey(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'API key not found' });
    }
    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    Logger.error('Error deleting API key:', error);
    res.status(500).json({ message: 'Failed to delete API key' });
  }
});

// Share management
router.get('/shares', async (req, res) => {
  try {
    const { offset = 0, limit = 50, userId = '', requiresAuth = '' } = req.query;
    const result = await adminRepository.getAllShares({
      offset: parseInt(offset),
      limit: parseInt(limit),
      userId,
      requiresAuth
    });
    res.json(result);
  } catch (error) {
    Logger.error('Error getting shares:', error);
    res.status(500).json({ message: 'Failed to retrieve shares' });
  }
});

router.delete('/shares/:id', async (req, res) => {
  try {
    const deleted = await adminRepository.deleteShare(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Share not found' });
    }
    res.json({ message: 'Share deleted successfully' });
  } catch (error) {
    Logger.error('Error deleting share:', error);
    res.status(500).json({ message: 'Failed to delete share' });
  }
});

export default router;
