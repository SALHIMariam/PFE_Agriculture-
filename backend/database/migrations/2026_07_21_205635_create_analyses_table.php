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
        Schema::create('analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('image_path');
            $table->string('predicted_class')->nullable();
            $table->string('crop')->nullable();
            $table->decimal('confidence', 5, 4)->nullable();
            $table->json('top_k')->nullable();
            $table->enum('status', ['pending', 'done', 'failed'])->default('pending');
            $table->unsignedInteger('inference_ms')->nullable();
            $table->text('error_message')->nullable();
            $table->foreignId('expert_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expert_validated_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('analyses');
    }
};
