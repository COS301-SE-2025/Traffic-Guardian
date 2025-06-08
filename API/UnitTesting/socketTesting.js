const socket = io('http://localhost:5000');

var eventLog = document.getElementById('eventLog');

socket.on('welcome', (msg)=>{
    console.log(msg);
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    var eventLog = document.getElementById('eventLog');
    var ev = document.createElement('div');
    ev.innerText = `${msg} (${hours}:${minutes}:${seconds})`;
    eventLog.appendChild(ev);
});

var map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);

function getLocation(){
    if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(success, error);
    }else{
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        var eventLog = document.getElementById('eventLog');
        var ev = document.createElement('div');
        ev.innerText = `Browser dont support geolocation (${hours}:${minutes}:${seconds})`;
        eventLog.appendChild(ev);
    }
}

function success(position){
    socket.emit('user-location',position);
    map = L.map('map').setView([-25.87, -25.87], 13);
    //map = L.map('map').setView([position.coords.latitude, position.coords.longitude], 13);

}

function error(){
    alert('Cannot get location');
}

getLocation();