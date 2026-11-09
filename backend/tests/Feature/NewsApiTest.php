<?php

namespace Tests\Feature;

use App\Models\NewsItem;
use App\Models\User;
use App\Services\News\NewsAiClient;
use App\Services\News\NewsIngestionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class NewsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'farmer', 'guard_name' => 'web']);
    }

    private function farmer(): User
    {
        $user = User::factory()->create();
        $user->assignRole('farmer');

        return $user;
    }

    private function makeNewsItem(array $overrides = []): NewsItem
    {
        $url = $overrides['url'] ?? 'https://example.test/'.uniqid();

        return NewsItem::create(array_merge([
            'title' => 'Mildiou détecté sur tomate',
            'summary' => 'Résumé IA de test.',
            'source_name' => 'Source Test',
            'url' => $url,
            'url_hash' => hash('sha256', $url),
            'category' => 'alert',
            'crop' => 'Tomato',
            'disease_class' => 'Tomato__late_blight',
            'relevance_score' => 0.8,
            'ai_generated' => false,
            'published_at' => now(),
        ], $overrides));
    }

    public function test_guest_cannot_list_news(): void
    {
        $response = $this->getJson('/api/news');

        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_list_news(): void
    {
        $this->makeNewsItem(['title' => 'Article A']);
        $this->makeNewsItem(['title' => 'Article B', 'url' => 'https://example.test/b']);

        $response = $this->actingAs($this->farmer())->getJson('/api/news');

        $response->assertStatus(200);
        $response->assertJsonCount(2, 'data');
    }

    public function test_low_relevance_items_are_hidden(): void
    {
        $this->makeNewsItem(['title' => 'Pertinent', 'relevance_score' => 0.8]);
        $this->makeNewsItem(['title' => 'Peu pertinent', 'url' => 'https://example.test/low', 'relevance_score' => 0.2]);

        $response = $this->actingAs($this->farmer())->getJson('/api/news');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.title', 'Pertinent');
    }

    public function test_news_can_be_filtered_by_crop(): void
    {
        $this->makeNewsItem(['title' => 'Tomate', 'crop' => 'Tomato']);
        $this->makeNewsItem(['title' => 'Blé', 'url' => 'https://example.test/wheat', 'crop' => 'Wheat']);

        $response = $this->actingAs($this->farmer())->getJson('/api/news?crop=Wheat');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.title', 'Blé');
    }

    public function test_news_can_be_searched(): void
    {
        $this->makeNewsItem(['title' => 'Alerte rouille du blé']);
        $this->makeNewsItem(['title' => 'Subventions agricoles 2026', 'url' => 'https://example.test/subventions']);

        $response = $this->actingAs($this->farmer())->getJson('/api/news?search=rouille');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_trending_endpoint_returns_crop_and_category_breakdown(): void
    {
        $this->makeNewsItem(['crop' => 'Tomato', 'category' => 'alert']);
        $this->makeNewsItem(['crop' => 'Tomato', 'url' => 'https://example.test/2', 'category' => 'alert']);
        $this->makeNewsItem(['crop' => 'Wheat', 'url' => 'https://example.test/3', 'category' => 'info']);

        $response = $this->actingAs($this->farmer())->getJson('/api/news/trending');

        $response->assertStatus(200);
        $response->assertJsonPath('crops.0.crop', 'Tomato');
        $response->assertJsonPath('crops.0.count', 2);
        $response->assertJsonStructure(['crops', 'categories']);
    }

    public function test_ingestion_is_idempotent_on_rerun(): void
    {
        $rssBody = <<<'XML'
<?xml version="1.0"?>
<rss version="2.0"><channel>
<item>
  <title>Mildiou signalé sur tomate à Nabeul</title>
  <description>Cas de mildiou en hausse.</description>
  <link>https://example-feed.test/article-1</link>
  <pubDate>Mon, 01 Jan 2026 08:00:00 GMT</pubDate>
</item>
</channel></rss>
XML;

        Http::fake([
            '*/news/enrich' => Http::response([], 500),
            'https://example-feed.test/*' => Http::response($rssBody, 200),
        ]);

        config(['news.sources' => [['name' => 'Flux Test', 'url' => 'https://example-feed.test/rss']]]);

        $service = app(NewsIngestionService::class);

        $first = $service->run();
        $second = $service->run();

        $this->assertSame(1, $first['created']);
        $this->assertSame(0, $second['created']);
        $this->assertSame(1, $second['skipped']);
        $this->assertSame(1, NewsItem::count());
    }

    // ----------------------------------------------------- classification

    public function test_fallback_matches_python_on_shared_parity_cases(): void
    {
        // Mêmes cas que ai/news/test_news.py::test_shared_parity_cases : le
        // fallback PHP doit produire exactement les résultats du service Python.
        $cases = json_decode(file_get_contents(base_path('../ai/news/parity_cases.json')), true);
        $client = app(NewsAiClient::class);

        foreach ($cases as $case) {
            $result = $client->fallbackEnrich([
                'title' => $case['title'],
                'description' => $case['description'],
                'link' => 'https://example.test/parity',
            ]);

            foreach ($case['expect'] as $key => $expected) {
                $this->assertSame($expected, $key === 'relevance_score' ? (float) $result[$key] : $result[$key], "{$case['title']} → {$key}");
            }
            $this->assertFalse($result['ai_generated']);
        }
    }

    public function test_ai_service_response_is_never_flagged_as_ai_generated(): void
    {
        Http::fake(['*/news/enrich' => Http::response([
            'summary' => 'Résumé', 'category' => 'info', 'crop' => null,
            'disease_class' => null, 'relevance_score' => 0.5,
        ], 200)]);

        $result = app(NewsAiClient::class)->enrich(['title' => 'T', 'description' => '', 'link' => 'https://x.test']);

        $this->assertFalse($result['ai_generated']);
    }

    public function test_search_and_disease_filter_ignore_case(): void
    {
        $this->makeNewsItem(['title' => 'Le Mildiou progresse', 'disease_class' => 'Tomato__late_blight']);

        $this->actingAs($this->farmer())->getJson('/api/news?search=mildiou')->assertJsonCount(1, 'data');
        $this->actingAs($this->farmer())->getJson('/api/news?disease=late_blight')->assertJsonCount(1, 'data');
    }

    // ------------------------------------------------- liens et images

    public function test_relevant_google_news_item_gets_resolved_url_image_and_summary(): void
    {
        $rss = <<<'XML'
<?xml version="1.0"?>
<rss version="2.0"><channel>
<item>
  <title>Alerte mildiou sur la tomate à Nabeul - La Presse</title>
  <description>&lt;a href="https://news.google.com/rss/articles/ABC123?oc=5"&gt;Alerte mildiou sur la tomate à Nabeul&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;La Presse&lt;/font&gt;</description>
  <link>https://news.google.com/rss/articles/ABC123?oc=5</link>
  <source url="https://www.lapresse.tn">La Presse</source>
  <pubDate>Mon, 01 Jan 2026 08:00:00 GMT</pubDate>
</item>
</channel></rss>
XML;
        $batch = ")]}'\n\n".json_encode([['wrb.fr', 'Fbv4je', json_encode(['garturlres', 'https://www.lapresse.tn/article-mildiou', 1]), null]]);

        Http::preventStrayRequests();
        Http::fake([
            '*/news/enrich' => Http::response([], 500),
            'https://feed.test/*' => Http::response($rss, 200),
            'https://news.google.com/rss/articles/ABC123' => Http::response('<div data-n-a-sg="SIG" data-n-a-ts="1700000000"></div>', 200),
            'https://news.google.com/_/DotsSplashUi/*' => Http::response($batch, 200),
            'https://www.lapresse.tn/article-mildiou' => Http::response(
                '<head><meta property="og:image" content="https://cdn.test/mildiou.jpg"><meta property="og:description" content="Des foyers de mildiou ont été signalés dans les serres de Nabeul."></head>', 200),
        ]);
        config(['news.sources' => [['name' => 'Flux Test', 'url' => 'https://feed.test/rss']]]);

        $stats = app(NewsIngestionService::class)->run();
        $item = NewsItem::sole();

        $this->assertSame(1, $stats['resolved']);
        $this->assertSame('https://www.lapresse.tn/article-mildiou', $item->url);
        $this->assertSame(hash('sha256', 'https://news.google.com/rss/articles/ABC123?oc=5'), $item->url_hash);
        $this->assertSame('https://cdn.test/mildiou.jpg', $item->image_url);
        $this->assertSame('Des foyers de mildiou ont été signalés dans les serres de Nabeul.', $item->summary);
        $this->assertSame('La Presse', $item->source_name);
        $this->assertSame('Alerte mildiou sur la tomate à Nabeul', $item->title);
        $this->assertSame('Tomato__late_blight', $item->disease_class);
        $this->assertFalse($item->ai_generated);
    }

    public function test_feed_image_and_hidden_items_skip_extra_requests(): void
    {
        $rss = <<<'XML'
<?xml version="1.0"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel>
<item>
  <title>Hausse des prix de l'immobilier</title>
  <link>https://feed.test/immobilier</link>
  <media:content url="https://cdn.test/immo.jpg" medium="image"/>
</item>
</channel></rss>
XML;
        Http::preventStrayRequests();
        Http::fake([
            '*/news/enrich' => Http::response([], 500),
            'https://feed.test/rss' => Http::response($rss, 200),
        ]);
        config(['news.sources' => [['name' => 'Flux Test', 'url' => 'https://feed.test/rss']]]);

        app(NewsIngestionService::class)->run();
        $item = NewsItem::sole();

        // Article non agricole : masqué, et aucune requête de résolution
        // (preventStrayRequests aurait levé une exception).
        $this->assertLessThan(0.5, $item->relevance_score);
        $this->assertSame('https://cdn.test/immo.jpg', $item->image_url);
        $this->assertSame('https://feed.test/immobilier', $item->url);
    }
}
