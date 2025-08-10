// Worker B — Penyimpanan Valid Permanen MLBB
// Pastikan kamu binding KV di wrangler.toml: PERMANENT_KV

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ======= SIMPAN VALID DARI WORKER A =======
    if (url.pathname === "/store" && request.method === "POST") {
      try {
        const body = await request.json();
        const { secret, account } = body;

        // Validasi SECRET_KEY
        if (secret !== env.SECRET_KEY) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (!account || typeof account !== "string") {
          return new Response(JSON.stringify({ error: "Invalid data" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Simpan ke KV dengan timestamp agar tidak bentrok
        const timestamp = Date.now();
        await env.PERMANENT_KV.put(`valid:${timestamp}`, account);

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // ======= DOWNLOAD SEMUA VALID (hanya owner) =======
    if (url.pathname === "/download" && request.method === "GET") {
      const authHeader = request.headers.get("Authorization");
      if (authHeader !== `Bearer ${env.SECRET_KEY}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      const keys = await env.PERMANENT_KV.list({ prefix: "valid:" });
      let allData = [];

      for (const key of keys.keys) {
        const value = await env.PERMANENT_KV.get(key.name);
        if (value) allData.push(value);
      }

      return new Response(allData.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": "attachment; filename=valid.txt"
        }
      });
    }

    return new Response("Worker B — Storage MLBB Valid", { status: 200 });
  }
};
