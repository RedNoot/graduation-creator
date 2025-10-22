/**
 * Application Configuration Module
 * Handles environment-based configuration for Firebase, Cloudinary, and Sentry
 */

/**
 * Get environment-based configuration
 * @returns {Object} Configuration object with Firebase, Cloudinary, and Sentry settings
 */
export const getConfig = () => {
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    
    if (isProduction) {
        // In production, these values should be injected during build or fetched from a secure endpoint
        // For now, using the same values but you can modify this to fetch from environment
        return {
            firebase: {
                apiKey: "AIzaSyDH7bp9-HnNefk27NLaOq1gx5VF4Onenqg",
                authDomain: "graduation-creator.firebaseapp.com",
                projectId: "graduation-creator",
                storageBucket: "graduation-creator.firebasestorage.app",
                messagingSenderId: "215273409051",
                appId: "1:215273409051:web:73e80f9c6057fd7d6686be"
            },
            cloudinary: {
                cloudName: "dkm3avvjl",
                uploadPreset: "Graduation-Uploads"
            },
            sentry: {
                // Production Sentry DSN
                dsn: 'https://93d779626b30e8101d5512445d3719c1@o4507568980172800.ingest.sentry.io/4507568983678976'
            },
            isDevelopment: false
        };
    } else {
        // Development configuration
        return {
            firebase: {
                apiKey: "AIzaSyDH7bp9-HnNefk27NLaOq1gx5VF4Onenqg",
                authDomain: "graduation-creator.firebaseapp.com",
                projectId: "graduation-creator",
                storageBucket: "graduation-creator.firebasestorage.app",
                messagingSenderId: "215273409051",
                appId: "1:215273409051:web:73e80f9c6057fd7d6686be"
            },
            cloudinary: {
                cloudName: "dkm3avvjl",
                uploadPreset: "Graduation-Uploads"
            },
            sentry: {
                // Development Sentry DSN (uses same project, development environment)
                dsn: 'https://93d779626b30e8101d5512445d3719c1@o4507568980172800.ingest.sentry.io/4507568983678976'
            },
            isDevelopment: true
        };
    }
};

// Initialize configuration
const config = getConfig();

// Export individual configs for easy access
export const firebaseConfig = config.firebase;
export const cloudinaryConfig = config.cloudinary;
export const sentryDsn = config.sentry.dsn;

// Cloudinary API constants
export const CLOUDINARY_CLOUD_NAME = cloudinaryConfig.cloudName;
export const CLOUDINARY_UPLOAD_PRESET = cloudinaryConfig.uploadPreset;
export const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

// Export the full config object
export default config;
