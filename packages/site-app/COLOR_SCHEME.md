# Sleek Tech Color Scheme

This document outlines the color scheme used throughout the Site Generator application.

## Color Palette

### Primary Colors
- **Background**: `#0e0e10` - Main background color
- **Surface (cards/panels)**: `#1a1b20` - Card backgrounds, panels, and elevated surfaces
- **Primary Text**: `#e6e6eb` - Main text color
- **Secondary Text**: `#a0a2a8` - Muted text, labels, and secondary information

### Accent Colors
- **Accent (buttons/links)**: `#7db2ff` - Primary action buttons, links, and interactive elements
- **Success**: `#5bd778` - Success states, confirmations, and positive feedback
- **Warning**: `#ffcc66` - Warning states and pending actions
- **Error**: `#ff5c5c` - Error states, destructive actions, and negative feedback

## CSS Variables

The color scheme is implemented using CSS custom properties (variables) for consistency and easy maintenance:

```css
:root {
  --background: 240 7% 5%; /* #0e0e10 */
  --foreground: 240 5% 90%; /* #e6e6eb */
  --card: 240 6% 11%; /* #1a1b20 */
  --card-foreground: 240 5% 90%; /* #e6e6eb */
  --primary: 212 100% 75%; /* #7db2ff */
  --primary-foreground: 240 7% 5%; /* #0e0e10 */
  --muted: 240 6% 11%; /* #1a1b20 */
  --muted-foreground: 240 3% 65%; /* #a0a2a8 */
  --destructive: 0 100% 65%; /* #ff5c5c */
  --destructive-foreground: 240 7% 5%; /* #0e0e10 */
  --success: 142 76% 55%; /* #5bd778 */
  --success-foreground: 240 7% 5%; /* #0e0e10 */
  --warning: 45 100% 70%; /* #ffcc66 */
  --warning-foreground: 240 7% 5%; /* #0e0e10 */
  --border: 240 6% 20%; /* #2a2f3a */
  --input: 240 6% 11%; /* #1a1b20 */
  --ring: 212 100% 75%; /* #7db2ff */
}
```

## Tailwind CSS Classes

The color scheme is integrated with Tailwind CSS through the configuration file. Available classes include:

### Background Colors
- `bg-background` - Main background
- `bg-card` - Card/surface background
- `bg-primary` - Primary accent background
- `bg-success` - Success state background
- `bg-warning` - Warning state background
- `bg-destructive` - Error/destructive background
- `bg-muted` - Muted background

### Text Colors
- `text-foreground` - Primary text
- `text-muted-foreground` - Secondary/muted text
- `text-primary` - Primary accent text
- `text-success` - Success state text
- `text-warning` - Warning state text
- `text-destructive` - Error/destructive text

### Border Colors
- `border-border` - Default borders
- `border-primary` - Primary accent borders
- `border-success` - Success state borders
- `border-warning` - Warning state borders
- `border-destructive` - Error/destructive borders

## Component Usage

### Buttons
The Button component supports multiple variants:
- `default` - Primary action (uses accent color)
- `outline` - Secondary action with border
- `ghost` - Subtle action without background
- `destructive` - Dangerous actions (uses error color)
- `success` - Confirmation actions (uses success color)
- `warning` - Warning actions (uses warning color)

### Status Indicators
Status colors are used consistently across components:
- **Confirmed/Success**: Green (`#5bd778`)
- **Pending/Warning**: Yellow (`#ffcc66`)
- **Error/Destructive**: Red (`#ff5c5c`)
- **Neutral/Default**: Muted foreground (`#a0a2a8`)

## Accessibility

The color scheme has been designed with accessibility in mind:
- High contrast ratios between text and backgrounds
- Clear distinction between different states
- Consistent use of color for semantic meaning
- Support for dark mode (the default theme)

## Future Development

When adding new components or features:
1. Use the existing CSS variables for consistency
2. Follow the established color patterns
3. Use semantic color names (success, warning, destructive) rather than specific colors
4. Test color combinations for accessibility
5. Update this documentation when adding new colors

## Files Modified

The following files contain the color scheme implementation:
- `src/styles.css` - CSS variables and legacy styles
- `tailwind.config.js` - Tailwind configuration
- `src/components/ui/Button.tsx` - Button component variants
- `src/components/ConfirmationPanel.tsx` - Status indicators
- `src/components/ContentConfirmation.tsx` - Content confirmation UI
- `src/components/ImageConfirmation.tsx` - Image confirmation UI
