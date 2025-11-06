# Technology Stack & Build System

## Inventory Management Application Stack

### Technology Stack
- **Frontend**: React with TypeScript for type safety and component-based architecture
- **Styling**: Tailwind CSS for utility-first styling and responsive design
- **Backend**: Express.js (Node.js) for RESTful API development
- **Database**: PostgreSQL running in Docker container with persistent volumes
- **ORM**: Prisma ORM for type-safe database operations and migrations
- **Authentication**: JWT-based authentication with role-based access control
- **Version Control**: Git for source code management and GitHub for remote repository hosting
- **Containerization**: Docker for database deployment and development consistency
- **API**: RESTful API design with OpenAPI documentation

## General Guidelines

### Code Quality
- Use consistent formatting and linting tools
- Implement type checking where applicable
- Follow language-specific best practices and idioms

### Dependencies
- Keep dependencies up to date and secure
- Document the purpose of each major dependency
- Prefer well-maintained, widely-adopted libraries
- Avoid unnecessary dependencies

### Development Setup Requirements
- **Docker & Docker Compose**: For PostgreSQL database container
- **Node.js**: Latest LTS version for both frontend and backend
- **npm/yarn**: Package management
- **Prisma CLI**: Database schema management and migrations
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development

### Common Development Commands
- **Database**: `docker-compose up -d` (start PostgreSQL container)
- **Backend**: `npm run dev` (Express.js development server)
- **Frontend**: `npm start` (React development server)
- **Database Migration**: `npx prisma migrate dev`
- **Database Studio**: `npx prisma studio`
- **Build Frontend**: `npm run build`
- **Test**: `npm test`
- **Linting**: `npm run lint`
- **Formatting**: `npm run format`
- **Git Status**: `git status` (check current changes)
- **Git Add**: `git add .` (stage all changes)
- **Git Commit**: `git commit -m "descriptive message"` (commit changes)
- **Git Push**: `git push` (push commits to GitHub)
- **Git Remote**: `git remote add origin <url>` (add GitHub repository)
- **Initial Push**: `git push -u origin main` (first push to GitHub)

### Environment Setup
- Use consistent development environments
- Document required tools and versions
- Provide clear setup instructions for new developers

### Performance Considerations
- Optimize for both development and production environments
- Monitor bundle sizes and build times
- Use appropriate caching strategies

### Tailwind CSS Guidelines
- **Utility-First Approach**: Use Tailwind utility classes for styling components
- **Responsive Design**: Utilize Tailwind's responsive prefixes (sm:, md:, lg:, xl:)
- **Component Composition**: Create reusable component patterns with Tailwind utilities
- **Custom Configuration**: Extend Tailwind config for project-specific design tokens
- **Purging**: Ensure unused CSS is purged in production builds
- **Dark Mode**: Consider implementing dark mode using Tailwind's dark: variant
- **Accessibility**: Use Tailwind utilities that maintain accessibility standards

### Git & GitHub Workflow Guidelines
- **Repository Setup**: Create GitHub repository and set up remote origin before development
- **Commit Frequency**: Commit changes after completing each task or logical unit of work
- **Push Frequency**: Push commits to GitHub after each task completion for backup and collaboration
- **Commit Messages**: Use descriptive commit messages following conventional commit format
- **Branching**: Use feature branches for development, merge to main when complete
- **Code Review**: Review changes before committing to ensure quality and consistency
- **Repository Hygiene**: Keep the repository clean with appropriate .gitignore files
- **Documentation**: Update documentation and README files as part of commits
- **Backup**: Regular pushes to GitHub ensure code is backed up and accessible
###
 Docker Configuration
- **PostgreSQL Container**: Persistent data storage with named volumes
- **Environment Variables**: Database credentials and connection strings
- **Port Mapping**: PostgreSQL accessible on localhost:5432
- **Volume Management**: Separate volumes for data persistence and backups

### Prisma ORM Configuration
- **Schema Definition**: Type-safe database schema in `prisma/schema.prisma`
- **Migration Management**: Version-controlled database migrations
- **Client Generation**: Auto-generated TypeScript client for database operations
- **Seeding**: Database seeding scripts for development and testing data