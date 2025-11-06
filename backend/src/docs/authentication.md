# Authentication & Authorization System

## Overview

The inventory management system implements JWT-based authentication with role-based access control (RBAC). The system supports two user roles: `ADMIN` and `USER`.

## Features

### Authentication
- JWT token-based authentication
- Secure password hashing using bcryptjs
- Login/logout functionality
- Token verification middleware

### Authorization
- Role-based access control (RBAC)
- Admin-only routes for user management
- User-specific data access restrictions
- Middleware for privilege checking

## API Endpoints

### Authentication Routes (`/api/auth`)

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "User Name",
      "role": "USER"
    },
    "token": "jwt-token-here"
  },
  "message": "Login successful"
}
```

#### POST `/api/auth/logout`
Logout (client-side token removal).

#### GET `/api/auth/me`
Get current user information (requires authentication).

### Admin Routes (`/api/admin`)

All admin routes require authentication and admin privileges.

#### GET `/api/admin/dashboard`
Get admin dashboard statistics.

#### User Management (`/api/admin/users`)
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:id` - Update user
- `PATCH /api/admin/users/:id/activate` - Activate user
- `PATCH /api/admin/users/:id/deactivate` - Deactivate user
- `DELETE /api/admin/users/:id` - Delete user

### User Routes (`/api/users`)

#### GET `/api/users/:id`
Get user by ID (users can only access their own data, admins can access any user's data).

## Middleware

### AuthMiddleware

#### `authenticate`
Verifies JWT token and attaches user to request object.

#### `requireAdmin`
Ensures the authenticated user has admin privileges.

#### `requireUser`
Ensures the authenticated user has user or admin privileges.

## Usage Examples

### Protecting Routes

```typescript
import { AuthMiddleware } from '../middleware/auth.middleware';

const authMiddleware = new AuthMiddleware(prisma);

// Require authentication
router.use(authMiddleware.authenticate);

// Require admin privileges
router.use(authMiddleware.requireAdmin);

// Require user privileges (admin or user)
router.use(authMiddleware.requireUser);
```

### Making Authenticated Requests

Include the JWT token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

## Security Features

- Password hashing with bcryptjs (12 salt rounds)
- JWT token expiration (24 hours by default)
- Role-based access control
- Input validation and sanitization
- Error handling without information leakage

## Environment Variables

```env
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
```

## Testing

Use the test script to verify authentication functionality:

```bash
npx ts-node src/scripts/test-auth.ts
```

## Default Admin User

To create a default admin user for testing:

```bash
npx ts-node src/utils/seed-admin.ts
```

Default credentials:
- Email: `admin@inventory.com`
- Password: `admin123`
- Role: `ADMIN`