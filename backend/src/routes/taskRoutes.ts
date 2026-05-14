import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  apiLimiter,
  createTaskLimiter,
  searchLimiter,
} from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validateRequest';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/taskController';
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdSchema,
} from '../validations/taskValidation';

const router = Router();

/**
 * @route   GET /api/v1/tasks
 * @desc    Get all tasks with pagination, filtering, and sorting
 * @access  Private
 * @query   page, perPage, status, priority, search, sortBy, sortOrder
 * @rateLimit searchLimiter - 30 requests per minute
 */
router.get('/', searchLimiter, authenticate, getTasks);

/**
 * @route   GET /api/v1/tasks/:id
 * @desc    Get task by ID
 * @access  Private
 */
router.get(
  '/:id',
  apiLimiter,
  authenticate,
  validateRequest(taskIdSchema, 'params'),
  getTaskById
);

/**
 * @route   POST /api/v1/tasks
 * @desc    Create a new task
 * @access  Private
 * @rateLimit createTaskLimiter - 10 requests per minute
 */
router.post(
  '/',
  createTaskLimiter,
  authenticate,
  validateRequest(createTaskSchema),
  createTask
);

/**
 * @route   PATCH /api/v1/tasks/:id
 * @desc    Update a task
 * @access  Private
 */
router.patch(
  '/:id',
  apiLimiter,
  authenticate,
  validateRequest(taskIdSchema, 'params'),
  validateRequest(updateTaskSchema),
  updateTask
);

/**
 * @route   DELETE /api/v1/tasks/:id
 * @desc    Delete a task
 * @access  Private
 */
router.delete(
  '/:id',
  apiLimiter,
  authenticate,
  validateRequest(taskIdSchema, 'params'),
  deleteTask
);

export default router;

