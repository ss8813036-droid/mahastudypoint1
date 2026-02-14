

# MahaStudyPoint — Engineering Made Easy

A full-stack educational platform for Mumbai University engineering students with Student, Teacher, and Admin roles.

## 1. Foundation & Branding
- Dark galaxy-themed UI with blue accents using the MahaStudyPoint logo
- Bottom navigation: Home, Courses, Chat, Profile
- Mobile-first responsive design optimized for Android WebView
- Landing/splash page with branding

## 2. Authentication & User Roles (Lovable Cloud + Supabase)
- Email + password signup/login with email verification
- User profiles table (name, avatar, semester, branch)
- Separate user_roles table (student, teacher, admin) with secure RLS
- Admin can approve teachers, reset passwords
- Session management with optional one-device enforcement

## 3. Course System
- Courses organized by semester and subject with thumbnails
- Course properties: price, validity (30/90/365 days/lifetime), launch status
- Only launched courses visible to students
- Admin and approved teachers can create/edit courses

## 4. Purchase System — WhatsApp + Token
- **WhatsApp flow**: "Buy Course" redirects to admin-configured WhatsApp with pre-filled message; admin manually grants access
- **Token flow**: Student enters a unique token → validated → instant course access
- Admin panel for WhatsApp settings (number, message template, enable/disable)
- Admin token management: generate, assign to courses, set expiry, revoke, export, track usage

## 5. Content Management & Folder System
- Nested folder structure within courses (units, chapters)
- Upload PDFs and images to Supabase Storage
- Editable content properties: name, description, unit/chapter, content type
- Per-content toggles: Allow Download, Add Watermark, Access Type (free/paid/specific users)
- Move content between folders

## 6. In-App PDF Viewer
- Integrated PDF.js-based viewer (no new tabs, no Google Docs)
- Smooth scroll, zoom, page navigation, fit-to-width
- Optional dark mode for reading
- Username watermark overlay (diagonal, semi-transparent) when enabled
- Download button shown only when allowed
- CSS-based screenshot deterrence (for web; FLAG_SECURE for Android wrapper)

## 7. In-App Image Viewer
- Lightbox-style viewer with zoom and pan
- Watermark overlay when enabled
- Download controlled per content settings

## 8. Course Chat System
- Course-specific group chats
- Students auto-added upon gaining course access
- Teachers can send announcements
- Admin can monitor all chats

## 9. Tests & Assignments
- Teachers create MCQ tests with time limits and auto-submit
- Auto-evaluation with score display
- Assignment upload and grading system

## 10. Admin Dashboard
- Full user management (view, edit, approve teachers, force logout)
- Course management (edit all courses, launch/unpublish)
- Token management dashboard with analytics
- Grant free access / add users to courses manually
- WhatsApp configuration
- Maintenance mode toggle
- Analytics: enrollment counts, token redemption, content views, user engagement

## 11. Teacher Dashboard
- Manage own courses and content
- Create tests and assignments
- View student progress and grades
- Send announcements in course chats

## 12. Student Dashboard
- View enrolled courses and browse available ones
- Access content through in-app viewers
- Take tests and submit assignments
- Course chat participation
- Profile management

