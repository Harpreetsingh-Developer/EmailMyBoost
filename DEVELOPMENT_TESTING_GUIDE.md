# 🧪 **Development Testing Guide - Custom Domain SMTP**

## 🚀 **Quick Start Testing**

### **1. Start Development Server**
```bash
npm run dev
```
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

## 🔧 **Testing SMTP Configuration**

### **Step 1: Access SMTP Settings**
1. Open your browser to `http://localhost:5173`
2. Click the **"SMTP"** button in the app header
3. You'll see the SMTP configuration modal

### **Step 2: Configure Test SMTP Server**

#### **Option A: Gmail Custom Domain (Recommended for Testing)**
```bash
Host: smtp.gmail.com
Port: 587
Secure: No (unchecked)
Username: your-email@yourdomain.com
Password: Your Gmail App Password (NOT regular password)
From Email: noreply@yourdomain.com
From Name: Your Company Name
```

#### **Option B: Gmail Personal Account (Quick Test)**
```bash
Host: smtp.gmail.com
Port: 587
Secure: No (unchecked)
Username: your-personal@gmail.com
Password: Your Gmail App Password
From Email: your-personal@gmail.com
From Name: Your Name
```

#### **Option C: SendGrid (Free Tier)**
```bash
Host: smtp.sendgrid.net
Port: 587
Secure: No (unchecked)
Username: apikey
Password: Your SendGrid API Key
From Email: test@yourdomain.com
From Name: Test Account
```

### **Step 3: Test Connection**
1. Fill in the SMTP details above
2. Click **"Test Connection"**
3. Check your email for the test message
4. Verify the configuration is working

## 📧 **Testing Bulk Email Functionality**

### **Step 1: Prepare Test Data**

#### **Create Test CSV File**
Create a file called `test-recipients.csv` with this content:
```csv
name,email,company,position
John Doe,john.doe@example.com,Test Corp,Manager
Jane Smith,jane.smith@example.com,Test Corp,Developer
Bob Wilson,bob.wilson@example.com,Test Corp,Designer
```

#### **Create Test Email Template**
Create a file called `test-template.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Email</title>
</head>
<body>
    <h1>Hello {{name}}!</h1>
    <p>Welcome to {{company}} as a {{position}}.</p>
    <p>This is a test email sent from your custom domain via EmailMyBoost.</p>
    <p>Best regards,<br>Your Team</p>
</body>
</html>
```

### **Step 2: Test Email Sending**
1. **Upload Recipients**: Upload your `test-recipients.csv`
2. **Upload Template**: Upload your `test-template.html`
3. **Preview**: Check how emails will look
4. **Send Test**: Send to a small list first (1-3 recipients)

## 🔍 **Testing Different Scenarios**

### **Scenario 1: SMTP Connection Testing**
```bash
# Test with invalid credentials
Username: wrong@email.com
Password: wrongpassword
Expected: Authentication failed error

# Test with wrong host
Host: smtp.wronghost.com
Expected: Connection failed error

# Test with wrong port
Port: 9999
Expected: Connection timeout error
```

### **Scenario 2: Email Content Testing**
```bash
# Test with placeholders
Subject: Welcome to {{company}}, {{name}}!
Content: Hello {{name}}, you work at {{company}} as {{position}}

# Test with HTML content
Content: <h1>{{name}}</h1><p>Welcome to {{company}}</p>

# Test with special characters
Content: Hello {{name}}! 🎉 Welcome to {{company}}!
```

### **Scenario 3: Bulk Sending Testing**
```bash
# Test with 1 recipient (immediate)
# Test with 3 recipients (small batch)
# Test with 10 recipients (multiple batches)
# Test with 50+ recipients (rate limiting)
```

## 🛠️ **Debugging & Troubleshooting**

### **Check Server Logs**
Open your terminal where `npm run dev` is running and watch for:
```bash
✅ SMTP test email sent successfully: [message-id]
❌ SMTP test failed: [error details]
📧 Starting SMTP bulk email job [job-id] for [X] recipients
✅ SMTP email sent to [email]
❌ Failed to send SMTP email to [email]: [error]
```

### **Common Error Messages & Solutions**

#### **"Authentication failed"**
```bash
Solution: Check username/password
- Use App Password for Gmail (not regular password)
- Verify credentials are correct
- Check if 2FA is enabled
```

#### **"Connection failed"**
```bash
Solution: Check network and settings
- Verify host and port are correct
- Check firewall settings
- Try different ports (587, 465)
```

#### **"Connection timeout"**
```bash
Solution: Network issues
- Check internet connection
- Try different network
- Check if SMTP server is accessible
```

#### **"Rate limit exceeded"**
```bash
Solution: Reduce sending speed
- Send to smaller batches
- Add delays between batches
- Check SMTP provider limits
```

## 📊 **Testing Progress Tracking**

### **Monitor Real-time Progress**
1. **Start Bulk Email Job**: Click "Send All Emails"
2. **Watch Progress Bar**: Real-time updates
3. **Check Status**: Sent, failed, current recipient
4. **View Results**: Success/failure for each email

### **Expected Progress Flow**
```bash
Status: running
Current: Processing john.doe@example.com
Progress: 1/3 (33%)

Status: running
Current: Processing jane.smith@example.com
Progress: 2/3 (67%)

Status: running
Current: Processing bob.wilson@example.com
Progress: 3/3 (100%)

Status: completed
Current: All emails processed
```

## 🧪 **Advanced Testing Scenarios**

### **Test 1: Large Recipient Lists**
```bash
# Create test CSV with 100+ recipients
# Test rate limiting and batching
# Monitor server performance
# Check memory usage
```

### **Test 2: Template Variations**
```bash
# Test different HTML structures
# Test CSS styling in emails
# Test responsive design
# Test attachment handling
```

### **Test 3: Error Handling**
```bash
# Test with invalid email addresses
# Test with malformed CSV data
# Test with network interruptions
# Test with SMTP server downtime
```

## 🔒 **Security Testing**

### **Test Credential Storage**
```bash
# Check browser localStorage
# Verify no plaintext passwords
# Test encryption/decryption
# Verify secure transmission
```

### **Test Access Control**
```bash
# Test without authentication
# Test with expired tokens
# Test user isolation
# Test admin privileges
```

## 📱 **Testing Different Browsers**

### **Cross-browser Testing**
```bash
Chrome: Test SMTP configuration
Firefox: Test email sending
Safari: Test template rendering
Edge: Test progress tracking
```

### **Mobile Testing**
```bash
# Test responsive design
# Test touch interactions
# Test mobile email clients
# Test different screen sizes
```

## 🚀 **Performance Testing**

### **Load Testing**
```bash
# Test with 100 recipients
# Test with 500 recipients
# Test with 1000+ recipients
# Monitor memory and CPU usage
```

### **Stress Testing**
```bash
# Test rapid successive sends
# Test concurrent users
# Test network latency
# Test server recovery
```

## 📋 **Testing Checklist**

### **Pre-Testing Setup**
- [ ] Development server running
- [ ] SMTP credentials ready
- [ ] Test CSV file created
- [ ] Test template created
- [ ] Browser console open
- [ ] Server logs visible

### **SMTP Configuration Testing**
- [ ] Connection test successful
- [ ] Test email received
- [ ] Configuration saved
- [ ] Provider badge updated
- [ ] Settings modal working

### **Email Sending Testing**
- [ ] CSV upload working
- [ ] Template processing correct
- [ ] Placeholder replacement working
- [ ] Preview showing correctly
- [ ] Bulk sending initiated

### **Progress Tracking Testing**
- [ ] Progress bar updating
- [ ] Status messages showing
- [ ] Real-time updates working
- [ ] Completion status correct
- [ ] Error handling working

### **Post-Testing Verification**
- [ ] All test emails received
- [ ] Content formatting correct
- [ ] Placeholders replaced
- [ ] No duplicate emails
- [ ] Error logs clean

## 🎯 **Quick Test Commands**

### **Test SMTP Connection**
```bash
# In browser console
fetch('/api/smtp/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    username: 'your-email@domain.com',
    password: 'your-app-password',
    fromEmail: 'noreply@domain.com',
    fromName: 'Test Account'
  })
})
.then(r => r.json())
.then(console.log)
```

### **Test Bulk Email**
```bash
# In browser console
fetch('/api/smtp/send-bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recipients: [
      { name: 'Test User', email: 'test@example.com', company: 'Test Corp' }
    ],
    subject: 'Test Email',
    content: '<h1>Hello {{name}}</h1><p>Welcome to {{company}}</p>',
    smtpConfig: { /* your saved config */ }
  })
})
.then(r => r.json())
.then(console.log)
```

## 🎉 **Success Indicators**

### **SMTP Working Correctly**
- ✅ Test email received
- ✅ Configuration saved
- ✅ Provider badge shows "Custom SMTP"
- ✅ Bulk emails sent successfully
- ✅ Progress tracking working
- ✅ No error messages in console

### **Ready for Production**
- ✅ All tests passing
- ✅ Error handling working
- ✅ Performance acceptable
- ✅ Security verified
- ✅ Documentation complete
- ✅ Team can use confidently

---

## 🚀 **Next Steps After Testing**

1. **Fix any issues** found during testing
2. **Optimize performance** if needed
3. **Update documentation** with findings
4. **Prepare for production** deployment
5. **Train team members** on usage
6. **Set up monitoring** for production

**Happy Testing! 🧪📧**
