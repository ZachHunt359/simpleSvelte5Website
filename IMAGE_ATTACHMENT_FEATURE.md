# Image Attachment Feature for Admin Inquiry Replies

## Overview
Admins can now attach a single image to their replies to reader inquiries. This feature allows for visual communication such as diagrams, screenshots, or other relevant images.

## Features
- ✅ Single image upload per reply (JPEG, PNG, GIF, WebP supported)
- ✅ Maximum file size: 25MB (Gmail attachment limit)
- ✅ Images stored in /static/inquiry-images/
- ✅ Images displayed in admin dashboard
- ✅ Images shown in reader notifications
- ✅ Images included in email replies

## Usage

### For Admins
1. Navigate to the Dashboard (/dashboard)
2. Find an inquiry you want to reply to
3. Type your text reply in the textarea
4. Click "📎 Attach Image (optional)" to select an image file
5. Click "Save Reply" to save both text and image
6. The image will be uploaded and associated with the reply

### For Readers
- When viewing replies in the notifications panel, any attached images will be displayed below the reply text
- Images can be viewed at full size (up to 300px wide in notifications)

## Technical Details

### Database Schema
Added ReplyImageUrl TEXT column to Inquiries table to store the relative URL of uploaded images.

### API Endpoints
- POST /api/inquiry/reply-image - Upload image file
  - Accepts FormData with 'image' field
  - Returns { success: true, url: "/inquiry-images/reply-<timestamp>.<ext>" }
  - Validates file type and size
  
- POST /api/inquiry/reply - Updated to accept optional imageUrl parameter
  - Saves reply text and image URL to database

### File Storage
- Images are saved to: static/inquiry-images/reply-<timestamp>.<ext>
- Filename format ensures uniqueness
- Accessible via static URL: /inquiry-images/reply-<timestamp>.<ext>

### Email Integration
- When sending email replies, the image URL is included in the email body
- Format: "Image attachment: https://yourdomain.com/inquiry-images/reply-xxxxx.jpg"

## Migration
The database migration migrate_add_reply_image.sql has been applied to add the ReplyImageUrl column.

To apply manually (if needed):
\\\ash
node scripts/apply-migrations.js
\\\

## File Locations
- Migration: data/migrate_add_reply_image.sql
- Upload endpoint: src/routes/api/inquiry/reply-image/+server.ts
- Reply endpoint: src/routes/api/inquiry/reply/+server.ts (updated)
- Dashboard UI: src/routes/(authenticated)/dashboard/+page.svelte (updated)
- Reader notifications: src/routes/[chapter]/[panel]/+page.svelte (updated)
- Email sending: src/routes/api/inquiry/send-email/+server.ts (updated)

## Future Enhancements (Not Implemented)
- Image compression/resizing
