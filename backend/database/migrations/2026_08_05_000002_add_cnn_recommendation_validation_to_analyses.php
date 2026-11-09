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
        Schema::table('analyses', function (Blueprint $table) {
            $table->enum('cnn_validation_status', ['pending', 'validated', 'rejected'])->default('pending')->after('expert_comment');
            $table->foreignId('cnn_expert_id')->nullable()->after('cnn_validation_status')->constrained('users')->nullOnDelete();
            $table->timestamp('cnn_validated_at')->nullable()->after('cnn_expert_id');
            $table->text('cnn_expert_comment')->nullable()->after('cnn_validated_at');

            $table->enum('reco_validation_status', ['pending', 'validated', 'rejected'])->default('pending')->after('cnn_expert_comment');
            $table->foreignId('reco_expert_id')->nullable()->after('reco_validation_status')->constrained('users')->nullOnDelete();
            $table->timestamp('reco_validated_at')->nullable()->after('reco_expert_id');
            $table->text('reco_expert_comment')->nullable()->after('reco_validated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('analyses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cnn_expert_id');
            $table->dropConstrainedForeignId('reco_expert_id');
            $table->dropColumn([
                'cnn_validation_status',
                'cnn_validated_at',
                'cnn_expert_comment',
                'reco_validation_status',
                'reco_validated_at',
                'reco_expert_comment',
            ]);
        });
    }
};
