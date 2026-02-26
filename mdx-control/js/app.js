// MDX Control - Main Application
import { store } from './state.js';
import { router } from './router.js';

// Initialize App
async function init() {
  console.log('🚀 MDX Control initializing...');
  
  // Initialize router
  router.init();
  
  // Load initial data and connect WebSocket
  try {
    await store.init();
    console.log('✅ App initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
  }
  
  // Render initial page
  router.navigate(window.location.hash || '#/overview');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
