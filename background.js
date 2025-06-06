// Handle extension installation
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    // Open welcome page on install
    chrome.tabs.create({ url: 'welcome.html' });
  } else if (details.reason === 'update') {
    // Check if we need to show update information
    const currentVersion = chrome.runtime.getManifest().version;
    const previousVersion = details.previousVersion;
    
    if (currentVersion !== previousVersion) {
      // Could show update notes in the future
      console.log(`Updated from ${previousVersion} to ${currentVersion}`);
    }
  }
});

// Add context menu for quick access
chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: 'fillForm',
    title: 'Fill this form',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === 'fillForm') {
    chrome.storage.sync.get(['autoFillEnabled', 'useAIForUnknownFields'], function(data) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'fillForm',
        useAI: data.useAIForUnknownFields !== false
      });
    });
  }
});