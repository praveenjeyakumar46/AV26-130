# Tasks API Documentation

Complete RESTful API endpoints for task management with pagination, filtering, sorting, and full CRUD operations.

## Base URL

```
/api/v1/tasks
```

All endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. Get All Tasks

Get a paginated list of tasks with optional filtering and sorting.

**Endpoint:** `GET /api/v1/tasks`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (starts at 1) |
| `perPage` | number | 10 | Items per page (max 100) |
| `status` | string | - | Filter by status: `pending`, `in_progress`, `completed`, `cancelled` |
| `priority` | string | - | Filter by priority: `low`, `medium`, `high`, `urgent` |
| `search` | string | - | Search in title and description (max 100 chars) |
| `sortBy` | string | `created_at` | Sort field: `created_at`, `updated_at`, `due_date`, `title`, `status`, `priority` |
| `sortOrder` | string | `desc` | Sort order: `asc` or `desc` |

**Example Request:**

```bash
GET /api/v1/tasks?page=1&perPage=20&status=pending&priority=high&sortBy=due_date&sortOrder=asc
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "user-uuid",
      "title": "Complete project documentation",
      "description": "Write comprehensive API documentation",
      "status": "in_progress",
      "priority": "high",
      "due_date": "2024-12-31T23:59:59.000Z",
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-16T14:30:00.000Z",
      "tags": [
        {
          "id": "tag-uuid",
          "name": "work",
          "color": "#3B82F6",
          "description": "Work-related tasks"
        }
      ]
    }
  ],
  "message": "Tasks retrieved successfully",
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid query parameters
- `401 Unauthorized` - Missing or invalid token
- `500 Internal Server Error` - Server error

---

### 2. Get Task by ID

Get a single task by its ID.

**Endpoint:** `GET /api/v1/tasks/:id`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Task ID |

**Example Request:**

```bash
GET /api/v1/tasks/550e8400-e29b-41d4-a716-446655440000
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-uuid",
    "title": "Complete project documentation",
    "description": "Write comprehensive API documentation",
    "status": "in_progress",
    "priority": "high",
    "due_date": "2024-12-31T23:59:59.000Z",
    "created_at": "2024-01-15T10:00:00.000Z",
    "updated_at": "2024-01-16T14:30:00.000Z",
    "tags": [
      {
        "id": "tag-uuid",
        "name": "work",
        "color": "#3B82F6"
      }
    ]
  },
  "message": "Task retrieved successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Task not found or doesn't belong to user
- `500 Internal Server Error` - Server error

---

### 3. Create Task

Create a new task.

**Endpoint:** `POST /api/v1/tasks`

**Request Body:**

```json
{
  "title": "Complete project documentation",
  "description": "Write comprehensive API documentation",
  "status": "pending",
  "priority": "high",
  "due_date": "2024-12-31T23:59:59.000Z",
  "tag_ids": ["tag-uuid-1", "tag-uuid-2"]
}
```

**Field Validation:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | string | Yes | 1-255 characters |
| `description` | string | No | Max 5000 characters |
| `status` | string | No | `pending`, `in_progress`, `completed`, `cancelled` (default: `pending`) |
| `priority` | string | No | `low`, `medium`, `high`, `urgent` (default: `medium`) |
| `due_date` | ISO 8601 string | No | Valid date string |
| `tag_ids` | string[] | No | Array of valid UUID tag IDs |

**Example Request:**

```bash
POST /api/v1/tasks
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "New Task",
  "description": "Task description",
  "priority": "high",
  "due_date": "2024-12-31T23:59:59.000Z"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-uuid",
    "title": "New Task",
    "description": "Task description",
    "status": "pending",
    "priority": "high",
    "due_date": "2024-12-31T23:59:59.000Z",
    "created_at": "2024-01-15T10:00:00.000Z",
    "updated_at": "2024-01-15T10:00:00.000Z",
    "tags": []
  },
  "message": "Task created successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing or invalid token
- `500 Internal Server Error` - Server error

---

### 4. Update Task

Update an existing task. Only provided fields will be updated.

**Endpoint:** `PATCH /api/v1/tasks/:id`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Task ID |

**Request Body:**

All fields are optional. Only include fields you want to update.

```json
{
  "title": "Updated title",
  "status": "completed",
  "priority": "low",
  "due_date": null,
  "tag_ids": ["new-tag-uuid"]
}
```

**Example Request:**

```bash
PATCH /api/v1/tasks/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "completed",
  "priority": "low"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-uuid",
    "title": "Updated title",
    "description": "Task description",
    "status": "completed",
    "priority": "low",
    "due_date": null,
    "created_at": "2024-01-15T10:00:00.000Z",
    "updated_at": "2024-01-16T15:00:00.000Z",
    "tags": [
      {
        "id": "new-tag-uuid",
        "name": "completed",
        "color": "#10B981"
      }
    ]
  },
  "message": "Task updated successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Task not found or doesn't belong to user
- `500 Internal Server Error` - Server error

---

### 5. Delete Task

Delete a task. This will also delete all associated task_tags (via CASCADE).

**Endpoint:** `DELETE /api/v1/tasks/:id`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Task ID |

**Example Request:**

```bash
DELETE /api/v1/tasks/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": null,
  "message": "Task deleted successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Task not found or doesn't belong to user
- `500 Internal Server Error` - Server error

---

## Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (missing/invalid token) |
| `404` | Not Found |
| `500` | Internal Server Error |

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

## Examples

### Get tasks with filters

```bash
# Get pending high-priority tasks, sorted by due date
GET /api/v1/tasks?status=pending&priority=high&sortBy=due_date&sortOrder=asc&page=1&perPage=10
```

### Search tasks

```bash
# Search for tasks containing "documentation"
GET /api/v1/tasks?search=documentation
```

### Create task with tags

```bash
POST /api/v1/tasks
Content-Type: application/json

{
  "title": "Review code",
  "description": "Review pull request #123",
  "priority": "high",
  "status": "pending",
  "tag_ids": ["tag-uuid-1", "tag-uuid-2"]
}
```

### Update task status

```bash
PATCH /api/v1/tasks/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "status": "completed"
}
```

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Task IDs are UUIDs
- Users can only access their own tasks (enforced by RLS)
- Tags are shared across users
- Deleting a task automatically removes all associated tags (CASCADE)
- Maximum 100 items per page
- Search is case-insensitive and matches title and description

