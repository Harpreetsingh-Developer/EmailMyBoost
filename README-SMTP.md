# SMTP Configuration Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Features](#features)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Usage](#usage)
   - [Adding a New SMTP Configuration](#adding-a-new-smtp-configuration)
   - [Editing an Existing Configuration](#editing-an-existing-configuration)
   - [Testing SMTP Connection](#testing-smtp-connection)
   - [Setting as Default](#setting-as-default)
   - [DKIM Configuration](#dkim-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Security Considerations](#security-considerations)

## Introduction
This guide provides comprehensive instructions for configuring and using the SMTP email sending functionality in your application. The SMTP configuration allows you to send emails through your preferred email service provider.

## Features
- Multiple SMTP configurations
- Test connection functionality
- DKIM email signing support
- Secure password handling
- Default configuration option
- Responsive form interface

## Prerequisites
- Node.js 16+ and npm/yarn
- React 18+
- React Hook Form
- Zod for validation
- Access to an SMTP server

## Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
3. Copy `.env.example` to `.env` and configure your environment variables

## Configuration
Create a `.env` file in the root directory with the following variables:

```env
# SMTP Configuration
VITE_API_URL=http://localhost:3000
# Add other environment variables as needed
```

## Usage

### Adding a New SMTP Configuration
1. Navigate to the SMTP Configuration page
2. Click "Add New Configuration"
3. Fill in the required fields:
   - Configuration Name: A friendly name for this SMTP configuration
   - SMTP Host: Your SMTP server address (e.g., smtp.example.com)
   - Port: SMTP port (typically 465, 587, or 25)
   - Connection Security: Select TLS/SSL or None (not recommended)
   - Username: Your SMTP username
   - Password: Your SMTP password
   - From Email: The email address that will appear as the sender
   - From Name: (Optional) The name that will appear as the sender
4. Click "Save Configuration"

### Editing an Existing Configuration
1. Navigate to the SMTP Configuration page
2. Click on the configuration you want to edit
3. Update the necessary fields
4. Note: Leave the password fields blank to keep the existing password
5. Click "Update Configuration"

### Testing SMTP Connection
1. Fill in the SMTP configuration details
2. Click on the "Test Connection" tab
3. Enter a test email address
4. Click "Test Connection"
5. Check your email inbox for a test message

### Setting as Default
1. In the configuration form, enable "Set as default configuration"
2. Save the configuration
3. This configuration will be used for all outgoing emails when no specific configuration is selected

### DKIM Configuration (Optional)
1. Enable "Enable DKIM Signing"
2. Fill in the following fields:
   - DKIM Selector: Typically 'default' or 's1' (check your DNS provider)
   - DKIM Domain: Your domain name (e.g., example.com)
   - DKIM Private Key: Your private key for DKIM signing

## Troubleshooting

### Common Issues
1. **Connection Failed**
   - Verify your SMTP server address and port
   - Check your username and password
   - Ensure your network allows outbound SMTP connections
   - Verify if your email provider requires app passwords

2. **Emails Marked as Spam**
   - Configure proper SPF, DKIM, and DMARC records
   - Use a valid "From" address
   - Avoid using free email providers for sending

3. **Authentication Errors**
   - Verify your username and password
   - Check if your account requires 2FA or app passwords
   - Ensure your account is not locked

## Security Considerations
1. Always use secure connections (TLS/SSL)
2. Never commit sensitive information to version control
3. Use environment variables for sensitive data
4. Regularly rotate SMTP passwords
5. Monitor email sending activity for abuse

## Support
For additional help, please contact support@example.com or open an issue in our GitHub repository.
