import { EmailService } from './services/emailService';

async function testEmailFunctionality() {
  try {
    // Test 1: Verify SMTP Connection
    console.log('Testing SMTP Connection...');
    const connectionResult = await EmailService.verifyConnection();
    console.log('Connection result:', connectionResult);

    if (!connectionResult.success) {
      throw new Error(`SMTP Connection failed: ${connectionResult.message}`);
    }

    // Test 2: Send Test Email
    console.log('\nTesting Email Sending...');
    const testEmailResult = await EmailService.sendEmail({
      to: process.env.SMTP_USER!, // Send to self for testing
      subject: 'Test Email',
      body: 'This is a test email to verify the email functionality.',
    });
    console.log('Email sent successfully:', testEmailResult);

    // Test 3: Fetch Emails
    console.log('\nTesting Email Fetching...');
    const fetchResult = await EmailService.fetchEmails();
    console.log('Fetch result:', fetchResult);

    console.log('\nAll tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testEmailFunctionality();
