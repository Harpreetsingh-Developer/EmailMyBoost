import React from 'react';
import { Mail, Shield, Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <div className="bg-blue-500 rounded-lg p-2 mr-3">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">EmailMyBoost</h3>
            </div>
            <p className="text-gray-600 mb-4 max-w-md">
              Professional email campaign management platform designed to help businesses 
              reach their audience effectively with personalized, secure email marketing solutions.
            </p>
            <div className="flex items-center text-sm text-gray-500">
              <Shield className="w-4 h-4 mr-2" />
              <span>Enterprise-grade security & privacy</span>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Features
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>Bulk Email Campaigns</li>
              <li>Template Management</li>
              <li>Recipient Analytics</li>
              <li>Custom Placeholders</li>
              <li>File Attachments</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Support
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>Documentation</li>
              <li>API Reference</li>
              <li>Help Center</li>
              <li>Contact Support</li>
              <li>Status Page</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center text-sm text-gray-500 mb-4 md:mb-0">
              <span>© {currentYear} MyEmailBoost. All rights reserved.</span>
              <span className="mx-2">•</span>
              <span>Built with</span>
              <Heart className="w-4 h-4 mx-1 text-red-500" />
              <span>for better communication</span>
            </div>
            <div className="flex space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-700 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gray-700 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-gray-700 transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}