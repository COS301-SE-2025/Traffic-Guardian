function notifyUsersTraffic(connectedUsers, regions){
    var nearbyUsers = [];

    connectedUsers.forEach((location, uid) => {
        regions.forEach((value, key) => {
            if(!emptyObject(location) && isNearby(location, value.coordinates)){
                const data = {
                    userID : uid,
                    location : key,
                    level : value.level,
                    description : "right now"
                };
                nearbyUsers.push(data);
            }
        })
    });

    return nearbyUsers;
}

function isNearby(locationA, locationB){
    const d = 0.5;
    //console.log(Math.sqrt((locationA.latitude - locationB.latitude) + (locationA.longitude - locationB.longitude)));
    return (d >= Math.sqrt((locationA.latitude - locationB.latitude) + (locationA.longitude - locationB.longitude)));
}

function emptyObject(obj){
    return (Object.keys.length === 0);
}


module.exports = {
    notifyUsersTraffic
}