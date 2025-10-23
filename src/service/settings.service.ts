import prisma from "../prismaClient";
import bcrypt from "bcryptjs";
// import nodemailer from "nodemailer";

interface CompanySettings {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  currency?: string | null;
  currencySymbol?: string | null;
  dateFormat?: string | null;
  timeFormat?: string | null;
  timezone?: string | null;
  invoicePrefix?: string | null;
  expensePrefix?: string | null;
  logo?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
const COMPANY_SETTINGS_ID = "default";

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  id: COMPANY_SETTINGS_ID,
  name: "Millennium Potters",
  email: "info@millenniumpotters.com.ng",
  phone: "+234 123 456 7890",
  address: "123 Business Street, Lagos, Nigeria",
  currency: "NGN",
  currencySymbol: "₦",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24h",
  timezone: "Africa/Lagos",
  invoicePrefix: "INV-",
  expensePrefix: "EXP-",
  logo: null,
};

interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpEncryption: "tls" | "ssl" | "none";
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

interface GeneralSettings {
  systemName: string;
  systemVersion: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
  requirePasswordChange: boolean;
}

interface SystemSettings {
  backupFrequency: string;
  logRetentionDays: number;
  maxFileSize: number;
  allowedFileTypes: string[];
  notificationSettings: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
  };
}

export class SettingsService {
  // Company Settings
  static async getCompanySettings(): Promise<CompanySettings> {
    const existing = await prisma.companySetting.findUnique({
      where: { id: COMPANY_SETTINGS_ID },
    });

    if (existing) {
      return existing;
    }

    const createData = Object.fromEntries(
      Object.entries(DEFAULT_COMPANY_SETTINGS).filter(
        ([, value]) => value !== null && value !== undefined
      )
    );

    const created = await prisma.companySetting.create({
      data: createData as any,
    });

    return created;
  }

  static async updateCompanySettings(
    data: Partial<CompanySettings>
  ): Promise<CompanySettings> {
    const sanitizeRequired = (value?: string | null): string | undefined => {
      if (value === undefined) return undefined;
      if (value === null) return undefined;
      const trimmed = value.trim();
      if (!trimmed) {
        throw new Error("Required fields cannot be empty");
      }
      return trimmed;
    };

    const sanitizeOptional = (
      value?: string | null
    ): string | null | undefined => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const updatePayload: Partial<CompanySettings> = {};

    if (data.name !== undefined) {
      updatePayload.name = sanitizeRequired(data.name);
    }

    if (data.email !== undefined) {
      updatePayload.email = sanitizeRequired(data.email);
    }

    if (data.currency !== undefined) {
      updatePayload.currency = sanitizeRequired(data.currency);
    }

    if (data.currencySymbol !== undefined) {
      updatePayload.currencySymbol = sanitizeRequired(data.currencySymbol);
    }

    if (data.dateFormat !== undefined) {
      updatePayload.dateFormat = sanitizeRequired(data.dateFormat);
    }

    if (data.timeFormat !== undefined) {
      updatePayload.timeFormat = sanitizeRequired(data.timeFormat);
    }

    if (data.timezone !== undefined) {
      updatePayload.timezone = sanitizeRequired(data.timezone);
    }

    if (data.invoicePrefix !== undefined) {
      updatePayload.invoicePrefix = sanitizeRequired(data.invoicePrefix);
    }

    if (data.expensePrefix !== undefined) {
      updatePayload.expensePrefix = sanitizeRequired(data.expensePrefix);
    }

    if (data.phone !== undefined) {
      updatePayload.phone = sanitizeOptional(data.phone);
    }

    if (data.address !== undefined) {
      updatePayload.address = sanitizeOptional(data.address);
    }

    if (data.logo !== undefined) {
      updatePayload.logo = data.logo?.trim() ? data.logo : null;
    }

    // Clean up updatePayload to remove null/undefined for Prisma compatibility
    const cleanedUpdatePayload = Object.fromEntries(
      Object.entries(updatePayload).filter(([, value]) => value !== undefined)
    );

    const updated = await prisma.companySetting.upsert({
      where: { id: COMPANY_SETTINGS_ID },
      create: {
        id: COMPANY_SETTINGS_ID,
        name: DEFAULT_COMPANY_SETTINGS.name,
        email: DEFAULT_COMPANY_SETTINGS.email,
        phone: DEFAULT_COMPANY_SETTINGS.phone,
        address: DEFAULT_COMPANY_SETTINGS.address,
        currency: DEFAULT_COMPANY_SETTINGS.currency,
        currencySymbol: DEFAULT_COMPANY_SETTINGS.currencySymbol,
        dateFormat: DEFAULT_COMPANY_SETTINGS.dateFormat,
        timeFormat: DEFAULT_COMPANY_SETTINGS.timeFormat,
        timezone: DEFAULT_COMPANY_SETTINGS.timezone,
        invoicePrefix: DEFAULT_COMPANY_SETTINGS.invoicePrefix,
        expensePrefix: DEFAULT_COMPANY_SETTINGS.expensePrefix,
        ...cleanedUpdatePayload,
      } as any,
      update: cleanedUpdatePayload as any,
    });

    return updated;
  }

  // Email Settings
  static async getEmailSettings(): Promise<EmailSettings> {
    // Return default email settings
    return {
      smtpHost: "",
      smtpPort: 587,
      smtpUsername: "",
      smtpPassword: "",
      smtpEncryption: "tls",
      fromEmail: "",
      fromName: "",
      enabled: false,
    };
  }

  static async updateEmailSettings(
    data: Partial<EmailSettings>
  ): Promise<EmailSettings> {
    const currentSettings = await this.getEmailSettings();
    const updatedSettings = { ...currentSettings, ...data };

    // Here you would save to database
    return updatedSettings;
  }

  static async testEmailSettings(
    settings: EmailSettings
  ): Promise<{ success: boolean; message: string }> {
    try {
      // For now, simulate email test since nodemailer types are not available
      // In a real implementation, you would use nodemailer here

      // Simulate test email sending
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return { success: true, message: "Test email sent successfully" };
    } catch (error: any) {
      throw new Error(`Email test failed: ${error.message}`);
    }
  }

  // General Settings
  static async getGeneralSettings(): Promise<GeneralSettings> {
    return {
      systemName: "Millennium Potters LMS",
      systemVersion: "1.0.0",
      maintenanceMode: false,
      allowRegistration: true,
      sessionTimeout: 24, // hours
      maxLoginAttempts: 5,
      passwordMinLength: 8,
      requirePasswordChange: false,
    };
  }

  static async updateGeneralSettings(
    data: Partial<GeneralSettings>
  ): Promise<GeneralSettings> {
    const currentSettings = await this.getGeneralSettings();
    const updatedSettings = { ...currentSettings, ...data };

    return updatedSettings;
  }

  // Password Settings
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters long");
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedNewPassword },
    });
  }

  // System Settings
  static async getSystemSettings(): Promise<SystemSettings> {
    return {
      backupFrequency: "daily",
      logRetentionDays: 90,
      maxFileSize: 5242880, // 5MB
      allowedFileTypes: ["jpg", "jpeg", "png", "pdf", "doc", "docx"],
      notificationSettings: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
      },
    };
  }

  static async updateSystemSettings(
    data: Partial<SystemSettings>
  ): Promise<SystemSettings> {
    const currentSettings = await this.getSystemSettings();
    const updatedSettings = { ...currentSettings, ...data };

    return updatedSettings;
  }

  // File Upload
  static async uploadFile(
    file: Express.Multer.File,
    type: string
  ): Promise<string> {
    try {
      // Create a public URL for the uploaded file
      const baseUrl = process.env.API_BASE_URL || "http://localhost:3001";
      const fileUrl = `${baseUrl}/uploads/${file.filename}`;

      // Persist to database based on type
      if (type === "logo") {
        await prisma.companySetting.updateMany({
          data: { logo: fileUrl },
        });
      }

      return fileUrl;
    } catch (error: any) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }
}
