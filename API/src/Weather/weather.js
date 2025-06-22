  require('dotenv').config({
    path: require('path').join(__dirname, '../../.env')
  });

const axios = require('axios');
const FormData = require('form-data');

var regions = ['-26.1438,28.0406', 'Sandton', '-25.9819,28.1329', '-25.8347,28.1127', '-25.7566,28.1914', '-26.2678,27.8658', '-26.0936,27.9931', '-26.2259,28.1598', '-26.6667,27.9167', '-26.3333,28.1667', '-25.7487,28.2380'];
    var weatherCurrent = [];
    var johannesburgCount = 0;
    async function getWeather(){
      johannesburgCount = 0;
      console.log(`Regions = ${regions.length}`);
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

      
     for(var i=0; i< weatherCurrent.length; i++){
      if(weatherCurrent[i].location.name == 'Johannesburg'){
        johannesburgCount++;
      }

      if(johannesburgCount == 2 && weatherCurrent[i].location.name == 'Johannesburg'){
        weatherCurrent[i].location.name = 'Rosebank';
      }

      if(johannesburgCount == 3 && weatherCurrent[i].location.name == 'Johannesburg'){
        weatherCurrent[i].location.name = 'Marlboro';
      }
     }

      weatherCurrent.forEach((w)=>{
        //console.log(w);
      })
    }

module.exports = {
    getWeather,
    regions
};



/*
{
  location: {
    name: 'Johannesburg',
    region: 'Gauteng',
    country: 'South Africa',
    lat: -26.2,
    lon: 28.083,
    tz_id: 'Africa/Johannesburg',
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