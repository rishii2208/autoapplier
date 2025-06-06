document.addEventListener('DOMContentLoaded', function() {
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const fillFormBtn = document.getElementById('fillFormBtn');
  const editProfileBtn = document.getElementById('editProfileBtn');
  const resetBtn = document.getElementById('resetBtn');
  const autoFillEnabled = document.getElementById('autoFillEnabled');
  const useAIForUnknownFields = document.getElementById('useAIForUnknownFields');
  const formFieldsSection = document.getElementById('formFieldsSection');
  const detectedFields = document.getElementById('detectedFields');
  
  // Check if profile is set up
  chrome.storage.sync.get(['firstName', 'lastName', 'email', 'geminiApiKey'], function(data) {
    if (data.firstName && data.lastName && data.email) {
      statusIndicator.classList.add('status-active');
      statusText.textContent = 'Profile is set up';
      
      // Check if we have API key
      if (!data.geminiApiKey) {
        statusText.textContent += ' (API key missing)';
      }
    } else {
      statusIndicator.classList.add('status-inactive');
      statusText.textContent = 'Profile not set up';
      
      // Redirect to welcome page if profile is not set up
      chrome.tabs.create({ url: 'welcome.html' });
    }
  });
  
  // Load settings
  chrome.storage.sync.get(['autoFillEnabled', 'useAIForUnknownFields'], function(data) {
    autoFillEnabled.checked = data.autoFillEnabled !== false; // Default to true
    useAIForUnknownFields.checked = data.useAIForUnknownFields !== false; // Default to true
  });
  
  // Save settings when changed
  autoFillEnabled.addEventListener('change', function() {
    chrome.storage.sync.set({ autoFillEnabled: autoFillEnabled.checked });
  });
  
  useAIForUnknownFields.addEventListener('change', function() {
    chrome.storage.sync.set({ useAIForUnknownFields: useAIForUnknownFields.checked });
  });
  
  // Fill form button click
  fillFormBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.storage.sync.get(null, function(data) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'fillForm',
          formData: data,
          useAI: useAIForUnknownFields.checked
        }, function(response) {
          if (response && response.fields) {
            displayDetectedFields(response.fields);
          }
        });
      });
    });
  });
  
  // Edit profile button click
  editProfileBtn.addEventListener('click', function() {
    chrome.tabs.create({ url: 'profile.html' });
  });
  
  // Reset button click
  resetBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to reset your profile? This will delete all your saved information.')) {
      chrome.storage.sync.clear(function() {
        statusIndicator.classList.remove('status-active');
        statusIndicator.classList.add('status-inactive');
        statusText.textContent = 'Profile reset';
        
        // Redirect to welcome page
        chrome.tabs.create({ url: 'welcome.html' });
      });
    }
  });
  
  function displayDetectedFields(fields) {
    formFieldsSection.style.display = 'block';
    
    let html = '<ul class="field-list">';
    fields.forEach(field => {
      html += `<li>${field.label || field.name || field.id}: ${field.value || '(empty)'}</li>`;
    });
    html += '</ul>';
    
    detectedFields.innerHTML = html;
  }
});