# Inventory Management System

A comprehensive inventory management application built with React, Express.js, and PostgreSQL.

## Features

- Real-time inventory tracking and management
- Role-based access control (Admin/User)
- Comprehensive reporting and analytics
- Admin panel for user and system management
- Low stock alerts and notifications
- Bulk inventory operations

## Technology Stack

- **Frontend**: React with TypeScript
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL (Docker container)
- **ORM**: Prisma
- **Authentication**: JWT-based with role-based access control

## Project Structure

```
inventory-management/
├── frontend/          # React TypeScript application
├── backend/           # Express.js API server
├── docker-compose.yml # PostgreSQL container
├── .env              # Environment variables
└── README.md         # This file
```

## Development Setup

### Prerequisites

- Node.js (Latest LTS version)
- Docker and Docker Compose
- npm or yarn

### Getting Started

1. **Clone the repository and install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

2. **Start the PostgreSQL database**
   ```bash
   # From the root directory
   docker-compose up -d
   ```

3. **Set up the database**
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Start the development servers**
   ```bash
   # Terminal 1: Start backend (from backend/ directory)
   npm run dev
   
   # Terminal 2: Start frontend (from frontend/ directory)
   npm start
   ```

## Available Scripts

### Backend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npx prisma studio` - Open Prisma database studio

### Frontend
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Environment (development/production)
- `PORT` - Backend server port

## API Documentation

The API follows RESTful conventions. Key endpoints:

- `POST /api/auth/login` - User authentication
- `GET /api/inventory` - Get inventory items
- `POST /api/inventory` - Create inventory item
- `GET /api/reports` - Generate reports
- `GET /api/admin/users` - Admin: Get users

## Contributing

1. Follow the existing code style and conventions
2. Write tests for new functionality
3. Update documentation as needed
4. Use meaningful commit messages

## License

This project is licensed under the MIT License.