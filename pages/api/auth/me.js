// pages/api/auth/me.js
export default function handler(req, res) {
  res.status(200).json({ auth: false, user: null });
}
