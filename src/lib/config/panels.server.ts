import path from 'path';

/**
 * Environment-aware panel storage configuration
 * Separates staging and production storage paths
 */

const isProd = process.env.NODE_ENV === 'production';
const isStaging = process.env.DOTENV_CONFIG_PATH?.includes('.env.staging') || 
                  process.env.DOTENV_CONFIG_PATH?.includes('staging');

export const PANELS_CONFIG = {
  // Filesystem paths (server-side)
  panelsDir: process.env.PANELS_DIR || 'static/panels',
  panelsJson: process.env.PANELS_JSON || 'static/panels.json',
  
  // URL paths (client-side asset requests)
  assetBase: process.env.STATIC_ASSET_BASE || '/panels',
  
  // Environment detection
  environment: isStaging ? 'staging' : isProd ? 'production' : 'development',
  
  // Helper functions
  getPanelPath: (relativePath: string) => {
    const base = process.env.PANELS_DIR || 'static/panels';
    return path.join(base, relativePath);
  },
  
  getPanelUrl: (relativePath: string, version?: number) => {
    const base = process.env.STATIC_ASSET_BASE || '/panels';
    const url = `${base}/${relativePath}`;
    return version ? `${url}?v=${version}` : url;
  }
};

// Logging for debugging environment detection
console.log(`[PANELS_CONFIG] Environment: ${PANELS_CONFIG.environment}`);
console.log(`[PANELS_CONFIG] Panels Dir: ${PANELS_CONFIG.panelsDir}`);
console.log(`[PANELS_CONFIG] Panels JSON: ${PANELS_CONFIG.panelsJson}`);
console.log(`[PANELS_CONFIG] Asset Base: ${PANELS_CONFIG.assetBase}`);
