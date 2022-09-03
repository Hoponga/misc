var express = require('express');

var app = express();
var server = app.listen(process.env.PORT || 3000); 
app.use(express.static('public'));


console.log("Node server is running!")

var io = require('socket.io')(server, {
    cors: {
        origin: '*', 
    }
});

let roomno = 0; 
let rooms = []; 
let users = []; 
let scores = {}; 
let ready = new Set(); 
let paddleHeight, paddleWidth; 

paddleHeight = 95; 
paddleWidth = 17; 

let clientNo = 0; 
io.on('connection', (socket) => {
    socket.on("join server", (data) => {
        roomNo = Math.floor(clientNo/2); 
        const user = {
            'username': data, 
            'id': socket.id,
        }; 
        scores[data] = 0; 
        if (clientNo <= roomNo * 2) {
            const users = {
                'allUsers': [], 
                'newguy': [data, socket.id],
            }
            users.allUsers.push([data,socket.id]); 

            rooms.push(users); 

        }
        else {
            rooms[roomNo].allUsers.push([data,socket.id]); 
            rooms[roomNo].newguy = [data, socket.id]; 

        }

        socket.join(roomNo);
        clientNo++; 
        socket.emit('serverMsg', {'num': roomNo}); 
        console.log(rooms); 
        console.log(rooms[roomNo]); 
        console.log(roomNo); 
        io.to(roomNo).emit("new user", rooms[roomNo]); 



    }); 
    socket.on('ready', () => {
        if (!ready.has(socket.id)) {
            
        
            ready.add(socket.id); 
            currentRoom = Array.from(socket.rooms)[1]; 
            console.log(currentRoom); 
            let readyStatuses = [true, true]; 
            let readyToStartGame = true; 
            for (let i = 0; i < rooms[currentRoom].allUsers.length; i++) {
                if (!ready.has(rooms[currentRoom].allUsers[i][1])) {
                    readyToStartGame = false; 
                    readyStatuses[i] = false; 

                }


            }
            if (readyToStartGame && rooms[currentRoom].allUsers.length == 2) {
                let initTheta = Math.random()*Math.PI/2.-Math.PI/4; 
                let thetaData = {}; 
                thetaData[rooms[currentRoom].allUsers[0][0]] = [initTheta,0]; 
                thetaData[rooms[currentRoom].allUsers[1][0]] = [Math.PI - initTheta,0]; 

                io.to(currentRoom).emit("start-game", thetaData); 

            }
            
            else {
                
                io.to(currentRoom).emit("ready status", readyStatuses); 

            }
        }
        






    }); 
    
    let dy = 8; 
    let screenWidth = 800; 
    let screenHeight = 550; 
    let paddleWidth = 17; 
    let paddleHeight = 95; 
    let ballSize = 20; 


    socket.on('movement', (data) => {
        console.log('movement update received!'); 
        let newCoords = {}; 
        if (data.move == "UP") {
            if (data.myY > dy) {
                newCoords[data.myName] = data.myY - dy; 

            }
            else {
                newCoords[data.myName] = data.myY; 
            }

            newCoords[data.otherName] = data.otherY;


        }
        else if (data.move == "DOWN") {
            if (data.myY < screenHeight - paddleHeight - dy) {
                newCoords[data.myName] = data.myY + dy; 
                

            }

            else {
                newCoords[data.myName] = data.myY; 
               
            }
            newCoords[data.otherName] = data.otherY; 
        }
        io.to(data.roomNo).emit('movement', newCoords); 


    }); 

    
    socket.on('frame', (data) => {
        let ballX = data.ballX;
        let ballY = data.ballY; 
        let ballSpeed = data.ballSpeed; 
        let ballTheta = data.ballTheta; 
        let roomNo = data.roomNo; 
        let hostName = data.myName; 
        let otherPlayerName = data.otherPlayerName; 
        let myY = data.myY; 
        let myX = 40; 
        let otherX = screenWidth - 40 - paddleWidth;  
        let otherY = data.otherY; 
        let gameIsWon = false; 

        

        
        if (ballY <= 0 || ballY >= screenHeight - ballSize) {
            console.log('bouncy bouncy!');
            ballTheta = -ballTheta; 

        }
        else if (ballX < -40)
        {
            
            console.log('guest wins'); 
            let initTheta = Math.random()*Math.PI-Math.PI/2; 
            let thetaData = {}; 
            scores[otherPlayerName] += 1; 
            thetaData[otherPlayerName] = [initTheta,scores[otherPlayerName]]; 
            thetaData[hostName] = [Math.PI - initTheta, scores[hostName]]; 


            io.to(currentRoom).emit("start-game", thetaData); 
            gameIsWon = true; 

            

        }
        else if (ballX > screenWidth + 40)
        {
            console.log('host wins'); 
            let initTheta = Math.random()*Math.PI-Math.PI/2; 
            let thetaData = {}; 
            scores[hostName] +=1; 
            thetaData[hostName] = [initTheta, scores[hostName]]; 
            thetaData[otherPlayerName] = [Math.PI - initTheta,scores[otherPlayerName]]; 

            io.to(currentRoom).emit("start-game", thetaData); 
            gameIsWon = true; 

            


        }
        else if (ballX <= 0+myX+paddleWidth && ballY >= myY && ballY <= myY + paddleHeight) {
            let distanceFromBottom = -ballY + myY + paddleHeight; 
            let thetaReflection = -Math.PI/4*(distanceFromBottom-paddleHeight/2.0)/(paddleHeight/2.0); 
            ballTheta = thetaReflection; 
            console.log(ballTheta); 
            console.log(Math.PI - ballTheta); 
            ballSpeed = 10; 

        }
        else if (ballX + ballSize >= otherX && ballY >= otherY && ballY <= otherY + paddleHeight) {
            let distanceFromBottom = -ballY + otherY + paddleHeight; 
            let thetaReflection = Math.PI + Math.PI/4*(distanceFromBottom-paddleHeight/2.0)/(paddleHeight/2.0); 
            ballTheta = thetaReflection; 
            console.log(ballTheta); 
            console.log(Math.PI - ballTheta); 
            ballSpeed = 10; 

        }
        let ballX1 = ballX + ballSpeed*Math.cos(ballTheta); 
        let ballX2 = screenWidth - ballX1 - ballSize; 
        
        ballY += ballSpeed*Math.sin(ballTheta); 
        let hostData = {'ballX': ballX1, 'ballY': ballY, 'ballTheta': ballTheta, 'ballSpeed': ballSpeed}; 
        let otherData = {'ballX': ballX2, 'ballY': ballY, 'ballTheta': (Math.PI -ballTheta), 'ballSpeed': ballSpeed}; 
        let totalData = {}; 
        totalData[data.myName] = hostData; 
        totalData[data.otherPlayerName] = otherData; 
        if (!gameIsWon){
            io.to(roomNo).emit('frame', totalData); 

        }
       

    }); 

    socket.on('disconnect', () => {
        let roomLeft; 
        let disconnectedUser; 

        for (let i = 0; i < rooms.length; i++)
        {
            for (let j = 0; j < rooms[i].allUsers.length; j++)
            {
                if (rooms[i].allUsers[j][1] == socket.id)
                {
                    roomLeft = i; 
                    

                    disconnectedUser = rooms[i].allUsers.splice(j, 1); 
                }
            }
            
        }
        data = {'allUsers': rooms[roomLeft].allUsers, 'deleted':disconnectedUser[0][0],}; 

        io.to(roomLeft).emit("deleted user", data); 

        
        console.log(disconnectedUser[0] + ' has disconnected!'); 



    }); 


    
    


    
}); 