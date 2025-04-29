import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execPromise = promisify(exec);

/**
 * DockerService
 * 
 * Service for managing Docker containers for different design platforms.
 */
@Injectable()
export class DockerService {
  private readonly logger = new Logger(DockerService.name);
  
  // Docker image configuration
  private readonly images = {
    coreldraw: 'corelai/corelai-vsta-server:latest',
    blender: 'corelai/blender-headless:latest'
  };
  
  // Port configuration
  private readonly basePorts = {
    coreldraw: 8080,
    blender: 9090
  };
  
  /**
   * Start a new container for a specific platform
   */
  async startContainer(platform: 'coreldraw' | 'blender'): Promise<string> {
    // Generate a unique name for the container
    const containerName = `${platform}-${Date.now()}`;
    
    try {
      // Check if image exists, pull if it doesn't
      await this.ensureImageExists(platform);
      
      // Find an available port
      const port = await this.findAvailablePort(platform);
      
      // Start the container
      const { stdout } = await execPromise(
        `docker run -d --name ${containerName} -p ${port}:${this.getDefaultPort(platform)} ${this.getImage(platform)}`
      );
      
      const containerId = stdout.trim();
      this.logger.log(`Started ${platform} container ${containerId} on port ${port}`);
      
      // Wait for container to be ready
      await this.waitForContainerReady(containerId, platform, port);
      
      return containerId;
    } catch (error) {
      this.logger.error(`Failed to start ${platform} container: ${error.message}`);
      throw new Error(`Failed to start container: ${error.message}`);
    }
  }
  
  /**
   * Stop and remove a container
   */
  async stopContainer(containerId: string): Promise<void> {
    try {
      await execPromise(`docker stop ${containerId}`);
      await execPromise(`docker rm ${containerId}`);
      this.logger.log(`Stopped and removed container ${containerId}`);
    } catch (error) {
      this.logger.error(`Failed to stop container ${containerId}: ${error.message}`);
      throw new Error(`Failed to stop container: ${error.message}`);
    }
  }
  
  /**
   * Get the endpoint URL for a container
   */
  async getContainerEndpoint(containerId: string): Promise<string> {
    try {
      // Get the port mapping for the container
      const { stdout } = await execPromise(
        `docker port ${containerId}`
      );
      
      // Parse the port mapping
      const portMapping = stdout.trim();
      const match = portMapping.match(/\d+\.\d+\.\d+\.\d+:(\d+)/);
      
      if (!match) {
        throw new Error(`Could not determine port for container ${containerId}`);
      }
      
      const port = match[1];
      return `http://localhost:${port}`;
    } catch (error) {
      this.logger.error(`Failed to get endpoint for container ${containerId}: ${error.message}`);
      throw new Error(`Failed to get container endpoint: ${error.message}`);
    }
  }
  
  /**
   * Execute a command in a container via its API endpoint
   */
  async executeCommand(endpoint: string, command: string, platform: 'coreldraw' | 'blender'): Promise<any> {
    try {
      // Different platforms may have different API endpoints
      const apiPath = platform === 'blender' ? '/api/execute' : '/api/command';
      
      const response = await axios.post(`${endpoint}${apiPath}`, {
        command,
        platform
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to execute command in container: ${error.message}`);
      throw new Error(`Failed to execute command: ${error.message}`);
    }
  }
  
  /**
   * Ensure a Docker image exists, pulling it if necessary
   */
  private async ensureImageExists(platform: 'coreldraw' | 'blender'): Promise<void> {
    const image = this.getImage(platform);
    
    try {
      // Check if image exists
      const { stdout } = await execPromise(`docker image ls ${image} --format "{{.Repository}}:{{.Tag}}"`);
      
      if (!stdout.trim()) {
        this.logger.log(`Pulling ${platform} image ${image}...`);
        await execPromise(`docker pull ${image}`);
        this.logger.log(`Successfully pulled ${image}`);
      }
    } catch (error) {
      this.logger.error(`Failed to check/pull image ${image}: ${error.message}`);
      throw new Error(`Failed to ensure image exists: ${error.message}`);
    }
  }
  
  /**
   * Find an available port for a new container
   */
  private async findAvailablePort(platform: 'coreldraw' | 'blender'): Promise<number> {
    const basePort = this.getBasePort(platform);
    let port = basePort;
    let maxAttempts = 10;
    
    while (maxAttempts > 0) {
      try {
        // Check if port is in use
        const { stdout } = await execPromise(
          `docker ps --format "{{.Ports}}" | grep ${port}`
        );
        
        if (!stdout.trim()) {
          return port;
        }
        
        // Port is in use, try the next one
        port++;
        maxAttempts--;
      } catch (error) {
        // grep returns non-zero exit code when no matches found, which is good for us
        return port;
      }
    }
    
    throw new Error(`Could not find available port for ${platform} container`);
  }
  
  /**
   * Wait for a container to be ready
   */
  private async waitForContainerReady(
    containerId: string, 
    platform: 'coreldraw' | 'blender',
    port: number
  ): Promise<void> {
    const endpoint = `http://localhost:${port}`;
    const healthEndpoint = `${endpoint}/health`;
    
    let attempts = 0;
    const maxAttempts = 30;
    const delay = 1000; // 1 second
    
    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(healthEndpoint, { timeout: 2000 });
        
        if (response.status === 200) {
          this.logger.log(`Container ${containerId} is ready`);
          return;
        }
      } catch (error) {
        // Server probably not ready yet, wait and retry
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      attempts++;
    }
    
    // If we get here, the container didn't become ready in time
    throw new Error(`Container ${containerId} did not become ready in time`);
  }
  
  /**
   * Get the Docker image for a platform
   */
  private getImage(platform: 'coreldraw' | 'blender'): string {
    return this.images[platform];
  }
  
  /**
   * Get the base port for a platform
   */
  private getBasePort(platform: 'coreldraw' | 'blender'): number {
    return this.basePorts[platform];
  }
  
  /**
   * Get the default internal port for a platform
   */
  private getDefaultPort(platform: 'coreldraw' | 'blender'): number {
    // These are the internal ports that the Docker containers expose
    return platform === 'coreldraw' ? 3000 : 5000;
  }
} 