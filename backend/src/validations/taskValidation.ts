import { z } from 'zod';

/**
 * Task status enum
 */
export const taskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);

/**
 * Task priority enum
 */
export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

/**
 * Create task validation schema
 */
export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters'),
  description: z.string().max(5000, 'Description must be at most 5000 characters').optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  due_date: z
    .union([z.string().datetime(), z.date()])
    .optional()
    .transform((val) => (val ? new Date(val).toISOString() : undefined)),
  tag_ids: z.array(z.string().uuid('Invalid tag ID format')).optional(),
});

/**
 * Update task validation schema
 */
export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters')
    .optional(),
  description: z
    .string()
    .max(5000, 'Description must be at most 5000 characters')
    .nullable()
    .optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  due_date: z
    .union([z.string().datetime(), z.date(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null) return null;
      if (val === undefined) return undefined;
      return new Date(val).toISOString();
    }),
  tag_ids: z.array(z.string().uuid('Invalid tag ID format')).optional(),
});

/**
 * Query parameters validation schema
 */
export const taskQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive()),
  perPage: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().positive().max(100)),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  search: z.string().max(100, 'Search query must be at most 100 characters').optional(),
  sortBy: z
    .enum(['created_at', 'updated_at', 'due_date', 'title', 'status', 'priority'])
    .optional()
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Task ID parameter validation schema
 */
export const taskIdSchema = z.object({
  id: z.string().uuid('Invalid task ID format'),
});

