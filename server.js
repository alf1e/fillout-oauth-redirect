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
</body>
</html>
`;

app.get('/:formId', (req, res) => {
  res.send(formHTML(req.params.formId));
});

app.post('/:formId', async (req, res) => {
  const { formId } = req.params;
  const { email } = req.body;

  if (!email) {
    return res.send(formHTML(formId, 'Please enter your email.'));
  }

  try {
    const records = await base(tableName)
      .select({
        filterByFormula: `LOWER({poc_email}) = LOWER("${email.replace(/"/g, '\\"')}")`,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length === 0) {
      return res.send(formHTML(formId, 'No matching record found for that email.'));
    }

    const recordId = records[0].id;
    const redirectUrl = `https://forms.hackclub.com/t/${formId}?id=${recordId}`;
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('Airtable error:', err);
    res.send(formHTML(formId, 'Something went wrong. Please try again.'));
  }
});

app.get('/', (req, res) => {
  res.send('<p>Please access a form URL like <code>/hVKvAVGBf8us</code></p>');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
