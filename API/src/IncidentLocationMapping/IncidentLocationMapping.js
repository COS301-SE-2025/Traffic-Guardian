class Regions{
    constructor(){
        this.regionsCoords = ['-26.1438,28.0406', '-26.09108017449409,28.08474153621201', '-25.9819,28.1329', '-25.8347,28.1127', '-25.7566,28.1914', '-26.2678,27.8658', '-26.0936,27.9931', '-26.2259,28.1598', '-26.6667,27.9167', '-26.3333,28.1667', '-25.7487,28.2380'];
        this.regionNames =  ['Rosebank', 'Sandton', 'Midrand', 'Centurion', 'Pretoria', 'Soweto', 'Randburg', 'Boksburg', 'Vereeniging', 'Alberton', 'Hatfield'];
        this.regionsMap = new Map();
        this.initRegions();
    }

    initRegions(){
        for(let i=0; i<this.regionNames.length; i++){
            var coords = this.regionsCoords[i].split(",");
            var regionData = {
                location : this.regionNames[i],
                coordinates : {
                    latitude : coords[0],
                    longitude : coords[1]
                },

                incidents : []
            }
            this.regionsMap.set(this.regionNames[i], regionData);
        }

        console.log('\x1b[32m%s\x1b[0m' ,`${this.regionsMap.size} regions set`);
    }

    addNewIncident(location, incident){
        var region = this.regionsMap.get(location);
        region.incidents.push(incident);
        this.regionsMap.set(location, region);

        console.log(region);
    }


    isNearby(locationA, locationB){
        const d = 0.5;
        return (d >= Math.sqrt((locationA.latitude - locationB.latitude) + (locationA.longitude - locationB.longitude)));
    }

    emptyObject(obj){
        return (Object.keys.length === 0);
    }

    toString(){
        this.regionsMap.forEach((value, key)=>{
            console.log(`${key} : ${value}`);
        })
    }
}



module.exports = {
    Regions
}