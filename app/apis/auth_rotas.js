var jwt = require('jsonwebtoken');
var User = require('../models/autor');
var cookie = require('cookie-parser');
var config = require('../../config');

module.exports = function (express) {
  var apiRouter = express.Router();

  apiRouter.route('/cadastro')
    .get(function (req, res) {
      res.render('cadastro');
    })
    .post(function (req, res) {
      var user = new User({
        email: req.body.email,
        usuario: req.body.usuario,
        password: req.body.password,
        nome: req.body.nome,
        sobre: req.body.sobre,
        imageURL: req.body.imageURL || '',
        Social: {
          FaceBook: req.body.facebook || '',
          Twitter: req.body.twitter || '',
          WebSite: req.body.website || '',
          LinkedIn: req.body.linkedin || '',
          YouTube: req.body.youtube || ''
        }
      });
      user.save(function (err) {
        if (err) {
          return res.status(406).json({ message: 'Não foi possível salvar o usuário devido ao erro: ' + err });
        }

        var token = jwt.sign(user, config.superSecret, {
          expiresIn: '24 days'

        });
        res.cookie('token', token);
        res.json({ message: 'usuário com o nome: ' + user.nome + ' Adicionado' });
      });
    });

  apiRouter.route('/login')
    .get(function (req, res) {
      var token = req.cookies.token;
      if (!token) {
        res.json('como página de login ');
      }
      res.redirect('/');
    })
    .post(function (req, res) {
      var jsob;
      if (req.body.usuario.indexOf('@') === -1) {

        jsob = {
          usuario: req.body.usuario
        }
      } else {

        jsob = {
          email: req.body.usuario
        }
      }
      User.findOne(jsob).select('email password nome sobre acesso imageURL usuario Social').exec(function (err, user) {
        if (!user) {
          return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        if (!user.comparePassword(req.body.password)) {
          return res.status(406).json({ message: 'Senha incorreta' });
        }
        var token = jwt.sign(user, config.superSecret, {
          expiresIn: '24 days'
        });
        res.cookie('token', token, { httpOnly: true });
        user.password = null;
        res.cookie('decoded', { _doc: user }, { httpOnly: true });
        return res.json({ message: 'Entrou' });// replaced with redirect
      });
    });

  apiRouter.route('/logout')
    .get(function (req, res) {
      res.clearCookie('token');
      res.clearCookie('decoded');
      res.clearCookie({});
      res.json({ message: 'Saiu' });
    });

  apiRouter.use(function (req, res, next) {
    if (!req.cookies.token) {
      res.redirect('/login');
    }
    jwt.verify(req.cookies.token, config.superSecret, function (err, decoded) {
      req.decoded = decoded;
      next();
    });
  });

  apiRouter.get('/profile', function (req, res) {
    res.json({ user: req.decoded._doc });
  });
  apiRouter.get('/', function (req, res) {
    res.json(req.decoded);
  });

  apiRouter.post('/changedetails', function (req, res) {

    User.findOne({ email: req.decoded._doc.email }, function (err, user) {
      if (err) res.status(400).json({ message: 'usuário não encontrado' });
      user.password = req.body.password || req.decoded._doc.password;
      user.nome = req.body.nome || req.decoded._doc.nome;
      user.sobre = req.body.sobre || req.decoded._doc.sobre;
      user.acesso = req.decoded._doc.acesso;
      user.imageURL = req.body.imageURL || req.decoded._doc.imageURL;
      user.save(function (err) {
        if (err) {
          res.status(400).json({ message: 'Algo deu errado' });
        }
        user.password = null;
        res.cookie('decoded', { _doc: user }, { httpOnly: true });
        res.json({ message: 'Atualizado !!' });

      });
    });
  });

  //Admin middleware
  apiRouter.use(function (req, res, next) {
    if (req.decoded._doc.acesso == "admin") {
      return next();
    }
    return res.redirect('/');
  });

  apiRouter.post('/changerole', function (req, res) {
    User.findOneAndUpdate({ username: req.body.username }, { $set: { acesso: req.body.acesso } }, function (err) {
      if (err) {
        console.log(err);
        res.status(400).json({ message: 'error' });
        return;
      }
      res.json({ message: 'Atualizado' });
    })
  });

  apiRouter.get('/AllUsers', function (req, res) {
    User.find({}, function (err, users) {
      if (err) throw err;
      res.cookie('users', users, { httpOnly: true });
      res.json({ users: users });
    });
  });
  return apiRouter;
};
