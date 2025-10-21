# Document Storage Fix - Complete Guide

## Status Update 🔄

I've identified and fixed the root cause of the document 404 errors. Here's what you need to do.

## The Situation 📊

### Why Documents Are 404ing

1. **Old documents** (uploaded before today) were saved to Render's **ephemeral storage**
2. Render's ephemeral storage **gets wiped when the app restarts**
3. Your documents were deleted from storage, but database records still exist
4. When you try to view them → 404 Error

### What I've Fixed ✅

1. **Added persistent disk** to `render.yaml` (10GB storage at `/var/data`)
2. **Updated document controller** to use persistent disk for new uploads
3. **Improved error handling** with better logging for debugging

## What You Need to Do 🎯

### Step 1: Push Changes to GitHub

```bash
cd "c:\Users\Uche\Documents\David Millenium\L-D1"
git add -A
git commit -m "Fix: Add persistent disk for document storage and improve error handling"
git push origin main
```

### Step 2: Wait for Render Redeployment

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Find your `lms-backend` service
3. Wait for automatic redeployment after push
4. Once deployment completes, the persistent disk will be attached

### Step 3: Delete Old Documents

Old documents won't work because their files are gone. You need to:

1. Go to **Customer Detail Page**
2. Scroll to **Documents section**
3. Delete all old documents (they're orphaned anyway)
4. Or delete from database directly:

```sql
DELETE FROM "CustomerDocument" WHERE fileUrl LIKE 'uploads%';
DELETE FROM "LoanDocument" WHERE fileUrl LIKE 'uploads%';
```

### Step 4: Re-upload Documents

1. Upload fresh documents through the UI
2. They'll now save to `/var/data` (persistent disk)
3. They'll work permanently ✅

### Step 5: Verify Everything Works

1. Upload a test document
2. View it - should work ✅
3. Refresh the page - should still work ✅
4. Wait 5 minutes for app to auto-restart
5. Try to view again - should still work ✅

## Technical Details 🔧

### File Structure After Fix

```
/var/data/                    (persistent disk on Render)
├── customer-documents/
│   ├── 1697884234-123456789.pdf
│   ├── 1697884562-987654321.jpg
│   └── ...
└── loan-documents/
    ├── 1697884890-555666777.docx
    └── ...
```

### New Upload Flow

```
1. User uploads document
   ↓
2. File saved to /var/data/customer-documents/ (persistent)
   ↓
3. Database record created with file path
   ↓
4. App restarts
   ↓
5. File still exists in persistent disk ✅
   ↓
6. User views document → Success! ✅
```

### Improved Error Handling

The updated document controller now:

- ✅ Logs detailed path information for debugging
- ✅ Tries both relative and absolute paths
- ✅ Provides clear error messages
- ✅ Handles file read errors gracefully
- ✅ Prevents server crashes from file issues

## Timeline ⏱️

- **Now**: Push changes
- **1-2 minutes**: Render detects changes and starts redeployment
- **3-5 minutes**: Deployment completes, persistent disk attached
- **5+ minutes**: You can start uploading new documents
- **Going forward**: All documents persist permanently ✅

## Troubleshooting 🔍

### Q: Still getting 404 errors?

**A**: You're viewing old documents. Delete them and re-upload.

### Q: How do I know the persistent disk is working?

**A**: Try this:

1. Upload a document
2. View it (should work)
3. Manually restart the app on Render dashboard
4. View the same document again
5. If it works after restart → persistent disk is working ✅

### Q: Can I see what documents are in the persistent disk?

**A**: Not directly through the UI, but you can check the backend logs on Render which will show file paths being served.

### Q: What if I need more than 10GB?

**A**: Update `render.yaml`:

```yaml
disk:
  sizeGB: 20 # Increase from 10 to 20
```

Then push and Render will increase the disk.

### Q: Can I transfer old documents?

**A**: If files still exist somewhere:

1. Copy them to `/var/data/customer-documents/`
2. Update database paths from `uploads/...` to `/var/data/...`
3. Documents will work again

But since files are already gone, it's easier to just re-upload.

## Next Steps 🚀

1. **Push changes** to GitHub
2. **Monitor Render deployment** (should take 3-5 minutes)
3. **Delete old documents** from database or UI
4. **Upload test documents** and verify they work
5. **Let me know** if you have any issues

## Questions?

If anything doesn't work after deployment:

1. Check Render dashboard logs
2. Look for the console.log messages I added (showing file paths)
3. Let me know what you see

That's it! Your document storage is now properly configured for production. 🎉
