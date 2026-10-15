import assert from 'assert';
import { db, initFormsTables, initCommentsTables } from '../lib/db.js';
import { ensureAccountColumns } from '../lib/access.js';
import {
  checkHoneypot,
  checkSpeedTrap,
  countUrls,
  checkBlocklist,
  checkDuplicateSubmission,
  analyzeContent,
} from '../lib/spam.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import entriesHandler from '../pages/api/entries.js';
import submitHandler from '../pages/api/submit.js';
import commentsHandler from '../pages/api/comments.js';
import userHandler from '../pages/api/user.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log('--- Starting Spam Control Test Suite ---');
  await ensureAccountColumns();
  await initFormsTables();
  await initCommentsTables();

  // Test user setup
  const testUser = 'spam_test_user_' + Date.now();
  await db.execute({
    sql: "INSERT INTO users (username, password, role, account_status, spam_blocklist, max_links, rate_limit_cooldown, rate_limit_hourly, require_approval) VALUES (?, 'pass', 'user', 'active', 'crypto, casino, badsite.xyz', 2, 3, 10, 0)",
    args: [testUser],
  });

  // 1. Unit Test: checkHoneypot
  console.log('Testing checkHoneypot...');
  assert.strictEqual(checkHoneypot({}).isSpam, false);
  assert.strictEqual(checkHoneypot({ bot_field: '' }).isSpam, false);
  assert.strictEqual(checkHoneypot({ bot_field: 'spam' }).isSpam, true);
  assert.strictEqual(checkHoneypot({ _honeypot: 'bot' }).isSpam, true);
  assert.strictEqual(checkHoneypot({ website_url_check: 'automated' }).isSpam, true);
  console.log('✓ checkHoneypot passed');

  // 2. Unit Test: checkSpeedTrap
  console.log('Testing checkSpeedTrap...');
  const fastTime = Date.now() - 200; // 200ms ago -> too fast
  const normalTime = Date.now() - 4000; // 4s ago -> human
  assert.strictEqual(checkSpeedTrap(fastTime).isSpam, true);
  assert.strictEqual(checkSpeedTrap(normalTime).isSpam, false);
  assert.strictEqual(checkSpeedTrap(null).isSpam, false);
  console.log('✓ checkSpeedTrap passed');

  // 3. Unit Test: countUrls
  console.log('Testing countUrls...');
  assert.strictEqual(countUrls('Hello world'), 0);
  assert.strictEqual(countUrls('Visit https://example.com and http://test.org'), 2);
  assert.strictEqual(countUrls('Check www.google.com and https://bing.com'), 2);
  console.log('✓ countUrls passed');

  // 4. Unit Test: checkBlocklist
  console.log('Testing checkBlocklist...');
  assert.strictEqual(checkBlocklist('Legitimate message', 'crypto, casino').matched, false);
  assert.strictEqual(checkBlocklist('Get your free crypto tokens now', 'crypto, casino').matched, true);
  assert.strictEqual(checkBlocklist('Join our Casino online', 'crypto, casino').matched, true);
  console.log('✓ checkBlocklist passed');

  // 5. Unit Test: analyzeContent
  console.log('Testing analyzeContent...');
  const clean = analyzeContent({
    text: 'A friendly guestbook message',
    senderName: 'Alice',
    website: 'https://alice.me',
    blocklist: 'crypto, casino',
    maxLinks: 2,
  });
  assert.strictEqual(clean.valid, true);
  assert.strictEqual(clean.routeToPending, false);

  const tooLong = analyzeContent({
    text: 'a'.repeat(2501),
    maxTextLength: 2500,
  });
  assert.strictEqual(tooLong.valid, false);

  const excessiveLinks = analyzeContent({
    text: 'Visit https://a.com https://b.com https://c.com',
    maxLinks: 2,
  });
  assert.strictEqual(excessiveLinks.valid, true);
  assert.strictEqual(excessiveLinks.routeToPending, true);

  const blocklisted = analyzeContent({
    text: 'Check this crypto offer',
    blocklist: 'crypto, casino',
  });
  assert.strictEqual(blocklisted.valid, true);
  assert.strictEqual(blocklisted.routeToPending, true);
  console.log('✓ analyzeContent passed');

  // 6. Unit Test: checkRateLimit
  console.log('Testing checkRateLimit...');
  const testRateKey = `test_rate_${Date.now()}`;
  const r1 = await checkRateLimit({
    key: testRateKey,
    cooldownSeconds: 2,
    hourlyLimit: 5,
  });
  assert.strictEqual(r1.allowed, true);

  const r2 = await checkRateLimit({
    key: testRateKey,
    cooldownSeconds: 2,
    hourlyLimit: 5,
  });
  assert.strictEqual(r2.allowed, false);
  assert.ok(r2.error.includes('Please wait'));
  console.log('✓ checkRateLimit passed');

  // 7. Unit Test: checkDuplicateSubmission
  console.log('Testing checkDuplicateSubmission...');
  const testDupOwner = 'owner_' + Date.now();
  const dup1 = await checkDuplicateSubmission({
    scope: 'entries',
    owner: testDupOwner,
    content: 'Repeated spam test message',
    windowMs: 5000,
  });
  assert.strictEqual(dup1.isDuplicate, false);

  const dup2 = await checkDuplicateSubmission({
    scope: 'entries',
    owner: testDupOwner,
    content: 'Repeated spam test message',
    windowMs: 5000,
  });
  assert.strictEqual(dup2.isDuplicate, true);
  console.log('✓ checkDuplicateSubmission passed');

  // 8. Handler Test: POST /api/entries Honeypot Trigger
  console.log('Testing entriesHandler with honeypot...');
  {
    const req = {
      method: 'POST',
      query: {},
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: {
        owner_username: testUser,
        sender_name: 'Bot',
        message: 'Spam message',
        bot_field: 'iamabot',
      },
    };
    const res = createMockRes();
    await entriesHandler(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.error, 'Spam detected');
  }
  console.log('✓ entriesHandler honeypot rejected with HTTP 400');

  // 9. Handler Test: POST /api/entries Speed Trap Trigger
  console.log('Testing entriesHandler with speed trap...');
  {
    const req = {
      method: 'POST',
      query: {},
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: {
        owner_username: testUser,
        sender_name: 'FastBot',
        message: 'Submitting too fast',
        _submission_time: Date.now() - 300, // 300ms
      },
    };
    const res = createMockRes();
    await entriesHandler(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.error, 'Spam detected');
  }
  console.log('✓ entriesHandler speed trap rejected with HTTP 400');

  // 10. Handler Test: POST /api/entries Blocklist Auto-quarantine to Pending
  console.log('Testing entriesHandler auto-quarantine for blocked keyword...');
  {
    const req = {
      method: 'POST',
      query: {},
      headers: { 'x-forwarded-for': '127.0.0.9' },
      body: {
        owner_username: testUser,
        sender_name: 'Promoter',
        message: 'Great blog! Also buy crypto here',
        _submission_time: Date.now() - 3500,
      },
    };
    const res = createMockRes();
    await entriesHandler(req, res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.status, 'pending'); // auto-quarantined!
  }
  console.log('✓ entriesHandler auto-quarantine to pending verified');

  // 11. Handler Test: POST /api/entries Clean Submission
  console.log('Testing entriesHandler clean submission...');
  {
    const req = {
      method: 'POST',
      query: {},
      headers: { 'x-forwarded-for': '127.0.0.15' },
      body: {
        owner_username: testUser,
        sender_name: 'Legit Person',
        message: 'Lovely website design and articles!',
        _submission_time: Date.now() - 4000,
      },
    };
    const res = createMockRes();
    await entriesHandler(req, res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.status, 'approved');
  }
  console.log('✓ entriesHandler clean submission approved');

  // 12. Handler Test: PUT /api/entries?action=like Rate Limiting
  console.log('Testing entriesHandler like rate limiting...');
  {
    const entryRes = await db.execute({
      sql: 'SELECT id FROM entries WHERE owner_username = ? LIMIT 1',
      args: [testUser],
    });
    const entryId = entryRes.rows[0].id;

    const req1 = {
      method: 'PUT',
      query: {},
      headers: { 'x-forwarded-for': '10.0.0.1' },
      body: { action: 'like', id: entryId },
    };
    const res1 = createMockRes();
    await entriesHandler(req1, res1);
    assert.strictEqual(res1.statusCode, 200);

    // Second like within 3s cooldown from same IP
    const req2 = {
      method: 'PUT',
      query: {},
      headers: { 'x-forwarded-for': '10.0.0.1' },
      body: { action: 'like', id: entryId },
    };
    const res2 = createMockRes();
    await entriesHandler(req2, res2);
    assert.strictEqual(res2.statusCode, 429);
    assert.ok(res2.body.error.includes('Please wait'));
  }
  console.log('✓ entriesHandler like rate limiting verified');

  // 13. Handler Test: POST /api/submit Honeypot and Speed Trap
  console.log('Testing submitHandler with honeypot and speed trap...');
  {
    const formId = 'test_form_' + Date.now();
    await db.execute({
      sql: "INSERT INTO forms (id, owner_username, name, fields, require_approval) VALUES (?, ?, 'Contact', '[]', 0)",
      args: [formId, testUser]
    });

    // Honeypot test
    const reqHoneypot = {
      method: 'POST',
      query: { form: formId },
      headers: { 'x-forwarded-for': '127.0.0.30' },
      body: { _honeypot: 'bot' }
    };
    const resHoneypot = createMockRes();
    await submitHandler(reqHoneypot, resHoneypot);
    assert.strictEqual(resHoneypot.statusCode, 400);
    assert.strictEqual(resHoneypot.body.error, 'Spam detected');

    // Speed trap test
    const reqSpeed = {
      method: 'POST',
      query: { form: formId },
      headers: { 'x-forwarded-for': '127.0.0.31' },
      body: { _submission_time: Date.now() - 100 }
    };
    const resSpeed = createMockRes();
    await submitHandler(reqSpeed, resSpeed);
    assert.strictEqual(resSpeed.statusCode, 400);
    assert.strictEqual(resSpeed.body.error, 'Spam detected');

    await db.execute({ sql: 'DELETE FROM forms WHERE id = ?', args: [formId] });
  }
  console.log('✓ submitHandler spam tests verified');

  // 14. Handler Test: POST /api/comments Honeypot and Like Rate Limit
  console.log('Testing commentsHandler with honeypot and like rate limit...');
  {
    const sectionId = 'test_sec_' + Date.now();
    await db.execute({
      sql: "INSERT INTO comment_sections (id, owner_username, name, settings) VALUES (?, ?, 'Blog', ?)",
      args: [sectionId, testUser, JSON.stringify({ fields: { name: { show: true, required: true }, email: { show: false, required: false }, url: { show: false, required: false } }, allow_anonymous: true, allow_likes: true, require_approval: false })]
    });

    // Honeypot test
    const reqHoneypot = {
      method: 'POST',
      query: {},
      headers: { 'x-forwarded-for': '127.0.0.40' },
      body: { section_id: sectionId, comment_text: 'Spam comment', website_url_check: 'bot' }
    };
    const resHoneypot = createMockRes();
    await commentsHandler(reqHoneypot, resHoneypot);
    assert.strictEqual(resHoneypot.statusCode, 400);
    assert.strictEqual(resHoneypot.body.error, 'Spam detected');

    // Post clean comment
    const reqClean = {
      method: 'POST',
      query: {},
      headers: { 'x-forwarded-for': '127.0.0.41' },
      body: { section_id: sectionId, comment_text: 'Clean comment', is_anonymous: true, _submission_time: Date.now() - 5000 }
    };
    const resClean = createMockRes();
    await commentsHandler(reqClean, resClean);
    assert.strictEqual(resClean.statusCode, 201);
    assert.strictEqual(resClean.body.status, 'approved');

    // Like comment rate limit
    const cRes = await db.execute({ sql: 'SELECT id FROM comments WHERE section_id = ? LIMIT 1', args: [sectionId] });
    const commentId = cRes.rows[0].id;

    const reqLike1 = {
      method: 'PUT',
      query: {},
      headers: { 'x-forwarded-for': '127.0.0.42' },
      body: { action: 'like', id: commentId }
    };
    const resLike1 = createMockRes();
    await commentsHandler(reqLike1, resLike1);
    assert.strictEqual(resLike1.statusCode, 200);

    const reqLike2 = {
      method: 'PUT',
      query: {},
      headers: { 'x-forwarded-for': '127.0.0.42' },
      body: { action: 'like', id: commentId }
    };
    const resLike2 = createMockRes();
    await commentsHandler(reqLike2, resLike2);
    assert.strictEqual(resLike2.statusCode, 429);
    assert.ok(resLike2.body.error.includes('Please wait'));

    await db.execute({ sql: 'DELETE FROM comments WHERE section_id = ?', args: [sectionId] });
    await db.execute({ sql: 'DELETE FROM comment_sections WHERE id = ?', args: [sectionId] });
  }
  console.log('✓ commentsHandler spam and like tests verified');

  // Clean up test records
  await db.execute({ sql: 'DELETE FROM entries WHERE owner_username = ?', args: [testUser] });
  await db.execute({ sql: 'DELETE FROM users WHERE username = ?', args: [testUser] });

  console.log('\n========================================');
  console.log('ALL SPAM CONTROL TESTS PASSED SUCCESSFULLY!');
  console.log('========================================');
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
