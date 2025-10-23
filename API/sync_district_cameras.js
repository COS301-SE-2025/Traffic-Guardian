/**
 * Script to manually sync cameras from CalTrans for multiple districts
 * This will fetch cameras from CalTrans API and insert them into the database
 */

const axios = require('axios');
const db = require('./src/config/db');

// Districts to sync
const DISTRICTS_TO_SYNC = [4, 5, 7, 8, 11, 12];

// Fetch camera data from CalTrans for a specific district
async function fetchDistrictCameras(district) {
  try {
    const url = `https://cwwp2.dot.ca.gov/data/d${district}/cctv/cctvStatusD${district.toString().padStart(2, '0')}.json`;

    console.log(`📡 Fetching District ${district} cameras from CalTrans...`);
    const response = await axios.get(url, {
      timeout: 15000,
      headers: { 'Accept': 'application/json' }
    });

    if (!response.data || !response.data.data) {
      console.log(`⚠️  No camera data found for District ${district}`);
      return [];
    }

    const cameras = response.data.data
      .filter(item =>
        item.cctv.inService === 'true' &&
        ((item.cctv.imageData.streamingVideoURL && item.cctv.imageData.streamingVideoURL !== 'Not Reported') ||
         (item.cctv.imageData.static.currentImageURL && item.cctv.imageData.static.currentImageURL !== 'Not Reported'))
      )
      .slice(0, 20) // Limit to 20 cameras per district
      .map(item => {
        const camera = item.cctv;
        const location = camera.location;
        const imageData = camera.imageData;

        const historicalImages = [
          imageData.static.referenceImage1UpdateAgoURL,
          imageData.static.referenceImage2UpdatesAgoURL,
          imageData.static.referenceImage3UpdatesAgoURL,
          imageData.static.referenceImage4UpdatesAgoURL,
          imageData.static.referenceImage5UpdatesAgoURL,
          imageData.static.referenceImage6UpdatesAgoURL,
        ].filter(url => url && url !== 'Not Reported').slice(0, 6);

        const updateFreqMatch = imageData.static.currentImageUpdateFrequency?.match(/(\d+)/);
        const updateFreq = updateFreqMatch ? parseInt(updateFreqMatch[1]) : 5;

        return {
          Camera_RoadwayName: location.locationName || location.nearbyPlace || `District ${district} Camera`,
          Camera_DirectionOfTravel: location.direction || 'Unknown',
          Camera_Longitude: parseFloat(location.longitude) || 0,
          Camera_Latitude: parseFloat(location.latitude) || 0,
          Camera_URL: imageData.streamingVideoURL && imageData.streamingVideoURL !== 'Not Reported'
            ? imageData.streamingVideoURL
            : imageData.static.currentImageURL,
          Camera_District: `District ${district}`,
          Camera_Route: location.route || 'Unknown',
          Camera_County: location.county,
          Camera_Milepost: location.milepost,
          Camera_Description: imageData.imageDescription,
          Camera_UpdateFrequency: updateFreq,
          Camera_HasLiveStream: !!(imageData.streamingVideoURL && imageData.streamingVideoURL !== 'Not Reported'),
          Camera_Status: 'online',
          Camera_LastStatusCheck: new Date(),
          Camera_ImageURL: imageData.static.currentImageURL,
          Camera_StreamURL: imageData.streamingVideoURL && imageData.streamingVideoURL !== 'Not Reported'
            ? imageData.streamingVideoURL
            : null,
          Camera_Source: 'caltrans',
          Camera_ExternalID: `CALTRANS-D${district}-${camera.index}`,
          Camera_Metadata: {
            lastUpdate: new Date().toLocaleTimeString(),
            historicalImages: historicalImages,
            calTransIndex: camera.index,
            districtNumber: district.toString(),
            hasHistoricalData: historicalImages.length > 0,
            originalData: {
              id: `CALTRANS-D${district}-${camera.index}`,
              district: `District ${district}`,
              updateFrequency: imageData.static.currentImageUpdateFrequency,
            },
          },
        };
      });

    console.log(`✅ Found ${cameras.length} cameras for District ${district}`);
    return cameras;
  } catch (error) {
    console.error(`❌ Error fetching District ${district}:`, error.message);
    return [];
  }
}

// Insert cameras into database
async function insertCameras(cameras) {
  const client = await db.getPool().connect();
  let insertedCount = 0;
  let skippedCount = 0;

  try {
    await client.query('BEGIN');

    for (const camera of cameras) {
      try {
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
            "Camera_Longitude" = EXCLUDED."Camera_Longitude",
            "Camera_Latitude" = EXCLUDED."Camera_Latitude",
            "Camera_URL" = EXCLUDED."Camera_URL",
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

        insertedCount++;
      } catch (error) {
        console.error(`⚠️  Failed to insert ${camera.Camera_ExternalID}:`, error.message);
        skippedCount++;
      }
    }

    await client.query('COMMIT');
    return { insertedCount, skippedCount };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Main function
async function main() {
  console.log('🚀 Starting camera sync for multiple districts...\n');

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const district of DISTRICTS_TO_SYNC) {
    console.log(`\n📍 Processing District ${district}...`);
    const cameras = await fetchDistrictCameras(district);

    if (cameras.length > 0) {
      const { insertedCount, skippedCount } = await insertCameras(cameras);
      totalInserted += insertedCount;
      totalSkipped += skippedCount;
      console.log(`✅ District ${district}: Inserted ${insertedCount}, Skipped ${skippedCount}`);
    } else {
      console.log(`⏭️  District ${district}: No cameras to insert`);
    }

    // Add delay between districts to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n🎉 Sync complete!`);
  console.log(`   Total inserted/updated: ${totalInserted}`);
  console.log(`   Total skipped: ${totalSkipped}`);

  process.exit(0);
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
