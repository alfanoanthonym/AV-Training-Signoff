// netlify/functions/submit-training.js - DEBUG VERSION
// This version has detailed logging to help debug the 422 error

exports.handler = async (event, context) => {
  console.log('=== FUNCTION STARTED ===');
  console.log('HTTP Method:', event.httpMethod);
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: ''
    };
  }

  try {
    console.log('=== PARSING REQUEST ===');
    const formData = JSON.parse(event.body);
    console.log('Form data received:', JSON.stringify(formData, null, 2));

    // Check if we have the token
    console.log('=== CHECKING TOKEN ===');
    const token = process.env.AIRTABLE_TOKEN;
    if (!token) {
      console.error('AIRTABLE_TOKEN environment variable not found!');
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Server configuration error: missing token' })
      };
    }
    console.log('Token exists, length:', token.length);

    // Validate required fields
    console.log('=== VALIDATING FIELDS ===');
    if (!formData.firstName || !formData.lastName || !formData.email) {
      console.error('Missing required fields');
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: firstName, lastName, email' 
        })
      };
    }

    // Map duration values to Airtable-friendly text
    const durationMap = {
      '0.5': '30 minutes',
      '1': '1 hour', 
      '1.5': '1.5 hours',
      '2': '2 hours',
      '3': '3 hours',
      '4+': '4+ hours'
    };

    // Map understanding rating values
    const ratingMap = {
      '5': '5 - Excellent understanding, fully confident',
      '4': '4 - Good understanding, mostly confident',
      '3': '3 - Adequate understanding, somewhat confident',
      '2': '2 - Limited understanding, need more practice',
      '1': '1 - Poor understanding, need additional training'
    };

    // Map additional training values
    const trainingMap = {
      'no': 'No, I feel confident operating the systems',
      'yes-minor': 'Yes, minor additional training would be helpful',
      'yes-major': 'Yes, significant additional training is needed'
    };

    // Create COMPLETE data payload with all form fields
    console.log('=== CREATING COMPLETE AIRTABLE PAYLOAD ===');
    const airtableData = {
      fields: {
        // Required fields
        'First Name': formData.firstName,
        'Last Name': formData.lastName,
        'Email': formData.email,
        'Training Date': formData.trainingDate || new Date().toISOString().split('T')[0],
        'Trainer Name': formData.trainer || 'Test Trainer',
        'Digital Signature': formData.digitalSignature || 'Test Signature',
        'Signature Date': formData.signatureDate || new Date().toISOString().split('T')[0],
        
        // Optional customer info fields
        'Phone': formData.phone || '',
        'Organization': formData.organization || '',
        'Job Title': formData.jobTitle || '',
        
        // Training details
        'Training Time': formData.trainingTime || '',
        'Duration': formData.duration ? (durationMap[formData.duration] || formData.duration) : '',
        'Location': formData.location || '',
        
        // Systems covered
        'Systems Covered': formData.systems ? formData.systems.join(', ') : '',
        'Other Systems': formData.otherSystems || '',
        
        // Assessment fields
        'Understanding Rating': formData.understanding ? (ratingMap[formData.understanding] || formData.understanding) : '',
        'Additional Training Needed': formData.additionalTraining ? (trainingMap[formData.additionalTraining] || formData.additionalTraining) : '',
        'Comments': formData.comments || '',
        
        // System fields
        'IP Address': formData.ipAddress || event.headers['x-forwarded-for'] || 'Unknown',
        'Submission Time': formData.submissionTime || new Date().toISOString(),
        'Status': 'Completed'
      }
    };

    console.log('Airtable payload:', JSON.stringify(airtableData, null, 2));

    // Submit to Airtable
    console.log('=== SUBMITTING TO AIRTABLE ===');
    const airtableUrl = `https://api.airtable.com/v0/appCIpCGzjvurhWSD/AV Training Signoffs`;
    console.log('Airtable URL:', airtableUrl);

    const response = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(airtableData)
    });

    console.log('Airtable response status:', response.status);
    console.log('Airtable response headers:', JSON.stringify([...response.headers.entries()]));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable API Error Details:', errorText);
      
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          success: false, 
          error: `Airtable API error: ${response.status}`,
          details: errorText
        })
      };
    }

    const result = await response.json();
    console.log('Success! Airtable response:', JSON.stringify(result, null, 2));
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: true, 
        message: 'Training signoff submitted successfully',
        recordId: result.id 
      })
    };

  } catch (error) {
    console.error('=== FUNCTION ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};