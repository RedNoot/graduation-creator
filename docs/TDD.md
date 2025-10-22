Technical Design Document: Grade 6 Graduation Web App

Version: 2.0 (Final)
Date: October 14, 2025
Author: Gemini

1. Introduction

This document outlines the technical design for a modern, full-stack web application that enables teachers and students to collaboratively create a digital graduation website and a corresponding printable PDF booklet.

The application is designed to be highly customizable, secure, and entirely free to operate under normal usage conditions. It empowers teachers to create a unique and personal online space for their graduating class, manage student contributions securely, and share the final product with the wider school community.

2. System Architecture: The Jamstack Approach

The application will be built using a Jamstack architecture. This modern approach ensures the application is fast, secure, scalable, and cost-effective by pre-building the frontend and using APIs for dynamic functionality.

Frontend: A Single Page Application (SPA) built with a modern JavaScript framework (e.g., React). The SPA provides a fluid, app-like user experience.

Hosting: The static frontend will be hosted on Netlify. Its free tier provides a global CDN for speed, a seamless CI/CD pipeline from a Git repository, and is more than sufficient for this project's scale.

Backend Services & Database: All backend logic, data, and authentication will be handled by Firebase on its free "Spark Plan".

Authentication: Firebase Authentication will manage teacher accounts (email/password).

Database: Firestore will serve as the NoSQL database for all application state, including student lists, website configuration, and content.

File & Media Storage: All binary files (student PDFs, school logos) will be stored on Cloudinary. Its generous free tier provides ample storage and bandwidth.

2.1. System Flow Diagram

graph TD
    A[User's Browser] -- Interacts with --> B(Frontend on Netlify);
    B -- Authenticates Teacher --> C(Firebase Auth);
    B -- Reads/Writes Data --> D(Firestore Database);
    B -- Gets upload signature from --> F(Serverless Function on Netlify);
    B -- Uploads/Downloads Files --> E(Cloudinary Media Storage);
    F -- Reads Data from --> D;
    F -- Reads PDFs from --> E;
    F -- Writes Final PDF to --> E;


3. Data Model (Firestore)

The Firestore database will be structured to support customization and scalability.

graduations (Collection)

Each document represents a single graduation website.

Fields:

schoolName: (String)

graduationYear: (Number)

ownerUid: (String) The Firebase UID of the teacher creator.

isLocked: (Boolean)

generatedBookletUrl: (String) URL to the final PDF in Cloudinary.

downloadableAfterDate: (Timestamp, Optional)

config (Sub-collection)

A single document (settings) holds all customization options.

Fields:

schoolLogoUrl: (String)

primaryColor: (String, Hex code)

font: (String, e.g., "Inter", "Roboto")

layout: (String, e.g., "grid", "scroll")

showSpeeches: (Boolean)

showMessages: (Boolean)

pageOrder: (Array of strings, e.g., ["students", "messages", "speeches"])

students (Sub-collection)

Each document represents a student.

Fields:

name: (String)

profilePdfUrl: (String)

accessType: (String, "public", "link", or "password")

uniqueLinkId: (String, For link access)

passwordHash: (String, For password access)

contentPages (Sub-collection)

Documents for custom content like "Farewell Messages".

Fields:

title: (String)

content: (String, Markdown/HTML)

author: (String)

4. Core Features & Implementation

4.1. Teacher Dashboard & Site Customization

A comprehensive dashboard will allow authenticated teachers to manage every aspect of their site.

Settings: Teachers can modify all fields within the config document, including theme colors, fonts, layouts, and the visibility/order of content sections.

Unique URL & QR Code: The application will display the unique, shareable public URL for the website (e.g., app.netlify.app/view/{gradId}). A button will use a client-side JavaScript library to instantly generate a downloadable QR code for this URL.

4.2. Student Management & Secure Access

Teachers can add students to the students collection. For each student, they can select one of three access methods for the PDF upload portal:

Public: The student selects their name from a list. (Least secure).

Unique Link: The system generates a secure, unguessable ID (uniqueLinkId) and displays the full link for the teacher to copy and distribute privately.

Password: The system auto-generates a simple, memorable password (e.g., "RedHat"), hashes it, and stores the hash (passwordHash). The teacher shares the plain-text password with the student.

4.3. PDF Collation (Server-Side)

Offloading this complex task from the browser is critical for reliability.

Trigger: A "Generate Booklet" button in the teacher dashboard invokes a Netlify Serverless Function.

Process: The function fetches all data from Firestore, downloads the required PDFs from Cloudinary, uses a Node.js library (pdf-lib) to merge them into a single file, and uploads the final booklet back to Cloudinary, saving the URL to Firestore.

4.4. Public Graduation Website

The public-facing website is a read-only view of the data.

Dynamic Rendering: Using the ID from the URL (e.g., .../view/{gradId}), the SPA fetches the corresponding data from Firestore and dynamically renders the page according to the teacher's saved configuration.

Client-Side Routing: A _redirects file in the Netlify project will ensure that all paths are correctly routed to the main index.html, allowing the SPA to handle the dynamic views.

5. Risks & Mitigation Strategies

Bottleneck: PDF Generation Timeouts.

Risk: A large class with many high-resolution PDFs could cause the serverless function to exceed its execution time limit.

Mitigation: The function will be built to process files sequentially. For very large-scale use, this could be upgraded to a more robust asynchronous process using multiple functions.

Security: Student Data Integrity.

Risk: The "Public" access method allows for potential mistakes or mischief where one student could upload a file to another's profile.

Mitigation: The "Unique Link" and "Password" options are provided as more secure alternatives. The UI will clearly explain the security level of each choice to the teacher.

Constraint: Reliance on Free Tiers.

Risk: A massive, viral event could theoretically exceed the daily usage limits of Firebase or Cloudinary, causing a temporary outage.

Mitigation: The generous limits make this highly improbable for the target use case (a single class). The system will include error handling to fail gracefully if an API limit is reached.

6. Design Rationale

A Single Page Application (SPA) is the optimal architectural choice. It provides a fluid, modern user experience essential for the highly interactive teacher dashboard. This model fits perfectly within the Jamstack ecosystem, allowing for an efficient separation of the frontend UI from the backend APIs, which enhances performance, security, and developer experience.