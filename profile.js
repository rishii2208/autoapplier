document.addEventListener('DOMContentLoaded', function() {
  const profileForm = document.getElementById('profileForm');
  const geminiApiKey = document.getElementById('geminiApiKey');
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  
  // Load profile data
  chrome.storage.sync.get(null, function(data) {
    displayProfileForm(data);
    
    // Set API key
    if (data.geminiApiKey) {
      geminiApiKey.value = data.geminiApiKey;
    }
  });
  
  // Save profile button click
  saveProfileBtn.addEventListener('click', function() {
    const formData = collectFormData();
    formData.geminiApiKey = geminiApiKey.value.trim();
    
    chrome.storage.sync.set(formData, function() {
      alert('Profile saved successfully!');
      window.close();
    });
  });
  
  // Cancel button click
  cancelBtn.addEventListener('click', function() {
    window.close();
  });
  
  function displayProfileForm(profileData) {
    // Create form elements for each profile field
    let html = `
      <div class="section">
        <h3>Personal Information</h3>
        <div class="form-group">
          <label for="firstName">First Name</label>
          <input type="text" id="firstName" value="${profileData.firstName || ''}">
        </div>
        <div class="form-group">
          <label for="middleName">Middle Name</label>
          <input type="text" id="middleName" value="${profileData.middleName || ''}">
        </div>
        <div class="form-group">
          <label for="lastName">Last Name</label>
          <input type="text" id="lastName" value="${profileData.lastName || ''}">
        </div>
      </div>
      
      <div class="section">
        <h3>Contact Information</h3>
        <div class="form-group">
          <label for="email">Email</label>
          <input type