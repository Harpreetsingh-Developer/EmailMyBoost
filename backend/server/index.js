import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";
import path from "path";

import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

import { createClient } from "@supabase/supabase-js";
import smtpRouter from "./routes/smtp.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === "production" ? "../.env.production" : "../.env";
console.log("ENV FILE - ", envFile);
dotenv.config({ path: path.resolve(__dirname, envFile) });

console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`📁 Loading config from: ${envFile}`);

// Initialize Supabase (for JWT verification)
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://gtmndgwkahpkkcgsgext.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

console.log("🔧 Supabase Configuration:");
console.log(`  URL: ${supabaseUrl}`);
console.log(`  Using key: ${supabaseServiceKey ? 'Service Role Key' : (process.env.SUPABASE_KEY ? 'Backend Key' : 'Anon Key')}`);

console.log("🔧 Gmail API Configuration:");
console.log("  Using Supabase OAuth with Google provider");
console.log("  Gmail API ready for email sending via provider tokens");

const app = express();

// Dynamic CORS configuration for development and production
const allowedOrigins = [
  "http://localhost:5173", // Vite dev server
  "http://localhost:3000", // Frontend URL
  "http://localhost:5000", // Backend URL
  "https://app.emailmyboost.com", // Production frontend
  "https://emailmyboost.com", // Production domain (without subdomain)
];

// Get frontend URL from environment variable if available
const frontendUrl = process.env.FRONTEND_URL;
if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
  allowedOrigins.push(frontendUrl);
}

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log(`🚫 CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount SMTP routes
app.use("/api/smtp", smtpRouter);

// Supabase Authentication middleware
async function authenticateSupabase(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  const providerToken = req.headers["x-provider-token"];

  console.log("🔐 Supabase auth attempt:", {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    hasProviderToken: !!providerToken,
    tokenStart: token ? token.substring(0, 20) + "..." : "none",
  });

  if (!token) {
    return res
      .status(401)
      .json({ success: false, error: "Access token required" });
  }

  try {
    // Verify Supabase JWT token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    console.log("🔐 Supabase auth result:", {
      hasUser: !!user,
      userEmail: user?.email,
      provider: user?.app_metadata?.provider,
      hasProviderToken: !!providerToken,
      error: error?.message,
    });

    if (error || !user) {
      return res.status(403).json({
        success: false,
        error: "Invalid or expired token",
        details: error?.message,
      });
    }

    // Attach user info and provider token to request
    req.user = user;
    req.providerToken = providerToken;

    console.log("✅ Auth successful:", {
      email: user.email,
      provider: user.app_metadata?.provider,
      canSendEmails:
        !!providerToken && user.app_metadata?.provider === "google",
    });

    next();
  } catch (error) {
    console.error("❌ Supabase auth error:", error);
    return res.status(403).json({
      success: false,
      error: "Authentication failed",
      details: error.message,
    });
  }
}

// Enhanced helper function to wrap email content with professional styles
function wrapEmailWithStyles(content) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Email</title>
      <style>
        /* Reset styles */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        /* Base styles */
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6; 
          color: #333333;
          background-color: #f8f9fa;
          margin: 0;
          padding: 20px;
        }
        
        /* Main container */
        .email-container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        /* Header */
        .email-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px 40px;
          text-align: center;
        }
        
        .email-header h1 {
          color: #ffffff;
          font-size: 28px;
          font-weight: 600;
          margin: 0;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        /* Content area */
        .email-content { 
          padding: 40px;
        }
        
        /* Typography */
        h1, h2, h3, h4, h5, h6 { 
          color: #2c3e50; 
          margin-bottom: 16px;
          font-weight: 600;
        }
        
        h1 { font-size: 28px; line-height: 1.2; }
        h2 { font-size: 24px; line-height: 1.3; }
        h3 { font-size: 20px; line-height: 1.4; }
        
        p { 
          margin-bottom: 16px; 
          color: #555555;
          font-size: 16px;
        }
        
        /* Links */
        a { 
          color: #3498db; 
          text-decoration: none;
          font-weight: 500;
        }
        
        a:hover { 
          color: #2980b9; 
          text-decoration: underline;
        }
        
        /* Buttons */
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background-color: #3498db;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 10px 0;
          transition: background-color 0.3s ease;
        }
        
        .btn:hover {
          background-color: #2980b9;
          text-decoration: none;
        }
        
        .btn-primary { background-color: #3498db; }
        .btn-success { background-color: #27ae60; }
        .btn-warning { background-color: #f39c12; }
        .btn-danger { background-color: #e74c3c; }
        
        /* Lists */
        ul, ol {
          margin-bottom: 16px;
          padding-left: 20px;
        }
        
        li {
          margin-bottom: 8px;
          color: #555555;
        }
        
        /* Blockquotes */
        blockquote {
          border-left: 4px solid #3498db;
          padding-left: 20px;
          margin: 20px 0;
          font-style: italic;
          color: #666666;
        }
        
        /* Tables */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }
        
        th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #2c3e50;
        }
        
        /* Footer */
        /* Footer (disabled per user request) */
        .email-footer { display: none; }
        
        /* Responsive design */
        @media only screen and (max-width: 600px) {
          body { padding: 10px; }
          .email-header, .email-content, .email-footer { padding: 20px; }
          .email-header h1 { font-size: 24px; }
          h1 { font-size: 24px; }
          h2 { font-size: 20px; }
          h3 { font-size: 18px; }
        }
        
        /* Utility classes */
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .mb-0 { margin-bottom: 0; }
        .mb-1 { margin-bottom: 8px; }
        .mb-2 { margin-bottom: 16px; }
        .mb-3 { margin-bottom: 24px; }
        .mt-0 { margin-top: 0; }
        .mt-1 { margin-top: 8px; }
        .mt-2 { margin-top: 16px; }
        .mt-3 { margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-content">
          ${content}
        </div>
        <!-- Footer intentionally removed -->
      </div>
    </body>
    </html>
  `;
}

// Convert bare image URLs to <img> and normalize certain hosts (e.g., Gyazo)
function convertBareImageUrlsToImg(html) {
  if (!html) return html;

  const normalizeUrl = (url) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('gyazo.com') && !u.hostname.startsWith('i.')) {
        const id = u.pathname.split('/').filter(Boolean)[0];
        if (id) return `https://i.gyazo.com/${id}.png`;
      }
      return url;
    } catch (_) {
      return url;
    }
  };

  // Convert <a href="imgUrl">(any text)</a> into <img> when href looks like an image URL
  const anchorImgRegex = /<a\b[^>]*?href=["'](https?:\/\/[^"'>]+\.(?:png|jpg|jpeg|gif|webp|svg|avif|bmp|ico|tif|tiff|jfif|pjpeg|pjp|apng)(?:\?[^"'>]*)?)["'][^>]*>.*?<\/a>/gi;
  html = html.replace(anchorImgRegex, (_m, href) => {
    const normalized = normalizeUrl(href);
    return `<img src="${normalized}" alt="Image" style="max-width:100%; height:auto; border-radius:8px; margin:12px 0; display:block;"/>`;
  });

  // Also tolerate leading label like 'Image' and stray quotes
  const imageUrlRegex = /(?:^|\s)(?:Image\s*)?["']?(https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|svg|avif|bmp|ico|tif|tiff|jfif|pjpeg|pjp|apng))(\?[^\s"'<>]*)?["']?/gi;
  return html.replace(imageUrlRegex, (_match, url) => {
    const normalized = normalizeUrl(url);
    return `<img src="${normalized}" alt="Image" style="max-width:100%; height:auto; border-radius:8px; margin:12px 0; display:block;"/>`;
  });
}

// Extract image src URLs from HTML
function extractImageSrcUrls(html) {
  const urls = [];
  if (!html) return urls;
  const imgRegex = /<img\b[^>]*?src=["']([^"']+)["'][^>]*?>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    if (/^https?:\/\//i.test(src)) {
      urls.push(src);
    }
  }
  return urls;
}

// Normalize known landing-page URLs to direct images (e.g., Gyazo)
function normalizeUrlForImages(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('gyazo.com') && !u.hostname.startsWith('i.')) {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id) return `https://i.gyazo.com/${id}.png`;
    }
    return url;
  } catch (_) {
    return url;
  }
}

// Build a multipart/related raw email with inline image attachments (CID)
async function buildGmailRawWithInlineImages({ from, to, cc, bcc, subject, html }) {
  // Convert bare URLs to <img>
  let htmlWithImgs = convertBareImageUrlsToImg(html);
  htmlWithImgs = await convertUrlsToImagesByContentType(htmlWithImgs);
  // Collect all remote image URLs
  const urls = extractImageSrcUrls(htmlWithImgs);

  // Fetch images and assign content IDs
  const attachments = [];
  let processedHtml = htmlWithImgs;
  let index = 0;
  for (const url of urls) {
    try {
      const normalized = normalizeUrlForImages(url);
      const res = await fetch(normalized);
      if (!res.ok) continue;
      const arrayBuffer = await res.arrayBuffer();
      const content = Buffer.from(arrayBuffer).toString('base64');
      // Try to get content-type or infer from extension
      const ct = res.headers.get('content-type') || inferContentTypeFromUrl(normalized);
      const cid = `img_${Date.now()}_${index++}@emailmyboost`;
      attachments.push({ content, contentType: ct, cid, filename: fileNameFromUrl(normalized) });
      const origEsc = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const normEsc = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      processedHtml = processedHtml
        .replace(new RegExp(origEsc, 'g'), `cid:${cid}`)
        .replace(new RegExp(normEsc, 'g'), `cid:${cid}`);
    } catch (_) {
      // Skip failed fetches
    }
  }

  // Build MIME message
  const boundary = `mixed_${Date.now()}`;
  const relatedBoundary = `related_${Date.now()}`;

  const headers = [];
  headers.push(`From: ${from}`);
  headers.push(`To: ${to}`);
  if (cc && cc.trim()) headers.push(`Cc: ${cc}`);
  if (bcc && bcc.trim()) headers.push(`Bcc: ${bcc}`);
  headers.push(`Subject: ${subject || 'No Subject'}`);
  headers.push(`MIME-Version: 1.0`);
  headers.push(`Content-Type: multipart/related; boundary="${relatedBoundary}"`);

  const parts = [];
  // HTML part
  const wrapped = wrapEmailWithStyles(processedHtml);
  parts.push([
    `--${relatedBoundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    wrapped,
    ``
  ].join('\r\n'));

  // Image parts
  for (const att of attachments) {
    parts.push([
      `--${relatedBoundary}`,
      `Content-Type: ${att.contentType}`,
      `Content-Transfer-Encoding: base64`,
      `Content-ID: <${att.cid}>`,
      `Content-Disposition: inline; filename="${att.filename}"`,
      ``,
      att.content,
      ``
    ].join('\r\n'));
  }

  // Closing boundary
  parts.push(`--${relatedBoundary}--`);

  const raw = headers.join('\r\n') + '\r\n\r\n' + parts.join('\r\n');
  return raw;
}

function inferContentTypeFromUrl(url) {
  const lower = url.toLowerCase();
  if (lower.endsWith('.png') || lower.includes('.png?')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.includes('.jpg?') || lower.includes('.jpeg?')) return 'image/jpeg';
  if (lower.endsWith('.gif') || lower.includes('.gif?')) return 'image/gif';
  if (lower.endsWith('.webp') || lower.includes('.webp?')) return 'image/webp';
  if (lower.endsWith('.svg') || lower.includes('.svg?')) return 'image/svg+xml';
  if (lower.endsWith('.avif') || lower.includes('.avif?')) return 'image/avif';
  if (lower.endsWith('.bmp') || lower.includes('.bmp?')) return 'image/bmp';
  if (lower.endsWith('.ico') || lower.includes('.ico?')) return 'image/x-icon';
  if (lower.endsWith('.tif') || lower.endsWith('.tiff') || lower.includes('.tif?') || lower.includes('.tiff?')) return 'image/tiff';
  return 'application/octet-stream';
}

function fileNameFromUrl(url) {
  try {
    const u = new URL(url);
    const base = u.pathname.split('/').pop() || 'image';
    return base.split('?')[0];
  } catch (_) {
    return 'image';
  }
}

// Replace any bare URLs that are images (by checking Content-Type) with <img> tags
async function convertUrlsToImagesByContentType(html) {
  if (!html) return html;
  // Allow leading punctuation like @ or () before URLs
  const genericUrlRegex = /[\s\(\[@]?\b(https?:\/\/[^\s"'<>\)]+)/g;
  const urls = Array.from(new Set((html.match(genericUrlRegex) || [])));
  let result = html;
  // Also process anchors with non-extension URLs
  const anchorRegex = /<a\b[^>]*?href=["'](https?:\/\/[^"'>]+)["'][^>]*>.*?<\/a>/gi;
  const anchorHrefs = [];
  let am;
  while ((am = anchorRegex.exec(html)) !== null) {
    anchorHrefs.push(am[1]);
  }
  for (const aUrl of anchorHrefs) {
    try {
      const nu = normalizeUrlForImages(aUrl);
      let ct = '';
      try {
        const head = await fetch(nu, { method: 'HEAD' });
        ct = head.headers.get('content-type') || '';
      } catch (_) {}
      if (!ct || !ct.startsWith('image/')) {
        try {
          const getRes = await fetch(nu, { method: 'GET' });
          ct = getRes.headers.get('content-type') || '';
        } catch (_) {}
      }
      if (ct.startsWith('image/')) {
        const safe = aUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const anchorTagRegex = new RegExp(`<a[^>]*?href=["']${safe}["'][^>]*>.*?<\\/a>`, 'gi');
        result = result.replace(
          anchorTagRegex,
          `<img src="${nu}" alt="Image" style="max-width:100%; height:auto; border-radius:8px; margin:12px 0; display:block;"/>`
        );
      }
    } catch (_) {}
  }
  for (const url of urls) {
    // Skip if already used as an <img src="...">
    const usedAsImg = result.includes(`src="${url}`) || result.includes(`src='${url}`);
    if (usedAsImg) continue;
    try {
      const nu = normalizeUrlForImages(url);
      let ct = '';
      try {
        const head = await fetch(nu, { method: 'HEAD' });
        ct = head.headers.get('content-type') || '';
      } catch (_) {}
      if (!ct || !ct.startsWith('image/')) {
        try {
          const getRes = await fetch(nu, { method: 'GET' });
          ct = getRes.headers.get('content-type') || '';
        } catch (_) {}
      }
      if (ct.startsWith('image/')) {
        const safeUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const urlRegex = new RegExp(safeUrl, 'g');
        result = result.replace(
          urlRegex,
          `<img src="${nu}" alt="Image" style="max-width:100%; height:auto; border-radius:8px; margin:12px 0; display:block;"/>`
        );
      }
    } catch (_) {
      // Ignore failures
    }
  }
  return result;
}

// In-memory storage for email sending progress
const emailSendingProgress = new Map();

// ==================== GMAIL STATUS CHECK ====================

// Check Gmail connection status (using Supabase provider token)
app.get("/api/auth/google/gmail/status", authenticateSupabase, (req, res) => {
  try {
    const user = req.user;
    const providerToken = req.providerToken;
    const isGoogleUser = user.app_metadata?.provider === "google";

    res.json({
      success: true,
      connected: isGoogleUser && !!providerToken,
      email: user.email,
      provider: user.app_metadata?.provider,
      canSendEmails: isGoogleUser && !!providerToken,
    });
  } catch (error) {
    console.error("❌ Gmail status check failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check Gmail status",
      details: error.message,
    });
  }
});

// ==================== EMAIL SENDING ROUTES ====================

// Send email via Gmail API using Supabase provider token
app.post("/api/send-email", authenticateSupabase, async (req, res) => {
  try {
    const { to, subject, html, cc, bcc } = req.body;
    const user = req.user;
    const providerToken = req.providerToken;

    console.log(`📧 Supabase user ${user.email} sending email to ${to}`);

    // Check if user has Google provider token
    if (!providerToken || user.app_metadata?.provider !== "google") {
      return res.status(400).json({
        success: false,
        error:
          "Gmail not connected. Please sign in with Google to send emails.",
        needsAuth: true,
      });
    }

    // Set up Gmail API with Supabase provider token
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: providerToken,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Build multipart/related email with inline images
    const fromHeader = user.email;
    const raw = await buildGmailRawWithInlineImages({ from: fromHeader, to, cc, bcc, subject, html });
    const encodedEmail = Buffer.from(raw).toString("base64url");

    // Send email
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedEmail,
      },
    });

    console.log("✅ Email sent via Gmail API:", result.data.id);

    res.json({
      success: true,
      message: "Email sent successfully via Gmail",
      messageId: result.data.id,
      from: user.email,
      to: to,
      subject: subject,
    });
  } catch (error) {
    console.error("❌ Gmail email sending failed:", error);

    // Handle token refresh if needed
    if (error.code === 401 || error.status === 401) {
      return res.status(401).json({
        success: false,
        error: "Gmail access expired. Please sign in with Google again.",
        needsAuth: true,
      });
    }

    // Extract Gmail API error information
    const gmailApiError = extractGmailApiError(error);
    
    res.status(500).json({
      success: false,
      error: "Failed to send email via Gmail",
      details: error.message,
      gmailApiError: gmailApiError,
    });
  }
});

// Start bulk email sending with progress tracking
app.post(
  "/api/supabase/send-bulk-email/start",
  authenticateSupabase,
  async (req, res) => {
    try {
      const { recipients, subject, content, cc = "", bcc = "" } = req.body;
      const user = req.user;
      const providerToken = req.providerToken;

      // Check if user has Gmail access
      if (!providerToken || user.app_metadata?.provider !== "google") {
        return res.status(400).json({
          success: false,
          error:
            "Gmail not connected. Please sign in with Google to send emails.",
          needsAuth: true,
        });
      }

      if (
        !recipients ||
        !Array.isArray(recipients) ||
        recipients.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Recipients array is required",
        });
      }

      if (
        !subject ||
        subject.trim() === "" ||
        !content ||
        content.trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          error: "Subject and content are required",
        });
      }

      // Generate unique job ID
      const jobId = `bulk_${user.id}_${Date.now()}`;

      // Initialize progress tracking
      emailSendingProgress.set(jobId, {
        userId: user.id,
        total: recipients.length,
        sent: 0,
        failed: 0,
        current: "",
        status: "starting",
        results: [],
        startTime: new Date(),
        error: null,
      });

      console.log(
        `📧 Starting bulk email job ${jobId} for ${recipients.length} recipients`
      );

      // Start the email sending process asynchronously
      sendBulkEmailsAsync(
        jobId,
        user,
        recipients,
        subject,
        content,
        cc,
        bcc,
        req.providerToken
      );

      res.json({
        success: true,
        jobId: jobId,
        message: `Bulk email job started for ${recipients.length} recipients`,
        total: recipients.length,
      });
    } catch (error) {
      console.error("❌ Failed to start bulk email job:", error);
      res.status(500).json({
        success: false,
        error: "Failed to start bulk email job",
        details: error.message,
      });
    }
  }
);

// Get bulk email sending progress
app.get(
  "/api/supabase/send-bulk-email/progress/:jobId",
  authenticateSupabase,
  (req, res) => {
    try {
      const { jobId } = req.params;
      const user = req.user;

      const progress = emailSendingProgress.get(jobId);

      if (!progress) {
        return res.status(404).json({
          success: false,
          error: "Job not found",
        });
      }

      // Verify job belongs to user
      if (progress.userId !== user.id) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      res.json({
        success: true,
        progress: {
          jobId: jobId,
          total: progress.total,
          sent: progress.sent,
          failed: progress.failed,
          current: progress.current,
          status: progress.status,
          startTime: progress.startTime,
          error: progress.error,
          gmailApiError: progress.gmailApiError || null,
          results: progress.results || [],
        },
      });
    } catch (error) {
      console.error("❌ Failed to get progress:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get progress",
        details: error.message,
      });
    }
  }
);

// Async function to send bulk emails
async function sendBulkEmailsAsync(
  jobId,
  user,
  recipients,
  subject,
  content,
  cc,
  bcc,
  providerToken
) {
  const progress = emailSendingProgress.get(jobId);
  if (!progress) return;

  try {
    progress.status = "sending";

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const recipientEmail = getRecipientEmail(recipient);

      progress.current = recipientEmail;
      progress.sent = i;

      console.log(
        `📧 Sending email ${i + 1}/${recipients.length} to ${recipientEmail}`
      );

      // Log recipient data for debugging
      if (i === 0) {
        logRecipientData(recipient, i);
      }

      try {
        // Replace placeholders in subject and content
        const personalizedSubject = replacePlaceholders(subject, recipient);
        const personalizedContent = replacePlaceholders(content, recipient);

        console.log(
          `🔄 Personalized subject: ${personalizedSubject.substring(0, 100)}${
            personalizedSubject.length > 100 ? "..." : ""
          }`
        );
        console.log(
          `🔄 Content placeholders replaced: ${
            personalizedContent !== content ? "Yes" : "No"
          }`
        );

        // Send email via Gmail API using Supabase provider token
        if (!providerToken || user.app_metadata?.provider !== "google") {
          throw new Error(
            "Gmail not connected for user - please sign in with Google"
          );
        }

        // Set up Gmail API with Supabase provider token
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
          access_token: providerToken,
        });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // Build multipart/related email with inline images
        const fromHeader = user.email;
        const personalizedCC = cc && cc.trim() ? replacePlaceholders(cc, recipient) : '';
        const personalizedBCC = bcc && bcc.trim() ? replacePlaceholders(bcc, recipient) : '';
        let contentForImages = convertBareImageUrlsToImg(personalizedContent);
        contentForImages = await convertUrlsToImagesByContentType(contentForImages);
        const raw = await buildGmailRawWithInlineImages({ from: fromHeader, to: recipientEmail, cc: personalizedCC, bcc: personalizedBCC, subject: personalizedSubject, html: contentForImages });
        const encodedEmail = Buffer.from(raw).toString("base64url");

        // Send email
        const result = await gmail.users.messages.send({
          userId: "me",
          requestBody: {
            raw: encodedEmail,
          },
        });

        progress.results.push({
          email: recipientEmail,
          status: "sent",
          timestamp: new Date(),
        });

        console.log(`✅ Email sent to ${recipientEmail}`);
      } catch (emailError) {
        console.error(
          `❌ Failed to send email to ${recipientEmail}:`,
          emailError
        );
        
        // Extract Gmail API setup URL if present
        const gmailApiError = extractGmailApiError(emailError);
        
        progress.failed++;
        progress.results.push({
          email: recipientEmail,
          status: "failed",
          error: emailError.message,
          gmailApiError: gmailApiError,
          timestamp: new Date(),
        });
        
        // If this is a Gmail API not enabled error, stop the bulk process
        if (gmailApiError && gmailApiError.needsApiSetup) {
          console.log('🛑 Stopping bulk email due to Gmail API not enabled');
          progress.status = "failed";
          progress.error = `Gmail API not enabled. Please enable it first: ${gmailApiError.setupUrl}`;
          progress.gmailApiError = gmailApiError;
          break;
        }
      }
    }

    progress.sent = recipients.length - progress.failed;
    progress.status = "completed";
    progress.current = "";

    console.log(
      `✅ Bulk email job ${jobId} completed: ${progress.sent} sent, ${progress.failed} failed`
    );
  } catch (error) {
    console.error(`❌ Bulk email job ${jobId} failed:`, error);
    progress.status = "failed";
    progress.error = error.message;
  }
}

// Helper function to get email from recipient object
function getRecipientEmail(recipient) {
  const emailFields = ["email", "Email", "EMAIL", "e-mail", "E-mail"];

  for (const field of emailFields) {
    if (recipient[field] && recipient[field].includes("@")) {
      return recipient[field].trim();
    }
  }

  // Fallback: look for any field containing @
  for (const value of Object.values(recipient)) {
    if (typeof value === "string" && value.includes("@")) {
      return value.trim();
    }
  }

  return "unknown@example.com";
}

// Helper function to log recipient data for debugging
function logRecipientData(recipient, index) {
  console.log(`📊 Recipient ${index + 1} data:`, {
    email: getRecipientEmail(recipient),
    availableFields: Object.keys(recipient),
    sampleData: Object.entries(recipient)
      .slice(0, 3)
      .reduce((acc, [key, value]) => {
        acc[key] =
          typeof value === "string" && value.length > 50
            ? value.substring(0, 50) + "..."
            : value;
        return acc;
      }, {}),
  });
}

// Helper function to extract Gmail API error information
function extractGmailApiError(error) {
  const errorMessage = error.message || '';
  
  // Check for Gmail API not enabled error
  const gmailApiNotEnabledRegex = /Gmail API has not been used in project (\d+) before or it is disabled\. Enable it by visiting (https:\/\/console\.developers\.google\.com\/apis\/api\/gmail\.googleapis\.com\/overview\?project=\d+)/;
  const match = errorMessage.match(gmailApiNotEnabledRegex);
  
  if (match) {
    const [, projectId, setupUrl] = match;
    return {
      needsApiSetup: true,
      projectId: projectId,
      setupUrl: setupUrl,
      errorType: 'gmail_api_not_enabled',
      message: 'Gmail API is not enabled for this project',
      instructions: 'Please enable the Gmail API in Google Cloud Console and try again.'
    };
  }
  
  // Check for quota exceeded errors
  if (errorMessage.includes('quota exceeded') || errorMessage.includes('rate limit')) {
    return {
      needsApiSetup: false,
      errorType: 'quota_exceeded',
      message: 'Gmail API quota exceeded',
      instructions: 'Please wait a few minutes before trying again, or check your API quotas in Google Cloud Console.'
    };
  }
  
  // Check for authentication errors
  if (errorMessage.includes('invalid_grant') || errorMessage.includes('unauthorized') || error.code === 401) {
    return {
      needsApiSetup: false,
      errorType: 'auth_error',
      message: 'Gmail authentication expired or invalid',
      instructions: 'Please sign out and sign in again with Google to refresh your Gmail permissions.'
    };
  }
  
  // Check for insufficient permissions
  if (errorMessage.includes('insufficient permissions') || errorMessage.includes('scope')) {
    return {
      needsApiSetup: false,
      errorType: 'insufficient_permissions',
      message: 'Insufficient Gmail permissions',
      instructions: 'Please sign out and sign in again, making sure to grant Gmail sending permissions.'
    };
  }
  
  return null;
}

// Enhanced helper function to replace placeholders in text
function replacePlaceholders(text, data) {
  if (!text || !data) return text;

  let result = text;

  // Replace {{placeholder}} patterns with enhanced matching
  const placeholderRegex = /\{\{\s*([^}]+)\s*\}\}/g;
  result = result.replace(placeholderRegex, (match, key) => {
    const trimmedKey = key.trim();

    // Try exact match first
    if (data[trimmedKey] !== undefined) {
      return data[trimmedKey];
    }

    // Try lowercase match
    if (data[trimmedKey.toLowerCase()] !== undefined) {
      return data[trimmedKey.toLowerCase()];
    }

    // Try uppercase match
    if (data[trimmedKey.toUpperCase()] !== undefined) {
      return data[trimmedKey.toUpperCase()];
    }

    // Try case-insensitive search through all keys
    const matchingKey = Object.keys(data).find(
      (dataKey) => dataKey.toLowerCase() === trimmedKey.toLowerCase()
    );

    if (matchingKey && data[matchingKey] !== undefined) {
      return data[matchingKey];
    }

    // Try partial matches (for keys like "first_name" matching "firstname")
    const partialKey = Object.keys(data).find((dataKey) => {
      const normalizedDataKey = dataKey.toLowerCase().replace(/[_\s-]/g, "");
      const normalizedSearchKey = trimmedKey
        .toLowerCase()
        .replace(/[_\s-]/g, "");
      return normalizedDataKey === normalizedSearchKey;
    });

    if (partialKey && data[partialKey] !== undefined) {
      return data[partialKey];
    }

    // If no match found, return the original placeholder
    console.log(
      `⚠️ Placeholder not found: ${match} (available keys: ${Object.keys(
        data
      ).join(", ")})`
    );
    return match;
  });

  return result;
}

// ==================== HEALTH CHECK ====================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "EmailMyBoost API Server",
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    features: [
      "Supabase Authentication",
      "Bulk Email Sending",
      "Progress Tracking",
    ],
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 EmailMyBoost API Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Authentication: Supabase JWT`);
  console.log(`📧 Email service: Ready for implementation`);
});
