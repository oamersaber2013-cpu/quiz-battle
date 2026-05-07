# Quiz Battle - UI/UX Design Guide

## Design System

### Color Palette

#### Primary Colors
```css
--clr-primary: #6c63ff;      /* Main brand color */
--clr-secondary: #00d4ff;    /* Accent color */
--clr-accent: #ff6b6b;       /* Error/danger */
--clr-gold: #ffd700;         /* Success/premium */
--clr-success: #00e676;      /* Positive feedback */
--clr-danger: #ff4757;       /* Negative feedback */
--clr-warning: #ffa502;      /* Warning states */
```

#### Background Colors
```css
--clr-bg: #08090d;           /* Main background */
--clr-surface: #0f1117;      /* Card background */
--clr-surface-2: #161922;    /* Elevated surface */
--clr-surface-3: #1d2230;    /* Highest elevation */
```

#### Text Colors
```css
--clr-text: #f0f2ff;         /* Primary text */
--clr-text-2: #8b95c4;       /* Secondary text */
--clr-text-3: #4a5180;       /* Tertiary text */
```

### Typography

#### Font Families
- **Primary:** Outfit (Latin), Cairo (Arabic)
- **Monospace:** JetBrains Mono (codes, scores)

#### Font Sizes
```css
/* Headings */
h1: clamp(2.5rem, 6vw, 4.5rem)
h2: 1.5rem - 2rem
h3: 1.25rem

/* Body */
body: 1rem (16px)
small: 0.875rem (14px)
tiny: 0.75rem (12px)

/* Buttons */
btn-lg: 1.2rem
btn: 1rem
btn-sm: 0.875rem
```

#### Font Weights
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700
- Extrabold: 800
- Black: 900

### Spacing System

```css
/* Base unit: 4px */
gap-2: 8px
gap-3: 12px
gap-4: 16px
gap-6: 24px
gap-8: 32px

/* Padding */
p-4: 16px
p-5: 20px
p-6: 24px
p-8: 32px

/* Margins */
mb-4: 16px
mb-6: 24px
mb-8: 32px
```

### Border Radius

```css
--radius-sm: 8px
--radius-md: 14px
--radius-lg: 20px
--radius-xl: 28px
--radius-full: 9999px
```

### Shadows

```css
--shadow-sm: 0 2px 8px rgba(0,0,0,0.4)
--shadow-md: 0 8px 24px rgba(0,0,0,0.5)
--shadow-lg: 0 20px 60px rgba(0,0,0,0.6)
--shadow-primary: 0 8px 32px rgba(108, 99, 255, 0.4)
--shadow-glow: 0 0 40px rgba(108, 99, 255, 0.2)
```

## Component Patterns

### Buttons

#### Primary Button
```tsx
<button className="btn btn-primary btn-lg">
  Create Battle Room
</button>
```
- Use for main actions
- High contrast
- Prominent shadow
- Hover: slight lift + glow

#### Secondary Button
```tsx
<button className="btn btn-secondary">
  Join with Code
</button>
```
- Use for alternative actions
- Subtle background
- Border emphasis

#### Ghost Button
```tsx
<button className="btn btn-ghost">
  Cancel
</button>
```
- Use for tertiary actions
- Transparent background
- Hover: subtle fill

### Cards

#### Glass Card
```tsx
<div className="glass-card p-6">
  Content
</div>
```
- Frosted glass effect
- Subtle border
- Backdrop blur
- Use for content containers

#### Mode Card
```tsx
<div className="mode-card selected">
  <div className="mode-icon">⚔️</div>
  <div className="mode-label">Classic</div>
</div>
```
- Interactive selection
- Hover: lift + glow
- Selected: scale + border
- Use for game modes, categories

### Inputs

#### Text Input
```tsx
<input 
  className="input" 
  placeholder="Enter name"
  style={{ height: 56 }}
/>
```
- Large touch target (56px)
- Focus: border glow
- Placeholder: muted color

### Progress Indicators

#### Step Indicator
```tsx
<div className="step-indicator">
  {[1, 2, 3].map(step => (
    <div className={`step ${current >= step ? 'active' : ''}`}>
      {step}
    </div>
  ))}
</div>
```
- Shows current position
- Animated transitions
- Clear visual hierarchy

#### Loading Bar
```tsx
<div className="progress-bar">
  <div className="progress-bar-fill" style={{ width: '60%' }} />
</div>
```
- Smooth width transitions
- Gradient fill
- Use for loading states

## Animation Guidelines

### Timing Functions

```css
/* Standard easing */
--transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);

/* Slow easing */
--transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);

/* Spring easing */
--transition-spring: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Common Animations

#### Fade In
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
```
Use for: Page transitions, toast notifications

#### Scale In
```css
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
```
Use for: Modals, cards appearing

#### Float
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
```
Use for: Icons, decorative elements

#### Shimmer
```css
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
```
Use for: Loading states, selected items

### Animation Best Practices

1. **Use GPU-accelerated properties:**
   - `transform` instead of `top/left`
   - `opacity` instead of `visibility`

2. **Keep animations under 400ms:**
   - Quick feedback: 200ms
   - Standard: 300ms
   - Slow/dramatic: 400ms

3. **Use spring easing for interactive elements:**
   - Buttons
   - Cards
   - Modals

4. **Reduce motion for accessibility:**
   ```css
   @media (prefers-reduced-motion: reduce) {
     * { animation: none !important; }
   }
   ```

## Layout Patterns

### Centered Container
```tsx
<div style={{ 
  maxWidth: 680, 
  margin: '0 auto', 
  width: '100%' 
}}>
  Content
</div>
```

### Grid Layout
```tsx
<div style={{ 
  display: 'grid', 
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
  gap: 12 
}}>
  Items
</div>
```

### Flex Layout
```tsx
<div style={{ 
  display: 'flex', 
  flexDirection: 'column', 
  gap: 16 
}}>
  Items
</div>
```

## Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 640px) {
  /* Stack layouts */
  /* Reduce font sizes */
  /* Increase touch targets */
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  /* 2-column grids */
  /* Medium spacing */
}

/* Desktop */
@media (min-width: 1025px) {
  /* 3+ column grids */
  /* Full spacing */
  /* Hover effects */
}
```

## Accessibility

### Color Contrast
- Text on background: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

### Focus States
```css
.btn:focus {
  outline: 2px solid var(--clr-primary);
  outline-offset: 2px;
}
```

### ARIA Labels
```tsx
<button aria-label="Create new game">
  <span aria-hidden="true">⚔️</span>
</button>
```

### Keyboard Navigation
- Tab order follows visual order
- Enter/Space activates buttons
- Escape closes modals
- Arrow keys for lists

## RTL Support

### Text Direction
```tsx
<div dir={language === 'ar' ? 'rtl' : 'ltr'}>
  Content
</div>
```

### Logical Properties
```css
/* Instead of margin-left */
margin-inline-start: 12px;

/* Instead of padding-right */
padding-inline-end: 16px;
```

### Conditional Styling
```tsx
style={{
  [isRTL ? 'marginLeft' : 'marginRight']: 12
}}
```

## Performance Tips

1. **Lazy load heavy components:**
   ```tsx
   const HeavyComponent = lazy(() => import('./Heavy'));
   ```

2. **Memoize expensive calculations:**
   ```tsx
   const sortedPlayers = useMemo(
     () => players.sort((a, b) => b.score - a.score),
     [players]
   );
   ```

3. **Debounce rapid updates:**
   ```tsx
   const debouncedSearch = useMemo(
     () => debounce(handleSearch, 300),
     []
   );
   ```

4. **Use CSS transforms for animations:**
   ```css
   /* Good */
   transform: translateX(10px);
   
   /* Bad */
   left: 10px;
   ```

## Testing Checklist

- [ ] All interactive elements have hover states
- [ ] Focus states are visible
- [ ] Animations are smooth (60fps)
- [ ] Text is readable (contrast ratio)
- [ ] Touch targets are 44px minimum
- [ ] RTL layout works correctly
- [ ] Responsive on all screen sizes
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Reduced motion respected

## Resources

- [Figma Design File](#) (to be created)
- [Component Storybook](#) (to be created)
- [Accessibility Audit](#) (to be created)
- [Performance Report](#) (to be created)
