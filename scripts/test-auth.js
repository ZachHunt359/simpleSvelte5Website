#!/usr/bin/env node
/**
 * Comprehensive authentication test script
 * Tests auth.login functionality, cookie setting, and session validation
 */

// Import from the compiled output
import { c as auth } from '../.svelte-kit/output/server/chunks/cookie.js';
import { g as get, r as run } from '../.svelte-kit/output/server/chunks/db.js';
import bcrypt from 'bcryptjs';
import debug from 'debug';

const log = debug('test:auth');

// Mock cookies object for testing
class MockCookies {
  constructor() {
    this.cookies = new Map();
  }

  set(name, value, options = {}) {
    this.cookies.set(name, { value, options });
    console.log(`[COOKIE SET] ${name}=${value}`, options);
  }

  get(name) {
    const cookie = this.cookies.get(name);
    return cookie ? cookie.value : undefined;
  }

  delete(name, options = {}) {
    this.cookies.delete(name);
    console.log(`[COOKIE DELETE] ${name}`, options);
  }
}

async function setupTestUser() {
  console.log('\n=== Setting up test user ===');
  
  const testEmail = 'test@paranoid.com';
  const testPassword = 'testpass123';
  
  // Hash the password
  const passwordHash = bcrypt.hashSync(testPassword, 10);
  const epoch = Math.floor(Date.now() / 1000);
  
  try {
    // Create AdminUsers table if it doesn't exist
    await run(`
      CREATE TABLE IF NOT EXISTS AdminUsers (
        Id INTEGER PRIMARY KEY AUTO_INCREMENT,
        Email VARCHAR(255) UNIQUE NOT NULL,
        PasswordHash VARCHAR(255) NOT NULL,
        CreatedAt INTEGER NOT NULL
      )
    `);
    
    // Create Sessions table if it doesn't exist  
    await run(`
      CREATE TABLE IF NOT EXISTS Sessions (
        Token VARCHAR(255) PRIMARY KEY,
        UserId VARCHAR(255) NOT NULL,
        CreatedAt INTEGER NOT NULL,
        ExpiresAt INTEGER NOT NULL
      )
    `);
    
    // Insert or update test user
    await run(`
      INSERT INTO AdminUsers (Email, PasswordHash, CreatedAt) 
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      PasswordHash = VALUES(PasswordHash), CreatedAt = VALUES(CreatedAt)
    `, [testEmail, passwordHash, epoch]);
    
    console.log(`✅ Test user created/updated: ${testEmail}`);
    
    // Verify user exists
    const user = await get('SELECT Id, Email FROM AdminUsers WHERE Email = ?', [testEmail]);
    console.log('📋 User in database:', user);
    
    return { testEmail, testPassword, userId: user?.Id };
  } catch (error) {
    console.error('❌ Failed to setup test user:', error);
    throw error;
  }
}

async function testValidLogin(testEmail, testPassword) {
  console.log('\n=== Testing valid login ===');
  
  const mockCookies = new MockCookies();
  
  try {
    const result = await auth.login({
      email: testEmail,
      password: testPassword,
      opts: { cookies: mockCookies }
    });
    
    if (result.isOk()) {
      console.log('✅ Login successful');
      console.log('👤 User data:', result.value);
      
      // Check if cookie was set
      const authToken = mockCookies.get('auth_token');
      if (authToken) {
        console.log('🍪 Auth cookie set:', authToken);
        
        // Parse cookie to get user ID and session token
        const [userId, sessionToken] = authToken.split(':');
        console.log('🔑 Parsed cookie - UserId:', userId, 'SessionToken:', sessionToken.substring(0, 8) + '...');
        
        // Verify session exists in database
        const session = await get(
          'SELECT Token, UserId, CreatedAt, ExpiresAt FROM Sessions WHERE Token = ? AND UserId = ?',
          [sessionToken, userId]
        );
        
        if (session) {
          console.log('✅ Session verified in database');
          console.log('📅 Session expires at:', new Date(session.ExpiresAt * 1000).toISOString());
          return { authToken, session, user: result.value };
        } else {
          console.log('❌ Session not found in database');
          return null;
        }
      } else {
        console.log('❌ Auth cookie not set');
        return null;
      }
    } else {
      console.log('❌ Login failed:', result.error.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Login threw exception:', error);
    return null;
  }
}

async function testInvalidLogin() {
  console.log('\n=== Testing invalid login ===');
  
  const mockCookies = new MockCookies();
  
  try {
    const result = await auth.login({
      email: 'wrong@email.com',
      password: 'wrongpassword',
      opts: { cookies: mockCookies }
    });
    
    if (result.isErr()) {
      console.log('✅ Invalid login correctly rejected:', result.error.message);
      
      // Check that no cookie was set
      const authToken = mockCookies.get('auth_token');
      if (!authToken) {
        console.log('✅ No auth cookie set for invalid login');
      } else {
        console.log('❌ Auth cookie was set for invalid login:', authToken);
      }
    } else {
      console.log('❌ Invalid login was accepted - this should not happen');
    }
  } catch (error) {
    console.log('❌ Invalid login threw exception:', error);
  }
}

async function testSessionValidation(authToken) {
  console.log('\n=== Testing session validation ===');
  
  if (!authToken) {
    console.log('⚠️ No auth token available for session validation test');
    return;
  }
  
  const mockCookies = new MockCookies();
  
  try {
    const result = await auth.validate_session({
      token: authToken,
      opts: { cookies: mockCookies }
    });
    
    if (result.isOk()) {
      console.log('✅ Session validation successful');
      console.log('👤 Validated user:', result.value);
    } else {
      console.log('❌ Session validation failed:', result.error.message);
    }
  } catch (error) {
    console.log('❌ Session validation threw exception:', error);
  }
}

async function testPasswordWrongForExistingUser(testEmail) {
  console.log('\n=== Testing wrong password for existing user ===');
  
  const mockCookies = new MockCookies();
  
  try {
    const result = await auth.login({
      email: testEmail,
      password: 'definitely_wrong_password',
      opts: { cookies: mockCookies }
    });
    
    if (result.isErr()) {
      console.log('✅ Wrong password correctly rejected:', result.error.message);
    } else {
      console.log('❌ Wrong password was accepted - this should not happen');
    }
  } catch (error) {
    console.log('❌ Wrong password test threw exception:', error);
  }
}

async function runTests() {
  console.log('🧪 Starting comprehensive authentication tests...\n');
  
  try {
    // 1. Setup test user
    const { testEmail, testPassword } = await setupTestUser();
    
    // 2. Test valid login
    const loginResult = await testValidLogin(testEmail, testPassword);
    
    // 3. Test invalid login
    await testInvalidLogin();
    
    // 4. Test wrong password for existing user
    await testPasswordWrongForExistingUser(testEmail);
    
    // 5. Test session validation
    if (loginResult) {
      await testSessionValidation(loginResult.authToken);
    }
    
    console.log('\n🎉 All authentication tests completed!');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error);