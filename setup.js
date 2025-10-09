const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🚀 Setting up LMS Backend...\n");

// Check if .env file exists
const envPath = path.join(__dirname, ".env");
if (!fs.existsSync(envPath)) {
  console.log("📝 Creating .env file...");

  const envContent = `# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/lms_db"
DIRECT_URL="postgresql://username:password@localhost:5432/lms_db"

# JWT Configuration
JWT_SECRET="${generateRandomString(64)}"
JWT_REFRESH_SECRET="${generateRandomString(64)}"
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
`;

  fs.writeFileSync(envPath, envContent);
  console.log("✅ .env file created with random JWT secrets");
  console.log(
    "⚠️  Please update DATABASE_URL with your actual database connection string\n"
  );
} else {
  console.log("✅ .env file already exists\n");
}

// Install dependencies
console.log("📦 Installing dependencies...");
try {
  execSync("npm install", { stdio: "inherit" });
  console.log("✅ Dependencies installed\n");
} catch (error) {
  console.error("❌ Failed to install dependencies:", error.message);
  process.exit(1);
}

// Generate Prisma client
console.log("🔧 Generating Prisma client...");
try {
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("✅ Prisma client generated\n");
} catch (error) {
  console.error("❌ Failed to generate Prisma client:", error.message);
  process.exit(1);
}

// Push database schema
console.log("🗄️  Pushing database schema...");
try {
  execSync("npx prisma db push", { stdio: "inherit" });
  console.log("✅ Database schema pushed\n");
} catch (error) {
  console.error("❌ Failed to push database schema:", error.message);
  console.log(
    "💡 Make sure your database is running and DATABASE_URL is correct\n"
  );
}

// Seed database
console.log("🌱 Seeding database...");
try {
  execSync("npm run seed", { stdio: "inherit" });
  console.log("✅ Database seeded\n");
} catch (error) {
  console.error("❌ Failed to seed database:", error.message);
  console.log('💡 You can run "npm run seed" manually later\n');
}

console.log("🎉 Setup completed!");
console.log("\n📋 Next steps:");
console.log(
  "1. Update DATABASE_URL in .env file with your actual database connection"
);
console.log("2. Start the server: npm run dev");
console.log("3. Test the API: http://localhost:5000/health");
console.log("\n🔑 Default admin credentials:");
console.log("   Email: admin@millenniumpotters.com");
console.log("   Password: admin123");

function generateRandomString(length) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
