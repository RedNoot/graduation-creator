# Graduation Creator Themes

This directory contains modular theme files for the Graduation Creator application.

## 📁 File Structure

```
css/
├── theme-config.css              # CSS variables (colors, spacing, typography)
└── themes/
    ├── vibrant-compact.css       # Main theme bundle (imports all modules)
    ├── vibrant-compact-base.css  # Base styles (typography, resets, utilities)
    ├── vibrant-compact-glass.css # Glassmorphism components
    └── vibrant-compact-gradient.css # Animated gradient components
```

## 🎨 Vibrant Compact Theme

**Design Philosophy:** Modern, compact, and efficient interface with glassmorphism effects and animated gradients.

**Key Features:**
- **Glassmorphism:** Frosted glass effects with backdrop blur
- **Animated Gradients:** Flowing gradient backgrounds and text
- **Compact Spacing:** Tight, efficient layout (14px base font, 8-16px spacing)
- **Space Grotesk Font:** Modern, geometric sans-serif
- **Responsive:** Mobile-first design

## 🔧 Using the Theme

### Method 1: Load via HTML

Add to your `index.html` in the `<head>`:

```html
<!-- Theme CSS -->
<link rel="stylesheet" href="/css/themes/vibrant-compact.css">

<!-- Theme Font -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

Then add the theme class to `<body>`:

```html
<body class="vct-theme">
```

### Method 2: Load via Theme Service

```javascript
import { themeService } from './js/services/theme-service.js';

// Initialize and load theme
await themeService.init();

// Or load specific theme
await themeService.loadTheme('vibrant-compact');
```

## 📝 CSS Class Naming Convention

All theme classes use the `vct-` prefix (Vibrant Compact Theme):

```
vct-{component}-{variant}-{modifier}
```

**Examples:**
- `vct-card-glass` - Glass card component
- `vct-button-gradient-lg` - Large gradient button
- `vct-nav-glass-sticky` - Sticky glass navigation
- `vct-input-glass-error` - Glass input with error state

## 🎯 Common Components

### Cards

```html
<!-- Glass Card -->
<div class="vct-card-glass">
  <h3>Card Title</h3>
  <p>Card content...</p>
</div>

<!-- Glass Card with Gradient Header -->
<div class="vct-card-glass-gradient-header">
  <h3>Card Title</h3>
  <p>Card content...</p>
</div>
```

### Buttons

```html
<!-- Glass Button -->
<button class="vct-button-glass">Click Me</button>

<!-- Gradient Button -->
<button class="vct-button-gradient">Primary Action</button>

<!-- Glass Button Large -->
<button class="vct-button-glass-lg">Large Button</button>
```

### Navigation

```html
<nav class="vct-nav-glass">
  <div class="vct-nav-container">
    <div class="vct-nav-brand">
      <span class="vct-gradient-text">Brand Name</span>
    </div>
    <div class="vct-nav-links">
      <a href="#" class="vct-nav-link active">Home</a>
      <a href="#" class="vct-nav-link">About</a>
    </div>
  </div>
</nav>
```

### Inputs

```html
<!-- Glass Input -->
<input type="text" class="vct-input-glass" placeholder="Enter text...">

<!-- Glass Select -->
<select class="vct-input-glass vct-select-glass">
  <option>Option 1</option>
</select>

<!-- Glass Textarea -->
<textarea class="vct-input-glass vct-textarea-glass"></textarea>
```

### Modals

```html
<div class="vct-modal-overlay active">
  <div class="vct-modal-glass">
    <div class="vct-modal-header">
      <h3 class="vct-modal-title">Modal Title</h3>
      <button class="vct-modal-close">×</button>
    </div>
    <div class="vct-modal-content">
      <p>Modal content...</p>
    </div>
    <div class="vct-modal-footer">
      <button class="vct-button-glass">Cancel</button>
      <button class="vct-button-gradient">Confirm</button>
    </div>
  </div>
</div>
```

### Gradient Effects

```html
<!-- Gradient Hero Section -->
<section class="vct-gradient-hero">
  <h1 class="vct-heading-1">Welcome</h1>
  <p>Hero content with animated gradient background</p>
</section>

<!-- Gradient Text -->
<h2 class="vct-gradient-text-lg">Gradient Heading</h2>

<!-- Progress Bar with Gradient -->
<div class="vct-progress-bar">
  <div class="vct-progress-fill-animated" style="width: 75%"></div>
</div>
```

## 🎨 CSS Variables

All theme variables are defined in `theme-config.css` and use the `--vct-` prefix:

### Colors

```css
--vct-primary: #7C3AED
--vct-secondary: #6366F1
--vct-accent: #3B82F6
--vct-success: #10B981
--vct-warning: #F59E0B
--vct-error: #EF4444
```

### Spacing

```css
--vct-space-xs: 4px
--vct-space-sm: 8px
--vct-space-md: 12px
--vct-space-lg: 16px
--vct-space-xl: 24px
```

### Typography

```css
--vct-font-family: 'Space Grotesk', sans-serif
--vct-font-size-base: 14px
--vct-font-size-sm: 12px
--vct-font-size-lg: 16px
```

### Glass Effects

```css
--vct-glass-bg: rgba(255, 255, 255, 0.4)
--vct-glass-border: rgba(255, 255, 255, 0.3)
--vct-glass-blur: 10px
```

## 🔄 Customization

To customize the theme, edit variables in `theme-config.css`:

```css
:root {
  /* Change primary color */
  --vct-primary: #YOUR_COLOR;
  
  /* Change spacing scale */
  --vct-space-md: 16px; /* More spacious */
  
  /* Change font size */
  --vct-font-size-base: 16px; /* Larger text */
}
```

## 🌙 Dark Mode Support

Dark mode variables are defined but not yet active. To enable:

```html
<body class="vct-theme" data-theme="dark">
```

## ♿ Accessibility

The theme includes accessibility features:
- High contrast mode support
- Focus visible indicators for keyboard navigation
- Screen reader utilities (`.vct-sr-only`)
- Reduced motion support (`prefers-reduced-motion`)

## 🔧 Browser Support

**Glassmorphism requires:**
- Chrome/Edge 76+
- Safari 9+
- Firefox 103+

**Fallbacks provided for:**
- Older browsers without `backdrop-filter` support
- Print styles
- High contrast mode

## 📊 Performance

**Optimizations:**
- CSS files are modular (can be loaded separately)
- Animations use `transform` and `opacity` (GPU-accelerated)
- `will-change` used sparingly
- Responsive images with proper sizing

## 🐛 Troubleshooting

### Glass effects not showing

Check browser support:
```javascript
import { themeService } from './js/services/theme-service.js';
console.log('Glassmorphism supported:', themeService.supportsGlassmorphism());
```

Apply fallbacks:
```javascript
themeService.applyFallbacks();
```

### Font not loading

Ensure Google Fonts link is in `<head>` before theme CSS:
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

### Animations laggy

Disable animations with:
```css
* {
  animation: none !important;
  transition: none !important;
}
```

Or use system preference:
```css
@media (prefers-reduced-motion: reduce) {
  /* Animations automatically disabled */
}
```

## 📚 Related Documentation

- `THEME-INTEGRATION-PLAN.md` - Full integration roadmap
- `UI-OVERHAUL-ROADMAP.md` - Original UI improvement plan
- `PROJECT-ARCHITECTURE-HANDOVER.md` - System architecture

## 🚀 Future Enhancements

- [ ] Dark mode implementation
- [ ] Additional theme variants
- [ ] Theme builder/customizer UI
- [ ] CSS-in-JS support
- [ ] Tailwind CSS integration option

---

**Version:** 1.0.0  
**Last Updated:** November 9, 2025  
**Maintainer:** Graduation Creator Team
