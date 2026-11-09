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
        Schema::create('risk_alert_states', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('disease'); // full predicted_class, e.g. "Tomato__early_blight"
            $table->string('governorate');
            $table->string('last_notified_level'); // 'informative' | 'urgent'
            $table->timestamp('last_notified_at');
            $table->timestamps();

            $table->unique(['user_id', 'disease', 'governorate']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('risk_alert_states');
    }
};
