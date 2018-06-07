var User = require('../app/models/autor');
var Post = require('../app/models/postagem');
var Tag = require('../app/models/tag');
var Categoria = require('../app/models/categoria');

module.exports = function (express) {
    var app = express.Router();
    app.get('/', function (req, res) {
        if (req.cookies.decoded._doc.acesso == "admin") {
            User.find({}, function (err, users) {
                res.render('painel_controle', { user: req.cookies.decoded._doc, users: users });
            });
        }
        else {
            //TODO : Não permitir que usuários normais vejam contas de outros usuários
            res.render('painel_controle', { user: req.cookies.decoded._doc });
        }
    });

    app.get('/users/edit', function (req, res) {
        Categoria.find({}, function (err, cats) {
            res.render('editar_autor', { user: req.cookies.decoded._doc, cats: cats, isAdmin: (req.cookies.decoded._doc.acesso == 'admin' ? true : false) });
        });
    });

    app.post('/users/edit', function (req, res) {
        User.findOne({ email: req.cookies.decoded._doc.email }).select('email password nome sobre acesso ImageURL usuario Social').exec(function (err, user) {
            if (err) res.status(400).json({ message: 'Usuário não encontrado' });
            var pas = user.password;
            user.password = req.body.password || req.cookies.decoded._doc.password;
            if (user.password == null) {
                user.password = pas;
            }
            user.nome = req.body.nome || req.cookies.decoded._doc.nome;
            user.usuario = req.body.usuario || req.cookies.decoded._doc.usuario;
            user.sobre = req.body.sobre || req.cookies.decoded._doc.sobre;
            user.email = req.body.email || req.cookies.decoded._doc.email;
            user.acesso = req.cookies.decoded._doc.acesso;
            user.imageURL = req.body.ImageURL || req.cookies.decoded._doc.ImageURL;
            user.Social = {
                FaceBook: req.body.facebook || '',
                Twitter: req.body.twitter || '',
                WebSite: req.body.website || '',
                LinkedIn: req.body.linkedin || '',
                YouTube: req.body.youtube || ''
            };
            console.log(user);
            user.save(function (err) {
                if (err) {
                    res.status(400).json({ message: 'Algo deu errado' + err });
                }
                delete user.password;
                console.log(user);
                res.cookie('decoded', { _doc: user }, { httpOnly: true });
                return res.redirect('./profile');
            });
        });
    });

    app.get('/posts', function (req, res) {
        if (req.cookies.decoded._doc.acesso != "admin") {
            Post.find({ Autor: req.cookies.decoded._doc.usuario }, function (err, posts) {
                if (err) { console.log(err) }
                posts = posts.reverse();
                return res.render('gerenciar_postagens', { posts: posts, user: req.cookies.decoded._doc });
            });
        }
        Post.find({}, function (err, posts) {
            if (err) { console.log(err) }
            posts = posts.reverse();
            return res.render('gerenciar_postagens', { posts: posts, user: req.cookies.decoded._doc });
        });

    });
    app.route('/posts/new')
        .get(function (req, res) {
            Categoria.find({}, function (err, cats) {
                if (err) console.log(err);
                return res.render('nova_postagem', { user: req.cookies.decoded._doc, cats: cats });
            });

        })
        .post(function (req, res) {
            var tags = tagsToArray(req.body.tags);
            var post = new Post({
                titulo: req.body.titulo,
                conteudo: req.body.conteudo,
                categoria: req.body.categoria,
                tags: tags,
                ImageURL: req.body.image,
                Autor: req.cookies.decoded._doc.usuario,
                posturl: req.body.titulo.split(' ').join('-'),
                dataPublicacao: new Date().toLocaleDateString()
            });
            post.save(function (err) {
                if (err) throw err;
                for (var t in tags) {
                    var x = new Tag({ nome: tags[t] });
                    x.save();
                }
                return res.redirect('/controlpanel/posts');
            });
        }
        );

    app.route('/posts/edit/:posturl')
        .get(function (req, res) {
            Categoria.find({}, function (err, cats) {
                Post.findOne({ posturl: req.params.posturl }, function (err, post) {
                    if (err) throw err;
                    return res.render('editar_postagem', { user: req.cookies.decoded._doc, cats: cats, post: post });
                });
            });

        })
        .post(function (req, res) {
            var tags = tagsToArray(req.body.tags);
            Post.findOneAndUpdate({ posturl: req.body.posturl }, {
                $set: {
                    titulo: req.body.titulo,
                    conteudo: req.body.conteudo,
                    categoria: req.body.categoria,
                    tags: tags,
                    ImageURL: req.body.image,
                    posturl: req.body.titulo.trim().split(' ').join('-')
                }
            }, function (err, newPost) {
                if (err) throw err;
                for (var t in tags) {
                    var x = new Tag({ Name: tags[t] });
                    x.save();
                }
                console.log(newPost);
                return res.redirect('/controlpanel/posts');
            });
        }
        );

        app.post('/posts/delete/:posturl', function (req, res) {
            Post.findOneAndRemove({ posturl: req.params.posturl }, function (err) {
                if (err) throw err;
                res.redirect('/posts');
            });
        });

    app.get('/tags', function (req, res) {
        Tag.find({}, function (err, tags) {
            if (err) throw err;
            return res.render('admin_tags', { tags: tags, user: req.cookies.decoded._doc });
        });
    });

    app.get('/categories', function (req, res) {
        Categoria.find({}, function (err, cats) {
            return res.render('admin_categorias', { cats: cats, user: req.cookies.decoded._doc });
        });
    });

        app.route('/categories/new')
            .get(function (req, res) {
                res.render('nova_categoria', { user: req.cookies.decoded._doc, edit: false });
            })
            .post(function (req, res) {
                var categoria = new Categoria({ nome: req.body.nome.toLowerCase() });
                categoria.save(function (err) {
                    if (err) { console.log(err); }
                    return res.redirect('./');
                });
            });

        app.route('/categories/edit/:nome')
            .get(function (req, res) {
                res.render('nova_categoria', { user: req.cookies.decoded._doc, edit: true, cat: req.params.nome });
            })
            .post(function (req, res) {
                Categoria.findOneAndUpdate({ nome: req.body.oldname }, { $set: { nome: req.body.nome } }, function (err) {
                    if (err) throw err;
                    Post.find({ categoria: req.body.oldname }, function (err, posts) {
                        for (post of posts) {
                            post.categoria = req.body.nome;
                            post.save();
                        }
                    });
                    return res.redirect('/controlpanel/categories');
                });
            });

    app.use(function (req, res, next) {
        if (req.cookies.decoded._doc.acesso != "admin") {
            return res.redirect('/controlpanel');
        }
        next();
    });

    app.get('/users', function (req, res) {
        User.find({}, function (err, users) {
            if (err) throw err;
            return res.render('autor', { users: users, user: req.cookies.decoded._doc });
        });
    });

    app.get('/users/edit/:usuario', function (req, res) {
        Categoria.find({}, function (err, cats) {
            User.findOne({ usuario: req.params.usuario }, function (err, user) {
                res.render('editar_autor', { user: user, cats: cats, isAdmin: (req.cookies.decoded._doc.acesso == 'admin' ? true : false) });
            });
        });
    });

    app.post('/users/edit/:usuario', function (req, res) {
        User.findOne({ usuario: req.params.usuario }).select('email password nome sobre acesso ImageURL usuario Social').exec(function (err, user) {
            if (err) res.status(400).json({ message: 'Usuário não encontrado' });
            var pas = user.password;
            user.password = req.body.password || req.cookies.decoded._doc.password;
            if (user.password == null) {
                user.password = pas;
            }
            user.nome = req.body.name || req.cookies.decoded._doc.nome;
            user.usuario = req.body.usuario || req.cookies.decoded._doc.usuario;
            user.sobre = req.body.sobre || req.cookies.decoded._doc.sobre;
            user.acesso = req.body.acesso || req.cookies.decoded._doc.acesso;
            user.imageURL = req.body.ImageURL || req.cookies.decoded._doc.ImageURL;
            user.Social = {
                FaceBook: req.body.facebook || '',
                Twitter: req.body.twitter || '',
                WebSite: req.body.website || '',
                LinkedIn: req.body.linkedin || '',
                YouTube: req.body.youtube || ''
            };
            user.save(function (err) {
                if (err) {
                    res.status(400).json({ message: 'Algo deu errado' + err });
                }
                return res.redirect('/profile');
            });
        });
    });
    return app;
};

function tagsToArray(tagsInString) {
    var tags = tagsInString.split(',');
    var tagsjson = [];
    for (t of tags) {
        tagsjson.push(t.trim().toLowerCase());
    }
    return tagsjson;
}

function saveTag(tagName) {
    console.log(tagName);
    Tag.findOneAndUpdate({ Name: tagName }, function (err, tagn) {
        if (err) throw err;
        console.log(tagn);
    });
}

function toTitleCase(words) {
    return words.split(' ').map(
        function (s) {
            return s[0].toUpperCase() + s.substring(1).toLowerCase()
        }).join(' ');
}