<?php

namespace App\Services\News;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Retrouve l'article d'origine derrière un lien Google News, puis lit ses
 * métadonnées Open Graph (image, description).
 *
 * Les liens news.google.com/rss/articles/… ne redirigent PAS en HTTP : Google
 * renvoie une page 200 qui redirige en JavaScript. L'URL réelle s'obtient via
 * l'endpoint interne `batchexecute` de Google News, avec la signature et
 * l'horodatage présents dans cette page. Cet endpoint n'est pas documenté et
 * peut changer : tout est best-effort, et en cas d'échec l'appelant garde le
 * lien Google News (toujours fonctionnel pour l'utilisateur).
 */
class ArticleResolver
{
    private const GOOGLE_ARTICLE = '#^https://news\.google\.com/(?:rss/)?articles/([^?/]+)#';

    private const BATCH_URL = 'https://news.google.com/_/DotsSplashUi/data/batchexecute';

    /** URL de l'article source, ou null si le lien n'est pas Google News / non résolu. */
    public function resolveGoogleNewsUrl(string $link): ?string
    {
        if (! preg_match(self::GOOGLE_ARTICLE, $link, $m)) {
            return null;
        }

        $articleId = $m[1];

        try {
            $page = Http::timeout($this->timeout())->get("https://news.google.com/rss/articles/{$articleId}");
            if ($page->failed()
                || ! preg_match('/data-n-a-sg="([^"]+)"/', $page->body(), $sg)
                || ! preg_match('/data-n-a-ts="([^"]+)"/', $page->body(), $ts)) {
                return null;
            }

            $inner = json_encode([
                'garturlreq',
                [['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1], 'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0],
                $articleId,
                (int) $ts[1],
                $sg[1],
            ]);

            $response = Http::asForm()->timeout($this->timeout())->post(self::BATCH_URL, [
                'f.req' => json_encode([[['Fbv4je', $inner, null, 'generic']]]),
            ]);

            if ($response->successful()) {
                return $this->urlFromBatchResponse($response->body());
            }
        } catch (Throwable $e) {
            Log::info('News: résolution du lien Google News impossible', ['link' => $link, 'error' => $e->getMessage()]);
        }

        return null;
    }

    /**
     * Réponse : préfixe anti-XSSI « )]}' », puis un tableau JSON dont un
     * élément contient, sous forme de chaîne JSON, ["garturlres","https://…",…].
     */
    private function urlFromBatchResponse(string $body): ?string
    {
        $json = ltrim(preg_replace('/^\)\]\}\'/', '', $body));

        foreach (preg_split('/\r?\n/', $json) as $line) {
            $outer = json_decode($line, true);
            if (! is_array($outer)) {
                continue;
            }
            foreach ($outer as $entry) {
                if (is_array($entry) && ($entry[1] ?? null) === 'Fbv4je' && is_string($entry[2] ?? null)) {
                    $inner = json_decode($entry[2], true);
                    $url = $inner[1] ?? null;

                    return is_string($url) && filter_var($url, FILTER_VALIDATE_URL) ? $url : null;
                }
            }
        }

        return null;
    }

    /**
     * og:image et og:description de la page de l'article.
     *
     * @return array{image: ?string, description: ?string}
     */
    public function fetchMetadata(string $url): array
    {
        $empty = ['image' => null, 'description' => null];

        try {
            $response = Http::timeout($this->timeout())
                ->withHeaders(['User-Agent' => 'Mozilla/5.0 (compatible; AgriNovaNewsBot/1.0)'])
                ->get($url);

            if ($response->failed()) {
                return $empty;
            }

            // Seul l'en-tête <head> nous intéresse.
            $head = substr($response->body(), 0, 200_000);

            return [
                'image' => $this->absoluteUrl($this->metaContent($head, ['og:image', 'twitter:image']), $url),
                'description' => $this->metaContent($head, ['og:description', 'description', 'twitter:description']),
            ];
        } catch (Throwable $e) {
            Log::info('News: métadonnées de l\'article indisponibles', ['url' => $url, 'error' => $e->getMessage()]);

            return $empty;
        }
    }

    /** @param  list<string>  $names */
    private function metaContent(string $html, array $names): ?string
    {
        foreach ($names as $name) {
            $quoted = preg_quote($name, '/');
            // property/name avant ou après content.
            if (preg_match('/<meta[^>]+(?:property|name)=["\']'.$quoted.'["\'][^>]*content=["\']([^"\']+)["\']/i', $html, $m)
                || preg_match('/<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\']'.$quoted.'["\']/i', $html, $m)) {
                $value = trim(html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'));

                return $value !== '' ? $value : null;
            }
        }

        return null;
    }

    private function absoluteUrl(?string $value, string $base): ?string
    {
        if (! $value) {
            return null;
        }
        if (str_starts_with($value, '//')) {
            return 'https:'.$value;
        }
        if (str_starts_with($value, '/')) {
            $parts = parse_url($base);

            return ($parts['scheme'] ?? 'https').'://'.($parts['host'] ?? '').$value;
        }

        return filter_var($value, FILTER_VALIDATE_URL) ? $value : null;
    }

    private function timeout(): int
    {
        return (int) config('news.fetch_timeout', 8);
    }
}
