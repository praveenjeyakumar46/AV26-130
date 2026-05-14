import { getSupabaseClient } from '../utils/supabase';
import { AppError } from '../utils/AppError';
import { Task, TaskWithTags, CreateTaskInput, UpdateTaskInput, Tag } from '../models/Task';
import logger from '../config/logger';

/**
 * Task service for database operations
 */
export class TaskService {
  /**
   * Get tasks with pagination, filtering, and sorting
   */
  static async getTasks(
    userId: string,
    options: {
      page?: number;
      perPage?: number;
      status?: Task['status'];
      priority?: Task['priority'];
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ tasks: TaskWithTags[]; total: number }> {
    const supabase = getSupabaseClient();
    const {
      page = 1,
      perPage = 10,
      status,
      priority,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    try {
      // Build query
      let query = supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }

      if (priority) {
        query = query.eq('priority', priority);
      }

      // Search in title and description
      if (search) {
        const searchPattern = `%${search}%`;
        query = query.or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error fetching tasks:', error);
        throw new AppError('Failed to fetch tasks', 500);
      }

      // Fetch tags for each task
      const tasksWithTags = await Promise.all(
        (data || []).map(async (task) => {
          const tags = await this.getTaskTags(task.id);
          return {
            ...task,
            tags,
          } as TaskWithTags;
        })
      );

      return {
        tasks: tasksWithTags,
        total: count || 0,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Unexpected error in getTasks:', error);
      throw new AppError('Failed to fetch tasks', 500);
    }
  }

  /**
   * Get task by ID
   */
  static async getTaskById(taskId: string, userId: string): Promise<TaskWithTags> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Task not found', 404, 'NOT_FOUND');
        }
        logger.error('Error fetching task:', error);
        throw new AppError('Failed to fetch task', 500);
      }

      // Fetch tags
      const tags = await this.getTaskTags(taskId);

      return {
        ...data,
        tags,
      } as TaskWithTags;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Unexpected error in getTaskById:', error);
      throw new AppError('Failed to fetch task', 500);
    }
  }

  /**
   * Create a new task
   */
  static async createTask(
    userId: string,
    input: CreateTaskInput
  ): Promise<TaskWithTags> {
    const supabase = getSupabaseClient();

    try {
      // Prepare task data
      const taskData = {
        user_id: userId,
        title: input.title,
        description: input.description || null,
        status: input.status || 'pending',
        priority: input.priority || 'medium',
        due_date: input.due_date ? new Date(input.due_date).toISOString() : null,
      };

      // Insert task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (taskError) {
        logger.error('Error creating task:', taskError);
        throw new AppError('Failed to create task', 500);
      }

      // Add tags if provided
      if (input.tag_ids && input.tag_ids.length > 0) {
        await this.addTagsToTask(task.id, input.tag_ids);
      }

      // Fetch task with tags
      return await this.getTaskById(task.id, userId);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Unexpected error in createTask:', error);
      throw new AppError('Failed to create task', 500);
    }
  }

  /**
   * Update a task
   */
  static async updateTask(
    taskId: string,
    userId: string,
    input: UpdateTaskInput
  ): Promise<TaskWithTags> {
    const supabase = getSupabaseClient();

    try {
      // Check if task exists and belongs to user
      const existingTask = await this.getTaskById(taskId, userId);

      // Prepare update data
      const updateData: Partial<Task> = {};

      if (input.title !== undefined) {
        updateData.title = input.title;
      }
      if (input.description !== undefined) {
        updateData.description = input.description || null;
      }
      if (input.status !== undefined) {
        updateData.status = input.status;
      }
      if (input.priority !== undefined) {
        updateData.priority = input.priority;
      }
      if (input.due_date !== undefined) {
        updateData.due_date = input.due_date
          ? new Date(input.due_date).toISOString()
          : null;
      }

      // Update task
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating task:', error);
        throw new AppError('Failed to update task', 500);
      }

      // Update tags if provided
      if (input.tag_ids !== undefined) {
        // Remove all existing tags
        await supabase.from('task_tags').delete().eq('task_id', taskId);

        // Add new tags
        if (input.tag_ids.length > 0) {
          await this.addTagsToTask(taskId, input.tag_ids);
        }
      }

      // Fetch updated task with tags
      return await this.getTaskById(taskId, userId);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Unexpected error in updateTask:', error);
      throw new AppError('Failed to update task', 500);
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(taskId: string, userId: string): Promise<void> {
    const supabase = getSupabaseClient();

    try {
      // Check if task exists and belongs to user
      await this.getTaskById(taskId, userId);

      // Delete task (tags will be deleted via CASCADE)
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) {
        logger.error('Error deleting task:', error);
        throw new AppError('Failed to delete task', 500);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Unexpected error in deleteTask:', error);
      throw new AppError('Failed to delete task', 500);
    }
  }

  /**
   * Get tags for a task
   */
  private static async getTaskTags(taskId: string): Promise<Tag[]> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('task_tags')
        .select('tags(*)')
        .eq('task_id', taskId);

      if (error) {
        logger.error('Error fetching task tags:', error);
        return [];
      }

      return (data || []).map((item: any) => item.tags).filter(Boolean);
    } catch (error) {
      logger.error('Unexpected error in getTaskTags:', error);
      return [];
    }
  }

  /**
   * Add tags to a task
   */
  private static async addTagsToTask(taskId: string, tagIds: string[]): Promise<void> {
    const supabase = getSupabaseClient();

    try {
      const taskTagData = tagIds.map((tagId) => ({
        task_id: taskId,
        tag_id: tagId,
      }));

      const { error } = await supabase.from('task_tags').insert(taskTagData);

      if (error) {
        logger.error('Error adding tags to task:', error);
        throw new AppError('Failed to add tags to task', 500);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Unexpected error in addTagsToTask:', error);
      throw new AppError('Failed to add tags to task', 500);
    }
  }
}

