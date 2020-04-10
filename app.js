var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var session = require('express-session');
var passport = require('passport');
var GitHubStrategy = require('passport-github2').Strategy;

var GITHUB_CLIENT_ID = 'e52a6e108a6a8d6bead7';
var GITHUB_CLIENT_SECRET = '1cb033e81777f37c32d578d2995241d317021b75';

// ユーザーの情報をデータとして保存する処理をするコード
passport.serializeUser(function (user, done) {
  done(null, user);
});

// 保存されたデータをユーザーの情報として読み出す際の処理を設定するコード
passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

// passportモジュールに、GitHumを利用した認証の戦略オブジェクトを設定し、
//  また認証後に実行する処理を、process.nextTick関数を利用して設定している。
passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: 'http://localhost:8000/auth/github/callback'
},
  function (accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      return done(null, profile);
    });
  }
));

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var photosRouter = require('./routes/photos');

var app = express();
app.use(helmet());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({ secret: '71f2a1e93ad87c03', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
app.use('/users', ensureAuthenticated, usersRouter);
app.use('/photos', photosRouter);

// パスに対する HTTP リクエストのハンドラの登録
// GitHubへの認証を行うための処理を、GETで /auth/github にアクセスした際に行うというもの。
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] }),
  function (req, res) {
  });

// OAuth2.0 の仕組みの中で用いられる、GitHub が利商社の虚に対する問い合わせの結果を送るパス
//  /auth/github/callback のハンドラを登録
app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function (req, res) {
    res.redirect('/');
  });

// /login にGETアクセスがあった時に、login.pugというテンプレートがあることを前提にログインページを描画するコード。
app.get('/login', function (req, res) {
  res.render('login');
});

// /logout にGETでアクセスがあった時にログアウトを実施し、/ のドキュメントルートにリダイレクトさせるコード。
app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

/**
 * 認証されていない場合、/login にリダイレクトさせる関数。
 */
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
