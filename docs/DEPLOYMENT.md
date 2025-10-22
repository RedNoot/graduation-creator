# Deployment Guide: Graduation Creator on Netlify

This guide explains how to deploy the Graduation Creator web app to Netlify with proper serverless functions and environment variables.

## Prerequisites

1. **GitHub Account**: Your code should be in a GitHub repository
2. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
3. **Firebase Project**: Set up in [Firebase Console](https://console.firebase.google.com)
4. **Cloudinary Account**: Sign up at [cloudinary.com](https://cloudinary.com)

## Step 1: Prepare Your Repository

1. Ensure your project structure looks like this:
```
graduation-creator/
├── index.html (your main HTML file)
├── netlify.toml
├── .env.example
├── netlify/
│   └── functions/
│       ├── package.json
│       └── generate-booklet.js
└── README.md
```

2. Push your code to GitHub

## Step 2: Set Up Firebase Admin

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file and note these values:
   - `project_id`
   - `client_email`
   - `private_key`

## Step 3: Set Up Cloudinary

1. Go to Cloudinary Dashboard
2. Note your:
   - Cloud Name
   - Create an Upload Preset (unsigned)

## Step 4: Deploy to Netlify

1. **Connect Repository**:
   - Log into Netlify
   - Click "New site from Git"
   - Connect your GitHub repo
   - Build command: (leave empty)
   - Publish directory: `.`

2. **Configure Environment Variables**:
   Go to Site Settings → Environment Variables and add:

   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account-email
   FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
   your-private-key-here
   -----END PRIVATE KEY-----
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_UPLOAD_PRESET=your-upload-preset
   ```

   **Important**: For `FIREBASE_PRIVATE_KEY`, copy the entire private key including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines.

3. **Deploy**: Click "Deploy site"

## Step 5: Update Client Configuration

After deployment, update your HTML file with the actual values:

1. Replace Firebase config in the HTML:
```javascript
const getConfig = () => {
    return {
        firebase: {
            apiKey: "your-actual-api-key",
            authDomain: "your-project.firebaseapp.com",
            projectId: "your-project-id",
            storageBucket: "your-project.firebasestorage.app",
            messagingSenderId: "your-sender-id",
            appId: "your-app-id"
        },
        cloudinary: {
            cloudName: "your-cloud-name",
            uploadPreset: "your-upload-preset"
        },
        isDevelopment: window.location.hostname === 'localhost'
    };
};
```

2. Commit and push the changes to trigger a new deployment

## Step 6: Set Up Firebase Security Rules

Update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can create graduations
    match /graduations/{gradId} {
      allow read: if true; // Public read for viewing
      allow write: if request.auth != null && request.auth.uid == resource.data.ownerUid;
      
      // Students subcollection
      match /students/{studentId} {
        allow read: if true; // Public read for upload portal
        allow write: if request.auth != null && request.auth.uid == get(/databases/$(database)/documents/graduations/$(gradId)).data.ownerUid;
      }
      
      // Config subcollection
      match /config/{configId} {
        allow read: if true; // Public read for website display
        allow write: if request.auth != null && request.auth.uid == get(/databases/$(database)/documents/graduations/$(gradId)).data.ownerUid;
      }
    }
  }
}
```

## Step 7: Test Your Deployment

1. **Test Authentication**: Create a teacher account
2. **Test Graduation Creation**: Create a new graduation project
3. **Test Student Upload**: Try all three access types
4. **Test PDF Generation**: Upload some test PDFs and generate a booklet
5. **Test Public View**: Check the public graduation website

## Troubleshooting

### Function Not Working
- Check Netlify Function logs in the dashboard
- Verify environment variables are set correctly
- Ensure Firebase service account has Firestore permissions

### Upload Issues
- Verify Cloudinary upload preset is "unsigned"
- Check CORS settings in Cloudinary if needed
- Test file size limits (10MB max)

### Build Errors
- Check that `netlify.toml` is in the root directory
- Verify Node.js version compatibility (18+)
- Check function dependencies in `package.json`

### Local Development

For local development with Netlify CLI:

1. Install Netlify CLI: `npm install -g netlify-cli`
2. Create `.env` file with your environment variables
3. Run: `netlify dev`
4. Your site will be available at `http://localhost:8888`

## Performance Optimization

1. **Enable Caching**: Netlify automatically caches static assets
2. **CDN**: Netlify provides global CDN automatically
3. **Function Optimization**: Functions auto-scale based on demand
4. **Firestore Optimization**: Use appropriate indexes for queries

## Security Considerations

1. **Never commit private keys** to version control
2. **Use environment variables** for all sensitive data
3. **Implement proper Firestore rules** as shown above
4. **Monitor usage** to stay within free tier limits

Your Graduation Creator should now be fully deployed and functional on Netlify!