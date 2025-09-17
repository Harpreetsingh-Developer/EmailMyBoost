# EmailMyBoost - Professional Email Campaign Manager

A modern, enterprise-grade email campaign management application with **dual email sending capabilities**: Gmail OAuth and Custom Domain SMTP.

## ✨ **Features**

### 🔐 **Authentication & Security**
- **Supabase Integration**: Secure user authentication
- **Dual Email Providers**: Gmail OAuth + Custom SMTP
- **Encrypted Storage**: Secure credential management
- **Row-Level Security**: User data isolation

### 📧 **Email Sending Capabilities**
- **Gmail OAuth**: Send via Gmail API (500-2000 emails/day)
- **Custom SMTP**: Send from your domain (unlimited emails)
- **Bulk Email Support**: Handle large recipient lists
- **Template System**: HTML templates with personalization
- **Progress Tracking**: Real-time sending progress

### 🎨 **User Experience**
- **Modern UI**: Clean, responsive interface
- **Template Management**: Upload or create HTML templates
- **Recipient Management**: CSV import with validation
- **Preview System**: See emails before sending
- **Real-time Progress**: Monitor bulk email operations

## 🏗️ **Tech Stack**

### **Frontend**
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **Lucide React** for icons

### **Backend**
- **Node.js** with Express
- **Supabase** for authentication & database
- **Nodemailer** for SMTP functionality
- **Google APIs** for Gmail integration

### **Database**
- **PostgreSQL** via Supabase
- **Row-Level Security** enabled
- **Encrypted storage** for sensitive data

## 🚀 **Getting Started**

### **1. Installation**
```bash
# Clone the repository
git clone <your-repo-url>
cd EmailMyBoost

# Install dependencies
npm install
```

### **2. Environment Setup**
Create a `.env` file in the project root:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# SMTP Configuration (Optional)
SMTP_ENCRYPTION_KEY=your_smtp_encryption_key_32_chars_minimum
SMTP_SALT_ROUNDS=10

# Server Configuration
PORT=3000
NODE_ENV=development
```

### **3. Run Development Server**
```bash
# Start both frontend and backend
npm run dev

# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

## 📁 **Project Structure**

```
EmailMyBoost/
├── src/
│   ├── components/          # React components
│   │   ├── EmailAppSupabase.tsx    # Main app component
│   │   ├── SMTPSettings.tsx        # SMTP configuration
│   │   ├── SimpleEmailPreview.tsx  # Email preview & sending
│   │   ├── SupabaseAuth.tsx        # Authentication
│   │   ├── GmailAuthFlow.tsx       # Gmail OAuth flow
│   │   ├── GmailApiErrorModal.tsx  # Error handling
│   │   └── Footer.tsx              # App footer
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── config/              # Configuration files
│   └── types.ts             # TypeScript types
├── server/
│   ├── routes/              # API route handlers
│   │   └── smtp.js          # SMTP functionality
│   ├── utils/               # Server utilities
│   ├── models/              # Database models
│   └── index.js             # Main server file
├── database_schema.sql      # Database structure
├── package.json             # Dependencies & scripts
└── README.md                # This file
```

## 🔧 **Configuration**

### **Gmail OAuth Setup**
1. Configure Google Cloud Console
2. Enable Gmail API
3. Set up OAuth consent screen
4. Configure Supabase Google provider

### **SMTP Configuration**
1. Click "SMTP" button in app header
2. Enter your SMTP server details
3. Test connection
4. Save configuration

### **Popular SMTP Providers**
- **Gmail Custom Domain**: `smtp.gmail.com:587`
- **SendGrid**: `smtp.sendgrid.net:587`
- **Mailgun**: `smtp.mailgun.org:587`
- **AWS SES**: `email-smtp.region.amazonaws.com:587`

## 📊 **Usage**

### **1. Authentication**
- Sign in with Google OAuth or email
- Grant necessary permissions

### **2. Email Setup**
- Configure Gmail OAuth or SMTP
- Set up email templates

### **3. Campaign Creation**
- Upload recipient CSV file
- Create or upload email template
- Preview emails with personalization
- Send bulk emails

### **4. Monitoring**
- Track sending progress in real-time
- Monitor success/failure rates
- View detailed logs and analytics

## 🚀 **Deployment**

### **Vercel (Frontend)**
```bash
npm run build
vercel --prod
```

### **Render (Backend)**
- Connect your GitHub repository
- Set environment variables
- Deploy automatically

## 📚 **Documentation**

- **SMTP_IMPLEMENTATION_GUIDE.md**: Complete SMTP usage guide
- **IMPLEMENTATION_SUMMARY.md**: Technical implementation details
- **database_schema.sql**: Database structure and setup

## 🔒 **Security Features**

- **Encrypted Credentials**: AES-256 encryption for SMTP passwords
- **Authentication**: Supabase JWT-based authentication
- **Access Control**: Row-level security policies
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: SMTP rate limiting and batching

## 📈 **Performance Features**

- **Batch Processing**: 10 emails per batch
- **Rate Limiting**: 10 emails per second
- **Connection Pooling**: Efficient SMTP connection management
- **Progress Tracking**: Real-time operation monitoring
- **Error Handling**: Comprehensive error management

## 🆘 **Support**

### **Common Issues**
1. **SMTP Connection Failed**: Check host, port, and credentials
2. **Authentication Error**: Verify OAuth permissions
3. **Rate Limiting**: Reduce batch size or add delays

### **Getting Help**
1. Check server console logs
2. Use the test connection feature
3. Review error messages
4. Check documentation

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License.

---

## 🎯 **Business Benefits**

- **Professional Branding**: Custom domain emails
- **Unlimited Scale**: No daily sending limits
- **High Deliverability**: SMTP provider infrastructure
- **Cost Effective**: Often cheaper than Gmail API
- **Flexibility**: Choose best provider for needs

**🚀 Ready to scale your email marketing with professional custom domain sending! 📧**

## 📋 **User Flow Documentation**

### **Gmail OAuth Flow**
1. User clicks "Sign in with Google"
2. Redirected to Google OAuth consent screen
3. User grants Gmail permissions
4. Redirected back to app with authentication
5. User can now send emails via Gmail API

### **Custom SMTP Flow**
1. User clicks "SMTP" button in header
2. Opens SMTP configuration modal
3. User enters SMTP server details:
   - Host (e.g., smtp.gmail.com)
   - Port (e.g., 587)
   - Username/Email
   - Password/App Password
   - From Email
   - From Name (optional)
4. User clicks "Test Connection"
5. System validates SMTP credentials
6. User clicks "Save Configuration"
7. User can now send emails via custom SMTP

### **Email Sending Flow**
1. User uploads recipient CSV file
2. User creates or uploads email template
3. User previews email with personalization
4. User clicks "Send All Emails"
5. System processes emails in batches
6. Real-time progress tracking
7. Success/failure reporting

## 🔧 **Environment Variables Reference**

### **Required for Production**
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# SMTP Security
SMTP_ENCRYPTION_KEY=your_32_character_encryption_key
```

### **Optional**
```env
# Server
PORT=3000
NODE_ENV=production

# SMTP
SMTP_SALT_ROUNDS=10
```

## 📊 **API Endpoints**

### **Authentication**
- `GET /api/auth/google/gmail/status` - Check Gmail connection status
- `POST /api/send-email` - Send single email via Gmail

### **SMTP Configuration**
- `GET /api/smtp/config` - Get SMTP configurations
- `POST /api/smtp/config` - Create SMTP configuration
- `PUT /api/smtp/config/:id` - Update SMTP configuration
- `DELETE /api/smtp/config/:id` - Delete SMTP configuration

### **SMTP Email Sending**
- `POST /api/smtp/test` - Test SMTP connection
- `POST /api/smtp/send-email` - Send single email via SMTP
- `POST /api/smtp/send-bulk` - Send bulk emails via SMTP
- `GET /api/smtp/progress/:jobId` - Get bulk email progress

### **Bulk Email (Gmail)**
- `POST /api/supabase/send-bulk-email/start` - Start bulk email job
- `GET /api/supabase/send-bulk-email/progress/:jobId` - Get progress

## 🛠️ **Development**

### **Running Tests**
```bash
npm run test
```

### **Linting**
```bash
npm run lint
```

### **Type Checking**
```bash
npm run type-check
```

### **Build for Production**
```bash
npm run build
```

## 📈 **Monitoring & Analytics**

- Real-time email sending progress
- Success/failure rate tracking
- SMTP connection health monitoring
- User authentication status
- API usage statistics

## 🔐 **Security Best Practices**

1. **Environment Variables**: Never commit sensitive data
2. **Encryption**: All SMTP passwords are encrypted
3. **Authentication**: JWT-based with Supabase
4. **Rate Limiting**: Prevents abuse
5. **Input Validation**: Sanitize all user inputs
6. **HTTPS**: Always use secure connections in production

## 🌟 **Advanced Features**

- **DKIM Signing**: For custom domains
- **Template Variables**: Dynamic content replacement
- **Batch Processing**: Efficient bulk sending
- **Progress Tracking**: Real-time updates
- **Error Recovery**: Automatic retry mechanisms
- **Multi-Provider**: Switch between Gmail and SMTP

---

**Built with ❤️ for professional email marketing**