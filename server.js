var express= require('express');
var morgan = require('morgan');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var cookie = require('cookie-parser');
var mongoose = require('mongoose');
var config = require('./config');
var User = require('./app/models/autor');
var Categoria = require('./app/models/categoria');
var Post = require('./app/models/postagem');
var authapi= require('./app/apis/auth_rotas')(express);
var controlPanel= require('./controllers/painel_controle')(express);

var app = express();

app.use(morgan('dev'));
app.use(express.static(__dirname +'/public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookie('JSLover'));
app.use('/api',authapi);
app.set('view engine','ejs');

mongoose.Promise = global.Promise;
mongoose.connect(config.database,function(err){
    if(err) console.log(err);
    console.log('MongoDB Conectado');
});

////////////////callback para pegar as categorias//////////////////
var cats = [];
function updateCategories(req,res,next){
    if(cats.length <= 0 ){
        Categoria.find({},function(err,cs){
            console.log('Again');
            if(err) throw err;
            cats = cs;
            return next();
        });
    }else{
        return next();
    }
}

app.use(function(req,res,next){
        Categoria.find({},function(err,cs){
            console.log('Novamente');
            if(err) throw err;
            cats = cs;
            return next();
        });
});

/////////////////////////////////
app.get('/',function(req,res){
    Post.find({},function(err,posts){
        if(err) throw err;
        posts = posts.reverse();
        return res.render('index',{posts : posts,cats: cats});
    });
});

app.get('/posts/:posturl',function(req,res){
    Post.findOneAndUpdate({posturl:req.params.posturl}, {$inc: {visitors:1}},function(err,post){
        User.findOne({usuario:post.Author},function(err, user){
           if(typeof req.cookies.decoded != "undefined" && req.cookies.decoded._doc.usuario == post.Author  ) {
               return res.render('postagem',{post : post,user: user, cats: cats, editor:true});
           }else{
                return res.render('postagem',{post : post,user: user, cats: cats,editor: false});
           }
        });
    });
});

app.get('/profile/:usuario',function(req,res){
    User.findOne({usuario:req.params.usuario},function(err, user){
        if(err) throw err;
        if(!user) {
            console.log('Usuário não encontrado');
            return;
        }

        Post.find({Author:user.usuario},function(err, posts){
            if(err) throw err;
            if(!posts){
                return res.send("Nenhum Post");
            }
            return res.render('perfil',{user:user,cats: cats, posts : posts, show:false})
        });
    });
});

//////////////////////////// área de autenticação //////////////////////////////
app.use('/api',authapi);

app.get('/cadastro',function(req,res){
    if(!req.cookies.token){
        return res.render('cadastro',{cats: cats});
    }
    res.redirect('/profile');
});

app.get('/login',function(req,res){
    if(!req.cookies.token || !req.cookies.decoded){
        return res.render('login',{cats: cats});
    }

    //redirecionando para renderizar
    res.redirect('/profile');
});

app.get('/logout',function(req,res){
    if(req.cookies.token){
      res.clearCookie('token');
      res.clearCookie('decoded');
    }
    return res.redirect('/login');
});

/////////////////////////////////

app.get('/categoria/:name',function(req,res){
    Post.find({categoria:req.params.name},function(err,posts){
        if(err) throw err;
        /*if(posts.length <=0 ){
            return res.redirect('/');
        }*/
        posts = posts.reverse();
        return res.render('index',{posts : posts,cats: cats,showTitle:true, word : req.params.name});
    });
});

app.get('/tags/:name',function(req,res){
    Post.find({tags:req.params.name},function(err,posts){
        if(err) throw err;
        if(posts.length <=0 ){
            return res.redirect('/');
        }
        posts = posts.reverse();
        return res.render('index',{posts : posts,cats: cats,showTitle:true, word : req.params.name});
    });
});

//////////////////////////// fim da área de autenticação //////////////////////////////

// estaAutenticado middleware
app.use(function(req,res,next){
    if(!req.cookies.token){
        return res.redirect('/login');
    }
    next();
});

app.use('/controlpanel',controlPanel);

app.get('/profile',function(req,res){
    Post.find({Author:req.cookies.decoded._doc.usuario},function(err, posts){
        if(err) throw err;
        return res.render('perfil',{user:req.cookies.decoded._doc,cats: cats, posts : posts,show:true})
    });
});

app.listen(config.port,function(err){
    if(err) throw err;
    console.log('Conectado na PORTA %s',config.port);
});
