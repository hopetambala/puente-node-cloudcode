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
 *   TEST_PASSWORD='…' npx env-cmd -f .env.prod node scripts/create-mcmaster-org.js
 */
const {
  PARSE_APP_ID, PARSE_JAVASCRIPT_KEY, PARSE_SERVER_URL, TEST_PASSWORD,
} = process.env;

const ORGANIZATION = 'McMaster';
const USERNAME = 'TestMcMaster';

const main = async () => {
  const missing = Object.entries({
    PARSE_APP_ID, PARSE_JAVASCRIPT_KEY, PARSE_SERVER_URL, TEST_PASSWORD,
  }).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`);

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
