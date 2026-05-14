# Authentication Middleware Documentation

This middleware provides Supabase JWT token verification and user authentication for Express.js routes.

## Features

- ✅ **JWT Token Verification** - Verifies Supabase JWT tokens
- ✅ **User Extraction** - Extracts user information from token
- ✅ **Token Expiration Handling** - Automatically handles expired tokens
- ✅ **Error Responses** - Returns appropriate error responses
- ✅ **TypeScript Support** - Full type safety with `AuthenticatedRequest`
- ✅ **Role-Based Access Control** - Optional role-based authorization
- ✅ **Optional Authentication** - Support for routes that work with or without auth

## Setup

### 1. Environment Variables

Add to your `.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Optional, for admin operations
```

### 2. Import Middleware

```typescript
import { authenticate, optionalAuthenticate, requireRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
```

## Usage

### Basic Authentication

Protect a route by adding the `authenticate` middleware:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/protected', authenticate, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.id;
  const userEmail = authReq.user.email;
  
  res.json({
    message: 'This is a protected route',
    userId,
    userEmail,
  });
});
```

### Optional Authentication

For routes that work with or without authentication:

```typescript
import { optionalAuthenticate } from '../middleware/auth';

router.get('/public-or-private', optionalAuthenticate, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  
  if (authReq.user) {
    res.json({
      message: 'Authenticated user',
      user: authReq.user,
    });
  } else {
    res.json({
      message: 'Public access',
    });
  }
});
```

### Role-Based Access Control

Restrict access based on user roles:

```typescript
import { authenticate, requireRole } from '../middleware/auth';

// Single role
router.get('/admin', authenticate, requireRole('admin'), (req, res) => {
  res.json({ message: 'Admin access' });
});

// Multiple roles
router.get('/moderator-or-admin', 
  authenticate, 
  requireRole('moderator', 'admin'),
  (req, res) => {
    res.json({ message: 'Moderator or admin access' });
  }
);
```

### With Controllers

```typescript
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest, ApiResponse } from '../types';

export const getMyData = asyncHandler(
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    
    // Your logic here
    sendSuccess(res, { userId }, 'Data retrieved');
  }
);

// In routes
router.get('/my-data', authenticate, getMyData);
```

## Request Headers

The middleware expects the JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

Or without the "Bearer" prefix:

```
Authorization: <your-jwt-token>
```

## User Object

After authentication, `req.user` contains:

```typescript
interface User {
  id: string;                    // User UUID
  email: string;                 // User email
  email_verified: boolean;       // Email verification status
  phone: string | null;          // Phone number (if available)
  role: string;                 // User role (default: 'authenticated')
  metadata: Record<string, unknown>; // User metadata
  created_at: string;            // Account creation timestamp
}
```

## Error Responses

### Missing Token

```json
{
  "success": false,
  "error": {
    "message": "Authorization token required",
    "code": "UNAUTHORIZED",
    "details": {
      "message": "Please provide a valid authorization token"
    }
  }
}
```

### Invalid/Expired Token

```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired token",
    "code": "UNAUTHORIZED"
  }
}
```

### Insufficient Permissions

```json
{
  "success": false,
  "error": {
    "message": "Insufficient permissions",
    "code": "FORBIDDEN",
    "details": {
      "message": "Required roles: admin",
      "userRole": "authenticated"
    }
  }
}
```

## API Endpoints

The middleware is already integrated with these endpoints:

- `GET /api/v1/auth/me` - Get current authenticated user
- `GET /api/v1/auth/verify` - Verify JWT token

## Testing

### Using cURL

```bash
# Get current user
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Verify token
curl -X GET http://localhost:3000/api/v1/auth/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using JavaScript/TypeScript

```typescript
const response = await fetch('http://localhost:3000/api/v1/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();
```

## Best Practices

1. **Always use `authenticate` middleware** for protected routes
2. **Use `optionalAuthenticate`** for public routes that can benefit from user context
3. **Combine with rate limiting** to prevent abuse:
   ```typescript
   router.get('/protected', apiLimiter, authenticate, controller);
   ```
4. **Type your requests** using `AuthenticatedRequest`:
   ```typescript
   const authReq = req as AuthenticatedRequest;
   const userId = authReq.user.id;
   ```
5. **Handle errors** - The middleware automatically handles errors, but you can catch them in your error handler

## Troubleshooting

### Token Not Working

1. Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set correctly
2. Verify the token is valid in Supabase Dashboard
3. Check token expiration
4. Ensure the token is sent in the `Authorization` header

### User Not Attached to Request

- Make sure `authenticate` middleware is called before your controller
- Check that the token is valid
- Verify Supabase client is initialized correctly

### Role-Based Access Not Working

- Ensure user has the correct role in Supabase
- Check that `requireRole` is called after `authenticate`
- Verify role names match exactly (case-sensitive)

## Security Notes

- Tokens are verified server-side using Supabase's `getUser()` method
- Expired tokens are automatically rejected
- Invalid tokens return 401 Unauthorized
- Role checks are performed after authentication
- All authentication errors are logged for security monitoring

