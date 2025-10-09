# Environment Setup Guide

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/lms_db"
DIRECT_URL="postgresql://username:password@localhost:5432/lms_db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# Server Configuration
NODE_ENV="development"
PORT=5000

# CORS Configuration
CORS_ORIGIN="http://localhost:3000,http://localhost:3001"

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_DIR="uploads"

# Email Configuration (Optional)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
```

## Setup Steps

1. **Create the .env file** with the variables above
2. **Update DATABASE_URL** with your actual PostgreSQL connection string
3. **Generate secure JWT secrets** (use a random string generator)
4. **Run the setup commands**:
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   npm run dev
   ```

## Database Setup

If you don't have PostgreSQL running locally, you can:

1. **Use Docker**:

   ```bash
   docker run --name postgres-lms -e POSTGRES_PASSWORD=password -e POSTGRES_DB=lms_db -p 5432:5432 -d postgres:13
   ```

2. **Use a cloud database** like Supabase, Railway, or Neon

3. **Update DATABASE_URL** accordingly

## Troubleshooting

- **Database connection errors**: Check if PostgreSQL is running and DATABASE_URL is correct
- **JWT errors**: Ensure JWT_SECRET and JWT_REFRESH_SECRET are set
- **CORS errors**: Update CORS_ORIGIN to match your frontend URL
