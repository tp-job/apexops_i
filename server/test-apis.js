// test-apis.js - Test all API endpoints with database connectivity
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
let authToken = null;
let testUserId = null;
let testNoteId = null;
let testTicketId = null;
let testLogId = null;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}Testing: ${name}${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

// Test results tracking
const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

function recordTest(name, passed, error = null) {
    results.tests.push({ name, passed, error });
    if (passed) {
        results.passed++;
    } else {
        results.failed++;
    }
}

// ----------------------------
// Test Functions
// ----------------------------

async function testHealthCheck() {
    logTest('Health Check');
    try {
        const response = await axios.get(`${BASE_URL}/api/health`);
        logSuccess(`Health check passed: ${JSON.stringify(response.data)}`);
        recordTest('Health Check', true);
        return true;
    } catch (error) {
        logError(`Health check failed: ${error.message}`);
        recordTest('Health Check', false, error.message);
        return false;
    }
}

async function testAuthRegister() {
    logTest('Auth - Register');
    try {
        const testEmail = `test_${Date.now()}@example.com`;
        const response = await axios.post(`${BASE_URL}/api/auth/register`, {
            firstName: 'Test',
            lastName: 'User',
            email: testEmail,
            password: 'password123'
        });
        
        if (response.data.user && response.data.accessToken) {
            authToken = response.data.accessToken;
            testUserId = response.data.user.id;
            logSuccess(`User registered: ${response.data.user.email}`);
            logSuccess(`Token received: ${authToken.substring(0, 20)}...`);
            recordTest('Auth Register', true);
            return true;
        } else {
            logError('Registration response missing required fields');
            recordTest('Auth Register', false, 'Missing required fields');
            return false;
        }
    } catch (error) {
        logError(`Registration failed: ${error.response?.data?.error || error.message}`);
        recordTest('Auth Register', false, error.response?.data?.error || error.message);
        return false;
    }
}

async function testAuthLogin() {
    logTest('Auth - Login');
    try {
        // Create a new user for login test
        const testEmail = `login_${Date.now()}@example.com`;
        await axios.post(`${BASE_URL}/api/auth/register`, {
            firstName: 'Login',
            lastName: 'Test',
            email: testEmail,
            password: 'password123'
        });

        // Now try to login
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: testEmail,
            password: 'password123'
        });
        
        if (response.data.user && response.data.accessToken) {
            logSuccess(`Login successful: ${response.data.user.email}`);
            recordTest('Auth Login', true);
            return true;
        } else {
            logError('Login response missing required fields');
            recordTest('Auth Login', false, 'Missing required fields');
            return false;
        }
    } catch (error) {
        logError(`Login failed: ${error.response?.data?.error || error.message}`);
        recordTest('Auth Login', false, error.response?.data?.error || error.message);
        return false;
    }
}

async function testAuthProfile() {
    logTest('Auth - Get Profile');
    try {
        if (!authToken) {
            logWarning('No auth token available, skipping profile test');
            recordTest('Auth Profile', false, 'No auth token');
            return false;
        }

        const response = await axios.get(`${BASE_URL}/api/auth/profile`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.user) {
            logSuccess(`Profile retrieved: ${response.data.user.email}`);
            recordTest('Auth Profile', true);
            return true;
        } else {
            logError('Profile response missing user data');
            recordTest('Auth Profile', false, 'Missing user data');
            return false;
        }
    } catch (error) {
        logError(`Get profile failed: ${error.response?.data?.error || error.message}`);
        recordTest('Auth Profile', false, error.response?.data?.error || error.message);
        return false;
    }
}

async function testLogsCreate() {
    logTest('Logs - Create');
    try {
        const response = await axios.post(`${BASE_URL}/api/logs`, {
            level: 'info',
            message: 'Test log message',
            source: 'test-script'
        });
        
        if (response.data.id) {
            testLogId = response.data.id;
            logSuccess(`Log created with ID: ${testLogId}`);
            recordTest('Logs Create', true);
            return true;
        } else {
            logError('Log creation response missing ID');
            recordTest('Logs Create', false, 'Missing ID');
            return false;
        }
    } catch (error) {
        logError(`Log creation failed: ${error.response?.data?.error || error.message}`);
        recordTest('Logs Create', false, error.response?.data?.error || error.message);
        return false;
    }
}

async function testLogsGet() {
    logTest('Logs - Get All');
    try {
        const response = await axios.get(`${BASE_URL}/api/logs`);
        
        if (Array.isArray(response.data)) {
            logSuccess(`Retrieved ${response.data.length} logs`);
            recordTest('Logs Get All', true);
            return true;
        } else {
            logError('Logs response is not an array');
            recordTest('Logs Get All', false, 'Invalid response format');
            return false;
        }
    } catch (error) {
        logError(`Get logs failed: ${error.response?.data?.error || error.message}`);
        recordTest('Logs Get All', false, error.response?.data?.error || error.message);
        return false;
    }
}

async function testLogsStats() {
    logTest('Logs - Get Stats');
    try {
        const response = await axios.get(`${BASE_URL}/api/logs/stats`);
        
        if (response.data.total !== undefined) {
            logSuccess(`Log stats: Total=${response.data.total}, Errors=${response.data.byLevel?.errors || 0}`);
            recordTest('Logs Stats', true);
            return true;
        } else {
            logError('Log stats response missing total');
            recordTest('Logs Stats', false, 'Missing total');
            return false;
        }
    } catch (error) {
        logError(`Get log stats failed: ${error.response?.data?.error || error.message}`);
        recordTest('Logs Stats', false, error.response?.data?.error || error.message);
        return false;
    }
}

async function testTicketsCreate() {
    logTest('Tickets - Create');
    try {
        const response = await axios.post(`${BASE_URL}/api/tickets`, {
            title: 'Test Ticket',
            description: 'This is a test ticket',
            priority: 'high',
            status: 'open'
        });
        
        if (response.data.id) {
            testTicketId = response.data.id;
            logSuccess(`Ticket created with ID: ${testTicketId}`);
            recordTest('Tickets Create', true);
            return true;
        } else {
            logError('Ticket creation response missing ID');
            recordTest('Tickets Create', false, 'Missing ID');
            return false;
        }
    } catch (error) {
        logError(`Ticket creation failed: ${error.response?.data?.error || error.message}`);
        recordTest('Tickets Create', false, error.response?.data?.error || error.message);
        return false;
    }
}

async function testTicketsGet() {
    logTest('Tickets - Get All');
    try {
        const response = await axios.get(`${BASE_URL}/api/tickets`);
        
        if (Array.isArray(response.data)) {
            logSuccess(`Retrieved ${response.data.length} tickets`);
            recordTest('Tickets Get All', true);
            return true;
        } else {
            logError('Tickets response is not an array');
            recordTest('Tickets Get All', false, 'Invalid response format');
            return false;
        }
    } catch (error) {
        logError(`Get tickets failed: ${error.response?.data?.error || error.message}`);
        recordTest('Tickets Get All', false, error.response?.data?.error || error.message);
        return false;
    }
}

async function testTicketsStats() {
    logTest('Tickets - Get Stats');
    try {
        const response = await axios.get(`${BASE_URL}/api/tickets/stats`);
        
        if (response.data.total !== undefined) {
            logSuccess(`Ticket stats: Total=${response.data.total}, Open=${response.data.byStatus?.open || 0}`);
            recordTest('Tickets Stats', true);
            return true;
        } else {
            logError('Ticket stats response missing total');
            recordTest('Tickets Stats', false, 'Missing total');
            return false;
        }
    } catch (error) {
        logError(`Get ticket stats failed: ${error.response?.data?.error || error.message}`);
        recordTest('Tickets Stats', false, error.response?.data?.error || error.message);
        return false;
    }
}

async function testTicketsUpdate() {
    logTest('Tickets - Update');
    try {
        if (!testTicketId) {
            logWarning('No test ticket ID available, skipping update test');
            recordTest('Tickets Update', false, 'No ticket ID');
            return false;
        }

        const response = await axios.put(`${BASE_URL}/api/tickets/${testTicketId}`, {
            status: 'in-progress',
            priority: 'medium'
        });
        
        if (response.data.id === testTicketId) {
            logSuccess(`Ticket updated: ${testTicketId}`);
            recordTest('Tickets Update', true);
            return true;
        } else {
            logError('Ticket update response invalid');
            recordTest('Tickets Update', false, 'Invalid response');
            return false;
        }
    } catch (error) {
        logError(`Ticket update failed: ${error.response?.data?.error || error.message}`);
        recordTest('Tickets Update', false, error.response?.data?.error || error.message);
        return false;
    }
}

async function testNotesCreate() {
    logTest('Notes - Create');
    try {
        if (!authToken) {
            logWarning('No auth token available, skipping notes test');
            recordTest('Notes Create', false, 'No auth token');
            return false;
        }

        const response = await axios.post(`${BASE_URL}/api/notes`, {
            title: 'Test Note',
            content: 'This is a test note',
            type: 'text'
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.id) {
            testNoteId = response.data.id;
            logSuccess(`Note created with ID: ${testNoteId}`);
            recordTest('Notes Create', true);
            return true;
        } else {
            logError('Note creation response missing ID');
            recordTest('Notes Create', false, 'Missing ID');
            return false;
        }
    } catch (error) {
        logError(`Note creation failed: ${error.response?.data?.error || error.message}`);
        recordTest('Notes Create', false, error.response?.data?.error || error.message);
        return false;
    }
}

async function testNotesGet() {
    logTest('Notes - Get All');
    try {
        if (!authToken) {
            logWarning('No auth token available, skipping notes test');
            recordTest('Notes Get All', false, 'No auth token');
            return false;
        }

        const response = await axios.get(`${BASE_URL}/api/notes`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (Array.isArray(response.data)) {
            logSuccess(`Retrieved ${response.data.length} notes`);
            recordTest('Notes Get All', true);
            return true;
        } else {
            logError('Notes response is not an array');
            recordTest('Notes Get All', false, 'Invalid response format');
            return false;
        }
    } catch (error) {
        logError(`Get notes failed: ${error.response?.data?.error || error.message}`);
        recordTest('Notes Get All', false, error.response?.data?.error || error.message);
        return false;
    }
}

async function testAIStatus() {
    logTest('AI - Status Check');
    try {
        const response = await axios.get(`${BASE_URL}/api/ai/status`);
        
        if (response.data.status) {
            logSuccess(`AI Status: ${response.data.status} (${response.data.message})`);
            if (response.data.status === 'not_configured') {
                logWarning('AI is not configured. Set GEMINI_API_KEY to enable AI features.');
                results.warnings++;
            }
            recordTest('AI Status', true);
            return true;
        } else {
            logError('AI status response invalid');
            recordTest('AI Status', false, 'Invalid response');
            return false;
        }
    } catch (error) {
        logError(`AI status check failed: ${error.response?.data?.error || error.message}`);
        recordTest('AI Status', false, error.response?.data?.error || error.message);
        return false;
    }
}

// ----------------------------
// Main Test Runner
// ----------------------------

async function runAllTests() {
    console.log('\n');
    log('╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║         ApexOps API Database Connectivity Tests           ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');
    log(`\nTesting server at: ${BASE_URL}\n`, 'yellow');

    const startTime = Date.now();

    // Run tests in sequence
    await testHealthCheck();
    await testAuthRegister();
    await testAuthLogin();
    await testAuthProfile();
    await testLogsCreate();
    await testLogsGet();
    await testLogsStats();
    await testTicketsCreate();
    await testTicketsGet();
    await testTicketsStats();
    await testTicketsUpdate();
    await testNotesCreate();
    await testNotesGet();
    await testAIStatus();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print summary
    console.log('\n');
    log('╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║                      Test Summary                          ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');
    console.log('');
    log(`Total Tests:    ${results.passed + results.failed}`, 'blue');
    log(`Passed:         ${results.passed}`, 'green');
    log(`Failed:         ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    log(`Warnings:       ${results.warnings}`, 'yellow');
    log(`Duration:       ${duration}s`, 'blue');
    console.log('');

    if (results.failed > 0) {
        log('Failed Tests:', 'red');
        results.tests.filter(t => !t.passed).forEach(test => {
            log(`  • ${test.name}: ${test.error}`, 'red');
        });
        console.log('');
    }

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
    logError(`Test runner failed: ${error.message}`);
    console.error(error);
    process.exit(1);
});

