# AGENTS.md

## Build/Lint/Test Commands
- No build process - pure client-side Chrome extension
- No linting or testing framework configured
- Manual testing by loading as unpacked extension in Chrome Developer mode
- CSS changes in external `styles.css` file

## Code Style Guidelines

### Imports
- No module imports - vanilla JavaScript with direct DOM manipulation
- All code in single files (bm.js, background.js, popup.js)
- Uses Chrome extension APIs via `chrome.*` namespace

### Formatting
- 4-space indentation
- Curly braces on same line
- Semicolons used consistently
- Line length ~100 characters
- Function names in camelCase
- Variables in camelCase
- Constants in UPPER_SNAKE_CASE

### Types
- No type annotations
- Dynamic typing with JavaScript primitives
- Objects for complex data structures
- Arrays for collections

### Naming Conventions
- Variables: descriptiveCamelCase
- Functions: descriptiveCamelCase
- Classes/constructors: PascalCase (none currently)
- Constants: UPPER_SNAKE_CASE
- DOM elements: elementName with consistent prefixes (e.g., `collectionElement`)

### Error Handling
- Try/catch blocks for async operations
- Console logging for debugging (some suppressed in production)
- Graceful fallbacks for failed operations
- Validation before critical operations

### Architecture
- Data stored in localStorage as JSON object
- Event-driven with DOM event listeners
- Service worker for background operations
- Direct DOM manipulation with helper functions
- Modular functions in separate files (bm.js, background.js, popup.js)

### UI Patterns
- Consistent dialog creation with overlay
- CSS transitions for animations
- Responsive design with media queries
- Dark mode support with body class toggling