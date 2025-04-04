const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const moment = require("moment");
moment.locale('sr');
const UserRepository = require("./repositories/UserRepository.js");
const BodyRepository = require("./repositories/BodyRepository.js");

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const botName = "GeometrySolverBot";
const port = 3000;

mongoose.connect("mongodb://localhost:27017/GeometrySolver");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

io.on("connection", socket =>{

  socket.emit("message",`${moment().format('LT')}: Welcome to GeometrySolver`);

  socket.on("openbody",(bodyID)=>{
    socket.join(bodyID);
  })

  socket.on("comment",(comment)=>{
    io.to(comment.bodyID).emit("comment",`${comment.user} ${moment().format('l') + " " + moment().format('LT')} ${comment.content}`);
  })

  socket.on("figureAdded",(body)=>{
    io.to(body.bodyID).emit("figureAdded",body);
  })

  socket.on("figureDeleted",(bodyID)=>{
    io.to(bodyID).emit("figureDeleted",bodyID);
  })

})

app.get('/getUserByUsername', async (req, res) => {
  try {
    const username = req.query;
    const user = await UserRepository.getUserByUsername(username);
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/createUser', async (req, res) => {
    try {
      const userData = req.body;
      const newUser = await UserRepository.createUser(userData);
      res.status(201).json(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/getUserById/:id', async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await UserRepository.getUserById(userId);
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});
//preuredi da vraca bodies by user tj "My projects"
app.get('/getAllBodies', async (req, res) => {
  try {
    const bodies = await BodyRepository.getAllBodies();
    res.json(bodies);
  } catch (error) {
    console.error('Error fetching bodies:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/getBody', async (req, res) => {
  try {
    const id = req.query.id;
    const body = await BodyRepository.getBodyById(id);
    res.json(body);
  } catch (error) {
    console.error('Error fetching bodies:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post("/createBody", async(req,res)=>{
  try{
    
    const body = await BodyRepository.createBody(req.body);
    const project = {
      projectid: body._id
    }
    await UserRepository.addProject(req.body.creatorID,project);
    res.json(body);
  }
  catch (error) {
    console.error('Error creating body:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete("/deleteBody", async (req, res) => {
  try {
    var deleter = req.body.userID;
    var creator = await BodyRepository.getBodyById(req.body.id);
    if(deleter==creator.creatorID)
    {
      const result = await BodyRepository.deleteBody(req.body.id);
      await UserRepository.removeProject(req.body.userID, req.body.id);
      res.json({
        deletionSuccess:"true"
      });
    }
    else
    {
      res.json({
        deletionSuccess:"false"
      })
    }
  } catch (error) {
    console.error('Error deleting body:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put("/addComment", async(req,res)=>{
  try{
    const comment = {
      user: req.body.user,
      time: moment().format('l') + " " + moment().format('LT'),
      content: req.body.content
    }
    const cmt = await BodyRepository.addComment(req.body.id,comment);
    res.json(comment);
  }
  catch (error) {
    console.error('Error commenting:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put("/addFigure", async(req,res)=>{
  try{
    const bodyID = req.query.id;
    const fig = await BodyRepository.addFigure(bodyID,req.body);
    const duzina =
    {
      length: fig.length
    }
    res.json(duzina);
  }
  catch (error) {
    console.error('Error commenting:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put("/deleteTopFigure", async(req,res)=>{
  try{
    const bodyID = req.query.id;
    const fig = await BodyRepository.deleteFigure(bodyID);
    const duzina =
    {
      length: fig.length
    }
    res.json(duzina);
  }
  catch (error) {
    console.error('Error deleting top figure:', error);
    res.status(500).json({error: 'Internal Server Error'});
  }
})

server.listen(port, () => console.log(`Server running on port ${port}`));