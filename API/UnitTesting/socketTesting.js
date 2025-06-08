const socket = io('http://localhost:5000');

var eventLog = document.getElementById('eventLog');

var position;

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

var map = L.map('map').setView([51.5, -0.09], 13);

function mapClick(e){
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    var eventLog = document.getElementById('eventLog');
    var ev = document.createElement('div');
    ev.innerText = `You clicked map at [${e.latlng.toString()}] (${hours}:${minutes}:${seconds})`;
    eventLog.appendChild(ev);

    position = {
        latitude : e.latlng.lat,
        longitude : e.latlng.lng
    }
    console.log(position);
    map.setView([position.latitude, position.longitude], 13);
}

function reportIncident(){
    console.log(position);
    socket.emit('incident-location', position);
}

socket.on('incident-recived',(msg)=>{
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    var eventLog = document.getElementById('eventLog');
    var ev = document.createElement('div');
    console.log(msg);
    ev.innerText = `${msg} (${hours}:${minutes}:${seconds})`;
    eventLog.appendChild(ev); 
});

map.on('click',mapClick);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);

function addEvent(event){
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    var eventLog = document.getElementById('eventLog');
    var ev = document.createElement('div');
    ev.innerText = `${event} (${hours}:${minutes}:${seconds})`;
    eventLog.appendChild(ev);
}