export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, level = 'info', userAgent = '' } = req.body;
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] [${level.toUpperCase()}] [Phaser] ${message} (${userAgent})`);
  
  return res.status(200).json({ success: true });
}
