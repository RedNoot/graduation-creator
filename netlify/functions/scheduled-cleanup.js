/**
 * Netlify Scheduled Function: Auto-Delete Expired Projects
 * Runs daily to check for graduation projects that are 12+ months old
 * with autoDeleteEnabled = true and deletes them completely
 */

const admin = require('firebase-admin');
const https = require('https');
const { URL } = require('url');

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

/**
 * Delete a Cloudinary asset by URL
 * @param {string} assetUrl - Full Cloudinary URL
 * @param {string} cloudName - Cloudinary cloud name
 * @param {string} apiKey - Cloudinary API key
 * @param {string} apiSecret - Cloudinary API secret
 * @returns {Promise<boolean>} Success status
 */
async function deleteCloudinaryAsset(assetUrl, cloudName, apiKey, apiSecret) {
    if (!assetUrl || !cloudName || !apiKey || !apiSecret) {
        console.log('Skipping Cloudinary deletion - missing credentials or URL');
        return false;
    }

    try {
        // Extract public_id from Cloudinary URL
        // Format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{transformations}/{public_id}.{format}
        const urlObj = new URL(assetUrl);
        const pathParts = urlObj.pathname.split('/');
        
        // Find 'upload' index and get everything after it
        const uploadIndex = pathParts.indexOf('upload');
        if (uploadIndex === -1) {
            console.warn('Invalid Cloudinary URL format:', assetUrl);
            return false;
        }
        
        // Get public_id (everything after upload/, removing file extension)
        const publicIdWithExt = pathParts.slice(uploadIndex + 1).join('/');
        const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ''); // Remove extension
        
        // Determine resource type (image or raw for PDFs)
        const resourceType = assetUrl.includes('/image/') ? 'image' : 'raw';
        
        console.log(`Deleting Cloudinary asset: ${publicId} (type: ${resourceType})`);
        
        // Generate timestamp
        const timestamp = Math.round(Date.now() / 1000);
        
        // Create signature for authentication
        const crypto = require('crypto');
        const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');
        
        // Make DELETE request to Cloudinary Admin API
        const deleteUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`;
        
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams({
                public_id: publicId,
                timestamp: timestamp,
                api_key: apiKey,
                signature: signature
            }).toString();
            
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            
            const req = https.request(deleteUrl, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        console.log(`✓ Deleted Cloudinary asset: ${publicId}`);
                        resolve(true);
                    } else {
                        console.warn(`Failed to delete ${publicId}: ${res.statusCode} ${data}`);
                        resolve(false);
                    }
                });
            });
            
            req.on('error', (error) => {
                console.error(`Error deleting Cloudinary asset ${publicId}:`, error.message);
                resolve(false);
            });
            
            req.write(postData);
            req.end();
        });
        
    } catch (error) {
        console.error('Error processing Cloudinary URL:', assetUrl, error.message);
        return false;
    }
}

/**
 * Recursively delete all documents in a subcollection
 * @param {string} gradId - Graduation ID
 * @param {string} subcollectionName - Name of subcollection
 * @returns {Promise<number>} Number of documents deleted
 */
async function deleteSubcollection(gradId, subcollectionName) {
    const collectionRef = db.collection('graduations').doc(gradId).collection(subcollectionName);
    const batchSize = 100;
    let deletedCount = 0;
    
    try {
        const query = collectionRef.limit(batchSize);
        
        return new Promise((resolve, reject) => {
            deleteQueryBatch(query, batchSize, resolve, reject);
        });
        
        async function deleteQueryBatch(query, batchSize, resolve, reject) {
            const snapshot = await query.get();
            
            if (snapshot.size === 0) {
                resolve(deletedCount);
                return;
            }
            
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
                deletedCount++;
            });
            
            await batch.commit();
            console.log(`Deleted ${snapshot.size} documents from ${subcollectionName}`);
            
            // Recurse on the next batch
            process.nextTick(() => {
                deleteQueryBatch(query, batchSize, resolve, reject);
            });
        }
    } catch (error) {
        console.error(`Error deleting subcollection ${subcollectionName}:`, error);
        throw error;
    }
}

/**
 * Delete a single graduation project and all associated data
 * @param {string} gradId - Graduation ID
 * @param {Object} gradData - Graduation document data
 */
async function deleteGraduationProject(gradId, gradData) {
    console.log(`\n🗑️  Starting deletion for graduation: ${gradData.schoolName} (${gradId})`);
    console.log(`Created: ${gradData.createdAt?.toDate?.()?.toISOString() || 'Unknown'}`);
    
    const errors = [];
    const cloudinaryConfig = {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET
    };
    
    try {
        // Step 1: Delete students subcollection and their PDFs
        console.log('Step 1: Deleting students and their PDFs...');
        const studentsSnapshot = await db.collection('graduations').doc(gradId).collection('students').get();
        let studentPdfCount = 0;
        
        for (const studentDoc of studentsSnapshot.docs) {
            const student = studentDoc.data();
            if (student.profilePdfUrl) {
                await deleteCloudinaryAsset(
                    student.profilePdfUrl,
                    cloudinaryConfig.cloudName,
                    cloudinaryConfig.apiKey,
                    cloudinaryConfig.apiSecret
                );
                studentPdfCount++;
            }
        }
        
        const deletedStudents = await deleteSubcollection(gradId, 'students');
        console.log(`✓ Deleted ${deletedStudents} students and ${studentPdfCount} PDFs`);
        
        // Step 2: Delete contentPages subcollection
        console.log('Step 2: Deleting content pages...');
        const deletedPages = await deleteSubcollection(gradId, 'contentPages');
        console.log(`✓ Deleted ${deletedPages} content pages`);
        
        // Step 3: Delete Cloudinary assets from config
        console.log('Step 3: Deleting project assets...');
        const config = gradData.config || {};
        const assetsToDelete = [
            { name: 'School Logo', url: config.schoolLogoUrl },
            { name: 'Custom Cover', url: config.customCoverUrl },
            { name: 'Generated Booklet', url: gradData.generatedBookletUrl }
        ];
        
        let deletedAssets = 0;
        for (const asset of assetsToDelete) {
            if (asset.url) {
                const success = await deleteCloudinaryAsset(
                    asset.url,
                    cloudinaryConfig.cloudName,
                    cloudinaryConfig.apiKey,
                    cloudinaryConfig.apiSecret
                );
                if (success) {
                    deletedAssets++;
                    console.log(`✓ Deleted ${asset.name}`);
                }
            }
        }
        console.log(`✓ Deleted ${deletedAssets} project assets`);
        
        // Step 4: Delete main graduation document
        console.log('Step 4: Deleting main graduation document...');
        await db.collection('graduations').doc(gradId).delete();
        console.log(`✓ Deleted graduation document: ${gradId}`);
        
        console.log(`\n✅ Successfully deleted graduation: ${gradData.schoolName}`);
        console.log(`Summary: ${deletedStudents} students, ${deletedPages} pages, ${studentPdfCount + deletedAssets} files\n`);
        
        return {
            success: true,
            gradId,
            schoolName: gradData.schoolName,
            deletedStudents,
            deletedPages,
            deletedFiles: studentPdfCount + deletedAssets
        };
        
    } catch (error) {
        console.error(`❌ Error deleting graduation ${gradId}:`, error);
        errors.push({ gradId, error: error.message });
        
        return {
            success: false,
            gradId,
            schoolName: gradData.schoolName,
            error: error.message
        };
    }
}

/**
 * Main scheduled function handler
 */
exports.handler = async (event) => {
    console.log('🔍 Starting scheduled cleanup check...');
    console.log(`Execution time: ${new Date().toISOString()}`);
    
    const results = {
        checked: 0,
        deleted: 0,
        failed: 0,
        skipped: 0,
        details: []
    };
    
    try {
        // Calculate cutoff date (12 months ago)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        
        console.log(`Cutoff date: ${twelveMonthsAgo.toISOString()}`);
        
        // Query for graduations with autoDeleteEnabled = true
        const graduationsSnapshot = await db.collection('graduations')
            .where('config.autoDeleteEnabled', '==', true)
            .get();
        
        console.log(`Found ${graduationsSnapshot.size} projects with auto-delete enabled`);
        results.checked = graduationsSnapshot.size;
        
        if (graduationsSnapshot.empty) {
            console.log('No projects with auto-delete enabled. Exiting.');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'No projects to delete',
                    results
                })
            };
        }
        
        // Check each graduation's age
        for (const doc of graduationsSnapshot.docs) {
            const gradData = doc.data();
            const gradId = doc.id;
            
            // Check if createdAt exists
            if (!gradData.createdAt) {
                console.warn(`⚠️  Skipping ${gradId}: No createdAt field`);
                results.skipped++;
                continue;
            }
            
            // Convert Firestore timestamp to Date
            const createdDate = gradData.createdAt.toDate ? gradData.createdAt.toDate() : new Date(gradData.createdAt);
            
            // Check if project is 12+ months old
            if (createdDate < twelveMonthsAgo) {
                console.log(`\n📅 Project eligible for deletion:`);
                console.log(`   - Name: ${gradData.schoolName}`);
                console.log(`   - Created: ${createdDate.toISOString()}`);
                console.log(`   - Age: ${Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))} days`);
                
                const result = await deleteGraduationProject(gradId, gradData);
                
                if (result.success) {
                    results.deleted++;
                } else {
                    results.failed++;
                }
                
                results.details.push(result);
            } else {
                const daysRemaining = Math.ceil((createdDate.getTime() - twelveMonthsAgo.getTime()) / (1000 * 60 * 60 * 24));
                console.log(`⏳ Skipping ${gradData.schoolName}: ${daysRemaining} days remaining`);
                results.skipped++;
            }
        }
        
        console.log('\n📊 Cleanup Summary:');
        console.log(`   - Projects checked: ${results.checked}`);
        console.log(`   - Projects deleted: ${results.deleted}`);
        console.log(`   - Projects failed: ${results.failed}`);
        console.log(`   - Projects skipped: ${results.skipped}`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Cleanup completed',
                timestamp: new Date().toISOString(),
                results
            })
        };
        
    } catch (error) {
        console.error('❌ Fatal error in scheduled cleanup:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Cleanup failed',
                message: error.message,
                results
            })
        };
    }
};
