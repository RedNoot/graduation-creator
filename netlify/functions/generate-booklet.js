const { PDFDocument, rgb } = require('pdf-lib');
const fetch = require('node-fetch');

// Initialize Firebase Admin (server-side)
const admin = require('firebase-admin');

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

exports.handler = async (event, context) => {
    // Enhanced security headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'"
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    // Rate limiting check (basic implementation)
    const clientIP = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
    const rateLimitKey = `pdf-gen-${clientIP}`;
    
    // In a production app, you'd use Redis or similar for distributed rate limiting
    // For now, we'll rely on Netlify's built-in rate limiting

    try {
        // Validate environment variables
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_UPLOAD_PRESET) {
            console.error('Missing Cloudinary configuration:', {
                cloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
                uploadPreset: !!process.env.CLOUDINARY_UPLOAD_PRESET
            });
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Server configuration error',
                    message: 'Cloudinary configuration is missing'
                }),
            };
        }

        // Parse request body with better error handling
        let requestData;
        try {
            if (!event.body) {
                console.error('Empty request body received');
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Request body is required',
                        message: 'No data received in request'
                    }),
                };
            }
            requestData = JSON.parse(event.body);
        } catch (parseError) {
            console.error('JSON parse error:', parseError.message, 'Body:', event.body);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid JSON in request body',
                    message: 'Could not parse request data'
                }),
            };
        }

        const { graduationId } = requestData;
        console.log('Processing request for graduation ID:', graduationId);

        // Input validation
        if (!graduationId || typeof graduationId !== 'string') {
            console.error('Invalid graduationId:', { graduationId, type: typeof graduationId });
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Valid graduationId is required',
                    message: 'graduationId must be a non-empty string'
                }),
            };
        }

        // Validate graduation ID format (alphanumeric and common special chars only)
        if (!/^[a-zA-Z0-9_-]{1,50}$/.test(graduationId)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid graduationId format' }),
            };
        }

        console.log(`Starting PDF generation for graduation: ${graduationId}`);

        // Fetch graduation data
        const graduationDoc = await db.collection('graduations').doc(graduationId).get();
        if (!graduationDoc.exists) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Graduation not found' }),
            };
        }

        const graduationData = graduationDoc.data();

        // Fetch configuration
        const configDoc = await db.collection('graduations').doc(graduationId).collection('config').doc('settings').get();
        const config = configDoc.exists ? configDoc.data() : {};

        // Fetch students with PDFs
        const studentsSnapshot = await db.collection('graduations').doc(graduationId).collection('students').get();
        const studentsWithPdfs = [];
        const allStudents = [];

        studentsSnapshot.forEach(doc => {
            const student = doc.data();
            allStudents.push({
                name: student.name || 'Unnamed',
                hasPdf: !!student.profilePdfUrl
            });
            
            if (student.profilePdfUrl) {
                studentsWithPdfs.push({
                    name: student.name,
                    pdfUrl: student.profilePdfUrl
                });
            }
        });

        console.log(`Found ${allStudents.length} total students, ${studentsWithPdfs.length} with PDFs`);

        if (studentsWithPdfs.length === 0) {
            console.error('No student PDFs available:', allStudents);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'No student PDFs found to merge',
                    message: `Found ${allStudents.length} students total, but none have uploaded PDFs yet`,
                    totalStudents: allStudents.length,
                    studentsWithPdfs: 0
                }),
            };
        }

        console.log(`Found ${studentsWithPdfs.length} students with PDFs`);

        // Create the master PDF document
        const mergedPdf = await PDFDocument.create();

        // Add title page
        const titlePage = mergedPdf.addPage([612, 792]); // Letter size
        const { width, height } = titlePage.getSize();

        // Add title text
        titlePage.drawText(`${graduationData.schoolName}`, {
            x: 50,
            y: height - 100,
            size: 24,
            color: rgb(0, 0, 0),
        });

        titlePage.drawText(`Class of ${graduationData.graduationYear}`, {
            x: 50,
            y: height - 140,
            size: 18,
            color: rgb(0.5, 0.5, 0.5),
        });

        titlePage.drawText(`Student Profiles`, {
            x: 50,
            y: height - 180,
            size: 16,
            color: rgb(0.5, 0.5, 0.5),
        });

        // Function to ensure PDF URL is publicly accessible
        const ensurePublicPdfUrl = (url) => {
            if (!url) {
                console.log(`[ensurePublicPdfUrl] URL is empty or null`);
                return url;
            }
            
            console.log(`[ensurePublicPdfUrl] Processing URL: ${url}`);
            
            // If it's a Cloudinary URL, try to make it publicly accessible
            if (url.includes('cloudinary.com')) {
                // Convert secure_url to public URL if needed
                // Replace /image/upload/ or /upload/ with transformation URL
                let publicUrl = url;
                
                // Try multiple transformation approaches
                // 1. Add fl_attachment to allow public viewing
                if (publicUrl.includes('/upload/') && !publicUrl.includes('/fl_attachment/')) {
                    publicUrl = publicUrl.replace('/upload/', '/upload/fl_attachment/');
                    console.log(`[ensurePublicPdfUrl] Added fl_attachment: ${publicUrl}`);
                    return publicUrl;
                }
                
                // 2. Try making it a public resource
                if (publicUrl.includes('/image/upload/') && !publicUrl.includes('/fl_attachment/')) {
                    publicUrl = publicUrl.replace('/image/upload/', '/image/upload/fl_attachment/');
                    console.log(`[ensurePublicPdfUrl] Added fl_attachment (image): ${publicUrl}`);
                    return publicUrl;
                }
            }
            
            return url;
        };

        // Add student PDFs
        let processedCount = 0;
        for (let i = 0; i < studentsWithPdfs.length; i++) {
            const student = studentsWithPdfs[i];
            console.log(`Processing PDF ${i + 1}/${studentsWithPdfs.length} for student: ${student.name}`);

            try {
                // Ensure the PDF URL is publicly accessible
                const publicPdfUrl = ensurePublicPdfUrl(student.pdfUrl);
                console.log(`[PDF Processing] Student: ${student.name}`);
                console.log(`[PDF Processing] Original URL: ${student.pdfUrl}`);
                console.log(`[PDF Processing] Public URL: ${publicPdfUrl}`);

                // Download the PDF with timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                
                const response = await fetch(publicPdfUrl, { 
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Graduation-Creator-Bot/1.0'
                    }
                });
                clearTimeout(timeoutId);
                
                console.log(`[PDF Processing] Response status for ${student.name}: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    console.error(`Failed to download PDF for ${student.name}: ${response.status} ${response.statusText}`);
                    const errorText = await response.text();
                    console.error(`[PDF Processing] Error response body: ${errorText}`);
                    continue;
                }

                // Check file size (limit to 50MB per student PDF)
                const contentLength = response.headers.get('content-length');
                if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
                    console.error(`PDF too large for ${student.name}: ${contentLength} bytes`);
                    continue;
                }

                const pdfBuffer = await response.arrayBuffer();
                
                // Validate PDF file
                if (pdfBuffer.byteLength === 0) {
                    console.error(`Empty PDF file for ${student.name}`);
                    continue;
                }

                const studentPdf = await PDFDocument.load(pdfBuffer);
                const pageCount = studentPdf.getPageCount();
                
                if (pageCount === 0) {
                    console.error(`No pages in PDF for ${student.name}`);
                    continue;
                }

                // Copy all pages from student PDF
                const copiedPages = await mergedPdf.copyPages(studentPdf, studentPdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
                
                processedCount++;
                console.log(`Successfully processed PDF for ${student.name} (${pageCount} pages)`);

            } catch (error) {
                console.error(`Error processing PDF for ${student.name}:`, error.message);
                console.error(`Stack trace:`, error.stack);
                // Continue with other students even if one fails
            }
        }

        if (processedCount === 0) {
            console.error(`CRITICAL: No PDFs processed. Students with PDFs: ${studentsWithPdfs.length}`);
            studentsWithPdfs.forEach(s => {
                console.error(`  - ${s.name}: ${s.pdfUrl}`);
            });
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'No student PDFs could be processed successfully',
                    totalStudents: studentsWithPdfs.length,
                    debug: {
                        message: 'Check server logs for detailed error information',
                        studentsAttempted: studentsWithPdfs.map(s => ({ name: s.name, url: s.pdfUrl }))
                    }
                }),
            };
        }

        console.log(`Successfully processed ${processedCount}/${studentsWithPdfs.length} student PDFs`);

        // Generate the final PDF
        const pdfBytes = await mergedPdf.save();
        const pdfSizeMB = (pdfBytes.length / 1024 / 1024).toFixed(2);
        console.log(`Generated PDF with ${mergedPdf.getPageCount()} pages, size: ${pdfSizeMB}MB`);

        // Check final PDF size (Cloudinary free tier has 10MB limit for raw files)
        if (pdfBytes.length > 100 * 1024 * 1024) { // 100MB limit
            return {
                statusCode: 413,
                headers,
                body: JSON.stringify({ 
                    error: 'Generated PDF is too large to upload',
                    sizeMB: pdfSizeMB,
                    pageCount: mergedPdf.getPageCount()
                }),
            };
        }

        // Upload to Cloudinary using multipart form data (proper method for raw files)
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/upload`;
        
        // Create form data for multipart upload
        const FormData = require('form-data');
        const formData = new FormData();
        
        // Use safe public_id without slashes (replace with underscores)
        const safePublicId = `graduation_booklet_${graduationId}`;
        
        formData.append('file', Buffer.from(pdfBytes), {
            filename: `${safePublicId}.pdf`,
            contentType: 'application/pdf'
        });
        formData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);
        formData.append('resource_type', 'raw');
        formData.append('public_id', safePublicId);
        formData.append('folder', 'graduation-booklets'); // Use folder parameter instead of slashes in public_id

        const uploadResponse = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders(),
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Cloudinary upload error:', errorText);
            throw new Error(`Cloudinary upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();
        
        if (!uploadResult || !uploadResult.secure_url) {
            console.error('Invalid Cloudinary response:', uploadResult);
            throw new Error('Cloudinary upload succeeded but returned invalid response');
        }
        
        const bookletUrl = uploadResult.secure_url;
        console.log(`Successfully uploaded booklet to: ${bookletUrl}`);

        // Update Firestore with the booklet URL
        try {
            await db.collection('graduations').doc(graduationId).update({
                generatedBookletUrl: bookletUrl,
                bookletGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
                bookletStats: {
                    totalPages: mergedPdf.getPageCount(),
                    processedStudents: processedCount,
                    totalStudents: studentsWithPdfs.length,
                    sizeMB: parseFloat(pdfSizeMB),
                    generatedAt: new Date().toISOString()
                }
            });
        } catch (firestoreError) {
            console.error('Failed to update Firestore:', firestoreError);
            // Don't fail the entire operation if Firestore update fails
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                bookletUrl: bookletUrl,
                pageCount: mergedPdf.getPageCount(),
                studentCount: studentsWithPdfs.length,
                processedStudents: processedCount,
                sizeMB: pdfSizeMB,
                message: `Successfully generated booklet with ${processedCount}/${studentsWithPdfs.length} student profiles`
            }),
        };

    } catch (error) {
        console.error('PDF generation error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'PDF generation failed',
                message: error.message,
            }),
        };
    }
};