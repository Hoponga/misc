var express = require('express');

var app = express();
var server = app.listen(3000); 

app.use(express.static('public'));


console.log("Node server is running!")

var socket = require('socket.io');
var io = socket(server);
var roomno = 0; 
let rooms = []; 
let users = []; 
io.on('connection', newConnection);
function newConnection(socket){
    console.log('new connection ' + socket.id);
    
    var foundRoom = false; 
    socket.on('connectTo', connectMsg); 
    
    function connectMsg(data) {
        
        var currentRoom = 0; 
        for (var i = 0; i < rooms.length; i+=1)
        {
            if (rooms[i] == 1)
            {
                var roomData = {'number': i};
                socket.join('room-' + i);
                io.sockets.in('room-'+i).emit('full', roomData); 
                console.log('Sending full room message to room-' +i); 
                //console.log(io.sockets.in('room-'+i)); 
                foundRoom = true; 
                currentRoom = i; 
                rooms[i] = 2; 
                break; 
            }
        }
        console.log(rooms);
        if (!foundRoom) {
            rooms.push(1); 
            socket.join('room-' +( rooms.length-1)); 
            console.log('new room-' + (rooms.length-1)); 
        }
        else {
            console.log('connecting to room-' + currentRoom);
            
        }


    }
    socket.on('mouse', mouseMsg); 
    function mouseMsg(data) {
        console.log(socket.rooms + data); 
        io.to('room-' + currentRoom).emit('mouse', data); 
    
    }

    
    

    //console.log(socket);


}