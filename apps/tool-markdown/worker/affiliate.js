/**
 * Cloudflare Worker: affiliate link injection
 * Route: markdownmaster.site/*
 * Injects a fixed-position floating badge (bottom-right) via JS.
 * Does not modify any existing DOM element or layout.
 */
export default {
  async fetch(request, env) {
    const origin = "https://tool-markdown.pages.dev";
    const url = new URL(request.url);
    const proxyUrl = origin + url.pathname + url.search;

    const accept = request.headers.get("accept") || "";
    if (!(accept.includes("text/html") || accept.includes("*/*") || accept === ""))
      return fetch(proxyUrl);

    let response;
    try {
      response = await fetch(proxyUrl, { headers: { "accept": "text/html" } });
    } catch (e) {
      return new Response("Origin error: " + e.message, { status: 502 });
    }
    if (!response.ok) return response;

    let html = await response.text();
    if (!html.includes("</body>"))
      return new Response(html, { status: response.status, headers: { "content-type": "text/html; charset=utf-8" } });

    // Load links from D1
    let links = [];
    try {
      const results = await env.DB.prepare(
        "SELECT links_json FROM link_templates WHERE site_id = ?"
      ).bind("tool-markdown").first();
      if (results && results.links_json) links = JSON.parse(results.links_json);
    } catch (e) {
      console.error("D1 error:", e.message);
    }

    // Floating badge: fixed position at bottom-right
    const script = '<script>' +
    '!function(){' +
    'var l=' + JSON.stringify(links) + ';' +
    'if(!l||!l.length)return;' +
    'var c=document.createElement("div");' +
    'c.innerHTML=\'' +
    '<button id="afb" style="position:fixed;bottom:20px;right:20px;z-index:9999;padding:10px 16px;background:#0ea5e9;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.85rem;font-family:Inter,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3)">\\u{1F517}</button>' +
    '<div id="afp" style="display:none;position:fixed;bottom:70px;right:20px;z-index:9998;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px;min-width:260px;max-width:320px;box-shadow:0 8px 24px rgba(0,0,0,0.4)"></div>' +
    '\';' +
    'var b=c.querySelector("#afb"),p=c.querySelector("#afp");' +
    'p.innerHTML=l.map(function(x){' +
    'var t=x.title||x.text||"Tool",d=x.description||"",u=x.url||"#",ct=x.cta||"Learn More";' +
    'return\'<a href="\'+u+\'" target="_blank" rel="noopener sponsored" style="display:flex;padding:10px;border-bottom:1px solid #334155;text-decoration:none;color:#e2e8f0"><div><div style="font-weight:600;color:#60a5fa">\'+t+\'</div><div style="font-size:0.8rem;color:#94a3b8">\'+d+\'</div><div style="font-size:0.8rem;color:#0ea5e9;margin-top:4px">\'+ct+\' \\u2192</div></div></a>\'' +
    '}).join("");' +
    'b.onclick=function(e){e.stopPropagation();p.style.display=p.style.display!="block"?"block":"none"};' +
    'document.onclick=function(e){if(!c.contains(e.target))p.style.display="none"};' +
    'document.body.appendChild(c);' +
    '}();</script>';

    html = html.replace("</body>", script + "</body>");
    return new Response(html, { status: response.status, headers: { "content-type": "text/html; charset=utf-8" } });
  }
}
