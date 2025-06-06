// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'fillForm') {
    const filledFields = fillFormFields(request.formData, request.useAI);
    sendResponse({ fields: filledFields });
    return true; // Keep the message channel open for the async response
  }
});

async function fillFormFields(formData, useAI = false) {
  // Get all input fields on the page
  const inputFields = document.querySelectorAll('input, textarea, select');
  const filledFields = [];
  const unknownFields = [];
  
  // First pass: Fill fields we can identify
  inputFields.forEach(field => {
    // Skip hidden, submit, button, and file inputs
    if (field.type === 'hidden' || field.type === 'submit' || 
        field.type === 'button' || field.type === 'file') {
      return;
    }
    
    // Get field identifiers
    const id = field.id.toLowerCase();
    const name = field.name.toLowerCase();
    const label = getFieldLabel(field).toLowerCase();
    const placeholder = (field.placeholder || '').toLowerCase();
    
    // Determine field type and fill accordingly
    let filled = false;
    
    if (isNameField(id, name, label, placeholder)) {
      filled = fillNameField(field, formData, id, name, label, placeholder);
    } else if (isEmailField(id, name, label, placeholder)) {
      field.value = formData.email;
      filled = true;
    } else if (isPhoneField(id, name, label, placeholder)) {
      field.value = formData.phone;
      filled = true;
    } else if (isAddressField(id, name, label, placeholder)) {
      filled = fillAddressField(field, formData, id, name, label, placeholder);
    } else if (isEducationField(id, name, label, placeholder)) {
      filled = fillEducationField(field, formData);
    } else if (isExperienceField(id, name, label, placeholder)) {
      filled = fillExperienceField(field, formData);
    } else if (isSkillsField(id, name, label, placeholder)) {
      field.value = formData.skills.join(', ');
      filled = true;
    } else {
      // Unknown field, add to list for AI processing
      unknownFields.push({
        element: field,
        id: id,
        name: name,
        label: label,
        placeholder: placeholder,
        type: field.type
      });
    }
    
    if (filled) {
      // Trigger change event to notify the form
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Add to filled fields list
      filledFields.push({
        id: id,
        name: name,
        label: label,
        value: field.value
      });
    }
  });
  
  // Second pass: Use AI to fill unknown fields if enabled
  if (useAI && unknownFields.length > 0 && formData.geminiApiKey) {
    await fillUnknownFieldsWithAI(unknownFields, formData);
    
    // Add AI-filled fields to the list
    unknownFields.forEach(field => {
      if (field.element.value) {
        filledFields.push({
          id: field.id,
          name: field.name,
          label: field.label,
          value: field.element.value
        });
      }
    });
  }
  
  return filledFields;
}

function getFieldLabel(field) {
  // Try to find a label that references this field
  const labelElement = document.querySelector(`label[for="${field.id}"]`);
  if (labelElement) {
    return labelElement.textContent.trim();
  }
  
  // Check if the field is inside a label
  let parent = field.parentElement;
  while (parent) {
    if (parent.tagName === 'LABEL') {
      return parent.textContent.trim().replace(field.value, '');
    }
    parent = parent.parentElement;
  }
  
  // Look for preceding text or elements that might be labels
  const previousElement = field.previousElementSibling;
  if (previousElement && 
      (previousElement.tagName === 'LABEL' || 
       previousElement.tagName === 'SPAN' || 
       previousElement.tagName === 'DIV')) {
    return previousElement.textContent.trim();
  }
  
  // Look for nearby div or span elements that might contain label text
  const parentDiv = field.closest('div');
  if (parentDiv) {
    const possibleLabels = parentDiv.querySelectorAll('div, span, p');
    for (const el of possibleLabels) {
      if (el !== field && !el.contains(field) && el.textContent.trim()) {
        return el.textContent.trim();
      }
    }
  }
  
  return '';
}

function isNameField(id, name, label, placeholder) {
  const namePatterns = [
    /first[\s_-]*name/i, /last[\s_-]*name/i, /middle[\s_-]*name/i,
    /full[\s_-]*name/i, /^name$/i, /^fname$/i, /^lname$/i, /^mname$/i
  ];
  
  return namePatterns.some(pattern => 
    pattern.test(id) || pattern.test(name) || 
    pattern.test(label) || pattern.test(placeholder)
  );
}

function fillNameField(field, formData, id, name, label, placeholder) {
  // Check for first name
  if (/first[\s_-]*name|^fname$|^first$/i.test(id) || 
      /first[\s_-]*name|^fname$|^first$/i.test(name) || 
      /first[\s_-]*name|^fname$|^first$/i.test(label) || 
      /first[\s_-]*name|^fname$|^first$/i.test(placeholder)) {
    field.value = formData.firstName;
    return true;
  } 
  // Check for middle name
  else if (/middle[\s_-]*name|^mname$|^middle$/i.test(id) || 
           /middle[\s_-]*name|^mname$|^middle$/i.test(name) || 
           /middle[\s_-]*name|^mname$|^middle$/i.test(label) || 
           /middle[\s_-]*name|^mname$|^middle$/i.test(placeholder)) {
    field.value = formData.middleName;
    return true;
  } 
  // Check for last name
  else if (/last[\s_-]*name|^lname$|^last$/i.test(id) || 
           /last[\s_-]*name|^lname$|^last$/i.test(name) || 
           /last[\s_-]*name|^lname$|^last$/i.test(label) || 
           /last[\s_-]*name|^lname$|^last$/i.test(placeholder)) {
    field.value = formData.lastName;
    return true;
  } 
  // Check for full name
  else if (/full[\s_-]*name|^name$/i.test(id) || 
           /full[\s_-]*name|^name$/i.test(name) || 
           /full[\s_-]*name|^name$/i.test(label) || 
           /full[\s_-]*name|^name$/i.test(placeholder)) {
    const middlePart = formData.middleName ? ` ${formData.middleName} ` : ' ';
    field.value = `${formData.firstName}${middlePart}${formData.lastName}`;
    return true;
  }
  
  return false;
}

function isEmailField(id, name, label, placeholder) {
  const emailPatterns = [/e[\s_-]*mail/i, /^email$/i, /^e-mail$/i];
  
  return emailPatterns.some(pattern => 
    pattern.test(id) || pattern.test(name) || 
    pattern.test(label) || pattern.test(placeholder)
  );
}

function isPhoneField(id, name, label, placeholder) {
  const phonePatterns = [
    /phone/i, /mobile/i, /cell/i, /telephone/i, /tel[\s_-]*(number)?/i,
    /contact[\s_-]*number/i
  ];
  
  return phonePatterns.some(pattern => 
    pattern.test(id) || pattern.test(name) || 
    pattern.test(label) || pattern.test(placeholder)
  );
}

function isAddressField(id, name, label, placeholder) {
  const addressPatterns = [
    /address/i, /street/i, /city/i, /state/i, /province/i,
    /zip/i, /postal/i, /country/i
  ];
  
  return addressPatterns.some(pattern => 
    pattern.test(id) || pattern.test(name) || 
    pattern.test(label) || pattern.test(placeholder)
  );
}

function fillAddressField(field, formData, id, name, label, placeholder) {
  // Check for full address
  if (/address|street/i.test(id) || 
      /address|street/i.test(name) || 
      /address|street/i.test(label) || 
      /address|street/i.test(placeholder)) {
    field.value = formData.address;
    return true;
  } 
  // Check for city
  else if (/city/i.test(id) || 
           /city/i.test(name) || 
           /city/i.test(label) || 
           /city/i.test(placeholder)) {
    field.value = formData.city;
    return true;
  } 
  // Check for state
  else if (/state|province/i.test(id) || 
           /state|province/i.test(name) || 
           /state|province/i.test(label) || 
           /state|province/i.test(placeholder)) {
    field.value = formData.state;
    return true;
  } 
  // Check for zip/postal code
  else if (/zip|postal/i.test(id) || 
           /zip|postal/i.test(name) || 
           /zip|postal/i.test(label) || 
           /zip|postal/i.test(placeholder)) {
    field.value = formData.zipCode;
    return true;
  }
  
  return false;
}

function isEducationField(id, name, label, placeholder) {
  const educationPatterns = [
    /education/i, /degree/i, /qualification/i, /academic/i,
    /university/i, /college/i, /school/i, /institution/i
  ];
  
  return educationPatterns.some(pattern => 
    pattern.test(id) || pattern.test(name) || 
    pattern.test(label) || pattern.test(placeholder)
  );
}

function fillEducationField(field, formData) {
  if (!formData.education || formData.education.length === 0) {
    return false;
  }
  
  // Get the most recent education entry
  const mostRecent = formData.education[0];
  
  // If it's a select field, try to find a matching option
  if (field.tagName === 'SELECT') {
    const options = Array.from(field.options);
    for (const option of options) {
      const text = option.text.toLowerCase();
      if (mostRecent.degree && text.includes(mostRecent.degree.toLowerCase())) {
        field.value = option.value;
        return true;
      }
    }
    return false;
  }
  
  // For text fields, use the full education info
  field.value = `${mostRecent.degree || ''} - ${mostRecent.institution || ''} (${mostRecent.year || ''})`;
  return true;
}

function isExperienceField(id, name, label, placeholder) {
  const experiencePatterns = [
    /experience/i, /work[\s_-]*exp/i, /years[\s_-]*(of)?[\s_-]*exp/i,
    /job[\s_-]*title/i, /position/i, /employer/i, /company/i
  ];
  
  return experiencePatterns.some(pattern => 
    pattern.test(id) || pattern.test(name) || 
    pattern.test(label) || pattern.test(placeholder)
  );
}

function fillExperienceField(field, formData) {
  if (!formData.experience || formData.experience.length === 0) {
    return false;
  }
  
  // Get the most recent experience entry
  const mostRecent = formData.experience[0];
  
  // Check for specific experience fields
  const id = field.id.toLowerCase();
  const name = field.name.toLowerCase();
  const label = getFieldLabel(field).toLowerCase();
  const placeholder = (field.placeholder || '').toLowerCase();
  
  // Job title field
  if (/job[\s_-]*title|position/i.test(id) || 
      /job[\s_-]*title|position/i.test(name) || 
      /job[\s_-]*title|position/i.test(label) || 
      /job[\s_-]*title|position/i.test(placeholder)) {
    field.value = mostRecent.title || '';
    return true;
  }
  
  // Company/employer field
  if (/company|employer/i.test(id) || 
      /company|employer/i.test(name) || 
      /company|employer/i.test(label) || 
      /company|employer/i.test(placeholder)) {
    field.value = mostRecent.company || '';
    return true;
  }
  
  // Duration/years field
  if (/duration|years/i.test(id) || 
      /duration|years/i.test(name) || 
      /duration|years/i.test(label) || 
      /duration|years/i.test(placeholder)) {
    field.value = mostRecent.duration || '';
    return true;
  }
  
  // For general experience fields, use the full experience info
  field.value = `${mostRecent.title || ''} at ${mostRecent.company || ''} (${mostRecent.duration || ''})`;
  return true;
}

function isSkillsField(id, name, label, placeholder) {
  const skillsPatterns = [
    /skills/i, /abilities/i, /competencies/i, /expertise/i
  ];
  
  return skillsPatterns.some(pattern => 
    pattern.test(id) || pattern.test(name) || 
    pattern.test(label) || pattern.test(placeholder)
  );
}

async function fillUnknownFieldsWithAI(unknownFields, formData) {
  if (unknownFields.length === 0 || !formData.geminiApiKey) {
    return;
  }
  
  try {
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    const url = `${endpoint}?key=${formData.geminiApiKey}`;
    
    // Create a description of the form fields
    const fieldsDescription = unknownFields.map(field => {
      return `Field: ${field.label || field.name || field.id || 'Unnamed field'}, Type: ${field.type}`;
    }).join('\n');
    
    // Create a description of the user's profile
    const profileDescription = `
      Name: ${formData.firstName} ${formData.middleName || ''} ${formData.lastName}
      Email: ${formData.email}
      Phone: ${formData.phone}
      Address: ${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}
      Education: ${JSON.stringify(formData.education)}
      Experience: ${JSON.stringify(formData.experience)}
      Skills: ${formData.skills.join(', ')}
      ${formData.certifications ? `Certifications: ${formData.certifications.join(', ')}` : ''}
      ${formData.languages ? `Languages: ${formData.languages.join(', ')}` : ''}
    `;
    
    const prompt = `
      I need help filling out a job application form. Below are the fields I couldn't automatically identify, 
      and my profile information. For each field, determine what information from my profile should be used to fill it.
      
      Form fields:
      ${fieldsDescription}
      
      My profile:
      ${profileDescription}
      
      For each field, provide a JSON object with the field identifier (label, name, or id) and the value to fill.
      Format your response as a valid JSON array like this:
      [
        {"identifier": "field_identifier", "value": "value_to_fill"},
        ...
      ]
      
      Only include fields where you're confident about what information should be filled in.
      Return only the JSON array without any additional text.
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
      console.error(`API request failed with status ${response.status}`);
      return;
    }
    
    const data = await response.json();
    
    // Extract the JSON from the response
    const textResponse = data.candidates[0].content.parts[0].text;
    const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || 
                      textResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const suggestions = JSON.parse(jsonStr);
      
      // Fill fields based on AI suggestions
      for (const suggestion of suggestions) {
        const identifier = suggestion.identifier.toLowerCase();
        const value = suggestion.value;
        
        // Find matching field
        const matchingField = unknownFields.find(field => 
          (field.label && field.label.toLowerCase().includes(identifier)) ||
          (field.name && field.name.toLowerCase().includes(identifier)) ||
          (field.id && field.id.toLowerCase().includes(identifier))
        );
        
        if (matchingField) {
          matchingField.element.value = value;
          
          // Trigger change events
          matchingField.element.dispatchEvent(new Event('input', { bubbles: true }));
          matchingField.element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  } catch (error) {
    console.error('Error using AI to fill unknown fields:', error);
  }
}