# Cloudinary Integration Guide

## Overview

This guide explains how to integrate Cloudinary for all file uploads in the LMS backend, including documents, images, and any other file types.

## Features

✅ **Cloudinary Integration** - Cloud-based file storage  
✅ **Local Fallback** - Works without Cloudinary (local storage)  
✅ **Automatic Detection** - Detects production vs development environment  
✅ **Image Optimization** - Automatic thumbnail generation  
✅ **Document Support** - PDFs, Word docs, images  
✅ **Memory Efficient** - Uses memory storage to avoid disk space issues  
✅ **Secure URLs** - All files served via HTTPS  
✅ **Public ID Tracking** - Stores Cloudinary public IDs for easy deletion

## Installation Steps

### Step 1: Install Dependencies

```bash
cd "c:\Users\Uche\Documents\David Millenium\L-D1"
npm install cloudinary streamifier
```

### Step 2: Add Environment Variables to .env

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Step 3: Get Cloudinary Credentials

1. Go to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Sign up for a free account (if not already)
3. Copy your **Cloud Name**, **API Key**, and **API Secret**
4. Paste them in your `.env` file

### Step 4: Update render.yaml for Production

Add Cloudinary environment variables to your Render deployment:

```yaml
envVars:
  - key: CLOUDINARY_CLOUD_NAME
    sync: false
  - key: CLOUDINARY_API_KEY
    sync: false
  - key: CLOUDINARY_API_SECRET
    sync: false
```

### Step 5: Deploy

```bash
git add -A
git commit -m "Add: Cloudinary integration for file uploads"
git push origin main
```

## File Structure

### Core Files Created/Modified

1. **`src/config/env.ts`** - Added Cloudinary configuration
2. **`src/utils/cloudinary.service.ts`** - NEW: Cloudinary upload service
3. **`src/utils/upload.helper.ts`** - NEW: Helper functions for uploads
4. **`src/controllers/document.controller.ts`** - UPDATED: Uses Cloudinary
5. **`package.json`** - UPDATED: Added cloudinary & streamifier

## Usage Examples

### Upload a Document

```typescript
import { handleDocumentUpload } from "../utils/upload.helper";

// In your controller
const uploadResult = await handleDocumentUpload(
  req.file,
  `documents/customers/${customerId}`
);

// uploadResult contains:
// {
//   url: "https://res.cloudinary.com/...",
//   publicId: "documents/customers/...",
//   provider: "cloudinary"
// }
```

### Upload an Image with Thumbnail

```typescript
import { handleImageUpload } from "../utils/upload.helper";

const uploadResult = await handleImageUpload(req.file, `images/profiles`);

// uploadResult contains:
// {
//   url: "https://res.cloudinary.com/...",
//   thumbnailUrl: "https://res.cloudinary.com/...?w=150&h=150...",
//   publicId: "images/profiles/...",
//   provider: "cloudinary"
// }
```

### Direct Cloudinary Service Usage

```typescript
import { CloudinaryService } from "../utils/cloudinary.service";

// Upload any file
const result = await CloudinaryService.uploadFile(
  fileBuffer,
  fileName,
  "documents/loans",
  "raw"
);

// Delete a file
await CloudinaryService.deleteFile(publicId);

// Generate transformed URL
const url = CloudinaryService.getTransformedUrl(publicId, {
  width: 300,
  height: 300,
  crop: "fill",
});
```

## API Endpoints

### Document Upload

**POST** `/api/documents/customer/:customerId`

```json
{
  "file": <multipart file>,
  "documentTypeId": "uuid",
  "issuingAuthority": "government",
  "issueDate": "2024-01-01",
  "expiryDate": "2025-01-01"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fileUrl": "https://res.cloudinary.com/...",
    "publicId": "documents/customers/...",
    "verified": false,
    "provider": "cloudinary"
  }
}
```

### Get Document

**GET** `/api/documents/serve/:documentId`

Returns the document URL (for Cloudinary) or streams the file (for local storage).

## Database Considerations

### Store Additional Fields

The system stores metadata for better tracking:

```typescript
{
  fileUrl: string;        // Cloudinary URL or local path
  publicId?: string;      // Cloudinary public ID for deletion
  provider?: string;      // "cloudinary" or "local"
  verificationNotes?: string;
}
```

### Update Your Prisma Schema (Optional)

If you want to track the provider and public ID:

```prisma
model CustomerDocument {
  id String @id @default(cuid())
  customerId String
  customer Customer @relation(fields: [customerId], references: [id])
  documentTypeId String
  documentType DocumentType @relation(fields: [documentTypeId], references: [id])
  fileUrl String        // Cloudinary URL
  publicId String?      // For Cloudinary deletion
  provider String @default("local")  // "cloudinary" or "local"
  verified Boolean @default(false)
  verificationNotes String?
  uploadedByUserId String
  uploadedBy User @relation(fields: [uploadedByUserId], references: [id])
  uploadedAt DateTime @default(now())
  deletedAt DateTime?

  @@index([customerId])
  @@index([documentTypeId])
}
```

## How It Works

### Upload Flow

```
1. User uploads file
   ↓
2. Multer middleware captures file (to memory)
   ↓
3. handleDocumentUpload() called
   ↓
4. If Cloudinary enabled:
   - Stream file to Cloudinary
   - Get HTTPS URL back
   - Store URL in database
   ↓
5. If Cloudinary disabled:
   - Save to local disk
   - Return local path
   ↓
6. Database stores file URL + public ID
   ↓
7. Response sent to frontend with file URL
```

### Serving Files

```
GET /api/documents/serve/:documentId
   ↓
1. Fetch document from database
   ↓
2. Check if URL is Cloudinary:
   - YES: Return URL to frontend
   - NO: Stream local file
   ↓
3. Frontend receives file (URL or stream)
```

## Production Deployment

### On Render.com

1. Add Cloudinary credentials to environment variables
2. Cloudinary will automatically be detected and enabled
3. All uploads go to Cloudinary instead of ephemeral storage
4. Files persist permanently ✅

### Cloudinary Plan Recommendations

| Plan         | Storage | Bandwidth     | Cost      | Use Case                |
| ------------ | ------- | ------------- | --------- | ----------------------- |
| Free         | 25 GB   | 25 GB/month   | $0        | Development, small apps |
| Professional | 100+ GB | 100+ GB/month | $99/month | Production apps         |
| API          | Custom  | Custom        | Custom    | Enterprise              |

**For LMS:** Free plan should be sufficient (25GB can store ~5000 documents @ 5MB avg)

## Testing

### Test with Local Storage (No Cloudinary)

Remove environment variables to test local fallback:

```bash
# .env
# Comment out Cloudinary variables
# CLOUDINARY_CLOUD_NAME=...
# CLOUDINARY_API_KEY=...
# CLOUDINARY_API_SECRET=...
```

Uploads will use local disk storage.

### Test with Cloudinary

```bash
# .env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Upload a file and check Cloudinary dashboard to verify.

## Troubleshooting

### Issue: "Cannot find module 'cloudinary'"

**Solution:**

```bash
npm install cloudinary streamifier
npm run build
```

### Issue: Cloudinary uploads failing

**Check:**

1. Environment variables are set correctly
2. API credentials are valid
3. File size doesn't exceed limits (5-10MB)
4. File format is supported (PDF, JPG, PNG, DOCX, etc.)

### Issue: Switching from local to Cloudinary

**Old files (local storage) won't work with Cloudinary URLs.** Solution:

```sql
-- Backup old documents
INSERT INTO DocumentBackup SELECT * FROM CustomerDocument;

-- Delete old documents
DELETE FROM CustomerDocument WHERE fileUrl LIKE 'uploads%';
DELETE FROM LoanDocument WHERE fileUrl LIKE 'uploads%';

-- Re-upload documents
-- They'll now use Cloudinary
```

## Security Best Practices

1. ✅ **Never commit credentials** - Use environment variables
2. ✅ **Use API Secret securely** - Only on backend
3. ✅ **Validate file types** - Implemented in fileFilter
4. ✅ **Limit file sizes** - 5-10MB limits set
5. ✅ **Use HTTPS URLs** - Cloudinary provides secure_url
6. ✅ **Track uploads** - Store uploader info and timestamps

## Migration from Local to Cloudinary

### For Existing Deployments

1. Set Cloudinary credentials
2. Deploy code
3. Existing local files continue working (stored in database)
4. **New uploads** go to Cloudinary
5. Gradually transition by asking users to re-upload

### Complete Migration

```typescript
// Script to migrate old files to Cloudinary
async function migrateToCloudinary() {
  const documents = await DocumentService.getAllDocuments();

  for (const doc of documents) {
    if (doc.fileUrl.includes("uploads")) {
      // Read local file
      const buffer = fs.readFileSync(doc.fileUrl);

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadFile(
        buffer,
        path.basename(doc.fileUrl),
        "migrated"
      );

      // Update database
      await DocumentService.updateFileUrl(doc.id, result.secureUrl);

      // Delete local file
      fs.unlinkSync(doc.fileUrl);
    }
  }
}
```

## Support & Resources

- [Cloudinary Docs](https://cloudinary.com/documentation)
- [Cloudinary Upload API](https://cloudinary.com/documentation/upload_widget)
- [SDK Reference](https://cloudinary.com/documentation/cloudinary_npm_sdk_reference)

---

**Next Step:** Push changes and deploy! 🚀
