document.addEventListener('DOMContentLoaded', function() {
  const uploadArea = document.getElementById('uploadArea');
  const resumeUpload = document.getElementById('resumeUpload');
  const geminiApiKey = document.getElementById('geminiApiKey');
  const parseResumeBtn = document.getElementById('parseResumeBtn');
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const finishSetupBtn = document.getElementById('finishSetupBtn');
  const extractedInfoDiv = document.getElementById('extractedInfo');
  
  let resumeFile = null;
  
  // Check if API key is already saved
  chrome.storage.sync.get('geminiApiKey', function(data) {
    if (data.geminiApiKey) {
      geminiApiKey.value = data.geminiApiKey;
      updateParseButton();
    }
  });
  
  // Handle drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#4285f4';
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#ccc';
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#ccc';
    
    if (e.dataTransfer.files.length) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });
  
  // Handle file input change
  resumeUpload.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleFileUpload(e.target.files[0]);
    }
  });
  
  // Handle click on upload area
  uploadArea.addEventListener('click', () => {
    resumeUpload.click();
  });
  
  // Handle API key input
  geminiApiKey.addEventListener('input', updateParseButton);
  
  function updateParseButton() {
    parseResumeBtn.disabled = !(resumeFile && geminiApiKey.value.trim());
  }
  
  function handleFileUpload(file) {
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF or Word document');
      return;
    }
    
    resumeFile = file;
    uploadArea.querySelector('p').textContent = `Selected file: ${file.name}`;
    updateParseButton();
  }
  
  // Parse resume button click
  parseResumeBtn.addEventListener('click', async () => {
    if (!resumeFile || !geminiApiKey.value.trim()) {
      alert('Please upload a resume and enter your Gemini API key');
      return;
    }
    
    parseResumeBtn.textContent = 'Parsing...';
    parseResumeBtn.disabled = true;
    
    try {
      // Save API key
      chrome.storage.sync.set({ geminiApiKey: geminiApiKey.value.trim() });
      
      // Extract text from resume
      const resumeText = await extractTextFromResume(resumeFile);
      
      // Parse resume with Gemini API
      const profileData = await parseResumeWithGemini(resumeText, geminiApiKey.value.trim());
      
      // Display extracted information
      displayExtractedInfo(profileData);
      
      // Move to step 2
      document.getElementById('step1').classList.remove('active');
      document.getElementById('step2').classList.add('active');
      
    } catch (error) {
      console.error('Error parsing resume:', error);
      alert('Error parsing resume: ' + error.message);
      parseResumeBtn.textContent = 'Parse Resume';
      parseResumeBtn.disabled = false;
    }
  });
  
  // Save profile button click
  saveProfileBtn.addEventListener('click', () => {
    const formData = collectFormData();
    
    chrome.storage.sync.set(formData, function() {
      // Move to step 3
      document.getElementById('step2').classList.remove('active');
      document.getElementById('step3').classList.add('active');
    });
  });
  
  // Finish setup button click
  finishSetupBtn.addEventListener('click', () => {
    window.close();
  });
  
  async function extractTextFromResume(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        // For simplicity, we're just returning the raw text
        // In a real implementation, you would use a PDF/DOCX parser library
        resolve(e.target.result);
      };
      
      reader.onerror = function() {
        reject(new Error('Failed to read file'));
      };
      
      if (file.type === 'application/pdf') {
        // For PDF files, we'd use a PDF parser library
        // For this example, we'll just read as text
        reader.readAsText(file);
      } else {
        // For DOCX files, we'd use a DOCX parser library
        // For this example, we'll just read as text
        reader.readAsText(file);
      }
    });
  }
  
  async function parseResumeWithGemini(resumeText, apiKey) {
    try {
      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
      const url = `${endpoint}?key=${apiKey}`;
      
      const prompt = `
        Parse the following resume and extract the information in JSON format with these fields:
        - firstName
        - middleName (if available)
        - lastName
        - email
        - phone
        - address
        - city
        - state
        - zipCode
        - education (list with degree, institution, year)
        - experience (list with title, company, duration, description)
        - skills (list)
        - certifications (list if available)
        - languages (list if available)
        
        Resume text:
        ${resumeText}
        
        Return only the JSON object without any additional text.
      `;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract the JSON from the response
      const textResponse = data.candidates[0].content.parts[0].text;
      const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        textResponse.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      } else {
        throw new Error('Failed to parse JSON from API response');
      }
      
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error('Failed to parse resume with Gemini API');
    }
  }
  
  function displayExtractedInfo(profileData) {
    // Create form elements for each extracted field
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
    
    extractedInfoDiv.innerHTML = html;
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
      education: JSON.parse(document.getElementById('education').value || '[]'),
      experience: JSON.parse(document.getElementById('experience').value || '[]'),
      skills: document.getElementById('skills').value.split(',').map(s => s.trim()).filter(s => s)
    };
    
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