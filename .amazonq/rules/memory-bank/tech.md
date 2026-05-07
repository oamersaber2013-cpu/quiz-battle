# Quiz Battle - Technology Stack

## Programming Languages

### TypeScript 5.4.5
- **Usage**: 100% TypeScript across frontend and backend
- **Configuration**: Strict mode enabled
- **Benefits**: Type safety, better IDE support, reduced runtime errors

## Frontend Stack

### Core Framework
- **Next.js 14.2.3** - React framework with App Router
  - Server-side rendering (SSR)
  - Static site generation (SSG)
  - API routes (minimal usage)
  - File-based routing

### UI Libraries
- **React 18.3.0** - Component library
  - Hooks-based architecture
  - Concurrent rendering
  - Automatic batching
- **Framer Motion 11.2.0** - Animation library
  - Smooth transitions
  - Gesture animations
  - Layout animations
- **clsx 2.1.1** - Conditional className utility

### State Management
- **Zustand 4.5.2** - Lightweight state management
  - Global game state
  - User authentication state
  - UI state (modals, toasts)

### Real-time Communication
- **Socket.io-client 4.7.5** - WebSocket client
  - Real-time game events
  - Chat messaging
  - Player synchronization

### Styling
- **Tailwind CSS** (via globals.css)
  - Utility-first CSS
  - Custom animations
  - Responsive design
  - RTL support

## Backend Stack

### Runtime & Framework
- **Node.js >=18.0.0** - JavaScript runtime
- **Express** (via Fastify 4.27.0) - Web framework
  - REST API endpoints
  - Middleware support
  - Error handling

### Real-time Communication
- **Socket.io 4.7.5** - WebSocket server
  - Event-based architecture
  - Room management
  - Broadcasting

### Database & Caching
- **PostgreSQL** (via Prisma) - Primary database
  - User data
  - Game history
  - Transactions
- **Redis** (ioredis 5.3.2) - In-memory cache
  - Game state storage
  - Session management
  - Rate limiting

### Authentication & Security
- **@fastify/jwt 8.0.0** - JWT token management
- **bcryptjs 2.4.3** - Password hashing
- **@fastify/helmet 11.0.0** - Security headers
- **@fastify/cors 9.0.0** - CORS handling

### Payment Processing
- **Stripe 22.1.0** - Payment gateway
  - Subscription management
  - One-time purchases
  - Webhook handling

### AI Integration
- **OpenAI 4.47.0** - AI bot intelligence
  - Question answering
  - Difficulty adjustment
  - Natural responses

### Utilities
- **nanoid 5.0.7** - Unique ID generation
- **zod 3.23.0** - Schema validation
- **dotenv 16.4.5** - Environment variables

## Build System

### Monorepo Management
- **Turborepo 2.9.9** - Build orchestration
  - Parallel task execution
  - Intelligent caching
  - Dependency graph management

### Package Manager
- **npm 10.2.4** - Dependency management
  - Workspaces support
  - Lock file for reproducibility

### Development Tools
- **tsx 4.21.0** - TypeScript execution
  - Hot reload for backend
  - Fast compilation
- **esbuild 0.27.7** - JavaScript bundler
  - Fast builds
  - Tree shaking

## Development Commands

### Root Level Commands
```bash
# Start all applications in development mode
npm run dev

# Start only web frontend
npm run dev:web

# Start only API backend
npm run dev:api

# Build all packages and applications
npm run build

# Run TypeScript type checking
npm run typecheck

# Run linting
npm run lint
```

### Web Application (apps/web/)
```bash
cd apps/web

# Start Next.js dev server on port 3000
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type check only
npm run typecheck
```

### API Server (apps/api/)
```bash
cd apps/api

# Start API server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm run start

# Type check only
npm run typecheck
```

### Shared Package (packages/shared/)
```bash
cd packages/shared

# Build shared types and utilities
npm run build

# Type check only
npm run typecheck
```

## Environment Configuration

### Required Environment Variables

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

**Backend (.env):**
```bash
# Server
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/quizbattle

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI
OPENAI_API_KEY=sk-...
```

## Deployment

### Docker Setup
```bash
# Build all containers
docker-compose build

# Start all services
docker-compose up

# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

### Production Build
```bash
# Build all packages
npm run build

# Start production servers
cd apps/web && npm run start &
cd apps/api && npm run start &
```

## Testing

### Test Framework
- **Jest** (configured but minimal tests)
- Test file: `apps/web/src/__tests__/game-creation.test.ts`

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch
```

## Code Quality Tools

### TypeScript Configuration
- Strict mode enabled
- No implicit any
- Strict null checks
- ES2022 target

### Linting (Configured)
- ESLint for code quality
- Prettier for formatting (implicit via Next.js)

## Performance Optimizations

### Frontend
- Next.js automatic code splitting
- Image optimization with next/image
- Font optimization
- CSS minification
- Tree shaking

### Backend
- Redis caching for game state
- Connection pooling for database
- Gzip compression
- Rate limiting

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2022+ features
- WebSocket support required
- Mobile responsive (iOS Safari, Chrome Mobile)

## Development Workflow

### 1. Initial Setup
```bash
# Clone repository
git clone <repo-url>

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local

# Start development servers
npm run dev
```

### 2. Making Changes
- Edit files in `apps/web/src/` for frontend
- Edit files in `apps/api/src/` for backend
- Shared types in `packages/shared/src/`
- Hot reload automatically applies changes

### 3. Building for Production
```bash
# Type check everything
npm run typecheck

# Build all packages
npm run build

# Test production build locally
cd apps/web && npm run start
cd apps/api && npm run start
```

## Key Dependencies Summary

| Package | Version | Purpose |
|---------|---------|---------|
| Next.js | 14.2.3 | Frontend framework |
| React | 18.3.0 | UI library |
| Socket.io | 4.7.5 | Real-time communication |
| Zustand | 4.5.2 | State management |
| Framer Motion | 11.2.0 | Animations |
| Fastify | 4.27.0 | Backend framework |
| Prisma | Latest | Database ORM |
| Redis | 5.3.2 | Caching |
| Stripe | 22.1.0 | Payments |
| OpenAI | 4.47.0 | AI integration |
| Turborepo | 2.9.9 | Monorepo tool |
| TypeScript | 5.4.5 | Type system |
