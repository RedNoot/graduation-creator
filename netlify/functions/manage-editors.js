/**
 * Netlify Serverless Function: Manage Editors
 * Handles inviting and removing editors from graduation projects
 * Uses Firebase Admin SDK for secure operations
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (reuse existing app if already initialized)
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

// CORS headers
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/**
 * Main handler function
 */
exports.handler = async (event) => {
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { action, graduationId, requestingUserUid, inviteeEmail, editorToRemoveUid } = JSON.parse(event.body);

        // Validate required fields
        if (!action || !graduationId || !requestingUserUid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }

        // Get graduation document
        const gradRef = db.collection('graduations').doc(graduationId);
        const gradDoc = await gradRef.get();

        if (!gradDoc.exists) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Graduation project not found' })
            };
        }

        const gradData = gradDoc.data();
        const editors = gradData.editors || [];

        // Verify requesting user is an editor
        if (!editors.includes(requestingUserUid)) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'You do not have permission to manage editors for this project' })
            };
        }

        // Handle different actions
        switch (action) {
            case 'invite': {
                if (!inviteeEmail) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Invitee email is required' })
                    };
                }

                try {
                    // Look up user by email
                    const userRecord = await admin.auth().getUserByEmail(inviteeEmail);
                    const inviteeUid = userRecord.uid;

                    // Check if user is already an editor
                    if (editors.includes(inviteeUid)) {
                        return {
                            statusCode: 400,
                            headers,
                            body: JSON.stringify({ 
                                error: 'This user is already an editor of this project',
                                alreadyEditor: true
                            })
                        };
                    }

                    // Add user to editors array
                    await gradRef.update({
                        editors: admin.firestore.FieldValue.arrayUnion(inviteeUid),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    console.log(`Editor invited: ${inviteeEmail} (${inviteeUid}) to graduation ${graduationId}`);

                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            message: `${inviteeEmail} has been added as an editor`,
                            inviteeUid: inviteeUid,
                            inviteeEmail: inviteeEmail
                        })
                    };

                } catch (authError) {
                    if (authError.code === 'auth/user-not-found') {
                        return {
                            statusCode: 404,
                            headers,
                            body: JSON.stringify({ 
                                error: 'No user found with this email address. They must create an account first.',
                                userNotFound: true
                            })
                        };
                    }
                    throw authError;
                }
            }

            case 'remove': {
                if (!editorToRemoveUid) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Editor UID to remove is required' })
                    };
                }

                // Check if this is the last editor
                if (editors.length <= 1) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ 
                            error: 'Cannot remove the last editor. The project must have at least one editor.',
                            lastEditor: true
                        })
                    };
                }

                // Check if editor to remove exists
                if (!editors.includes(editorToRemoveUid)) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'User is not an editor of this project' })
                    };
                }

                // Remove user from editors array
                await gradRef.update({
                    editors: admin.firestore.FieldValue.arrayRemove(editorToRemoveUid),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                console.log(`Editor removed: ${editorToRemoveUid} from graduation ${graduationId}`);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'Editor has been removed from the project'
                    })
                };
            }

            case 'getEditorEmails': {
                // Fetch email addresses for all editors
                const editorEmails = [];
                
                for (const editorUid of editors) {
                    try {
                        const userRecord = await admin.auth().getUser(editorUid);
                        editorEmails.push({
                            uid: editorUid,
                            email: userRecord.email,
                            isCreator: editorUid === gradData.createdBy
                        });
                    } catch (error) {
                        console.warn(`Could not fetch user ${editorUid}:`, error.message);
                        editorEmails.push({
                            uid: editorUid,
                            email: 'Unknown User',
                            isCreator: editorUid === gradData.createdBy,
                            error: true
                        });
                    }
                }

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        editors: editorEmails
                    })
                };
            }

            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid action' })
                };
        }

    } catch (error) {
        console.error('Error in manage-editors function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message
            })
        };
    }
};
