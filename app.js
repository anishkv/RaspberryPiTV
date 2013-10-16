/**
 * Module dependencies.
 */

var express = require('express')
  , app = express()  
  , consolidate = require('consolidate')
  , server = require('http').createServer(app)
  , path = require('path')
  , io = require('socket.io').listen(server)
  , spawn = require('child_process').spawn
  , omx = require('omxcontrol')
  , fs = require('fs')
  ,parseString = require('xml2js').parseString;



// all environments
app.set('port', process.env.TEST_PORT || 8080);
app.engine('html', consolidate.handlebars);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(omx());

var $path = '/media/5FF5-E1EB/movies/'

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

//Routes
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/public/index.html');
});

app.get('/remote', function (req, res) {
  res.sendfile(__dirname + '/public/remote.html');
});

app.get('/play/:video_id', function (req, res) {

});

app.get('/movies', function (req, res) {
  fs.readdir($path, function(err, files){
     return res.render('movies', {movies: files});  
     //res.end();
  })
  
});


app.get('/poster/*', function (req, res) {
  fs.readFile($path + req.params[0] + '/folder.jpg', function(err, data){
    if(err) throw err;
    res.end(data); 
  });
  
});

app.get('/fanart/*', function (req, res) {
  
  fs.readFile($path + req.params[0] + '/'+ req.params[0]  +'-fanart.jpg', function(err, data){
    if(err) throw err;
    res.end(data); 
  });
  
});

app.get('/movie-details/*', function (req, res) {
  
  fs.readFile($path + req.params[0] + '/' + req.params[0] + '.nfo', 'utf-8', function(err, data){
    data = data.substring(1, data.length);
    parseString(data, function (err, result) {
      if(err) throw err;
      return res.render('movie-details', {title: req.params[0], rating: result.movie.rating[0], year: result.movie.year[0], plot: result.movie.plot[0]});
      console.dir(result);
    });
    
    
  });
  
});


app.get('/play-movie/*', function (req, res) {
  fs.readdir($path + req.params[0] , function(err, files){
     for(i=0; i< files.length; i++) {
      if(files[i].indexOf('.avi') > -1 || files[i].indexOf('.mp4') > -1 || files[i].indexOf('.mkv') > -1)  {
        console.log(files[i])
        console.log($path + req.params[0] + '/' + files[i])
        omx.start($path + req.params[0] + '/' + files[i]);
      }
     }
     //res.end();
  })
});

//Socket.io Config
io.set('log level', 1);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var ss;

//Run and pipe shell script output
function run_shell(cmd, args, cb, end) {
    var spawn = require('child_process').spawn,
        child = spawn(cmd, args),
        me = this;
    child.stdout.on('data', function (buffer) { cb(me, buffer); });
    child.stdout.on('end', end);
}

//Socket.io Server
io.sockets.on('connection', function (socket) {

 socket.on("screen", function(data){
   socket.type = "screen";
   ss = socket;
   console.log("Screen ready...");
 });
 socket.on("remote", function(data){
   socket.type = "remote";
   console.log("Remote ready...");
 });

 socket.on("controll", function(data){
	console.log(data);
   if(socket.type === "remote"){

     if(data.action === "tap"){
         if(ss != undefined){
            ss.emit("controlling", {action:"enter"});
            }
     }
     else if(data.action === "swipeLeft"){
      if(ss != undefined){
          ss.emit("controlling", {action:"goLeft"});
          }
     }
     else if(data.action === "swipeRight"){
	console.log(ss)
       if(ss != undefined){
           ss.emit("controlling", {action:"goRight"});
           }
     }
   }
 });

 socket.on("video", function(data){

    if( data.action === "play"){
    var id = data.video_id,
         url = "http://www.youtube.com/watch?v="+id;

    var runShell = new run_shell('youtube-dl',['-o','%(id)s.%(ext)s','-f','/18/22',url],
        function (me, buffer) {
            me.stdout += buffer.toString();
            socket.emit("loading",{output: me.stdout});
            console.log(me.stdout);
         },
        function () {
            //child = spawn('omxplayer',[id+'.mp4']);
            omx.start(id+'.mp4');
        });
    }

 });
});
