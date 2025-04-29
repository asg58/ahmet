import { Injectable, Logger } from '@nestjs/common';
import { UniversalObjectModel, ObjectPath, ObjectDescriptor } from './universal-object-model';

@Injectable()
export class ObjectExplorer {
  private readonly logger = new Logger(ObjectExplorer.name);
  private cachedObjects: Map<string, ObjectDescriptor> = new Map();
  private cacheExpiryTimes: Map<string, number> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache lifetime
  
  constructor() {}
  
  /**
   * Recursively discover objects in the hierarchy
   */
  async exploreObjects(
    objectModel: UniversalObjectModel,
    startPath: ObjectPath,
    maxDepth: number = 2
  ): Promise<ObjectDescriptor[]> {
    this.logger.debug(`Exploring objects from ${startPath} with max depth ${maxDepth}`);
    
    const result: ObjectDescriptor[] = [];
    await this.exploreRecursive(objectModel, startPath, result, 0, maxDepth);
    return result;
  }
  
  private async exploreRecursive(
    objectModel: UniversalObjectModel,
    currentPath: ObjectPath,
    result: ObjectDescriptor[],
    currentDepth: number,
    maxDepth: number
  ): Promise<void> {
    // Check if the path is valid
    if (!currentPath || currentPath.trim() === '') {
      this.logger.warn('Invalid path received in exploreRecursive');
      return;
    }
    
    // Get platform for cache key
    const capabilities = await objectModel.getCapabilities();
    const platform = capabilities.platform;
    
    // Check cache first
    const cacheKey = `${platform}_${currentPath}`;
    if (this.cachedObjects.has(cacheKey)) {
      const now = Date.now();
      const expiryTime = this.cacheExpiryTimes.get(cacheKey) || 0;
      
      // Only use cache if not expired
      if (now < expiryTime) {
        const cachedDescriptor = this.cachedObjects.get(cacheKey);
        result.push(cachedDescriptor);
        
        // Stop recursion if we've reached max depth
        if (currentDepth >= maxDepth) {
          return;
        }
        
        // Explore children if available
        if (cachedDescriptor.children && cachedDescriptor.children.length > 0) {
          for (const childPath of cachedDescriptor.children) {
            await this.exploreRecursive(
              objectModel,
              childPath,
              result,
              currentDepth + 1,
              maxDepth
            );
          }
        }
        
        return;
      } else {
        // Clear expired cache entry
        this.cachedObjects.delete(cacheKey);
        this.cacheExpiryTimes.delete(cacheKey);
      }
    }
    
    // Get descriptor for current object
    try {
      const descriptor = await objectModel.getObjectDescriptor(currentPath);
      result.push(descriptor);
      
      // Store in cache with expiry time
      this.cachedObjects.set(cacheKey, descriptor);
      this.cacheExpiryTimes.set(cacheKey, Date.now() + this.CACHE_TTL_MS);
      
      // Stop recursion if we've reached max depth
      if (currentDepth >= maxDepth) {
        return;
      }
      
      // Explore children if available
      if (descriptor.children && descriptor.children.length > 0) {
        for (const childPath of descriptor.children) {
          await this.exploreRecursive(
            objectModel,
            childPath,
            result,
            currentDepth + 1,
            maxDepth
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error exploring object at ${currentPath}: ${error.message}`);
    }
  }
  
  /**
   * Find objects by path pattern or type
   */
  async findObjects(
    objectModel: UniversalObjectModel, 
    typeOrPattern: string,
    startPath?: string,
    maxResults: number = 20
  ): Promise<ObjectPath[]> {
    this.logger.debug(`Finding objects matching ${typeOrPattern}`);
    
    // Get root objects if no start path provided
    if (!startPath) {
      const rootObjects = await objectModel.getRootObjects();
      startPath = rootObjects[0];
    }
    
    const result: ObjectPath[] = [];
    await this.findRecursive(objectModel, startPath, typeOrPattern, result, maxResults);
    return result;
  }
  
  private async findRecursive(
    objectModel: UniversalObjectModel,
    currentPath: ObjectPath,
    typeOrPattern: string,
    result: ObjectPath[],
    maxResults: number,
    depth: number = 0,
    maxDepth: number = 5
  ): Promise<void> {
    // Stop if we've found enough results or reached max depth
    if (result.length >= maxResults || depth > maxDepth) {
      return;
    }
    
    try {
      // Get descriptor for current object
      const descriptor = await objectModel.getObjectDescriptor(currentPath);
      
      // Check if this object matches the search criteria
      const isTypeMatch = descriptor.type === typeOrPattern;
      const isPatternMatch = currentPath.includes(typeOrPattern);
      
      if (isTypeMatch || isPatternMatch) {
        result.push(currentPath);
        if (result.length >= maxResults) {
          return;
        }
      }
      
      // Explore children if available
      if (descriptor.children && descriptor.children.length > 0) {
        for (const childPath of descriptor.children) {
          await this.findRecursive(
            objectModel,
            childPath,
            typeOrPattern,
            result,
            maxResults,
            depth + 1,
            maxDepth
          );
          
          if (result.length >= maxResults) {
            return;
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error finding objects at ${currentPath}: ${error.message}`);
    }
  }
  
  /**
   * Resolve a relative path from a base path
   */
  resolveRelativePath(basePath: string, relativePath: string): string {
    if (relativePath.startsWith('/')) {
      // Absolute path
      return relativePath;
    }
    
    const baseSegments = basePath.split('/').filter(segment => segment.length > 0);
    const relativeSegments = relativePath.split('/');
    
    // Handle . and .. segments
    for (const segment of relativeSegments) {
      if (segment === '.') {
        // Current directory, do nothing
        continue;
      } else if (segment === '..') {
        // Parent directory, remove the last segment
        if (baseSegments.length > 0) {
          baseSegments.pop();
        } else {
          throw new Error(`Invalid relative path: ${relativePath} from base: ${basePath}`);
        }
      } else if (segment.length > 0) {
        // Regular segment, add to base
        baseSegments.push(segment);
      }
    }
    
    return '/' + baseSegments.join('/');
  }
  
  /**
   * Clear explorer cache
   */
  clearCache(): void {
    this.cachedObjects.clear();
    this.cacheExpiryTimes.clear();
    this.logger.debug('Object explorer cache cleared');
  }
  
  /**
   * Clear cache for a specific platform
   */
  clearPlatformCache(platform: 'coreldraw' | 'blender'): void {
    const keysToRemove: string[] = [];
    
    // Find all keys for the given platform
    for (const key of this.cachedObjects.keys()) {
      if (key.startsWith(`${platform}_`)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove them from the caches
    for (const key of keysToRemove) {
      this.cachedObjects.delete(key);
      this.cacheExpiryTimes.delete(key);
    }
    
    this.logger.debug(`Cleared cache for platform: ${platform}`);
  }
} 