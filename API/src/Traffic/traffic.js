const axios = require('axios');
require('dotenv').config({
path: require('path').join(__dirname, '../../.env')
});

const url = 'https://api.tomtom.com/traffic/services/5/incidentDetails';

const iconCategory = ['Unknown', 'Accident', 'Fog' , 'Dangerous Conditions', 'Rain', 'Ice', 'Jam', 'Lane closed', 'Road closed', 'Road works', 'Wind', 'Flooding', 'Broken Down Vehicle'];

var regions = ['-26.1438,28.0406', '-26.09108017449409,28.08474153621201', '-25.9819,28.1329', '-25.8347,28.1127', '-25.7566,28.1914', '-26.2678,27.8658', '-26.0936,27.9931', '-26.2259,28.1598', '-26.6667,27.9167', '-26.3333,28.1667', '-25.7487,28.2380'];
var bbox_regions = [];

async function getTraffic(){
        console.log(getBbox(regions[1]));
        const BBOX = getBbox(regions[1]);

    try{
        //console.log(process.env.TOMTOMAPI);
    const response = await axios.get(url, {
        params: {
            bbox: `${BBOX.BL.lon},${BBOX.BL.lat},${BBOX.TR.lon},${BBOX.TR.lat}`,
            //fields: 'id,geometry,properties',
            language: 'en-GB',
            timeValidityFilter: 'present',
            key: process.env.TOMTOMAPI
        }
    })
    console.log(response.data);
    }catch(error){
        console.error('Error code:', error.response?.status);
        console.error('Error message:', error.response?.data || error.message);
    }
}

function getBbox(latlong){
    const olatolong = latlong.split(",").map(parseFloat);
    const olat = olatolong[0];
    const olong = olatolong[1];

    var BBOX  = {
        BL: {lat: "", lon: ""},
        TR: {lat: "", lon: ""}
    };

    //bottom left
    BBOX.BL.lat = olat - distToLat(75);
    BBOX.BL.lon = olong - distToLong(75, olat);
    //top right
    BBOX.TR.lat = olat + distToLat(75);
    BBOX.TR.lon = olong + distToLong(75, olat);
    

    return BBOX;
}

function distToLong(distance, latitude){
    const latRadians = latitude * (Math.PI / 180)
    return distance / (111.320 * Math.cos(latRadians));
}

function distToLat(distance){
    return distance / 110.574;
}

module.exports = {
    getTraffic
}


/*
response.data.incidents[0] = 
{
  type: 'Feature',
  properties: { iconCategory: 8 },
  geometry: {
    type: 'LineString',
    coordinates: [
      [Array], [Array],
      [Array], [Array],
      [Array], [Array],
      [Array], [Array],
      [Array]
    ]
  }
} 
*/
