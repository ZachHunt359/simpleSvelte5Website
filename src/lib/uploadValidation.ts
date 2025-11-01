/**
 * File validation and conflict detection utilities for webcomic panel uploads
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fileType?: 'image' | 'video' | 'other';
  chapter?: string;
  panelNumber?: number;
  deviceType?: 'desktop' | 'mobile';
}

export interface ConflictAnalysis {
  duplicates: string[];
  missing: string[];
  errors: string[];
  warnings: string[];
  mismatched: Array<{
    file: string;
    issue: string;
  }>;
}

// Allowed file types and size limits
const ALLOWED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const ALLOWED_VIDEO_TYPES = ['mp4', 'webm', 'mov'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images

/**
 * Validate a single file for webcomic panel upload
 */
export function validateFile(file: File): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const fileName = file.name.toLowerCase();
  const fileExt = fileName.split('.').pop() || '';
  const filePath = file.webkitRelativePath || file.name;
  
  // File type validation
  let fileType: 'image' | 'video' | 'other' = 'other';
  if (ALLOWED_IMAGE_TYPES.includes(fileExt)) {
    fileType = 'image';
  } else if (ALLOWED_VIDEO_TYPES.includes(fileExt)) {
    fileType = 'video';
  } else {
    errors.push(`Unsupported file type: ${fileExt.toUpperCase()}`);
  }
  
  // File size validation
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File too large: ${formatFileSize(file.size)} (max ${formatFileSize(MAX_FILE_SIZE)})`);
  } else if (fileType === 'image' && file.size > MAX_IMAGE_SIZE) {
    warnings.push(`Large image file: ${formatFileSize(file.size)} (recommended max ${formatFileSize(MAX_IMAGE_SIZE)})`);
  }
  
  // Path structure validation
  const pathResult = validatePath(filePath);
  if (!pathResult.valid) {
    errors.push(...pathResult.errors);
    warnings.push(...pathResult.warnings);
  }
  
  // File naming convention validation
  const namingResult = validateNaming(fileName);
  if (!namingResult.valid) {
    errors.push(...namingResult.errors);
    warnings.push(...namingResult.warnings);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fileType,
    chapter: pathResult.chapter,
    panelNumber: pathResult.panelNumber,
    deviceType: pathResult.deviceType
  };
}

/**
 * Validate file path structure (should be chapter-X/device/filename)
 */
function validatePath(filePath: string): ValidationResult & { chapter?: string; panelNumber?: number; deviceType?: 'desktop' | 'mobile' } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');
  const pathParts = normalizedPath.split('/');
  
  let chapter: string | undefined;
  let deviceType: 'desktop' | 'mobile' | undefined;
  let panelNumber: number | undefined;
  
  // Check for chapter folder
  const chapterMatch = pathParts.find(part => /^chapter-\d+$/i.test(part));
  if (!chapterMatch) {
    errors.push('File must be in a chapter-X folder');
  } else {
    chapter = chapterMatch;
  }
  
  // Check for device type folder
  const hasDesktop = pathParts.some(part => part.toLowerCase() === 'desktop');
  const hasMobile = pathParts.some(part => part.toLowerCase() === 'mobile');

  // Exception: allow chapter-X.thumb.jpg directly in chapter folder
  const fileName = pathParts[pathParts.length - 1];
  const isChapterThumb = /^chapter-\d+\.thumb\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  if (!hasDesktop && !hasMobile) {
    if (!isChapterThumb) {
      errors.push('File must be in a desktop or mobile subfolder');
    }
  } else if (hasDesktop && hasMobile) {
    errors.push('File cannot be in both desktop and mobile folders');
  } else {
    deviceType = hasDesktop ? 'desktop' : 'mobile';
  }
  
  // Extract panel number from filename
  const panelMatch = fileName.match(/(\d+)/);
  if (panelMatch) {
    panelNumber = parseInt(panelMatch[1], 10);
  }
  
  // Check minimum folder depth
  if (pathParts.length < 3) {
    warnings.push('Consider organizing files in chapter/device subfolders');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    chapter,
    panelNumber,
    deviceType
  };
}

/**
 * Validate file naming conventions
 */
function validateNaming(fileName: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for spaces in filename
  if (fileName.includes(' ')) {
    warnings.push('Filename contains spaces (consider using hyphens or underscores)');
  }
  
  // Check for special characters that might cause issues
  const problematicChars = /[<>:"|?*]/;
  if (problematicChars.test(fileName)) {
    errors.push('Filename contains invalid characters: < > : " | ? *');
  }
  
  // Check for very long filenames
  if (fileName.length > 100) {
    warnings.push('Very long filename (may cause issues on some systems)');
  }
  
  // Check for numeric panel naming
  const hasNumber = /\d+/.test(fileName);
  if (!hasNumber) {
    warnings.push('Consider including panel numbers in filename for better organization');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Analyze conflicts and missing files across all selected files
 */
export async function analyzeConflicts(files: File[], existingPanels: string[] = []): Promise<ConflictAnalysis> {
  const duplicates: string[] = [];
  const missing: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const mismatched: Array<{ file: string; issue: string }> = [];
  
  // Group files by chapter and panel number
  const filesByChapter: Record<string, Array<{ file: File; validation: ValidationResult }>> = {};
  
  for (const file of files) {
    const validation = validateFile(file);
    
    if (validation.chapter) {
      if (!filesByChapter[validation.chapter]) {
        filesByChapter[validation.chapter] = [];
      }
      filesByChapter[validation.chapter].push({ file, validation });
    }
    
    // Check for duplicates against existing panels
    const relativePath = file.webkitRelativePath || file.name;
    if (existingPanels.some(existing => existing.includes(relativePath))) {
      duplicates.push(relativePath);
    }
    
    // Collect validation errors
    if (!validation.valid) {
      errors.push(...validation.errors.map(error => `${file.name}: ${error}`));
    }
    
    if (validation.warnings.length > 0) {
      warnings.push(...validation.warnings.map(warning => `${file.name}: ${warning}`));
    }
  }
  
  // Check for missing desktop/mobile pairs
  for (const [chapter, chapterFiles] of Object.entries(filesByChapter)) {
    const panelsByNumber: Record<number, { desktop?: File; mobile?: File }> = {};
    
    // Group by panel number
    for (const { file, validation } of chapterFiles) {
      if (validation.panelNumber && validation.deviceType) {
        if (!panelsByNumber[validation.panelNumber]) {
          panelsByNumber[validation.panelNumber] = {};
        }
        panelsByNumber[validation.panelNumber][validation.deviceType] = file;
      }
    }
    
    // Check for missing pairs
    for (const [panelNum, panel] of Object.entries(panelsByNumber)) {
      if (panel.desktop && !panel.mobile) {
        missing.push(`${chapter}/mobile version of panel ${panelNum}`);
      } else if (panel.mobile && !panel.desktop) {
        missing.push(`${chapter}/desktop version of panel ${panelNum}`);
      }
    }
  }
  
  // Check for file naming mismatches within chapters
  for (const [chapter, chapterFiles] of Object.entries(filesByChapter)) {
    const desktopFiles = chapterFiles.filter(f => f.validation.deviceType === 'desktop');
    const mobileFiles = chapterFiles.filter(f => f.validation.deviceType === 'mobile');
    
    // Check if desktop and mobile file counts match
    if (desktopFiles.length !== mobileFiles.length) {
      mismatched.push({
        file: chapter,
        issue: `Desktop files: ${desktopFiles.length}, Mobile files: ${mobileFiles.length}`
      });
    }
  }
  
  return {
    duplicates,
    missing,
    errors,
    warnings,
    mismatched
  };
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get existing panels from the server (to check for duplicates)
 */
export async function getExistingPanels(): Promise<string[]> {
  try {
    const response = await fetch('/api/panels');
    if (response.ok) {
      const data = await response.json();
      return data.panels || [];
    }
  } catch (error) {
    console.warn('Could not fetch existing panels:', error);
  }
  return [];
}

/**
 * Pre-process files to filter out invalid ones and prepare for upload
 */
export function preprocessFiles(files: File[]): {
  validFiles: File[];
  invalidFiles: Array<{ file: File; validation: ValidationResult }>;
  totalValidSize: number;
} {
  const validFiles: File[] = [];
  const invalidFiles: Array<{ file: File; validation: ValidationResult }> = [];
  let totalValidSize = 0;
  
  for (const file of files) {
    const validation = validateFile(file);
    
    if (validation.valid) {
      validFiles.push(file);
      totalValidSize += file.size;
    } else {
      invalidFiles.push({ file, validation });
    }
  }
  
  return {
    validFiles,
    invalidFiles,
    totalValidSize
  };
}