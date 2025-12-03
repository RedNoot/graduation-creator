# Project Organization Guide

This document explains the organization and structure of the Graduation Creator project after the documentation cleanup on December 3, 2025.

## 📁 Root Directory Structure

```
graduation-creator/
├── 📄 README.md                              # Main project documentation (START HERE)
├── 📄 PROJECT-ARCHITECTURE-HANDOVER.md       # Complete system architecture
├── 📄 index.html                             # Main application entry point
├── 📄 package.json                           # Project dependencies
├── 📄 netlify.toml                           # Netlify configuration
├── 📄 firebase.json                          # Firebase configuration
├── 📄 firestore.rules                        # Firestore security rules
├── 📄 .gitignore                             # Git ignore rules
├── 📄 .env.example                           # Environment variable template
├── 📄 _headers                               # Netlify headers (CSP, security)
├── 📄 _redirects                             # Netlify redirects (SPA routing)
│
├── 📂 css/                                   # Stylesheets
│   ├── styles.css                            # Main application styles
│   ├── theme-config.css                      # Theme configuration
│   ├── ui-overhaul.css                       # UI enhancement styles
│   ├── ui-style-*.css                        # UI style variations
│   └── themes/                               # Theme presets
│
├── 📂 js/                                    # JavaScript modules
│   ├── config.js                             # Environment configuration
│   ├── firebase-init.js                      # Firebase initialization
│   ├── components/                           # UI components
│   ├── data/                                 # Data repositories
│   ├── handlers/                             # Event handlers
│   ├── router/                               # SPA routing
│   ├── services/                             # Business logic services
│   └── utils/                                # Utility functions
│
├── 📂 netlify/functions/                     # Serverless functions
│   ├── generate-booklet.js                   # PDF generation
│   ├── manage-editors.js                     # Multi-user management
│   ├── secure-operations.js                  # Password verification
│   ├── download-booklet.js                   # Secure downloads
│   ├── scheduled-cleanup.js                  # Daily cleanup
│   └── package.json                          # Function dependencies
│
├── 📂 docs/                                  # Documentation (see docs/README.md)
│   ├── 📄 README.md                          # Documentation index
│   ├── 📄 DEPLOYMENT.md                      # Deployment guide
│   ├── 📄 FEATURES.md                        # Feature descriptions
│   ├── 📄 SECURITY.md                        # Security guide
│   ├── 📄 TDD.md                             # Technical design document
│   ├── 📄 SERVICES-REFERENCE.md              # API reference
│   ├── 📄 FIELD-LOCKING-IMPLEMENTATION.md    # Multi-user collaboration
│   ├── 📄 CONCURRENT-EDITING-*.md            # Concurrent editing docs
│   ├── 📄 PHASE-*.md                         # Development phase docs
│   ├── 📄 *-IMPLEMENTATION.md                # Feature implementation docs
│   └── 📂 archive/                           # Historical documentation
│       ├── 📄 README.md                      # Archive index
│       ├── CSP-*.md                          # CSP fix documentation
│       ├── TASK-*.md                         # Task implementation docs
│       └── THEME-*.md                        # Theme system docs
│
└── 📂 samples/                               # Demo and sample files
    ├── 📄 README.md                          # Samples index
    ├── full-app-demo.html                    # Full app demo
    ├── full-app-demo.css                     # Demo styles
    └── ui-sample.html                        # UI samples
```

## 📚 Documentation Hierarchy

### 1️⃣ **Entry Point**
Start here: **[README.md](../README.md)**
- Project overview
- Quick start guide
- Tech stack
- Key features

### 2️⃣ **System Architecture**
Next read: **[PROJECT-ARCHITECTURE-HANDOVER.md](../PROJECT-ARCHITECTURE-HANDOVER.md)**
- Complete system documentation
- Architecture diagrams
- Data models
- Feature implementations
- API reference
- Maintenance guide

### 3️⃣ **Specialized Guides**
For specific topics: **[docs/](./)**
- **Getting Started:** DEPLOYMENT.md
- **Features:** FEATURES.md
- **Security:** SECURITY.md
- **Technical Design:** TDD.md
- **API Reference:** SERVICES-REFERENCE.md
- **Multi-User:** FIELD-LOCKING-IMPLEMENTATION.md

### 4️⃣ **Historical Reference**
For historical context: **[docs/archive/](./archive/)**
- CSP fixes and audits
- Task implementations
- Theme system evolution
- Bug fix summaries

## 🗂️ File Categories

### Production Files (Deploy These)
```
✅ index.html
✅ css/
✅ js/
✅ netlify/functions/
✅ netlify.toml
✅ firebase.json
✅ firestore.rules
✅ _headers
✅ _redirects
✅ package.json
```

### Configuration Files
```
⚙️ .env.example (template only, create .env locally)
⚙️ .gitignore
⚙️ firebase.json
⚙️ netlify.toml
```

### Documentation Files
```
📖 README.md
📖 PROJECT-ARCHITECTURE-HANDOVER.md
📖 docs/ (all files)
```

### Development/Reference Files (Not for production)
```
🔧 samples/ (demos and samples)
🔧 docs/archive/ (historical docs)
🗑️ graduation-creator-firebase-adminsdk-*.json (DO NOT COMMIT - in .gitignore)
```

## 🎯 Quick Reference by Task

### I want to...

**Deploy the app**
→ Read [docs/DEPLOYMENT.md](DEPLOYMENT.md)

**Understand the architecture**
→ Read [PROJECT-ARCHITECTURE-HANDOVER.md](../PROJECT-ARCHITECTURE-HANDOVER.md)

**Learn about features**
→ Read [docs/FEATURES.md](FEATURES.md)

**Set up security**
→ Read [docs/SECURITY.md](SECURITY.md)

**Find API documentation**
→ Read [docs/SERVICES-REFERENCE.md](SERVICES-REFERENCE.md)

**Understand multi-user collaboration**
→ Read [docs/FIELD-LOCKING-IMPLEMENTATION.md](FIELD-LOCKING-IMPLEMENTATION.md)

**See the original design**
→ Read [docs/TDD.md](TDD.md)

**Check historical changes**
→ Browse [docs/archive/](archive/)

**View code samples**
→ Browse [samples/](../samples/)

## 🧹 Cleanup Summary (Dec 3, 2025)

### Changes Made
1. ✅ Updated main README.md with comprehensive project overview
2. ✅ Created documentation index in docs/README.md
3. ✅ Archived historical CSP, TASK, and THEME docs
4. ✅ Moved demo files to samples/ folder
5. ✅ Created README files for archive/ and samples/
6. ✅ Organized root directory for clarity

### Files Moved
- **To docs/archive/**: All CSP-*.md, TASK-*.md, THEME-*.md, MIME-TYPE-ERROR-FIX.md, UI-OVERHAUL-ROADMAP.md
- **To samples/**: full-app-demo.html, ui-sample.html, full-app-demo.css

### Result
- ✨ Clean, organized root directory
- ✨ Clear documentation hierarchy
- ✨ Easy navigation for new developers
- ✨ Preserved historical context in archive

## 📋 Maintenance Guidelines

### Adding New Documentation
1. Place in `docs/` folder
2. Update `docs/README.md` index
3. Link from main README.md if important

### Archiving Old Documentation
1. Move to `docs/archive/`
2. Update `docs/archive/README.md`
3. Remove from main navigation

### Version Control
- **Commit regularly** with clear messages
- **Don't commit** .env files or service account keys
- **Update documentation** when making major changes
- **Tag releases** with semantic versioning

## 🔐 Security Reminders

### Never Commit
- ❌ .env files
- ❌ *firebase*adminsdk*.json files
- ❌ API keys or secrets
- ❌ User data

### Always Use
- ✅ Environment variables
- ✅ .gitignore rules
- ✅ Netlify environment variables for production

## 📞 Getting Help

### For Questions About...
- **Deployment** → See [docs/DEPLOYMENT.md](DEPLOYMENT.md)
- **Code** → See [PROJECT-ARCHITECTURE-HANDOVER.md](../PROJECT-ARCHITECTURE-HANDOVER.md)
- **Features** → See [docs/FEATURES.md](FEATURES.md)
- **Security** → See [docs/SECURITY.md](SECURITY.md)
- **Bugs** → Check [GitHub Issues](https://github.com/RedNoot/graduation-creator/issues)

---

**Last Updated:** December 3, 2025  
**Maintained By:** Development Team  
**Status:** Current Organization Standard
