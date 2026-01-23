import express from 'express';
import Airtable from 'airtable';

const app = express();
app.use(express.urlencoded({ extended: true }));

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const tableName = process.env.AIRTABLE_TABLE_NAME || 'Event';

const formHTML = (formId, error = '') => `
<!DOCTYPE html>
<html>
<head>
  <title>Campfire Forms</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 400px; margin: 80px auto; padding: 20px; }
    input[type="email"] { width: 100%; padding: 12px; font-size: 16px; border: 1px solid #ccc; border-radius: 6px; margin-bottom: 12px; box-sizing: border-box; }
    button { width: 100%; padding: 12px; font-size: 16px; background: #ec3750; color: white; border: none; border-radius: 6px; cursor: pointer; }
    button:hover { background: #d32f45; }
    .error { color: #ec3750; margin-bottom: 12px; }
    h1 { margin-bottom: 24px; }
  </style>
</head>
<body>
  <h1>🔥 Campfire Forms</h1>
  ${error ? `<p class="error">${error}</p>` : ''}
  <form method="POST">
    <input type="email" name="email" placeholder="Enter your email" required autofocus>
    <button type="submit">Continue to Form</button>
  </form>
  <p>You muse use your Campfire-registered POC email to continue to this form</p>
  <br>
  <p>Have issues? <a href="mailto:leo@hackclub.com">Shoot Leo an email</a> or ask your RM.</p>
</body>
</html>
`;

app.get('/:formId', (req, res) => {
  res.send(formHTML(req.params.formId));
});

app.post('/:formId', async (req, res) => {
  const { formId } = req.params;
  const { email } = req.body;

  console.log(`[SEARCH] Form: ${formId}, Email: "${email}"`);

  if (!email) {
    console.log('[SEARCH] Rejected: empty email');
    return res.send(formHTML(formId, 'Please enter your email.'));
  }

  const sanitizedEmail = email.trim().toLowerCase();
  const escapedEmail = sanitizedEmail.replace(/"/g, '\\"');
  const filterFormula = `FIND("${escapedEmail}", LOWER(ARRAYJOIN({poc_email}, ",")))`;
  console.log(`[SEARCH] Table: ${tableName}, Filter: ${filterFormula}`);

  try {
    const records = await base(tableName)
      .select({
        filterByFormula: filterFormula,
        maxRecords: 1,
      })
      .firstPage();

    console.log(`[SEARCH] Results: ${records.length} record(s) found`);

    if (records.length === 0) {
      console.log(`[SEARCH] No match for email: "${sanitizedEmail}"`);
      return res.send(formHTML(formId, 'No matching record found for that email.'));
    }

    const record = records[0];
    const recordId = record.id;
    const pocEmailField = record.get('poc_email');
    console.log(`[SEARCH] Match found - Record ID: ${recordId}, poc_email: "${pocEmailField}"`);

    const redirectUrl = `https://forms.hackclub.com/t/${formId}?id=${recordId}`;
    console.log(`[SEARCH] Redirecting to: ${redirectUrl}`);
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('[SEARCH] Airtable error:', err.message);
    console.error('[SEARCH] Full error:', err);
    res.send(formHTML(formId, 'Something went wrong. Please try again.'));
  }
});

app.get('/', (req, res) => {
  res.send('<p>Please access a form URL like <code>/hVKvAVGBf8us</code></p>');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
