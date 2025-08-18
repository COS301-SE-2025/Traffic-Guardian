const axios = require('axios');
//const { json } = require('stream/consumers');
require('dotenv').config({
path: require('path').join(__dirname, '../../.env')
});

const url = 'https://api.tomtom.com/traffic/services/5/incidentDetails';

const iconCategory = ['Unknown', 'Accident', 'Fog' , 'Dangerous Conditions', 'Rain', 'Ice', 'Jam', 'Lane closed', 'Road closed', 'Road works', 'Wind', 'Flooding', 'Broken Down Vehicle'];
const magnitudeOfDelay = ['Unknown', 'Minor', 'Moderate', 'Major', 'Road Closure'];

var regions = ['-26.1438,28.0406', '-26.09108017449409,28.08474153621201', '-25.9819,28.1329', '-25.8347,28.1127', '-25.7566,28.1914', '-26.2678,27.8658', '-26.0936,27.9931', '-26.2259,28.1598', '-26.6667,27.9167', '-26.3333,28.1667', '-25.7487,28.2380'];
const regionNames = ['Rosebank', 'Sandton', 'Midrand', 'Centurion', 'Pretoria', 'Soweto', 'Randburg', 'Boksburg', 'Vereeniging', 'Alberton', 'Hatfield'];

const reqFields = '{incidents{geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code,iconCategory}}}}';

var incidentMap = new Map();

async function getTraffic(){
        var BBOX;
        var trafficRes = [];

    try{
        var count=0;
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

            const trafficData = {
                location: regionNames[i],
                incidents: response.data.incidents
            };
            trafficRes.push(trafficData);
        }

        for(let tr of trafficRes){
            tr.location = regionNames[count];
            for(let inc of tr.incidents){
                var ic = inc.properties.iconCategory;
                incidentMap.set(ic,inc);
            }
            tr.incidents = Array.from(incidentMap.values());
            incidentMap.clear();
            count += 1;
        }//remove duplicates

        for(let t of trafficRes){
            for(let i of t.incidents){
                 let iconIdx = i.properties.iconCategory;
                 let iconEventIdx = i.properties.events[0].iconCategory;
                 i.properties.iconCategory = iconCategory[iconIdx];
                 i.properties.events[0].iconCategory = iconCategory[iconEventIdx];
            }
        }//name assign

        //console.log(trafficRes[0].incidents);
        return trafficRes;

        }catch(error){
            console.error('TomTom API error:', error.message);
            console.error('Error code:', error.response?.status);
            console.error('Error message:', error.response?.data);
            
            // Return empty traffic data instead of undefined to prevent crashes
            console.log('🔥 TomTom API failed - returning empty traffic data to prevent system crash');
            return regionNames.map(name => ({
                location: name,
                incidents: []
            }));
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

function criticalIncidents(incidentsArr){
    var res = {
        'Data' : "Amount of critical Incidents",
        'Amount' : 0
    }
    var resCount = 0;
    for(let elem of incidentsArr){
        for(let inc of elem.incidents){
            if(inc.properties.magnitudeOfDelay > 3){resCount += 1;}
        }
    }

    res.Amount = resCount;
    return res;
}

function incidentCategory(incidentsArr){
    var resMap = new Map();
    for(let ic of iconCategory) resMap.set(ic,0);

    for(let elem of incidentsArr){
        for(let inc of elem.incidents){
            if(resMap.has(inc.properties.iconCategory)){
                var valCount = resMap.get(inc.properties.iconCategory);
                resMap.set(inc.properties.iconCategory, (valCount + 1));
            }
        }
    }

    var total = 0;
    for (const [key, value] of resMap.entries()) {
        total += value;
    }

    for (const [key, value] of resMap.entries()) {
        resMap.set(key, value / total);
    }

    const res = {
        'categories' : Array.from(resMap.keys()),
        'percentages' : Array.from(resMap.values())
    }

    return res;
}

function incidentLocations(incidentsArr){

    var resArr = [];
    for(let incd of incidentsArr){
        var resData = {
            'location' : incd.location,
            "amount" : incd.incidents.length
        }
        resArr.push(resData);
    }

    return resArr;

}

module.exports = {
    getTraffic,
    criticalIncidents,
    incidentCategory,
    incidentLocations,
    distToLat,
    distToLong,
    regions
}


/*
{
  location: 'Hatfield',
  incidents: [
    { properties: [Object], geometry: [Object] },
    { properties: [Object], geometry: [Object] },
    { properties: [Object], geometry: [Object] },
    { properties: [Object], geometry: [Object] },
    { properties: [Object], geometry: [Object] },
    { properties: [Object], geometry: [Object] },
    { properties: [Object], geometry: [Object] },
    { properties: [Object], geometry: [Object] }
  ]
}
*/

/*
response.incidents = 
[
  {
    properties: { iconCategory: 'Jam', magnitudeOfDelay: 2, events: [Array] },
    geometry: { type: 'LineString', coordinates: [Array] }
  },
  {
    properties: {
      iconCategory: 'Road closed',
      magnitudeOfDelay: 4,
      events: [Array]
    },
    geometry: { type: 'LineString', coordinates: [Array] }
  },
  {
    properties: { iconCategory: 'Jam', magnitudeOfDelay: 3, events: [Array] },
    geometry: { type: 'LineString', coordinates: [Array] }
  }
]

events = 
{
    [ { code: 401, description: 'Closed', iconCategory: 8 } ]
}
*/


/*
[
  { location: 'Rosebank', incidents: [ [Object], [Object], [Object] ] },
  { location: 'Sandton', incidents: [ [Object], [Object] ] },
  { location: 'Midrand', incidents: [ [Object], [Object] ] },
  { location: 'Centurion', incidents: [ [Object], [Object] ] },
  { location: 'Pretoria', incidents: [ [Object], [Object] ] },
  { location: 'Soweto', incidents: [ [Object] ] },
  { location: 'Randburg', incidents: [ [Object], [Object] ] },
  { location: 'Boksburg', incidents: [ [Object], [Object], [Object] ] },
  { location: 'Vereeniging', incidents: [ [Object], [Object] ] },
  { location: 'Alberton', incidents: [ [Object], [Object] ] },
  { location: 'Hatfield', incidents: [ [Object], [Object] ] }
]
*/

/*
Rosebank : [object Object]
{
  location: 'Rosebank',
  coordinates: { latitude: '-26.1438', longitude: '28.0406' },
  incidents: [
    {
      properties: {
        iconCategory: 'Road closed',
        magnitudeOfDelay: 4,
        events: [
          {
            code: 401,
            description: 'Closed',
            iconCategory: 'Road closed'
          }
        ]
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [ 28.0815629307, -26.1278244561 ],
          [ 28.081733251, -26.1277869044 ],
          [ 28.0831145887, -26.127493188 ],
          [ 28.0840761606, -26.1272879699 ],
          [ 28.0844288711, -26.1272169299 ]
        ]
      }
    },
    {
      properties: {
        iconCategory: 'Road works',
        magnitudeOfDelay: 0,
        events: [
          {
            code: 701,
            description: 'Roadworks',
            iconCategory: 'Road works'
          },
          {
            code: 810,
            description: 'New roadworks layout',
            iconCategory: 9
          }
        ]
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [ 28.0848526601, -26.1311302372 ],
          [ 28.0848419313, -26.1311315918 ],
          [ 28.0844127778, -26.1311785488 ],
          [ 28.0843189005, -26.1311999956 ]
        ]
      }
    },
    {
      properties: {
        iconCategory: 'Jam',
        magnitudeOfDelay: 3,
        events: [
          {
            code: 101,
            description: 'Stationary traffic',
            iconCategory: 'Jam'
          }
        ]
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [ 28.0848566834, -26.1605768997 ],
          [ 28.0860878173, -26.1607713763 ],
          [ 28.0867690984, -26.160878658 ]
        ]
      }
    }
  ]
}
}
*/

