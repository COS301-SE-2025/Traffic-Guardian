const db = require('../config/db');
const cacheService = require('../services/cacheService');
const deduplicationService = require('../services/deduplicationService');

const cameraModel = {
  async bulkUpsertCameras(cameras) {
    try {
      // Check for duplicate operation
      const duplicateCheck = await deduplicationService.isDuplicateBulkOperation(cameras);
      
      if (duplicateCheck.isDuplicate) {
        // Return cached result if available
        const cachedResult = cacheService.getBulkOperationResult(duplicateCheck.hash);
        if (cachedResult) {
          console.log('Returning cached bulk operation result');
          return cachedResult;
        }
      }

      // Filter out cameras that haven't changed
      const filterResult = await deduplicationService.filterChangedCameras(cameras);
      const { changedCameras, skippedCameras } = filterResult;

      if (changedCameras.length === 0) {
        const result = { 
          success: true, 
          upsertedCount: 0, 
          skippedCount: skippedCameras.length,
          message: 'No cameras needed updating'
        };
        
        // Mark operation as completed and cache result
        if (duplicateCheck.hash) {
          await deduplicationService.markBulkOperationCompleted(duplicateCheck.hash, result);
        }
        
        return result;
      }

      console.log(`Processing ${changedCameras.length} changed cameras (${skippedCameras.length} skipped)`);

      const client = await db.getPool().connect();
      try {
        await client.query('BEGIN');
        let upsertedCount = 0;

        // Process cameras in batches to improve performance
        const batchSize = 10;
        for (let i = 0; i < changedCameras.length; i += batchSize) {
          const batch = changedCameras.slice(i, i + batchSize);
          
          for (const camera of batch) {
            const query = `
              INSERT INTO public."Camera" (
                "Camera_RoadwayName", "Camera_DirectionOfTravel", "Camera_Longitude", 
                "Camera_Latitude", "Camera_URL", "Camera_District", "Camera_Route", 
                "Camera_County", "Camera_Milepost", "Camera_Description", 
                "Camera_UpdateFrequency", "Camera_HasLiveStream", "Camera_Status", 
                "Camera_LastStatusCheck", "Camera_ImageURL", "Camera_StreamURL", 
                "Camera_Source", "Camera_ExternalID", "Camera_Metadata"
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
              ON CONFLICT ("Camera_ExternalID") 
              DO UPDATE SET
                "Camera_RoadwayName" = EXCLUDED."Camera_RoadwayName",
                "Camera_DirectionOfTravel" = EXCLUDED."Camera_DirectionOfTravel",
                "Camera_Longitude" = EXCLUDED."Camera_Longitude",
                "Camera_Latitude" = EXCLUDED."Camera_Latitude",
                "Camera_URL" = EXCLUDED."Camera_URL",
                "Camera_District" = EXCLUDED."Camera_District",
                "Camera_Route" = EXCLUDED."Camera_Route",
                "Camera_County" = EXCLUDED."Camera_County",
                "Camera_Milepost" = EXCLUDED."Camera_Milepost",
                "Camera_Description" = EXCLUDED."Camera_Description",
                "Camera_UpdateFrequency" = EXCLUDED."Camera_UpdateFrequency",
                "Camera_HasLiveStream" = EXCLUDED."Camera_HasLiveStream",
                "Camera_Status" = EXCLUDED."Camera_Status",
                "Camera_LastStatusCheck" = EXCLUDED."Camera_LastStatusCheck",
                "Camera_ImageURL" = EXCLUDED."Camera_ImageURL",
                "Camera_StreamURL" = EXCLUDED."Camera_StreamURL",
                "Camera_Metadata" = EXCLUDED."Camera_Metadata"
              RETURNING *`;
            
            await client.query(query, [
              camera.Camera_RoadwayName,
              camera.Camera_DirectionOfTravel,
              camera.Camera_Longitude,
              camera.Camera_Latitude,
              camera.Camera_URL,
              camera.Camera_District,
              camera.Camera_Route,
              camera.Camera_County,
              camera.Camera_Milepost,
              camera.Camera_Description,
              camera.Camera_UpdateFrequency,
              camera.Camera_HasLiveStream,
              camera.Camera_Status,
              camera.Camera_LastStatusCheck,
              camera.Camera_ImageURL,
              camera.Camera_StreamURL,
              camera.Camera_Source,
              camera.Camera_ExternalID,
              JSON.stringify(camera.Camera_Metadata)
            ]);
            upsertedCount++;
          }
        }

        await client.query('COMMIT');
        
        const result = { 
          success: true, 
          upsertedCount,
          skippedCount: skippedCameras.length,
          totalProcessed: cameras.length
        };

        // Mark operation as completed and cache result
        if (duplicateCheck.hash) {
          await deduplicationService.markBulkOperationCompleted(duplicateCheck.hash, result);
        }

        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error in bulkUpsertCameras:', error);
      throw error;
    }
  },

  async recordCameraStatus(statusData) {
    try {
      // Check for duplicate status update
      const duplicateCheck = await deduplicationService.isDuplicateStatusUpdate(
        statusData.StatusHistory_CameraID, 
        statusData.StatusHistory_Status
      );

      if (duplicateCheck.isDuplicate) {
        console.log(`Skipping duplicate status update for camera ${statusData.StatusHistory_CameraID}`);
        return { success: true, message: 'Duplicate status update skipped' };
      }

      const client = await db.getPool().connect();
      try {
        await client.query(`
          INSERT INTO public."CameraStatusHistory" (
            "StatusHistory_CameraID", "StatusHistory_Status", "StatusHistory_ResponseTime", 
            "StatusHistory_ErrorMessage", "StatusHistory_Metadata"
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          statusData.StatusHistory_CameraID,
          statusData.StatusHistory_Status,
          statusData.StatusHistory_ResponseTime,
          statusData.StatusHistory_ErrorMessage,
          JSON.stringify(statusData.StatusHistory_Metadata)
        ]);

        await client.query(`
          UPDATE public."Camera" 
          SET "Camera_Status" = $1, "Camera_LastStatusCheck" = CURRENT_TIMESTAMP
          WHERE "Camera_ID" = $2
        `, [statusData.StatusHistory_Status, statusData.StatusHistory_CameraID]);

        // Mark status update as completed and update cache
        if (duplicateCheck.hash) {
          await deduplicationService.markStatusUpdateCompleted(duplicateCheck.hash);
        }

        // Update camera status cache
        cacheService.setCameraStatus(statusData.StatusHistory_CameraID, {
          status: statusData.StatusHistory_Status,
          lastCheck: new Date(),
          responseTime: statusData.StatusHistory_ResponseTime
        });

        return { success: true };
      } catch (error) {
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error in recordCameraStatus:', error);
      throw error;
    }
  },

  // NEW: Batch status recording - more efficient than individual calls
  async recordCameraStatusBatch(statusUpdates) {
    try {
      const client = await db.getPool().connect();
      try {
        await client.query('BEGIN');
        
        let processed = 0;
        let failed = 0;
        const errors = [];

        for (const update of statusUpdates) {
          try {
            // Get camera ID by external ID
            const cameraQuery = await client.query(`
              SELECT "Camera_ID" FROM public."Camera" 
              WHERE "Camera_ExternalID" = $1
            `, [update.externalId]);

            if (cameraQuery.rows.length === 0) {
              errors.push(`Camera not found: ${update.externalId}`);
              failed++;
              continue;
            }

            const cameraId = cameraQuery.rows[0].Camera_ID;

            // Check for duplicate status update
            const duplicateCheck = await deduplicationService.isDuplicateStatusUpdate(
              cameraId, 
              update.status
            );

            if (duplicateCheck.isDuplicate) {
              // Skip duplicate - count as processed
              processed++;
              continue;
            }

            // Insert status history
            await client.query(`
              INSERT INTO public."CameraStatusHistory" (
                "StatusHistory_CameraID", "StatusHistory_Status", "StatusHistory_ResponseTime", 
                "StatusHistory_ErrorMessage", "StatusHistory_Metadata"
              ) VALUES ($1, $2, $3, $4, $5)
            `, [
              cameraId,
              update.status,
              update.responseTime || null,
              update.errorMessage || null,
              JSON.stringify({
                timestamp: update.timestamp || new Date(),
                batchUpdate: true
              })
            ]);

            // Update camera status
            await client.query(`
              UPDATE public."Camera" 
              SET "Camera_Status" = $1, "Camera_LastStatusCheck" = CURRENT_TIMESTAMP
              WHERE "Camera_ID" = $2
            `, [update.status, cameraId]);

            // Mark status update as completed
            if (duplicateCheck.hash) {
              await deduplicationService.markStatusUpdateCompleted(duplicateCheck.hash);
            }

            // Update cache
            cacheService.setCameraStatus(cameraId, {
              status: update.status,
              lastCheck: new Date(),
              responseTime: update.responseTime
            });

            processed++;
          } catch (updateError) {
            console.error(`Error processing status update for ${update.externalId}:`, updateError);
            errors.push(`Failed to update ${update.externalId}: ${updateError.message}`);
            failed++;
          }
        }

        await client.query('COMMIT');
        
        return { 
          success: true, 
          processed, 
          failed, 
          errors: errors.length > 0 ? errors : undefined,
          message: `Processed ${processed} status updates, ${failed} failed`
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error in recordCameraStatusBatch:', error);
      throw error;
    }
  },

  async getCameraByExternalId(externalId) {
    // Check cache first
    const cachedCamera = cacheService.getCameraData(externalId);
    if (cachedCamera) {
      return cachedCamera;
    }

    const result = await db.query(`
      SELECT * FROM public."Camera" 
      WHERE "Camera_ExternalID" = $1
    `, [externalId]);
    
    const camera = result.rows[0] || null;
    
    // Cache the result if found
    if (camera) {
      cacheService.setCameraData(externalId, camera);
    }
    
    return camera;
  },

  async searchArchivedIncidents({ query, severity, status, cameraId, dateFrom, dateTo, tags, limit = 50, offset = 0 }) {
    let sql = `
      SELECT 
        a.*,
        c."Camera_RoadwayName",
        c."Camera_District",
        c."Camera_Route"
      FROM public."ArchivesV2" a
      LEFT JOIN public."Camera" c ON a."Archive_CameraID" = c."Camera_ID"
      WHERE a."Archive_Type" = 'incident'
    `;
    
    const params = [];
    let paramCount = 1;

    if (query) {
      sql += ` AND to_tsvector('english', a."Archive_SearchText") @@ plainto_tsquery('english', $${paramCount})`;
      params.push(query);
      paramCount++;
    }
    
    if (severity) {
      sql += ` AND a."Archive_Severity" = $${paramCount}`;
      params.push(severity);
      paramCount++;
    }
    
    if (status) {
      sql += ` AND a."Archive_Status" = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (cameraId) {
      sql += ` AND a."Archive_CameraID" = $${paramCount}`;
      params.push(parseInt(cameraId));
      paramCount++;
    }
    
    if (dateFrom) {
      sql += ` AND a."Archive_DateTime" >= $${paramCount}`;
      params.push(dateFrom);
      paramCount++;
    }
    
    if (dateTo) {
      sql += ` AND a."Archive_DateTime" <= $${paramCount}`;
      params.push(dateTo);
      paramCount++;
    }
    
    if (tags) {
      const tagArray = tags.split(',');
      sql += ` AND a."Archive_Tags" && $${paramCount}`;
      params.push(tagArray);
      paramCount++;
    }
    
    sql += ` ORDER BY a."Archive_DateTime" DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await db.query(sql, params);
    const countSql = sql.substring(0, sql.lastIndexOf('ORDER BY')).replace(/SELECT.*?FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await db.query(countSql, params.slice(0, -2));
    
    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
  },

  async getCameraAnalytics({ cameraId, dateFrom, dateTo }) {
    if (!cameraId) throw new Error('Camera ID is required');
    
    let sql = `
      SELECT * FROM public."CameraAnalytics" 
      WHERE "Analytics_CameraID" = $1
    `;
    
    const params = [parseInt(cameraId)];
    let paramCount = 2;
    
    if (dateFrom) {
      sql += ` AND "Analytics_Date" >= $${paramCount}`;
      params.push(dateFrom);
      paramCount++;
    }
    
    if (dateTo) {
      sql += ` AND "Analytics_Date" <= $${paramCount}`;
      params.push(dateTo);
      paramCount++;
    }
    
    sql += ` ORDER BY "Analytics_Date" DESC`;
    
    const result = await db.query(sql, params);
    return result.rows;
  },

  async getCameraDashboard(userId = 'global') {
    // Check cache first
    const cachedDashboard = cacheService.getDashboardData(userId);
    if (cachedDashboard) {
      return cachedDashboard;
    }

    // Check for duplicate dashboard request
    const isDuplicate = await deduplicationService.isDuplicateDashboardRequest(userId);
    if (isDuplicate) {
      // If duplicate, try to get cached data one more time with shorter TTL
      const recentCache = cacheService.getDashboardData(userId);
      if (recentCache) {
        return recentCache;
      }
    }

    try {
      const stats = await db.query(`
        SELECT 
          COUNT(*) as total_cameras,
          COUNT(CASE WHEN "Camera_Status" = 'online' THEN 1 END) as online_cameras,
          COUNT(CASE WHEN "Camera_Status" = 'offline' THEN 1 END) as offline_cameras,
          COUNT(CASE WHEN "Camera_HasLiveStream" = true THEN 1 END) as live_stream_cameras,
          COUNT(DISTINCT "Camera_District") as total_districts
        FROM public."Camera"
      `);
      
      const recentIncidents = await db.query(`
        SELECT 
          i."Incidents_ID",
          i."Incident_Severity",
          i."Incident_Status",
          i."Incidents_DateTime",
          c."Camera_RoadwayName",
          c."Camera_District"
        FROM public."Incidents" i
        LEFT JOIN public."Camera" c ON i."Incident_CameraID" = c."Camera_ID"
        WHERE i."Incidents_DateTime" >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ORDER BY i."Incidents_DateTime" DESC
        LIMIT 10
      `);
      
      const topCamerasByIncidents = await db.query(`
        SELECT 
          c."Camera_ID",
          c."Camera_RoadwayName",
          c."Camera_District",
          COUNT(i."Incidents_ID") as incident_count
        FROM public."Camera" c
        LEFT JOIN public."Incidents" i ON c."Camera_ID" = i."Incident_CameraID"
        WHERE i."Incidents_DateTime" >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        GROUP BY c."Camera_ID", c."Camera_RoadwayName", c."Camera_District"
        HAVING COUNT(i."Incidents_ID") > 0
        ORDER BY incident_count DESC
        LIMIT 5
      `);
      
      const dashboardData = {
        stats: stats.rows[0],
        recentIncidents: recentIncidents.rows,
        topCamerasByIncidents: topCamerasByIncidents.rows,
        timestamp: new Date()
      };

      // Cache the dashboard data
      cacheService.setDashboardData(dashboardData, userId);

      // Mark dashboard request as completed
      await deduplicationService.markDashboardRequestCompleted(userId);

      return dashboardData;
    } catch (error) {
      console.error('Error in getCameraDashboard:', error);
      throw error;
    }
  },

  async performMaintenance() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query('SELECT archive_old_incidents_enhanced()');
      await client.query('SELECT update_daily_camera_analytics()');
      
      const statusCleanup = await client.query(`
        DELETE FROM public."CameraStatusHistory" 
        WHERE "StatusHistory_Timestamp" < CURRENT_TIMESTAMP - INTERVAL '30 days'
      `);
      
      await client.query('COMMIT');
      return { 
        success: true, 
        message: 'Maintenance completed successfully',
        statusRecordsDeleted: statusCleanup.rowCount 
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async searchCameras({ query, district, route, status, hasLiveStream, limit = 50, offset = 0 }) {
    let sql = `
      SELECT 
        *,
        CASE 
          WHEN "Camera_LastStatusCheck" > CURRENT_TIMESTAMP - INTERVAL '1 hour' 
          THEN 'recent'
          ELSE 'stale'
        END as status_freshness
      FROM public."Camera"
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (query) {
      sql += ` AND (
        "Camera_RoadwayName" ILIKE $${paramCount} OR
        "Camera_Route" ILIKE $${paramCount} OR
        "Camera_Description" ILIKE $${paramCount} OR
        "Camera_ExternalID" ILIKE $${paramCount}
      )`;
      params.push(`%${query}%`);
      paramCount++;
    }
    
    if (district) {
      sql += ` AND "Camera_District" = $${paramCount}`;
      params.push(district);
      paramCount++;
    }
    
    if (route) {
      sql += ` AND "Camera_Route" ILIKE $${paramCount}`;
      params.push(`%${route}%`);
      paramCount++;
    }
    
    if (status) {
      sql += ` AND "Camera_Status" = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (hasLiveStream !== undefined) {
      sql += ` AND "Camera_HasLiveStream" = $${paramCount}`;
      params.push(hasLiveStream === 'true');
      paramCount++;
    }
    
    sql += ` ORDER BY "Camera_LastStatusCheck" DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await db.query(sql, params);
    const countSql = sql.substring(0, sql.lastIndexOf('ORDER BY')).replace(/SELECT.*?FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await db.query(countSql, params.slice(0, -2));
    
    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
  },

  async updateTrafficCount(cameraId, count) {
    try {
      const client = await db.getPool().connect();
      try {
        const result = await client.query(`
          UPDATE public."Camera"
          SET last_traffic_count = $1
          WHERE "Camera_ID" = $2
          RETURNING "Camera_ID", "Camera_ExternalID", last_traffic_count
        `, [count, cameraId]);

        if (result.rows.length === 0) {
          return { success: false, error: 'Camera not found' };
        }

        return {
          success: true,
          message: 'Traffic count updated successfully',
          camera: result.rows[0]
        };
      } catch (error) {
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error in updateTrafficCount:', error);
      throw error;
    }
  },

  // Public method to get cameras with traffic data (no authentication required)
  async getPublicTrafficData() {
    try {
      const result = await db.query(`
        SELECT
          "Camera_ID",
          "Camera_RoadwayName",
          "Camera_Latitude",
          "Camera_Longitude",
          last_traffic_count,
          "Camera_Status"
        FROM public."Camera"
        WHERE "Camera_Latitude" IS NOT NULL
          AND "Camera_Longitude" IS NOT NULL
          AND last_traffic_count IS NOT NULL
          AND last_traffic_count > 0
        ORDER BY last_traffic_count DESC
        LIMIT 100
      `);

      return {
        success: true,
        data: result.rows,
        total: result.rows.length
      };
    } catch (error) {
      console.error('Error in getPublicTrafficData:', error);
      throw error;
    }
  },

  // Get top 5 cameras by traffic count for dashboard carousel
  async getTopCamerasByTraffic() {
    try {
      const result = await db.query(`
        SELECT
          "Camera_ID",
          "Camera_RoadwayName",
          "Camera_DirectionOfTravel",
          "Camera_Latitude",
          "Camera_Longitude",
          "Camera_ImageURL",
          "Camera_StreamURL",
          "Camera_Route",
          "Camera_District",
          last_traffic_count,
          "Camera_Status",
          "Camera_Description"
        FROM public."Camera"
        WHERE "Camera_Latitude" IS NOT NULL
          AND "Camera_Longitude" IS NOT NULL
          AND last_traffic_count IS NOT NULL
          AND last_traffic_count >= 0
          AND ("Camera_ImageURL" IS NOT NULL OR "Camera_StreamURL" IS NOT NULL)
        ORDER BY last_traffic_count DESC
        LIMIT 5
      `);

      return {
        success: true,
        data: result.rows,
        total: result.rows.length
      };
    } catch (error) {
      console.error('Error in getTopCamerasByTraffic:', error);
      throw error;
    }
  }
};

module.exports = cameraModel;