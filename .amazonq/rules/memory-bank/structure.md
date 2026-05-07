# Quiz Battle - Project Structure

## Directory Organization

### Root Level
```
quiz-battle/
├── apps/              # Application workspaces
├── packages/          # Shared packages
├── infra/            # Infrastructure and deployment
├── game_screenshots/ # Visual documentation
└── *.md             # Project documentation
```

## Core Applications (apps/)

### 1. Web Application (apps/web/)
Next.js 14 frontend with App Router architecture.

**Structure:**
```
apps/web/src/
├── app/              # Next.js pages and routes
│   ├── game/        # Game pages (lobby, play, results)
│   ├── admin/       # Admin dashboard
│   ├── profile/     # User profile
│   ├── stats/       # Statistics page
│   └── store/       # In-app purchases
├── components/       # React components
├── hooks/           # Custom React hooks
├── lib/             # Utilities and configurations
└── store/           # Zustand state management
```

**Key Components:**
- `ChaosGame.tsx` - Chaos mode with drama detection and voting
- `ConquestGame.tsx` - Territory control gameplay
- `TeamsGame.tsx` - Red vs Blue team battles
- `PowerUpEffects.tsx` - Visual effects for power-up activation
- `CustomModeBuilder.tsx` - Host configuration interface
- `WarriorSelector.tsx` - Character selection UI
- `ConquestMap.tsx` - Interactive world map
- `ChatWindow.tsx` - Real-time chat component

**Pages:**
- `/` - Home page with game creation wizard
- `/game/[gameId]` - Active game session
- `/lobby/[gameId]` - Pre-game lobby
- `/results/[gameId]` - Post-game results
- `/stats` - Player statistics dashboard
- `/admin/dashboard` - Admin controls

### 2. API Server (apps/api/)
Express backend with Socket.io for real-time communication.

**Structure:**
```
apps/api/src/
├── lib/              # Core game logic
│   ├── gameOrchestrator.ts      # Standard game modes
│   ├── chaosOrchestrator.ts     # Chaos mode logic
│   ├── conquestOrchestrator.ts  # Conquest mode logic
│   ├── invasionOrchestrator.ts  # Invasion mechanics
│   ├── questionBank.ts          # Question management
│   ├── aiBots.ts               # AI player logic
│   └── scoring.ts              # Score calculation
├── routes/           # REST API endpoints
│   ├── auth.ts      # Authentication
│   ├── games.ts     # Game management
│   ├── admin.ts     # Admin operations
│   └── purchase.ts  # Payment processing
└── socket/          # WebSocket handlers
    └── index.ts     # Socket.io event handlers
```

**Key Orchestrators:**
- `gameOrchestrator.ts` - Manages Solo/Teams/Survival/Blitz/Rush/Mixed modes
- `chaosOrchestrator.ts` - Handles chaos state, voting, traps
- `conquestOrchestrator.ts` - Territory control, fort building, duels
- `invasionOrchestrator.ts` - Attack/defend mechanics

### 3. Workers (apps/workers/)
Background job processing (minimal implementation).

## Shared Packages (packages/)

### 1. Shared Package (packages/shared/)
Common types, enums, and configurations used across frontend and backend.

**Contents:**
- Type definitions (Game, Player, Question, PowerUp)
- Enums (GameMode, QuestionType, PowerUpType, UserRole)
- Validation schemas (Zod)
- Constants and configuration

**Key Types:**
```typescript
GameMode: Solo | Teams | Survival | Blitz | Rush | Mixed | Conquest | Chaos
QuestionType: MultipleChoice | TrueFalse | ImageQuestion | AudioQuestion
PowerUpType: Shield | Freeze | DoubleDown | TimeWarp | Sandstorm | Reveal | Steal
UserRole: Guest | Free | Subscriber | Admin
```

### 2. Database Package (packages/db/)
Prisma ORM configuration and database schema.

**Structure:**
```
packages/db/
├── prisma/
│   └── schema.prisma  # Database schema
└── src/
    └── index.ts       # Prisma client export
```

### 3. UI Package (packages/ui/)
Shared UI components (minimal, most components in web app).

## Infrastructure (infra/)

### Docker Configuration
```
infra/docker/
├── api.Dockerfile     # API server container
├── web.Dockerfile     # Next.js frontend container
└── workers.Dockerfile # Background workers container
```

### Deployment Files
- `docker-compose.yml` - Local development setup
- `docker-compose.prod.yml` - Production configuration
- `deploy.sh` - Deployment automation script

## Architectural Patterns

### 1. Monorepo Structure
- **Tool**: Turborepo for build orchestration
- **Benefits**: Shared code, unified dependencies, parallel builds
- **Workspaces**: npm workspaces for package management

### 2. Real-time Communication
- **Frontend**: Socket.io-client with React hooks
- **Backend**: Socket.io server with event-based architecture
- **State Sync**: Redis for distributed game state

### 3. State Management
- **Frontend**: Zustand for global state (user, game, UI)
- **Backend**: In-memory + Redis for game sessions
- **Persistence**: PostgreSQL via Prisma for user data

### 4. Component Architecture
- **Atomic Design**: Small, reusable components
- **Mode-Specific**: Dedicated components for complex modes (Chaos, Conquest)
- **Shared Logic**: Custom hooks for common patterns

### 5. Game Flow Architecture
```
Client Request → Socket.io → Orchestrator → Game Logic → State Update → Broadcast
```

**Example Flow:**
1. Player submits answer via Socket.io
2. Backend orchestrator validates answer
3. Scoring system calculates points
4. Game state updated in Redis
5. Results broadcast to all players
6. Frontend updates UI reactively

## Key Relationships

### Frontend ↔ Backend
- Socket.io events for real-time gameplay
- REST API for authentication and game creation
- Shared types from `@quiz-battle/shared`

### Game Modes ↔ Orchestrators
- Standard modes → `gameOrchestrator.ts`
- Chaos mode → `chaosOrchestrator.ts`
- Conquest mode → `conquestOrchestrator.ts`

### Components ↔ Store
- Components read from Zustand store
- Socket events update store
- Store triggers component re-renders

## Build System

### Turborepo Tasks
- `dev` - Start all apps in parallel
- `build` - Build all packages and apps
- `typecheck` - TypeScript validation across workspace
- `lint` - Code quality checks

### Dependencies
- **Build Tool**: Turborepo 2.9.9
- **Package Manager**: npm 10.2.4
- **Node Version**: >=18.0.0
- **TypeScript**: 5.4.5

## File Naming Conventions
- **Components**: PascalCase (e.g., `ChaosGame.tsx`)
- **Utilities**: camelCase (e.g., `questionBank.ts`)
- **Pages**: kebab-case folders with `page.tsx`
- **Types**: PascalCase interfaces/types
- **Constants**: UPPER_SNAKE_CASE
