/* eslint-disable no-console */
/**
 * Creates the McMaster organization and its first account, TestMcMaster.
 *
 * No master key: `signup` creates an organization when the name is new and
 * clearly distinct from every existing one (checked 2026-10-23 against all 59:
 * "McMaster" resolves to nothing and is similar to nothing), and makes its first
 * member the administrator. So run this BEFORE anyone else registers as McMaster.
 *
 * The username follows the existing `Test` account: a plain name, not an email.
 * `signup` takes the username from email, else phone, so the name goes in as
 * the phone number and the email stays empty. `signin` tries the username first,
 * so TestMcMaster / <password> logs in to Manage and Collect.
 *
 * Use PRODUCTION keys: the ones Manage is built with. This repo's .env.prod
 * holds the STAGING app id (identical to .env.staging), so running with it
 * creates the account on staging, where production Manage can't sign in —
 * which is exactly what happened on 2026-10-23. The script refuses staging.
 *
 *   npx env-cmd -f ../puente-react-nextjs-platform/.env.local sh -c '
 *     PARSE_APP_ID=$NEXT_PUBLIC_parseAppId \
 *     PARSE_JAVASCRIPT_KEY=$NEXT_PUBLIC_parseJavascriptKey \
 *     PARSE_SERVER_URL=$NEXT_PUBLIC_parseServerUrl \
 *     TEST_PASSWORD=test node scripts/create-mcmaster-org.js'
 */
const crypto = require('crypto');

const {
  PARSE_APP_ID, PARSE_JAVASCRIPT_KEY, TEST_PASSWORD, ALLOW_STAGING,
} = process.env;
const PARSE_SERVER_URL = (process.env.PARSE_SERVER_URL || '').replace(/\/+$/, '');

// First 8 hex of sha1(app id): says which app a run writes to without printing
// the id. f7e6fde6 is staging (.env.staging and .env.prod here); production
// Manage is 07059151.
const appHash = (id) => crypto.createHash('sha1').update(String(id)).digest('hex').slice(0, 8);
const STAGING_APP_HASHES = ['f7e6fde6'];

const ORGANIZATION = 'McMaster';
const USERNAME = 'TestMcMaster';

const main = async () => {
  const missing = Object.entries({
    PARSE_APP_ID, PARSE_JAVASCRIPT_KEY, PARSE_SERVER_URL, TEST_PASSWORD,
  }).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`);
  const target = appHash(PARSE_APP_ID);
  if (STAGING_APP_HASHES.includes(target) && ALLOW_STAGING !== '1') {
    throw new Error(`Parse app ${target} is STAGING. Use Manage's production keys, or set ALLOW_STAGING=1.`);
  }
  console.log(`Writing to Parse app ${target}.`);

  const response = await fetch(`${PARSE_SERVER_URL}/functions/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Parse-Application-Id': PARSE_APP_ID,
      'X-Parse-Javascript-Key': PARSE_JAVASCRIPT_KEY,
    },
    body: JSON.stringify({
      firstname: 'Test',
      lastname: 'McMaster',
      email: '',
      phonenumber: USERNAME,
      password: TEST_PASSWORD,
      organization: ORGANIZATION,
    }),
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(`signup refused: ${JSON.stringify(body)}`);
  const user = body.result || {};
  console.log(`Created ${user.username}: organization "${user.organization}", role ${user.role}.`);
  if (user.organization !== ORGANIZATION || user.role !== 'administrator') {
    console.log('Not the expected organization or role: check the cloudcode logs for "signup refused to create organization".');
  }
};

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
