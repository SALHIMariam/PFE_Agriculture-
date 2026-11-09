<?php

namespace App\Services\News;

use App\Models\NewsItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use SimpleXMLElement;

/**
 * Récupère les flux RSS configurés, enrichit chaque article via NewsAiClient
 * et l'enregistre. Idempotent : la déduplication se fait sur url_hash
 * (colonne unique), calculé sur le lien STABLE du flux — pas sur l'URL
 * résolue, qui peut varier d'une exécution à l'autre.
 *
 * Pour les articles assez pertinents pour être affichés, on remplace le lien
 * Google News par l'URL de l'article source et on récupère son image et sa
 * description (ArticleResolver). Les articles masqués n'engendrent aucune
 * requête supplémentaire.
 */
class NewsIngestionService
{
    private const MEDIA_NS = 'http://search.yahoo.com/mrss/';

    public function __construct(
        private NewsAiClient $aiClient,
        private ArticleResolver $resolver,
    ) {
    }

    /**
     * @return array{fetched:int, created:int, skipped:int, failed:int, resolved:int, images:int}
     */
    public function run(): array
    {
        $stats = ['fetched' => 0, 'created' => 0, 'skipped' => 0, 'failed' => 0, 'resolved' => 0, 'images' => 0];

        foreach (config('news.sources') as $source) {
            $items = $this->fetchFeed($source['url']);

            foreach ($items as $item) {
                $stats['fetched']++;

                $urlHash = hash('sha256', $item['link']);

                if (NewsItem::where('url_hash', $urlHash)->exists()) {
                    $stats['skipped']++;

                    continue;
                }

                try {
                    $enriched = $this->aiClient->enrich($item);

                    $url = $item['link'];
                    $imageUrl = $item['image_url'];
                    $summary = $enriched['summary'];

                    if ($enriched['relevance_score'] >= config('news.min_relevance_score') && config('news.resolve_links')) {
                        $resolved = $this->resolver->resolveGoogleNewsUrl($item['link']);
                        if ($resolved) {
                            $url = $resolved;
                            $stats['resolved']++;
                        }

                        $meta = $this->resolver->fetchMetadata($url);
                        $imageUrl ??= $meta['image'];
                        // La description Google News ne contient que le titre et
                        // le nom du site : on préfère celle de l'article source.
                        if ($meta['description'] && $this->isTitleOnly($summary, $item['title'])) {
                            $summary = mb_strimwidth($meta['description'], 0, 280, '…');
                        }
                    }

                    $stats['images'] += $imageUrl ? 1 : 0;

                    NewsItem::create([
                        'title' => $item['title'],
                        'summary' => $summary,
                        'source_name' => $item['source_name'] ?? $source['name'],
                        'url' => $url,
                        'url_hash' => $urlHash,
                        'image_url' => $imageUrl,
                        'category' => $enriched['category'],
                        'crop' => $enriched['crop'],
                        'disease_class' => $enriched['disease_class'],
                        'relevance_score' => $enriched['relevance_score'],
                        'ai_generated' => $enriched['ai_generated'],
                        'published_at' => $item['published_at'],
                    ]);

                    $stats['created']++;
                } catch (\Throwable $e) {
                    Log::error('Failed to ingest news item', [
                        'link' => $item['link'],
                        'error' => $e->getMessage(),
                    ]);
                    $stats['failed']++;
                }
            }
        }

        return $stats;
    }

    /**
     * @return array<int, array{title:string, description:string, link:string, published_at:?string, image_url:?string, source_name:?string}>
     */
    private function fetchFeed(string $feedUrl): array
    {
        try {
            $response = Http::timeout(15)->get($feedUrl);
        } catch (\Throwable $e) {
            Log::warning('Could not fetch news feed', ['url' => $feedUrl, 'error' => $e->getMessage()]);

            return [];
        }

        if ($response->failed()) {
            Log::warning('News feed returned an error', ['url' => $feedUrl, 'status' => $response->status()]);

            return [];
        }

        $xml = @simplexml_load_string($response->body());

        if ($xml === false) {
            Log::warning('Could not parse news feed XML', ['url' => $feedUrl]);

            return [];
        }

        $items = [];

        foreach ($xml->channel->item ?? [] as $entry) {
            $link = trim((string) $entry->link);

            if (! $link) {
                continue;
            }

            $source = trim((string) $entry->source);
            $title = trim((string) $entry->title);

            $items[] = [
                // Google News suffixe le titre par « - Nom du site » : on le
                // retire puisque le site est déjà stocké dans source_name.
                'title' => $source !== '' ? preg_replace('/\s+-\s+'.preg_quote($source, '/').'$/u', '', $title) : $title,
                'description' => trim((string) $entry->description),
                'link' => $link,
                'published_at' => $this->parseDate((string) $entry->pubDate),
                'image_url' => $this->imageFromItem($entry),
                'source_name' => $source !== '' ? $source : null,
            ];
        }

        return $items;
    }

    /**
     * Image fournie par le flux : <media:content>, <media:thumbnail> ou
     * <enclosure type="image/…">. Google News n'en fournit aucune (l'image
     * vient alors de og:image, voir ArticleResolver), mais d'autres flux oui.
     */
    private function imageFromItem(SimpleXMLElement $entry): ?string
    {
        $media = $entry->children(self::MEDIA_NS);

        foreach (['content', 'thumbnail'] as $tag) {
            foreach ($media->{$tag} ?? [] as $node) {
                $url = (string) $node->attributes()->url;
                $medium = (string) $node->attributes()->medium;
                $type = (string) $node->attributes()->type;
                if ($url && ($tag === 'thumbnail' || $medium === 'image' || str_starts_with($type, 'image/') || ($medium === '' && $type === ''))) {
                    return $url;
                }
            }
        }

        foreach ($entry->enclosure ?? [] as $enclosure) {
            $url = (string) $enclosure['url'];
            if ($url && str_starts_with((string) $enclosure['type'], 'image/')) {
                return $url;
            }
        }

        return null;
    }

    private function isTitleOnly(string $summary, string $title): bool
    {
        $normalize = fn (string $s) => mb_strtolower(trim(preg_replace('/[\s\x{00A0}]+/u', ' ', $s)));

        return str_starts_with($normalize($summary), $normalize($title)) || mb_strlen($summary) <= mb_strlen($title) + 40;
    }

    private function parseDate(string $date): ?string
    {
        if (! $date) {
            return null;
        }

        try {
            return Carbon::parse($date)->toDateTimeString();
        } catch (\Throwable) {
            return null;
        }
    }
}
