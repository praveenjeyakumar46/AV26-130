/**
 * Task model types
 */
export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TaskWithTags extends Task {
  tags?: Tag[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  due_date?: Date | string;
  tag_ids?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  due_date?: Date | string | null;
  tag_ids?: string[];
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTagInput {
  name: string;
  color?: string;
  description?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
  description?: string;
}

