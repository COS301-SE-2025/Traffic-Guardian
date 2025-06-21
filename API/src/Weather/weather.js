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