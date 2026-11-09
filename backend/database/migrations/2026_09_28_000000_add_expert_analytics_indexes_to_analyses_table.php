<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('analyses', function (Blueprint $table) {
            $table->index(['expert_id', 'validation_status'], 'analyses_expert_id_validation_status_index');
            $table->index(['predicted_class', 'validation_status'], 'analyses_predicted_class_validation_status_index');
        });
    }

    public function down(): void
    {
        Schema::table('analyses', function (Blueprint $table) {
            $table->dropIndex('analyses_expert_id_validation_status_index');
            $table->dropIndex('analyses_predicted_class_validation_status_index');
        });
    }
};
