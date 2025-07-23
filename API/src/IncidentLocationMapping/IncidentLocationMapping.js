function notifyUsers(connectedUsers, incidents){
    var nearbyUsers = [];

    connectedUsers.forEach((ulocation, uid) => {
        //console.log(`user = ${JSON.stringify(id)} : ${JSON.stringify(location)}`);
        incidents.forEach((ilocation, iid) =>{
            //console.log(`incident = ${JSON.stringify(id)} : ${JSON.stringify(location)}`);
            if(!emptyObject(ulocation) && !emptyObject(ilocation)){
                console.log(`user = ${JSON.stringify(uid)} : ${JSON.stringify(ulocation)}`);
                console.log(`incident = ${JSON.stringify(iid)} : ${JSON.stringify(ilocation)}`);

                if(isNearby(ulocation, ilocation)) nearbyUsers.push(uid);
            }
        })
    });

    return nearbyUsers;
}

function isNearby(locationA, locationB){
    const d = 500;
    return (d >= Math.sqrt((locationA.latitude - locationB.latitude) + (locationA.longitude - locationB.longitude)));
}

function emptyObject(obj){
    return (Object.keys.length === 0);
}

module.exports = {
    notifyUsers
}