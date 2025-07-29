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

    // Create MINIMAL data payload for testing
    console.log('=== CREATING AIRTABLE PAYLOAD ===');
    const airtableData = {
      fields: {
        'First Name': formData.firstName,
        'Last Name': formData.lastName,
        'Email': formData.email,
        'Training Date': formData.trainingDate || new Date().toISOString().split('T')[0],
        'Trainer Name': formData.trainer || 'Test Trainer',
        'Digital Signature': formData.digitalSignature || 'Test Signature',
        'Signature Date': formData.signatureDate || new Date().toISOString().split('T')[0],
        // Only include duration if it exists and map it properly
        ...(formData.duration && { 'Duration': durationMap[formData.duration] || formData.duration })
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