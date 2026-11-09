<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('irrigation_system')->nullable()->after('farm_profile');
            $table->string('main_season')->nullable()->after('irrigation_system');
            $table->decimal('surface_ha', 8, 2)->nullable()->after('main_season');
            $table->string('language', 5)->default('fr')->after('surface_ha');
            $table->json('notification_preferences')->nullable()->after('language');
            $table->boolean('two_factor_enabled')->default(false)->after('notification_preferences');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'irrigation_system',
                'main_season',
                'surface_ha',
                'language',
                'notification_preferences',
                'two_factor_enabled',
            ]);
        });
    }
};
