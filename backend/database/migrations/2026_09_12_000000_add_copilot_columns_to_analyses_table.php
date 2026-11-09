<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('analyses', function (Blueprint $table) {
            $table->text('draft_response')->nullable();
            $table->boolean('expert_edited_response')->default(false);
            $table->text('expert_response')->nullable();
            $table->integer('priority_score')->nullable();
            $table->string('priority_level', 20)->nullable();
            $table->string('safety_verdict', 20)->nullable();
            $table->integer('confidence_score')->nullable();
            $table->timestamp('responded_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('analyses', function (Blueprint $table) {
            $table->dropColumn([
                'draft_response',
                'expert_edited_response',
                'expert_response',
                'priority_score',
                'priority_level',
                'safety_verdict',
                'confidence_score',
                'responded_at',
            ]);
        });
    }
};
