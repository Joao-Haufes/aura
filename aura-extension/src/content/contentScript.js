/**
 * Main entry point that coordinates domAnalyzer, pageReader, and overlay
 */

import { extractPageContent } from './domAnalyzer.js';
import { pageReader } from './pageReader.js';
import { overlay } from './overlay.js';
import { onContentMessage } from '../common/messaging.js';
import { MESSAGE_TYPES, READING_STATUS } from '../common/constants.js';

/**
 * Initialize the content script
 */
function init() {
  // Set up overlay with callbacks
  overlay.setCallbacks({
    onPause: () => {
      pageReader.pauseReading();
    },
    onResume: () => {
      pageReader.resumeReading();
    },
    onStop: () => {
      pageReader.stopReading();
    }
  });

  // Set up page reader status callback
  pageReader.setStatusCallback((status) => {
    overlay.updateStatus(status);
    overlay.updateButtons(status);
  });

  // Set up message listener
  onContentMessage((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // Keep channel open for async responses
  });
}

/**
 * Handle messages from background script or popup
 * @param {Object} message - Message object
 * @param {Object} sender - Message sender
 * @param {Function} sendResponse - Response callback
 */
async function handleMessage(message, sender, sendResponse) {
  try {
    switch (message.type) {
      case MESSAGE_TYPES.START_READING:
        await startReading();
        sendResponse({ success: true });
        break;

      case MESSAGE_TYPES.PAUSE_READING:
        pageReader.pauseReading();
        sendResponse({ success: true });
        break;

      case MESSAGE_TYPES.RESUME_READING:
        pageReader.resumeReading();
        sendResponse({ success: true });
        break;

      case MESSAGE_TYPES.STOP_READING:
        pageReader.stopReading();
        sendResponse({ success: true });
        break;

      case MESSAGE_TYPES.GET_STATUS:
        sendResponse({ 
          status: pageReader.getStatus(),
          isReading: pageReader.isReading(),
          isPaused: pageReader.isPaused()
        });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ error: error.message });
  }
}

/**
 * Start reading the page content
 */
async function startReading() {
  try {
    // Extract content from page
    const content = extractPageContent();

    if (!content || content.trim().length === 0) {
      throw new Error('No readable content found on this page');
    }

    // Create and show overlay if it doesn't exist
    if (!overlay.exists()) {
      overlay.create();
    }
    overlay.show();
    overlay.updateStatus(READING_STATUS.IDLE);
    overlay.updateButtons(READING_STATUS.IDLE);

    // Start reading
    await pageReader.startReading(content);
  } catch (error) {
    console.error('Error starting reading:', error);
    if (overlay.exists()) {
      overlay.updateStatus(READING_STATUS.ERROR);
      overlay.updateButtons(READING_STATUS.ERROR);
    }
    throw error;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

