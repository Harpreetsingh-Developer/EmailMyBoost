import React, { useState, useEffect, useRef } from "react";
import { CheckCircle, Plus, Minus, User, LogOut, Settings } from "lucide-react";
import {
  processTemplate,
  processRecipients,
  replacePlaceholders,
} from "../utils/fileProcessing";
import { SimpleEmailPreview } from "./SimpleEmailPreview";
import { Footer } from "./Footer";
import img from "../Logo.jpg";
import { useAuth } from "../hooks/useAuth";
import GmailAuthFlow from "./GmailAuthFlow";
import { SMTPSettings } from "./SMTPSettings";

function EmailAppSupabase() {
  // Use Supabase authentication with Gmail permissions
  const { user, canSendEmails, signOut } = useAuth();
  const [showAuthFlow, setShowAuthFlow] = useState(!canSendEmails);

  // Email composition state
  const [templateType, setTemplateType] = useState("manual");
  const [editorContent, setEditorContent] = useState("");
  const [recipients, setRecipients] = useState<
    Array<{ [key: string]: string }>
  >([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [emailContent, setEmailContent] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [ccEmails, setCcEmails] = useState("");
  const [bccEmails, setBccEmails] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<{
    [key: string]: string;
  } | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  
  // SMTP Configuration state
  const [showSMTPSettings, setShowSMTPSettings] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState<any>(null);
  const [emailProvider, setEmailProvider] = useState<'gmail' | 'smtp'>('gmail');

  // ✅ Auto-update attachments based on template type and uploaded files
  useEffect(() => {
    if (templateType === "manual" && csvFile) {
      setAttachments([csvFile]);
    } else if (templateType === "upload" && csvFile && templateFile) {
      setAttachments([csvFile, templateFile]);
    } else {
      setAttachments([]);
    }
  }, [templateType, csvFile, templateFile]);

  // Load SMTP configuration on component mount
  useEffect(() => {
    const saved = localStorage.getItem('smtp_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSmtpConfig(parsed);
        setEmailProvider('smtp');
      } catch (error) {
        console.error('Failed to parse saved SMTP config:', error);
      }
    }
  }, []);

  const placeholders = [
    { value: "name", label: "Name" },
    { value: "email", label: "Email" },
    { value: "company", label: "Company" },
    { value: "position", label: "Position" },
    { value: "phone", label: "Phone" },
    { value: "image", label: "Image" },
    { value: "address", label: "Address" },
    { value: "city", label: "City" },
    { value: "country", label: "Country" },
    { value: "Client business name", label: "Client Business Name" },
    { value: "Client traffic", label: "Client Traffic" },
    { value: "Competitor business name", label: "Competitor Business Name" },
    { value: "Competitor traffic", label: "Competitor Traffic" },
    { value: "custom", label: "Custom Field" },
  ];

  const getRecipientEmail = (recipient: { [key: string]: string }) => {
    const emailFields = [
      "email",
      "Email",
      "EMAIL",
      "e-mail",
      "E-mail",
      "emailAddress",
      "email_address",
    ];

    for (const field of emailFields) {
      if (recipient[field] && recipient[field].includes("@")) {
        return recipient[field].trim();
      }
    }

    // If no email field found, return the first field that looks like an email
    for (const value of Object.values(recipient)) {
      if (typeof value === "string" && value.includes("@")) {
        return value.trim();
      }
    }

    return "No email found";
  };

  const getRecipientName = (recipient: { [key: string]: string }) => {
    // Check multiple possible name fields
    const nameFields = [
      "name",
      "Name",
      "NAME",
      "first_name",
      "firstName",
      "First Name",
      "FIRST_NAME",
    ];

    for (const field of nameFields) {
      if (recipient[field] && recipient[field].trim()) {
        return recipient[field].trim();
      }
    }

    // If no name found, return email prefix
    const email = getRecipientEmail(recipient);
    return email.split("@")[0] || "Unknown";
  };

  const toggleAllRecipients = () => {
    if (selectedRecipients.length === recipients.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(recipients.map((r) => getRecipientEmail(r)));
    }
  };

  const toggleRecipient = (email: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handlePreview = (recipient: { [key: string]: string }) => {
    setSelectedRecipient(recipient);
    setShowPreview(true);
  };

  const handlePreviewAll = () => {
    setSelectedRecipient(null);
    setShowPreview(true);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handlePlaceholderInsert = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      const placeholder = `{{${value}}}`;

      // Check if subject input is focused (only for manual template)
      const subjectInput = document.getElementById(
        "email-subject"
      ) as HTMLInputElement;
      const ccInput = document.getElementById("cc-emails") as HTMLInputElement;
      const bccInput = document.getElementById(
        "bcc-emails"
      ) as HTMLInputElement;

      if (
        templateType === "manual" &&
        document.activeElement === subjectInput
      ) {
        const start = subjectInput.selectionStart || subjectInput.value.length;
        const end = subjectInput.selectionEnd || subjectInput.value.length;
        const newValue =
          subjectInput.value.substring(0, start) +
          placeholder +
          subjectInput.value.substring(end);
        setEmailSubject(newValue);

        // Set cursor position after inserted placeholder
        setTimeout(() => {
          subjectInput.focus();
          const newPosition = start + placeholder.length;
          subjectInput.setSelectionRange(newPosition, newPosition);
        }, 0);
      } else if (document.activeElement === ccInput) {
        const start = ccInput.selectionStart || ccInput.value.length;
        const end = ccInput.selectionEnd || ccInput.value.length;
        const newValue =
          ccInput.value.substring(0, start) +
          placeholder +
          ccInput.value.substring(end);
        setCcEmails(newValue);

        setTimeout(() => {
          ccInput.focus();
          const newPosition = start + placeholder.length;
          ccInput.setSelectionRange(newPosition, newPosition);
        }, 0);
      } else if (document.activeElement === bccInput) {
        const start = bccInput.selectionStart || bccInput.value.length;
        const end = bccInput.selectionEnd || bccInput.value.length;
        const newValue =
          bccInput.value.substring(0, start) +
          placeholder +
          bccInput.value.substring(end);
        setBccEmails(newValue);

        setTimeout(() => {
          bccInput.focus();
          const newPosition = start + placeholder.length;
          bccInput.setSelectionRange(newPosition, newPosition);
        }, 0);
      } else {
        // Insert into content editor (only for manual template)
        if (templateType === "manual" && editorRef.current) {
          // Focus the editor first to ensure it's active
          editorRef.current.focus();

          // Try to get current selection
          const selection = window.getSelection();

          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);

            // Check if the selection is within our editor
            if (editorRef.current.contains(range.commonAncestorContainer)) {
              // Insert at cursor position
              const textNode = document.createTextNode(placeholder);
              range.deleteContents();
              range.insertNode(textNode);

              // Move cursor after the inserted text
              range.setStartAfter(textNode);
              range.setEndAfter(textNode);
              selection.removeAllRanges();
              selection.addRange(range);
            } else {
              // Selection is not in editor, append to end
              editorRef.current.textContent += placeholder;

              // Move cursor to end
              const newRange = document.createRange();
              newRange.selectNodeContents(editorRef.current);
              newRange.collapse(false);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          } else {
            // No selection, append to end and set cursor there
            editorRef.current.textContent += placeholder;

            // Move cursor to end
            const newRange = document.createRange();
            newRange.selectNodeContents(editorRef.current);
            newRange.collapse(false);
            const sel = window.getSelection();
            if (sel) {
              sel.removeAllRanges();
              sel.addRange(newRange);
            }
          }

          // Update the editor content state
          setEditorContent(editorRef.current.textContent || "");
        }
      }

      // Reset the select to show placeholder text
      e.target.value = "";
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      try {
        const recipientList = await processRecipients(file);
        setRecipients(recipientList);
        setError(null);
      } catch (error) {
        console.error("Error processing CSV:", error);
        setError("Failed to process CSV file. Please check the format.");
        setRecipients([]);
      }
    }
  };

  const handleTemplateUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setTemplateFile(file);
      try {
        const templateData = await processTemplate(file);

        // Set both subject and content from template
        if (typeof templateData === "string") {
          setEmailContent(templateData);
          setEmailSubject(""); // No subject extracted from string
        } else {
          setEmailContent(templateData.content);
          setEmailSubject(templateData.subject || ""); // Set extracted subject
        }

        setError(null);
      } catch (error) {
        console.error("Error processing template:", error);
        setError("Failed to process template file. Please check the format.");
        setEmailContent("");
      }
    }
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      setEditorContent(editorRef.current.textContent || "");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("Please sign in to send emails");
      return;
    }

    // Check if user has either Gmail permissions or SMTP configuration
    if (!canSendEmails && !smtpConfig) {
      setError("Please configure either Gmail OAuth or SMTP settings to send emails");
      if (!canSendEmails) {
        setShowAuthFlow(true);
      } else {
        setShowSMTPSettings(true);
      }
      return;
    }

    if (selectedRecipients.length === 0) {
      setError("Please select at least one recipient");
      return;
    }

    if (templateType === "manual" && !editorContent.trim()) {
      setError("Please enter message content");
      return;
    }

    if (templateType === "upload" && !emailContent.trim()) {
      setError("Please upload a template");
      return;
    }

    // Open preview with selected recipients
    const recipientsToSend = recipients.filter((r) =>
      selectedRecipients.includes(getRecipientEmail(r))
    );
    if (recipientsToSend.length > 0) {
      setSelectedRecipient(null);
      setShowPreview(true);
    }
  };

  // Handle successful Gmail authentication
  const handleAuthComplete = () => {
    setShowAuthFlow(false);
    setError(null);
  };

  // Show Gmail authentication flow if needed
  if (showAuthFlow || !canSendEmails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <GmailAuthFlow onAuthComplete={handleAuthComplete} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with user info */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img
                src={img}
                alt="EmailmyBoost"
                className="w-8 h-8 rounded-full mr-3"
              />
              <h1 className="text-xl font-semibold text-gray-900">
                EmailmyBoost
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Email Provider Badge */}
              <div className="flex items-center space-x-2">
                {emailProvider === 'smtp' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    🟣 Custom SMTP
                  </span>
                ) : user && user.app_metadata?.provider === "google" ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    🔴 Google OAuth
                  </span>
                ) : user && user.app_metadata?.provider === "azure" ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    🔵 Microsoft OAuth
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    📧 Email Auth
                  </span>
                )}
                
                {/* SMTP Settings Button */}
                <button
                  onClick={() => setShowSMTPSettings(true)}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Configure SMTP Settings"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  SMTP
                </button>
              </div>

              {/* User Info */}
              {user && (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{user.email}</span>
                  <span className="text-xs text-gray-500">
                    ({user.app_metadata?.provider || "email"})
                  </span>
                </div>
              )}

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center p-4">
        <form
          onSubmit={handleFormSubmit}
          className="bg-white shadow-md rounded-lg p-6 w-full max-w-3xl"
        >
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                {error}
              </div>
            )}

            {/* Show info for authenticated users */}
            {user && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded relative">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <div>
                    <strong>Ready to Send Emails</strong>
                    <p className="text-sm mt-1">
                      {emailProvider === 'smtp' ? (
                        <>
                          Using custom SMTP server: <strong>{smtpConfig?.host}</strong>
                          <br />
                          <span className="text-xs text-green-700">
                            Sending from: {smtpConfig?.fromEmail}
                          </span>
                        </>
                      ) : (
                        <>
                          You're signed in with{" "}
                          {user.app_metadata?.provider || "email"}.
                          {user.app_metadata?.provider
                            ? " OAuth integration ready."
                            : " Email authentication active."}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Template Creation Method
              </label>
              <select
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={templateType}
                onChange={(e) => {
                  setTemplateType(e.target.value);
                  setEmailContent("");
                  setEmailSubject("");
                  setEditorContent("");
                }}
              >
                <option value="manual">Create Template Manually</option>
                <option value="upload">Upload Template</option>
              </select>
            </div>

            {templateType === "upload" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Upload Template
                </label>
                <div className="mt-1 flex items-center space-x-2">
                  <select
                    className="block w-1/3 rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(e) => {
                      const input = document.getElementById(
                        "template-file"
                      ) as HTMLInputElement;
                      if (input) {
                        input.accept = e.target.value;
                      }
                    }}
                  >
                    <option value=".docx">Word Document (.docx)</option>
                    <option value=".txt">Text File (.txt)</option>
                  </select>
                  <input
                    id="template-file"
                    type="file"
                    accept=".docx"
                    onChange={handleTemplateUpload}
                    className="block w-2/3 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Upload Recipients (CSV)
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {recipients.length > 0 && (
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">
                    Recipients ({recipients.length})
                  </h3>
                  <div className="space-x-4">
                    <button
                      type="button"
                      onClick={toggleAllRecipients}
                      className="text-sm text-blue-500 hover:text-blue-700"
                    >
                      {selectedRecipients.length === recipients.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                    {selectedRecipients.length > 0 && (
                      <button
                        type="button"
                        onClick={handlePreviewAll}
                        className="text-sm text-green-500 hover:text-green-700"
                      >
                        Preview Selected ({selectedRecipients.length})
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {recipients.map((recipient, index) => {
                    const recipientEmail = getRecipientEmail(recipient);
                    const recipientName = getRecipientName(recipient);

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedRecipients.includes(
                              recipientEmail
                            )}
                            onChange={() => toggleRecipient(recipientEmail)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {recipientName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {recipientName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {recipientEmail}
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePreview(recipient)}
                          className="text-sm text-blue-500 hover:text-blue-700 px-3 py-1 rounded border border-blue-200 hover:bg-blue-50"
                        >
                          Preview
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Show placeholders section only for manual template */}
            {templateType === "manual" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Available Placeholders
                </label>
                <select
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onChange={handlePlaceholderInsert}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a placeholder to insert
                  </option>
                  {placeholders.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Click on subject, CC, BCC, or content field first, then select
                  a placeholder to insert it at the cursor position
                </p>
              </div>
            )}

            {/* Subject field - only shown for manual template */}
            {templateType === "manual" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  id="email-subject"
                  type="text"
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject"
                />
              </div>
            )}

            {/* CC/BCC Toggle */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="flex items-center text-sm text-blue-600 hover:text-blue-700"
              >
                {showCcBcc ? (
                  <Minus className="w-4 h-4 mr-1" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                {showCcBcc ? "Hide" : "Add"} CC/BCC
              </button>
            </div>

            {showCcBcc && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    CC
                  </label>
                  <input
                    id="cc-emails"
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={ccEmails}
                    onChange={(e) => setCcEmails(e.target.value)}
                    placeholder="CC emails (comma separated)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    BCC
                  </label>
                  <input
                    id="bcc-emails"
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={bccEmails}
                    onChange={(e) => setBccEmails(e.target.value)}
                    placeholder="BCC emails (comma separated)"
                  />
                </div>
              </div>
            )}

            {templateType === "manual" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Message Content
                </label>
                <div className="mt-1 border rounded-md shadow-sm">
                  <div className="border-b px-3 py-2 flex space-x-2">
                    <button
                      type="button"
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <strong>B</strong>
                    </button>
                    <button
                      type="button"
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <em>I</em>
                    </button>
                    <button
                      type="button"
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <u>U</u>
                    </button>
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="p-3 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                    onInput={handleContentChange}
                    data-placeholder="Type your message here..."
                    style={{
                      direction: "ltr",
                      textAlign: "left",
                      unicodeBidi: "plaintext",
                    }}
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Click in the content area above, then select a placeholder to
                  insert it at your cursor position
                </p>
              </div>
            )}

            {/* Show uploaded template content for upload type */}
            {templateType === "upload" && (emailContent || emailSubject) && (
              <div className="bg-gray-50 rounded-lg overflow-hidden border">
                <div className="bg-gray-100 px-4 py-3 border-b">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Uploaded Template Content
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Subject and content extracted from your template.
                    {recipients.length > 0
                      ? " Preview shows placeholders replaced with data from the first recipient."
                      : " Placeholders will be replaced with actual recipient data when you upload recipients."}
                  </p>
                </div>
                <div className="p-6">
                  {emailSubject && (
                    <div className="mb-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                        <div className="bg-blue-100 px-4 py-2 border-b border-blue-200">
                          <h4 className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
                            Subject Line
                          </h4>
                        </div>
                        <div className="p-4">
                          <div className="text-gray-800 font-medium">
                            {recipients.length > 0
                              ? replacePlaceholders(emailSubject, recipients[0])
                              : emailSubject}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {emailContent && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-green-50 px-4 py-3 border-b border-green-200">
                        <h4 className="text-sm font-semibold text-green-800 uppercase tracking-wide">
                          Email Content
                        </h4>
                      </div>
                      <div className="p-4">
                        <div className="text-gray-800 whitespace-pre-wrap">
                          <div
                            dangerouslySetInnerHTML={{
                              __html:
                                recipients.length > 0
                                  ? replacePlaceholders(
                                      emailContent,
                                      recipients[0]
                                    )
                                  : emailContent,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Preview & Send Emails
              </button>

              {selectedRecipients.length > 0 && (
                <span className="text-sm text-gray-600 self-center">
                  {selectedRecipients.length} recipient
                  {selectedRecipients.length !== 1 ? "s" : ""} selected
                </span>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Email Preview Modal */}
      {showPreview && (
        <SimpleEmailPreview
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          recipients={
            selectedRecipient
              ? [selectedRecipient]
              : recipients.filter((r) =>
                  selectedRecipients.includes(getRecipientEmail(r))
                )
          }
          subject={emailSubject}
          content={templateType === "manual" ? editorContent : emailContent}
          ccEmails={ccEmails}
          bccEmails={bccEmails}
          attachments={attachments}
          user={user}
          smtpConfig={smtpConfig}
          emailProvider={emailProvider}
        />
      )}

      {/* SMTP Settings Modal */}
      <SMTPSettings
        isOpen={showSMTPSettings}
        onClose={() => setShowSMTPSettings(false)}
        onConfigSaved={(config) => {
          setSmtpConfig(config);
          setEmailProvider('smtp');
        }}
      />

      <Footer />
      {/* <FeedbackForm /> */}
    </div>
  );
}

export default EmailAppSupabase;
