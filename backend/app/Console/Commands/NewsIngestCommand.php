<?php

namespace App\Console\Commands;

use App\Services\News\NewsIngestionService;
use Illuminate\Console\Command;

class NewsIngestCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'news:ingest';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Collecte les flux RSS configurés, les enrichit via le service IA et les stocke (idempotent).';

    public function handle(NewsIngestionService $service): int
    {
        $this->info('Ingestion des actualités en cours...');

        $stats = $service->run();

        $this->table(
            ['Récupérés', 'Créés', 'Déjà existants', 'Échecs', 'Liens résolus', 'Avec image'],
            [[$stats['fetched'], $stats['created'], $stats['skipped'], $stats['failed'], $stats['resolved'], $stats['images']]]
        );

        $this->info('Terminé.');

        return self::SUCCESS;
    }
}
