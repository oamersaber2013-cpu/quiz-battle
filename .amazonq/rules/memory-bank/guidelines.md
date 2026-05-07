# Quiz Battle - Development Guidelines

## Code Quality Standards

### TypeScript Configuration
- **Strict Mode**: Enabled across all packages
- **No Implicit Any**: All types must be explicitly defined
- **Strict Null Checks**: Enabled for safety
- **Target**: ES2022 for modern JavaScript features
- **Module System**: ESNext with CommonJS interop

### File Organization
- **Components**: PascalCase (e.g., `ConquestGame.tsx`, `PowerUpEffects.tsx`)
- **Utilities**: camelCase (e.g., `questionBank.ts`, `gameOrchestrator.ts`)
- **Pages**: kebab-case folders with `page.tsx` (Next.js App Router)
- **Types**: PascalCase for interfaces/types, UPPER_SNAKE_CASE for constants
- **Hooks**: camelCase with `use` prefix (e.g., `useSound.ts`, `useGamePersistence.ts`)

### Import/Export Patterns
- **Barrel Exports**: Use `index.ts` files to re-export components
  ```typescript
  // components/index.ts
  export { ConquestGame } from "./ConquestGame";
  export { PowerUpEffects, usePowerUpEffects } from "./PowerUpEffects";
  ```
- **Named Exports**: Prefer named exports over default exports for better refactoring
- **Type Exports**: Export types alongside implementations
  ```typescript
  export { useSound, type SoundType } from "./useSound";
  ```

### Code Formatting
- **Indentation**: 2 spaces (consistent across project)
- **Quotes**: Double quotes for strings
- **Semicolons**: Required at end of statements
- **Line Length**: Aim for 80-120 characters, break long lines logically
- **Trailing Commas**: Used in multi-line objects/arrays

## Structural Conventions

### Component Architecture
- **Client Components**: Mark with `"use client"` directive at top of file
- **Functional Components**: Use function declarations, not arrow functions for components
- **Props Interface**: Define props interface above component
  ```typescript
  interface MyComponentProps {
    title: string;
    onAction: () => void;
  }
  
  export function MyComponent({ title, onAction }: MyComponentProps) {
    // implementation
  }
  ```

### State Management Patterns
- **Zustand Store**: Single global store in `store/gameStore.ts`
- **Store Structure**: Flat state with nested objects for complex data
- **Actions**: Defined as methods in store, use `set` and `get` functions
- **Persistence**: Use Zustand persist middleware for auth data only
  ```typescript
  export const useGameStore = create<GameStore>()(
    persist(
      (set, get) => ({
        // state and actions
      }),
      {
        name: "quiz-battle-storage",
        partialize: (state) => ({ /* only persist auth */ })
      }
    )
  );
  ```

### Hook Patterns
- **Custom Hooks**: Return object with methods and state
  ```typescript
  export function useSound() {
    const { soundEnabled, toggleSound } = useGameStore();
    const play = useCallback((type: SoundType) => {
      // implementation
    }, [soundEnabled]);
    
    return { play, soundEnabled, toggleSound };
  }
  ```
- **Refs for Non-Reactive Data**: Use `useRef` for audio elements, timers
- **Callbacks**: Wrap functions in `useCallback` when passed as props

### Styling Approach
- **Inline Styles**: Primary styling method using style objects
- **CSS Variables**: Use CSS custom properties for theming
  ```typescript
  style={{ 
    background: "var(--grad-primary)",
    color: "var(--clr-text)"
  }}
  ```
- **Conditional Classes**: Use `clsx` for dynamic class names
- **Responsive**: Mobile-first approach with inline media queries
- **RTL Support**: Use logical properties and conditional positioning
  ```typescript
  style={{ 
    [isRTL ? "right" : "left"]: 0,
    textAlign: isRTL ? "right" : "left"
  }}
  ```

## Semantic Patterns

### Bilingual Support Pattern
- **Language State**: Stored in Zustand store as `"en" | "ar"`
- **Translation Objects**: Define translations inline with `en` and `ar` keys
  ```typescript
  const T = {
    title: { en: "Sword of Knowledge", ar: "سيف المعرفة" },
    tagline: { en: "Battle of intellect", ar: "معركة ثقافية" }
  };
  
  // Usage
  <h1>{T.title[language]}</h1>
  ```
- **RTL Detection**: `const isRTL = language === "ar"`
- **Direction Attribute**: Set `dir={isRTL ? "rtl" : "ltr"}` on container

### Socket.io Communication Pattern
- **Connection**: Establish in `lib/socket.ts` with singleton pattern
- **Event Listeners**: Set up in `useEffect` hooks, clean up on unmount
  ```typescript
  useEffect(() => {
    const socket = getSocket();
    
    socket.on("game:question", (data) => {
      setQuestion(data.question, data.round, data.totalRounds);
    });
    
    return () => {
      socket.off("game:question");
    };
  }, []);
  ```
- **Event Emitters**: Call directly on socket instance
  ```typescript
  socket.emit("game:answer", { gameId, questionId, answerIndex, timestamp });
  ```
- **Type Safety**: Use shared types from `@quiz-battle/shared`

### Error Handling Pattern
- **Try-Catch**: Wrap async operations in try-catch blocks
- **Toast Notifications**: Use `addToast` from store for user feedback
  ```typescript
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed");
    addToast("success", "Operation successful");
  } catch (err) {
    addToast("error", "Operation failed");
  }
  ```
- **Silent Failures**: Audio playback errors are caught and ignored
- **Validation**: Check response structure before using data

### Animation Patterns
- **CSS Animations**: Define in `globals.css`, apply via className
  ```css
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  ```
- **Framer Motion**: Use for complex component animations
- **Transitions**: Use CSS transitions for hover/active states
- **Performance**: Use `transform` and `opacity` for GPU acceleration

## Internal API Usage

### Zustand Store Access
```typescript
// In components
const { userId, username, addToast } = useGameStore();

// Outside components (actions)
const store = useGameStore.getState();
store.setAuth({ userId, username, token });
```

### Socket Connection
```typescript
import { connectSocket, getSocket, disconnectSocket } from "@/lib/socket";

// Connect
connectSocket(userId, username, token, isGuest);

// Get instance
const socket = getSocket();

// Disconnect
disconnectSocket();
```

### Sound Manager
```typescript
import { soundManager } from "@/lib/sounds";

// Play sound
soundManager.play("CORRECT");
soundManager.play("WRONG");
soundManager.play("TICK");
```

### Game Store Actions
```typescript
// Set game data
setGame({ gameId, joinCode, mode, difficulty });

// Update players
setPlayers(players);
addPlayer(player);
removePlayer(userId);

// Question handling
setQuestion(question, round, totalRounds);
selectAnswer(index);
setLastAnswerResult({ correct, correctIndex });

// Power-ups
addEffect(effect);
removeEffect(effectId);
setEliminatedOptions([0, 2]);

// Chaos mode
setChaosState(state);
setChaosVoting(voting);
castChaosVote("FORGIVE");
```

## Frequently Used Code Idioms

### Conditional Rendering
```typescript
{loading && <LoadingSpinner />}
{error && <ErrorMessage message={error} />}
{data ? <Content data={data} /> : <EmptyState />}
```

### Array Mapping with Keys
```typescript
{players.map((player) => (
  <PlayerCard key={player.userId} player={player} />
))}
```

### Async State Updates
```typescript
const [loading, setLoading] = useState(false);

async function handleAction() {
  setLoading(true);
  try {
    await performAction();
  } finally {
    setLoading(false);
  }
}
```

### Environment Variables
```typescript
const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";
```

### Debounced Effects
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    // action after delay
  }, 300);
  
  return () => clearTimeout(timer);
}, [dependency]);
```

## Common Annotations

### Component Documentation
```typescript
/**
 * PowerUpEffects - Visual effects overlay for power-up activations
 * Displays freeze, sandstorm, shield, and other power-up animations
 */
export function PowerUpEffects() {
  // implementation
}
```

### Type Definitions
```typescript
/** User authentication state */
interface AuthState {
  userId: string | null;
  username: string;
  token: string | null;
  isGuest: boolean;
}
```

### TODO Comments
```typescript
// TODO: Add sound effect for power-up activation
// FIXME: Handle edge case when player disconnects during question
// NOTE: This is a temporary workaround until API is updated
```

## Best Practices

### Performance
- Use `React.memo` for expensive components that re-render frequently
- Memoize callbacks with `useCallback` when passed to child components
- Use `useMemo` for expensive calculations
- Lazy load components with `React.lazy` and `Suspense`

### Accessibility
- Use semantic HTML elements (`button`, `nav`, `main`)
- Provide `alt` text for images
- Ensure keyboard navigation works
- Use ARIA labels where needed

### Security
- Never expose API keys in client code
- Validate all user inputs
- Sanitize data before rendering
- Use environment variables for sensitive config

### Testing
- Test files in `__tests__` directory
- Use descriptive test names
- Mock external dependencies
- Test edge cases and error states

### Git Workflow
- Commit messages: Present tense, descriptive
- Branch naming: `feature/`, `fix/`, `refactor/`
- Keep commits atomic and focused
- Review code before pushing

## Mode-Specific Patterns

### Chaos Mode
- Drama detection based on tab visibility
- Voting system with 3 options (Forgive/Reduce/Block)
- Trap system with 5 outcome zones
- Chaos state progression (CALM → ANARCHY)

### Conquest Mode
- Territory-based gameplay with world map
- Draft phase for initial territory claiming
- Attack/defend mechanics with duels
- Fort building and rebuilding

### Teams Mode
- Red vs Blue team assignment
- Team-specific power-ups (Team Shield, Team Boost, Sabotage)
- Team score tracking and display
- Team chat channels

## Common Pitfalls to Avoid

1. **Don't mutate state directly** - Always use `set` function in Zustand
2. **Don't forget cleanup** - Remove event listeners in useEffect cleanup
3. **Don't mix languages** - Keep translations consistent across UI
4. **Don't hardcode values** - Use constants and configuration objects
5. **Don't skip error handling** - Always handle async operation failures
6. **Don't ignore TypeScript errors** - Fix type issues, don't use `any`
7. **Don't forget mobile** - Test responsive design on small screens
8. **Don't block the main thread** - Use Web Workers for heavy computation

## Development Workflow

1. **Start Development**: `npm run dev` (starts all apps in parallel)
2. **Type Check**: `npm run typecheck` (validates TypeScript)
3. **Build**: `npm run build` (builds all packages)
4. **Test Changes**: Test in browser, check console for errors
5. **Commit**: Write clear commit message, push to branch
6. **Deploy**: Use `deploy.sh` or Docker Compose for production
