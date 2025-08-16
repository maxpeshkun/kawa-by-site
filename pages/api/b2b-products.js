
export default async function handler(req, res) {
  if (!["GET","POST"].includes(req.method)) { res.setHeader("Allow","GET, POST"); return res.status(405).json({error:"Method Not Allowed"}); }
  try {
    const demo = require('../../public/data/demo-products.json');
    return res.status(200).json({ products: demo });
  } catch (e) { return res.status(500).json({ error: "Proxy error", details: String(e?.message || e) }); }
}
