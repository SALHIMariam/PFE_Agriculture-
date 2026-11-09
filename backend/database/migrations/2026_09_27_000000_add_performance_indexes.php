<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('analyses', function (Blueprint $table) {
            $table->index('predicted_class');
            $table->index('validation_status');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index('governorate');
        });
    }

    public function down(): void
    {
        Schema::table('analyses', function (Blueprint $table) {
            $table->dropIndex(['predicted_class']);
            $table->dropIndex(['validation_status']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['governorate']);
        });
    }
};
