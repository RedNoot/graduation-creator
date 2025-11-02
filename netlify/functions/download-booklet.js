/**
 * Secure Download Handler
 * Validates download permissions and scheduling before allowing booklet downloads
 */

const admin = require('firebase-admin');
const rateLimiter = require('./utils/rate-limiter');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_BASE_64_KEY 
        ? Buffer.from(process.env.FIREBASE_PRIVATE_BASE_64_KEY, 'base64').toString('utf8')
        : process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
    });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Server-side rate limiting for downloads
    const clientIP = rateLimiter.getClientIP(event);
    const rateLimitCheck = rateLimiter.check(clientIP, {
        maxAttempts: 10, // 10 download requests per minute
        windowMs: 60 * 1000,
        action: 'booklet download'
    });
    
    if (!rateLimitCheck.allowed) {
        console.warn(`[Rate Limit] ${clientIP} exceeded download limit`);
        return rateLimiter.createRateLimitResponse(rateLimitCheck);
    }

    try {
        // Extract graduation ID from path: /download-booklet/:gradId
        const pathParts = event.path.split('/');
        const graduationId = pathParts[pathParts.length - 1];

        if (!graduationId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Graduation ID is required' })
            };
        }

        console.log(`[Download] Request for graduation: ${graduationId}`);

        // Fetch graduation document
        const gradDoc = await db.collection('graduations').doc(graduationId).get();

        if (!gradDoc.exists) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Graduation not found' })
            };
        }

        const gradData = gradDoc.data();
        const config = gradData.config || {};

        // Check if booklet exists
        if (!gradData.generatedBookletUrl) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    error: 'Booklet not available',
                    message: 'The graduation booklet has not been generated yet.'
                })
            };
        }

        // Check download scheduling
        if (config.enableDownloadScheduling && config.downloadableAfterDate) {
            const now = new Date();
            const availableDate = config.downloadableAfterDate.toDate 
                ? config.downloadableAfterDate.toDate() 
                : new Date(config.downloadableAfterDate);

            if (now < availableDate) {
                console.log(`[Download] Access denied - scheduled for ${availableDate.toISOString()}`);
                
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({
                        error: 'Download not yet available',
                        message: config.downloadMessage || 'This booklet is not available for download yet.',
                        availableAt: availableDate.toISOString(),
                        remainingMilliseconds: availableDate.getTime() - now.getTime()
                    })
                };
            }
        }

        // All checks passed - return download information
        console.log(`[Download] Access granted for graduation: ${graduationId}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                downloadUrl: gradData.generatedBookletUrl,
                filename: `${gradData.schoolName}-${gradData.graduationYear}-Booklet.pdf`,
                schoolName: gradData.schoolName,
                graduationYear: gradData.graduationYear
            })
        };

    } catch (error) {
        console.error('[Download] Error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: 'Failed to process download request'
            })
        };
    }
};
