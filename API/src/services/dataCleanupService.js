const db = require('../config/db');

class DataCleanupService {
  constructor() {
    this.cleanupIntervals = {
      statusHistory: 30 * 24 * 60 * 60 * 1000, // 30 days
      archivedIncidents: 90 * 24 * 60 * 60 * 1000, // 90 days
      cameraAnalytics: 180 * 24 * 60 * 60 * 1000, // 180 days
      duplicateCameras: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    this.cleanupScheduled = false;
    this.lastCleanup = null;
  }

  // Clean up old camera status history
  async cleanupStatusHistory() {
    try {
      // Starting operation
      
      const cutoffDate = new Date(Date.now() - this.cleanupIntervals.statusHistory);
      
      const result = await db.query(`
        DELETE FROM public."CameraStatusHistory" 
        WHERE "StatusHistory_Timestamp" < $1
      `, [cutoffDate]);
      
      console.log(`Cleaned up ${result.rowCount} old status history records`);
      return { success: true, deletedCount: result.rowCount };
    } catch (error) {
      console.error('Error cleaning up status history:', error);
      return { success: false, error: error.message };
    }
  }

  // Clean up old archived incidents
  async cleanupArchivedIncidents() {
    try {
      // Starting operation
      
      const cutoffDate = new Date(Date.now() - this.cleanupIntervals.archivedIncidents);
      
      const result = await db.query(`
        DELETE FROM public."ArchivesV2" 
        WHERE "Archive_DateTime" < $1 
        AND "Archive_Type" = 'incident'
      `, [cutoffDate]);
      
      console.log(`Cleaned up ${result.rowCount} old archived incidents`);
      return { success: true, deletedCount: result.rowCount };
    } catch (error) {
      console.error('Error cleaning up archived incidents:', error);
      return { success: false, error: error.message };
    }
  }

  // Clean up old camera analytics
  async cleanupCameraAnalytics() {
    try {
      // Starting operation
      
      const cutoffDate = new Date(Date.now() - this.cleanupIntervals.cameraAnalytics);
      
      const result = await db.query(`
        DELETE FROM public."CameraAnalytics" 
        WHERE "Analytics_Date" < $1
      `, [cutoffDate]);
      
      console.log(`Cleaned up ${result.rowCount} old camera analytics records`);
      return { success: true, deletedCount: result.rowCount };
    } catch (error) {
      console.error('Error cleaning up camera analytics:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove duplicate cameras (keep the most recent)
  async cleanupDuplicateCameras() {
    try {
      // Starting operation
      
      const duplicateQuery = `
        WITH RankedCameras AS (
          SELECT 
            "Camera_ID",
            "Camera_ExternalID",
            "Camera_LastStatusCheck",
            ROW_NUMBER() OVER (
              PARTITION BY "Camera_ExternalID" 
              ORDER BY "Camera_LastStatusCheck" DESC, "Camera_ID" DESC
            ) as rn
          FROM public."Camera"
          WHERE "Camera_ExternalID" IS NOT NULL
        )
        DELETE FROM public."Camera" 
        WHERE "Camera_ID" IN (
          SELECT "Camera_ID" 
          FROM RankedCameras 
          WHERE rn > 1
        )
      `;
      
      const result = await db.query(duplicateQuery);
      
      console.log(`Cleaned up ${result.rowCount} duplicate camera records`);
      return { success: true, deletedCount: result.rowCount };
    } catch (error) {
      console.error('Error cleaning up duplicate cameras:', error);
      return { success: false, error: error.message };
    }
  }

  // Clean up orphaned status history (cameras that no longer exist)
  async cleanupOrphanedStatusHistory() {
    try {
      // Starting operation
      
      const result = await db.query(`
        DELETE FROM public."CameraStatusHistory" 
        WHERE "StatusHistory_CameraID" NOT IN (
          SELECT "Camera_ID" FROM public."Camera"
        )
      `);
      
      console.log(`Cleaned up ${result.rowCount} orphaned status history records`);
      return { success: true, deletedCount: result.rowCount };
    } catch (error) {
      console.error('Error cleaning up orphaned status history:', error);
      return { success: false, error: error.message };
    }
  }

  // Vacuum and analyze tables for better performance
  async optimizeTables() {
    try {
      // Starting operation
      
      const tables = [
        'public."Camera"',
        'public."CameraStatusHistory"',
        'public."CameraAnalytics"',
        'public."ArchivesV2"'
      ];
      
      for (const table of tables) {
        try {
          await db.query(`VACUUM ANALYZE ${table}`);
          console.log(`Optimized table: ${table}`);
        } catch (error) {
          console.error(`Error optimizing table ${table}:`, error);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error optimizing tables:', error);
      return { success: false, error: error.message };
    }
  }

  // Get database size statistics
  async getDatabaseStats() {
    try {
      // Get available tables first - only check for tables we actually use
      const availableTables = await db.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('Camera', 'CameraStatusHistory', 'CameraAnalytics', 'ArchivesV2')
      `);
      
      const tableNames = availableTables.rows.map(row => row.tablename);
      const tableNamesStr = tableNames.map(name => `'${name}'`).join(',');

      const stats = tableNamesStr ? await db.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public' 
        AND tablename IN (${tableNamesStr})
        ORDER BY tablename, attname
      `) : { rows: [] };
      
      const tableSizes = tableNamesStr ? await db.query(`
        SELECT 
          tablename,
          pg_size_pretty(pg_total_relation_size('"' || schemaname || '"."' || tablename || '"')) as size,
          pg_total_relation_size('"' || schemaname || '"."' || tablename || '"') as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (${tableNamesStr})
        ORDER BY pg_total_relation_size('"' || schemaname || '"."' || tablename || '"') DESC
      `) : { rows: [] };

      // Build dynamic row count query with error handling for each table
      let rowCountResults = [];
      for (const tableName of tableNames) {
        try {
          const result = await db.query(`
            SELECT 
              '${tableName}' as table_name,
              COUNT(*) as row_count
            FROM public."${tableName}"
          `);
          if (result.rows.length > 0) {
            rowCountResults.push(result.rows[0]);
          }
        } catch (error) {
          console.warn(`Table "${tableName}" not accessible for row count:`, error.message);
          // Add placeholder with 0 count for missing tables
          rowCountResults.push({
            table_name: tableName,
            row_count: 0
          });
        }
      }
      
      const rowCounts = { rows: rowCountResults };

      return {
        tableSizes: tableSizes.rows,
        rowCounts: rowCounts.rows,
        columnStats: stats.rows
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return { error: error.message };
    }
  }

  // Run all cleanup operations
  async runFullCleanup() {
    try {
      // Starting operation
      const startTime = Date.now();
      
      const results = {
        statusHistory: await this.cleanupStatusHistory(),
        archivedIncidents: await this.cleanupArchivedIncidents(),
        cameraAnalytics: await this.cleanupCameraAnalytics(),
        duplicateCameras: await this.cleanupDuplicateCameras(),
        orphanedStatusHistory: await this.cleanupOrphanedStatusHistory(),
        optimization: await this.optimizeTables()
      };
      
      const totalDeleted = Object.values(results)
        .filter(result => result.deletedCount)
        .reduce((sum, result) => sum + result.deletedCount, 0);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.lastCleanup = new Date();
      
      console.log(`Full cleanup completed in ${duration}ms. Total records deleted: ${totalDeleted}`);
      
      return {
        success: true,
        duration,
        totalDeleted,
        details: results,
        timestamp: this.lastCleanup
      };
    } catch (error) {
      console.error('Error during full cleanup:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  // Schedule automatic cleanup
  startScheduledCleanup() {
    if (this.cleanupScheduled) {
      console.log('Cleanup already scheduled');
      return;
    }

    // Run cleanup every 24 hours
    const cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
    
    this.cleanupTimer = setInterval(async () => {
      console.log('Running scheduled database cleanup...');
      await this.runFullCleanup();
    }, cleanupInterval);
    
    this.cleanupScheduled = true;
    console.log('Scheduled cleanup started (runs every 24 hours)');
    
    // Run initial cleanup after 5 minutes
    setTimeout(async () => {
      console.log('Running initial database cleanup...');
      await this.runFullCleanup();
    }, 5 * 60 * 1000);
  }

  // Stop scheduled cleanup
  stopScheduledCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      this.cleanupScheduled = false;
      console.log('Scheduled cleanup stopped');
    }
  }

  // Get cleanup service status
  getStatus() {
    return {
      cleanupScheduled: this.cleanupScheduled,
      lastCleanup: this.lastCleanup,
      cleanupIntervals: this.cleanupIntervals
    };
  }
}

// Singleton instance
const dataCleanupService = new DataCleanupService();

module.exports = dataCleanupService;