/**
 * Theme Service
 * Manages theme loading, switching, and persistence
 * @module services/theme-service
 */

export class ThemeService {
  constructor() {
    this.currentTheme = null;
    this.availableThemes = {
      'vibrant-compact': {
        name: 'Vibrant Compact',
        description: 'Modern glassmorphism with animated gradients',
        cssPath: '/css/themes/vibrant-compact.css',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap'
      },
      'classic': {
        name: 'Classic',
        description: 'Original graduation creator theme',
        cssPath: '/css/styles.css',
        fontUrl: null
      }
    };
    this.themeStyleElement = null;
    this.themeFontElement = null;
  }

  /**
   * Initialize theme service and load preferred theme
   */
  async init() {
    console.log('🎨 Theme Service: Initializing...');
    
    // Get user's preferred theme from localStorage
    const preferredTheme = this.getThemePreference();
    
    // Load the preferred theme (or default)
    await this.loadTheme(preferredTheme || 'vibrant-compact');
    
    console.log(`🎨 Theme Service: Initialized with theme "${this.currentTheme}"`);
  }

  /**
   * Load a specific theme
   * @param {string} themeName - Name of the theme to load
   * @returns {Promise<boolean>} Success status
   */
  async loadTheme(themeName) {
    // Validate theme exists
    if (!this.availableThemes[themeName]) {
      console.error(`❌ Theme "${themeName}" not found. Available themes:`, Object.keys(this.availableThemes));
      return false;
    }

    const theme = this.availableThemes[themeName];
    
    try {
      console.log(`🎨 Loading theme: ${theme.name}...`);
      
      // Remove existing theme styles
      this.removeThemeStyles();
      
      // Load theme font if specified
      if (theme.fontUrl) {
        await this.loadThemeFont(theme.fontUrl);
      }
      
      // Load theme CSS
      await this.loadThemeStyles(theme.cssPath);
      
      // Apply theme to body
      this.applyThemeToBody(themeName);
      
      // Update current theme
      this.currentTheme = themeName;
      
      // Save preference
      this.setThemePreference(themeName);
      
      console.log(`✅ Theme "${theme.name}" loaded successfully`);
      
      // Dispatch theme changed event
      this.dispatchThemeChangeEvent(themeName);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to load theme "${themeName}":`, error);
      return false;
    }
  }

  /**
   * Load theme CSS file
   * @param {string} cssPath - Path to CSS file
   * @returns {Promise<void>}
   */
  loadThemeStyles(cssPath) {
    return new Promise((resolve, reject) => {
      // Create or reuse theme style element
      if (!this.themeStyleElement) {
        this.themeStyleElement = document.createElement('link');
        this.themeStyleElement.id = 'theme-styles';
        this.themeStyleElement.rel = 'stylesheet';
        document.head.appendChild(this.themeStyleElement);
      }
      
      // Set up load handlers
      this.themeStyleElement.onload = () => resolve();
      this.themeStyleElement.onerror = (error) => reject(error);
      
      // Load the CSS file
      this.themeStyleElement.href = cssPath;
    });
  }

  /**
   * Load theme font
   * @param {string} fontUrl - URL to Google Fonts or other font service
   * @returns {Promise<void>}
   */
  loadThemeFont(fontUrl) {
    return new Promise((resolve) => {
      // Create or reuse theme font element
      if (!this.themeFontElement) {
        this.themeFontElement = document.createElement('link');
        this.themeFontElement.id = 'theme-font';
        this.themeFontElement.rel = 'stylesheet';
        document.head.appendChild(this.themeFontElement);
      }
      
      // Set up load handler
      this.themeFontElement.onload = () => resolve();
      
      // Load the font
      this.themeFontElement.href = fontUrl;
      
      // Fonts are non-critical, resolve after 2 seconds max
      setTimeout(() => resolve(), 2000);
    });
  }

  /**
   * Remove existing theme styles
   */
  removeThemeStyles() {
    // Remove theme class from body
    document.body.classList.remove('vct-theme');
    document.body.removeAttribute('data-theme');
  }

  /**
   * Apply theme class to body
   * @param {string} themeName - Theme name
   */
  applyThemeToBody(themeName) {
    // Add theme-specific class
    if (themeName === 'vibrant-compact') {
      document.body.classList.add('vct-theme');
    }
    
    // Set data attribute
    document.body.setAttribute('data-theme', themeName);
  }

  /**
   * Get user's theme preference from localStorage
   * @returns {string|null} Theme name or null
   */
  getThemePreference() {
    try {
      return localStorage.getItem('graduation-creator-theme');
    } catch (error) {
      console.warn('Failed to read theme preference from localStorage:', error);
      return null;
    }
  }

  /**
   * Save user's theme preference to localStorage
   * @param {string} themeName - Theme name to save
   */
  setThemePreference(themeName) {
    try {
      localStorage.setItem('graduation-creator-theme', themeName);
    } catch (error) {
      console.warn('Failed to save theme preference to localStorage:', error);
    }
  }

  /**
   * Get currently active theme
   * @returns {string|null} Current theme name
   */
  getActiveTheme() {
    return this.currentTheme;
  }

  /**
   * Get information about a specific theme
   * @param {string} themeName - Theme name
   * @returns {Object|null} Theme info or null
   */
  getThemeInfo(themeName) {
    return this.availableThemes[themeName] || null;
  }

  /**
   * Get list of all available themes
   * @returns {Array<Object>} Array of theme objects
   */
  getAvailableThemes() {
    return Object.keys(this.availableThemes).map(key => ({
      id: key,
      ...this.availableThemes[key]
    }));
  }

  /**
   * Switch to a different theme
   * @param {string} themeName - Theme name to switch to
   * @returns {Promise<boolean>} Success status
   */
  async switchTheme(themeName) {
    if (themeName === this.currentTheme) {
      console.log(`Already using theme "${themeName}"`);
      return true;
    }
    
    return await this.loadTheme(themeName);
  }

  /**
   * Dispatch theme change event
   * @param {string} themeName - New theme name
   */
  dispatchThemeChangeEvent(themeName) {
    const event = new CustomEvent('themechange', {
      detail: {
        theme: themeName,
        themeInfo: this.getThemeInfo(themeName)
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Check if glassmorphism is supported
   * @returns {boolean} Support status
   */
  supportsGlassmorphism() {
    return CSS.supports('backdrop-filter', 'blur(10px)') || 
           CSS.supports('-webkit-backdrop-filter', 'blur(10px)');
  }

  /**
   * Apply fallback styles if glassmorphism not supported
   */
  applyFallbacks() {
    if (!this.supportsGlassmorphism()) {
      console.warn('⚠️ Backdrop filter not supported. Applying fallback styles...');
      
      // Add fallback class to body
      document.body.classList.add('no-backdrop-filter');
      
      // Inject fallback CSS
      const fallbackStyles = document.createElement('style');
      fallbackStyles.id = 'theme-fallback-styles';
      fallbackStyles.textContent = `
        .no-backdrop-filter .vct-card-glass,
        .no-backdrop-filter .vct-button-glass,
        .no-backdrop-filter .vct-input-glass,
        .no-backdrop-filter .vct-modal-glass,
        .no-backdrop-filter .vct-nav-glass {
          background: rgba(255, 255, 255, 0.95);
        }
      `;
      document.head.appendChild(fallbackStyles);
    }
  }

  /**
   * Preload a theme (without applying it)
   * Useful for faster theme switching
   * @param {string} themeName - Theme to preload
   */
  preloadTheme(themeName) {
    const theme = this.availableThemes[themeName];
    if (!theme) return;
    
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = theme.cssPath;
    document.head.appendChild(link);
    
    console.log(`📦 Preloading theme: ${theme.name}`);
  }
}

// Export singleton instance
export const themeService = new ThemeService();
