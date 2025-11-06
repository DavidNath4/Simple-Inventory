# Project Structure & Organization

## Inventory Management Application Structure

This project follows a monorepo structure with separate frontend and backend applications sharing a common database configuration.

## General Organization Principles

### File Naming
- Use consistent naming conventions (kebab-case, camelCase, or snake_case based on language/framework)
- Choose descriptive, meaningful names
- Avoid abbreviations unless they're widely understood
- Group related files logically

### Directory Structure
- Organize by feature or domain rather than file type when possible
- Keep related files close together
- Use clear, descriptive folder names
- Maintain consistent depth levels

### Common Patterns
- Separate source code from configuration files
- Keep tests close to the code they test
- Use dedicated folders for assets, documentation, and tooling
- Maintain a clean root directory

### Documentation
- Include README files in major directories
- Document architectural decisions
- Maintain up-to-date API documentation
- Keep inline comments focused and valuable

### Configuration Management
- Centralize configuration files when possible
- Use environment-specific configurations
- Keep sensitive data out of version control
- Document configuration options and their purposes

## Project Structure
```
inventory-management/
├── frontend/                 # React + TypeScript application
│   ├── src/
│   │   ├── components/      # Reusable UI components (styled with Tailwind CSS)
│   │   ├── pages/           # Page components (Dashboard, Inventory, Admin)
│   │   ├── services/        # API client and authentication
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript type definitions
│   │   ├── styles/          # Global CSS and Tailwind imports
│   │   └── utils/           # Utility functions
│   ├── public/
│   ├── tailwind.config.js   # Tailwind CSS configuration
│   ├── postcss.config.js    # PostCSS configuration for Tailwind
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

## Tailwind CSS Organization

### Styling Approach
- **Utility-First**: Use Tailwind utility classes for component styling
- **Component Composition**: Build reusable components with consistent Tailwind patterns
- **Responsive Design**: Implement mobile-first responsive design using Tailwind breakpoints
- **Design System**: Define custom design tokens in `tailwind.config.js`

### CSS File Structure
```
frontend/src/styles/
├── globals.css              # Tailwind directives and global styles
├── components.css           # Custom component styles (minimal)
└── utilities.css            # Custom utility classes (if needed)
```

### Component Styling Guidelines
- Co-locate component logic and styling within React components
- Use Tailwind classes directly in JSX className attributes
- Create reusable component variants using consistent class patterns
- Minimize custom CSS, prefer Tailwind utilities
- Use CSS-in-JS only when Tailwind utilities are insufficient

## Development Workflow
- **Database**: Start with `docker-compose up -d` from root directory
- **Backend**: Run `npm run dev` from `backend/` directory
- **Frontend**: Run `npm start` from `frontend/` directory
- **Migrations**: Run `npx prisma migrate dev` from `backend/` directory
- **Tailwind**: CSS is automatically compiled during frontend development