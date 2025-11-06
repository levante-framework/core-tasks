// Example webhook handler for core-tasks
// This could be deployed as a serverless function

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { action, repository, ref } = req.body;
  
  if (repository?.name === 'levante_translations' && action === 'completed') {
    // Trigger Cypress tests in core-tasks
    const response = await fetch('https://api.github.com/repos/levante-framework/core-tasks/dispatches', {
      method: 'POST',
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'translations-updated',
        client_payload: {
          source_repo: 'levante_translations',
          ref: ref,
          timestamp: new Date().toISOString()
        }
      })
    });

    if (response.ok) {
      res.status(200).json({ message: 'Tests triggered successfully' });
    } else {
      res.status(500).json({ message: 'Failed to trigger tests' });
    }
  } else {
    res.status(200).json({ message: 'Event ignored' });
  }
}