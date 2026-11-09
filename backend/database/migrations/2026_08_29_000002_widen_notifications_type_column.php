<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The original notifications table used $table->enum('type', [5 fixed
 * values]) — new types have been added to NotificationService since
 * (cnn_validated, cnn_rejected, reco_validated, reco_rejected, and now
 * risk_alert) without ever widening that list.
 *
 * On Postgres this is harmless: migration 2026_08_08_000000 already dropped
 * the named CHECK constraint entirely, leaving a plain varchar column.
 * On SQLite, the enum's CHECK is baked into the table definition itself and
 * that migration was a no-op there — so the *test* database has silently
 * been rejecting every notification type outside the original 5 all along.
 * SQLite has no ALTER for this, so the table is rebuilt without the
 * constraint (same fix applied Postgres already has), with a native
 * INSERT-SELECT so any existing rows survive the rebuild.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }

        Schema::create('notifications_rebuilt', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->string('title');
            $table->string('body');
            $table->json('data')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_read']);
            $table->index(['user_id', 'created_at']);
        });

        DB::statement(
            'INSERT INTO notifications_rebuilt (id, user_id, type, title, body, data, is_read, read_at, created_at, updated_at) '
            .'SELECT id, user_id, type, title, body, data, is_read, read_at, created_at, updated_at FROM notifications'
        );

        Schema::drop('notifications');
        Schema::rename('notifications_rebuilt', 'notifications');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }

        Schema::create('notifications_reverted', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', [
                'new_message',
                'expert_reply',
                'new_analysis',
                'analysis_validated',
                'analysis_rejected',
            ]);
            $table->string('title');
            $table->string('body');
            $table->json('data')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_read']);
            $table->index(['user_id', 'created_at']);
        });

        DB::statement(
            'INSERT INTO notifications_reverted (id, user_id, type, title, body, data, is_read, read_at, created_at, updated_at) '
            ."SELECT id, user_id, type, title, body, data, is_read, read_at, created_at, updated_at FROM notifications "
            ."WHERE type IN ('new_message', 'expert_reply', 'new_analysis', 'analysis_validated', 'analysis_rejected')"
        );

        Schema::drop('notifications');
        Schema::rename('notifications_reverted', 'notifications');
    }
};
