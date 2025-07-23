const socket = io('http://localhost:5000');

var eventLog = document.getElementById('eventLog');

var position;
var markers = [];
var circles = [];

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
let carLat = 51.5;
let carLng = -0.09;
var car  = L.icon({
    iconUrl : 'car.png',
    iconSize : [38, 38],
    iconAnchor : [carLat, carLng],
    popupAnchor:  [-3, -76]
});

var carMarker = L.marker([51.5, -0.09], {icon : car}).addTo(map);

function mapClick(e){
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    var eventLog = document.getElementById('eventLog');
    var ev = document.createElement('div');
    ev.innerText = `You clicked map at [${e.latlng.toString()}] (${hours}:${minutes}:${seconds})`;
    //eventLog.appendChild(ev);

    position = {
        latitude : e.latlng.lat,
        longitude : e.latlng.lng
    }
    console.log(position);
    map.setView([position.latitude, position.longitude], 13);
}

function reportIncident(){
    var marker = L.marker([position.latitude, position.longitude]).addTo(map);
    var circle = L.circle([position.latitude, position.longitude], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 500
    }).addTo(map);
    markers.push(marker);
    circles.push(circle);
    socket.emit('new-incident-location', position);
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
    var eventLog = document.getElementById('eventLog');
    while(eventLog.hasChildNodes())eventLog.removeChild(eventLog.firstChild);

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    var ev = document.createElement('div');
    ev.innerText = `${event} (${hours}:${minutes}:${seconds})`;
    eventLog.appendChild(ev);
}

document.addEventListener('keypress',(event)=>{
    switch(event.key){
        case 'w':
            carLat += 0.001;
            break;

        case 'a':
            carLng -= 0.001;
            break;

        case 's':
            carLat -= 0.001;
            break;

        case 'd':
            carLng += 0.001;
            break;
    }

    carMarker.setLatLng([carLat, carLng]);
    hitOrMiss();
});

function hitOrMiss(){
    for(let m of markers){
        var coords = m.getLatLng();
        var d = Math.sqrt((carLat - coords.lat) + (carLng - coords.lng));
        console.log(d);
        if(d <= 500){
            addEvent('HIT');
        }
    }
}

/* socket.on('trafficUpdate',(data)=>{
    console.log(data);
});

socket.on('criticalIncidents',(data)=>{
    console.log(data);
})

socket.on('incidentCategory', (data)=>{
    console.log(data);
})

socket.on('incidentLocations', (data)=>{
    console.log(data);
})

socket.on('newAlert', (data)=>{
    addEvent(data);
}) */

const getLocation = ()=>{
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition((position)=>{
            resolve({
                lat : position.coords.latitude,
                long : position.coords.longitude
            });
        },
            (error)=>{
            reject(error);
            })
    })
}

const updateLocation = async ()=>{
    try{
        const data = await getLocation();
        console.log(data);
        socket.emit('new-location',data);
    }catch(error){
        console.error("Cant get Location: " + error);
    }
}

//updateLocation();
//setInterval(updateLocation, 5000);
