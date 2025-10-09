import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@millenniumpotters.com" },
    update: {},
    create: {
      email: "admin@millenniumpotters.com",
      passwordHash: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("✅ Admin user created:", adminUser.email);

  // Create default branch
  const defaultBranch = await prisma.branch.upsert({
    where: { code: "BR001" },
    update: {},
    create: {
      name: "Head Office",
      code: "BR001",
      address: "123 Main Street, Lagos",
      phone: "+234-800-000-0000",
      email: "headoffice@millenniumpotters.com",
      isActive: true,
    },
  });

  console.log("✅ Default branch created:", defaultBranch.name);

  // Create a sample branch manager
  const branchManagerPassword = await bcrypt.hash("manager123", 12);
  const branchManager = await prisma.user.upsert({
    where: { email: "manager@millenniumpotters.com" },
    update: {},
    create: {
      email: "manager@millenniumpotters.com",
      passwordHash: branchManagerPassword,
      firstName: "John",
      lastName: "Manager",
      role: "BRANCH_MANAGER",
      isActive: true,
      branchId: defaultBranch.id,
    },
  });

  console.log("✅ Branch manager created:", branchManager.email);

  // Create a sample credit officer
  const creditOfficerPassword = await bcrypt.hash("officer123", 12);
  const creditOfficer = await prisma.user.upsert({
    where: { email: "officer@millenniumpotters.com" },
    update: {},
    create: {
      email: "officer@millenniumpotters.com",
      passwordHash: creditOfficerPassword,
      firstName: "Jane",
      lastName: "Officer",
      role: "CREDIT_OFFICER",
      isActive: true,
      branchId: defaultBranch.id,
    },
  });

  console.log("✅ Credit officer created:", creditOfficer.email);

  // Create default loan type
  const defaultLoanType = await prisma.loanType.upsert({
    where: { code: "LT001" },
    update: {},
    create: {
      name: "Personal Loan",
      code: "LT001",
      description: "Standard personal loan product",
      minAmount: 10000,
      maxAmount: 1000000,
      termUnit: "MONTH",
      minTerm: 1,
      maxTerm: 24,
      isActive: true,
    },
  });

  console.log("✅ Default loan type created:", defaultLoanType.name);

  // Create default document types
  const documentTypes = [
    {
      name: "National ID",
      code: "NID",
      description: "National Identification Document",
    },
    { name: "Driver License", code: "DL", description: "Driver License" },
    {
      name: "Passport",
      code: "PASSPORT",
      description: "International Passport",
    },
    {
      name: "Utility Bill",
      code: "UTILITY",
      description: "Utility Bill (Electricity, Water, etc.)",
    },
    {
      name: "Bank Statement",
      code: "BANK_STMT",
      description: "Bank Statement",
    },
    {
      name: "Employment Letter",
      code: "EMPLOYMENT",
      description: "Employment Verification Letter",
    },
    {
      name: "Salary Slip",
      code: "SALARY",
      description: "Salary Slip/Pay Slip",
    },
  ];

  for (const docType of documentTypes) {
    await prisma.documentType.upsert({
      where: { code: docType.code },
      update: {},
      create: {
        name: docType.name,
        code: docType.code,
        description: docType.description,
        isActive: true,
      },
    });
  }

  console.log("✅ Document types created");

  console.log("🎉 Database seeding completed successfully!");
  console.log("\n🔑 Default credentials:");
  console.log("   Admin: admin@millenniumpotters.com / admin123");
  console.log("   Manager: manager@millenniumpotters.com / manager123");
  console.log("   Officer: officer@millenniumpotters.com / officer123");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
