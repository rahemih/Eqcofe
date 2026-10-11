const SITE_ORIGIN = "https://eqcofe.com";

export async function loader() {
  return new Response(
    ["User-agent: *", "Allow: /", `Sitemap: ${SITE_ORIGIN}/sitemap.xml`, ""].join("\n"),
    {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    },
  );
}
