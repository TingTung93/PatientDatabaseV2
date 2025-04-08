import { fileUploadConfig, FileUploadConfig } from '../config/fileUploadConfig';

/**
 * Service for accessing application configuration.
 * This service centralizes configuration access, making it easier to manage
 * and update settings across the application.
 */
export class ConfigService {
  private static instance: ConfigService;
  private readonly config: FileUploadConfig;

  private constructor() {
    // In a real application, this might load config from different sources
    // based on environment (e.g., environment variables, external files).
    this.config = fileUploadConfig;
  }

  /**
   * Gets the singleton instance of the ConfigService.
   * Ensures that configuration is loaded and accessed consistently.
   * @returns {ConfigService} The singleton instance.
   */
  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Gets the file upload configuration.
   * @returns {FileUploadConfig} The file upload configuration object.
   */
  public getFileUploadConfig(): FileUploadConfig {
    return this.config;
  }

  // Add methods here to access other configuration sections as needed.
}

// Export a singleton instance for easy use
export const configService = ConfigService.getInstance();
