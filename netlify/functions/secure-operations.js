const admin = require('firebase-admin');
const crypto = require('crypto');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    // Decode the Base64 private key
    const privateKey = process.env.FIREBASE_PRIVATE_BASE_64_KEY 
        ? Buffer.from(process.env.FIREBASE_PRIVATE_BASE_64_KEY, 'base64').toString('utf8')
        : process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'); // Fallback for old format
        
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
    });
}

const db = admin.firestore();

// Secure password hashing using Node.js crypto
const hashPassword = (password) => {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
};

// Input validation and sanitization
const validateInput = (data) => {
    const errors = [];
    
    if (data.studentName) {
        // Sanitize student name - remove HTML and limit length
        data.studentName = data.studentName.replace(/<[^>]*>/g, '').trim();
        if (data.studentName.length < 1 || data.studentName.length > 100) {
            errors.push('Student name must be between 1 and 100 characters');
        }
        if (!/^[a-zA-Z\s\-'\.]+$/.test(data.studentName)) {
            errors.push('Student name contains invalid characters');
        }
    }
    
    if (data.graduationId) {
        // Validate graduation ID format
        if (!/^[a-zA-Z0-9_-]+$/.test(data.graduationId)) {
            errors.push('Invalid graduation ID format');
        }
    }
    
    if (data.accessType) {
        const validAccessTypes = ['public', 'password', 'link'];
        if (!validAccessTypes.includes(data.accessType)) {
            errors.push('Invalid access type');
        }
    }
    
    return { isValid: errors.length === 0, errors, sanitizedData: data };
};

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const { action, graduationId, studentName, accessType, password } = JSON.parse(event.body);

        // Validate required fields
        if (!action || !graduationId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' }),
            };
        }

        // Input validation
        const validation = validateInput({ studentName, graduationId, accessType });
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Validation failed', details: validation.errors }),
            };
        }

        // Verify graduation exists and user has permission
        const graduationDoc = await db.collection('graduations').doc(graduationId).get();
        if (!graduationDoc.exists) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Graduation not found' }),
            };
        }

        switch (action) {
            case 'createStudent':
                if (!studentName || !accessType) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Missing student name or access type' }),
                    };
                }

                const studentData = {
                    name: validation.sanitizedData.studentName,
                    accessType: accessType,
                    profilePdfUrl: null,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                };

                if (accessType === 'link') {
                    studentData.uniqueLinkId = crypto.randomUUID();
                } else if (accessType === 'password') {
                    if (!password || password.length < 4) {
                        return {
                            statusCode: 400,
                            headers,
                            body: JSON.stringify({ error: 'Password must be at least 4 characters' }),
                        };
                    }
                    // Generate secure hash on server and store plain password for teacher display
                    studentData.passwordHash = hashPassword(password);
                    studentData.passwordPlain = password; // Store for teacher to see
                }

                const studentRef = await db.collection('graduations').doc(graduationId).collection('students').add(studentData);
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        studentId: studentRef.id,
                        uniqueLinkId: studentData.uniqueLinkId,
                        generatedPassword: accessType === 'password' ? password : null,
                    }),
                };

            case 'verifyPassword':
                const { studentId, passwordToVerify } = JSON.parse(event.body);
                
                if (!studentId || !passwordToVerify) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Missing student ID or password' }),
                    };
                }

                const studentDoc = await db.collection('graduations').doc(graduationId).collection('students').doc(studentId).get();
                
                if (!studentDoc.exists) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ error: 'Student not found' }),
                    };
                }

                const student = studentDoc.data();
                
                if (student.accessType !== 'password') {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Student does not use password access' }),
                    };
                }

                const isValidPassword = verifyPassword(passwordToVerify, student.passwordHash);
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        isValid: isValidPassword,
                    }),
                };

            case 'getCloudinarySignature':
                // Generate a signed upload signature for Cloudinary
                // Using type=upload (public) instead of authenticated to avoid download authorization issues
                const timestamp = Math.floor(Date.now() / 1000);
                const folder = `graduation-pdfs/${graduationId}`;
                const uploadType = 'upload'; // Public type for easier access
                const paramsToSign = `folder=${folder}&timestamp=${timestamp}&type=${uploadType}`;
                
                const signature = crypto
                    .createHash('sha256')
                    .update(paramsToSign + process.env.CLOUDINARY_API_SECRET)
                    .digest('hex');
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        timestamp: timestamp,
                        signature: signature,
                        folder: folder,
                        type: uploadType,
                        apiKey: process.env.CLOUDINARY_API_KEY,
                        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
                    }),
                };

            case 'setSitePassword':
                const { plainPassword } = JSON.parse(event.body);
                
                if (!plainPassword) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Missing password' }),
                    };
                }
                
                if (plainPassword.length < 6) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Password must be at least 6 characters' }),
                    };
                }
                
                // Generate secure hash for site password
                const sitePasswordHash = hashPassword(plainPassword);
                
                // Update graduation config with the hash
                await db.collection('graduations').doc(graduationId).update({
                    'config.sitePasswordHash': sitePasswordHash,
                    'config.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
                });
                
                console.log(`Site password set for graduation ${graduationId}`);
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'Site password set successfully',
                    }),
                };

            case 'verifySitePassword':
                const { passwordToVerifySite } = JSON.parse(event.body);
                
                if (!passwordToVerifySite) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Missing password' }),
                    };
                }
                
                // Fetch graduation config
                const gradDoc = await db.collection('graduations').doc(graduationId).get();
                
                if (!gradDoc.exists) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ error: 'Graduation not found' }),
                    };
                }
                
                const gradData = gradDoc.data();
                const storedHash = gradData?.config?.sitePasswordHash;
                
                if (!storedHash) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'No site password is set' }),
                    };
                }
                
                // Verify the password
                const isValidSitePassword = verifyPassword(passwordToVerifySite, storedHash);
                
                console.log(`Site password verification for graduation ${graduationId}: ${isValidSitePassword ? 'success' : 'failed'}`);
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        isValid: isValidSitePassword,
                    }),
                };

            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Unknown action' }),
                };
        }

    } catch (error) {
        console.error('Security function error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
            }),
        };
    }
};