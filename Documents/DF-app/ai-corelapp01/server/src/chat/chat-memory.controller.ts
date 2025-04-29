import { Controller, Get, Post, Param, Query, Body, Logger } from '@nestjs/common';
import { ChatMemoryService, ChatMemoryEntry } from './chat-memory.service';

@Controller('api/chat-memory')
export class ChatMemoryController {
  private readonly logger = new Logger(ChatMemoryController.name);
  
  constructor(private readonly chatMemoryService: ChatMemoryService) {}
  
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'chat-memory-service',
      timestamp: new Date().toISOString()
    };
  }
  
  @Get('sessions')
  async getAllSessions(): Promise<{ sessions: string[]; count: number }> {
    const allConversations = this.chatMemoryService.getAllConversations();
    const sessionIds = allConversations.map(conv => conv.sessionId);
    
    return {
      sessions: sessionIds,
      count: sessionIds.length
    };
  }
  
  @Get('sessions/:sessionId')
  async getSession(@Param('sessionId') sessionId: string): Promise<ChatMemoryEntry | { error: string }> {
    const conversation = this.chatMemoryService.getConversation(sessionId);
    
    if (!conversation) {
      return { error: `Session ${sessionId} not found` };
    }
    
    return conversation;
  }
  
  @Get('search')
  async searchConversations(
    @Query('keywords') keywords: string
  ): Promise<{ results: ChatMemoryEntry[]; count: number }> {
    if (!keywords) {
      return { results: [], count: 0 };
    }
    
    const keywordArray = keywords.split(',').map(k => k.trim());
    const results = this.chatMemoryService.findRelevantConversations(keywordArray);
    
    return {
      results,
      count: results.length
    };
  }
  
  @Post('save')
  async forceSave(): Promise<{ success: boolean; timestamp: string }> {
    try {
      await this.chatMemoryService.forceSave();
      return {
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error forcing save: ${error.message}`);
      return {
        success: false,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  @Post('sessions/:sessionId/delete')
  async deleteSession(
    @Param('sessionId') sessionId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const deleted = this.chatMemoryService.removeConversation(sessionId);
      
      if (deleted) {
        await this.chatMemoryService.forceSave();
        return {
          success: true,
          message: `Session ${sessionId} successfully deleted`
        };
      } else {
        return {
          success: false,
          message: `Session ${sessionId} not found`
        };
      }
    } catch (error) {
      this.logger.error(`Error deleting session: ${error.message}`);
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }
} 