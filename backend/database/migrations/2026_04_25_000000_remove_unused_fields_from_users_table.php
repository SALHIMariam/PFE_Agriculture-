<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Étape 1 : supprimer les contraintes FK (doit précéder la suppression des colonnes en PostgreSQL)
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['region_id']);
            $table->dropForeign(['cooperative_id']);
        });

        // Étape 2 : supprimer les colonnes
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'language', 'notification_settings', 'region_id', 'cooperative_id']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone')->nullable()->after('password');
            $table->json('notification_settings')->nullable();
            $table->string('language', 10)->default('fr');
            $table->foreignId('region_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('cooperative_id')->nullable()->constrained()->nullOnDelete();
        });
    }
};
