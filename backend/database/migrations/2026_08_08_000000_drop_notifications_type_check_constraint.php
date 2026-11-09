<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Only Postgres enforces this as a named, droppable CHECK constraint;
        // the sqlite test database has no equivalent to remove here.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement(
                "ALTER TABLE notifications ADD CONSTRAINT notifications_type_check ".
                "CHECK (type IN ('new_message', 'expert_reply', 'new_analysis', 'analysis_validated', 'analysis_rejected'))"
            );
        }
    }
};
