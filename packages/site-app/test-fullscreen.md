# Full Window Configuration Test

## Changes Made

### 1. Window Configuration
- **Default Size**: Increased to 1200x800 (from 980x720)
- **Minimum Size**: Set to 800x600 for better usability
- **Startup Behavior**: Window maximizes automatically on startup

### 2. Keyboard Shortcuts
- **Ctrl+F**: Toggle fullscreen mode
- Users can easily switch between windowed and fullscreen modes

### 3. User Experience
- **Maximized by default**: Takes up most of the screen
- **Resizable**: Users can still resize if needed
- **Fullscreen option**: Available via Ctrl+F shortcut

## How to Test

1. Run the application:
   ```bash
   cd packages/site-app
   pnpm dev
   ```

   Or build and run:
   ```bash
   cd packages/site-app
   pnpm build
   pnpm start
   ```

2. Expected behavior:
   - ✅ Application opens maximized
   - ✅ Takes up most of the screen space
   - ✅ Ctrl+F toggles fullscreen mode
   - ✅ Window is resizable with minimum size constraints

## Benefits

- **Better visibility**: More screen real estate for the confirmation interface
- **Professional appearance**: Maximized window looks more polished
- **User control**: Easy fullscreen toggle when needed
- **Responsive design**: Works well on different screen sizes
