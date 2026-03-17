export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const url = `https://api.contentful.com/spaces/${process.env.CONTENTFUL_SPACE_ID}/environments/master/entries`;

  const data = {
    fields: {
      name: { 'nl-NL': body.name },
      message: { 'nl-NL': body.message },
      anonymous: { 'nl-NL': body.anonymous },
      dat: { 'nl-NL': new Date().toJSON() },
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CONTENTFUL_POST_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Contentful-Content-Type': 'donationReaction',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Contentful error:', text);
      return { statusCode: 502, body: 'Failed to create entry' };
    }

    const entry = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.sys.id }),
    };
  } catch (error) {
    console.error('create-donation error:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};
