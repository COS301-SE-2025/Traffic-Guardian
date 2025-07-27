class ILM{
    constructor(){
        this.regionsCoords = ['-26.1438,28.0406', '-26.09108017449409,28.08474153621201', '-25.9819,28.1329', '-25.8347,28.1127', '-25.7566,28.1914', '-26.2678,27.8658', '-26.0936,27.9931', '-26.2259,28.1598', '-26.6667,27.9167', '-26.3333,28.1667', '-25.7487,28.2380'];
        this.regionNames =  ['Rosebank', 'Sandton', 'Midrand', 'Centurion', 'Pretoria', 'Soweto', 'Randburg', 'Boksburg', 'Vereeniging', 'Alberton', 'Hatfield'];
        this.regions = new Map();
        this.users = new Map();
        this.initRegions();
    }

    /*Incidents/traffic methods */
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

            this.regions.set(this.regionNames[i], regionData);
        }

        console.log('\x1b[32m%s\x1b[0m' ,`${this.regions.size} regions set`);
    }

    addNewIncident(location, incident){
        var region = this.regions.get(location);
        region.incidents.push(incident);
        this.regions.set(location, region);
    }

    updateTraffic(trafficData){
        var count = 0;
        for(let i=0; i<trafficData.length; i++){
            var region = this.regions.get(trafficData[i].location);
            
            if(region === undefined) continue;
            count += 1;
            region.incidents = trafficData[i].incidents;
            this.regions.set(trafficData[i].location, region);
        }
        console.log(`${count} regions updated`);
    }



    /*Users methods */
    addUser(userID, location){
        const userData = {
            ID : userID,
            coordinates : {
                latitude : location.latitude ?? null,
                longitude : location.longitude ?? null
            }
        };
        this.users.set(userID, userData);
    }

    updateUserLocation(id, location){
        const newData = {
            ID : id,
            coordinates : {
                latitude : location.latitude ?? null,
                longitude : location.longitude ?? null
            }
        };
        this.users.set(id, newData);
    }

    notifyUsers(){
        var res = [];
        this.users.forEach((uvalue, ukey)=>{
            this.regions.forEach((rvalue, rkey)=>{
                if(this.isNearby(uvalue.coordinates, rvalue.coordinates)){
                    const notificationData = {
                        userID : ukey,
                        notification : rvalue
                    };
                    res.push(notificationData);
                }
            })
        })
        return res;
    }



    /*Helper functions */
    isNearby(locationA, locationB){
        const d = 0.1;
        if(!Object.hasOwn(locationA, 'latitude') || !Object.hasOwn(locationA, 'longitude')) return false;
        if(!Object.hasOwn(locationB, 'latitude') || !Object.hasOwn(locationB, 'longitude')) return false;
        return (d >= Math.sqrt((locationA.latitude - locationB.latitude) + (locationA.longitude - locationB.longitude)));
    }

    emptyObject(obj){
        return (Object.keys.length === 0);
    }

    showRegions(){
        this.regions.forEach((value, key)=>{
            console.log(`${key} : ${value}`);
            console.dir(value, { depth: null, colors: true });
        })
    }

    showUsers(){
        console.log(`${this.users.size} connected`);
        this.users.forEach((value, key)=>{
            console.dir(value, {depth: null, colors: true});
        })
    }
}



module.exports = {
    ILM
}