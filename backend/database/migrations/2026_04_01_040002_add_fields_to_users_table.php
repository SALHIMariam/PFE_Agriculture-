<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('farm')->nullable()->after('name');
            $table->string('phone')->nullable()->after('password');
            $table->json('crops')->nullable()->after('phone');
            $table->string('farm_profile')->nullable()->after('crops'); // Small, Medium, Large
            $table->boolean('is_active')->default(true)->after('farm_profile');
            $table->foreignId('region_id')->nullable()->constrained()->nullOnDelete()->after('is_active');
            $table->foreignId('cooperative_id')->nullable()->constrained()->nullOnDelete()->after('region_id');
            $table->string('language', 10)->default('fr')->after('cooperative_id');
            $table->json('notification_settings')->nullable()->after('language');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['region_id']);
            $table->dropForeign(['cooperative_id']);
            $table->dropColumn([
                'farm',
                'phone',
                'crops',
                'farm_profile',
                'is_active',
                'region_id',
                'cooperative_id',
                'language',
                'notification_settings',
            ]);
        });
    }
};
