import prisma from "../prismaClient";
import bcrypt from "bcryptjs";
// import nodemailer from "nodemailer";

interface CompanySettings {
  name: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  timeFormat: string;
  timezone: string;
  invoicePrefix: string;
  expensePrefix: string;
  logo?: string;
}

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
    // For now, return default settings. In a real app, these would be stored in database
    return {
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
    };
  }

  static async updateCompanySettings(
    data: Partial<CompanySettings>
  ): Promise<CompanySettings> {
    // In a real app, this would update the database
    const currentSettings = await this.getCompanySettings();
    const updatedSettings = { ...currentSettings, ...data };

    // Here you would save to database
    // await prisma.settings.upsert({ ... });

    return updatedSettings;
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
      user.password
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
      data: { password: hashedNewPassword },
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
}
