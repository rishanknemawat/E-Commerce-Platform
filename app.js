var express                 = require('express'),
    mongoose                = require('mongoose'),
    bodyParser              = require('body-parser'),
    methodOverride          = require('method-override'),
    passport                = require('passport'),
    LocalStrategy           = require('passport-local'),
    passportLocalMongoose   = require('passport-local-mongoose'),
    flash                   = require('connect-flash'),
    Product                 = require('./models/product'),
    User                    = require('./models/user'),
    Review                  = require('./models/review'),
    app                     = express();

mongoose.connect('mongodb://localhost/eCommerce', { useNewUrlParser: true });

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride('_method'));
app.use(express.static(__dirname + '/public'));
app.use(flash());
app.use(require('express-session')({
    secret: 'Who let the dogs out?',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(request, response, next) {
    response.locals.currentUser = request.user;
    response.locals.error = request.flash('error');
    response.locals.success = request.flash('success');
    next();
});

function isLoggedIn(request, response, next) {
    if(request.isAuthenticated())
        return next();
    request.flash('error', 'Please')
    response.redirect('/products/' + request.params.id);
}

function isReviewOwner(request, response, next) {
    if(request.isAuthenticated()) {
        Review.findById(request.params.reviewId, function(error, review) {
            if(error) {
                console.log(error);
                request.flash('error', 'There was some problem deleting the review. Please try again.');
                response.redirect('back');
            }
            else {
                if(review.author.id.equals(request.user._id)){
                    return next();
                }
                else {
                    // request.flash('error', 'There was some problem deleting that review. Please try again.');
                    response.redirect('back');
                }
            }
        });
    }
    else {
        request.flash('error', 'Please')
        response.redirect('back');
    }
}

app.get('/products', function(request, response) {
    Product.find({}, function(error, products) {
        if(error)
            console.log(error);
        else
            response.render('home', {products: products});
    });
});

app.post('/products', function(request, response) {
    var product = request.body.product;
    console.log(product);
    Product.create(product, function(error, addedProduct) {
        if(error)
            console.log(error)
        else    
            response.redirect('/products');
    });
});

app.get('/products/new', function(request, response) {
    response.render('product/new');
});

app.get('/products/:id', function(request, response) {
    // sanitize
    // request.params.id = request.sanitize(request.params.id);
    Product.findById(request.params.id).populate('reviews').exec(function(error, product) {
        if(error)
            console.log(error);
        else {
            response.render('product/show', {product: product});
        }
    });
});

app.post('/products/:id/reviews', isLoggedIn, function(request, response) {
    Product.findById(request.params.id, function(error, product) {
        if(error) {
            console.log(error);
            response.redirect('/products');
        }
        else {
            Review.create(request.body.review, function(err, review) {
                if(error) {
                    console.log(error);
                }
                else{
                    review.author.id = request.user._id;
                    review.author.username = request.user.username;
                    review.save();
                    product.reviews.push(review);
                    product.save();
                    response.redirect('/products/' + product._id);
                }
            });
        }
    });
});

app.get('/products/:id/reviews/new', isLoggedIn, function(request, response) {
    Product.findById(request.params.id, function(error, product) {
        if(error) {
            console.log(error);
            response.redirect('/products');
        }
        else {
            response.render('review/new', {product: product});
        }
    });
});

app.get('/products/:id/reviews/:reviewId/edit', isReviewOwner, function(request, response) {
    console.log('reviewId is: ' + request.params.reviewId);
    Review.findById(request.params.reviewId, function(error, review) {
        if(error) {
            console.log(error);
            // response.redirect
        }
        response.render('review/edit', {product_id: request.params.id, review: review});
    });
});

app.put('/products/:id/reviews/:reviewId', isReviewOwner, function(request, response) {
    Review.findByIdAndUpdate(request.params.reviewId, request.body.review, function(error, review) {
        if(error)
            console.log(error);
        response.redirect('/products/' + request.params.id);
    });
});

app.delete('/products/:id/reviews/:reviewId', isReviewOwner, function(request, response) {
    Review.findByIdAndRemove(request.params.reviewId, function(error) {
        if(error)
            response.redirect('back');
        else {
            request.flash('success', 'Review deleted successfully.');
            response.redirect('/products/' + request.params.id);
        }
    });
});

app.get('/signup', function(request, response) {
    response.render('signup');
});

app.post('/signup', function(request, response) {
    var newUser = new User({username: request.body.username});
    User.register(newUser, request.body.password, function(error, user) {
        if(error)
            console.log(error);
        else
        passport.authenticate('local')(request, response, function() {
            response.redirect('/products');
        });
    });
});

app.get('/login', function(request, response) {
    response.render('login');
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/products',
    failureRedirect: '/login'
}), function(request, response){});

app.get('/logout', function(request, response) {
    request.logout();
    response.redirect('/products');
});

app.listen(3000, function() {
    console.log('The Server is up and running.');
});     