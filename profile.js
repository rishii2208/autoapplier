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
          <input type="email" id="email" value="${profileData.email || ''}">
        </div>
        <div class="form-group">
          <label for="phone">Phone Number</label>
          <input type="tel" id="phone" value="${profileData.phone || ''}">
        </div>
        <div class="form-group">
          <label for="address">Address</label>
          <input type="text" id="address" value="${profileData.address || ''}">
        </div>
        <div class="form-group">
          <label for="city">City</label>
          <input type="text" id="city" value="${profileData.city || ''}">
        </div>
        <div class="form-group">
          <label for="state">State</label>
          <input type="text" id="state" value="${profileData.state || ''}">
        </div>
        <div class="form-group">
          <label for="zipCode">Zip Code</label>
          <input type="text" id="zipCode" value="${profileData.zipCode || ''}">
        </div>
      </div>
    `;
    
    // Education section
    html += `
      <div class="section">
        <h3>Education</h3>
        <div class="form-group">
          <label for="education">Education (JSON format)</label>
          <textarea id="education" rows="4">${JSON.stringify(profileData.education || [], null, 2)}</textarea>
        </div>
      </div>
    `;
    
    // Experience section
    html += `
      <div class="section">
        <h3>Experience</h3>
        <div class="form-group">
          <label for="experience">Experience (JSON format)</label>
          <textarea id="experience" rows="6">${JSON.stringify(profileData.experience || [], null, 2)}</textarea>
        </div>
      </div>
    `;
    
    // Skills section
    html += `
      <div class="section">
        <h3>Skills</h3>
        <div class="form-group">
          <label for="skills">Skills (comma separated)</label>
          <input type="text" id="skills" value="${(profileData.skills || []).join(', ')}">
        </div>
      </div>
    `;
    
    // Additional sections if available
    if (profileData.certifications) {
      html += `
        <div class="section">
          <h3>Certifications</h3>
          <div class="form-group">
            <label for="certifications">Certifications (comma separated)</label>
            <input type="text" id="certifications" value="${(profileData.certifications || []).join(', ')}">
          </div>
        </div>
      `;
    }
    
    if (profileData.languages) {
      html += `
        <div class="section">
          <h3>Languages</h3>
          <div class="form-group">
            <label for="languages">Languages (comma separated)</label>
            <input type="text" id="languages" value="${(profileData.languages || []).join(', ')}">
          </div>
        </div>
      `;
    }
    
    profileForm.innerHTML = html;
  }
  
  function collectFormData() {
    const formData = {
      firstName: document.getElementById('firstName').value,
      middleName: document.getElementById('middleName').value,
      lastName: document.getElementById('lastName').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      address: document.getElementById('address').value,
      city: document.getElementById('city').value,
      state: document.getElementById('state').value,
      zipCode: document.getElementById('zipCode').value,
      skills: document.getElementById('skills').value.split(',').map(s => s.trim()).filter(s => s)
    };
    
    // Parse JSON fields
    try {
      formData.education = JSON.parse(document.getElementById('education').value || '[]');
    } catch (e) {
      alert('Invalid JSON format in Education field');
      formData.education = [];
    }
    
    try {
      formData.experience = JSON.parse(document.getElementById('experience').value || '[]');
    } catch (e) {
      alert('Invalid JSON format in Experience field');
      formData.experience = [];
    }
    
    // Add optional fields if they exist
    if (document.getElementById('certifications')) {
      formData.certifications = document.getElementById('certifications').value.split(',').map(s => s.trim()).filter(s => s);
    }
    
    if (document.getElementById('languages')) {
      formData.languages = document.getElementById('languages').value.split(',').map(s => s.trim()).filter(s => s);
    }
    
    return formData;
  }
});