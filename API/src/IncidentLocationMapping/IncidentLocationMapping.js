async function notifyUsers(connectedUsers, incidents){
    connectedUsers.forEach((id, location) => {
        console.log(`${id} : ${JSON.stringify(location)}`);
    });

    incidents.forEach((id, location) => {
        console.log(`${id} : ${JSON.stringify(location)}`);
    });
}


module.exports = {
    notifyUsers
}