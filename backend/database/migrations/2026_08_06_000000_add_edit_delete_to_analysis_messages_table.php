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
        Schema::table('analysis_messages', function (Blueprint $table) {
            $table->boolean('is_deleted')->default(false)->after('message');
            $table->boolean('is_edited')->default(false)->after('is_deleted');
            $table->timestamp('deleted_at')->nullable()->after('is_edited');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('analysis_messages', function (Blueprint $table) {
            $table->dropColumn(['is_deleted', 'is_edited', 'deleted_at']);
        });
    }
};
