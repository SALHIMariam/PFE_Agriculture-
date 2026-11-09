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
            $table->float('temperature')->nullable()->after('confidence');
            $table->float('humidity')->nullable()->after('temperature');
            $table->float('rainfall')->nullable()->after('humidity');
            $table->float('wind_speed')->nullable()->after('rainfall');
            $table->timestamp('weather_fetched_at')->nullable()->after('wind_speed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('analyses', function (Blueprint $table) {
            $table->dropColumn(['temperature', 'humidity', 'rainfall', 'wind_speed', 'weather_fetched_at']);
        });
    }
};
