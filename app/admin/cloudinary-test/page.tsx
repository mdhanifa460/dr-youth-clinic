'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Loader, RefreshCw } from 'lucide-react';

interface CloudinaryConfig {
  cloudName: string | undefined;
  hasApiKey: boolean;
  hasApiSecret: boolean;
}

interface DiagnosticResult {
  connected: boolean;
  message: string;
  stats?: any;
  config?: CloudinaryConfig;
}

export default function CloudinaryDiagnosticsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState('');

  const runDiagnostics = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('🔍 Running Cloudinary diagnostics...');

      // Check environment variables on client side
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

      const config: CloudinaryConfig = {
        cloudName,
        hasApiKey: !!process.env.CLOUDINARY_API_KEY,
        hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
      };

      if (!cloudName) {
        setError('Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
        setResult({
          connected: false,
          message: '❌ Cloudinary cloud name not configured',
          config,
        });
        setLoading(false);
        return;
      }

      // Call diagnostics API
      const response = await fetch('/api/cloudinary/diagnostics');
      const data = await response.json();

      console.log('📊 Diagnostics result:', data);

      setResult({
        ...data,
        config,
      });
    } catch (err: any) {
      console.error('❌ Diagnostic error:', err);
      setError(err.message || 'Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🔍 Cloudinary Diagnostics
        </h1>
        <p className="text-gray-600">
          Test your Cloudinary connection and configuration
        </p>
      </div>

      {/* CONTROLS */}
      <button
        onClick={runDiagnostics}
        disabled={loading}
        className="flex gap-2 items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
      >
        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Testing...' : 'Run Diagnostics'}
      </button>

      {/* LOADING */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-red-800">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {result && !loading && (
        <div className="space-y-6">
          {/* CONNECTION STATUS */}
          <div
            className={`p-6 rounded-lg border-2 ${
              result.connected
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex gap-3 items-start">
              {result.connected ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <h3
                  className={`font-bold text-lg ${
                    result.connected
                      ? 'text-green-800'
                      : 'text-red-800'
                  }`}
                >
                  {result.message}
                </h3>
              </div>
            </div>
          </div>

          {/* CONFIGURATION */}
          {result.config && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-4">Configuration</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cloud Name:</span>
                  <code className="bg-gray-100 px-3 py-1 rounded">
                    {result.config.cloudName || '❌ Not set'}
                  </code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">API Key:</span>
                  <span
                    className={
                      result.config.hasApiKey
                        ? 'text-green-600 font-bold'
                        : 'text-red-600 font-bold'
                    }
                  >
                    {result.config.hasApiKey ? '✅ Configured' : '❌ Not set'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">API Secret:</span>
                  <span
                    className={
                      result.config.hasApiSecret
                        ? 'text-green-600 font-bold'
                        : 'text-red-600 font-bold'
                    }
                  >
                    {result.config.hasApiSecret ? '✅ Configured' : '❌ Not set'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* USAGE STATISTICS */}
          {result.stats && result.connected && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-4">Usage Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-gray-600 text-sm">Storage Used</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {result.stats.storage}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <p className="text-gray-600 text-sm">Bandwidth Used</p>
                  <p className="text-2xl font-bold text-green-600">
                    {result.stats.bandwidth}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded">
                  <p className="text-gray-600 text-sm">API Requests</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {result.stats.requests || '—'}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded">
                  <p className="text-gray-600 text-sm">Transformations</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {result.stats.transformations || '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TROUBLESHOOTING */}
          {!result.connected && (
            <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
              <h3 className="font-bold text-yellow-800 mb-3">
                🔧 Troubleshooting Steps
              </h3>
              <ol className="space-y-2 text-yellow-900 text-sm list-decimal list-inside">
                <li>Sign up for Cloudinary: https://cloudinary.com</li>
                <li>Go to Dashboard → Settings → API Keys</li>
                <li>Copy your Cloud Name, API Key, and API Secret</li>
                <li>
                  Update <code className="bg-white px-2 py-1">.env.local</code>:
                  <div className="bg-white p-2 rounded mt-2 text-xs font-mono">
                    <p>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name</p>
                    <p>CLOUDINARY_API_KEY=your_api_key</p>
                    <p>CLOUDINARY_API_SECRET=your_api_secret</p>
                  </div>
                </li>
                <li>Restart your development server</li>
                <li>Run diagnostics again</li>
              </ol>
            </div>
          )}

          {/* SUCCESS MESSAGE */}
          {result.connected && (
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="font-bold text-green-800 mb-2">
                ✅ You're Ready!
              </h3>
              <p className="text-green-700 text-sm">
                Your Cloudinary credentials are correctly configured. You can
                now upload images in the services management panel.
              </p>
              <a
                href="/admin/services"
                className="inline-block mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
              >
                Go to Services
              </a>
            </div>
          )}
        </div>
      )}

      {/* INFO */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm text-blue-800">
        <p className="font-semibold mb-2">📌 Quick Links:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <a
              href="https://cloudinary.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              Cloudinary Dashboard
            </a>
          </li>
          <li>
            <a
              href="https://cloudinary.com/console"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              API Keys & Credentials
            </a>
          </li>
          <li>
            <a
              href="/admin/services"
              className="underline hover:no-underline"
            >
              Services Management
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
