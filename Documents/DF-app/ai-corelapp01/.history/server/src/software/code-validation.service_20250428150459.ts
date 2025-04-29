import { Injectable, Logger } from '@nestjs/common';
import { OllamaService, ChatMessage, TaskType } from '../ollama/ollama.service';
import { ChromaService } from '../chroma/chroma.service';

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
  improvedCode?: string;
}

export enum CodeIssueType {
  SYNTAX_ERROR = 'syntax_error',
  LOGICAL_ERROR = 'logical_error',
  PERFORMANCE_ISSUE = 'performance_issue',
  BEST_PRACTICE = 'best_practice',
  SECURITY_ISSUE = 'security_issue',
  API_USAGE = 'api_usage'
}

export interface CodeIssue {
  type: CodeIssueType;
  message: string;
  lineNumber?: number;
  suggestion?: string;
}

@Injectable()
export class CodeValidationService {
  private readonly logger = new Logger(CodeValidationService.name);
  private readonly VALIDATION_MODEL = 'mistral-small:24b';
  
  constructor(
    private readonly ollamaService: OllamaService,
    private readonly chromaService: ChromaService
  ) {}
  
  /**
   * Validate generated code using DeepSeek Coder
   */
  async validateCode(
    code: string,
    platform: 'coreldraw' | 'blender',
    action: string
  ): Promise<ValidationResult> {
    this.logger.log(`Validating code for ${action} on ${platform}`);
    
    try {
      // Create prompt for code validation
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are an expert code validator for ${platform === 'coreldraw' ? 'CorelDRAW VBA/COM' : 'Blender Python'} code.
Your task is to analyze the code for potential issues, bugs, or improvements.
Focus on syntax errors, logical errors, API usage issues, performance concerns, and best practices.

Provide your analysis in the following JSON format:
{
  "isValid": boolean,
  "issues": [
    {
      "type": "syntax_error|logical_error|performance_issue|best_practice|security_issue|api_usage",
      "message": "Clear description of the issue",
      "lineNumber": number,
      "suggestion": "Suggested fix or improvement"
    }
  ],
  "summary": "Brief summary of all issues found",
  "improvedCode": "Full corrected version of the code (only if fixes are needed)"
}`
        },
        {
          role: 'user',
          content: `Please validate the following ${platform === 'coreldraw' ? 'CorelDRAW VBA/COM' : 'Blender Python'} code that should implement the "${action}" action:

\`\`\`
${code}
\`\`\``
        }
      ];
      
      // Add relevant API documentation for context
      const apiDocsResponse = await this.chromaService.queryApiDocumentation(action, platform, 3);
      
      // Check if we have document results
      if (apiDocsResponse.documents && apiDocsResponse.documents.length > 0 && apiDocsResponse.documents[0].length > 0) {
        messages.splice(1, 0, {
          role: 'system',
          content: `Relevant API documentation:\n${apiDocsResponse.documents[0].join('\n\n')}`
        });
      }
      
      // Use Mistral Small 3.1 model for validation
      const response = await this.ollamaService.chatCompletionForTask(
        messages,
        TaskType.CODE_GENERATION,
        { temperature: 0.2 }
      );
      
      // Extract JSON result
      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          
          return {
            isValid: result.isValid,
            issues: result.issues.map(issue => issue.message),
            suggestions: result.issues.map(issue => issue.suggestion).filter(Boolean),
            improvedCode: result.improvedCode
          };
        } catch (parseError) {
          this.logger.error(`Error parsing validation result: ${parseError.message}`);
        }
      }
      
      // Fallback for non-JSON responses
      return {
        isValid: content.toLowerCase().includes('valid') && !content.toLowerCase().includes('not valid'),
        issues: [],
        suggestions: []
      };
      
    } catch (error) {
      this.logger.error(`Code validation error: ${error.message}`);
      return {
        isValid: false,
        issues: [`Validation failed: ${error.message}`],
        suggestions: []
      };
    }
  }
  
  /**
   * Perform cross-platform validation
   * Validates if code for one platform follows patterns that would work on the other platform
   */
  async validateCrossPlatform(
    code: string,
    sourcePlatform: 'coreldraw' | 'blender'
  ): Promise<ValidationResult> {
    this.logger.log(`Performing cross-platform validation from ${sourcePlatform}`);
    
    const targetPlatform = sourcePlatform === 'coreldraw' ? 'blender' : 'coreldraw';
    
    try {
      // Query for common design concepts across platforms
      const designConceptsResponse = await this.chromaService.queryApiDocumentation(
        'cross platform design concepts',
        undefined,
        3
      );
      
      // Create prompt for cross-platform validation
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are an expert in both CorelDRAW and Blender design software.
Your task is to analyze ${sourcePlatform} code and validate if the design concepts can be implemented 
in ${targetPlatform} as well. Focus on:

1. If the core design concept can be translated between platforms
2. Any platform-specific assumptions that might not transfer well
3. Equivalent functionality in the target platform

Provide your analysis in the following JSON format:
{
  "isCrossPlatformCompatible": boolean,
  "conceptCompatibility": number (0.0-1.0),
  "issues": [
    {
      "type": "platform_specific|concept_mismatch|parameter_mismatch",
      "message": "Clear description of the issue",
      "suggestion": "Suggested approach for the target platform"
    }
  ],
  "targetPlatformApproach": "Brief description of how this would be implemented in the target platform"
}`
        }
      ];
      
      // Add design concepts for context
      if (designConceptsResponse.documents && designConceptsResponse.documents.length > 0 && designConceptsResponse.documents[0].length > 0) {
        messages.push({
          role: 'system',
          content: `Cross-platform design concepts:\n${designConceptsResponse.documents[0].join('\n\n')}`
        });
      }
      
      // Add the code to analyze
      messages.push({
        role: 'user',
        content: `Please analyze this ${sourcePlatform} code for cross-platform compatibility with ${targetPlatform}:

\`\`\`
${code}
\`\`\``
      });
      
      // Use the validation model
      const response = await this.ollamaService.chatCompletionForTask(
        messages,
        TaskType.CODE_GENERATION,
        { temperature: 0.3 }
      );
      
      // Extract result
      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          
          return {
            isValid: result.isCrossPlatformCompatible,
            issues: result.issues.map(issue => issue.message),
            suggestions: result.issues.map(issue => issue.suggestion).filter(Boolean)
          };
        } catch (parseError) {
          this.logger.error(`Error parsing cross-platform validation result: ${parseError.message}`);
        }
      }
      
      // Fallback
      return {
        isValid: content.toLowerCase().includes('compatible') && !content.toLowerCase().includes('not compatible'),
        issues: [],
        suggestions: []
      };
      
    } catch (error) {
      this.logger.error(`Cross-platform validation error: ${error.message}`);
      return {
        isValid: false,
        issues: [`Cross-platform validation failed: ${error.message}`],
        suggestions: []
      };
    }
  }
  
  /**
   * Progressive code construction with feedback loops
   * Iteratively improves code based on validation feedback
   */
  async buildCodeProgressively(
    initialCode: string,
    platform: 'coreldraw' | 'blender',
    action: string,
    maxIterations: number = 3
  ): Promise<{code: string, iterations: number, finalValidation: ValidationResult}> {
    this.logger.log(`Building code progressively for ${action} on ${platform}`);
    
    let currentCode = initialCode;
    let iterations = 0;
    let validationResult: ValidationResult;
    
    while (iterations < maxIterations) {
      // Validate current code
      validationResult = await this.validateCode(currentCode, platform, action);
      iterations++;
      
      // If code is valid or we've reached max iterations, break
      if (validationResult.isValid || iterations >= maxIterations) {
        break;
      }
      
      // If we have improved code from validation, use it
      if (validationResult.improvedCode) {
        currentCode = validationResult.improvedCode;
        continue;
      }
      
      // Otherwise, use CodeQwen to improve the code based on validation feedback
      const improvedCode = await this.improveCodeWithFeedback(
        currentCode,
        platform,
        action,
        validationResult.issues,
        validationResult.suggestions
      );
      
      // If improvement failed, break
      if (!improvedCode) {
        break;
      }
      
      currentCode = improvedCode;
    }
    
    // Perform final validation if not done in the last iteration
    if (iterations < maxIterations) {
      validationResult = await this.validateCode(currentCode, platform, action);
    }
    
    return {
      code: currentCode,
      iterations,
      finalValidation: validationResult
    };
  }
  
  /**
   * Improve code using CodeQwen based on validation feedback
   */
  private async improveCodeWithFeedback(
    code: string,
    platform: 'coreldraw' | 'blender',
    action: string,
    issues: string[],
    suggestions: string[]
  ): Promise<string | null> {
    try {
      // Create prompt for code improvement
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are an expert ${platform === 'coreldraw' ? 'CorelDRAW VBA/COM' : 'Blender Python'} developer.
Your task is to improve code based on validation feedback. The code should implement the "${action}" action.
Focus on addressing the specific issues and incorporating the suggestions provided.
Return ONLY the improved code without any explanation or markdown formatting.`
        },
        {
          role: 'user',
          content: `Please improve this code:

\`\`\`
${code}
\`\`\`

The validation identified these issues:
${issues.map(issue => `- ${issue}`).join('\n')}

Suggested improvements:
${suggestions.map(suggestion => `- ${suggestion}`).join('\n')}`
        }
      ];
      
      // Use CodeQwen for code improvement
      const response = await this.ollamaService.chatCompletionForTask(
        messages,
        TaskType.CODE_GENERATION,
        { temperature: 0.2 }
      );
      
      // Extract the code
      const content = response.choices[0].message.content;
      
      // Try to find code blocks
      const codeBlockMatch = content.match(/```(?:[a-z]+)?\n([\s\S]*?)```/);
      if (codeBlockMatch) {
        return codeBlockMatch[1].trim();
      }
      
      // Otherwise, assume the entire response is code
      return content.trim();
      
    } catch (error) {
      this.logger.error(`Code improvement error: ${error.message}`);
      return null;
    }
  }
}