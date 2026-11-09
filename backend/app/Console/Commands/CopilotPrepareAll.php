<?php

namespace App\Console\Commands;

use App\Models\Analysis;
use App\Services\CopilotService;
use Illuminate\Console\Command;
use Throwable;

class CopilotPrepareAll extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'copilot:prepare-all';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = "Prépare un brouillon Assistant AI pour chaque analyse en attente qui n'en a pas encore.";

    public function handle(CopilotService $copilotService): int
    {
        $analyses = Analysis::where('validation_status', 'pending')
            ->where('cnn_validation_status', 'pending')
            ->where('reco_validation_status', 'pending')
            ->whereNull('draft_response')
            ->with('user')
            ->get();

        if ($analyses->isEmpty()) {
            $this->info('Aucune analyse à préparer.');

            return self::SUCCESS;
        }

        $bar = $this->output->createProgressBar($analyses->count());
        $bar->start();

        $success = 0;
        $errors = 0;

        foreach ($analyses as $analysis) {
            try {
                $copilotService->prepare($analysis);
                $success++;
            } catch (Throwable $e) {
                $errors++;
                $this->newLine();
                $this->error("Analyse #{$analysis->id} : {$e->getMessage()}");
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("Terminé : {$success} succès, {$errors} erreurs.");

        return self::SUCCESS;
    }
}
