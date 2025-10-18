const { PDFDocument } = require('pdf-lib');
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
        const { graduationId } = JSON.parse(event.body);

        // Input validation
        if (!graduationId || typeof graduationId !== 'string') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Valid graduationId is required' }),
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

        studentsSnapshot.forEach(doc => {
            const student = doc.data();
            if (student.profilePdfUrl) {
                studentsWithPdfs.push({
                    name: student.name,
                    pdfUrl: student.profilePdfUrl
                });
            }
        });

        if (studentsWithPdfs.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'No student PDFs found to merge' }),
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
            color: { r: 0, g: 0, b: 0 },
        });

        titlePage.drawText(`Class of ${graduationData.graduationYear}`, {
            x: 50,
            y: height - 140,
            size: 18,
            color: { r: 0.5, g: 0.5, b: 0.5 },
        });

        titlePage.drawText(`Student Profiles`, {
            x: 50,
            y: height - 180,
            size: 16,
            color: { r: 0.5, g: 0.5, b: 0.5 },
        });

        // Add student PDFs
        for (let i = 0; i < studentsWithPdfs.length; i++) {
            const student = studentsWithPdfs[i];
            console.log(`Processing PDF for student: ${student.name}`);

            try {
                // Download the PDF
                const response = await fetch(student.pdfUrl);
                if (!response.ok) {
                    console.error(`Failed to download PDF for ${student.name}: ${response.status}`);
                    continue;
                }

                const pdfBuffer = await response.arrayBuffer();
                const studentPdf = await PDFDocument.load(pdfBuffer);

                // Copy all pages from student PDF
                const copiedPages = await mergedPdf.copyPages(studentPdf, studentPdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));

            } catch (error) {
                console.error(`Error processing PDF for ${student.name}:`, error);
                // Continue with other students even if one fails
            }
        }

        // Generate the final PDF
        const pdfBytes = await mergedPdf.save();
        console.log(`Generated PDF with ${mergedPdf.getPageCount()} pages`);

        // Upload to Cloudinary using base64 encoding (Node.js compatible)
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/upload`;
        
        // Convert PDF bytes to base64
        const base64Pdf = Buffer.from(pdfBytes).toString('base64');
        const dataUri = `data:application/pdf;base64,${base64Pdf}`;
        
        const uploadData = {
            file: dataUri,
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
            resource_type: 'raw',
            public_id: `graduation-booklets/${graduationId}-booklet`,
        };

        const uploadResponse = await fetch(cloudinaryUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(uploadData),
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Cloudinary upload error:', errorText);
            throw new Error(`Cloudinary upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();
        const bookletUrl = uploadResult.secure_url;

        console.log(`Uploaded booklet to: ${bookletUrl}`);

        // Update Firestore with the booklet URL
        await db.collection('graduations').doc(graduationId).update({
            generatedBookletUrl: bookletUrl,
            bookletGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                bookletUrl: bookletUrl,
                pageCount: mergedPdf.getPageCount(),
                studentCount: studentsWithPdfs.length,
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