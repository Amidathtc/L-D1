const axios = require("axios");

async function testBackend() {
  console.log("🧪 Testing Backend Connection...\n");

  try {
    // Test health endpoint
    console.log("1. Testing health endpoint...");
    const healthResponse = await axios.get("http://localhost:5000/health");
    console.log("✅ Health check passed:", healthResponse.data);
  } catch (error) {
    console.log("❌ Health check failed:", error.message);
    console.log("💡 Make sure the backend is running: npm run dev");
    return;
  }

  try {
    // Test users endpoint (without auth for now)
    console.log("\n2. Testing users endpoint...");
    const usersResponse = await axios.get("http://localhost:5000/api/users");
    console.log("✅ Users endpoint response:", {
      status: usersResponse.status,
      dataStructure: {
        success: usersResponse.data.success,
        message: usersResponse.data.message,
        hasData: !!usersResponse.data.data,
        hasUsers: !!usersResponse.data.data?.users,
        usersCount: usersResponse.data.data?.users?.length || 0,
        total: usersResponse.data.data?.total || 0,
      },
    });

    if (usersResponse.data.data?.users?.length > 0) {
      console.log("📋 Sample users:");
      usersResponse.data.data.users.slice(0, 3).forEach((user) => {
        console.log(
          `   - ${user.email} (${user.role}) - Active: ${user.isActive}`
        );
      });
    } else {
      console.log("⚠️  No users found in database");
    }
  } catch (error) {
    console.log(
      "❌ Users endpoint failed:",
      error.response?.status,
      error.response?.data?.message || error.message
    );
  }

  try {
    // Test branches endpoint
    console.log("\n3. Testing branches endpoint...");
    const branchesResponse = await axios.get(
      "http://localhost:5000/api/branches"
    );
    console.log("✅ Branches endpoint response:", {
      status: branchesResponse.status,
      dataStructure: {
        success: branchesResponse.data.success,
        message: branchesResponse.data.message,
        hasData: !!branchesResponse.data.data,
        branchesCount: Array.isArray(branchesResponse.data.data)
          ? branchesResponse.data.data.length
          : 0,
      },
    });

    if (
      Array.isArray(branchesResponse.data.data) &&
      branchesResponse.data.data.length > 0
    ) {
      console.log("📋 Sample branches:");
      branchesResponse.data.data.slice(0, 3).forEach((branch) => {
        console.log(
          `   - ${branch.name} (${branch.code}) - Manager: ${
            branch.managerId || "None"
          }`
        );
      });
    } else {
      console.log("⚠️  No branches found in database");
    }
  } catch (error) {
    console.log(
      "❌ Branches endpoint failed:",
      error.response?.status,
      error.response?.data?.message || error.message
    );
  }

  console.log("\n🎯 Summary:");
  console.log("If users endpoint shows 0 users, run: npm run seed");
  console.log("If backend is not running, start it with: npm run dev");
  console.log("If database connection fails, check your .env DATABASE_URL");
}

testBackend().catch(console.error);
