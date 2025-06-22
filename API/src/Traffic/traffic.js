const axios = require('axios');
const { json } = require('stream/consumers');
require('dotenv').config({
path: require('path').join(__dirname, '../../.env')
});

const url = 'https://api.tomtom.com/traffic/services/5/incidentDetails';

const iconCategory = ['Unknown', 'Accident', 'Fog' , 'Dangerous Conditions', 'Rain', 'Ice', 'Jam', 'Lane closed', 'Road closed', 'Road works', 'Wind', 'Flooding', 'Broken Down Vehicle'];
const magnitudeOfDelay = ['Unknown', 'Minor', 'Moderate', 'Major', 'Road Closure'];

var regions = ['-26.1438,28.0406', '-26.09108017449409,28.08474153621201', '-25.9819,28.1329', '-25.8347,28.1127', '-25.7566,28.1914', '-26.2678,27.8658', '-26.0936,27.9931', '-26.2259,28.1598', '-26.6667,27.9167', '-26.3333,28.1667', '-25.7487,28.2380'];
const regionNames = ['Rosebank', 'Sandton', 'Midrand', 'Centurion', 'Pretoria', 'Soweto', 'Randburg', 'Boksburg', 'Vereeniging', 'Alberton', 'Hatfield'];

const reqFields = '{incidents{geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code,iconCategory}}}}';

async function getTraffic(){
        //console.log(getBbox(regions[1]));
        var BBOX;
        var trafficRes = [];
        var trafficData = {
            "location" : "",
            "incidents" : []
        };

    try{
        for(var i=0; i<regions.length; i++){
        BBOX = getBbox(regions[i]);
        const response = await axios.get(url, {
            params: {
                bbox: `${BBOX.BL.lon},${BBOX.BL.lat},${BBOX.TR.lon},${BBOX.TR.lat}`,
                fields: reqFields,
                language: 'en-GB',
                timeValidityFilter: 'present',
                key: process.env.TOMTOMAPI
            }
        })
        trafficData.incidents = response.data.incidents;
        trafficData.location = regionNames[i];
        trafficRes.push(trafficData);
        break;
        }

        for(let t of trafficRes){
            for(let i of t.incidents){
                 let iconIdx = i.properties.iconCategory;
                 let iconEventIdx = i.properties.events.iconCategory;
                 i.properties.iconCategory = iconCategory[iconIdx];
                 i.properties.events.iconCategory = iconCategory[iconEventIdx];
            }
        }//cleanup

        }catch(error){
            console.error('Code related error:', error);
            console.error('Error code:', error.response?.status);
            console.error('Error message:', error.response?.data);
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

    const deltaLat = distToLat(5);
    const deltaLon = distToLong(5, olat);

    //bottom left
    BBOX.BL.lat = olat - deltaLat
    BBOX.BL.lon = olong - deltaLon;
    //top right
    BBOX.TR.lat = olat + deltaLat
    BBOX.TR.lon = olong + deltaLon;
    
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
  properties: { iconCategory: 8, magnitudeOfDelay: 4, events: [ [Object] ] },
  geometry: { type: 'LineString', coordinates: [ [Array], [Array] ] }
}

events = 
{
    [ { code: 401, description: 'Closed', iconCategory: 8 } ]
}
*/
