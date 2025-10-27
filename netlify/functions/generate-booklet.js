const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
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

/**
 * Helper function to optimize Cloudinary PDF URLs for size reduction
 * Adds q_auto:eco transformation parameter
 * @param {string} url - Original Cloudinary URL
 * @returns {string} - Optimized URL with compression parameters
 */
const optimizeCloudinaryPdfUrl = (url) => {
    // Only optimize Cloudinary URLs
    if (!url.includes('res.cloudinary.com')) {
        return url;
    }
    
    // Insert q_auto:eco transformation before the version number
    // Example: .../upload/v123/file.pdf -> .../upload/q_auto:eco/v123/file.pdf
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) {
        return url;
    }
    
    const beforeUpload = url.substring(0, uploadIndex + 8); // include '/upload/'
    const afterUpload = url.substring(uploadIndex + 8);
    
    // Check if transformation already exists
    if (afterUpload.startsWith('q_auto')) {
        return url;
    }
    
    return `${beforeUpload}q_auto:eco/${afterUpload}`;
};

/**
 * Helper function to create a Table of Contents page
 * @param {PDFDocument} pdfDoc - The PDF document
 * @param {Array} tocEntries - Array of {title, page} objects
 * @param {Object} colors - Color scheme {primaryColor, secondaryColor, textColor}
 */
const createTocPage = async (pdfDoc, tocEntries, colors) => {
    const tocPage = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height} = tocPage.getSize();
    
    // Embed standard fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Draw title
    tocPage.drawText('Table of Contents', {
        x: 50,
        y: height - 80,
        size: 26,
        font: boldFont,
        color: rgb(colors.primaryColor.r, colors.primaryColor.g, colors.primaryColor.b),
    });
    
    // Draw a decorative line under the title
    tocPage.drawLine({
        start: { x: 50, y: height - 95 },
        end: { x: width - 50, y: height - 95 },
        thickness: 2,
        color: rgb(colors.primaryColor.r, colors.primaryColor.g, colors.primaryColor.b),
    });
    
    // Draw ToC entries
    let yPosition = height - 130;
    const lineHeight = 30;
    
    for (const entry of tocEntries) {
        if (yPosition < 60) break; // Avoid writing off page
        
        // Draw section title
        const titleWidth = font.widthOfTextAtSize(entry.title, 14);
        tocPage.drawText(entry.title, {
            x: 60,
            y: yPosition,
            size: 14,
            font: font,
            color: rgb(colors.textColor.r, colors.textColor.g, colors.textColor.b),
        });
        
        // Draw dotted line (leader dots)
        const dotsStartX = 60 + titleWidth + 10;
        const dotsEndX = width - 100;
        const dotSpacing = 8;
        
        for (let dotX = dotsStartX; dotX < dotsEndX; dotX += dotSpacing) {
            tocPage.drawText('.', {
                x: dotX,
                y: yPosition,
                size: 14,
                font: font,
                color: rgb(colors.secondaryColor.r, colors.secondaryColor.g, colors.secondaryColor.b),
            });
        }
        
        // Draw page number
        const pageNumText = entry.page.toString();
        tocPage.drawText(pageNumText, {
            x: width - 80,
            y: yPosition,
            size: 14,
            font: boldFont,
            color: rgb(colors.textColor.r, colors.textColor.g, colors.textColor.b),
        });
        
        yPosition -= lineHeight;
    }
    
    return tocPage;
};

/**
 * Helper function to create a student cover page with photos and speech
 * @param {PDFDocument} pdfDoc - The PDF document
 * @param {Object} student - Student data with name, coverPhotoBeforeUrl, coverPhotoAfterUrl, graduationSpeech
 * @param {Object} colors - Color scheme {primaryColor, secondaryColor, textColor}
 * @returns {Promise<Page>} The created cover page
 */
const createStudentCoverPage = async (pdfDoc, student, colors) => {
    const coverPage = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = coverPage.getSize();
    
    // Embed fonts
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    let yPosition = height - 80;
    
    // Draw student name as title
    const nameText = student.name || 'Student';
    const nameWidth = boldFont.widthOfTextAtSize(nameText, 24);
    coverPage.drawText(nameText, {
        x: (width - nameWidth) / 2, // Center horizontally
        y: yPosition,
        size: 24,
        font: boldFont,
        color: rgb(colors.primaryColor.r, colors.primaryColor.g, colors.primaryColor.b),
    });
    
    // Draw decorative line
    coverPage.drawLine({
        start: { x: 50, y: yPosition - 10 },
        end: { x: width - 50, y: yPosition - 10 },
        thickness: 2,
        color: rgb(colors.primaryColor.r, colors.primaryColor.g, colors.primaryColor.b),
    });
    
    yPosition -= 50;
    
    // Add photos if available
    if (student.coverPhotoBeforeUrl || student.coverPhotoAfterUrl) {
        const photoHeight = 250;
        const photoWidth = 200;
        const spacing = 30;
        
        // Calculate positions for side-by-side photos
        const totalWidth = (student.coverPhotoBeforeUrl && student.coverPhotoAfterUrl) 
            ? (photoWidth * 2 + spacing) 
            : photoWidth;
        const startX = (width - totalWidth) / 2;
        
        let currentX = startX;
        
        // Before photo
        if (student.coverPhotoBeforeUrl) {
            try {
                const imageResponse = await fetch(student.coverPhotoBeforeUrl);
                if (imageResponse.ok) {
                    const imageBytes = await imageResponse.arrayBuffer();
                    let embeddedImage;
                    
                    // Determine image type and embed
                    if (student.coverPhotoBeforeUrl.toLowerCase().includes('.png')) {
                        embeddedImage = await pdfDoc.embedPng(imageBytes);
                    } else {
                        embeddedImage = await pdfDoc.embedJpg(imageBytes);
                    }
                    
                    // Draw image maintaining aspect ratio
                    const imageDims = embeddedImage.scale(1);
                    const scale = Math.min(photoWidth / imageDims.width, photoHeight / imageDims.height);
                    const scaledWidth = imageDims.width * scale;
                    const scaledHeight = imageDims.height * scale;
                    
                    coverPage.drawImage(embeddedImage, {
                        x: currentX + (photoWidth - scaledWidth) / 2,
                        y: yPosition - scaledHeight,
                        width: scaledWidth,
                        height: scaledHeight,
                    });
                    
                    // Label
                    const labelText = 'Before';
                    const labelWidth = regularFont.widthOfTextAtSize(labelText, 12);
                    coverPage.drawText(labelText, {
                        x: currentX + (photoWidth - labelWidth) / 2,
                        y: yPosition - scaledHeight - 20,
                        size: 12,
                        font: regularFont,
                        color: rgb(colors.secondaryColor.r, colors.secondaryColor.g, colors.secondaryColor.b),
                    });
                    
                    currentX += photoWidth + spacing;
                }
            } catch (error) {
                console.error(`Failed to embed before photo for ${student.name}:`, error.message);
            }
        }
        
        // After photo
        if (student.coverPhotoAfterUrl) {
            try {
                const imageResponse = await fetch(student.coverPhotoAfterUrl);
                if (imageResponse.ok) {
                    const imageBytes = await imageResponse.arrayBuffer();
                    let embeddedImage;
                    
                    if (student.coverPhotoAfterUrl.toLowerCase().includes('.png')) {
                        embeddedImage = await pdfDoc.embedPng(imageBytes);
                    } else {
                        embeddedImage = await pdfDoc.embedJpg(imageBytes);
                    }
                    
                    const imageDims = embeddedImage.scale(1);
                    const scale = Math.min(photoWidth / imageDims.width, photoHeight / imageDims.height);
                    const scaledWidth = imageDims.width * scale;
                    const scaledHeight = imageDims.height * scale;
                    
                    // If only after photo, center it
                    const photoX = student.coverPhotoBeforeUrl ? currentX : startX;
                    
                    coverPage.drawImage(embeddedImage, {
                        x: photoX + (photoWidth - scaledWidth) / 2,
                        y: yPosition - scaledHeight,
                        width: scaledWidth,
                        height: scaledHeight,
                    });
                    
                    // Label
                    const labelText = 'After';
                    const labelWidth = regularFont.widthOfTextAtSize(labelText, 12);
                    coverPage.drawText(labelText, {
                        x: photoX + (photoWidth - labelWidth) / 2,
                        y: yPosition - scaledHeight - 20,
                        size: 12,
                        font: regularFont,
                        color: rgb(colors.secondaryColor.r, colors.secondaryColor.g, colors.secondaryColor.b),
                    });
                }
            } catch (error) {
                console.error(`Failed to embed after photo for ${student.name}:`, error.message);
            }
        }
        
        yPosition -= (photoHeight + 60);
    }
    
    // Add graduation speech if available
    if (student.graduationSpeech) {
        const speechText = student.graduationSpeech;
        const maxWidth = width - 100;
        const lineHeight = 16;
        const fontSize = 11;
        
        // Word wrap the speech text
        const words = speechText.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const testWidth = regularFont.widthOfTextAtSize(testLine, fontSize);
            
            if (testWidth > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
        
        // Draw speech heading
        coverPage.drawText('Graduation Speech', {
            x: 50,
            y: yPosition,
            size: 14,
            font: boldFont,
            color: rgb(colors.primaryColor.r, colors.primaryColor.g, colors.primaryColor.b),
        });
        
        yPosition -= 25;
        
        // Draw speech text
        for (const line of lines) {
            if (yPosition < 60) break; // Don't go off page
            
            coverPage.drawText(line, {
                x: 50,
                y: yPosition,
                size: fontSize,
                font: regularFont,
                color: rgb(colors.textColor.r, colors.textColor.g, colors.textColor.b),
            });
            
            yPosition -= lineHeight;
        }
    }
    
    return coverPage;
};

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

        const { graduationId, customCoverUrl, pageOrder } = requestData;
        console.log('Processing request for graduation ID:', graduationId);
        
        if (customCoverUrl) {
            console.log('Custom cover URL provided:', customCoverUrl.substring(0, 50));
        }
        
        // Use provided page order or default
        const sectionsOrder = pageOrder || ['students', 'messages', 'speeches'];
        console.log('Page order:', sectionsOrder);

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

        // Configuration is now stored in the main graduation document
        const config = graduationData.config || {};

        // Fetch content pages (messages, speeches, etc.)
        const contentPagesSnapshot = await db.collection('graduations').doc(graduationId).collection('contentPages').get();
        const contentPages = [];
        contentPagesSnapshot.forEach(doc => {
            contentPages.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort content pages by creation date
        contentPages.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateA - dateB;
        });
        
        console.log(`Found ${contentPages.length} content pages`);

        // Fetch students with PDFs
        const studentsSnapshot = await db.collection('graduations').doc(graduationId).collection('students').get();
        const studentsWithPdfs = [];
        const allStudents = [];

        studentsSnapshot.forEach(doc => {
            const student = doc.data();
            allStudents.push({
                name: student.name || 'Unnamed',
                hasPdf: !!student.profilePdfUrl,
                order: student.order !== undefined ? student.order : 999999 // Default to end if no order
            });
            
            if (student.profilePdfUrl) {
                studentsWithPdfs.push({
                    name: student.name,
                    pdfUrl: student.profilePdfUrl,
                    order: student.order !== undefined ? student.order : 999999, // Include order field
                    // Include cover page fields
                    coverPhotoBeforeUrl: student.coverPhotoBeforeUrl || null,
                    coverPhotoAfterUrl: student.coverPhotoAfterUrl || null,
                    graduationSpeech: student.graduationSpeech || null
                });
                console.log(`[Student PDF Found] ${student.name}: ${student.profilePdfUrl} (order: ${student.order})`);
            }
        });

        // Sort students by their order field to maintain drag-and-drop order
        studentsWithPdfs.sort((a, b) => a.order - b.order);
        console.log(`[Student Order] Sorted students:`, studentsWithPdfs.map(s => ({ name: s.name, order: s.order })));

        console.log(`Found ${allStudents.length} total students, ${studentsWithPdfs.length} with PDFs`);
        console.log(`[Students Summary]`, allStudents);

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
        
        // Parse colors from config (hex to RGB)
        const hexToRgb = (hex) => {
            if (!hex) return { r: 0, g: 0, b: 0 };
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16) / 255,
                g: parseInt(result[2], 16) / 255,
                b: parseInt(result[3], 16) / 255
            } : { r: 0, g: 0, b: 0 };
        };
        
        // Get colors from config with defaults
        const primaryColor = hexToRgb(config.primaryColor || '#4F46E5'); // indigo-600
        const secondaryColor = hexToRgb(config.secondaryColor || '#6B7280'); // gray-500
        const textColor = hexToRgb(config.textColor || '#1F2937'); // gray-800

        // Add custom cover page if provided, otherwise use default
        if (customCoverUrl) {
            try {
                console.log('Downloading custom cover PDF from:', customCoverUrl.substring(0, 50));
                const coverResponse = await fetch(customCoverUrl);
                
                if (!coverResponse.ok) {
                    console.error('Failed to download custom cover:', coverResponse.status);
                    throw new Error(`Failed to download custom cover: ${coverResponse.status}`);
                }
                
                const coverArrayBuffer = await coverResponse.arrayBuffer();
                const coverPdf = await PDFDocument.load(coverArrayBuffer);
                
                // Copy all pages from custom cover
                const coverPages = await mergedPdf.copyPages(coverPdf, coverPdf.getPageIndices());
                coverPages.forEach(page => {
                    mergedPdf.addPage(page);
                });
                
                console.log(`Added ${coverPages.length} page(s) from custom cover`);
            } catch (error) {
                console.error('Error loading custom cover, falling back to default:', error.message);
                // Fall back to default cover if custom cover fails
                const titlePage = mergedPdf.addPage([612, 792]);
                const { width, height } = titlePage.getSize();

                titlePage.drawText(`${graduationData.schoolName}`, {
                    x: 50,
                    y: height - 100,
                    size: 28,
                    color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
                });

                titlePage.drawText(`Class of ${graduationData.graduationYear}`, {
                    x: 50,
                    y: height - 140,
                    size: 20,
                    color: rgb(secondaryColor.r, secondaryColor.g, secondaryColor.b),
                });

                titlePage.drawText(`Student Profiles`, {
                    x: 50,
                    y: height - 180,
                    size: 16,
                    color: rgb(secondaryColor.r, secondaryColor.g, secondaryColor.b),
                });
            }
        } else {
            // Use default generated cover page
            const titlePage = mergedPdf.addPage([612, 792]); // Letter size
            const { width, height } = titlePage.getSize();

            // Add title text with primary color
            titlePage.drawText(`${graduationData.schoolName}`, {
                x: 50,
                y: height - 100,
                size: 28,
                color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
            });

            titlePage.drawText(`Class of ${graduationData.graduationYear}`, {
                x: 50,
                y: height - 140,
                size: 20,
                color: rgb(secondaryColor.r, secondaryColor.g, secondaryColor.b),
            });

            titlePage.drawText(`Student Profiles`, {
                x: 50,
                y: height - 180,
                size: 16,
                color: rgb(secondaryColor.r, secondaryColor.g, secondaryColor.b),
            });
        }
        
        // Helper function to add text content pages
        const addContentPage = async (title, content, author = null, authorPhotoUrl = null, bodyImageUrls = []) => {
            const contentPage = mergedPdf.addPage([612, 792]);
            const { width, height } = contentPage.getSize();
            
            let yPosition = height - 80;
            
            // Title with primary color
            contentPage.drawText(title, {
                x: 50,
                y: yPosition,
                size: 22,
                color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
                maxWidth: width - 100,
            });
            yPosition -= 40;
            
            // Author section with photo (if provided)
            if (author) {
                let authorX = 50;
                
                // Embed and draw author photo if URL provided
                if (authorPhotoUrl) {
                    try {
                        const photoResponse = await fetch(authorPhotoUrl);
                        const photoBuffer = await photoResponse.arrayBuffer();
                        const photoBytes = new Uint8Array(photoBuffer);
                        
                        let authorImage;
                        if (authorPhotoUrl.toLowerCase().endsWith('.png')) {
                            authorImage = await mergedPdf.embedPng(photoBytes);
                        } else {
                            authorImage = await mergedPdf.embedJpg(photoBytes);
                        }
                        
                        // Draw circular-ish photo (50x50)
                        const photoSize = 50;
                        contentPage.drawImage(authorImage, {
                            x: authorX,
                            y: yPosition - photoSize,
                            width: photoSize,
                            height: photoSize,
                        });
                        
                        authorX += photoSize + 10; // Move text to right of photo
                    } catch (error) {
                        console.error('Error embedding author photo:', error);
                    }
                }
                
                contentPage.drawText(`By: ${author}`, {
                    x: authorX,
                    y: yPosition - 15,
                    size: 12,
                    color: rgb(secondaryColor.r, secondaryColor.g, secondaryColor.b),
                });
                
                yPosition -= 70;
            }
            
            // Content - wrap text manually with text color
            const contentLines = [];
            const words = content.replace(/\n/g, ' \n ').split(' ');
            let currentLine = '';
            const maxWidth = width - 100;
            const fontSize = 11;
            
            for (const word of words) {
                if (word === '\n') {
                    contentLines.push(currentLine.trim());
                    currentLine = '';
                    continue;
                }
                
                const testLine = currentLine + (currentLine ? ' ' : '') + word;
                const testWidth = testLine.length * (fontSize * 0.5); // Rough estimate
                
                if (testWidth > maxWidth && currentLine) {
                    contentLines.push(currentLine.trim());
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) {
                contentLines.push(currentLine.trim());
            }
            
            // Draw content lines with text color
            const lineHeight = fontSize * 1.5;
            
            for (const line of contentLines) {
                if (yPosition < 150) break; // Reserve space for body images
                
                contentPage.drawText(line, {
                    x: 50,
                    y: yPosition,
                    size: fontSize,
                    color: rgb(textColor.r, textColor.g, textColor.b),
                });
                
                yPosition -= lineHeight;
            }
            
            // Add body images if provided
            if (bodyImageUrls && bodyImageUrls.length > 0) {
                yPosition -= 20; // Add space before images
                const imageWidth = (width - 120) / Math.min(bodyImageUrls.length, 2); // Max 2 per row
                const imageHeight = imageWidth * 0.75; // Maintain aspect ratio
                
                let imageX = 50;
                let imageY = Math.max(yPosition - imageHeight, 60); // Ensure we don't go off page
                let imagesInRow = 0;
                
                for (let i = 0; i < Math.min(bodyImageUrls.length, 4); i++) { // Max 4 images
                    try {
                        const imgResponse = await fetch(bodyImageUrls[i]);
                        const imgBuffer = await imgResponse.arrayBuffer();
                        const imgBytes = new Uint8Array(imgBuffer);
                        
                        let bodyImage;
                        const url = bodyImageUrls[i].toLowerCase();
                        if (url.endsWith('.png') || url.includes('/png/')) {
                            bodyImage = await mergedPdf.embedPng(imgBytes);
                        } else {
                            bodyImage = await mergedPdf.embedJpg(imgBytes);
                        }
                        
                        contentPage.drawImage(bodyImage, {
                            x: imageX,
                            y: imageY,
                            width: imageWidth - 10,
                            height: imageHeight,
                        });
                        
                        imagesInRow++;
                        imageX += imageWidth;
                        
                        // Move to next row after 2 images
                        if (imagesInRow >= 2) {
                            imagesInRow = 0;
                            imageX = 50;
                            imageY -= imageHeight + 10;
                        }
                    } catch (error) {
                        console.error('Error embedding body image:', error);
                    }
                }
            }
        };
        
        // Process sections based on page order from request
        let processedCount = 0;
        let skippedStudents = []; // Track students whose PDFs could not be processed
        const tocEntries = []; // Track sections for Table of Contents
        let currentPageNumber = mergedPdf.getPageCount() + 1; // Start after cover (ToC will be inserted later at page 2)
        
        for (const section of sectionsOrder) {
            if (section === 'messages' && config.showMessages !== false) {
                const messagePages = contentPages.filter(p => p.type === 'thanks' || p.type === 'memory');
                if (messagePages.length > 0) {
                    // Record ToC entry
                    tocEntries.push({
                        title: 'Messages & Memories',
                        page: currentPageNumber
                    });
                    
                    // Add section title page with primary color
                    const sectionPage = mergedPdf.addPage([612, 792]);
                    sectionPage.drawText('Messages & Memories', {
                        x: 50,
                        y: sectionPage.getHeight() - 100,
                        size: 26,
                        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
                    });
                    currentPageNumber++; // Section title page
                    
                    // Add each message page
                    for (const page of messagePages) {
                        await addContentPage(page.title, page.content, page.author, page.authorPhotoUrl, page.bodyImageUrls);
                        currentPageNumber++; // Content page
                    }
                    
                    console.log(`Added ${messagePages.length} message pages to booklet`);
                }
            } else if (section === 'speeches' && config.showSpeeches !== false) {
                const speechPages = contentPages.filter(p => p.type === 'speech' || p.type === 'text');
                if (speechPages.length > 0) {
                    // Record ToC entry
                    tocEntries.push({
                        title: 'Speeches & Presentations',
                        page: currentPageNumber
                    });
                    
                    // Add section title page with primary color
                    const sectionPage = mergedPdf.addPage([612, 792]);
                    sectionPage.drawText('Speeches & Presentations', {
                        x: 50,
                        y: sectionPage.getHeight() - 100,
                        size: 26,
                        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
                    });
                    currentPageNumber++; // Section title page
                    
                    // Add each speech page
                    for (const page of speechPages) {
                        await addContentPage(page.title, page.content, page.author, page.authorPhotoUrl, page.bodyImageUrls);
                        currentPageNumber++; // Content page
                    }
                    
                    console.log(`Added ${speechPages.length} speech pages to booklet`);
                }
            } else if (section === 'students') {
                // Record ToC entry for students section
                tocEntries.push({
                    title: 'Student Profiles',
                    page: currentPageNumber
                });
                
                // Students are already in custom order from Firestore (order field)
                
                // Add student PDFs section
                console.log(`Processing ${studentsWithPdfs.length} student PDFs in custom order`);
                
                for (let i = 0; i < studentsWithPdfs.length; i++) {
                    const student = studentsWithPdfs[i];
            console.log(`Processing PDF ${i + 1}/${studentsWithPdfs.length} for student: ${student.name}`);

            try {
                // Check if cover pages are enabled and student has cover content
                const hasCoverContent = (student.coverPhotoBeforeUrl || student.coverPhotoAfterUrl || student.graduationSpeech);
                
                if (config.enableStudentCoverPages && hasCoverContent) {
                    console.log(`Creating cover page for ${student.name}`);
                    try {
                        await createStudentCoverPage(mergedPdf, student, { primaryColor, secondaryColor, textColor });
                        console.log(`Successfully added cover page for ${student.name}`);
                    } catch (coverError) {
                        console.error(`Failed to create cover page for ${student.name}:`, coverError.message);
                        // Continue with main PDF even if cover page fails
                    }
                }
                
                // Use the PDF URL directly - files are uploaded as public type for easier access
                const pdfUrl = student.pdfUrl;
                const optimizedUrl = optimizeCloudinaryPdfUrl(pdfUrl);
                
                console.log(`[PDF Processing] Student: ${student.name}`);
                console.log(`[PDF Processing] Original PDF URL: ${pdfUrl}`);
                console.log(`[PDF Processing] Optimized PDF URL: ${optimizedUrl}`);

                // Try optimized URL first, fallback to original if it fails
                let response = null;
                let usedOptimized = false;
                
                // Download the PDF with timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                
                try {
                    console.log(`[PDF Processing] Attempting optimized fetch`);
                    response = await fetch(optimizedUrl, {
                        signal: controller.signal,
                        headers: {
                            'User-Agent': 'Graduation-Creator-Bot/1.0'
                        }
                    });
                    
                    if (response.ok) {
                        usedOptimized = true;
                        console.log(`[PDF Processing] Successfully fetched optimized PDF`);
                    } else {
                        console.log(`[PDF Processing] Optimized fetch failed (${response.status}), falling back to original`);
                        response = null;
                    }
                } catch (optimizedError) {
                    console.log(`[PDF Processing] Optimized fetch error: ${optimizedError.message}, falling back to original`);
                    response = null;
                }
                
                // Fallback to original URL if optimized failed
                if (!response) {
                    console.log(`[PDF Processing] Fetching original PDF from Cloudinary`);
                    response = await fetch(pdfUrl, {
                        signal: controller.signal,
                        headers: {
                            'User-Agent': 'Graduation-Creator-Bot/1.0'
                        }
                    });
                }
                
                clearTimeout(timeoutId);
                
                console.log(`[PDF Processing] Response status for ${student.name}: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Failed to download PDF for ${student.name}: ${response.status} ${response.statusText}`);
                    console.error(`[PDF Processing] Response headers:`, {
                        contentType: response.headers.get('content-type'),
                        contentLength: response.headers.get('content-length'),
                        cacheControl: response.headers.get('cache-control'),
                        status: response.status
                    });
                    console.error(`[PDF Processing] Error response body: ${errorText.substring(0, 500)}`);
                    skippedStudents.push(student.name);
                    continue;
                }

                // Check file size (limit to 50MB per student PDF)
                const contentLength = response.headers.get('content-length');
                if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
                    console.error(`PDF too large for ${student.name}: ${contentLength} bytes`);
                    skippedStudents.push(student.name);
                    continue;
                }

                const pdfBuffer = await response.arrayBuffer();
                
                // Validate PDF file
                if (pdfBuffer.byteLength === 0) {
                    console.error(`Empty PDF file for ${student.name}`);
                    skippedStudents.push(student.name);
                    continue;
                }

                const studentPdf = await PDFDocument.load(pdfBuffer);
                const pageCount = studentPdf.getPageCount();
                
                if (pageCount === 0) {
                    console.error(`No pages in PDF for ${student.name}`);
                    skippedStudents.push(student.name);
                    continue;
                }

                // Copy all pages from student PDF
                const copiedPages = await mergedPdf.copyPages(studentPdf, studentPdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
                
                processedCount++;
                currentPageNumber += pageCount; // Track page numbers
                console.log(`Successfully processed PDF for ${student.name} (${pageCount} pages)`);

                } catch (error) {
                    console.error(`Error processing PDF for ${student.name}:`, error.message);
                    console.error(`Stack trace:`, error.stack);
                    skippedStudents.push(student.name);
                    // Continue with other students even if one fails
                }
            }
            
            console.log(`Added ${processedCount} student PDFs to booklet`);
            if (skippedStudents.length > 0) {
                console.log(`Skipped ${skippedStudents.length} students due to errors: ${skippedStudents.join(', ')}`);
            }
            }
        }

        if (processedCount === 0 && studentsWithPdfs.length > 0) {
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

        // Generate and insert Table of Contents (if we have sections to list)
        if (tocEntries.length > 0) {
            console.log(`Generating Table of Contents with ${tocEntries.length} entries`);
            
            // Create the ToC page with proper colors
            await createTocPage(mergedPdf, tocEntries, {
                primaryColor,
                secondaryColor,
                textColor
            });
            
            // Move the ToC page to position 1 (right after cover, which is at position 0)
            const tocPageIndex = mergedPdf.getPageCount() - 1; // ToC was just added at the end
            const tocPage = mergedPdf.getPages()[tocPageIndex];
            mergedPdf.removePage(tocPageIndex);
            mergedPdf.insertPage(1, tocPage);
            
            console.log(`Table of Contents inserted at page 2`);
        }

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
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload`;
        
        // Create form data for multipart upload
        const FormData = require('form-data');
        const formData = new FormData();
        
        // Use unique public_id with timestamp to prevent caching of old booklets
        // This ensures each re-generation creates a completely new file with a new URL
        const timestamp = Date.now();
        const safePublicId = `graduation_booklet_${graduationId}_${timestamp}`;
        
        formData.append('file', Buffer.from(pdfBytes), {
            filename: `${safePublicId}.pdf`,
            contentType: 'application/pdf'
        });
        formData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);
        formData.append('resource_type', 'raw');
        formData.append('public_id', safePublicId);
        formData.append('folder', 'graduation-booklets'); // Use folder parameter instead of slashes in public_id
        // Each generation creates a new file with unique timestamp, preventing caching issues

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
        console.log(`Cloudinary version: ${uploadResult.version}`);
        console.log(`Full Cloudinary response:`, JSON.stringify(uploadResult, null, 2));

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
                skippedStudents: skippedStudents, // Always include, even if empty
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