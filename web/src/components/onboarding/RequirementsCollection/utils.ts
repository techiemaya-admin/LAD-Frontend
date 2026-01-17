/**
 * Requirements Collection - Utility Functions
 */

import { logger } from '@/lib/logger';
import { FIELD_MAPPINGS, RequirementField } from './types';

/**
 * Parse document to extract all requirements
 */
export async function parseDocument(file: File): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const fileName = file.name.toLowerCase();
        let parsedData: Record<string, any> = {};

        // Try JSON format first
        if (fileName.endsWith('.json')) {
          try {
            parsedData = JSON.parse(content);
          } catch (err) {
            throw new Error('Invalid JSON format. Please check your JSON structure.');
          }
        }
        // Try CSV format
        else if (fileName.endsWith('.csv')) {
          const lines = content.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
          
          if (lines.length < 2) {
            throw new Error('CSV file must have at least a header row and one data row.');
          }
          
          const values = lines[1].split(',').map(v => v.trim());
          headers.forEach((header, index) => {
            // Map CSV headers to requirement field names
            const fieldName = Object.keys(FIELD_MAPPINGS).find(
              key => key.toLowerCase() === header || 
                     FIELD_MAPPINGS[key].label.toLowerCase().replace(/\s+/g, '_') === header
            ) || header;
            parsedData[fieldName] = values[index] || '';
          });
        }
        // Try structured text format
        else if (fileName.endsWith('.txt') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
          // Parse structured text with section headers
          const lines = content.split('\n');
          let currentSection = '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            // Check if line is a section header (e.g., "LinkedIn URL or Keywords:", "Connection Message:")
            const sectionMatch = trimmedLine.match(/^([^:]+):\s*(.*)$/);
            if (sectionMatch) {
              const sectionName = sectionMatch[1].trim().toLowerCase();
              const sectionValue = sectionMatch[2].trim();
              
              // Map section name to field name
              const fieldName = Object.keys(FIELD_MAPPINGS).find(
                key => FIELD_MAPPINGS[key].label.toLowerCase() === sectionName ||
                       key.toLowerCase().replace(/_/g, ' ') === sectionName
              );
              
              if (fieldName && sectionValue) {
                parsedData[fieldName] = sectionValue;
                currentSection = fieldName;
              } else if (sectionValue) {
                // Store as current section value
                if (currentSection) {
                  parsedData[currentSection] = (parsedData[currentSection] || '') + '\n' + sectionValue;
                }
              }
            } else if (currentSection) {
              // Continuation of previous section (multi-line text)
              parsedData[currentSection] = (parsedData[currentSection] || '') + '\n' + trimmedLine;
            }
          }
        }
        // Try Excel format (basic support - would need a library for full support)
        else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          throw new Error('Excel files are not fully supported yet. Please use JSON, CSV, or TXT format.');
        }
        else {
          // Try to parse as JSON anyway
          try {
            parsedData = JSON.parse(content);
          } catch {
            // Try structured text format
            const lines = content.split('\n');
            let currentSection = '';
            
            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine) continue;
              
              const sectionMatch = trimmedLine.match(/^([^:]+):\s*(.*)$/);
              if (sectionMatch) {
                const sectionName = sectionMatch[1].trim().toLowerCase();
                const sectionValue = sectionMatch[2].trim();
                
                const fieldName = Object.keys(FIELD_MAPPINGS).find(
                  key => FIELD_MAPPINGS[key].label.toLowerCase() === sectionName ||
                         key.toLowerCase().replace(/_/g, ' ') === sectionName
                );
                
                if (fieldName && sectionValue) {
                  parsedData[fieldName] = sectionValue;
                  currentSection = fieldName;
                }
              } else if (currentSection) {
                parsedData[currentSection] = (parsedData[currentSection] || '') + '\n' + trimmedLine;
              }
            }
          }
        }

        // Validate that we extracted at least some data
        if (Object.keys(parsedData).length === 0) {
          throw new Error('Could not extract any data from the document. Please check the format.');
        }

        resolve(parsedData);
      } catch (error: any) {
        logger.error('Error parsing document', error);
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      reader.readAsText(file);
    }
  });
}

/**
 * Generate example document structure
 */
export function generateExampleStructure(requirementFields: RequirementField[]): string {
  const example: Record<string, any> = {};
  requirementFields.forEach((req) => {
    if (req.type === 'textarea') {
      example[req.field] = `Example ${req.label.toLowerCase()}...`;
    } else {
      example[req.field] = `Example ${req.label.toLowerCase()}`;
    }
  });
  return JSON.stringify(example, null, 2);
}

/**
 * Download example structure as file
 */
export function downloadExampleStructure(example: string): void {
  const blob = new Blob([example], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'workflow-requirements-example.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

