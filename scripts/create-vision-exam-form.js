/* eslint-disable no-console */
/**
 * Creates the vision exam form for the McMaster organization, with research
 * export turned on. The draft spec it implements is §B5 of
 * puente-react-nextjs-platform/docs/vision-clinic-research-prd-edd.md — have
 * Rayjon and the McMaster team sign off on it before running this.
 *
 *   node scripts/create-vision-exam-form.js --print       # show the form, write nothing
 *   npx env-cmd -f .env.prod node scripts/create-vision-exam-form.js
 *   npx env-cmd -f .env.prod node scripts/create-vision-exam-form.js --test-copy
 *
 * --test-copy makes "PRUEBA - …", a copy with one invented community, for
 * testing without test patients reaching the real form's research export
 * (guides/research/designing-a-form-for-research). Delete it afterwards in
 * Form Manager.
 *
 * Saved through `postObjectsToClass`, the same Cloud function Manage's Form
 * Creator uses, so no master key is needed and the result is exactly what
 * Manage would have saved.
 *
 * Labels are Spanish for the surveyors, with English in brackets for the
 * researchers: each label becomes a column heading in the research file.
 * Built in Manage it would be the same form; scripted so that 60-option lists
 * are typed once, correctly.
 */
const ORGANIZATION = 'McMaster';
const FORM_NAME = 'Examen de la vista (Vision exam)';

// FILL IN before running: the communities the clinics serve, as the
// coordinator wants them spelled. The script refuses to run while empty.
const COMMUNITIES = [];

const option = (label, value = label) => ({ label, value });
const select = (formikKey, label, options) => ({
  fieldType: 'select', formikKey, label, options, value: '',
});
const header = (formikKey, label) => ({ fieldType: 'header', formikKey, label });
const number = (formikKey, label) => ({
  fieldType: 'numberInput', formikKey, label, sideLabel: '', value: '',
});

const signed = (n) => (n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2));
const range = (from, to, step) => {
  const out = [];
  for (let n = from; n <= to + 1e-9; n += step) out.push(Math.round(n * 100) / 100);
  return out;
};

// Rayjon to confirm every range below (open question 4).
const ACUITY = [
  '20/20', '20/25', '20/30', '20/40', '20/50', '20/60', '20/70', '20/80', '20/100', '20/200', '20/400',
].map((v) => option(v)).concat([
  option('Cuenta dedos (CF)', 'CF'),
  option('Movimiento de manos (HM)', 'HM'),
  option('Percepción de luz (LP)', 'LP'),
  option('No percibe luz (NLP)', 'NLP'),
]);
const SPHERE = range(-6, 6, 0.25).map((n) => option(n === 0 ? '0.00 (Plano)' : signed(n), signed(n)));
const CYLINDER = range(-4, 0, 0.25).map((n) => option(n === 0 ? '0.00 (Ninguno)' : signed(n), signed(n)));
const ADD = [option('Ninguna (None)', 'none')].concat(range(0.75, 3, 0.25).map((n) => option(signed(n))));
const YES_NO = [option('Sí (Yes)', 'yes'), option('No', 'no')];

const prescription = (prefix, title) => [
  header(`${prefix}_header`, title),
  select(`${prefix}_od_sphere`, `${title} OD esfera (right sphere)`, SPHERE),
  select(`${prefix}_od_cylinder`, `${title} OD cilindro (right cylinder)`, CYLINDER),
  number(`${prefix}_od_axis`, `${title} OD eje 0-180 (right axis)`),
  select(`${prefix}_os_sphere`, `${title} OI esfera (left sphere)`, SPHERE),
  select(`${prefix}_os_cylinder`, `${title} OI cilindro (left cylinder)`, CYLINDER),
  number(`${prefix}_os_axis`, `${title} OI eje 0-180 (left axis)`),
];

const fields = (communities) => [
  // Wording from the McMaster ethics approval replaces this label, word for word.
  select('consent', 'Consentimiento para el estudio (Research consent)', YES_NO),
  select('clinic', 'Clínica (Clinic)', [option('Constanza'), option('Sosúa')]),
  select('community', 'Comunidad (Community)', communities.map((c) => option(c)).concat([option('Otra (Other)', 'other')])),
  header('acuity_pre_header', 'Agudeza visual sin lentes (Acuity without glasses)'),
  select('acuity_pre_od', 'Agudeza OD sin lentes (right, without)', ACUITY),
  select('acuity_pre_os', 'Agudeza OI sin lentes (left, without)', ACUITY),
  ...prescription('rx_measured', 'Receta medida (Measured Rx)'),
  select('rx_measured_add', 'Receta medida adicion (Measured add)', ADD),
  ...prescription('rx_given', 'Lentes entregados (Glasses given)'),
  select('rx_given_add', 'Lentes entregados adicion (Given add)', ADD),
  header('acuity_post_header', 'Agudeza visual con los lentes entregados (Acuity with glasses given)'),
  select('acuity_post_od', 'Agudeza OD con lentes (right, with)', ACUITY),
  select('acuity_post_os', 'Agudeza OI con lentes (left, with)', ACUITY),
  select('glasses_given', 'Se entregaron lentes (Were glasses given)', [
    option('Sí (Yes)', 'yes'), option('No', 'no'), option('Referido (Referred)', 'referred'),
  ]),
];

const main = async () => {
  const testCopy = process.argv.includes('--test-copy');
  const communities = testCopy ? ['Comunidad Ejemplo'] : COMMUNITIES;
  if (process.argv.includes('--print')) {
    console.log(JSON.stringify(fields(communities), null, 2));
    return;
  }
  if (!communities.length) {
    throw new Error('Fill in COMMUNITIES first: the community question is how the study groups patients.');
  }
  const { PARSE_APP_ID, PARSE_JAVASCRIPT_KEY, PARSE_SERVER_URL } = process.env;
  const name = testCopy ? `PRUEBA - ${FORM_NAME}` : FORM_NAME;
  const headers = {
    'Content-Type': 'application/json',
    'X-Parse-Application-Id': PARSE_APP_ID,
    'X-Parse-Javascript-Key': PARSE_JAVASCRIPT_KEY,
  };

  const where = encodeURIComponent(JSON.stringify({ name, organizations: ORGANIZATION }));
  const found = await fetch(`${PARSE_SERVER_URL}/classes/FormSpecificationsV2?where=${where}&keys=objectId`, { headers })
    .then((r) => r.json());
  if ((found.results || []).length) {
    console.log(`"${name}" already exists for ${ORGANIZATION} (${found.results[0].objectId}); not recreating.`);
    return;
  }

  const response = await fetch(`${PARSE_SERVER_URL}/functions/postObjectsToClass`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parseClass: 'FormSpecificationsV2',
      localObject: {
        name,
        description: testCopy
          ? 'TEST COPY for the end-to-end check. Delete after testing.'
          : 'Rayjon Eyes clinics, Constanza and Sosúa, November 2026. McMaster study.',
        organizations: [ORGANIZATION],
        typeOfForm: ['Custom'],
        workflows: [],
        class: '',
        customForm: true,
        allowResearchExport: true,
        fields: fields(communities),
      },
    }),
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(`postObjectsToClass refused: ${JSON.stringify(body)}`);
  const id = body.result && (body.result.objectId || body.result.id);
  console.log(`Created "${name}" (${id}) for ${ORGANIZATION}, with ${fields(communities).length} fields.`);
};

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
