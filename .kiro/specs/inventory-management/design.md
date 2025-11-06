# Design Document

## Overview

The Inventory Management System (IMS) is a full-stack web application designed to provide comprehensive inventory tracking and management capabilities. The system follows a modern three-tier architecture with a React frontend, Node.js/Express backend, and PostgreSQL database, supporting real-time inventory operations and administrative functions.

## Architecture

### Project Structure
```
inventory-management/
├── frontend/                 # React + TypeScript application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components (Dashboard, Inventory, Admin)
│   │   ├── services/        # API client and authentication
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
├── backend/                  # Express.js API server
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── middleware/      # Authentication, validation, error handling
│   │   ├── services/        # Business logic services
│   │   ├── controllers/     # Request/response handling
│   │   └── utils/           # Utility functions
│   ├── prisma/              # Database schema and migrations
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml       # PostgreSQL container configuration
├── .env                     # Environment variables
├── .gitignore
├── README.md
└── .kiro/                   # Kiro specifications
    └── specs/
```

### System Architecture
The system follows a layered architecture pattern:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (React/TS)    │◄──►│  (Express.js)   │◄──►│  (PostgreSQL    │
│   /frontend/    │    │   /backend/     │    │   in Docker)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Prisma ORM    │
                       │ /backend/prisma/│
                       └─────────────────┘
```

### Technology Stack
- **Frontend**: React with TypeScript for type safety and component-based UI
- **Backend**: Node.js with Express framework for RESTful API
- **Database**: PostgreSQL running in Docker container with persistent volumes
- **ORM**: Prisma ORM for type-safe database operations and migrations
- **Authentication**: JWT-based authentication with role-based access control
- **Containerization**: Docker for database deployment and development consistency
- **API Documentation**: OpenAPI/Swagger for API documentation

## Components and Interfaces

### Frontend Components
- **Authentication Module**: Login/logout functionality with role-based routing (Admin/User)
- **Dashboard**: Overview of inventory metrics and key performance indicators (accessible to both roles)
- **Inventory Management**: CRUD operations for inventory items with search/filter (accessible to both roles)
- **Admin Panel**: User management and system configuration interface (Admin-only access)
- **Reports Module**: Generate and export inventory reports with date filtering (accessible to both roles)
- **Alerts System**: Display low stock alerts and system notifications (accessible to both roles)

### Backend Services
- **Authentication Service**: JWT token management and user authentication with Admin/User role validation
- **Inventory Service**: Core inventory operations and business logic (accessible to both Admin and User roles)
- **User Management Service**: Admin-only functions for user CRUD operations
- **Reporting Service**: Generate reports and analytics (accessible to both Admin and User roles)
- **Notification Service**: Handle alerts and system notifications (accessible to both roles)

### API Endpoints
- `POST /api/auth/login` - User authentication
- `GET /api/inventory` - Retrieve inventory items with filtering
- `POST /api/inventory` - Create new inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item
- `GET /api/reports` - Generate inventory reports
- `GET /api/admin/users` - Admin: Retrieve users
- `POST /api/admin/users` - Admin: Create user
- `PUT /api/admin/users/:id` - Admin: Update user

## Data Models

### Prisma Schema Design
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      UserRole @default(USER)
  name      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  inventoryActions InventoryAction[]
  auditLogs        AuditLog[]
}

model InventoryItem {
  id          String   @id @default(cuid())
  name        String
  description String?
  sku         String   @unique
  category    String
  stockLevel  Int      @default(0)
  minStock    Int      @default(0)
  maxStock    Int?
  unitPrice   Decimal
  location    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  actions InventoryAction[]
}

model InventoryAction {
  id        String     @id @default(cuid())
  type      ActionType
  quantity  Int
  notes     String?
  createdAt DateTime   @default(now())
  
  userId String
  user   User   @relation(fields: [userId], references: [id])
  
  itemId String
  item   InventoryItem @relation(fields: [itemId], references: [id])
}

model AuditLog {
  id           String   @id @default(cuid())
  action       String
  resourceType String
  resourceId   String
  changes      Json?
  createdAt    DateTime @default(now())
  
  userId String
  user   User   @relation(fields: [userId], references: [id])
}

enum UserRole {
  ADMIN
  USER
}

enum ActionType {
  ADD_STOCK
  REMOVE_STOCK
  ADJUST_STOCK
  TRANSFER
}
```

### TypeScript Types (Generated by Prisma)
```typescript
// Auto-generated by Prisma Client
export type User = {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type InventoryItem = {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  category: string;
  stockLevel: number;
  minStock: number;
  maxStock: number | null;
  unitPrice: Decimal;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Error Handling

### Error Response Format
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}
```

### Error Categories
- **Authentication Errors**: Invalid credentials, expired tokens
- **Authorization Errors**: Insufficient permissions for requested action
- **Validation Errors**: Invalid input data, constraint violations
- **Business Logic Errors**: Stock level violations, duplicate SKUs
- **System Errors**: Database connection issues, external service failures

### Error Handling Strategy
- Global error middleware for consistent error responses
- Input validation using schema validation libraries
- Graceful degradation for non-critical features
- Comprehensive logging for debugging and monitoring

## Testing Strategy

### Testing Levels
- **Unit Tests**: Individual functions and components
- **Integration Tests**: API endpoints and database interactions
- **End-to-End Tests**: Complete user workflows

### Testing Tools
- **Frontend**: Jest + React Testing Library
- **Backend**: Jest + Supertest for API testing
- **Database**: Docker PostgreSQL test container with Prisma migrations
- **ORM Testing**: Prisma test database with seed data

### Test Coverage Goals
- Minimum 80% code coverage for critical business logic
- 100% coverage for authentication and authorization functions
- Comprehensive testing of inventory operations and data integrity
## Do
cker Configuration

### PostgreSQL Container Setup
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: inventory_db
    environment:
      POSTGRES_DB: inventory_management
      POSTGRES_USER: inventory_user
      POSTGRES_PASSWORD: inventory_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

volumes:
  postgres_data:
```

### Environment Configuration
```env
# .env
DATABASE_URL="postgresql://inventory_user:inventory_password@localhost:5432/inventory_management"
JWT_SECRET="your-jwt-secret-key"
NODE_ENV="development"
PORT=3001
```

### Prisma Configuration
```prisma
// backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Development Workflow
```bash
# 1. Start PostgreSQL database
docker-compose up -d

# 2. Start backend development server
cd backend
npm install
npm run dev

# 3. Start frontend development server (new terminal)
cd frontend
npm install
npm start

# 4. Run database migrations (when needed)
cd backend
npx prisma migrate dev
```