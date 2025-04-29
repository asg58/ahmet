/**
 * Interface for application services like CorelDRAW
 */
export interface Application {
  /**
   * Connect to the application
   * @returns Promise that resolves to true if connection is successful, false otherwise
   */
  connect(): Promise<boolean>;
  
  /**
   * Check if the application is available and connected
   * @returns boolean indicating if the application is available
   */
  isAvailable(): boolean;
  
  /**
   * Get the version of the application
   * @returns string version information
   */
  getVersion(): string;
  
  /**
   * Create a new document in the application
   * @param width Width of the document
   * @param height Height of the document
   * @param units Units for the dimensions (e.g., 'mm', 'cm', 'inch')
   * @returns Promise that resolves to true if document creation is successful
   */
  createNewDocument(width?: number, height?: number, units?: string): Promise<boolean>;
} 