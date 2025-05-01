import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execPromise = promisify(exec);

interface DockerContainer {
  id: string;
  name: string;
  platform: 'coreldraw' | 'blender';
  createdAt: Date;
  lastUsed: Date;
  port: number;
}

/**
 * DockerService
 * 
 * Service for managing Docker containers for different design platforms.
 * Includes automatic cleanup of idle containers and resource management.
 */
@Injectable()
export class DockerService implements OnModuleInit, OnModuleDestroy {
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

  // Container tracking
  private activeContainers: Map<string, DockerContainer> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly maxIdleTime = 30 * 60 * 1000; // 30 minutes
  
  async onModuleInit() {
    // Start cleanup interval
    this.startCleanupInterval();
    
    // Clean up any orphaned containers from previous runs
    await this.cleanupOrphanedContainers();
  }
  
  async onModuleDestroy() {
    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Clean up all active containers
    await this.cleanupAllContainers();
  }
  
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
      
      // Track the container
      this.activeContainers.set(containerId, {
        id: containerId,
        name: containerName,
        platform,
        createdAt: new Date(),
        lastUsed: new Date(),
        port
      });
      
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
      
      // Remove from tracking
      this.activeContainers.delete(containerId);
    } catch (error) {
      this.logger.error(`Failed to stop container ${containerId}: ${error.message}`);
      
      // Still remove from tracking to avoid memory leaks
      this.activeContainers.delete(containerId);
      
      throw new Error(`Failed to stop container: ${error.message}`);
    }
  }
  
  /**
   * Mark a container as used recently
   */
  updateContainerUsage(containerId: string): void {
    const container = this.activeContainers.get(containerId);
    if (container) {
      container.lastUsed = new Date();
      this.activeContainers.set(containerId, container);
    }
  }
  
  /**
   * Get the endpoint URL for a container
   */
  async getContainerEndpoint(containerId: string): Promise<string> {
    try {
      const container = this.activeContainers.get(containerId);
      if (container) {
        // Update last used time
        this.updateContainerUsage(containerId);
        return `http://localhost:${container.port}`;
      }
      
      // If not in our tracking, try to get port from Docker
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
      
      // Try to find container by endpoint and mark as used
      for (const [id, container] of this.activeContainers.entries()) {
        if (endpoint.includes(`:${container.port}`)) {
          this.updateContainerUsage(id);
          break;
        }
      }
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to execute command in container: ${error.message}`);
      throw new Error(`Failed to execute command: ${error.message}`);
    }
  }
  
  /**
   * Get statistics about active containers
   */
  getContainerStats(): { totalContainers: number, byPlatform: { blender: number, coreldraw: number } } {
    let blenderCount = 0;
    let corelDrawCount = 0;
    
    for (const container of this.activeContainers.values()) {
      if (container.platform === 'blender') {
        blenderCount++;
      } else if (container.platform === 'coreldraw') {
        corelDrawCount++;
      }
    }
    
    return {
      totalContainers: this.activeContainers.size,
      byPlatform: {
        blender: blenderCount,
        coreldraw: corelDrawCount
      }
    };
  }
  
  /**
   * Start the cleanup interval for idle containers
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => this.cleanupIdleContainers(), 5 * 60 * 1000); // Check every 5 minutes
    this.logger.log('Container cleanup interval started');
  }
  
  /**
   * Clean up containers that haven't been used for a while
   */
  private async cleanupIdleContainers(): Promise<void> {
    const now = new Date();
    const containersToRemove: string[] = [];
    
    // Find idle containers
    for (const [id, container] of this.activeContainers.entries()) {
      const idleTime = now.getTime() - container.lastUsed.getTime();
      if (idleTime > this.maxIdleTime) {
        containersToRemove.push(id);
      }
    }
    
    // Remove idle containers
    if (containersToRemove.length > 0) {
      this.logger.log(`Cleaning up ${containersToRemove.length} idle containers`);
      
      for (const id of containersToRemove) {
        try {
          await this.stopContainer(id);
        } catch (error) {
          this.logger.error(`Failed to clean up container ${id}: ${error.message}`);
        }
      }
    }
  }
  
  /**
   * Clean up orphaned containers from previous runs
   */
  private async cleanupOrphanedContainers(): Promise<void> {
    try {
      // Find containers with our naming pattern
      const { stdout } = await execPromise(
        `docker ps -a --filter "name=blender-|coreldraw-" --format "{{.ID}}"`
      );
      
      if (!stdout.trim()) {
        return; // No orphaned containers
      }
      
      const containerIds = stdout.trim().split('\n');
      this.logger.log(`Found ${containerIds.length} orphaned containers to clean up`);
      
      for (const id of containerIds) {
        try {
          await execPromise(`docker stop ${id} && docker rm ${id}`);
          this.logger.log(`Cleaned up orphaned container ${id}`);
        } catch (error) {
          this.logger.error(`Failed to clean up orphaned container ${id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error during orphaned container cleanup: ${error.message}`);
    }
  }
  
  /**
   * Clean up all active containers
   */
  private async cleanupAllContainers(): Promise<void> {
    this.logger.log(`Cleaning up all ${this.activeContainers.size} active containers`);
    
    const containerIds = Array.from(this.activeContainers.keys());
    for (const id of containerIds) {
      try {
        await this.stopContainer(id);
      } catch (error) {
        this.logger.error(`Failed to clean up container ${id}: ${error.message}`);
      }
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
    
    this.logger.log(`Waiting for container ${containerId} to be ready at ${healthEndpoint}...`);
    
    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(healthEndpoint, { timeout: 2000 });
        
        if (response.status === 200) {
          this.logger.log(`Container ${containerId} is ready after ${attempts + 1} attempts`);
          return;
        }
        
        this.logger.debug(`Container health check returned status ${response.status}`);
      } catch (error) {
        // Log meaningful messages based on error type
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNREFUSED') {
            this.logger.debug(`Container not yet accepting connections (attempt ${attempts + 1}/${maxAttempts})`);
          } else if (error.response) {
            this.logger.debug(`Container returned error status ${error.response.status} (attempt ${attempts + 1}/${maxAttempts})`);
          } else {
            this.logger.debug(`Network error connecting to container (attempt ${attempts + 1}/${maxAttempts}): ${error.message}`);
          }
        } else {
          this.logger.debug(`Unknown error in container health check (attempt ${attempts + 1}/${maxAttempts}): ${error.message}`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      attempts++;
    }
    
    // Als container niet gereed is binnen de tijd, stop deze om resources te besparen
    this.logger.error(`Container ${containerId} did not become ready after ${maxAttempts} attempts. Stopping container...`);
    
    try {
      await this.stopContainer(containerId);
    } catch (stopError) {
      this.logger.error(`Failed to stop unresponsive container: ${stopError.message}`);
    }
    
    throw new Error(`Container ${containerId} for ${platform} did not become ready in time (${maxAttempts * delay / 1000} seconds)`);
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