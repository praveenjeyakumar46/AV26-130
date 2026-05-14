import { Request, Response } from 'express';
import { AuthenticatedRequest, ApiResponse, PaginationQuery } from '../types';
import { sendSuccess, sendPaginated } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { TaskService } from '../services/taskService';
import { CreateTaskInput, UpdateTaskInput } from '../models/Task';

/**
 * Get all tasks with pagination, filtering, and sorting
 * @route GET /api/v1/tasks
 * @access Private
 */
export const getTasks = asyncHandler(
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;

    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const perPage = Math.min(parseInt(req.query.perPage as string) || 10, 100); // Max 100 per page
    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;
    const search = req.query.search as string | undefined;
    const sortBy = (req.query.sortBy as string) || 'created_at';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: {
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      res.status(400).json({
        success: false,
        error: {
          message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    // Validate sortBy
    const validSortFields = [
      'created_at',
      'updated_at',
      'due_date',
      'title',
      'status',
      'priority',
    ];
    if (!validSortFields.includes(sortBy)) {
      res.status(400).json({
        success: false,
        error: {
          message: `Invalid sortBy. Must be one of: ${validSortFields.join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    // Fetch tasks
    const { tasks, total } = await TaskService.getTasks(userId, {
      page,
      perPage,
      status: status as any,
      priority: priority as any,
      search,
      sortBy,
      sortOrder,
    });

    sendPaginated(res, tasks, {
      page,
      perPage,
      total,
    }, 'Tasks retrieved successfully');
  }
);

/**
 * Get task by ID
 * @route GET /api/v1/tasks/:id
 * @access Private
 */
export const getTaskById = asyncHandler(
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const taskId = req.params.id;

    const task = await TaskService.getTaskById(taskId, userId);

    sendSuccess(res, task, 'Task retrieved successfully');
  }
);

/**
 * Create a new task
 * @route POST /api/v1/tasks
 * @access Private
 */
export const createTask = asyncHandler(
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const input: CreateTaskInput = req.body;

    const task = await TaskService.createTask(userId, input);

    res.status(201);
    sendSuccess(res, task, 'Task created successfully', 201);
  }
);

/**
 * Update a task
 * @route PATCH /api/v1/tasks/:id
 * @access Private
 */
export const updateTask = asyncHandler(
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const taskId = req.params.id;
    const input: UpdateTaskInput = req.body;

    const task = await TaskService.updateTask(taskId, userId, input);

    sendSuccess(res, task, 'Task updated successfully');
  }
);

/**
 * Delete a task
 * @route DELETE /api/v1/tasks/:id
 * @access Private
 */
export const deleteTask = asyncHandler(
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const taskId = req.params.id;

    await TaskService.deleteTask(taskId, userId);

    sendSuccess(res, null, 'Task deleted successfully');
  }
);

