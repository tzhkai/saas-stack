/**
 * Cloudflare Worker: floating affiliate button
 * Route: markdownmaster.site/*
 * Adds a fixed-position button (bottom-right) that opens a popup on click.
 * Zero layout impact — does not modify any DOM element.
 * 
 * IMPORTANT: Only injects into HTML responses (content-type: text/html).
 * Static assets (JS, CSS, images, fonts) are passed through untouched.
 */
export default {
  async fetch(request, env) {
    const origin = "https://tool-markdown.pages.dev";
    const url = new URL(request.url);

    // ── 301 redirects for zombie URLs (old slugs without "how-to-" prefix) ──
    const REDIRECTS = {
      "/blog/build-blog-with-markdown-astro/":          "/blog/how-to-build-blog-with-markdown-astro/",
      "/blog/write-markdown-step-by-step/":             "/blog/how-to-write-markdown-step-by-step/",
      "/blog/write-perfect-readme-markdown-github/":    "/blog/how-to-write-a-perfect-readme-markdown-github/",
      "/blog/write-markdown-complete-beginners-guide/": "/blog/what-is-markdown-complete-beginners-guide/",
      "/blog/use-ai-write-markdown/":                   "/blog/how-to-use-ai-to-write-markdown/",
      "/blog/convert-markdown-to-html/":                "/blog/how-to-convert-markdown-to-html/",
      "/blog/markdown-cheat-sheet/":                    "/blog/markdown-cheat-sheet-complete-guide/",
      "/blog/markdown-editors-tools-2026/":             "/blog/best-markdown-editors-tools-2026/",
      "/pricing/":                                      "/editor/",
    };
    if (REDIRECTS[url.pathname]) {
      return Response.redirect("https://markdownmaster.site" + REDIRECTS[url.pathname], 301);
    }

    const proxyUrl = origin + url.pathname + url.search;

    // For non-HTML requests (JS, CSS, images, fonts, etc.), pass through directly
    // without any injection to avoid corrupting static assets
    const accept = request.headers.get("accept") || "";
    const ext = url.pathname.split(".").pop().toLowerCase();
    const staticExts = ["js", "css", "png", "jpg", "jpeg", "gif", "svg", "ico", "woff", "woff2", "ttf", "eot", "otf", "webp", "avif", "json", "xml", "txt", "map", "webmanifest"];
    
    if (staticExts.includes(ext)) {
      return fetch(proxyUrl);
    }

    let response;
    try {
      response = await fetch(proxyUrl);
    } catch (e) {
      return new Response("Origin error: " + e.message, { status: 502 });
    }
    if (!response.ok) return response;

    // Check response content-type — only inject into HTML
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return response;
    }

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

    // No links to show — skip injection entirely
    if (!links || links.length === 0) {
      return new Response(html, { status: response.status, headers: { "content-type": "text/html; charset=utf-8" } });
    }

    const script = `<script>
!function(){
var l=${JSON.stringify(links)};
var d=document.createElement("div");
d.id="afw";
d.innerHTML='<button id="afb" style="position:fixed;bottom:20px;right:20px;z-index:9999;width:48px;height:48px;border-radius:50%;background:#0ea5e9;color:#fff;border:none;cursor:pointer;font-size:1.3rem;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">\\u{1F517}</button><div id="afp" style="display:none;position:fixed;bottom:76px;right:20px;z-index:9998;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:8px;min-width:240px;box-shadow:0 8px 24px rgba(0,0,0,0.4)"></div>';
var b=d.querySelector("#afb"),p=d.querySelector("#afp");
p.innerHTML=l.map(function(x){
var t=x.title||x.text||"Tool",d=x.description||"",u=x.url||"#",c=x.cta||"Learn More";
return '<a href="'+u+'" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;text-decoration:none;color:#e2e8f0;transition:background .15s" onmouseover="this.style.background=\\"#334155\\"" onmouseout="this.style.background=\\"transparent\\""><div style="flex:1"><div style="font-weight:600;color:#60a5fa;font-size:.85rem">'+t+'</div><div style="font-size:.8rem;color:#94a3b8">'+d+'</div></div><span style="color:#0ea5e9;font-size:.8rem;white-space:nowrap">'+c+' \\u2192</span></a>'
}).join('<div style="height:1px;background:#334155;margin:4px 0"></div>');
b.onclick=function(e){e.stopPropagation();var s=p.style.display;p.style.display=s!="block"?"block":"none"};
document.onclick=function(e){if(!d.contains(e.target))p.style.display="none"};
document.body.appendChild(d);
}();
</script>`;

    html = html.replace("</body>", script + "</body>");
    return new Response(html, { status: response.status, headers: { "content-type": "text/html; charset=utf-8" } });
  }
}
