export async function GET({ request }: { request: Request }) {
  const host = new URL(request.url).host;
  const isProd = host === 'www.makersinc.nl' || host === 'makersinc.nl';

  const body = isProd
    ? `User-agent: *\nAllow: /\nSitemap: https://www.makersinc.nl/sitemap-index.xml`
    : `User-agent: *\nDisallow: /`;

  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}