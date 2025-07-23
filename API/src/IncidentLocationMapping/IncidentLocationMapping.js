async function notifyUsers(connectedUsers){
    //console.log(`Connected users = ${connectedUsers}`);
    var res =  "";
    connectedUsers.forEach(user => {
        res += user + " ";
    });
    return `Connected users = ${res}`;
}

async function updateUsersLocation(connectedUsers, newLocation){

}

module.exports = {
    notifyUsers,
    updateUsersLocation
}