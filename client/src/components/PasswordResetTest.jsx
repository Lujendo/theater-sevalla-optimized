import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import PasswordInput from './ui/PasswordInput';

const PasswordResetTest = () => {
  const [testData, setTestData] = useState({
    userId: '',
    newPassword: '',
    testPassword: ''
  });
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fixResults, setFixResults] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTestData(prev => ({ ...prev, [name]: value }));
  };

  const testPasswordReset = async () => {
    if (!testData.userId || !testData.newPassword) {
      toast.error('Please fill in User ID and New Password');
      return;
    }

    setLoading(true);
    setTestResults(null);

    try {
      // Step 1: Reset password
      console.log('🧪 Testing password reset...');
      const resetResponse = await axios.put(`/api/auth/users/${testData.userId}/password`, {
        newPassword: testData.newPassword
      });
      
      console.log('🧪 Reset response:', resetResponse.data);
      
      // Step 2: Get user info to verify
      const userResponse = await axios.get('/api/auth/users');
      const user = userResponse.data.users.find(u => u.id === parseInt(testData.userId));
      
      if (!user) {
        throw new Error('User not found');
      }

      setTestResults({
        resetSuccess: true,
        resetMessage: resetResponse.data.message,
        user: user,
        timestamp: new Date().toISOString()
      });

      toast.success('Password reset test completed successfully');
    } catch (error) {
      console.error('🧪 Password reset test failed:', error);
      setTestResults({
        resetSuccess: false,
        error: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString()
      });
      toast.error('Password reset test failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    if (!testData.testPassword) {
      toast.error('Please enter a password to test login');
      return;
    }

    if (!testResults?.user) {
      toast.error('Please run password reset test first');
      return;
    }

    setLoading(true);

    try {
      console.log('🧪 Testing login with new password...');
      const loginResponse = await axios.post('/api/auth/login', {
        username: testResults.user.username,
        password: testData.testPassword
      });

      console.log('🧪 Login response:', loginResponse.data);
      
      setTestResults(prev => ({
        ...prev,
        loginSuccess: true,
        loginMessage: 'Login successful',
        loginTimestamp: new Date().toISOString()
      }));

      toast.success('Login test successful');
    } catch (error) {
      console.error('🧪 Login test failed:', error);
      setTestResults(prev => ({
        ...prev,
        loginSuccess: false,
        loginError: error.response?.data?.message || error.message,
        loginTimestamp: new Date().toISOString()
      }));
      toast.error('Login test failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fixUnhashedPasswords = async () => {
    setLoading(true);
    setFixResults(null);

    try {
      console.log('🔧 Running password hash fix...');
      const response = await axios.post('/api/auth/fix-passwords');

      console.log('🔧 Fix response:', response.data);

      setFixResults({
        success: true,
        message: response.data.message,
        timestamp: response.data.timestamp
      });

      toast.success('Password hash fix completed successfully');
    } catch (error) {
      console.error('🔧 Password fix failed:', error);
      setFixResults({
        success: false,
        error: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString()
      });
      toast.error('Password fix failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Password Reset Test Tool</h2>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            User ID to Test
          </label>
          <input
            type="number"
            name="userId"
            value={testData.userId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter user ID (e.g., 1, 2, 3)"
          />
        </div>

        <PasswordInput
          id="newPassword"
          label="New Password"
          value={testData.newPassword}
          onChange={(e) => setTestData(prev => ({ ...prev, newPassword: e.target.value }))}
          placeholder="Enter new password (min 6 chars)"
        />

        <PasswordInput
          id="testPassword"
          label="Test Login Password"
          value={testData.testPassword}
          onChange={(e) => setTestData(prev => ({ ...prev, testPassword: e.target.value }))}
          placeholder="Password to test login with"
        />
      </div>

      <div className="space-y-4 mb-6">
        {/* Password Fix Section */}
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-800 mb-2">🔧 Fix Unhashed Passwords</h3>
          <p className="text-sm text-red-700 mb-3">
            If users can't login after password reset, their passwords might be stored as plain text.
            Click this button to automatically hash all plain text passwords in the database.
          </p>
          <button
            onClick={fixUnhashedPasswords}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Fixing...' : 'Fix Unhashed Passwords'}
          </button>
        </div>

        {/* Test Section */}
        <div className="flex space-x-4">
          <button
            onClick={testPasswordReset}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Password Reset'}
          </button>

          <button
            onClick={testLogin}
            disabled={loading || !testResults?.user}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Login'}
          </button>
        </div>
      </div>

      {/* Fix Results */}
      {fixResults && (
        <div className="bg-slate-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-3">Password Fix Results</h3>

          <div>
            <strong>Password Hash Fix:</strong>
            <span className={`ml-2 px-2 py-1 rounded text-sm ${
              fixResults.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {fixResults.success ? 'SUCCESS' : 'FAILED'}
            </span>
            {fixResults.message && (
              <div className="text-sm text-slate-600 mt-1">{fixResults.message}</div>
            )}
            {fixResults.error && (
              <div className="text-sm text-red-600 mt-1">{fixResults.error}</div>
            )}
            <div className="text-xs text-slate-500 mt-2">
              Fix performed at: {fixResults.timestamp}
            </div>
          </div>
        </div>
      )}

      {testResults && (
        <div className="bg-slate-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Test Results</h3>
          
          <div className="space-y-3">
            <div>
              <strong>Password Reset:</strong>
              <span className={`ml-2 px-2 py-1 rounded text-sm ${
                testResults.resetSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {testResults.resetSuccess ? 'SUCCESS' : 'FAILED'}
              </span>
              {testResults.resetMessage && (
                <div className="text-sm text-slate-600 mt-1">{testResults.resetMessage}</div>
              )}
              {testResults.error && (
                <div className="text-sm text-red-600 mt-1">{testResults.error}</div>
              )}
            </div>

            {testResults.user && (
              <div>
                <strong>User Info:</strong>
                <div className="text-sm text-slate-600 mt-1">
                  Username: {testResults.user.username}, Role: {testResults.user.role}
                </div>
              </div>
            )}

            {testResults.loginTimestamp && (
              <div>
                <strong>Login Test:</strong>
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  testResults.loginSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {testResults.loginSuccess ? 'SUCCESS' : 'FAILED'}
                </span>
                {testResults.loginMessage && (
                  <div className="text-sm text-slate-600 mt-1">{testResults.loginMessage}</div>
                )}
                {testResults.loginError && (
                  <div className="text-sm text-red-600 mt-1">{testResults.loginError}</div>
                )}
              </div>
            )}

            <div className="text-xs text-slate-500">
              Test performed at: {testResults.timestamp}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">Instructions:</h4>
        <ol className="text-sm text-yellow-700 space-y-1">
          <li><strong>If users can't login:</strong> Click "Fix Unhashed Passwords" first</li>
          <li>1. Enter a User ID (check Admin Dashboard for available users)</li>
          <li>2. Enter a new password (minimum 6 characters)</li>
          <li>3. Click "Test Password Reset" to reset the password</li>
          <li>4. Enter the same password in "Test Login Password"</li>
          <li>5. Click "Test Login" to verify the new password works</li>
        </ol>
      </div>
    </div>
  );
};

export default PasswordResetTest;
