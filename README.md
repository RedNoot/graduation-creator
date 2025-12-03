# Graduation Creator

> A comprehensive web-based platform for schools to create, manage, and publish beautiful graduation websites with automated PDF booklet generation.

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-badge-id/deploy-status)](https://app.netlify.com/sites/your-site)

## 🎓 Overview

Graduation Creator is a modern, Jamstack application that empowers schools to:
- **Manage student profiles** with photos, PDFs, and graduation messages
- **Generate professional booklets** combining all student profiles automatically
- **Create custom content pages** for speeches, messages, and memories
- **Publish themed graduation websites** with customizable designs
- **Support multi-user collaboration** with real-time conflict detection
- **Schedule booklet downloads** with customizable release dates

## ✨ Key Features

### 📚 Student Management
- Add students individually or bulk import via CSV
- Upload profile photos, PDFs, and cover page photos
- Drag-and-drop reordering
- Password-protected upload portals for students
- Direct upload links for easy student access

### 📄 Automated PDF Booklet Generation
- Server-side PDF merging using Netlify Functions
- Custom cover pages and table of contents
- Student cover pages with photos and messages
- Configurable page ordering
- Optimized PDF compression

### 💬 Content Management System
- Create custom content pages (speeches, messages, memories)
- Rich text editing with author attribution
- Media embedding (images and videos)
- Real-time content updates

### 🎨 Advanced Theming
- **15+ customization options** including:
  - Primary, secondary, and background colors
  - Multiple layout modes (grid, cards, list, scroll)
  - Card styling options (shadow, border, elevated, minimal)
  - Border radius control
  - Header styles
  - Animation effects
- Live preview of theme changes

### 👥 Multi-User Collaboration
- Real-time presence tracking
- Field-level locking (Google Docs-style)
- Conflict detection and resolution
- Unsaved changes warnings

### 📅 Download Scheduling
- Set specific release dates/times for booklets
- Custom pre-release messages
- Visual status indicators
- Server-side enforcement

### 🔒 Security & Performance
- Firebase Authentication
- Firestore security rules
- Content Security Policy (CSP)
- Input sanitization
- Rate limiting
- Sentry error tracking
- Automated asset cleanup

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Netlify account
- Firebase project
- Cloudinary account

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/RedNoot/graduation-creator.git
   cd graduation-creator
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd netlify/functions && npm install && cd ../..
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Run locally**
   ```bash
   netlify dev
   ```

5. **Open browser**
   ```
   http://localhost:8888
   ```

## 📦 Deployment

### Deploy to Netlify

1. **Connect your repository**
   - Sign in to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Select your repository

2. **Configure build settings**
   - Build command: (leave empty)
   - Publish directory: `.`
   - Functions directory: `netlify/functions`

3. **Add environment variables** (See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))
   - Firebase credentials
   - Cloudinary credentials
   - Sentry DSN (optional)

4. **Deploy!**
   - Netlify auto-deploys on push to main branch

For detailed deployment instructions, see **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

## 📖 Documentation

### Essential Documentation
- **[Project Architecture](PROJECT-ARCHITECTURE-HANDOVER.md)** - Complete system documentation and handover guide
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Step-by-step deployment instructions
- **[Features Guide](docs/FEATURES.md)** - Detailed feature descriptions
- **[Security Guide](docs/SECURITY.md)** - Security implementation details
- **[TDD (Technical Design Document)](docs/TDD.md)** - Original design specifications

### Navigation & Organization
- **[Documentation Index](docs/README.md)** - Complete documentation directory with role-based navigation
- **[Project Organization](ORGANIZATION.md)** - File structure and organization guide
- **[Cleanup Summary](CLEANUP-SUMMARY.md)** - Recent documentation reorganization details

### Advanced Topics
- **[Field Locking Implementation](docs/FIELD-LOCKING-IMPLEMENTATION.md)** - Multi-user collaboration system
- **[Services Reference](docs/SERVICES-REFERENCE.md)** - API and service documentation
- **[All Documentation](docs/)** - Browse complete documentation folder

## 🏗️ Tech Stack

### Frontend
- **Vanilla JavaScript** (ES6 Modules)
- **Tailwind CSS** (utility-first styling)
- **Firebase SDK** (Auth & Firestore)
- **Hash-based SPA routing**

### Backend
- **Netlify Functions** (serverless Node.js)
- **Firebase Admin SDK**
- **pdf-lib** (PDF generation)
- **Cloudinary** (file storage)

### Infrastructure
- **Netlify** (hosting & serverless functions)
- **Firebase Firestore** (database)
- **Firebase Auth** (authentication)
- **Cloudinary** (CDN & file storage)
- **Sentry** (error tracking)

## 📁 Project Structure

```
graduation-creator/
├── index.html                    # Main application entry point
├── netlify.toml                  # Netlify configuration
├── firebase.json                 # Firebase configuration
├── firestore.rules              # Firestore security rules
│
├── css/                         # Stylesheets
│   ├── styles.css               # Main styles
│   ├── theme-config.css         # Theme configuration
│   └── themes/                  # Theme presets
│
├── js/                          # JavaScript modules
│   ├── config.js                # Environment configuration
│   ├── firebase-init.js         # Firebase initialization
│   ├── components/              # UI components
│   ├── data/                    # Data repositories (Repository pattern)
│   ├── handlers/                # Event handlers
│   ├── router/                  # SPA routing system
│   ├── services/                # Business logic services
│   └── utils/                   # Utility functions
│
├── netlify/functions/           # Serverless functions
│   ├── generate-booklet.js      # PDF generation
│   ├── manage-editors.js        # Multi-user management
│   ├── secure-operations.js     # Password verification
│   ├── download-booklet.js      # Secure downloads
│   └── scheduled-cleanup.js     # Daily cleanup (cron)
│
└── docs/                        # Documentation
    ├── DEPLOYMENT.md            # Deployment guide
    ├── FEATURES.md              # Feature descriptions
    ├── SECURITY.md              # Security documentation
    └── ...
```

## 🎯 User Workflows

### For Teachers
1. **Create graduation project** with school name and year
2. **Add students** via CSV import or manual entry
3. **Share upload links** with students for PDF/photo uploads
4. **Create custom content** (speeches, messages, memories)
5. **Customize theme** (colors, layout, animations)
6. **Generate PDF booklet** with one click
7. **Schedule download** (optional) for specific release date
8. **Share public website** with students and families

### For Students
1. **Receive upload link** from teacher (password-protected)
2. **Upload profile PDF** (created from template)
3. **Upload profile photo** (optional)
4. **Upload cover photos** (before/after, optional)
5. **Write graduation message** (optional)
6. **View completed graduation website**
7. **Download booklet** when available

## 🔧 Configuration

### Firebase Setup
```javascript
// Required Firebase services:
- Authentication (Email/Password)
- Firestore Database
- Security Rules (see firestore.rules)
```

### Cloudinary Setup
```javascript
// Required Cloudinary configuration:
- Cloud Name
- Upload Preset (unsigned)
- API Key & Secret (for cleanup)
```

### Netlify Environment Variables
See `.env.example` for complete list of required variables.

## 🧪 Testing

```bash
# Local development with hot reload
netlify dev

# Test serverless functions
curl http://localhost:8888/.netlify/functions/generate-booklet

# Production testing
netlify deploy --prod
```

## 🐛 Troubleshooting

### Common Issues

**PDF generation fails**
- Check Netlify function logs
- Verify student PDFs are accessible
- Ensure Cloudinary credentials are correct

**Upload portal not working**
- Verify Firebase security rules
- Check Cloudinary upload preset settings
- Test file size limits (max 10MB)

**Multi-user conflicts**
- Ensure Firestore rules allow presence tracking
- Check browser console for WebSocket errors
- Verify Firebase project has real-time updates enabled

See full troubleshooting guide in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#troubleshooting)

## 📊 Performance

- **Serverless auto-scaling** handles traffic spikes
- **Global CDN** via Netlify and Cloudinary
- **Optimized PDFs** with automatic compression
- **Real-time updates** with efficient Firestore listeners
- **Client-side caching** for improved load times

## 🔐 Security

- **Firebase Auth** for user authentication
- **Firestore Security Rules** enforce data access
- **Content Security Policy** prevents XSS attacks
- **Input sanitization** on all user data
- **Rate limiting** on serverless functions
- **Environment variables** for credential management
- **HTTPS-only** deployment

## 🤝 Contributing

Contributions are welcome! Please read the [Project Architecture](PROJECT-ARCHITECTURE-HANDOVER.md) document first.

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

- **Documentation**: See `docs/` folder
- **Issues**: [GitHub Issues](https://github.com/RedNoot/graduation-creator/issues)
- **Architecture**: See `PROJECT-ARCHITECTURE-HANDOVER.md`

## 🎉 Acknowledgments

Built with:
- [Firebase](https://firebase.google.com) - Backend services
- [Netlify](https://netlify.com) - Hosting & functions
- [Cloudinary](https://cloudinary.com) - Media management
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [pdf-lib](https://pdf-lib.js.org) - PDF generation
- [Sentry](https://sentry.io) - Error tracking

---

**Made with ❤️ for schools creating memorable graduation experiences**