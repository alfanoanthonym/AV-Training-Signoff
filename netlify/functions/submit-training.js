// netlify/functions/submit-training.js
// Secure serverless function to submit AV training data to Airtable

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }
  
    // Handle CORS preflight
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
      // Parse incoming data
      const formData = JSON.parse(event.body);
      
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email) {
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ 
            success: false, 
            error: 'Missing required fields: firstName, lastName, email' 
          })
        };
      }
  
      // Format data for Airtable
      const airtableData = {
        fields: {
          'First Name': formData.firstName,
          'Last Name': formData.lastName,
          'Email': formData.email,
          'Phone': formData.phone || '',
          'Organization': formData.organization || '',
          'Job Title': formData.jobTitle || '',
          'Training Date': formData.trainingDate,
          'Training Time': formData.trainingTime || '',
          'Trainer Name': formData.trainer,
          'Duration': formData.duration || '',
          'Location': formData.location || '',
          'Systems Covered': formData.systems ? formData.systems.join(', ') : '',
          'Other Systems': formData.otherSystems || '',
          'Understanding Rating': formData.understanding || '',
          'Additional Training Needed': formData.additionalTraining || '',
          'Comments': formData.comments || '',
          'Digital Signature': formData.digitalSignature,
          'Signature Date': formData.signatureDate,
          'IP Address': formData.ipAddress || event.headers['x-forwarded-for'] || 'Unknown',
          'Submission Time': formData.submissionTime || new Date().toISOString(),
          'Status': 'Completed'
        }
      };
  
      // Submit to Airtable
      const airtableUrl = `https://api.airtable.com/v0/appCIpCGzjvurhWSD/AV Training Signoffs`;
      
      const response = await fetch(airtableUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(airtableData)
      });
  
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Airtable API Error:', response.status, errorData);
        
        return {
          statusCode: response.status,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ 
            success: false, 
            error: `Airtable API error: ${response.status}` 
          })
        };
      }
  
      const result = await response.json();
      
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
      console.error('Function Error:', error);
      
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Internal server error' 
        })
      };
    }
  };