  require('dotenv').config({
    path: require('path').join(__dirname, '../../.env')
  });

const axios = require('axios');
const FormData = require('form-data');

// California locations for weather data
var regions = [
  'San Francisco', 
  'San Jose', 
  'Los Angeles',
  'San Diego', 
  'Sacramento', 
  'Oakland',
  'Palo Alto',
  'Pasadena',
  'Long Beach',
  'Torrance'
];
    
    async function getWeather(){
      // Clear previous data on each call
      var weatherCurrent = [];
      //console.log(`Regions = ${regions.length}`);
      for(var i=0; i< regions.length; i++){
        const form = new FormData();
        form.append('key', process.env.WEATHERAPI);
        form.append('q',regions[i]);
        try{
        var response = await axios.post('https://api.weatherapi.com/v1/current.json',form);
          weatherCurrent.push(response.data);
        }catch(error){
          console.log(error);
        }
      }

      
     // No need for manual renaming since we're using unique city names

      // Remove duplicates based on location name
      const uniqueWeatherData = [];
      const seenLocations = new Set();
      
      weatherCurrent.forEach((w) => {
        const locationKey = `${w.location.name}_${w.location.region}`;
        if (!seenLocations.has(locationKey)) {
          seenLocations.add(locationKey);
          uniqueWeatherData.push(w);
        }
      });

      // Weather data retrieved
      return uniqueWeatherData;
    }

module.exports = {
    getWeather,
    regions
};



/*
{
  location: {
    name: 'San Francisco',
    region: 'California',
    country: 'United States',
    lat: 37.7749,
    lon: -122.4194,
    tz_id: 'America/Los_Angeles',
    localtime_epoch: 1749900851,
    localtime: '2025-06-14 13:34'
  },
  current: {
    last_updated_epoch: 1749900600,
    last_updated: '2025-06-14 13:30',
    temp_c: 18.2,
    temp_f: 64.8,
    is_day: 1,
    condition: {
      text: 'Sunny',
      icon: '//cdn.weatherapi.com/weather/64x64/day/113.png',
      code: 1000
    },
    wind_mph: 6.9,
    wind_kph: 11.2,
    wind_degree: 75,
    wind_dir: 'ENE',
    pressure_mb: 1037,
    pressure_in: 30.62,
    precip_mm: 0,
    precip_in: 0,
    humidity: 30,
    cloud: 0,
    feelslike_c: 18.2,
    feelslike_f: 64.8,
    windchill_c: 17.5,
    windchill_f: 63.4,
    heatindex_c: 17.5,
    heatindex_f: 63.4,
    dewpoint_c: -7.2,
    dewpoint_f: 19,
    vis_km: 10,
    vis_miles: 6,
    uv: 4.4,
    gust_mph: 8,
    gust_kph: 12.9
  }
}
 */