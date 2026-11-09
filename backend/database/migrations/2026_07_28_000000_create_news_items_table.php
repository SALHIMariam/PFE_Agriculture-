<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('news_items', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('summary');
            $table->string('source_name');
            $table->string('url', 2048)->unique();
            $table->string('url_hash', 64)->index();
            $table->string('image_url', 2048)->nullable();
            $table->enum('category', ['new_disease', 'new_treatment', 'trend', 'alert', 'info'])->default('info');
            $table->string('crop')->nullable();
            $table->string('disease_class')->nullable();
            $table->decimal('relevance_score', 3, 2)->default(0);
            $table->boolean('ai_generated')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['relevance_score', 'published_at']);
            $table->index(['category']);
            $table->index(['crop']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('news_items');
    }
};
