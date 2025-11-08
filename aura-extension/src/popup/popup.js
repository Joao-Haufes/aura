/**
 * Popup initialization and controls
 */

import { sendMessage } from '../common/messaging.js';
import { MESSAGE_TYPES, READING_STATUS } from '../common/constants.js';

let currentStatus = READING_STATUS.IDLE;

// Get DOM elements
const readButton = document.getElementById('read-button');
const statusElement = document.getElementById('status');
const controls = document.getElementById('controls');
const pauseButton = document.getElementById('pause-button');
const resumeButton = document.getElementById('resume-button');
const stopButton = document.getElementById('stop-button');
const optionsLink = document.getElementById('options-link');

/**
 * Update status display
 * @param {string} status - Current reading status
 */
function updateStatus(status) {
  currentStatus = status;
  
  const statusMessages = {
    [READING_STATUS.IDLE]: 'Ready to read',
    [READING_STATUS.READING]: 'Reading…',
    [READING_STATUS.PAUSED]: 'Paused',
    [READING_STATUS.STOPPED]: 'Stopped',
    [READING_STATUS.COMPLETE]: 'Reading complete',
    [READING_STATUS.ERROR]: 'Error reading page'
  };

  statusElement.textContent = statusMessages[status] || 'Ready to read';
}

/**
 * Update button states based on status
 * @param {string} status - Current reading status
 */
function updateButtons(status) {
  switch (status) {
    case READING_STATUS.READING:
      readButton.disabled = true;
      controls.style.display = 'flex';
      pauseButton.style.display = 'block';
      resumeButton.style.display = 'none';
      pauseButton.disabled = false;
      resumeButton.disabled = true;
      stopButton.disabled = false;
      break;

    case READING_STATUS.PAUSED:
      readButton.disabled = true;
      controls.style.display = 'flex';
      pauseButton.style.display = 'none';
      resumeButton.style.display = 'block';
      pauseButton.disabled = true;
      resumeButton.disabled = false;
      stopButton.disabled = false;
      break;

    case READING_STATUS.COMPLETE:
    case READING_STATUS.STOPPED:
    case READING_STATUS.ERROR:
      readButton.disabled = false;
      controls.style.display = 'flex';
      pauseButton.style.display = 'block';
      resumeButton.style.display = 'none';
      pauseButton.disabled = true;
      resumeButton.disabled = true;
      stopButton.disabled = true;
      break;

    default:
      readButton.disabled = false;
      controls.style.display = 'none';
      pauseButton.disabled = true;
      resumeButton.disabled = true;
      stopButton.disabled = true;
  }
}

/**
 * Start reading
 */
async function startReading() {
  try {
    updateStatus(READING_STATUS.IDLE);
    updateButtons(READING_STATUS.IDLE);
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error('No active tab found');
    }

    await sendMessageToTab(tab.id, MESSAGE_TYPES.START_READING);
    updateStatus(READING_STATUS.READING);
    updateButtons(READING_STATUS.READING);
  } catch (error) {
    console.error('Error starting reading:', error);
    updateStatus(READING_STATUS.ERROR);
    updateButtons(READING_STATUS.ERROR);
  }
}

/**
 * Pause reading
 */
async function pauseReading() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await sendMessageToTab(tab.id, MESSAGE_TYPES.PAUSE_READING);
      updateStatus(READING_STATUS.PAUSED);
      updateButtons(READING_STATUS.PAUSED);
    }
  } catch (error) {
    console.error('Error pausing reading:', error);
  }
}

/**
 * Resume reading
 */
async function resumeReading() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await sendMessageToTab(tab.id, MESSAGE_TYPES.RESUME_READING);
      updateStatus(READING_STATUS.READING);
      updateButtons(READING_STATUS.READING);
    }
  } catch (error) {
    console.error('Error resuming reading:', error);
  }
}

/**
 * Stop reading
 */
async function stopReading() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await sendMessageToTab(tab.id, MESSAGE_TYPES.STOP_READING);
      updateStatus(READING_STATUS.STOPPED);
      updateButtons(READING_STATUS.STOPPED);
    }
  } catch (error) {
    console.error('Error stopping reading:', error);
  }
}

/**
 * Get current status from content script
 */
async function refreshStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      const response = await sendMessageToTab(tab.id, MESSAGE_TYPES.GET_STATUS);
      if (response && response.status) {
        updateStatus(response.status);
        updateButtons(response.status);
      }
    }
  } catch (error) {
    // Content script might not be ready, that's okay
    updateStatus(READING_STATUS.IDLE);
    updateButtons(READING_STATUS.IDLE);
  }
}

/**
 * Helper to send message to tab
 */
function sendMessageToTab(tabId, type, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type, ...data }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Set up event listeners
readButton.addEventListener('click', startReading);
pauseButton.addEventListener('click', pauseReading);
resumeButton.addEventListener('click', resumeReading);
stopButton.addEventListener('click', stopReading);

optionsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Initialize
updateStatus(READING_STATUS.IDLE);
updateButtons(READING_STATUS.IDLE);

// Refresh status when popup opens
refreshStatus();

// Poll for status updates while popup is open
const statusInterval = setInterval(refreshStatus, 1000);

// Clear interval when popup closes
window.addEventListener('beforeunload', () => {
  clearInterval(statusInterval);
});

