# Cloudinary Integration - Deployment Checklist

## Pre-Deployment ✅

- [ ] Install dependencies: `npm install cloudinary streamifier`
- [ ] Create Cloudinary account at https://cloudinary.com
- [ ] Copy credentials (Cloud Name, API Key, API Secret)
- [ ] Add to .env file locally
- [ ] Test locally with `npm run dev`
- [ ] Upload test document and verify it works
- [ ] Check Cloudinary dashboard to confirm file uploaded

## Code Changes Summary

### Modified Files

1. **`src/config/env.ts`**

   - Added Cloudinary configuration section
   - Detects if Cloudinary is enabled

2. **`src/controllers/document.controller.ts`**
   - Updated import to use Cloudinary helpers
   - Updated uploadCustomerDocument() to use Cloudinary
   - Updated uploadLoanDocument() to use Cloudinary
   - Updated uploadGuarantorDocument() to use Cloudinary
   - Updated serveDocument() to handle Cloudinary URLs

### New Files Created

1. **`src/utils/cloudinary.service.ts`**

   - CloudinaryService class for uploads/deletes
   - uploadFile(), uploadImage(), uploadDocument() methods
   - deleteFile() for cleanup
   - getTransformedUrl() for image transformations

2. **`src/utils/upload.helper.ts`**

   - Multer configuration (memory + disk fallback)
   - handleFileUpload() - generic upload handler
   - handleImageUpload() - image-specific with thumbnails
   - handleDocumentUpload() - document-specific handler
   - Automatic fallback to local storage if Cloudinary unavailable

3. **`CLOUDINARY_INTEGRATION.md`**
   - Complete integration guide
   - Usage examples
   - Troubleshooting
   - Security best practices

### Updated Files

1. **`package.json`**
   - Added: `cloudinary: ^1.40.0`
   - Added: `streamifier: ^0.1.1`

## Deployment Steps

### Step 1: Push Code

```bash
cd "c:\Users\Uche\Documents\David Millenium\L-D1"
git add -A
git commit -m "feat: Integrate Cloudinary for file uploads

- Add cloudinary and streamifier packages
- Create CloudinaryService for upload management
- Create upload helpers with Cloudinary support
- Update all document controllers to use Cloudinary
- Automatic fallback to local storage when Cloudinary unavailable
- Add comprehensive documentation and guides"
git push origin main
```

### Step 2: Configure on Render.com

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select **lms-backend** service
3. Go to **Environment**
4. Add three new environment variables:
   - `CLOUDINARY_CLOUD_NAME` = your_cloud_name
   - `CLOUDINARY_API_KEY` = your_api_key
   - `CLOUDINARY_API_SECRET` = your_api_secret
5. Click **Save**
6. Render will automatically redeploy

### Step 3: Wait for Deployment

- Deployment takes 3-5 minutes
- Check the deployment logs
- Once complete, backend is ready ✅

### Step 4: Test in Production

1. Upload a test document via frontend
2. View the document → Should work ✅
3. Check Cloudinary dashboard → File should be there ✅
4. Refresh page → Document still accessible ✅

## Verification Checklist

### Backend

- [ ] Code compiles without errors
- [ ] No TypeScript errors
- [ ] Environment variables loaded
- [ ] Cloudinary service initialized

### Deployment

- [ ] Render deployment successful
- [ ] Environment variables set on Render
- [ ] Backend service running

### Testing

- [ ] Upload customer document
- [ ] View document in UI
- [ ] Check Cloudinary dashboard for file
- [ ] Delete document from UI (if implemented)
- [ ] Verify file deleted from Cloudinary

## What's Working Now

### ✅ Document Uploads

- Customer documents → Cloudinary
- Loan documents → Cloudinary
- Guarantor documents → Cloudinary
- Automatic folder organization

### ✅ Image Uploads

- Profile pictures → Cloudinary
- Thumbnails generated automatically
- Optimized for web

### ✅ Serving Files

- Cloudinary URLs returned directly
- Local files streamed from server
- Automatic format detection
- Error handling

### ✅ Fallback System

- If Cloudinary credentials missing → uses local storage
- Development environment → uses local storage (configurable)
- Production environment → uses Cloudinary (when configured)

## Rollback Plan (If Issues)

If you need to revert:

```bash
# Remove Cloudinary environment variables from Render
# Or set them to empty strings

# Redeploy
# The system will fallback to local storage automatically
```

## Monitoring

### Check Upload Status

Backend logs will show:

```
✅ Cloudinary configured and enabled
```

or

```
⚠️ Cloudinary not configured - uploads will use local storage
```

### Cloudinary Dashboard

Monitor:

- Total files uploaded
- Storage usage (out of 25GB)
- Bandwidth usage (out of 25GB/month)
- Failed uploads

## Next Steps

1. **Install packages**
2. **Get Cloudinary credentials**
3. **Deploy code**
4. **Add env vars to Render**
5. **Test uploads**
6. **Done!** 🎉

## Questions?

- Check `CLOUDINARY_INTEGRATION.md` for detailed docs
- Review `src/utils/cloudinary.service.ts` for implementation
- Check Cloudinary dashboard for upload status

---

**Ready to deploy?** Follow the steps above! 🚀
